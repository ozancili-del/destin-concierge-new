import test from "node:test";
import assert from "node:assert/strict";
import {
  allowSameOriginRequest,
  cleanText,
  enforceJsonSize,
  enforceRateLimit,
  escapeHtml,
  parseIsoDate,
  safeExternalHttpUrl,
  signPayload,
  validEmail,
  verifyPayloadSignature,
} from "../lib/public-api-security.js";

function response() {
  return {
    headers: {}, statusCode: 200, body: null, ended: false,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; },
  };
}

test("same-origin guard accepts the site and rejects foreign origins", () => {
  const accepted = response();
  assert.equal(allowSameOriginRequest({ method: "POST", headers: { host: "example.com", origin: "https://example.com" } }, accepted), true);
  assert.equal(accepted.headers["Access-Control-Allow-Origin"], "https://example.com");

  const rejected = response();
  assert.equal(allowSameOriginRequest({ method: "POST", headers: { host: "example.com", origin: "https://attacker.test" } }, rejected), false);
  assert.equal(rejected.statusCode, 403);
});

test("same-origin guard handles preflight and unsupported methods", () => {
  const preflight = response();
  assert.equal(allowSameOriginRequest({ method: "OPTIONS", headers: { host: "example.com", origin: "https://example.com" } }, preflight), false);
  assert.equal(preflight.statusCode, 204);

  const unsupported = response();
  assert.equal(allowSameOriginRequest({ method: "GET", headers: { host: "example.com" } }, unsupported), false);
  assert.equal(unsupported.statusCode, 405);
});

test("payload cap rejects oversized JSON", () => {
  const res = response();
  assert.equal(enforceJsonSize({ headers: {}, body: { value: "x".repeat(200) } }, res, 50), false);
  assert.equal(res.statusCode, 413);
});

test("rate limiter fails closed after the configured request count", () => {
  const req = { headers: { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200) + 1}` } };
  const first = response(), second = response();
  const scope = `test-${Date.now()}-${Math.random()}`;
  assert.equal(enforceRateLimit(req, first, { scope, limit: 1, windowMs: 60_000 }), true);
  assert.equal(enforceRateLimit(req, second, { scope, limit: 1, windowMs: 60_000 }), false);
  assert.equal(second.statusCode, 429);
});

test("signed itinerary payload rejects modification", () => {
  const secret = "test-secret", payload = { itinerary: { summary: "safe" }, formSnapshot: { adults: 2 } };
  const signature = signPayload(payload, secret);
  assert.equal(verifyPayloadSignature(payload, signature, secret), true);
  assert.equal(verifyPayloadSignature({ ...payload, formSnapshot: { adults: 3 } }, signature, secret), false);
});

test("validation and sanitization helpers constrain public input", () => {
  assert.equal(validEmail(" Guest@Example.COM "), "guest@example.com");
  assert.equal(validEmail("not-an-email"), null);
  assert.equal(cleanText("  hello\n world  ", 20), "hello world");
  assert.equal(escapeHtml('<script data-x="1">'), "&lt;script data-x=&quot;1&quot;&gt;");
  assert.ok(parseIsoDate("2026-08-22"));
  assert.equal(parseIsoDate("2026-02-31"), null);
  assert.match(safeExternalHttpUrl("https://www.tripshock.com/test", { allowedHosts: ["tripshock.com"] }), /^https:/);
  assert.equal(safeExternalHttpUrl("https://evil.example/test", { allowedHosts: ["tripshock.com"] }), "");
});
