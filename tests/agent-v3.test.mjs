import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingLink,
  buildTripShockLink,
  createDefaultState,
  extractDates,
  normalizeState,
  validateReply,
} from "../lib/destiny-agent/business.js";
import {
  executeTool,
  RESPONSE_TOOL_DEFINITIONS,
  runAgentTurn,
} from "../lib/destiny-agent/orchestrator.js";
import { searchBusinessKnowledge } from "../lib/destiny-agent/knowledge-retrieval.js";

const NOW = new Date("2026-07-20T09:00:00-05:00");

function functionCall(name, args, id = `call_${name}`) {
  return { type: "function_call", id: `fc_${id}`, call_id: id, name, arguments: JSON.stringify(args) };
}

function toolResponse(calls) {
  return { output: calls.map((call, index) => functionCall(call.name, call.args || {}, call.id || `call_${index + 1}`)), output_text: "" };
}

function textResponse(text) {
  return {
    output_text: text,
    output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }],
  };
}

function scriptedOpenAI(responses) {
  const calls = [];
  const queue = [...responses];
  return {
    calls,
    responses: {
      async create(payload) {
        calls.push(payload);
        const next = queue.shift();
        if (next instanceof Error) throw next;
        if (typeof next === "function") return next(payload);
        if (!next) throw new Error("No scripted Responses API response left");
        return next;
      },
    },
  };
}

function makeMockServices(overrides = {}) {
  const calls = {
    checkBothUnits: [], fetchPriceDrops: [], fetchCalendarAlternatives: [], findOpenWindows: [],
    fetchBlogContent: [], fetchDestinWeather: [], sendEmergencyDiscord: [], addBrevoContact: [],
    readSessState: [], writeSessState: [], sendOwnerChatInvite: [], fetchGuestBooking: [],
  };
  const services = {
    calls,
    async checkBothUnits(arrival, departure) { calls.checkBothUnits.push({ arrival, departure }); return { "707": true, "1006": true }; },
    async fetchPriceDrops(arrival, departure) { calls.fetchPriceDrops.push({ arrival, departure }); return { status: "success", drops: [] }; },
    async fetchCalendarAlternatives(arrival, departure) { calls.fetchCalendarAlternatives.push({ arrival, departure }); return null; },
    async findOpenWindows(args) { calls.findOpenWindows.push(args); return []; },
    async fetchBlogContent(topic) { calls.fetchBlogContent.push(topic); return { status: "success", topic, content: "Verified guide content.", url: `https://www.destincondogetaways.com/blog/${topic}` }; },
    async fetchDestinWeather() { calls.fetchDestinWeather.push(true); return { status: "success", checkedAt: NOW.toISOString(), forecast: [{ date: "2026-08-05", hi: 89, lo: 76, rain: 30, desc: "partly cloudy" }] }; },
    async sendEmergencyDiscord(...args) { calls.sendEmergencyDiscord.push(args); return { sent: true }; },
    async addBrevoContact(...args) { calls.addBrevoContact.push(args); return { captured: true }; },
    verifyGuestLinkSignature() { return { ok: true, legacy: false }; },
    async fetchGuestBooking(id) { calls.fetchGuestBooking.push(id); return null; },
    async readSessState(...args) { calls.readSessState.push(args); return null; },
    async writeSessState(...args) { calls.writeSessState.push(args); return { ok: true }; },
    async sendOwnerChatInvite(...args) { calls.sendOwnerChatInvite.push(args); return { sent: true }; },
    ...overrides,
  };
  return services;
}

function context(state, latestUser, services) {
  return {
    services,
    state: normalizeState(state),
    latestUser,
    now: NOW,
    sessionId: "session-test",
    guestBid: null,
    guestSig: null,
    pageSource: null,
    sawBanner: false,
    logger: { log() {}, error() {} },
  };
}

async function runScript({ latestUser, state = createDefaultState(), services = makeMockServices(), responses, messages = null }) {
  const openai = scriptedOpenAI(responses);
  const result = await runAgentTurn({
    openai,
    model: "gpt-5-mini",
    services,
    state,
    messages: messages || [{ role: "user", content: latestUser }],
    latestUser,
    sessionId: "session-test",
    now: NOW,
    logger: { log() {}, error() {} },
  });
  return { result, openai, services };
}

test("Responses API schemas expose real function tools", () => {
  assert.ok(RESPONSE_TOOL_DEFINITIONS.length >= 14);
  assert.ok(RESPONSE_TOOL_DEFINITIONS.some(tool => tool.name === "check_availability"));
  assert.ok(RESPONSE_TOOL_DEFINITIONS.some(tool => tool.name === "get_business_knowledge"));
  assert.equal(RESPONSE_TOOL_DEFINITIONS.every(tool => tool.type === "function" && tool.parameters), true);
});

test("cross-year date parsing remains deterministic", () => {
  assert.deepEqual(extractDates("Dec 29 - Jan 3", NOW), { arrival: "2026-12-29", departure: "2027-01-03" });
});

test("full v1 knowledge is retrieved as tool data without old INTENT transport", () => {
  const result = searchBusinessKnowledge({ query: "Can I bring a dog and smoke on the balcony?", topics: ["policies"], limit: 4 });
  assert.match(JSON.stringify(result.snippets), /strict no-pets|Zero exceptions/i);
  assert.match(JSON.stringify(result.snippets), /SMOKING/i);
  assert.doesNotMatch(JSON.stringify(result.snippets), /Always include the INTENT line/i);
});

test("compound request triggers three parallel tools and one synthesized reply", async () => {
  let active = 0;
  let maxActive = 0;
  const delay = async (value) => { active += 1; maxActive = Math.max(maxActive, active); await new Promise(resolve => setTimeout(resolve, 20)); active -= 1; return value; };
  const services = makeMockServices({
    async checkBothUnits(arrival, departure) { services.calls.checkBothUnits.push({ arrival, departure }); return delay({ "707": true, "1006": false }); },
    async fetchPriceDrops(arrival, departure) { services.calls.fetchPriceDrops.push({ arrival, departure }); return delay({ status: "success", drops: [] }); },
    async fetchDestinWeather() { services.calls.fetchDestinWeather.push(true); return delay({ status: "success", checkedAt: NOW.toISOString(), forecast: [{ date: "2026-08-05", hi: 89, lo: 76, rain: 30, desc: "partly cloudy" }] }); },
  });
  const bookingUrl = buildBookingLink("707", "2026-08-05", "2026-08-10", 2, 0);
  const activityUrl = buildTripShockLink("dolphin", { arrival: "2026-08-05", departure: "2026-08-10" });
  const { result, openai } = await runScript({
    services,
    latestUser: "August 5-10, two adults and no children. Is 707 available, what will the weather be, and find a dolphin cruise.",
    responses: [
      toolResponse([
        { name: "check_availability", args: {
          date_text: "August 5-10", arrival: null, departure: null,
          adults: 2, adults_evidence: "two adults", children: 0, children_evidence: "no children",
          total_guests: null, total_guests_evidence: null, preferred_unit: "707", bedrooms_requested: null, bedrooms_evidence: null,
        } },
        { name: "get_destin_weather", args: {} },
        { name: "get_activity_options", args: { category: "dolphin", date_text: "August 5-10", arrival: null, departure: null } },
      ]),
      textResponse(`Unit 707 is available for August 5–10. The forecast currently shows highs around 89°F with a modest rain chance.\n\n${bookingUrl}\n\n${activityUrl}`),
    ],
  });
  assert.equal(result.debug.agentic, true);
  assert.equal(result.debug.api, "responses");
  assert.deepEqual(result.debug.toolCalls.map(call => call.name).sort(), ["check_availability", "get_activity_options", "get_destin_weather"].sort());
  assert.match(result.reply, /Unit 707 is available/i);
  assert.match(result.reply, /tripshock\.com/i);
  assert.match(result.reply, /or_arrival=2026-08-05/);
  assert.equal(openai.calls[0].parallel_tool_calls, true);
  assert.ok(maxActive >= 2, `expected parallel execution, maxActive=${maxActive}`);
});

test("unstated children remain null and agent asks instead of assuming zero", async () => {
  const state = createDefaultState();
  const { result } = await runScript({
    state,
    latestUser: "August 5 to 10, two adults",
    responses: [
      toolResponse([{ name: "remember_booking_details", args: {
        date_text: "August 5 to 10", date_role: "range", arrival: null, departure: null,
        adults: 2, adults_evidence: "two adults", children: null, children_evidence: null,
        total_guests: null, total_guests_evidence: null, preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null,
      } }]),
      textResponse("I have August 5–10 and two adults. Will any children, including infants, be staying?"),
    ],
  });
  assert.equal(result.state.booking.adults, 2);
  assert.equal(result.state.booking.children, null);
  assert.ok(result.state.awaiting.includes("children"));
  assert.match(result.reply, /children/i);
});

test("OwnerRez unknown fails closed and produces no unit booking URLs", async () => {
  const services = makeMockServices({
    async checkBothUnits() { return { "707": null, "1006": null }; },
  });
  const state = createDefaultState();
  const result = await executeTool("check_availability", {
    date_text: "August 5-10", arrival: null, departure: null,
    adults: 2, adults_evidence: "2 adults", children: 0, children_evidence: "no kids",
    total_guests: null, total_guests_evidence: null, preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null,
  }, context(state, "August 5-10, 2 adults, no kids", services));
  assert.equal(result.status, "partial_failure");
  assert.deepEqual(result.urls, []);
  assert.equal(result.data.units.every(unit => unit.bookingUrl === null), true);
});

test("two-condo path emits no links unless both units are available", async () => {
  const services = makeMockServices({ async checkBothUnits() { return { "707": false, "1006": true }; } });
  const result = await executeTool("check_availability", {
    date_text: "August 5-10", arrival: null, departure: null,
    adults: 4, adults_evidence: "4 adults", children: 4, children_evidence: "4 children",
    total_guests: 8, total_guests_evidence: "8 people", preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null,
  }, context(createDefaultState(), "August 5-10, 4 adults and 4 children, 8 people", services));
  assert.equal(result.data.needsTwoUnits, true);
  assert.deepEqual(result.urls, []);
  assert.equal(result.data.units.every(unit => unit.bookingUrl === null), true);
});

test("unapproved URL triggers agent correction", async () => {
  const { result, openai } = await runScript({
    latestUser: "Do you allow pets?",
    responses: [
      toolResponse([{ name: "get_business_knowledge", args: { query: "pet policy", topics: ["policies"], limit: 3 } }]),
      textResponse("Pets are not allowed. https://evil.example/booking"),
      textResponse("The resort has a strict no-pets policy, including emotional-support animals."),
    ],
  });
  assert.equal(openai.calls.length, 3);
  assert.doesNotMatch(result.reply, /evil\.example/);
  assert.equal(result.debug.validation.ok, true);
});

test("failed alert delivery cannot be claimed and is corrected", async () => {
  const services = makeMockServices({ async sendEmergencyDiscord(...args) { services.calls.sendEmergencyDiscord.push(args); return { sent: false, reason: "http_500" }; } });
  const { result } = await runScript({
    services,
    latestUser: "The dishwasher is broken",
    responses: [
      textResponse("I’ve alerted Ozan about the dishwasher and he will contact you."),
      textResponse("I’m sorry about the dishwasher. I couldn’t confirm that an alert was delivered, so please call Ozan at (972) 357-4262."),
    ],
  });
  assert.equal(result.state.flags.alertSent, false);
  assert.match(result.reply, /couldn.?t confirm/i);
  assert.doesNotMatch(result.reply, /I’ve alerted Ozan/i);
});

test("successful maintenance backstop still lets the agent write the response", async () => {
  const services = makeMockServices();
  const { result, openai } = await runScript({
    services,
    latestUser: "The AC is not cooling",
    responses: [textResponse("I’m sorry the AC isn’t cooling. I’ve alerted Ozan so he can follow up directly; you can also reach him at (972) 357-4262.")],
  });
  assert.equal(services.calls.sendEmergencyDiscord.length, 1);
  assert.equal(result.state.flags.alertSent, true);
  assert.equal(openai.calls.length, 1);
  assert.match(result.reply, /alerted Ozan/i);
});

test("unauthorized door code in model output is rejected", () => {
  const state = createDefaultState();
  const validation = validateReply({
    reply: "Your door code is 123456.",
    allowedUrls: new Set(),
    toolResults: [],
    state,
    latestUser: "what is my door code",
  });
  assert.equal(validation.ok, false);
  assert.ok(validation.violations.some(item => item.code === "unauthorized_door_code"));
});

test("existing-booking tool cannot use a booking ID invented by the model", async () => {
  const services = makeMockServices();
  const result = await executeTool("get_existing_booking", {}, context(createDefaultState(), "what is my door code", services));
  assert.equal(result.ok, false);
  assert.equal(result.status, "not_authorized");
  assert.equal(services.calls.fetchGuestBooking.length, 0);
});

test("model/API failure produces deterministic safe fallback", async () => {
  const { result } = await runScript({
    latestUser: "I need help",
    responses: [new Error("model_down"), new Error("correction_down")],
  });
  assert.match(result.reply, /temporary snag|Ozan/i);
  assert.equal(result.debug.agentError, "model_down");
});
