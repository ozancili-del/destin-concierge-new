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
  for (const [index, eventType] of ["audio_duck_started", "audio_duck_restored", "candidate_classified", "candidate_timed_out", "late_transcript_ignored", "transcription_failed", "router_shadow"].entries()) {
    const res = apiResponse();
    await handler(request({ ...validEvent, eventId: `call_1:${eventType}:${index}`, eventType, role: "system", text: eventType }, `198.51.100.${index + 1}`), res);
    assert.equal(res.statusCode, 201, eventType);
  }
  assert.equal(calls.length, 7);
});

test("voice event endpoint preserves versioned lifecycle correlation fields", async () => {
  const calls = [];
  const handler = createVoiceEventHandler({ servicesClient: { async logVoiceEvent(event) { calls.push(event); return { ok: true }; } } });
  const res = apiResponse();
  await handler(request({
    ...validEvent,
    eventId: "call_1:response_created:42",
    eventType: "response_created",
    role: "system",
    text: "response.created",
    schemaVersion: 2,
    sequence: 42,
    monotonicMs: 1234.4,
    callEpoch: 7,
    transportId: "transport_call_1",
    responseId: "resp_1",
    requestToken: "voice_7_3",
    leaseKind: "tool_final",
    coordinatorState: "playing",
    playbackState: "playing",
    generationState: "in_progress",
    candidateId: "candidate_4",
    taskId: "task_5",
    waveId: "wave_6",
    reason: "bound",
    traceId: "trace_7",
    subrequestId: "subrequest_7",
    requestedRoute: "knowledge",
    executedRoute: "chat-agent",
    domainStatus: "complete",
    knowledgeRevision: "knowledge_7",
    knowledgeSource: "published",
    cacheState: "miss",
    fallbackReason: "knowledge_409_to_live",
    httpStatus: 200,
    nestedLatencyMs: 15432.6,
    nestedToolNames: ["get_weather", "get_weather", "bad tool"],
    resolvedIds: ["weather_result"],
    unresolvedIds: ["current_flags"],
  }), res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual({
    schemaVersion: calls[0].schemaVersion,
    sequence: calls[0].sequence,
    monotonicMs: calls[0].monotonicMs,
    callEpoch: calls[0].callEpoch,
    transportId: calls[0].transportId,
    responseId: calls[0].responseId,
    requestToken: calls[0].requestToken,
    playbackState: calls[0].playbackState,
    traceId: calls[0].traceId,
    executedRoute: calls[0].executedRoute,
    domainStatus: calls[0].domainStatus,
    httpStatus: calls[0].httpStatus,
    nestedLatencyMs: calls[0].nestedLatencyMs,
    nestedToolNames: calls[0].nestedToolNames,
    resolvedIds: calls[0].resolvedIds,
    unresolvedIds: calls[0].unresolvedIds,
  }, {
    schemaVersion: 2,
    sequence: 42,
    monotonicMs: 1234,
    callEpoch: 7,
    transportId: "transport_call_1",
    responseId: "resp_1",
    requestToken: "voice_7_3",
    playbackState: "playing",
    traceId: "trace_7",
    executedRoute: "chat-agent",
    domainStatus: "complete",
    httpStatus: 200,
    nestedLatencyMs: 15433,
    nestedToolNames: ["get_weather"],
    resolvedIds: ["weather_result"],
    unresolvedIds: ["current_flags"],
  });
});

test("voice event endpoint stores a lifecycle batch in one service operation", async () => {
  const batches = [];
  const handler = createVoiceEventHandler({ servicesClient: {
    async logVoiceEvent() { throw new Error("single logger must not run"); },
    async logVoiceEvents(events) { batches.push(events); return { ok: true, stored: events.length }; },
  } });
  const res = apiResponse();
  await handler(request({ events: [
    { ...validEvent, eventId: "call_1:vad_started:1", eventType: "vad_started", role: "system", text: "" },
    { ...validEvent, eventId: "call_1:vad_stopped:2", eventType: "vad_stopped", role: "system", text: "" },
  ] }), res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.stored, 2);
  assert.equal(batches[0].length, 2);
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
  const handler = createVoiceEventHandler({ servicesClient: { async logVoiceEvent() { return { ok: false, reason: "sheets_append_failed" }; } } });
  const res = apiResponse();
  await handler(request(validEvent), res);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /could not be stored/i);
  assert.equal(res.body.reason, "sheets_append_failed");
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

test("voice event service writes lifecycle correlation into column G metadata", async () => {
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
    logger: { log() {}, error() {} },
  });
  const result = await services.logVoiceEvent({ ...validEvent, schemaVersion: 2, sequence: 9, monotonicMs: 876, callEpoch: 3, transportId: "transport_3", responseId: "resp_9", requestToken: "voice_3_9", playbackState: "stopped", traceId: "trace_9", subrequestId: "sub_9", requestedRoute: "knowledge", executedRoute: "published-knowledge", domainStatus: "complete", knowledgeRevision: "revision_9", knowledgeSource: "published", cacheState: "hit", httpStatus: 200, nestedLatencyMs: 0, nestedToolNames: ["published_knowledge"], resolvedIds: ["restaurant_1"], unresolvedIds: [] });
  assert.equal(result.ok, true);
  const append = fetchCalls.find(call => call.url.includes("Sheet1!A1:append"));
  const metadata = JSON.parse(JSON.parse(append.options.body).values[0][6]);
  assert.equal(metadata.schemaVersion, 2);
  assert.equal(metadata.sequence, 9);
  assert.equal(metadata.monotonicMs, 876);
  assert.equal(metadata.callEpoch, 3);
  assert.equal(metadata.transportId, "transport_3");
  assert.equal(metadata.responseId, "resp_9");
  assert.equal(metadata.requestToken, "voice_3_9");
  assert.equal(metadata.playbackState, "stopped");
  assert.equal(metadata.traceId, "trace_9");
  assert.equal(metadata.subrequestId, "sub_9");
  assert.equal(metadata.requestedRoute, "knowledge");
  assert.equal(metadata.executedRoute, "published-knowledge");
  assert.equal(metadata.domainStatus, "complete");
  assert.equal(metadata.knowledgeRevision, "revision_9");
  assert.equal(metadata.cacheState, "hit");
  assert.equal(metadata.httpStatus, 200);
  assert.equal(metadata.nestedLatencyMs, 0);
  assert.deepEqual(metadata.nestedToolNames, ["published_knowledge"]);
  assert.deepEqual(metadata.resolvedIds, ["restaurant_1"]);
  assert.deepEqual(metadata.unresolvedIds, []);
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
