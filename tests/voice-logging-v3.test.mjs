import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { createServices } from "../lib/destiny-agent/services.js";
import { createVoiceEventHandler } from "../pages/api/destiny-voice-events.js";

function response({ ok = true, status = ok ? 200 : 500, json = {} } = {}) {
  return { ok, status, async json() { return json; }, async text() { return ""; } };
}

function apiResponse() {
  return {
    headers: {}, statusCode: 200, body: null, ended: false,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; },
  };
}

function request(body, ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`) {
  return {
    method: "POST",
    headers: { host: "example.com", origin: "https://example.com", "x-forwarded-for": ip },
    body,
  };
}

const validEvent = {
  sessionId: "voice_session_1",
  callId: "call_1",
  eventId: "call_1:user_transcript:item_1",
  eventType: "user_transcript",
  role: "user",
  text: "Can you check October 4 through October 8?",
  turnId: "item_1",
  providerEventId: "item_1",
};

test("voice event endpoint stores a completed transcript", async () => {
  const calls = [];
  const handler = createVoiceEventHandler({ servicesClient: { async logVoiceEvent(event) { calls.push(event); return { ok: true, duplicate: false }; } } });
  const res = apiResponse();
  await handler(request(validEvent), res);
  assert.equal(res.statusCode, 201);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].text, validEvent.text);
  assert.equal(calls[0].role, "user");
});

test("voice event endpoint treats a retried stable event ID as success", async () => {
  const handler = createVoiceEventHandler({ servicesClient: { async logVoiceEvent() { return { ok: true, duplicate: true }; } } });
  const res = apiResponse();
  await handler(request(validEvent), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, duplicate: true });
});

test("voice event endpoint accepts lifecycle classification and duck telemetry", async () => {
  const calls = [];
  const handler = createVoiceEventHandler({ servicesClient: { async logVoiceEvent(event) { calls.push(event); return { ok: true }; } } });
  for (const [index, eventType] of ["audio_duck_started", "audio_duck_restored", "candidate_classified", "candidate_timed_out", "late_transcript_ignored", "transcription_failed"].entries()) {
    const res = apiResponse();
    await handler(request({ ...validEvent, eventId: `call_1:${eventType}:${index}`, eventType, role: "system", text: eventType }, `198.51.100.${index + 1}`), res);
    assert.equal(res.statusCode, 201, eventType);
  }
  assert.equal(calls.length, 6);
});

test("voice event endpoint rejects missing transcript text and malformed identity", async () => {
  const servicesClient = { async logVoiceEvent() { throw new Error("must not run"); } };
  const handler = createVoiceEventHandler({ servicesClient });
  const missingText = apiResponse();
  await handler(request({ ...validEvent, text: "" }), missingText);
  assert.equal(missingText.statusCode, 400);
  const malformed = apiResponse();
  await handler(request({ ...validEvent, eventId: "bad id with spaces" }), malformed);
  assert.equal(malformed.statusCode, 400);
});

test("voice event endpoint reports durable-store failure without pretending success", async () => {
  const handler = createVoiceEventHandler({ servicesClient: { async logVoiceEvent() { return { ok: false, reason: "down" }; } } });
  const res = apiResponse();
  await handler(request(validEvent), res);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /could not be stored/i);
});

test("voice event service appends a role-specific row with review metadata", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const fetchCalls = [];
  const fetchImpl = async (url, options = {}) => {
    fetchCalls.push({ url: String(url), options });
    if (String(url).includes("oauth2.googleapis.com/token")) return response({ json: { access_token: "token" } });
    if (String(url).includes("Sheet1!G:G")) return response({ json: { values: [] } });
    if (String(url).includes("Sheet1!A1:append")) return response({ status: 200 });
    throw new Error(`Unmocked URL: ${url}`);
  };
  const services = createServices({
    fetchImpl,
    env: {
      GOOGLE_SHEET_ID: "sheet",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "service@example.test",
      GOOGLE_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }),
    },
    now: () => new Date("2026-09-01T12:00:00-05:00"),
    logger: { log() {}, error() {} },
  });
  const result = await services.logVoiceEvent(validEvent);
  assert.equal(result.ok, true);
  const append = fetchCalls.find(call => call.url.includes("Sheet1!A1:append"));
  const row = JSON.parse(append.options.body).values[0];
  assert.equal(row[1], validEvent.sessionId);
  assert.equal(row[2], validEvent.text);
  assert.equal(row[3], "");
  assert.equal(row[5], "VOICE_USER_TRANSCRIPT");
  assert.equal(JSON.parse(row[6]).voiceEventId, validEvent.eventId);
});

test("voice event service suppresses a duplicate before append", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const fetchCalls = [];
  const fetchImpl = async (url, options = {}) => {
    fetchCalls.push({ url: String(url), options });
    if (String(url).includes("oauth2.googleapis.com/token")) return response({ json: { access_token: "token" } });
    if (String(url).includes("Sheet1!G:G")) return response({ json: { values: [[JSON.stringify({ voiceEventId: validEvent.eventId })]] } });
    throw new Error(`Append must not run: ${url}`);
  };
  const services = createServices({
    fetchImpl,
    env: {
      GOOGLE_SHEET_ID: "sheet",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "service@example.test",
      GOOGLE_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }),
    },
    logger: { log() {}, error() {} },
  });
  const result = await services.logVoiceEvent(validEvent);
  assert.deepEqual(result, { ok: true, duplicate: true });
  assert.equal(fetchCalls.some(call => call.url.includes("append")), false);
});
