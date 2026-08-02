import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultState } from "../lib/destiny-agent/business.js";
import { executeTool } from "../lib/destiny-agent/orchestrator.js";
import { context, makeMockServices } from "./test-helpers.mjs";

function args(overrides = {}) {
  return {
    date_text: "August 5-10, 2027", date_confidence: "explicit",
    arrival: "2027-08-05", departure: "2027-08-10",
    adults: null, adults_evidence: null, children: null, children_evidence: null,
    total_guests: null, total_guests_evidence: null,
    party_scope: null, party_evidence: null,
    preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null,
    ...overrides,
  };
}

async function check(latestUser, overrides, state = createDefaultState()) {
  const services = makeMockServices();
  const result = await executeTool("check_availability", args(overrides), context(state, latestUser, services));
  return { result, services };
}

test("model-scoped exclusive adult party supports zero children without a zero keyword", async () => {
  const latestUser = "August 5-10, 2027. It will just be me and my husband.";
  const { result } = await check(latestUser, {
    adults: 2, adults_evidence: "me and my husband",
    children: 0, children_evidence: "just be me and my husband",
    party_scope: "current_trip", party_evidence: "It will just be me and my husband",
  });
  assert.equal(result.status, "success");
  assert.deepEqual(result.data.query, { arrival: "2027-08-05", departure: "2027-08-10", adults: 2, children: 0 });
});

test("model current-trip interpretation wins when a past-trip phrase is also present", async () => {
  const latestUser = "Unlike last time, this trip is 3 adults and 1 kid, August 5-10, 2027.";
  const { result } = await check(latestUser, {
    adults: 3, adults_evidence: "3 adults", children: 1, children_evidence: "1 kid",
    party_scope: "current_trip", party_evidence: "this trip is 3 adults and 1 kid",
  });
  assert.equal(result.status, "success");
  assert.equal(result.data.query.adults, 3);
  assert.equal(result.data.query.children, 1);
});

test("not-current-trip counts are not stored or sent to availability", async () => {
  const latestUser = "My sister has 2 kids but none of them are coming, August 5-10, 2027.";
  const { result, services } = await check(latestUser, {
    adults: null, adults_evidence: null, children: 2, children_evidence: "2 kids",
    party_scope: "not_current_trip", party_evidence: "My sister has 2 kids but none of them are coming",
  });
  assert.equal(result.ok, false);
  assert.equal(result.data.query.children, null);
  assert.equal(services.calls.checkBothUnits.length, 0);
});

test("ambiguous model party interpretation asks instead of guessing", async () => {
  const latestUser = "Maybe the kids join us, maybe not. August 5-10, 2027.";
  const { result, services } = await check(latestUser, {
    party_scope: "ambiguous", party_evidence: "Maybe the kids join us, maybe not",
  });
  assert.equal(result.status, "needs_party_clarification");
  assert.equal(services.calls.checkBothUnits.length, 0);
});

test("unresolved child evidence fails closed even if the model scopes confirmed adults", async () => {
  const latestUser = "My wife and I are coming August 5-10, 2027, and our two kids might join.";
  const { result, services } = await check(latestUser, {
    adults: 2, adults_evidence: "My wife and I", children: null, children_evidence: "our two kids might join",
    party_scope: "current_trip", party_evidence: "My wife and I are coming",
  });
  assert.equal(result.status, "needs_party_clarification");
  assert.equal(services.calls.checkBothUnits.length, 0);
});

test("fabricated party evidence is rejected even when the model claims current trip", async () => {
  const latestUser = "August 5-10, 2027.";
  const { result, services } = await check(latestUser, {
    adults: 4, adults_evidence: "4 adults", children: 0, children_evidence: "no kids",
    party_scope: "current_trip", party_evidence: "4 adults and no kids",
  });
  assert.equal(result.ok, false);
  assert.equal(services.calls.checkBothUnits.length, 0);
});
