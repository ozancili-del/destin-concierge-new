import assert from "node:assert/strict";
import test from "node:test";
import handler from "../pages/api/destiny-voice-availability.js";

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

test("availability validation preserves trace identity and reports an explicit domain status", async () => {
  const req = {
    method: "POST",
    headers: { host: "voice.test", origin: "https://voice.test", "x-forwarded-for": "198.51.100.224" },
    socket: { remoteAddress: "198.51.100.224" },
    body: {
      arrival: "",
      departure: "",
      adults: 2,
      children: 0,
      traceId: "voice:call_1:tool_1",
      turnId: "response_1",
      subrequestId: "response_1:tool_1",
    },
  };
  const res = responseRecorder();
  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.domain.traceId, req.body.traceId);
  assert.equal(res.body.domain.turnId, req.body.turnId);
  assert.equal(res.body.domain.subrequestId, req.body.subrequestId);
  assert.equal(res.body.domain.requestedRoute, "availability");
  assert.equal(res.body.domain.executedRoute, "ownerrez-availability");
  assert.equal(res.body.domain.status, "clarify");
  assert.deepEqual(res.body.domain.unresolved, ["availability_input"]);
});
