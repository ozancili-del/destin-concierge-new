import test from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../pages/api/chat-agent.js";

function mockRes() {
  return {
    headers: {}, statusCode: 200, body: null, ended: false,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; },
  };
}

function textResponse(text) {
  return { output_text: text, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] };
}

test("GET identifies the agentic endpoint", async () => {
  const handler = createHandler({ openaiClient: { responses: { create: async () => textResponse("unused") } }, servicesClient: {} });
  const req = { method: "GET", body: {}, headers: {} };
  const res = mockRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["X-Destiny-Version"], "agent-v3-responses");
  assert.match(res.body.status, /agent v3/i);
});

test("normal POST enters the Responses agent loop and returns a trace", async () => {
  const openaiCalls = [];
  const openaiClient = {
    responses: {
      async create(payload) {
        openaiCalls.push(payload);
        return textResponse("Both condos are one-bedroom units with a king bed, hallway bunks, and a queen sleeper sofa.");
      },
    },
  };
  const servicesClient = {
    async loadSession() { return { history: [], ozanAckType: null, ackDeliveredToGuest: false, openIssues: [], ackedIssues: [] }; },
    async readSessState() { return null; },
    async writeSessState() { return { ok: true }; },
    async logToSheets() { return { ok: true }; },
    verifyGuestLinkSignature() { return { ok: false, reason: "not_used" }; },
    async runAdminPriceSnapshot() { return { success: true, saved: 0, captured_date: "2026-07-20" }; },
    async sendEmergencyDiscord() { return { sent: true }; },
  };
  const handler = createHandler({ openaiClient, servicesClient });
  const req = {
    method: "POST",
    headers: {},
    body: {
      sessionId: "smoke-session",
      messages: [{ role: "user", content: "How many bedrooms do the condos have?" }],
    },
  };
  const res = mockRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(openaiCalls.length, 1);
  assert.ok(Array.isArray(openaiCalls[0].tools));
  assert.equal(openaiCalls[0].tool_choice, "auto");
  assert.equal(openaiCalls[0].parallel_tool_calls, true);
  assert.equal(res.body.debug.agentic, true);
  assert.equal(res.body.debug.api, "responses");
});
