import test from "node:test";
import assert from "node:assert/strict";
import { applyStatePatch, createDefaultState } from "../lib/destiny-agent/business.js";
import { executeTool } from "../lib/destiny-agent/orchestrator.js";

function context(overrides = {}) {
  return {
    state: createDefaultState(),
    latestUser: "August 5-10 for two adults and no children",
    now: new Date("2026-08-01T12:00:00-05:00"),
    sessionId: "controlled-integration",
    guestBid: null,
    guestSig: null,
    pageSource: "ai-concierge",
    sawBanner: false,
    ...overrides,
    services: {
      checkBothUnits: async () => ({ "707": true, "1006": false }),
      fetchPriceDrops: async () => ({ drops: [] }),
      fetchCalendarAlternatives: async () => [],
      fetchDestinWeather: async () => ({ status: "success", forecast: [{ date: "2026-08-05", desc: "sunny", hi: 88, lo: 76, rain: 10 }] }),
      sendEmergencyDiscord: async () => ({ sent: true }),
      sendOwnerChatInvite: async () => ({ sent: true, token: "controlled-token" }),
      readSessState: async () => ({}),
      writeSessState: async () => true,
      ...overrides.services,
    },
  };
}

test("controlled OwnerRez matrix exposes only positively available unit", async () => {
  const result = await executeTool("check_availability", {
    date_text: "August 5-10",
    arrival: null,
    departure: null,
    adults: 2,
    adults_evidence: "two adults",
    children: 0,
    children_evidence: "no children",
    total_guests: null,
    total_guests_evidence: null,
    preferred_unit: null,
    bedrooms_requested: null,
    bedrooms_evidence: null,
  }, context());
  assert.equal(result.status, "success");
  assert.equal(result.data.units.find(unit => unit.unit === "707").available, true);
  assert.equal(result.data.units.find(unit => unit.unit === "1006").available, false);
  assert.equal(result.urls.length, 1);
  assert.match(result.urls[0], /unit-707/);
});

test("controlled OwnerRez unknown never creates booking link", async () => {
  const result = await executeTool("check_availability", {
    date_text: "August 5-10", arrival: null, departure: null,
    adults: 2, adults_evidence: "two adults", children: 0, children_evidence: "no children",
    total_guests: null, total_guests_evidence: null, preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null,
  }, context({ services: { checkBothUnits: async () => ({ "707": null, "1006": null }) } }));
  assert.equal(result.status, "partial_failure");
  assert.deepEqual(result.urls, []);
});

test("controlled weather result remains structured and grounded", async () => {
  const result = await executeTool("get_destin_weather", {}, context());
  assert.equal(result.ok, true);
  assert.match(result.facts[0], /88°F/);
});

test("controlled maintenance delivery records one successful side effect", async () => {
  let sends = 0;
  const result = await executeTool("create_maintenance_alert", { severity: "urgent", summary: "AC is broken" }, context({
    latestUser: "The AC is broken and the condo is hot",
    services: { sendEmergencyDiscord: async () => { sends += 1; return { sent: true }; } },
  }));
  assert.equal(result.ok, true);
  assert.equal(sends, 1);
});

test("a repeated maintenance report in a later guest message can alert again", async () => {
  let sends = 0;
  const services = { sendEmergencyDiscord: async () => { sends += 1; return { sent: true }; } };
  const firstState = createDefaultState();
  const first = await executeTool("create_maintenance_alert", { severity: "maintenance", summary: "AC is broken" }, context({
    state: firstState,
    latestUser: "The AC is broken and the condo is hot",
    services,
  }));
  const secondState = applyStatePatch(firstState, first.statePatch);
  const second = await executeTool("create_maintenance_alert", { severity: "maintenance", summary: "AC is still broken" }, context({
    state: secondState,
    latestUser: "The AC is still broken and it is getting hotter",
    services,
  }));
  assert.equal(first.status, "sent");
  assert.equal(second.status, "sent");
  assert.equal(sends, 2);
});

test("controlled owner chat requires explicit request and returns no internal URL", async () => {
  const result = await executeTool("request_owner_chat", {}, context({ latestUser: "Can I speak to Ozan?" }));
  assert.equal(result.ok, true);
  assert.equal(result.urls.length, 0);
  assert.equal(result.data.token, undefined);
});
