import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync } from "node:crypto";
import { createServices, fetchWithTimeout } from "../lib/destiny-agent/services.js";
import { NOW } from "./test-helpers.mjs";

const quiet = { log() {}, error() {} };
function response({ ok = true, status = ok ? 200 : 500, json = {}, text = "" } = {}) {
  return { ok, status, async json() { if (json instanceof Error) throw json; return json; }, async text() { return text; } };
}
function makeFetch(routes = []) {
  const calls = [];
  const fn = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    for (const route of routes) {
      const matches = typeof route.match === "string" ? String(url).includes(route.match) : route.match.test(String(url));
      if (matches) return typeof route.reply === "function" ? route.reply(String(url), options, calls) : route.reply;
    }
    throw new Error(`Unmocked URL: ${url}`);
  };
  fn.calls = calls;
  return fn;
}
function booking(overrides = {}) {
  return {
    status: "confirmed", is_block: false, arrival: "2026-07-25", departure: "2026-07-30",
    guest: { first_name: "Sam", last_name: "Guest" }, property: { id: "293722", name: "Pelican 707" },
    door_codes: [{ code: "4321" }], adults: 2, children: 0, ...overrides,
  };
}

test("fetchWithTimeout aborts a hung request", async () => {
  const hanging = (_url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
  });
  await assert.rejects(fetchWithTimeout(hanging, "https://example.test", {}, 5), /aborted/i);
});

test("fetchWithTimeout preserves a caller-provided signal", async () => {
  const controller = new AbortController();
  const fetchImpl = async (_url, options) => { assert.equal(options.signal, controller.signal); return response(); };
  await fetchWithTimeout(fetchImpl, "https://example.test", { signal: controller.signal }, 10);
});

test("Discord truncates untrusted guest text to 300 characters", async () => {
  const fetchImpl = makeFetch([{ match: "discord.com/api", reply: response() }]);
  const services = createServices({ fetchImpl, env: { DISCORD_BOT_TOKEN: "t", DISCORD_CHANNEL_ID: "c" }, now: () => NOW, logger: quiet });
  await services.sendEmergencyDiscord("x".repeat(1000), "s1");
  const body = JSON.parse(fetchImpl.calls[0].options.body);
  const quoted = body.content.match(/\*\*Guest message:\*\* "([x]+)"/);
  assert.equal(quoted?.[1]?.length, 300);
});

test("Discord network exception returns failure", async () => {
  const services = createServices({ fetchImpl: async () => { throw new Error("network down"); }, env: { DISCORD_BOT_TOKEN: "t", DISCORD_CHANNEL_ID: "c" }, now: () => NOW, logger: quiet });
  const result = await services.sendEmergencyDiscord("help", "s1");
  assert.equal(result.sent, false); assert.match(result.reason, /network down/);
});

test("owner-chat invite fails closed without every required field", async () => {
  const services = createServices({ fetchImpl: makeFetch(), env: { DISCORD_BOT_TOKEN: "t", DISCORD_CHANNEL_ID: "c" }, now: () => NOW, logger: quiet });
  for (const args of [
    { sessionId: null, guestMessage: "talk", inviteToken: "x" },
    { sessionId: "s", guestMessage: "talk", inviteToken: null },
  ]) assert.equal((await services.sendOwnerChatInvite(args)).sent, false);
});

test("owner-chat invite reports Discord HTTP rejection", async () => {
  const fetchImpl = makeFetch([{ match: "discord.com/api", reply: response({ ok: false, status: 403 }) }]);
  const services = createServices({ fetchImpl, env: { DISCORD_BOT_TOKEN: "t", DISCORD_CHANNEL_ID: "c" }, now: () => NOW, logger: quiet });
  assert.deepEqual(await services.sendOwnerChatInvite({ sessionId: "s", guestMessage: "talk", inviteToken: "x" }), { sent: false, reason: "http_403" });
});

test("weather rejects a non-array forecast schema", async () => {
  const fetchImpl = makeFetch([{ match: "weather.googleapis.com", reply: response({ json: { forecastDays: { bad: true } } }) }]);
  const services = createServices({ fetchImpl, env: { GOOGLE_WEATHER_API_KEY: "k" }, now: () => NOW, logger: quiet });
  const result = await services.fetchDestinWeather();
  assert.equal(result.status, "unavailable"); assert.deepEqual(result.forecast, []);
});

test("weather skips malformed days instead of manufacturing zero temperatures", async () => {
  const fetchImpl = makeFetch([{ match: "weather.googleapis.com", reply: response({ json: { forecastDays: [
    { date: { year: 2026, month: 7, day: 21 }, maxTemperature: {}, minTemperature: {} },
    { date: { year: 2026, month: 13, day: 40 }, maxTemperature: { degrees: 90 }, minTemperature: { degrees: 70 } },
  ] } }) }]);
  const services = createServices({ fetchImpl, env: { GOOGLE_WEATHER_API_KEY: "k" }, now: () => NOW, logger: quiet });
  const result = await services.fetchDestinWeather();
  assert.equal(result.status, "unavailable"); assert.deepEqual(result.forecast, []);
});

test("weather accepts either fractional or whole-number precipitation probability", async () => {
  const forecastDays = [0.31, 31, 200, -5].map((rain, i) => ({
    date: { year: 2026, month: 7, day: 21 + i }, maxTemperature: { degrees: 89 }, minTemperature: { degrees: 76 }, precipitationProbability: rain,
  }));
  const fetchImpl = makeFetch([{ match: "weather.googleapis.com", reply: response({ json: { forecastDays } }) }]);
  const services = createServices({ fetchImpl, env: { GOOGLE_WEATHER_API_KEY: "k" }, now: () => NOW, logger: quiet });
  const result = await services.fetchDestinWeather();
  assert.deepEqual(result.forecast.map(x => x.rain), [31, 31, 100, 0]);
});

test("weather malformed JSON is reported as unavailable", async () => {
  const fetchImpl = makeFetch([{ match: "weather.googleapis.com", reply: response({ json: new Error("bad json") }) }]);
  const services = createServices({ fetchImpl, env: { GOOGLE_WEATHER_API_KEY: "k" }, now: () => NOW, logger: quiet });
  assert.equal((await services.fetchDestinWeather()).status, "unavailable");
});

test("blog content is capped at 3500 characters", async () => {
  const fetchImpl = makeFetch([{ match: "best-restaurants-destin", reply: response({ text: `<p>${"a".repeat(5000)}</p>` }) }]);
  const services = createServices({ fetchImpl, env: {}, now: () => NOW, logger: quiet });
  assert.equal((await services.fetchBlogContent("restaurants")).content.length, 3500);
});

test("blog network and malformed-body errors fail safely", async () => {
  const services = createServices({ fetchImpl: async () => { throw new Error("blog down"); }, env: {}, now: () => NOW, logger: quiet });
  const result = await services.fetchBlogContent("restaurants");
  assert.equal(result.status, "unavailable"); assert.match(result.reason, /blog down/);
});

for (const status of ["CANCELED", "Cancelled", "cancelled", "canceled"]) {
  test(`guest booking rejects normalized cancellation status ${status}`, async () => {
    const fetchImpl = makeFetch([{ match: "/bookings/B1", reply: response({ json: booking({ status }) }) }]);
    const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
    assert.equal(await services.fetchGuestBooking("B1"), null);
  });
}

const malformedBookingDates = [
  { arrival: null }, { arrival: "2026-02-30" }, { departure: null },
  { departure: "bad" }, { arrival: "2026-08-10", departure: "2026-08-05" },
  { arrival: "2026-08-05", departure: "2026-08-05" },
];
for (const dates of malformedBookingDates) {
  test(`guest booking rejects malformed range ${JSON.stringify(dates)}`, async () => {
    const fetchImpl = makeFetch([{ match: "/bookings/B1", reply: response({ json: booking(dates) }) }]);
    const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
    assert.equal(await services.fetchGuestBooking("B1"), null);
  });
}

test("door code boundary is inclusive at exactly seven days", async () => {
  const fetchImpl = makeFetch([{ match: "/bookings/B1", reply: response({ json: booking({ arrival: "2026-07-27", departure: "2026-07-30" }) }) }]);
  const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
  assert.equal((await services.fetchGuestBooking("B1")).doorCode, "4321");
});

test("door code is withheld at eight days", async () => {
  const fetchImpl = makeFetch([{ match: "/bookings/B1", reply: response({ json: booking({ arrival: "2026-07-28", departure: "2026-07-30" }) }) }]);
  const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
  assert.equal((await services.fetchGuestBooking("B1")).doorCode, null);
});

test("availability fails closed when OwnerRez omits both bookings arrays", async () => {
  const fetchImpl = makeFetch([{ match: "/v2/bookings?", reply: response({ json: {} }) }]);
  const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
  assert.equal(await services.checkAvailability("293722", "2026-08-05", "2026-08-10", 1), null);
});

test("availability fails closed for null or object booking collections", async () => {
  for (const payload of [{ items: null }, { bookings: {} }]) {
    const fetchImpl = makeFetch([{ match: "/v2/bookings?", reply: response({ json: payload }) }]);
    const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
    assert.equal(await services.checkAvailability("293722", "2026-08-05", "2026-08-10", 1), null);
  }
});

test("malformed active booking record makes availability unknown", async () => {
  const fetchImpl = makeFetch([{ match: "/v2/bookings?", reply: response({ json: { items: [{ status: "confirmed", arrival: "bad", departure: "2026-08-10" }] } }) }]);
  const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
  assert.equal(await services.checkAvailability("293722", "2026-08-05", "2026-08-10", 1), null);
});

test("malformed canceled booking is ignored because it cannot block inventory", async () => {
  const fetchImpl = makeFetch([{ match: "/v2/bookings?", reply: response({ json: { items: [{ status: "cancelled", arrival: "bad", departure: null }] } }) }]);
  const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
  assert.equal(await services.checkAvailability("293722", "2026-08-05", "2026-08-10", 1), true);
});

for (const args of [
  [null, "2026-08-05", "2026-08-10"], ["293722", "bad", "2026-08-10"],
  ["293722", "2026-02-30", "2026-08-10"], ["293722", "2026-08-10", "2026-08-05"],
  ["293722", "2026-08-05", "2026-08-05"],
]) {
  test(`invalid availability input performs no network call: ${args.join("|")}`, async () => {
    const fetchImpl = makeFetch(); const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
    assert.equal(await services.checkAvailability(...args, 1), null); assert.equal(fetchImpl.calls.length, 0);
  });
}

test("availability retries an HTTP failure and accepts later valid data", async () => {
  let count = 0;
  const fetchImpl = makeFetch([{ match: "/v2/bookings?", reply: () => (++count === 1 ? response({ ok: false, status: 503 }) : response({ json: { items: [] } })) }]);
  const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
  assert.equal(await services.checkAvailability("293722", "2026-08-05", "2026-08-10", 2), true); assert.equal(count, 2);
});

test("checkBothUnits preserves partial unknown status", async () => {
  const fetchImpl = makeFetch([{ match: "/v2/bookings?", reply: (url) => url.includes("293722") ? response({ json: { items: [] } }) : response({ ok: false, status: 503 }) }]);
  const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
  assert.deepEqual(await services.checkBothUnits("2026-08-05", "2026-08-10"), { "707": true, "1006": null });
});

test("calendar alternatives HTTP and JSON failures return null", async () => {
  for (const reply of [response({ ok: false, status: 500 }), response({ json: new Error("bad json") })]) {
    const services = createServices({ fetchImpl: makeFetch([{ match: "/api/calendar", reply }]), env: {}, now: () => NOW, logger: quiet });
    assert.equal(await services.fetchCalendarAlternatives("2026-08-05", "2026-08-10"), null);
  }
});

for (const args of [
  { targetArrival: "bad", targetDeparture: "2026-08-10" },
  { targetArrival: "2026-08-10", targetDeparture: "2026-08-05" },
  { targetArrival: "2026-08-05", targetDeparture: "2026-08-10", minNights: 0 },
  { targetArrival: "2026-08-05", targetDeparture: "2026-08-10", minNights: 61 },
]) {
  test(`findOpenWindows rejects invalid request without network: ${JSON.stringify(args)}`, async () => {
    const fetchImpl = makeFetch(); const services = createServices({ fetchImpl, env: { OWNERREZ_API_TOKEN: "x" }, now: () => NOW, logger: quiet });
    assert.deepEqual(await services.findOpenWindows(args), []); assert.equal(fetchImpl.calls.length, 0);
  });
}

test("Brevo missing configuration and network exceptions fail safely", async () => {
  const missing = createServices({ fetchImpl: makeFetch(), env: {}, now: () => NOW, logger: quiet });
  assert.equal((await missing.addBrevoContact("a@b.com", "A")).reason, "missing_configuration");
  const down = createServices({ fetchImpl: async () => { throw new Error("brevo down"); }, env: { BREVO_API_KEY: "x" }, now: () => NOW, logger: quiet });
  assert.match((await down.addBrevoContact("a@b.com", "A")).reason, /brevo down/);
});

const invalidDrops = [
  { dropPct: 4, windowDays: 7, fromPrice: 300, toPrice: 250 },
  { dropPct: 61, windowDays: 7, fromPrice: 300, toPrice: 250 },
  { dropPct: 10, windowDays: 0, fromPrice: 300, toPrice: 250 },
  { dropPct: 10, windowDays: 61, fromPrice: 300, toPrice: 250 },
  { dropPct: 10, windowDays: 7, fromPrice: 200, toPrice: 200 },
  { dropPct: 10, windowDays: 7, fromPrice: 300, toPrice: 0 },
  { dropPct: "nope", windowDays: 7, fromPrice: 300, toPrice: 250 },
];
for (const item of invalidDrops) {
  test(`price-drop validation rejects ${JSON.stringify(item)}`, async () => {
    const fetchImpl = makeFetch([{ match: "/api/price-drops", reply: response({ json: { "707": item } }) }]);
    const services = createServices({ fetchImpl, env: {}, now: () => NOW, logger: quiet });
    assert.deepEqual((await services.fetchPriceDrops("2026-08-05", "2026-08-10")).drops, []);
  });
}

test("price-drop HTTP and JSON failures are unavailable", async () => {
  for (const reply of [response({ ok: false, status: 500 }), response({ json: new Error("bad json") })]) {
    const services = createServices({ fetchImpl: makeFetch([{ match: "/api/price-drops", reply }]), env: {}, now: () => NOW, logger: quiet });
    assert.equal((await services.fetchPriceDrops("2026-08-05", "2026-08-10")).status, "unavailable");
  }
});

test("admin snapshot handles HTTP, JSON, and network failures without throwing", async () => {
  const cases = [
    { fetchImpl: makeFetch([{ match: "/api/price-snapshot", reply: response({ ok: false, status: 503 }) }]), pattern: /http_503/ },
    { fetchImpl: makeFetch([{ match: "/api/price-snapshot", reply: response({ json: new Error("bad json") }) }]), pattern: /bad json/ },
    { fetchImpl: async () => { throw new Error("snapshot down"); }, pattern: /snapshot down/ },
  ];
  for (const item of cases) {
    const result = await createServices({ fetchImpl: item.fetchImpl, env: {}, now: () => NOW, logger: quiet }).runAdminPriceSnapshot();
    assert.equal(result.success, false); assert.match(result.reason, item.pattern);
  }
});

test("admin snapshot success attempts revalidation but survives its failure", async () => {
  const fetchImpl = makeFetch([
    { match: "/api/price-snapshot", reply: response({ json: { success: true, saved: 3 } }) },
    { match: "/api/revalidate-deals", reply: response({ ok: false, status: 500 }) },
  ]);
  const services = createServices({ fetchImpl, env: { CRON_SECRET: "secret" }, now: () => NOW, logger: quiet });
  assert.deepEqual(await services.runAdminPriceSnapshot(), { success: true, saved: 3 });
  assert.equal(fetchImpl.calls.length, 2);
});

test("guest-link signature rejects missing and malformed signatures under strict mode", () => {
  const services = createServices({ fetchImpl: makeFetch(), env: { GUEST_LINK_SECRET: "secret" }, now: () => NOW, logger: quiet });
  assert.equal(services.verifyGuestLinkSignature("B1", null).reason, "missing_signature");
  assert.equal(services.verifyGuestLinkSignature(null, "x").reason, "missing_signature");
  assert.equal(services.verifyGuestLinkSignature("B1", "***").ok, false);
});

test("guest-link signature remains exact across similar booking IDs", () => {
  const secret = "secret";
  const sig = createHmac("sha256", secret).update("B1").digest("base64url");
  const services = createServices({ fetchImpl: makeFetch(), env: { GUEST_LINK_SECRET: secret }, now: () => NOW, logger: quiet });
  assert.equal(services.verifyGuestLinkSignature("B1", sig).ok, true);
  assert.equal(services.verifyGuestLinkSignature("B10", sig).ok, false);
});

test("malformed Sheets message/state cells are normalized instead of escaping", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 1024 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  const fetchImpl = makeFetch([
    { match: "oauth2.googleapis.com/token", reply: response({ json: { access_token: "token" } }) },
    { match: "sheets.googleapis.com", reply: response({ json: { values: [["sessionId"], ["s1", "FALSE", "FALSE", "{bad", "", "", "", "{also bad"]] } }) },
  ]);
  const services = createServices({ fetchImpl, env: { GOOGLE_SERVICE_ACCOUNT_EMAIL: "svc@example.com", GOOGLE_PRIVATE_KEY: pem, GOOGLE_SHEET_ID: "sheet" }, now: () => NOW, logger: quiet });
  const result = await services.readSessState("s1");
  assert.deepEqual(result.ozanMessages, []); assert.equal(result.v2State, null);
});

test("logToSheets fails before network when sheet configuration is absent", async () => {
  const fetchImpl = makeFetch(); const services = createServices({ fetchImpl, env: {}, now: () => NOW, logger: quiet });
  assert.equal((await services.logToSheets("s", "g", "a", "", "INFO")).reason, "missing_configuration");
  assert.equal(fetchImpl.calls.length, 0);
});
