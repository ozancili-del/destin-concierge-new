import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultState } from "../lib/destiny-agent/business.js";
import { executeTool } from "../lib/destiny-agent/orchestrator.js";
import { context, makeMockServices } from "./test-helpers.mjs";

function bookingArgs(overrides = {}) {
  return {
    date_text: null,
    date_confidence: null,
    arrival: null,
    departure: null,
    adults: 2,
    adults_evidence: "2 adults",
    children: 0,
    children_evidence: "no kids",
    total_guests: null,
    total_guests_evidence: null,
    preferred_unit: null,
    bedrooms_requested: null,
    bedrooms_evidence: null,
    ...overrides,
  };
}

function flightArgs(overrides = {}) {
  return {
    origin_text: "Denver",
    destination_iata: "VPS",
    date_text: null,
    date_confidence: null,
    departure_date: null,
    return_date: null,
    adults: 2,
    adults_evidence: "2 adults",
    children: 0,
    children_evidence: "no kids",
    infants: 0,
    ...overrides,
  };
}

function activityArgs(overrides = {}) {
  return {
    category: "dolphin",
    date_text: null,
    date_confidence: null,
    start_date: null,
    end_date: null,
    arrival: null,
    departure: null,
    ...overrides,
  };
}

async function exec(name, args, latestUser, { state = createDefaultState(), services = makeMockServices() } = {}) {
  return executeTool(name, args, context(state, latestUser, services, { messages: [{ role: "user", content: latestUser }] }));
}

test("booking trusts grounded structured dates without requiring the fallback parser to understand the wording", async () => {
  const latestUser = "For 2 adults and no kids, make it the Wednesday after Labor Day through that Sunday.";
  const services = makeMockServices();
  const result = await exec("check_availability", bookingArgs({
    date_text: "the Wednesday after Labor Day through that Sunday",
    date_confidence: "contextual",
    arrival: "2026-09-09",
    departure: "2026-09-13",
  }), latestUser, { services });

  assert.equal(result.status, "success");
  assert.deepEqual(services.calls.checkBothUnits, [{ arrival: "2026-09-09", departure: "2026-09-13" }]);
  assert.deepEqual(result.data.query, { arrival: "2026-09-09", departure: "2026-09-13", adults: 2, children: 0 });
});

test("flight trusts a grounded full-year numeric interpretation even when fallback parsing disagrees", async () => {
  const latestUser = "Find me a flight from Denver, 07/07/2027-07/14/2027, 2 adults and no kids.";
  const result = await exec("build_flight_search", flightArgs({
    date_text: "07/07/2027-07/14/2027",
    date_confidence: "explicit",
    departure_date: "2027-07-07",
    return_date: "2027-07-14",
  }), latestUser);

  assert.equal(result.status, "success");
  assert.equal(result.data.departureDate, "2027-07-07");
  assert.equal(result.data.returnDate, "2027-07-14");
  assert.match(result.urls[0], /DEN0707VPS14072/);
});

test("flight accepts a contextual natural-language interpretation rather than a catalogued date format", async () => {
  const latestUser = "Denver flights for 2 adults and no kids: leave the day after July Fourth and come home the following Thursday.";
  const result = await exec("build_flight_search", flightArgs({
    date_text: "leave the day after July Fourth and come home the following Thursday",
    date_confidence: "contextual",
    departure_date: "2026-07-05",
    return_date: "2026-07-09",
  }), latestUser);

  assert.equal(result.status, "success");
  assert.deepEqual([result.data.departureDate, result.data.returnDate], ["2026-07-05", "2026-07-09"]);
});

test("activity trusts grounded structured dates despite casual misspelled wording", async () => {
  const latestUser = "Any dolpin trips frm the 26th til the last day of July?";
  const result = await exec("get_activity_options", activityArgs({
    date_text: "frm the 26th til the last day of July",
    date_confidence: "contextual",
    start_date: "2026-07-26",
    end_date: "2026-07-31",
  }), latestUser);

  assert.equal(result.status, "success");
  assert.deepEqual(result.data.dates, { arrival: "2026-07-26", departure: "2026-07-31" });
  assert.match(result.urls[0], /from=07\/26\/2026/);
  assert.match(result.urls[0], /to=07\/31\/2026/);
});

test("ungrounded model dates are rejected instead of being trusted", async () => {
  const latestUser = "Find flights from Denver for 2 adults and no kids.";
  const result = await exec("build_flight_search", flightArgs({
    date_text: "July 7 through July 14",
    date_confidence: "explicit",
    departure_date: "2027-07-07",
    return_date: "2027-07-14",
  }), latestUser);

  assert.equal(result.ok, false);
  assert.equal(result.status, "needs_booking_details");
  assert.deepEqual(result.urls, []);
});

test("ambiguous date interpretation asks for clarification and does not reuse old dates", async () => {
  const state = createDefaultState();
  Object.assign(state.flight, { departureDate: "2026-08-05", returnDate: "2026-08-10", adults: 2, children: 0, originIata: "DEN" });
  const latestUser = "Make the flight one day later.";
  const result = await exec("build_flight_search", flightArgs({
    origin_text: null,
    adults: null,
    adults_evidence: null,
    children: null,
    children_evidence: null,
    date_text: "Make the flight one day later",
    date_confidence: "ambiguous",
  }), latestUser, { state });

  assert.equal(result.ok, false);
  assert.equal(result.status, "needs_date_clarification");
  assert.deepEqual(result.urls, []);
});

test("fallback parsing remains available when the model omits normalized dates", async () => {
  const latestUser = "August 5-10 for 2 adults and no kids.";
  const services = makeMockServices();
  const result = await exec("check_availability", bookingArgs({
    date_text: "August 5-10",
    date_confidence: null,
  }), latestUser, { services });

  assert.equal(result.status, "success");
  assert.deepEqual(services.calls.checkBothUnits, [{ arrival: "2026-08-05", departure: "2026-08-10" }]);
});
