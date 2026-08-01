import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultState,
  normalizeState,
} from "../lib/destiny-agent/business.js";
import { runAgentTurn } from "../lib/destiny-agent/orchestrator.js";
import {
  NOW,
  bookingArgs,
  functionCall,
  makeMockServices,
  runScript,
  scriptedOpenAI,
  textResponse,
  toolResponse,
} from "./test-helpers.mjs";

const logger = { log() {}, error() {} };

function manyToolResponse(calls) {
  return {
    output_text: "",
    output: calls.map((call, index) => functionCall(call.name, call.args || {}, call.id || `bulk_${index}`)),
  };
}

test("soak: a single model round is capped to a bounded number of tool calls", async () => {
  const calls = Array.from({ length: 40 }, (_, i) => ({ name: "get_destin_weather", args: {}, id: `weather_${i}` }));
  const { result, services } = await runScript({
    latestUser: "Check weather repeatedly",
    responses: [manyToolResponse(calls), textResponse("I checked the forecast once and avoided duplicate calls.")],
  });
  assert.ok(result.debug.toolCalls.length <= 8);
  assert.ok(services.calls.fetchDestinWeather.length <= 1);
  assert.ok(result.toolResults.some(r => r.status === "tool_call_limit_exceeded" || r.status === "duplicate_suppressed"));
});

test("soak: duplicate maintenance actions in one model round send only one Discord alert", async () => {
  const services = makeMockServices();
  const latestUser = "The AC is broken and not cooling.";
  const { result } = await runScript({
    services,
    latestUser,
    responses: [
      manyToolResponse([
        { name: "create_maintenance_alert", args: { severity: "maintenance", summary: "AC not cooling" }, id: "a1" },
        { name: "create_maintenance_alert", args: { severity: "maintenance", summary: "AC not cooling" }, id: "a2" },
      ]),
      textResponse("I alerted Ozan once about the AC issue."),
    ],
  });
  // One automatic safety backstop is expected; duplicate model calls must not add more sends.
  assert.equal(services.calls.sendEmergencyDiscord.length, 1);
  assert.equal(result.state.openIssues.length, 1);
});

test("soak: duplicate lead captures in one round call Brevo only once", async () => {
  const services = makeMockServices();
  const { result } = await runScript({
    services,
    pageSource: "popup",
    latestUser: "My email is test@example.com",
    responses: [
      manyToolResponse([
        { name: "capture_lead", args: { email: "test@example.com", first_name: "Test" }, id: "l1" },
        { name: "capture_lead", args: { email: "test@example.com", first_name: "Test" }, id: "l2" },
      ]),
      textResponse("Your email was captured, and code BLUE unlocks the verified extra 5% discount."),
    ],
  });
  assert.equal(services.calls.addBrevoContact.length, 1);
  assert.equal(result.state.lead.blueCodeRevealed, true);
});

test("soak: duplicate owner relays in one round send only once", async () => {
  const services = makeMockServices();
  const { result } = await runScript({
    services,
    latestUser: "Please tell Ozan we will arrive after 9 PM.",
    responses: [
      manyToolResponse([
        { name: "relay_owner_message", args: { message_summary: "Arriving after 9 PM" }, id: "r1" },
        { name: "relay_owner_message", args: { message_summary: "Arriving after 9 PM" }, id: "r2" },
      ]),
      textResponse("I sent your arrival update to Ozan."),
    ],
  });
  assert.equal(services.calls.sendEmergencyDiscord.length, 1);
  assert.equal(result.debug.validation.ok, true);
});

test("soak: long messages are bounded before being sent to the model", async () => {
  const huge = "A".repeat(100_000) + " weather?";
  const { openai } = await runScript({ latestUser: huge, responses: [textResponse("Please send a shorter version of the request.")] });
  const developer = openai.calls[0].input[0].content;
  const user = openai.calls[0].input.at(-1).content;
  assert.ok(developer.length < 30_000);
  assert.ok(user.length <= 12_000);
});

test("soak: long history is bounded by message count and per-message size", async () => {
  const messages = Array.from({ length: 60 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `${i}:` + "x".repeat(20_000) }));
  const { openai } = await runScript({ latestUser: messages.at(-1).content, messages, responses: [textResponse("Understood.")] });
  const conversation = openai.calls[0].input.slice(1);
  assert.ok(conversation.length <= 24);
  assert.ok(conversation.every(m => m.content.length <= 12_000));
  assert.ok(conversation.reduce((n, m) => n + m.content.length, 0) <= 120_000);
});

for (let permutation = 0; permutation < 24; permutation += 1) {
  test(`soak: compound tool order permutation ${permutation + 1} preserves all independent results`, async () => {
    const base = [
      { name: "check_availability", args: bookingArgs() },
      { name: "get_destin_weather", args: {} },
      { name: "get_activity_options", args: { category: "dolphin", date_text: "August 5", arrival: null, departure: null } },
      { name: "get_unit_facts", args: { topics: ["laundry", "wifi"] } },
    ];
    const shift = permutation % base.length;
    const rotated = [...base.slice(shift), ...base.slice(0, shift)];
    if (permutation % 2) rotated.reverse();
    const { result } = await runScript({
      latestUser: "August 5-10, 2 adults, no kids: availability, weather, dolphin cruise, laundry and Wi-Fi.",
      responses: [toolResponse(rotated), textResponse("I checked availability, weather, dolphin options, laundry, and Wi-Fi details.")],
    });
    const names = new Set(result.toolResults.map(r => r.name));
    for (const item of base) assert.ok(names.has(item.name));
    assert.equal(result.state.booking.adults, 2);
    assert.equal(result.state.booking.children, 0);
    assert.ok(result.state.verified.bookingUrls.length >= 1);
    assert.ok(result.state.verified.activityUrls.length >= 1);
  });
}

test("soak: ten-turn conversation preserves explicit state across unrelated topics", async () => {
  let state = createDefaultState();
  const services = makeMockServices();
  const turns = [
    { user: "August 5-10", calls: [{ name: "remember_booking_details", args: { ...bookingArgs({ adults: null, adultsEvidence: null, children: null, childrenEvidence: null }), date_role: "range" } }], reply: "I saved the dates. How many adults and children?" },
    { user: "2 adults, no kids", calls: [{ name: "remember_booking_details", args: { ...bookingArgs({ dateText: null }), date_role: null } }], reply: "I saved 2 adults and no children." },
    { user: "Is there laundry?", calls: [{ name: "get_unit_facts", args: { topics: ["laundry"] } }], reply: "Coin-operated laundry is available on every floor." },
    { user: "What about Wi-Fi?", calls: [{ name: "get_unit_facts", args: { topics: ["wifi"] } }], reply: "The Wi-Fi is 250+ Mbps and suitable for video calls." },
    { user: "Actually make it August 6-11", calls: [{ name: "remember_booking_details", args: { ...bookingArgs({ dateText: "August 6-11", adults: null, adultsEvidence: null, children: null, childrenEvidence: null }), date_role: "range" } }], reply: "I updated the dates to August 6-11." },
    { user: "Check availability", calls: [{ name: "check_availability", args: { ...bookingArgs({ dateText: null, adults: null, adultsEvidence: null, children: null, childrenEvidence: null }) } }], reply: "Both units are available for August 6-11." },
    { user: "Weather too", calls: [{ name: "get_destin_weather", args: {} }], reply: "The available forecast is partly cloudy." },
    { user: "Dolphin cruise", calls: [{ name: "get_activity_options", args: { category: "dolphin", date_text: null, arrival: null, departure: null } }], reply: "Here is the verified dolphin-cruise option." },
    { user: "Actually 3 adults and one child", calls: [{ name: "remember_booking_details", args: { date_text: null, date_role: null, arrival: null, departure: null, adults: 3, adults_evidence: "3 adults", children: 1, children_evidence: "one child", total_guests: null, total_guests_evidence: null, preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null } }], reply: "I updated the party to 3 adults and one child." },
    { user: "Check again", calls: [{ name: "check_availability", args: { date_text: null, arrival: null, departure: null, adults: null, adults_evidence: null, children: null, children_evidence: null, total_guests: null, total_guests_evidence: null, preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null } }], reply: "Both units remain available for the updated party." },
  ];
  const history = [];
  for (const turn of turns) {
    history.push({ role: "user", content: turn.user });
    const openai = scriptedOpenAI([toolResponse(turn.calls), textResponse(turn.reply)]);
    const result = await runAgentTurn({
      openai,
      model: "gpt-5-mini",
      services,
      state,
      messages: history,
      latestUser: turn.user,
      sessionId: "ten-turn",
      now: NOW,
      logger,
    });
    state = normalizeState(result.state);
    history.push({ role: "assistant", content: result.reply });
  }
  assert.equal(state.booking.arrival, "2026-08-06");
  assert.equal(state.booking.departure, "2026-08-11");
  assert.equal(state.booking.adults, 3);
  assert.equal(state.booking.children, 1);
  assert.ok(state.verified.bookingUrls.length >= 1);
  assert.ok(state.verified.activityUrls.length >= 1);
});
