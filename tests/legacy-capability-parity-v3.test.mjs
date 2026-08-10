import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  BLOG_URLS,
  STATIC_URLS,
  TRIPSHOCK_CATEGORIES,
  detectPets,
  detectVagueWeek,
  extractHolidayDates,
  findValidTwoUnitSplits,
  parseDateAdjustment,
  validateParty,
} from "../lib/destiny-agent/business.js";
import { searchBusinessKnowledge } from "../lib/destiny-agent/knowledge-retrieval.js";

const knowledgeSource = fs.readFileSync(new URL("../lib/destiny-agent/knowledge-v1.js", import.meta.url), "utf8");
const promptSource = fs.readFileSync(new URL("../lib/destiny-agent/agent-prompt.js", import.meta.url), "utf8");
const orchestratorSource = fs.readFileSync(new URL("../lib/destiny-agent/orchestrator.js", import.meta.url), "utf8");

test("legacy parity: named holidays and vague weeks remain deterministic", () => {
  assert.deepEqual(extractHolidayDates("Thanksgiving"), {
    arrival: "2026-11-25",
    departure: "2026-11-29",
    label: "Thanksgiving weekend (Nov 25–29, 2026)",
  });
  assert.equal(detectVagueWeek("the second week of August"), true);
  assert.equal(detectVagueWeek("August 5 to August 10"), false);
});

test("legacy parity: explicit adjustments preserve duration and stay extensions change checkout", () => {
  const current = { arrival: "2026-08-05", departure: "2026-08-10" };
  assert.deepEqual(parseDateAdjustment("move the whole stay two days later", current), {
    arrival: "2026-08-07",
    departure: "2026-08-12",
  });
  assert.deepEqual(parseDateAdjustment("stay two more days", current), {
    arrival: "2026-08-05",
    departure: "2026-08-12",
  });
  assert.equal(parseDateAdjustment("make it one day later", current), null);
});

test("legacy parity: all emitted two-condo splits preserve the whole party and unit limits", () => {
  for (const [adults, children] of [[7, 0], [4, 4], [6, 6]]) {
    const splits = findValidTwoUnitSplits(adults, children);
    assert.ok(splits.length > 0);
    for (const split of splits) {
      assert.equal(split.a1 + split.a2, adults);
      assert.equal(split.c1 + split.c2, children);
      assert.equal(validateParty(split.a1, split.c1, { allowTwoUnits: false }).ok, true);
      assert.equal(validateParty(split.a2, split.c2, { allowTwoUnits: false }).ok, true);
    }
  }
});

test("legacy parity: partial-stay and fresh-verification routes are code-backed", () => {
  assert.match(orchestratorSource, /fetchCalendarAlternatives/);
  assert.match(orchestratorSource, /parsePartialCalendarOptions/);
  assert.match(orchestratorSource, /freshAvailabilityCheck: true/);
  assert.match(promptSource, /fresh live availability check/i);
});

test("legacy parity: itinerary, activities, flights, guides and booking URLs are code-owned", () => {
  assert.equal(STATIC_URLS.tripPlanner, "https://www.destincondogetaways.com/destin-vacation-itinerary-planner-574049367");
  assert.ok(BLOG_URLS.weather);
  assert.ok(BLOG_URLS.activities);
  assert.equal(TRIPSHOCK_CATEGORIES.photographer, "beach-photographers");
  for (const tool of ["check_availability", "find_open_windows", "get_activity_options", "build_flight_search", "get_destin_weather", "get_local_guide"]) {
    assert.match(orchestratorSource, new RegExp(`name: \\"${tool}\\"`));
  }
});

test("legacy parity: operational integrations remain callable Agent v3 tools", () => {
  for (const tool of ["get_existing_booking", "create_maintenance_alert", "capture_lead", "relay_owner_message", "request_owner_chat", "get_business_knowledge", "get_unit_facts"]) {
    assert.match(orchestratorSource, new RegExp(`name: \\"${tool}\\"`));
  }
});

test("legacy parity: high-risk policy and property knowledge was preserved", () => {
  const requiredFacts = [
    /MAX GUESTS PER UNIT: 6/i,
    /BOOKING TRANSFER:/i,
    /SECURITY DEPOSIT:/i,
    /CANCELLATION:/i,
    /MONTHLY STAY DISCOUNT:/i,
    /40% discount/i,
    /10% direct booking discount/i,
    /BEACH CHAIR PLACEMENT RULES/i,
    /LDV Resorts/i,
    /AC RULES/i,
    /emotional support animals/i,
    /CHILD \/ TODDLER \/ FAMILY SAFETY/i,
    /sliding balcony door/i,
    /3 pools/i,
    /Pelican Beach Café/i,
  ];
  for (const fact of requiredFacts) assert.match(knowledgeSource, fact);
  assert.equal(detectPets("Can I bring a service animal?"), true);
});

test("legacy parity: knowledge retrieval returns policy text instead of model memory", () => {
  const result = searchBusinessKnowledge({
    query: "monthly discount cancellation booking transfer beach chair child safety",
    limit: 12,
  });
  const text = JSON.stringify(result);
  assert.ok(result.snippets.length > 0);
  assert.match(text, /discount/i);
  assert.match(text, /booking/i);
  assert.match(text, /beach chair|child safety/i);
});

test("legacy parity: the prompt requires tools for factual and consequential claims", () => {
  assert.match(promptSource, /call get_business_knowledge or get_unit_facts/i);
  assert.match(promptSource, /Never state live availability.*Call the appropriate tool/i);
  assert.match(promptSource, /door code.*Call the appropriate tool/i);
  assert.match(promptSource, /Never claim Ozan was notified unless the tool result confirms it/i);
});

test("flight links use clear live-results guidance", () => {
  assert.match(promptSource, /Check the link above for live fares, schedules, seats, and availability/i);
  assert.doesNotMatch(promptSource, /link does not confirm live fares/i);
});
