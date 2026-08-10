import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingLink,
  buildTripShockLink,
  createDefaultState,
  normalizeState,
} from "../lib/destiny-agent/business.js";
import { runAgentTurn } from "../lib/destiny-agent/orchestrator.js";

const NOW = new Date("2026-07-20T09:00:00-05:00");

function functionCall(name, args, id = `call_${name}`) {
  return { type: "function_call", id: `fc_${id}`, call_id: id, name, arguments: JSON.stringify(args) };
}

function toolResponse(calls) {
  return { output: calls.map((call, index) => functionCall(call.name, call.args || {}, call.id || `call_${index + 1}`)), output_text: "" };
}

function textResponse(text) {
  return { output_text: text, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] };
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
        if (!next) throw new Error("No scripted response left");
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

async function runScript({ latestUser, state = createDefaultState(), services = makeMockServices(), responses, messages }) {
  const openai = scriptedOpenAI(responses);
  const result = await runAgentTurn({
    openai,
    model: "gpt-5-mini",
    services,
    state: normalizeState(state),
    messages: messages || [{ role: "user", content: latestUser }],
    latestUser,
    sessionId: "stress-session",
    now: NOW,
    logger: { log() {}, error() {} },
  });
  return { result, openai, services };
}

function bookingArgs({ dateText, adults = 2, adultsEvidence = "2 adults", children = 0, childrenEvidence = "no kids", preferredUnit = null }) {
  return {
    date_text: dateText,
    arrival: null,
    departure: null,
    adults,
    adults_evidence: adultsEvidence,
    children,
    children_evidence: childrenEvidence,
    total_guests: null,
    total_guests_evidence: null,
    preferred_unit: preferredUnit,
    bedrooms_requested: null,
    bedrooms_evidence: null,
  };
}

function toolNames(result) {
  return result.debug.toolCalls.map(call => call.name);
}

const paraphraseCases = [
  {
    name: "paraphrase: booking first, then rain and dolphins",
    text: "Can 707 fit us Aug 5 through 10? Just my wife and me, no kids. Also rain forecast and dolphin tours?",
    dateText: "Aug 5 through 10",
    adultsEvidence: "my wife and me",
    childrenEvidence: "no kids",
  },
  {
    name: "paraphrase: activity and weather first, booking last",
    text: "Dolphin cruise and weather for our trip—oh, and is 707 free? We arrive August 5 and leave August 10, two adults, zero children.",
    dateText: "August 5 and leave August 10",
    adultsEvidence: "two adults",
    childrenEvidence: "zero children",
  },
  {
    name: "paraphrase: grownups wording and different activity",
    text: "2 grownups, zero children, August fifth to tenth. Check both condos, weather, and parasailing.",
    dateText: "August fifth to tenth",
    adultsEvidence: "2 grownups",
    childrenEvidence: "zero children",
    category: "parasail",
  },
];

for (const fixture of paraphraseCases) {
  test(fixture.name, async () => {
    const category = fixture.category || "dolphin";
    const activityUrl = buildTripShockLink(category, { arrival: "2026-08-05", departure: "2026-08-10" });
    const bookingUrl = buildBookingLink("707", "2026-08-05", "2026-08-10", 2, 0);
    const { result } = await runScript({
      latestUser: fixture.text,
      responses: [
        toolResponse([
          { name: "check_availability", args: bookingArgs({ dateText: fixture.dateText, adultsEvidence: fixture.adultsEvidence, childrenEvidence: fixture.childrenEvidence, preferredUnit: fixture.text.includes("707") ? "707" : null }) },
          { name: "get_destin_weather", args: {} },
          { name: "get_activity_options", args: { category, date_text: fixture.dateText, arrival: null, departure: null } },
        ]),
        textResponse(`I checked the stay, forecast, and activity options. Unit 707 is available. ${bookingUrl}\n${activityUrl}`),
      ],
    });
    assert.deepEqual(toolNames(result).sort(), ["check_availability", "get_activity_options", "get_destin_weather"].sort());
    assert.match(result.reply, /Unit 707 is available/i);
    assert.match(result.reply, /tripshock\.com/i);
  });
}

test("single-topic booking request uses only availability", async () => {
  const text = "Is 707 open Aug 5-10 for 2 adults and no kids?";
  const url = buildBookingLink("707", "2026-08-05", "2026-08-10", 2, 0);
  const { result } = await runScript({
    latestUser: text,
    responses: [
      toolResponse([{ name: "check_availability", args: bookingArgs({ dateText: "Aug 5-10", preferredUnit: "707" }) }]),
      textResponse(`Unit 707 is available. ${url}`),
    ],
  });
  assert.deepEqual(toolNames(result), ["check_availability"]);
});

test("single-topic weather request uses only weather", async () => {
  const { result } = await runScript({
    latestUser: "What will the weather be in Destin next week?",
    responses: [toolResponse([{ name: "get_destin_weather", args: {} }]), textResponse("The current seven-day forecast shows warm conditions with some rain chances.")],
  });
  assert.deepEqual(toolNames(result), ["get_destin_weather"]);
});

test("single-topic activity request uses only activity tool", async () => {
  const url = buildTripShockLink("dolphin", null);
  const { result } = await runScript({
    latestUser: "Find me a dolphin cruise in Destin.",
    responses: [toolResponse([{ name: "get_activity_options", args: { category: "dolphin", date_text: null, arrival: null, departure: null } }]), textResponse(`Here is the dolphin-cruise search: ${url}`)],
  });
  assert.deepEqual(toolNames(result), ["get_activity_options"]);
});

test("two-topic booking plus weather request uses exactly two tools", async () => {
  const text = "Aug 5-10, 2 adults, no kids. Is 707 open and what is the forecast?";
  const url = buildBookingLink("707", "2026-08-05", "2026-08-10", 2, 0);
  const { result } = await runScript({
    latestUser: text,
    responses: [
      toolResponse([
        { name: "check_availability", args: bookingArgs({ dateText: "Aug 5-10", preferredUnit: "707" }) },
        { name: "get_destin_weather", args: {} },
      ]),
      textResponse(`Unit 707 is available and I also checked the forecast. ${url}`),
    ],
  });
  assert.deepEqual(toolNames(result).sort(), ["check_availability", "get_destin_weather"].sort());
});

test("missing children count asks a clarification and never calls availability", async () => {
  const text = "August 5 to 10, two adults. Is 707 open?";
  const { result, services } = await runScript({
    latestUser: text,
    responses: [
      toolResponse([{ name: "remember_booking_details", args: {
        date_text: "August 5 to 10", date_role: "range", arrival: null, departure: null,
        adults: 2, adults_evidence: "two adults", children: null, children_evidence: null,
        total_guests: null, total_guests_evidence: null, preferred_unit: "707", bedrooms_requested: null, bedrooms_evidence: null,
      } }]),
      textResponse("I have the dates and two adults. Will any children, including infants, be staying?"),
    ],
  });
  assert.deepEqual(toolNames(result), ["remember_booking_details"]);
  assert.equal(services.calls.checkBothUnits.length, 0);
  assert.equal(result.state.booking.children, null);
  assert.match(result.reply, /children/i);
});

test("OwnerRez failure does not block weather and activity results", async () => {
  const services = makeMockServices({
    async checkBothUnits(arrival, departure) { services.calls.checkBothUnits.push({ arrival, departure }); return { "707": null, "1006": null }; },
  });
  const text = "Aug 5-10, 2 adults, no kids: check 707, weather, and dolphin cruises.";
  const activityUrl = buildTripShockLink("dolphin", { arrival: "2026-08-05", departure: "2026-08-10" });
  const { result } = await runScript({
    services,
    latestUser: text,
    responses: [
      toolResponse([
        { name: "check_availability", args: bookingArgs({ dateText: "Aug 5-10", preferredUnit: "707" }) },
        { name: "get_destin_weather", args: {} },
        { name: "get_activity_options", args: { category: "dolphin", date_text: "Aug 5-10", arrival: null, departure: null } },
      ]),
      textResponse(`I couldn't confirm live condo availability right now, but I did retrieve the forecast and dolphin options. ${activityUrl}`),
    ],
  });
  assert.match(result.reply, /couldn.?t confirm live condo availability/i);
  assert.doesNotMatch(result.reply, /or_arrival=/i);
  assert.match(result.reply, /tripshock\.com/i);
});

test("weather failure does not discard verified booking and activity results", async () => {
  const services = makeMockServices({
    async fetchDestinWeather() { services.calls.fetchDestinWeather.push(true); return { status: "error", checkedAt: NOW.toISOString(), forecast: [] }; },
  });
  const text = "Aug 5-10, 2 adults, no kids: check 707, weather, and dolphin cruises.";
  const bookingUrl = buildBookingLink("707", "2026-08-05", "2026-08-10", 2, 0);
  const activityUrl = buildTripShockLink("dolphin", { arrival: "2026-08-05", departure: "2026-08-10" });
  const { result } = await runScript({
    services,
    latestUser: text,
    responses: [
      toolResponse([
        { name: "check_availability", args: bookingArgs({ dateText: "Aug 5-10", preferredUnit: "707" }) },
        { name: "get_destin_weather", args: {} },
        { name: "get_activity_options", args: { category: "dolphin", date_text: "Aug 5-10", arrival: null, departure: null } },
      ]),
      textResponse(`Unit 707 is available and I found dolphin options. I couldn't retrieve the weather forecast right now. ${bookingUrl}\n${activityUrl}`),
    ],
  });
  assert.match(result.reply, /Unit 707 is available/i);
  assert.match(result.reply, /couldn.?t retrieve the weather/i);
  assert.match(result.reply, /tripshock\.com/i);
});

test("ambiguous follow-up date shift uses existing state to offer concrete choices", async () => {
  const state = createDefaultState();
  state.booking = {
    ...state.booking,
    arrival: "2026-08-05",
    departure: "2026-08-10",
    adults: 2,
    children: 0,
    totalGuests: 2,
    preferredUnit: "707",
  };
  const text = "Make it one day later.";
  const shiftedUrl = buildBookingLink("707", "2026-08-06", "2026-08-11", 2, 0);
  const { result, services } = await runScript({
    state,
    latestUser: text,
    messages: [
      { role: "user", content: "August 5-10, two adults, no kids, Unit 707." },
      { role: "assistant", content: "I checked those dates." },
      { role: "user", content: text },
    ],
    responses: [
      toolResponse([{ name: "check_availability", args: bookingArgs({ dateText: "one day later", adults: null, adultsEvidence: null, children: null, childrenEvidence: null, preferredUnit: "707" }) }]),
      textResponse(`I moved the stay one day later to August 6–11. Unit 707 is available. ${shiftedUrl}`),
    ],
  });
  assert.equal(services.calls.checkBothUnits.length, 0);
  assert.equal(result.state.booking.adults, 2);
  assert.equal(result.state.booking.children, 0);
  assert.match(result.reply, /check-in/i);
  assert.match(result.reply, /checkout/i);
  assert.match(result.reply, /entire stay/i);
  assert.match(result.reply, /August 6/i);
});

test("past-trip and non-travelling-relative numbers are not accepted as current party counts", async () => {
  const text = "There were 4 of us last time. My sister has 2 kids but she isn't coming. For this trip it is just me and my wife, no kids, Aug 5-10.";
  const url = buildBookingLink("707", "2026-08-05", "2026-08-10", 2, 0);
  const { result } = await runScript({
    latestUser: text,
    responses: [
      toolResponse([{ name: "check_availability", args: bookingArgs({
        dateText: "Aug 5-10",
        adults: 2,
        adultsEvidence: "me and my wife",
        children: 0,
        childrenEvidence: "no kids",
        preferredUnit: "707",
      }) }]),
      textResponse(`I used the current-trip party of two adults and no children. Unit 707 is available. ${url}`),
    ],
  });
  assert.equal(result.state.booking.adults, 2);
  assert.equal(result.state.booking.children, 0);
  assert.equal(result.state.booking.totalGuests, 2);
});

test("multi-round planning can gather state first and call an action second", async () => {
  const text = "We are two adults, no kids, August 5-10. Please check 707.";
  const url = buildBookingLink("707", "2026-08-05", "2026-08-10", 2, 0);
  const { result } = await runScript({
    latestUser: text,
    responses: [
      toolResponse([{ name: "remember_booking_details", args: {
        date_text: "August 5-10", date_role: "range", arrival: null, departure: null,
        adults: 2, adults_evidence: "two adults", children: 0, children_evidence: "no kids",
        total_guests: null, total_guests_evidence: null, preferred_unit: "707", bedrooms_requested: null, bedrooms_evidence: null,
      } }]),
      toolResponse([{ name: "check_availability", args: bookingArgs({ dateText: "August 5-10", preferredUnit: "707" }) }]),
      textResponse(`Unit 707 is available. ${url}`),
    ],
  });
  assert.deepEqual(toolNames(result), ["remember_booking_details", "check_availability"]);
  assert.equal(result.debug.toolRounds, 2);
});
