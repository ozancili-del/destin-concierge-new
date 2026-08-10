import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultState } from "../lib/destiny-agent/business.js";
import { runAgentTurn } from "../lib/destiny-agent/orchestrator.js";
import {
  NOW, bookingArgs, functionCall, makeMockServices, runScript, scriptedOpenAI,
  textResponse, toolResponse,
} from "./test-helpers.mjs";

const readOnlyTools = [
  { name: "get_destin_weather", args: {} },
  { name: "get_local_guide", args: { topic: "restaurants" } },
  { name: "get_activity_options", args: { category: "dolphin", date_text: "August 5" } },
  { name: "get_unit_facts", args: { topics: ["units", "amenities"] } },
  { name: "get_business_knowledge", args: { query: "pool and parking", topics: ["resort"], limit: 4 } },
];

// Exercise every non-empty combination twice, with opposite tool ordering. This
// checks result association and parallel execution independently of hand-picked prompts.
for (let mask = 1; mask < (1 << readOnlyTools.length); mask += 1) {
  const selected = readOnlyTools.filter((_, index) => mask & (1 << index));
  for (const reverse of [false, true]) {
    const calls = reverse ? [...selected].reverse() : selected;
    test(`third-wave parallel read-only combination mask=${mask} reverse=${reverse}`, async () => {
      const { result } = await runScript({
        latestUser: "Gather the requested verified information.",
        responses: [toolResponse(calls), textResponse("I gathered the requested verified information.")],
      });
      assert.equal(result.debug.validation.ok, true);
      assert.deepEqual(result.debug.toolCalls.map(x => x.name), calls.map(x => x.name));
      assert.equal(result.toolResults.filter(x => calls.some(c => c.name === x.name)).length, calls.length);
    });
  }
}

const dateCases = [
  ["August 5-10", "2026-08-05", "2026-08-10"],
  ["September 2-6", "2026-09-02", "2026-09-06"],
  ["October 11-15", "2026-10-11", "2026-10-15"],
  ["November 3-8", "2026-11-03", "2026-11-08"],
  ["December 28 to January 2", "2026-12-28", "2027-01-02"],
  ["January 7-12 2027", "2027-01-07", "2027-01-12"],
];
const parties = [
  [1, 0, "1 adult", "no kids"],
  [2, 0, "2 adults", "no kids"],
  [2, 2, "2 adults", "2 children"],
  [3, 1, "3 adults", "1 child"],
];
for (const [dateText, arrival, departure] of dateCases) {
  for (const [adults, children, adultsEvidence, childrenEvidence] of parties) {
    test(`third-wave sequential state then availability: ${dateText}, ${adults}+${children}`, async () => {
      const user = `${dateText}, ${adultsEvidence}, ${childrenEvidence}`;
      const args = bookingArgs({ dateText, adults, adultsEvidence, children, childrenEvidence });
      const { result, services } = await runScript({
        latestUser: user,
        responses: [
          toolResponse([{ name: "remember_booking_details", args, id: "remember" }]),
          toolResponse([{ name: "check_availability", args, id: "availability" }]),
          textResponse("I completed the live availability check using the trip details you provided."),
        ],
      });
      assert.equal(result.state.booking.arrival, arrival);
      assert.equal(result.state.booking.departure, departure);
      assert.equal(result.state.booking.adults, adults);
      assert.equal(result.state.booking.children, children);
      assert.equal(services.calls.checkBothUnits.length, 1);
      assert.deepEqual(result.debug.toolCalls.map(x => x.name), ["remember_booking_details", "check_availability"]);
      assert.equal(result.debug.validation.ok, true);
    });
  }
}

const malformedArgumentValues = [null, [], 7, true, false, "text", [1, 2], "", 0, { nested: [1, 2] }];
for (const [index, value] of malformedArgumentValues.entries()) {
  test(`third-wave non-object or unusual tool arguments ${index}`, async () => {
    const openai = scriptedOpenAI([
      { output_text: "", output: [{ type: "function_call", id: `f${index}`, call_id: `c${index}`, name: "get_destin_weather", arguments: value }] },
      textResponse("I could not use that malformed action request, but the conversation stayed available."),
    ]);
    const result = await runAgentTurn({
      openai, services: makeMockServices(), state: createDefaultState(),
      messages: [{ role: "user", content: "Weather" }], latestUser: "Weather",
      sessionId: "malformed-chaos", now: NOW, logger: { log() {}, error() {} },
    });
    assert.ok(result.reply);
    assert.equal(result.debug.validation.ok, true);
    assert.equal(result.toolResults.length >= 1, true);
  });
}

const oddResponses = [
  {}, { output: null }, { output: [] }, { output_text: "" },
  { output: [{ type: "message", content: null }] },
  { output: [{ type: "message", content: [{ type: "image", url: "x" }] }] },
  { output: [{ type: "reasoning", summary: [] }] },
  { output: [{ type: "function_call", name: null, call_id: "x", arguments: "{}" }] },
  { output: [{ type: "function_call", name: "unknown_x", call_id: "x", arguments: "{}" }] },
  { output_text: "   ", output: [] },
];
for (const [index, odd] of oddResponses.entries()) {
  test(`third-wave malformed model envelope ${index} recovers safely`, async () => {
    const openai = scriptedOpenAI([odd, textResponse("I hit an unexpected response format, so please try that once more.")]);
    const result = await runAgentTurn({
      openai, services: makeMockServices(), state: createDefaultState(),
      messages: [{ role: "user", content: "Help" }], latestUser: "Help",
      sessionId: "odd-envelope", now: NOW, logger: { log() {}, error() {} },
      maxToolRounds: 1,
    });
    assert.ok(result.reply.length > 0);
    assert.equal(result.debug.validation.ok, true);
  });
}

for (let count = 1; count <= 12; count += 1) {
  test(`third-wave duplicate read-only calls are signature-deduplicated count=${count}`, async () => {
    const calls = Array.from({ length: count }, (_, i) => ({ name: "get_destin_weather", args: {}, id: `w${i}` }));
    const services = makeMockServices();
    const { result } = await runScript({
      services,
      latestUser: "Weather",
      responses: [toolResponse(calls), textResponse("I completed one verified weather lookup.")],
      maxToolCallsPerRound: 20,
      maxTotalToolCalls: 20,
    });
    assert.equal(services.calls.fetchDestinWeather.length, 1);
    assert.equal(result.toolResults.filter(x => x.status === "duplicate_suppressed").length, Math.max(0, count - 1));
  });
}
