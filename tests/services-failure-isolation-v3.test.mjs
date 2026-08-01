import test from "node:test";
import assert from "node:assert/strict";
import { createServices, fetchWithTimeout } from "../lib/destiny-agent/services.js";

const quietLogger = { log() {}, warn() {}, error() {} };

test("OwnerRez network failure is unknown, never available", async () => {
  const services = createServices({
    fetchImpl: async () => { throw new Error("network down"); },
    env: { OWNERREZ_API_TOKEN: "test" },
    logger: quietLogger,
  });
  assert.equal(await services.checkAvailability("707", "2026-08-05", "2026-08-10"), null);
});

test("weather network failure returns unavailable without fake temperatures", async () => {
  const services = createServices({
    fetchImpl: async () => { throw new Error("network down"); },
    env: { GOOGLE_WEATHER_API_KEY: "test" },
    logger: quietLogger,
  });
  const result = await services.fetchDestinWeather();
  assert.equal(result.status, "unavailable");
  assert.deepEqual(result.forecast, []);
});

test("Brevo fails closed without controlled configuration", async () => {
  const services = createServices({ fetchImpl: async () => assert.fail("must not call network"), env: {}, logger: quietLogger });
  assert.deepEqual(await services.addBrevoContact("guest@example.com"), { captured: false, reason: "missing_configuration" });
});

test("fetch timeout aborts stalled adapters", async () => {
  const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
  await assert.rejects(fetchWithTimeout(fetchImpl, "https://example.test", {}, 5), /aborted/);
});

