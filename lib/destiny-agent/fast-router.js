import { BLOG_URLS } from "./business.js";
import { condoComparisonReply, getUnitFacts } from "./specialist-facts.js";

const HIGH_RISK_OR_LIVE = /\b(?:available|availability|book|booking|reserve|reservation|quote|rate|price|cost|discount|deal|payment|refund|cancel|door\s*code|existing\s+(?:stay|booking|reservation)|confirmation|emergency|fire|flood|gas\s*smell|locked?\s*out|maintenance|broken|leak|damage|owner|ozan|human|manager|weather|forecast|temperature|beach\s*condition|red\s*flag|current|currently|today|tonight|tomorrow|this\s+week|open\s+now|hours?|schedule|event|concert|fireworks?|live\s+music)\b/i;

const FACT_TOPICS = Object.freeze([
  ["laundry", /\b(?:laundry|washer|dryer|washing machine)\b/i],
  ["parking", /\b(?:parking|park|ev charger|electric vehicle|j1772)\b/i],
  ["pets", /\b(?:pet|pets|dog|dogs|cat|cats|animal|esa|emotional support)\b/i],
  ["smoking", /\b(?:smoke|smoking|vape|vaping)\b/i],
  ["wifi", /\b(?:wi-?fi|internet|mbps|work remotely|video call)\b/i],
  ["beach_chairs", /\b(?:beach chair|chairs|umbrella|beach setup|ldv)\b/i],
  ["bedrooms", /\b(?:bedroom|bathroom|king bed|bunk|sofa bed|sleeping arrangement)\b/i],
  ["occupancy", /\b(?:occupancy|how many (?:people|guests)|max(?:imum)? guests?|sleeps?\s+\d+)\b/i],
  ["checkin", /\b(?:check[ -]?in|check[ -]?out|arrival time|departure time)\b/i],
  ["terrace", /\b(?:the terrace|terrace building|main building|beachfront building)\b/i],
  ["resort", /\b(?:pools?|hot tubs?|saunas?|steam rooms?|fitness|gyms?|tennis|pickleball|grills?|cafés?|cafes?|tiki bars?|front desk|resort amenit(?:y|ies))\b/i],
  ["amenities", /\b(?:amenities|kitchen|dishwasher|ice maker|coffee maker|air fryer|smart tv|pack n play|workspace)\b/i],
]);

const GUIDE_ROUTES = Object.freeze([
  ["restaurants", /\b(?:restaurant|dining|food)\b/i],
  ["beaches", /\b(?:beach|beaches)\b/i],
  ["airport", /\b(?:airport|vps|pensacola|ecp)\b/i],
  ["car", /\b(?:car rental|rental car)\b/i],
  ["spa", /\b(?:spa|massage|wellness)\b/i],
  ["kids", /\b(?:kids|children|family)\b/i],
  ["supermarkets", /\b(?:supermarket|grocery|groceries)\b/i],
  ["besttime", /\b(?:best time|when to visit|season)\b/i],
  ["itinerary", /\b(?:itinerary|trip planner)\b/i],
]);

export function classifyFastRoute(message) {
  const text = String(message || "").trim();
  if (!text || text.length > 600 || HIGH_RISK_OR_LIVE.test(text)) return { route: "full_agent", reason: "risk_live_or_ambiguous" };

  const comparisonIntent = /\b(?:difference|different|compare|comparison|versus|vs\.?|which (?:condo|unit)|707.*1006|1006.*707)\b/i.test(text)
    && /\b(?:condo|unit|707|1006|two|both)\b/i.test(text);
  if (comparisonIntent) return { route: "condo_comparison", reason: "code_owned_comparison" };

  const topics = FACT_TOPICS.filter(([, pattern]) => pattern.test(text)).map(([topic]) => topic);
  if (topics.length) return { route: "unit_resort_facts", topics, reason: "code_owned_facts" };

  if (/\b(?:guide|page|link|article|read more|show me)\b/i.test(text)) {
    const guide = GUIDE_ROUTES.find(([, pattern]) => pattern.test(text));
    if (guide) return { route: "guide_link", topic: guide[0], reason: "explicit_curated_link" };
  }

  return { route: "full_agent", reason: "no_confident_specialist" };
}

function factsReply(topics) {
  const facts = getUnitFacts(topics);
  if (!facts.length) return null;
  return facts.map(fact => typeof fact.value === "string" ? fact.value : JSON.stringify(fact.value)).join("\n\n");
}

export function routeFastRequest({ message, enabled = true } = {}) {
  const startedAt = Date.now();
  if (!enabled) return { handled: false, route: "full_agent", reason: "feature_disabled", latencyMs: Date.now() - startedAt };
  const decision = classifyFastRoute(message);
  let reply = null;
  if (decision.route === "condo_comparison") reply = condoComparisonReply();
  if (decision.route === "unit_resort_facts") reply = factsReply(decision.topics);
  if (decision.route === "guide_link" && BLOG_URLS[decision.topic]) reply = `Here is the verified ${decision.topic.replace(/_/g, " ")} guide:\n\n${BLOG_URLS[decision.topic]}`;
  return {
    handled: Boolean(reply),
    ...decision,
    reply,
    latencyMs: Date.now() - startedAt,
  };
}

export function sharedRouterEnabled(env = process.env) {
  return String(env.DESTINY_SHARED_ROUTER || "true").toLowerCase() !== "false";
}
