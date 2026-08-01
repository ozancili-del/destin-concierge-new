import OpenAI from "openai";
import { createDefaultState } from "../lib/destiny-agent/business.js";
import { runAgentTurn } from "../lib/destiny-agent/orchestrator.js";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.DESTINY_AGENT_MODEL;
if (!apiKey || !model) {
  console.error("Live routing benchmark requires OPENAI_API_KEY and explicit DESTINY_AGENT_MODEL.");
  process.exit(2);
}

const groups = [
  ["availability", ["check_availability"], [
    "August 5-10 for two adults and no children. Is Unit 707 available?",
    "Can you check either condo September 3-8 for 2 adults, zero kids?",
    "We need both condos October 1-6 for 8 adults and no children.",
    "Is there an opening in 1006 November 10-14 for two adults and one child?",
    "Book December 20-24 for 3 adults and no kids.",
    "Check June 1-5 next year for me and my wife, no children.",
    "Are both units free August 12-17 for four adults and two children?",
  ]],
  ["weather", ["get_destin_weather"], [
    "What will the weather be in Destin this week?", "Will it rain tomorrow?", "Should I pack a jacket?",
    "How hot will it be during our trip?", "Is beach weather expected this weekend?", "Give me the seven day forecast.",
    "Will the Gulf weather be stormy on our arrival?",
  ]],
  ["activities", ["get_activity_options"], [
    "Find a dolphin cruise.", "Show me parasailing options.", "We want a fishing charter.", "Any sunset cruises?",
    "Find family activities for August 5.", "Can you help with a Crab Island boat tour?", "Show snorkeling activities.",
  ]],
  ["flights", ["build_flight_search"], [
    "Find flights from ORD to Destin August 5-10 for two adults.", "Flights from Atlanta for one adult September 1-5.",
    "Search airfare from DFW to VPS.", "Help me fly from Nashville to Destin in October.", "Flights from JFK December 2-8.",
    "Can you build a flight search from Houston?", "We are flying from lowercase ord August 5-10.",
  ]],
  ["knowledge", ["get_business_knowledge"], [
    "What is the pet policy?", "Tell me about parking.", "Do the condos have laundry?", "What time is check-in?",
    "Are beach chairs included?", "What pools does Pelican Beach have?", "Compare Unit 707 and Unit 1006.",
  ]],
  ["owner", ["request_owner_chat"], [
    "Can I speak to Ozan?", "Please connect me to a real person.", "I need the owner.", "Can the host join this chat?",
    "Please ask Ozan to talk with me.", "I want human support.", "Have Ozan join us please.",
  ]],
  ["maintenance", ["create_maintenance_alert"], [
    "The AC is broken and the condo is hot.", "There is water leaking under the sink.", "We are locked out and the code fails.",
    "The toilet is overflowing.", "There is a gas smell in the unit.", "The refrigerator stopped working.", "The power is out in the condo.",
  ]],
  ["compound", ["check_availability", "get_destin_weather", "get_activity_options"], [
    "August 5-10, two adults and no children. Is 707 available, what is the weather, and find a dolphin cruise?",
    "Check either condo September 1-5 for two adults, no kids, plus weather and parasailing.",
    "We are four adults and zero children October 2-7; check availability, forecast, and fishing tours.",
    "Can you check 1006 November 3-8 for two adults with no children, then weather and sunset cruises?",
    "For December 4-9, two adults and no kids: availability, forecast, and Crab Island activities.",
    "June 10-15 next year for three adults, no children: check both units, weather, and snorkeling.",
    "August 20-25 for two adults and one child: condo availability, weather, and family activities.",
  ]],
];

const cases = groups.flatMap(([category, expectedTools, prompts]) => prompts.map((prompt, index) => ({
  id: `${category}-${index + 1}`,
  category,
  expectedTools,
  prompt,
})));

if (cases.length !== 56) throw new Error(`Expected 56 cases, found ${cases.length}`);

const mockServices = {
  checkBothUnits: async () => ({ status: "success", units: [{ unit: "707", available: true }, { unit: "1006", available: true }] }),
  findOpenWindows: async () => ({ status: "success", windows: [] }),
  fetchDestinWeather: async () => ({ status: "success", forecast: [{ date: "2026-08-05", desc: "sunny", hi: 88, lo: 76, rain: 10 }] }),
  fetchBlogContent: async topic => ({ status: "success", topic, content: "Verified test guide content.", url: null }),
  fetchCalendarAlternatives: async () => ({ status: "success", windows: [] }),
  fetchGuestBooking: async () => null,
  fetchPriceDrops: async () => ({ status: "success", drops: [] }),
  addBrevoContact: async () => ({ captured: true }),
  sendEmergencyDiscord: async () => ({ sent: true }),
  sendOwnerChatInvite: async () => ({ sent: true, token: "controlled-test-token" }),
  verifyGuestLinkSignature: () => ({ ok: false, reason: "not_provided" }),
  readSessState: async () => ({}),
  writeSessState: async () => true,
};

const openai = new OpenAI({ apiKey });
const results = [];
for (const item of cases) {
  const result = await runAgentTurn({
    openai,
    model,
    services: mockServices,
    state: createDefaultState(),
    messages: [{ role: "user", content: item.prompt }],
    latestUser: item.prompt,
    sessionId: `live-routing-${item.id}`,
    now: new Date("2026-08-01T12:00:00-05:00"),
    logger: { log() {}, warn() {}, error() {} },
  });
  const actualTools = [...new Set((result.debug?.toolCalls || []).map(call => call.name))];
  const missing = item.expectedTools.filter(name => !actualTools.includes(name));
  results.push({ ...item, actualTools, missing, pass: missing.length === 0, validation: result.debug?.validation });
}

const passed = results.filter(item => item.pass).length;
const byCategory = Object.fromEntries(groups.map(([category]) => {
  const subset = results.filter(item => item.category === category);
  return [category, { passed: subset.filter(item => item.pass).length, total: subset.length }];
}));
console.log(JSON.stringify({ model, passed, total: results.length, byCategory, failures: results.filter(item => !item.pass) }, null, 2));
if (passed !== results.length) process.exitCode = 1;

