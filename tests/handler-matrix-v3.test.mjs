import test from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../pages/api/chat-agent.js";
import { createDefaultState } from "../lib/destiny-agent/business.js";

function textResponse(text) {
  return { output_text: text, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] };
}

function toolResponse(calls) {
  return {
    output: calls.map((call, index) => ({
      type: "function_call",
      id: `fc_${index}`,
      call_id: `call_${index}`,
      name: call.name,
      arguments: JSON.stringify(call.arguments || {}),
    })),
  };
}
function mockRes() {
  return {
    headers: {}, statusCode: 200, body: null, ended: false,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; },
  };
}
function mockOpenAI(responses = [textResponse("Hello!")]) {
  const calls = [];
  const queue = [...responses];
  return { calls, responses: { async create(payload) { calls.push(payload); const next = queue.shift(); if (next instanceof Error) throw next; return next || textResponse("Hello!"); } } };
}
function mockServices(overrides = {}) {
  const calls = { load: [], read: [], write: [], log: [], admin: 0, booking: [], invite: [], alerts: [] };
  return {
    calls,
    async loadSession(id) { calls.load.push(id); return { history: [], ozanAckType: null, ackDeliveredToGuest: false, openIssues: [], ackedIssues: [] }; },
    async readSessState(id) { calls.read.push(id); return null; },
    async writeSessState(...args) { calls.write.push(args); return { ok: true }; },
    async logToSheets(...args) { calls.log.push(args); return { ok: true }; },
    verifyGuestLinkSignature() { return { ok: false, reason: "invalid", legacy: false }; },
    async fetchGuestBooking(id) { calls.booking.push(id); return null; },
    async runAdminPriceSnapshot() { calls.admin += 1; return { success: true, saved: 4, captured_date: "2026-07-20" }; },
    async sendEmergencyDiscord(...args) { calls.alerts.push(args); return { sent: true }; },
    async sendOwnerChatInvite(...args) { calls.invite.push(args); return { sent: true }; },
    async checkBothUnits() { return { "707": true, "1006": true }; },
    async fetchPriceDrops() { return { status: "success", drops: [] }; },
    async fetchCalendarAlternatives() { return null; },
    async findOpenWindows() { return []; },
    async fetchBlogContent(topic) { return { status: "success", topic, content: "guide", url: `https://www.destincondogetaways.com/blog/${topic}` }; },
    async fetchDestinWeather() { return { status: "success", forecast: [] }; },
    async addBrevoContact() { return { captured: true }; },
    ...overrides,
  };
}
async function request({ method = "POST", body = {}, openai = mockOpenAI(), services = mockServices() } = {}) {
  const handler = createHandler({ openaiClient: openai, servicesClient: services });
  const req = { method, body, headers: {} };
  const res = mockRes();
  await handler(req, res);
  return { res, openai, services };
}

test("OPTIONS returns CORS preflight without invoking dependencies", async () => {
  const { res, openai, services } = await request({ method: "OPTIONS" });
  assert.equal(res.statusCode, 200); assert.equal(res.ended, true);
  assert.equal(res.headers["Access-Control-Allow-Origin"], "*");
  assert.equal(openai.calls.length, 0); assert.equal(services.calls.load.length, 0);
});

test("unsupported HTTP method returns 405", async () => {
  const { res } = await request({ method: "DELETE" });
  assert.equal(res.statusCode, 405); assert.equal(res.body.error, "Method not allowed");
});

test("admin phrase runs the snapshot without entering the agent", async () => {
  const { res, openai, services } = await request({ body: { sessionId: "s", messages: [{ role: "user", content: "lets go mf" }] } });
  assert.equal(services.calls.admin, 1); assert.equal(openai.calls.length, 0);
  assert.match(res.body.reply, /saved 4 rows/); assert.equal(res.body.debug.adminSnapshot, true);
});

test("admin snapshot exception is reported without crashing endpoint", async () => {
  const services = mockServices({ async runAdminPriceSnapshot() { throw new Error("snapshot down"); } });
  const { res } = await request({ services, body: { messages: [{ role: "user", content: "LETS GO MF" }] } });
  assert.match(res.body.reply, /Snapshot failed: snapshot down/);
});

test("page-source open greeting is logged without calling the model", async () => {
  const { res, openai, services } = await request({ body: { sessionId: "g1", pageSource: "restaurants", messages: [] } });
  assert.equal(openai.calls.length, 0); assert.equal(services.calls.log.length, 1);
  assert.match(res.body.reply, /food scene/i); assert.equal(res.body.debug.greeting, "restaurants");
});

test("new owner-chat invite tells the frontend to start polling", async () => {
  let invites = 0;
  const services = createServicesMock();
  services.sendOwnerChatInvite = async () => {
    invites += 1;
    return true;
  };
  const handler = createHandler({
    openaiClient: createResponsesClient([
      toolResponse([{ name: "request_owner_chat", arguments: {} }]),
      textResponse("Ozan has been invited into this chat."),
    ]),
    servicesClient: services,
  });
  const req = makeReq({
    body: {
      messages: [{ role: "user", content: "Invite Ozan into this live chat." }],
      sessionId: "invite-poll-session",
      state: createDefaultState(),
    },
  });
  const res = makeRes();

  await handler(req, res);

  assert.equal(invites, 1);
  assert.equal(res.body.ozanInvited, true);
  assert.equal(res.body.ozanActive, "PENDING");
});

test("active owner chat forwards the guest message and suppresses AI reply", async () => {
  const services = mockServices({
    async readSessState(id) { services.calls.read.push(id); return { ozanActive: "TRUE", ozanMessages: [{ role: "owner", text: "Hi" }], ozanAckType: "owner" }; },
  });
  const { res, openai } = await request({ services, body: { sessionId: "live", messages: [{ role: "user", content: "I am here" }] } });
  assert.equal(openai.calls.length, 0); assert.equal(res.body.reply, "");
  assert.equal(res.body.detectedIntent, "OZAN_ACTIVE");
  assert.equal(services.calls.write[0][1].ozanMessages.at(-1).text, "I am here");
});

test("authorized existing-guest open returns server booking greeting", async () => {
  const booking = { guestFirstName: "Sam", unit: "707", arrival: "2026-08-05", departure: "2026-08-10", arrivalFmt: "August 5, 2026", departureFmt: "August 10, 2026", nights: 5, checkIn: "16:00", checkOut: "10:00", doorCode: "654321", daysUntilArrival: 3, adults: 2, children: 0, isCheckedOut: false };
  const services = mockServices({ verifyGuestLinkSignature() { return { ok: true, legacy: false }; }, async fetchGuestBooking(id) { services.calls.booking.push(id); return booking; } });
  const { res, openai } = await request({ services, body: { sessionId: "eg", guestBid: "B1", guestSig: "ok", messages: [] } });
  assert.equal(openai.calls.length, 0); assert.match(res.body.reply, /Hey Sam/); assert.match(res.body.reply, /654321/);
  assert.equal(res.body.debug.existingGuest, true); assert.equal(services.calls.write.length, 1); assert.equal(services.calls.log.length, 1);
});

test("checked-out existing guest receives post-stay wording", async () => {
  const booking = { guestFirstName: "Sam", unit: "707", arrival: "2026-07-01", departure: "2026-07-05", arrivalFmt: "July 1, 2026", departureFmt: "July 5, 2026", nights: 4, isCheckedOut: true, adults: 2, children: 0 };
  const services = mockServices({ verifyGuestLinkSignature() { return { ok: true, legacy: true }; }, async fetchGuestBooking() { return booking; } });
  const { res } = await request({ services, body: { sessionId: "eg2", guestBid: "B2", messages: [] } });
  assert.match(res.body.reply, /stay has wrapped up/i); assert.equal(res.body.debug.legacyUnsignedLink, true);
});

test("invalid existing-guest link fails closed with direct contact", async () => {
  const { res, openai } = await request({ body: { sessionId: "bad", guestBid: "B9", messages: [] } });
  assert.equal(openai.calls.length, 0); assert.match(res.body.reply, /couldn.?t verify/i); assert.match(res.body.reply, /972/);
  assert.equal(res.body.debug.existingGuestAuthorization, "invalid");
});

test("empty turn after state load returns generic greeting", async () => {
  const { res, openai } = await request({ body: { sessionId: "empty", messages: [] } });
  assert.equal(openai.calls.length, 0); assert.match(res.body.reply, /What can I help you with/i); assert.equal(res.body.debug.emptyTurn, true);
});

test("normal POST persists state and transcript status", async () => {
  const services = mockServices(); const openai = mockOpenAI([textResponse("Both units are one-bedroom condos.")]);
  const { res } = await request({ openai, services, body: { sessionId: "normal", messages: [{ role: "user", content: "How many bedrooms?" }] } });
  assert.equal(res.statusCode, 200); assert.equal(services.calls.write.length, 1); assert.equal(services.calls.log.length, 1);
  assert.equal(services.calls.write[0][1].v2State.version, 2); assert.equal(res.body.debug.agentic, true);
});

test("compact production debug exposes tool names but not full state", async () => {
  const { res } = await request({ body: { sessionId: "prod", messages: [{ role: "user", content: "Hello" }] } });
  assert.equal(res.body.debug.api, "responses"); assert.ok(Array.isArray(res.body.debug.toolNames));
  assert.equal("state" in res.body.debug, false);
});

test("debug environment exposes full trace and typed state", async () => {
  const previous = process.env.DESTINY_AGENT_DEBUG; process.env.DESTINY_AGENT_DEBUG = "true";
  try {
    const { res } = await request({ body: { sessionId: "debug", pageSource: "popup", tickerUnit: "707", messages: [{ role: "user", content: "Hello" }] } });
    assert.equal(res.body.debug.agentic, true); assert.equal(res.body.debug.state.mode, "local_info");
    assert.equal(res.body.debug.pageSource, "popup"); assert.equal(res.body.debug.tickerUnit, "707");
  } finally { if (previous == null) delete process.env.DESTINY_AGENT_DEBUG; else process.env.DESTINY_AGENT_DEBUG = previous; }
});

test("saved v2 state takes precedence over inferred legacy history", async () => {
  const saved = createDefaultState(); saved.booking.adults = 3; saved.booking.children = 1;
  const services = mockServices({
    async loadSession() { return { history: [{ role: "user", content: "2 adults no kids" }], ozanAckType: null }; },
    async readSessState() { return { v2State: saved, ozanActive: "FALSE" }; },
  });
  await request({ services, body: { sessionId: "state", messages: [{ role: "user", content: "Thanks" }] } });
  assert.equal(services.calls.write[0][1].v2State.booking.adults, 3);
  assert.equal(services.calls.write[0][1].v2State.booking.children, 1);
});

test("401 dependency error uses connection-specific fallback", async () => {
  const error = Object.assign(new Error("unauthorized"), { status: 401 });
  const services = mockServices({ async loadSession() { throw error; } });
  const original = console.error; console.error = () => {};
  try {
    const { res } = await request({ services, body: { sessionId: "401", messages: [{ role: "user", content: "hello" }] } });
    assert.match(res.body.reply, /trouble connecting/i); assert.match(res.body.reply, /ozan@destincondogetaways\.com/);
  } finally { console.error = original; }
});

test("generic endpoint error returns a safe retry fallback", async () => {
  const services = mockServices({ async loadSession() { throw new Error("database down"); } });
  const original = console.error; console.error = () => {};
  try {
    const { res } = await request({ services, body: { sessionId: "500", messages: [{ role: "user", content: "hello" }] } });
    assert.match(res.body.reply, /temporary snag/i); assert.equal(res.body.debug.error, "database down");
  } finally { console.error = original; }
});

test("admin phrase must be the entire trimmed user message", async () => {
  for (const content of ["please lets go mf now", "lets go mf and tell me weather", "someone said lets go mf"]) {
    const openai = mockOpenAI([textResponse("Normal agent response.")]);
    const services = mockServices();
    const { res } = await request({ openai, services, body: { sessionId: "not-admin", messages: [{ role: "user", content }] } });
    assert.equal(services.calls.admin, 0);
    assert.equal(openai.calls.length, 1);
    assert.equal(res.body.reply, "Normal agent response.");
  }
});

test("admin phrase tolerates surrounding whitespace but not extra words", async () => {
  const { services } = await request({ body: { messages: [{ role: "user", content: "  LETS   GO   MF  " }] } });
  assert.equal(services.calls.admin, 1);
});

test("admin snapshot structured failure surfaces its reason", async () => {
  const services = mockServices({ async runAdminPriceSnapshot() { return { success: false, reason: "http_503" }; } });
  const { res } = await request({ services, body: { messages: [{ role: "user", content: "lets go mf" }] } });
  assert.match(res.body.reply, /http_503/);
});
