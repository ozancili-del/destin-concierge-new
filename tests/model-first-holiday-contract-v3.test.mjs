import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultState, resolveHolidayStay } from "../lib/destiny-agent/business.js";
import { executeTool } from "../lib/destiny-agent/orchestrator.js";
import { context, makeMockServices } from "./test-helpers.mjs";

const now = new Date("2026-08-02T12:00:00-05:00");

test("holiday calendar calculates future four-night windows without a maintained year table", () => {
  const expected = {
    christmas: ["2026-12-23", "2026-12-27"],
    new_years: ["2026-12-30", "2027-01-03"],
    thanksgiving: ["2026-11-24", "2026-11-28"],
    memorial_day: ["2027-05-29", "2027-06-02"],
    labor_day: ["2026-09-05", "2026-09-09"],
    easter: ["2027-03-26", "2027-03-30"],
    independence_day: ["2027-07-02", "2027-07-06"],
  };
  for (const [holiday, range] of Object.entries(expected)) {
    const stay = resolveHolidayStay(holiday, now);
    assert.deepEqual([stay.arrival, stay.departure], range, holiday);
    assert.equal(stay.nights, 4);
  }
});

test("model-grounded Thanksgiving concept drives a fresh availability check", async () => {
  const latestUser = "Thanksgiving, 2 adults, zero children—check both units.";
  const services = makeMockServices();
  const result = await executeTool("check_availability", {
    date_text: "Thanksgiving", date_confidence: "contextual", arrival: null, departure: null,
    holiday_name: "thanksgiving", holiday_evidence: "Thanksgiving",
    adults: 2, adults_evidence: "2 adults", children: 0, children_evidence: "zero children",
    total_guests: 2, total_guests_evidence: "2 adults, zero children",
    party_scope: "current_trip", party_evidence: "2 adults, zero children",
    preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null,
  }, context(createDefaultState(), latestUser, services, { now }));
  assert.equal(result.status, "success");
  assert.deepEqual(result.data.query, { arrival: "2026-11-24", departure: "2026-11-28", adults: 2, children: 0 });
  assert.match(result.facts.join(" "), /four-night assumption/i);
});

test("explicit guest dates override a holiday default", async () => {
  const latestUser = "For Christmas, check December 24-28, 2026 for 2 adults and no kids.";
  const services = makeMockServices();
  const result = await executeTool("check_availability", {
    date_text: "December 24-28, 2026", date_confidence: "explicit", arrival: "2026-12-24", departure: "2026-12-28",
    holiday_name: "christmas", holiday_evidence: "Christmas",
    adults: 2, adults_evidence: "2 adults", children: 0, children_evidence: "no kids",
    total_guests: 2, total_guests_evidence: "2 adults and no kids",
    party_scope: "current_trip", party_evidence: "2 adults and no kids",
    preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null,
  }, context(createDefaultState(), latestUser, services, { now }));
  assert.equal(result.status, "success");
  assert.deepEqual(result.data.query, { arrival: "2026-12-24", departure: "2026-12-28", adults: 2, children: 0 });
  assert.doesNotMatch(result.facts.join(" "), /four-night assumption/i);
});
