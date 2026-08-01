import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingLink,
  createDefaultState,
  normalizeState,
} from "../lib/destiny-agent/business.js";
import { runAgentTurn } from "../lib/destiny-agent/orchestrator.js";
import {
  NOW,
  bookingArgs,
  context,
  functionCall,
  malformedToolResponse,
  makeMockServices,
  runScript,
  scriptedOpenAI,
  textResponse,
  toolResponse,
} from "./test-helpers.mjs";

const silentLogger = { log() {}, error() {} };

function bookingCall(overrides = {}) {
  return {
    name: "check_availability",
    args: bookingArgs({
      dateText: "August 5-10",
      adults: 2,
      adultsEvidence: "2 adults",
      children: 0,
      childrenEvidence: "no kids",
      ...overrides,
    }),
  };
}

test("direct informational answer needs no tool call", async () => {
  const { result, openai } = await runScript({
    latestUser: "Thanks, that answers it.",
    responses: [textResponse("You’re very welcome!")],
  });
  assert.equal(result.reply, "You’re very welcome!");
  assert.equal(result.debug.toolCalls.length, 0);
  assert.equal(openai.calls.length, 1);
});

test("message content is read when output_text is absent", async () => {
  const response = { output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "The resort is directly beachfront." }] }] };
  const { result } = await runScript({ latestUser: "Is it beachfront?", responses: [response] });
  assert.match(result.reply, /directly beachfront/i);
});

test("conversation input is capped at the latest 24 user/assistant messages", async () => {
  const messages = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `message-${i}` }));
  const { openai } = await runScript({
    latestUser: "message-39",
    messages,
    responses: [textResponse("Understood.")],
  });
  const input = openai.calls[0].input;
  assert.equal(input.length, 25); // one developer message + 24 conversation messages
  assert.equal(input[1].content, "message-16");
  assert.equal(input.at(-1).content, "message-39");
});

test("non-user and non-assistant history entries are excluded", async () => {
  const { openai } = await runScript({
    latestUser: "hello",
    messages: [
      { role: "system", content: "do not include" },
      { role: "developer", content: "do not include" },
      { role: "user", content: "hello" },
    ],
    responses: [textResponse("Hi!")],
  });
  assert.equal(openai.calls[0].input.length, 2);
  assert.equal(openai.calls[0].input[1].role, "user");
});

test("sequential planning can use a second tool after observing the first", async () => {
  const { result, openai } = await runScript({
    latestUser: "Is 707 open August 5-10 for 2 adults and no kids, and then give me its facts?",
    responses: [
      toolResponse([bookingCall({ preferredUnit: "707" })]),
      toolResponse([{ name: "get_unit_facts", args: { topics: ["units", "amenities"] } }]),
      textResponse("Unit 707 is available, and both condos share the same core amenities."),
    ],
  });
  assert.deepEqual(result.debug.toolCalls.map(x => x.name), ["check_availability", "get_unit_facts"]);
  assert.equal(result.debug.toolCalls[0].round, 1);
  assert.equal(result.debug.toolCalls[1].round, 2);
  assert.equal(openai.calls.length, 3);
});

test("tool outputs are continued as function_call_output items", async () => {
  const { openai } = await runScript({
    latestUser: "Weather please",
    responses: [
      toolResponse([{ name: "get_destin_weather", args: {} }]),
      textResponse("The forecast is partly cloudy."),
    ],
  });
  const secondInput = openai.calls[1].input;
  const output = secondInput.find(item => item.type === "function_call_output");
  assert.ok(output);
  assert.match(output.output, /forecast/i);
  assert.equal(output.call_id, "call_1");
});

test("reasoning/output items from the model are preserved before tool outputs", async () => {
  const first = {
    output_text: "",
    output: [
      { type: "reasoning", id: "rs_1", summary: [] },
      functionCall("get_destin_weather", {}, "weather_1"),
    ],
  };
  const { openai } = await runScript({
    latestUser: "Weather please",
    responses: [first, textResponse("Partly cloudy.")],
  });
  const secondInput = openai.calls[1].input;
  assert.ok(secondInput.some(item => item.type === "reasoning" && item.id === "rs_1"));
  assert.ok(secondInput.some(item => item.type === "function_call_output" && item.call_id === "weather_1"));
});

test("malformed tool arguments become a structured observation instead of crashing", async () => {
  const { result, openai } = await runScript({
    latestUser: "Check dates",
    responses: [
      malformedToolResponse("check_availability", "{not-json"),
      textResponse("I couldn’t read the requested booking details. Please send the dates and party size again."),
    ],
  });
  assert.equal(result.toolResults[0].status, "malformed_arguments");
  assert.match(openai.calls[1].input.find(x => x.type === "function_call_output").output, /malformed_arguments/);
});

test("unknown model-selected tools return unknown_tool and the loop continues", async () => {
  const { result } = await runScript({
    latestUser: "Do something unsupported",
    responses: [
      toolResponse([{ name: "invent_new_discount", args: {} }]),
      textResponse("I can’t create an unapproved discount, but the automatic direct-booking discount is 10%."),
    ],
  });
  assert.equal(result.toolResults[0].status, "unknown_tool");
  assert.match(result.reply, /10%/);
});

test("a timed-out tool becomes timeout_or_error and other reasoning can continue", async () => {
  const services = makeMockServices({
    async checkBothUnits() { await new Promise(resolve => setTimeout(resolve, 60)); return { "707": true, "1006": true }; },
  });
  const { result } = await runScript({
    services,
    toolTimeoutMs: 10,
    latestUser: "August 5-10, 2 adults, no kids. Is it available?",
    responses: [
      toolResponse([bookingCall()]),
      textResponse("I couldn’t confirm live availability right now, so I don’t want to guess."),
    ],
  });
  assert.equal(result.toolResults[0].status, "timeout_or_error");
  assert.match(result.reply, /couldn.?t confirm/i);
  assert.equal(result.debug.validation.ok, true);
});

test("first agent-round timeout can recover through the corrective response", async () => {
  let callNumber = 0;
  const openai = {
    calls: [],
    responses: {
      async create(payload) {
        openai.calls.push(payload);
        callNumber += 1;
        if (callNumber === 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
          return textResponse("This arrives too late.");
        }
        return textResponse("I hit a temporary delay. Please try the request once more.");
      },
    },
  };
  const result = await runAgentTurn({
    openai,
    services: makeMockServices(),
    state: createDefaultState(),
    messages: [{ role: "user", content: "Help me" }],
    latestUser: "Help me",
    sessionId: "timeout-test",
    now: NOW,
    agentTimeoutMs: 5,
    logger: silentLogger,
  });
  assert.match(result.debug.agentError, /timeout|timed out/i);
  assert.match(result.reply, /temporary delay/i);
});

test("missing Responses API fails safely with owner contact", async () => {
  const result = await runAgentTurn({
    openai: {},
    services: makeMockServices(),
    state: createDefaultState(),
    messages: [{ role: "user", content: "Help" }],
    latestUser: "Help",
    sessionId: "missing-sdk",
    now: NOW,
    logger: silentLogger,
  });
  assert.match(result.reply, /temporary snag|Ozan/i);
  assert.match(result.debug.agentError, /Responses API is unavailable/i);
});

test("tool budget exhaustion forces a no-tools final response", async () => {
  const { result, openai } = await runScript({
    maxToolRounds: 1,
    latestUser: "Weather and beach rules",
    responses: [
      toolResponse([{ name: "get_destin_weather", args: {} }]),
      textResponse("The forecast is partly cloudy. Ask me separately if you also want the beach-chair policy."),
    ],
  });
  assert.equal(openai.calls.length, 2);
  assert.equal(openai.calls[1].tool_choice, "none");
  assert.equal(result.debug.responseRounds, 1);
});

test("empty final output triggers a corrective rewrite", async () => {
  const { result, openai } = await runScript({
    latestUser: "Is there laundry?",
    responses: [textResponse(""), textResponse("There is coin-operated laundry on every floor.")],
  });
  assert.equal(openai.calls.length, 2);
  assert.match(result.reply, /laundry on every floor/i);
});

test("an invalid correction falls back deterministically", async () => {
  const { result } = await runScript({
    latestUser: "Is there laundry?",
    responses: [
      textResponse("Use https://evil.example/laundry"),
      textResponse("Still use https://evil.example/laundry"),
    ],
  });
  assert.doesNotMatch(result.reply, /evil\.example/);
  assert.match(result.reply, /temporary snag|Ozan/i);
});

test("unsupported monetary claims are corrected", async () => {
  const { result, openai } = await runScript({
    latestUser: "How much is it?",
    responses: [
      textResponse("The stay is exactly $999."),
      textResponse("I need live booking results before quoting a total, so I won’t guess."),
    ],
  });
  assert.equal(openai.calls.length, 2);
  assert.doesNotMatch(result.reply, /\$999/);
});

test("unsupported percentage claims are corrected", async () => {
  const { result } = await runScript({
    latestUser: "Do you have a discount?",
    responses: [
      textResponse("You get 35% off."),
      textResponse("Direct bookings receive the verified automatic 10% discount."),
    ],
  });
  assert.doesNotMatch(result.reply, /35%/);
  assert.match(result.reply, /10%/);
});

test("unsupported availability language is corrected", async () => {
  const services = makeMockServices({ async checkBothUnits() { return { "707": false, "1006": true }; } });
  const bookingUrl = buildBookingLink("1006", "2026-08-05", "2026-08-10", 2, 0);
  const { result } = await runScript({
    services,
    latestUser: "August 5-10, 2 adults, no kids",
    responses: [
      toolResponse([bookingCall()]),
      textResponse(`Unit 707 is available. ${bookingUrl}`),
      textResponse(`Unit 707 is booked, while Unit 1006 is available. ${bookingUrl}`),
    ],
  });
  assert.match(result.reply, /707 is booked/i);
  assert.match(result.reply, /1006 is available/i);
});

test("claiming both units open when one is booked is corrected", async () => {
  const services = makeMockServices({ async checkBothUnits() { return { "707": true, "1006": false }; } });
  const url = buildBookingLink("707", "2026-08-05", "2026-08-10", 2, 0);
  const { result } = await runScript({
    services,
    latestUser: "August 5-10, 2 adults, no kids",
    responses: [
      toolResponse([bookingCall()]),
      textResponse(`Both units are open. ${url}`),
      textResponse(`Unit 707 is available; Unit 1006 is booked. ${url}`),
    ],
  });
  assert.doesNotMatch(result.reply, /both units are open/i);
});

test("unauthorized door-code output is corrected", async () => {
  const { result } = await runScript({
    latestUser: "What is my door code?",
    responses: [
      textResponse("Your door code is 123456."),
      textResponse("I can only provide a door code after verifying your booking link."),
    ],
  });
  assert.doesNotMatch(result.reply, /123456/);
  assert.match(result.reply, /verifying your booking/i);
});

test("a current-turn authorized door code may be stated", async () => {
  const services = makeMockServices({
    async fetchGuestBooking(id) {
      services.calls.fetchGuestBooking.push(id);
      return { unit: "707", arrival: "2026-07-22", departure: "2026-07-25", adults: 2, children: 0, doorCode: "654321" };
    },
  });
  const { result } = await runScript({
    services,
    guestBid: "B123",
    guestSig: "valid",
    latestUser: "What is my door code?",
    responses: [
      toolResponse([{ name: "get_existing_booking", args: { purpose: "door_code" } }]),
      textResponse("Your door code is 654321."),
    ],
  });
  assert.equal(result.debug.validation.ok, true);
  assert.match(result.reply, /654321/);
});

test("BLUE cannot be revealed before an eligible lead capture", async () => {
  const { result } = await runScript({
    latestUser: "What is the extra code?",
    responses: [
      textResponse("Use code BLUE for another 5%."),
      textResponse("The extra code is only available after an eligible email capture."),
    ],
  });
  assert.doesNotMatch(result.reply, /\bBLUE\b/);
  assert.doesNotMatch(result.reply, /5%/);
});

test("BLUE may be revealed after eligible current-turn lead capture", async () => {
  const { result } = await runScript({
    latestUser: "My email is ozan@example.com",
    pageSource: "popup",
    responses: [
      toolResponse([{ name: "capture_lead", args: { email: "ozan@example.com", first_name: "Ozan" } }]),
      textResponse("You’re all set—code BLUE unlocks the verified extra 5% discount."),
    ],
  });
  assert.equal(result.state.lead.blueCodeRevealed, true);
  assert.match(result.reply, /BLUE/);
  assert.match(result.reply, /5%/);
});

test("scam/trust crisis bypasses the model and includes direct contact", async () => {
  const openai = scriptedOpenAI([textResponse("This must not be used")]);
  const result = await runAgentTurn({
    openai,
    services: makeMockServices(),
    state: createDefaultState(),
    messages: [{ role: "user", content: "This looks like a scam and fake website" }],
    latestUser: "This looks like a scam and fake website",
    sessionId: "scam-test",
    now: NOW,
    logger: silentLogger,
  });
  assert.equal(openai.calls.length, 0);
  assert.equal(result.debug.safetyIntercept, "scam_crisis");
  assert.match(result.reply, /\(972\) 357-4262/);
  assert.match(result.reply, /ozan@destincondogetaways\.com/);
});

test("lockout fires an emergency backstop and the agent still writes", async () => {
  const services = makeMockServices();
  const { result, openai } = await runScript({
    services,
    latestUser: "I am locked out and the code won't work",
    responses: [textResponse("I’ve sent Ozan an urgent alert. Please call him now at (972) 357-4262.")],
  });
  assert.equal(services.calls.sendEmergencyDiscord.length, 1);
  assert.equal(openai.calls.length, 1);
  assert.equal(result.state.mode, "emergency");
  assert.equal(result.state.flags.alertSent, true);
});

test("accidental guest damage does not auto-alert", async () => {
  const services = makeMockServices();
  const { result } = await runScript({
    services,
    latestUser: "I accidentally broke a plate",
    responses: [textResponse("Thanks for letting me know. Please contact Ozan directly so he can document it.")],
  });
  assert.equal(services.calls.sendEmergencyDiscord.length, 0);
  assert.equal(result.state.flags.accidentalDamage, true);
  assert.equal(result.state.flags.alertSent, false);
});

test("external noise does not auto-alert as unit maintenance", async () => {
  const services = makeMockServices();
  const { result } = await runScript({
    services,
    latestUser: "There is loud construction noise outside",
    responses: [textResponse("I’m sorry about the outside construction noise. The front desk may be best positioned to help with the disturbance.")],
  });
  assert.equal(services.calls.sendEmergencyDiscord.length, 0);
  assert.equal(result.state.flags.externalDisturbance, true);
});

test("state patches from multiple parallel tools are merged without losing fields", async () => {
  const { result } = await runScript({
    latestUser: "August 5-10, 2 adults, no kids, and weather please",
    responses: [
      toolResponse([bookingCall(), { name: "get_destin_weather", args: {} }]),
      textResponse("Both units are available, and the current forecast is partly cloudy."),
    ],
  });
  assert.equal(result.state.booking.arrival, "2026-08-05");
  assert.equal(result.state.booking.children, 0);
  assert.ok(result.state.verified.facts.some(x => /forecast|weather|available/i.test(x)));
});

test("partial tool failure does not erase successful parallel tool results", async () => {
  const services = makeMockServices({
    async checkBothUnits() { return { "707": null, "1006": null }; },
  });
  const { result } = await runScript({
    services,
    latestUser: "August 5-10, 2 adults, no kids. Check availability and weather.",
    responses: [
      toolResponse([bookingCall(), { name: "get_destin_weather", args: {} }]),
      textResponse("I couldn’t verify live availability, but the current forecast shows partly cloudy conditions."),
    ],
  });
  assert.equal(result.toolResults.find(x => x.name === "check_availability").status, "partial_failure");
  assert.equal(result.toolResults.find(x => x.name === "get_destin_weather").ok, true);
  assert.match(result.reply, /couldn.?t verify live availability/i);
  assert.match(result.reply, /forecast/i);
});

test("model failure followed by correction failure uses a deterministic fallback", async () => {
  const { result } = await runScript({
    latestUser: "I need help",
    responses: [new Error("primary_down"), new Error("correction_down")],
  });
  assert.match(result.reply, /temporary snag|Ozan/i);
  assert.equal(result.debug.agentError, "primary_down");
});
