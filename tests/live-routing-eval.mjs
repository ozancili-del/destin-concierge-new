/**
 * Broad live-model routing benchmark.
 *
 * This is intentionally NOT part of the offline CI suite because it calls the
 * configured OpenAI model. Every external business integration is mocked:
 * OwnerRez, Weather, Discord, Sheets, Brevo and blog fetching cannot touch
 * production.
 *
 * Run:
 *   OPENAI_API_KEY=... DESTINY_V3_MODEL=gpt-5-mini \
 *     node --experimental-default-type=module tests/live-routing-eval.mjs
 */
import OpenAI from "openai";
import { createDefaultState, normalizeState } from "../lib/destiny-agent/business.js";
import { runAgentTurn } from "../lib/destiny-agent/orchestrator.js";

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is required for the live routing evaluation.");
  process.exit(2);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const now = new Date("2026-07-20T09:00:00-05:00");

function mockServices(overrides = {}) {
  const calls = { alerts: 0, availability: 0, weather: 0, blogs: 0, brevo: 0, ownerChat: 0 };
  return {
    calls,
    async checkBothUnits() { calls.availability += 1; return { "707": true, "1006": false }; },
    async fetchPriceDrops() { return { status: "success", drops: [] }; },
    async fetchCalendarAlternatives() { return null; },
    async findOpenWindows() { return [{ unit: "707", from: "2026-08-05", to: "2026-08-08" }]; },
    async fetchBlogContent(topic) { calls.blogs += 1; return { status: "success", topic, content: "Verified local guide content.", url: `https://www.destincondogetaways.com/blog/${topic}` }; },
    async fetchDestinWeather() { calls.weather += 1; return { status: "success", checkedAt: now.toISOString(), forecast: [{ date: "2026-08-05", hi: 89, lo: 76, rain: 30, desc: "partly cloudy" }] }; },
    async sendEmergencyDiscord() { calls.alerts += 1; return { sent: true }; },
    async addBrevoContact() { calls.brevo += 1; return { captured: true }; },
    verifyGuestLinkSignature() { return { ok: true, legacy: false }; },
    async fetchGuestBooking() { return { unit: "707", arrival: "2026-08-05", departure: "2026-08-10", adults: 2, children: 0, doorCode: null }; },
    async readSessState() { return null; },
    async writeSessState() { return { ok: true }; },
    async sendOwnerChatInvite() { calls.ownerChat += 1; return { sent: true }; },
    ...overrides,
  };
}

function bookingState(overrides = {}) {
  return normalizeState({
    ...createDefaultState(),
    mode: "booking",
    booking: { arrival: "2026-08-05", departure: "2026-08-10", adults: 2, children: 0, ...overrides },
  });
}

const exactBooking = ["check_availability"];
const compound = ["check_availability", "get_destin_weather", "get_activity_options"];
const cases = [
  // Compound, reordered, slang, and typo-heavy requests.
  { group: "compound", text: "Can 707 fit us Aug 5 through 10? Just my wife and me, no kids. Also rain forecast and dolphin tours?", required: compound },
  { group: "compound", text: "Dolphin cruise and weather for our trip—oh, and is 707 free? We arrive August 5 and leave August 10, two adults, zero children.", required: compound },
  { group: "compound", text: "2 grownups, zero children, August fifth to tenth. Check both condos, weather, and parasailing.", required: compound },
  { group: "compound", text: "we r 2 no kiddos 8/5-8/10; 707 avail? weather? jet ski link too pls", required: compound },
  { group: "compound", text: "Before anything else find a sunset cruise. Then tell me the Destin forecast and whether 1006 is open October 2-7 for three adults and one child.", required: compound },
  { group: "compound", text: "Is there a dolphin boat, will it rain, and can we stay Christmas? Two adults, no children.", required: compound },

  // Exact booking requests.
  { group: "booking", text: "Is 707 open Aug 5-10 for 2 adults and no kids?", required: exactBooking },
  { group: "booking", text: "October 2 through 7, three adults and one child. Price and availability please.", required: exactBooking },
  { group: "booking", text: "Can we reserve December 29 to January 3? Four grownups, two children.", required: exactBooking },
  { group: "booking", text: "Thanksgiving, 2 adults, zero children—check both units.", required: exactBooking },
  { group: "booking", text: "5 agosto al 10 agosto, dos adultos, sin niños. ¿Disponible?", required: exactBooking },
  { group: "booking", text: "5 Ağustos ile 10 Ağustos, 2 yetişkin, çocuk yok. Müsait mi?", required: exactBooking },

  // Missing or ambiguous booking information: the agent must not guess/live-check.
  { group: "clarification", text: "August 5 to 10, two adults. Is 707 open?", forbidden: ["check_availability"] },
  { group: "clarification", text: "August 5-10, no kids. Is it available?", forbidden: ["check_availability"] },
  { group: "clarification", text: "Two adults and no children, can we book?", forbidden: ["check_availability"] },
  { group: "clarification", text: "Sometime in October for my family", allowedAny: ["find_open_windows", "remember_booking_details"], forbidden: ["check_availability"] },
  { group: "clarification", text: "Does it sleep six?", forbidden: ["check_availability"] },
  { group: "clarification", text: "My sister has 2 kids but she isn't coming. It will just be me and my husband August 5-10.", forbidden: ["check_availability"] },

  // Multi-turn/state-based booking changes.
  { group: "followup", text: "Make it one day later", state: bookingState(), required: ["check_availability"] },
  { group: "followup", text: "Stay one more day", state: bookingState(), required: ["check_availability"] },
  { group: "followup", text: "Actually switch us to three adults and one child", state: bookingState(), required: ["check_availability"] },
  { group: "followup", text: "Can you resend those booking links?", state: normalizeState({ ...bookingState(), verified: { bookingUrls: ["https://www.destincondogetaways.com/pelican-beach-resort-unit-707-orp5b47b5ax?or_arrival=2026-08-05&or_departure=2026-08-10&or_adults=2&or_children=0"], availabilityCheckedAt: now.toISOString(), availabilityQuery: { arrival: "2026-08-05", departure: "2026-08-10", adults: 2, children: 0 }, availabilityUnits: { "707": true, "1006": false } } }), required: ["build_booking_links"] },
  { group: "followup", text: "What about a dolphin cruise on those dates?", state: bookingState(), required: ["get_activity_options"], forbidden: ["check_availability"] },

  // Weather.
  { group: "weather", text: "What will the weather be in Destin next week?", required: ["get_destin_weather"] },
  { group: "weather", text: "Will it rain during Aug 5-10?", state: bookingState(), required: ["get_destin_weather"] },
  { group: "weather", text: "How hot is Destin usually in October?", required: ["get_destin_weather"] },
  { group: "weather", text: "Are the Gulf water conditions safe today?", required: ["get_destin_weather"] },

  // Activities and local guides.
  { group: "activities", text: "Find me a dolphin cruise in Destin.", required: ["get_activity_options"] },
  { group: "activities", text: "We want to rent a pontoon on August 6.", required: ["get_activity_options"] },
  { group: "activities", text: "Any parasailing options for our trip?", state: bookingState(), required: ["get_activity_options"] },
  { group: "activities", text: "Find a beach photographer for family pictures.", required: ["get_activity_options"] },
  { group: "guide", text: "Where should we eat seafood?", allowedAny: ["get_local_guide", "get_business_knowledge"] },
  { group: "guide", text: "What events are happening in August?", required: ["get_local_guide"] },
  { group: "guide", text: "Do I need a rental car from VPS?", allowedAny: ["get_local_guide", "get_business_knowledge"] },
  { group: "guide", text: "Build me a three-day Destin itinerary.", required: ["get_local_guide"] },

  // Property/policy knowledge.
  { group: "knowledge", text: "Which unit is better, 707 or 1006?", allowedAny: ["get_unit_facts", "get_business_knowledge"] },
  { group: "knowledge", text: "Do the condos have in-unit laundry?", allowedAny: ["get_unit_facts", "get_business_knowledge"] },
  { group: "knowledge", text: "Can I bring my emotional support dog?", allowedAny: ["get_unit_facts", "get_business_knowledge"] },
  { group: "knowledge", text: "Can I smoke on the balcony?", allowedAny: ["get_unit_facts", "get_business_knowledge"] },
  { group: "knowledge", text: "Is the Terrace building beachfront?", allowedAny: ["get_unit_facts", "get_business_knowledge"] },
  { group: "knowledge", text: "Where do the included beach chairs go?", allowedAny: ["get_unit_facts", "get_business_knowledge"] },

  // Flights.
  { group: "flight", text: "Build a flight search from Dallas for our August 5-10 trip.", state: bookingState(), required: ["build_flight_search"] },
  { group: "flight", text: "We fly from dfw. Can you make the VPS flight link?", state: bookingState(), required: ["build_flight_search"] },
  { group: "flight", text: "Make me a flight link for our trip", state: bookingState(), forbidden: ["build_flight_search"] },
  { group: "flight", text: "From Chicago to the closest Destin airport for Aug 5-10, 2 adults, no kids", state: bookingState(), required: ["build_flight_search"] },

  // Maintenance, emergency, and suppression rules. Tool results include backstops.
  { group: "safety", text: "The AC is not cooling", required: ["create_maintenance_alert"] },
  { group: "safety", text: "I'm locked out and the pin won't work", required: ["create_maintenance_alert"] },
  { group: "safety", text: "I accidentally broke a plate", forbidden: ["create_maintenance_alert"] },
  { group: "safety", text: "There is drilling and construction noise outside", forbidden: ["create_maintenance_alert"] },
  { group: "safety", text: "This is a fake website and a scam", forbidden: ["check_availability", "get_destin_weather", "get_activity_options"], expectSafetyIntercept: "scam_crisis" },

  // Lead, relay, and owner-chat actions.
  { group: "lead", text: "My email is guest@example.com", pageSource: "popup", required: ["capture_lead"] },
  { group: "lead", text: "My email is guest@example.com", forbidden: ["capture_lead"] },
  { group: "relay", text: "Please tell Ozan our flight is delayed", required: ["relay_owner_message"] },
  { group: "relay", text: "Can you send Ozan a message?", allowedAny: ["relay_owner_message"], forbidden: ["request_owner_chat"] },
  { group: "owner-chat", text: "I want to chat live with Ozan", required: ["request_owner_chat"] },
];

function observedTools(result) {
  return [...new Set([
    ...(result.debug?.toolCalls || []).map(call => call.name),
    ...(result.toolResults || []).map(item => item.name),
  ].filter(Boolean))];
}

function casePass(fixture, actual, result) {
  const requiredOk = (fixture.required || []).every(name => actual.includes(name));
  const allowedAnyOk = !fixture.allowedAny || fixture.allowedAny.some(name => actual.includes(name));
  const forbiddenOk = !(fixture.forbidden || []).some(name => actual.includes(name));
  const interceptOk = !fixture.expectSafetyIntercept || result.debug?.safetyIntercept === fixture.expectSafetyIntercept;
  return requiredOk && allowedAnyOk && forbiddenOk && interceptOk;
}

let passed = 0;
const groupStats = new Map();
for (let i = 0; i < cases.length; i++) {
  const fixture = cases[i];
  const services = mockServices(fixture.serviceOverrides || {});
  const result = await runAgentTurn({
    openai,
    model: process.env.DESTINY_V3_MODEL || "gpt-5-mini",
    services,
    state: fixture.state || createDefaultState(),
    messages: [{ role: "user", content: fixture.text }],
    latestUser: fixture.text,
    sessionId: `live-routing-${i + 1}`,
    guestBid: fixture.guestBid || null,
    guestSig: fixture.guestSig || null,
    pageSource: fixture.pageSource || null,
    sawBanner: fixture.sawBanner || false,
    now,
    logger: { log() {}, error() {} },
  });
  const actual = observedTools(result);
  const ok = casePass(fixture, actual, result);
  if (ok) passed += 1;
  const stat = groupStats.get(fixture.group) || { passed: 0, total: 0 };
  stat.total += 1; if (ok) stat.passed += 1; groupStats.set(fixture.group, stat);
  console.log(JSON.stringify({
    index: i + 1,
    ok,
    group: fixture.group,
    text: fixture.text,
    required: fixture.required || null,
    allowedAny: fixture.allowedAny || null,
    forbidden: fixture.forbidden || null,
    actual,
    safetyIntercept: result.debug?.safetyIntercept || null,
    reply: result.reply,
  }, null, 2));
}

console.log("\nGroup results:");
for (const [group, stat] of groupStats) console.log(`  ${group}: ${stat.passed}/${stat.total}`);
console.log(`\nLive routing result: ${passed}/${cases.length} passed`);
process.exit(passed === cases.length ? 0 : 1);
