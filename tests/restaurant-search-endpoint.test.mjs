import test from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../pages/api/destiny-restaurant-search.js";

function responseRecorder() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
}

test("confirmed unknown-restaurant endpoint performs one bounded web search", async () => {
  let request;
  const handler = createHandler({ openaiClient: { responses: { create: async value => {
    request = value;
    return { output_text: "The restaurant serves coastal Italian food. Confirm current operations directly.", output: [] };
  } } } });
  const req = { method: "POST", headers: { host: "voice.test", origin: "https://voice.test" }, socket: { remoteAddress: "127.0.0.151" }, body: { query: "Tell me about Example Bistro restaurant", traceId: "trace_r", turnId: "turn_r", subrequestId: "s1" } };
  const res = responseRecorder();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(request.tools[0].type, "web_search");
  assert.match(request.input[0].content, /explicitly confirmed/i);
  assert.equal(res.body.domain.executedRoute, "external-restaurant-search");
});
