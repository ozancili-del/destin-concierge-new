import {
  createDefaultState,
  normalizeState,
} from "../lib/destiny-agent/business.js";
import { runAgentTurn } from "../lib/destiny-agent/orchestrator.js";

export const NOW = new Date("2026-07-20T09:00:00-05:00");

export function functionCall(name, args, id = `call_${name}`) {
  return { type: "function_call", id: `fc_${id}`, call_id: id, name, arguments: JSON.stringify(args) };
}

export function toolResponse(calls) {
  return { output: calls.map((call, index) => functionCall(call.name, call.args || {}, call.id || `call_${index + 1}`)), output_text: "" };
}

export function malformedToolResponse(name, rawArguments, id = `call_${name}`) {
  return { output: [{ type: "function_call", id: `fc_${id}`, call_id: id, name, arguments: rawArguments }], output_text: "" };
}

export function textResponse(text) {
  return { output_text: text, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] };
}

export function scriptedOpenAI(responses, { delays = [] } = {}) {
  const calls = [];
  const queue = [...responses];
  return {
    calls,
    responses: {
      async create(payload) {
        calls.push(payload);
        const delay = delays[calls.length - 1] || 0;
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        const next = queue.shift();
        if (next instanceof Error) throw next;
        if (typeof next === "function") return next(payload);
        if (!next) throw new Error("No scripted response left");
        return next;
      },
    },
  };
}

export function makeMockServices(overrides = {}) {
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

export function context(state, latestUser, services, overrides = {}) {
  return {
    services,
    state: normalizeState(state || createDefaultState()),
    latestUser,
    now: NOW,
    sessionId: "broad-test-session",
    guestBid: null,
    guestSig: null,
    pageSource: null,
    sawBanner: false,
    logger: { log() {}, error() {} },
    ...overrides,
  };
}

export async function runScript({ latestUser, state = createDefaultState(), services = makeMockServices(), responses, messages, maxToolRounds, maxToolCallsPerRound, maxTotalToolCalls, toolTimeoutMs, agentTimeoutMs, pageSource = null, sawBanner = false, guestBid = null, guestSig = null }) {
  const openai = scriptedOpenAI(responses);
  const result = await runAgentTurn({
    openai,
    model: "gpt-5-mini",
    services,
    state: normalizeState(state),
    messages: messages || [{ role: "user", content: latestUser }],
    latestUser,
    sessionId: "broad-test-session",
    guestBid,
    guestSig,
    pageSource,
    sawBanner,
    now: NOW,
    logger: { log() {}, error() {} },
    ...(maxToolRounds == null ? {} : { maxToolRounds }),
    ...(maxToolCallsPerRound == null ? {} : { maxToolCallsPerRound }),
    ...(maxTotalToolCalls == null ? {} : { maxTotalToolCalls }),
    ...(toolTimeoutMs == null ? {} : { toolTimeoutMs }),
    ...(agentTimeoutMs == null ? {} : { agentTimeoutMs }),
  });
  return { result, openai, services };
}

export function bookingArgs({ dateText = "August 5-10", adults = 2, adultsEvidence = "2 adults", children = 0, childrenEvidence = "no kids", preferredUnit = null, totalGuests = null, totalGuestsEvidence = null, bedroomsRequested = null, bedroomsEvidence = null } = {}) {
  return {
    date_text: dateText,
    arrival: null,
    departure: null,
    adults,
    adults_evidence: adultsEvidence,
    children,
    children_evidence: childrenEvidence,
    total_guests: totalGuests,
    total_guests_evidence: totalGuestsEvidence,
    preferred_unit: preferredUnit,
    bedrooms_requested: bedroomsRequested,
    bedrooms_evidence: bedroomsEvidence,
  };
}
