// pages/api/run-agent-regression.js
import OpenAI from "openai";
import { createSign } from "crypto";
import { evaluateReply } from "../../lib/regression/evaluator.js";

const TEST_SHEET = process.env.REGRESSION_SHEET_NAME || "Agent Test Cases";
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const BASE_URL =
  process.env.REGRESSION_AGENT_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://app.destincondogetaways.com";
const AGENT_PATH = process.env.REGRESSION_AGENT_PATH || "/api/chat-agent";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const HEADER = Object.freeze({
  testId: "Test ID",
  conversation: "Conversation",
  turn: "Turn",
  newSession: "New Session?",
  category: "Category",
  userMessage: "User Message",
  expectedBehavior: "Expected Behavior",
  expectedTools: "Expected Tool(s)",
  mustInclude: "Must Include",
  mustNotClaim: "Must Not Claim",
  expectedUrlPattern: "Expected URL / Pattern",
  actualReply: "Actual Reply",
  passFail: "Pass / Fail",
  score: "Score 1-5",
  testerNotes: "Tester Notes",
  agentVersion: "Agent Version",
  testDate: "Test Date",
  liveSessionId: "Live Session ID",
});

const DANGEROUS_CATEGORIES = [
  "lockout",
  "maintenance",
  "existing guest",
  "privacy",
  "emergency",
];

function normalize(value) {
  return String(value ?? "").trim();
}

function columnLetter(indexZeroBased) {
  let n = indexZeroBased + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function makeRunId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function isAuthorized(req) {
  const expected = process.env.REGRESSION_SECRET;
  if (!expected) return false;
  const supplied =
    req.headers["x-regression-secret"] ||
    String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return supplied === expected;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getSheetsToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) throw new Error("Missing Google service-account environment variables");

  const privateKey = rawKey.replace(/\\n/g, "\n").trim();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })).toString("base64url");

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = signer.sign(privateKey, "base64url");
  const jwt = `${header}.${claim}.${signature}`;

  const response = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth2-jwt-bearer&assertion=${jwt}`,
  }, 15000);

  if (!response.ok) throw new Error(`Google auth failed: ${response.status}`);
  const data = await response.json();
  if (!data.access_token) throw new Error("Google auth returned no access token");
  return data.access_token;
}

async function readTests(token) {
  if (!SHEET_ID) throw new Error("GOOGLE_SHEET_ID is missing");
  const range = encodeURIComponent(`'${TEST_SHEET}'!A1:R500`);
  const response = await fetchWithTimeout(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
    20000,
  );
  if (!response.ok) throw new Error(`Reading test sheet failed: ${response.status}`);
  const data = await response.json();
  const rows = data.values || [];
  if (!rows.length) throw new Error(`No rows found in ${TEST_SHEET}`);

  const headers = rows[0].map(normalize);
  const indexes = {};
  for (const [key, label] of Object.entries(HEADER)) {
    indexes[key] = headers.indexOf(label);
    if (indexes[key] < 0) throw new Error(`Missing required column: ${label}`);
  }

  const tests = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const testId = normalize(row[indexes.testId]);
    const userMessage = normalize(row[indexes.userMessage]);
    if (!testId || !userMessage) continue;

    tests.push({
      sheetRow: i + 1,
      testId,
      conversation: normalize(row[indexes.conversation]) || testId,
      turn: Number(row[indexes.turn]) || 1,
      newSession: /^YES$/i.test(normalize(row[indexes.newSession])),
      category: normalize(row[indexes.category]),
      userMessage,
      expectedBehavior: normalize(row[indexes.expectedBehavior]),
      expectedTools: normalize(row[indexes.expectedTools]),
      mustInclude: normalize(row[indexes.mustInclude]),
      mustNotClaim: normalize(row[indexes.mustNotClaim]),
      expectedUrlPattern: normalize(row[indexes.expectedUrlPattern]),
    });
  }

  return { tests, indexes };
}

function isDangerous(test) {
  const searchable = `${test.category} ${test.userMessage}`.toLowerCase();
  return DANGEROUS_CATEGORIES.some(term => searchable.includes(term));
}

async function callAgent({ test, sessionId }) {
  const response = await fetchWithTimeout(`${BASE_URL}${AGENT_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "DestinyRegression/1.0",
    },
    body: JSON.stringify({
      sessionId,
      messages: [{ role: "user", content: test.userMessage }],
      pageSource: "regression",
      regressionMode: true,
    }),
  }, 60000);

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    throw new Error(`Agent returned non-JSON (${response.status}): ${text.slice(0, 300)}`);
  }
  if (!response.ok) {
    throw new Error(`Agent HTTP ${response.status}: ${body.error || text.slice(0, 300)}`);
  }

  return {
    reply: normalize(body.reply),
    metadata: {
      detectedIntent: body.detectedIntent || "",
      alertSent: Boolean(body.alertSent),
      pendingRelay: Boolean(body.pendingRelay),
      toolCalls: body.debug?.toolCalls || [],
      toolRounds: body.debug?.toolRounds ?? null,
      endpoint: body.debug?.endpoint || "",
      model: body.debug?.model || "",
      versionHeader: response.headers.get("x-destiny-version") || "",
    },
  };
}

async function writeResults(token, indexes, results) {
  if (!results.length) return;

  const updates = [];
  for (const item of results) {
    const noteParts = [];
    if (item.evaluation?.reason) noteParts.push(item.evaluation.reason);
    if (item.evaluation?.missing?.length) noteParts.push(`Missing: ${item.evaluation.missing.join("; ")}`);
    if (item.evaluation?.violations?.length) noteParts.push(`Violations: ${item.evaluation.violations.join("; ")}`);
    if (item.error) noteParts.push(`Runner error: ${item.error}`);

    const valuesByKey = {
      actualReply: item.actualReply || "",
      passFail: item.result || "FAIL",
      score: item.score || 1,
      testerNotes: noteParts.join("\n"),
      agentVersion: item.agentVersion || "",
      testDate: item.testDate,
      liveSessionId: item.sessionId,
    };

    for (const [key, value] of Object.entries(valuesByKey)) {
      const col = columnLetter(indexes[key]);
      updates.push({
        range: `'${TEST_SHEET}'!${col}${item.sheetRow}`,
        values: [[value]],
      });
    }
  }

  const response = await fetchWithTimeout(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: updates,
      }),
    },
    30000,
  );

  if (!response.ok) {
    throw new Error(`Writing regression results failed: ${response.status} ${await response.text()}`);
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      endpoint: "Destiny Blue regression runner",
      agent: `${BASE_URL}${AGENT_PATH}`,
      sheet: TEST_SHEET,
    });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });

  const startedAt = Date.now();
  const runId = makeRunId();
  const {
    testIds = null,
    conversations = null,
    limit = null,
    includeDangerous = false,
    writeToSheet = true,
  } = req.body || {};

  try {
    const token = await getSheetsToken();
    const { tests: allTests, indexes } = await readTests(token);

    let tests = allTests;
    if (Array.isArray(testIds) && testIds.length) {
      const wanted = new Set(testIds.map(normalize));
      tests = tests.filter(test => wanted.has(test.testId));
    }
    if (Array.isArray(conversations) && conversations.length) {
      const wanted = new Set(conversations.map(normalize));
      tests = tests.filter(test => wanted.has(test.conversation));
    }
    if (Number.isInteger(limit) && limit > 0) tests = tests.slice(0, limit);

    tests.sort((a, b) =>
      a.conversation.localeCompare(b.conversation) ||
      a.turn - b.turn ||
      a.sheetRow - b.sheetRow
    );

    const sessions = new Map();
    const results = [];

    for (const test of tests) {
      const sessionId = test.newSession || !sessions.has(test.conversation)
        ? `reg_${runId}_${test.conversation.toLowerCase()}`
        : sessions.get(test.conversation);
      sessions.set(test.conversation, sessionId);

      const testDate = new Date().toISOString();
      if (!includeDangerous && isDangerous(test)) {
        results.push({
          sheetRow: test.sheetRow,
          testId: test.testId,
          sessionId,
          actualReply: "",
          result: "PARTIAL",
          score: 3,
          testDate,
          agentVersion: "SKIPPED-SAFE-MODE",
          evaluation: {
            reason: "Skipped automatically because this scenario could trigger a real owner or maintenance alert. Re-run with includeDangerous=true only in a controlled environment.",
            missing: [],
            violations: [],
          },
        });
        continue;
      }

      try {
        const agent = await callAgent({ test, sessionId });
        const evaluation = await evaluateReply({
          openai,
          test,
          actualReply: agent.reply,
          agentMetadata: agent.metadata,
        });

        results.push({
          sheetRow: test.sheetRow,
          testId: test.testId,
          sessionId,
          actualReply: agent.reply,
          result: evaluation.result,
          score: evaluation.score,
          evaluation,
          testDate,
          agentVersion:
            agent.metadata.versionHeader ||
            agent.metadata.model ||
            process.env.DESTINY_AGENT_MODEL ||
            "unknown",
        });
      } catch (error) {
        results.push({
          sheetRow: test.sheetRow,
          testId: test.testId,
          sessionId,
          actualReply: "",
          result: "FAIL",
          score: 1,
          error: error.message,
          testDate,
          agentVersion: "runner-error",
        });
      }
    }

    if (writeToSheet) await writeResults(token, indexes, results);

    const summary = results.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.result.toLowerCase()] += 1;
        acc.scoreTotal += Number(item.score) || 0;
        return acc;
      },
      { total: 0, pass: 0, partial: 0, fail: 0, scoreTotal: 0 },
    );

    return res.status(200).json({
      ok: true,
      runId,
      wroteToSheet: Boolean(writeToSheet),
      durationSeconds: Math.round((Date.now() - startedAt) / 100) / 10,
      summary: {
        total: summary.total,
        pass: summary.pass,
        partial: summary.partial,
        fail: summary.fail,
        averageScore: summary.total
          ? Math.round((summary.scoreTotal / summary.total) * 100) / 100
          : 0,
      },
      results: results.map(item => ({
        testId: item.testId,
        result: item.result,
        score: item.score,
        sessionId: item.sessionId,
        error: item.error || null,
      })),
    });
  } catch (error) {
    console.error("[REGRESSION]", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
