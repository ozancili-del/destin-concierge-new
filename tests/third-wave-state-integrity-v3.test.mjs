import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingLink,
  createDefaultState,
  normalizeState,
} from "../lib/destiny-agent/business.js";
import { executeTool } from "../lib/destiny-agent/orchestrator.js";
import {
  NOW,
  bookingArgs,
  context,
  makeMockServices,
  runScript,
  textResponse,
  toolResponse,
} from "./test-helpers.mjs";

function verifiedState() {
  const state = createDefaultState();
  state.booking = { ...state.booking, arrival: "2026-08-05", departure: "2026-08-10", adults: 2, children: 0, totalGuests: 2 };
  state.verified.bookingUrls = [buildBookingLink("707", "2026-08-05", "2026-08-10", 2, 0)];
  state.verified.activityUrls = ["https://www.tripshock.com/?aff=destindreamcondo"];
  state.verified.flightUrls = ["https://www.aviasales.com/search/DFW0508VPS10082"];
  state.verified.availabilityCheckedAt = NOW.toISOString();
  state.verified.availabilityQuery = { arrival: "2026-08-05", departure: "2026-08-10", adults: 2, children: 0 };
  state.verified.availabilityUnits = { "707": true, "1006": false };
  state.verified.facts = ["Unit 707: available."];
  return normalizeState(state);
}

test("trip date change invalidates all trip-dependent verified URLs", async () => {
  const state = verifiedState();
  const result = await executeTool("remember_booking_details", {
    ...bookingArgs({ dateText: "August 6-11", adults: null, adultsEvidence: null, children: null, childrenEvidence: null }),
    date_role: "range",
  }, context(state, "Actually August 6-11", makeMockServices()));
  assert.equal(result.statePatch.booking.arrival, "2026-08-06");
  assert.deepEqual(result.statePatch.verified.bookingUrls, []);
  assert.deepEqual(result.statePatch.verified.activityUrls, []);
  assert.deepEqual(result.statePatch.verified.flightUrls, []);
  assert.equal(result.statePatch.verified.availabilityCheckedAt, null);
  assert.equal(result.statePatch.verified.availabilityQuery, null);
});

test("party-size change invalidates prior availability and links", async () => {
  const state = verifiedState();
  const result = await executeTool("remember_booking_details", {
    date_text: null, date_role: null, arrival: null, departure: null,
    adults: 3, adults_evidence: "3 adults", children: 1, children_evidence: "one child",
    total_guests: null, total_guests_evidence: null, preferred_unit: null,
    bedrooms_requested: null, bedrooms_evidence: null,
  }, context(state, "Actually 3 adults and one child", makeMockServices()));
  assert.equal(result.statePatch.booking.adults, 3);
  assert.equal(result.statePatch.booking.children, 1);
  assert.deepEqual(result.statePatch.verified.bookingUrls, []);
  assert.deepEqual(result.statePatch.verified.availabilityUnits, { "707": null, "1006": null });
});

test("repeating identical trip details preserves current verification", async () => {
  const state = verifiedState();
  const result = await executeTool("remember_booking_details", {
    ...bookingArgs(), date_role: "range",
  }, context(state, "August 5-10, 2 adults, no kids", makeMockServices()));
  assert.equal("verified" in result.statePatch, false);
});

test("preferred-unit change invalidates unit-specific booking verification", async () => {
  const state = verifiedState();
  const result = await executeTool("remember_booking_details", {
    date_text: null, date_role: null, arrival: null, departure: null,
    adults: null, adults_evidence: null, children: null, children_evidence: null,
    total_guests: null, total_guests_evidence: null, preferred_unit: "1006",
    bedrooms_requested: null, bedrooms_evidence: null,
  }, context(state, "I prefer 1006", makeMockServices()));
  assert.equal(result.statePatch.booking.preferredUnit, "1006");
  assert.deepEqual(result.statePatch.verified.bookingUrls, []);
  assert.equal(result.statePatch.verified.availabilityCheckedAt, null);
});

const corruptedVerificationCases = [
  { name: "invalid timestamp", mutate(s) { s.verified.availabilityCheckedAt = "not-a-date"; } },
  { name: "future timestamp", mutate(s) { s.verified.availabilityCheckedAt = "2026-07-20T15:10:00.000Z"; } },
  { name: "missing query", mutate(s) { s.verified.availabilityQuery = null; } },
  { name: "malicious hostname", mutate(s) { s.verified.bookingUrls = ["https://evil.example/pelican-beach-resort-unit-707-orp5b47b5ax?or_arrival=2026-08-05&or_departure=2026-08-10&or_adults=2&or_children=0"]; } },
  { name: "mismatched arrival", mutate(s) { s.verified.bookingUrls = [buildBookingLink("707", "2026-08-06", "2026-08-10", 2, 0)]; } },
  { name: "link for unavailable unit", mutate(s) { s.verified.availabilityUnits["707"] = false; } },
  { name: "non-numeric party query", mutate(s) { s.verified.bookingUrls = [s.verified.bookingUrls[0].replace("or_adults=2", "or_adults=two")]; } },
  { name: "mixed valid and malicious links", mutate(s) { s.verified.bookingUrls.push("https://evil.example/pay"); } },
];
for (const item of corruptedVerificationCases) {
  test(`fresh booking-link check ignores persisted verification: ${item.name}`, async () => {
    const state = verifiedState(); item.mutate(state);
    const result = await executeTool("build_booking_links", {}, context(state, "Please resend the links", makeMockServices()));
    assert.equal(result.ok, true);
    assert.equal(result.data.freshAvailabilityCheck, true);
    assert.equal(result.urls.length, 2);
  });
}

test("valid persisted booking verification is refreshed before links are resent", async () => {
  const state = verifiedState();
  const result = await executeTool("build_booking_links", {}, context(state, "Please resend the links", makeMockServices()));
  assert.equal(result.ok, true);
  assert.equal(result.urls.length, 2);
  assert.equal(result.data.freshAvailabilityCheck, true);
});

const consequentialScenarios = [
  {
    name: "capture_lead",
    latestUser: "My email is round@example.com",
    pageSource: "popup",
    args: { email: "round@example.com", first_name: "Round" },
    count(services) { return services.calls.addBrevoContact.length; },
    final: "Code BLUE is authorized for the verified extra 5% discount.",
  },
  {
    name: "relay_owner_message",
    latestUser: "Please tell Ozan we arrive after midnight",
    args: { message_summary: "Arriving after midnight" },
    count(services) { return services.calls.sendEmergencyDiscord.length; },
    final: "I sent the message to Ozan once.",
  },
  {
    name: "request_owner_chat",
    latestUser: "Can I speak with Ozan?",
    args: {},
    count(services) { return services.calls.sendOwnerChatInvite.length; },
    final: "Ozan was invited to the chat once.",
  },
];
for (const scenario of consequentialScenarios) {
  test(`cross-round duplicate consequential action is suppressed: ${scenario.name}`, async () => {
    const services = makeMockServices();
    const responses = [
      toolResponse([{ name: scenario.name, args: scenario.args, id: "round1" }]),
      toolResponse([{ name: scenario.name, args: scenario.args, id: "round2" }]),
      textResponse(scenario.final),
    ];
    const { result } = await runScript({
      services,
      latestUser: scenario.latestUser,
      pageSource: scenario.pageSource || null,
      responses,
    });
    assert.equal(scenario.count(services), 1);
    assert.equal(result.toolResults.filter(r => r.status === "duplicate_suppressed").length, 1);
  });
}

test("maintenance safety backstop prevents a later model round from sending a second alert", async () => {
  const services = makeMockServices();
  const { result } = await runScript({
    services,
    latestUser: "The AC is broken and not cooling",
    responses: [
      toolResponse([{ name: "create_maintenance_alert", args: { severity: "maintenance", summary: "AC broken" }, id: "again" }]),
      textResponse("I alerted Ozan once about the AC problem."),
    ],
  });
  assert.equal(services.calls.sendEmergencyDiscord.length, 1);
  assert.ok(result.toolResults.some(r => r.status === "duplicate_suppressed"));
});

test("identical read-only tools are suppressed within one turn", async () => {
  const services = makeMockServices();
  await runScript({
    services,
    latestUser: "Check the weather twice to compare the results",
    responses: [
      toolResponse([{ name: "get_destin_weather", args: {}, id: "w1" }]),
      toolResponse([{ name: "get_destin_weather", args: {}, id: "w2" }]),
      textResponse("Both forecast checks returned the same verified result."),
    ],
  });
  assert.equal(services.calls.fetchDestinWeather.length, 1);
});
