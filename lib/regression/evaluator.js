// lib/regression/evaluator.js
import OpenAI from "openai";

const DEFAULT_JUDGE_MODEL = process.env.REGRESSION_JUDGE_MODEL || "gpt-5.6-sol";

function clean(value) {
  return String(value ?? "").trim();
}

function extractJson(text) {
  const raw = clean(text);
  try {
    return JSON.parse(raw);
  } catch (_) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Judge did not return JSON");
    return JSON.parse(match[0]);
  }
}

export function deterministicUrlCheck(actualReply, expectedPattern) {
  const actual = clean(actualReply);
  const pattern = clean(expectedPattern);
  if (!pattern) return { applicable: false, passed: true, details: "" };

  const alternatives = pattern
    .split(/\s+(?:OR|\|)\s+/i)
    .map(item => item.trim())
    .filter(Boolean);

  const passed = alternatives.some(item => actual.includes(item));
  return {
    applicable: true,
    passed,
    details: passed
      ? "Expected URL/pattern found."
      : `Expected URL/pattern not found: ${pattern}`,
  };
}

export async function evaluateReply({
  openai,
  test,
  actualReply,
  agentMetadata = {},
}) {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  const urlCheck = deterministicUrlCheck(actualReply, test.expectedUrlPattern);

  const prompt = `
You are grading a vacation-rental concierge regression test.

Be strict about factual accuracy, conversation memory, privacy, tool-dependent claims,
and forbidden claims. Do not reward a pleasant tone when the answer is factually wrong.

Return ONLY valid JSON with this exact structure:
{
  "result": "PASS" | "PARTIAL" | "FAIL",
  "score": 1 | 2 | 3 | 4 | 5,
  "reason": "brief explanation",
  "missing": ["important missing items"],
  "violations": ["forbidden or incorrect claims"]
}

Scoring:
5 = fully correct and safe
4 = correct with minor wording/omission
3 = partially correct but meaningful omission or ambiguity
2 = major error, memory failure, or unsupported claim
1 = dangerous, privacy-breaking, or fundamentally wrong

TEST:
Test ID: ${clean(test.testId)}
Conversation: ${clean(test.conversation)}
Turn: ${clean(test.turn)}
Category: ${clean(test.category)}
User message: ${clean(test.userMessage)}
Expected behavior: ${clean(test.expectedBehavior)}
Expected tools: ${clean(test.expectedTools)}
Must include: ${clean(test.mustInclude)}
Must not claim: ${clean(test.mustNotClaim)}
Expected URL/pattern: ${clean(test.expectedUrlPattern)}

ACTUAL AGENT REPLY:
${clean(actualReply)}

AGENT METADATA:
${JSON.stringify(agentMetadata)}

DETERMINISTIC URL CHECK:
${JSON.stringify(urlCheck)}
`.trim();

  const response = await openai.responses.create({
    model: DEFAULT_JUDGE_MODEL,
    input: prompt,
    max_output_tokens: 500,
  });

  const judged = extractJson(response.output_text);
  let result = ["PASS", "PARTIAL", "FAIL"].includes(judged.result)
    ? judged.result
    : "FAIL";
  let score = Number(judged.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) score = 1;

  // A hard URL requirement cannot receive PASS when the required pattern is missing.
  if (urlCheck.applicable && !urlCheck.passed && result === "PASS") {
    result = "PARTIAL";
    score = Math.min(score, 3);
    judged.violations = [
      ...(Array.isArray(judged.violations) ? judged.violations : []),
      urlCheck.details,
    ];
  }

  return {
    result,
    score,
    reason: clean(judged.reason),
    missing: Array.isArray(judged.missing) ? judged.missing.map(clean).filter(Boolean) : [],
    violations: Array.isArray(judged.violations) ? judged.violations.map(clean).filter(Boolean) : [],
    urlCheck,
    judgeModel: DEFAULT_JUDGE_MODEL,
  };
}
