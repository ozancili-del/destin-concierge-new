const DEFAULT_ENDPOINT = "https://www.mypelicanbeach.com/api/destiny-knowledge";
const DEFAULT_CACHE_MS = 5 * 60 * 1000;
const URL_RE = /https?:\/\/[^\s)\]>'"]+/g;
const WORD_RE = /[a-z0-9]{3,}/g;
const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "our", "have", "has", "what", "when", "where", "which", "does", "can", "will", "about", "into", "only", "guest", "guests", "destin", "near", "recommend", "some", "please", "tell", "generally", "like", "need", "give", "show", "list", "name", "other", "one", "ones", "two", "three", "four", "five", "more", "spot", "spots", "option", "options"]);

const TOPIC_ALIASES = Object.freeze({
  properties: ["unit-707", "unit-1006", "condo-comparison"],
  resort: ["resort-and-buildings", "amenities"],
  checkin: ["arrival-and-logistics"],
  appliances: ["unit-707", "unit-1006", "everyday-essentials"],
  policies: ["booking-and-assistance", "beach-and-services", "accessibility", "safety-and-assistance"],
  owner: ["identity-and-scope"],
  booking: ["booking-and-assistance"],
  contacts: ["identity-and-scope", "booking-and-assistance"],
  tv: ["unit-707", "unit-1006"],
  local: ["restaurants", "activities", "nearby-areas-and-day-trips", "transport"],
  blogs: ["restaurants", "activities", "events", "rainy-day-options"],
  weather: ["seasonal-weather"],
  family_safety: ["family-planning", "safety-and-assistance"],
  maintenance: ["safety-and-assistance", "arrival-and-logistics"],
  restaurants: ["restaurants"],
  restaurants2: ["restaurants"],
  beaches: ["beach-and-services"],
  activities: ["activities"],
  airport: ["transport"],
  romance: ["couples-and-quieter-stays"],
  spa: ["couples-and-quieter-stays", "activities", "amenities"],
  nightlife: ["activities"],
  essentials: ["everyday-essentials"],
  kids: ["family-planning"],
  supermarkets: ["everyday-essentials"],
  explore: ["nearby-areas-and-day-trips", "activities"],
  besttime: ["seasonal-weather", "couples-and-quieter-stays", "family-planning"],
});

const QUERY_TOPIC_RULES = Object.freeze([
  ["unit-707", /\b(?:unit\s*)?707\b/i],
  ["unit-1006", /\b(?:unit\s*)?1006\b/i],
  ["condo-comparison", /\b(?:compare|comparison|difference|which condo|which unit)\b/i],
  ["amenities", /\b(?:amenit(?:y|ies)|pools?|hot tubs?|saunas?|steam rooms?|gyms?|fitness|laundry|washers?|dryers?|parking|ev chargers?|electric vehicles?|j1772)\b/i],
  ["arrival-and-logistics", /\b(?:arriv(?:al|e)|check[ -]?in|check[ -]?out|front desk|reception|security|wristbands?|parking tags?|unload|luggage|lockers?|smart locks?)\b/i],
  ["beach-and-services", /\b(?:beach|chairs?|umbrellas?|coolers?|wagons?|canop(?:y|ies)|paddle ?boards?|kayaks?)\b/i],
  ["booking-and-assistance", /\b(?:book(?:ing)?|reservations?|cancell?(?:ation|ing|ed)?|refunds?|deposits?|balances?|payments?|rate plans?|processing fees?|minimum age|occupancy|polic(?:y|ies))\b/i],
  ["restaurants", /\b(?:restaurants?|dining|dinner|lunch|breakfast|brunch|italian|seafood|pizza|pasta|sushi|steaks?)\b/i],
  ["everyday-essentials", /\b(?:starter kits?|supplies|toilet paper|paper towels?|soaps?|shampoo|conditioners?|dishwasher|trash bags?|coffee|grocer(?:y|ies)|supermarkets?|towels?|pack(?:ing|ed)?|bring|sun protection|rain gear|power banks?|chargers?)\b/i],
  ["family-planning", /\b(?:kids?|child|children|famil(?:y|ies)|infants?|bab(?:y|ies)|cribs?|pack(?:\s*[’']?n\s*|\s+)play)\b/i],
  ["rainy-day-options", /\b(?:rainy day|indoor activit|bad weather activit)\b/i],
  ["activities", /\b(?:activit(?:y|ies)|things to do|attractions?|fishing|dolphin cruises?|parasail|golf)\b/i],
  ["events", /\b(?:events?|festivals?|fireworks?|live music|concerts?)\b/i],
  ["transport", /\b(?:airports?|transport(?:ation)?|rideshare|uber|lyft|rental cars?|rent a car|need a car|without a car|drive time|turo|car[ -]?shar(?:e|ing)|bikes?|scooters?)\b/i],
  ["accessibility", /\b(?:accessib|wheelchair|disabilit|step[ -]?free|service animal|mobility)\b/i],
  ["seasonal-weather", /\b(?:weather|climate|temperature|rain|humid|season|january|february|march|april|may|june|july|august|september|october|november|december)\b/i],
  ["safety-and-assistance", /\b(?:safety|emergenc(?:y|ies)|maintenance|repairs?|medical|lost|locked out)\b/i],
  ["couples-and-quieter-stays", /\b(?:couple|romantic|romance|anniversary|quiet stay|snowbird|spas?|massage|wellness)\b/i],
  ["nearby-areas-and-day-trips", /\b(?:day trip|nearby area|30a|miramar|fort walton|pensacola|seaside|watercolor)\b/i],
  ["identity-and-scope", /\b(?:who (?:are|is)|owner|ozan|contact|phone|email|destiny blue)\b/i],
  ["resort-and-buildings", /\b(?:pelican beach resort|buildings?|floors?|elevators?|lobb(?:y|ies)|locations?|addresses?|layouts?)\b/i],
]);

let cachedBundle = null;
let cachedAt = 0;
let cachedEndpoint = "";

function enabled(env) {
  return String(env?.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED || "").toLowerCase() === "true";
}

function normalizedTerm(word) {
  if (word.endsWith("ches") || word.endsWith("shes") || word.endsWith("xes") || word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("ies") && word.length > 5) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s") && word.length > 3 && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function terms(value) {
  return new Set((String(value || "").toLowerCase().match(WORD_RE) || [])
    .filter(word => !STOP.has(word))
    .map(normalizedTerm));
}

export function inferPublishedKnowledgeTopics(query) {
  const value = String(query || "");
  if (/\brainy(?:\s|-)?day\b|\brain\b.*\b(?:activities|things to do)\b/i.test(value)) return ["rainy-day-options", "activities"];
  if (/\b(?:recommend|suggest|best|other|alternative|public)\b.*\bbeach(?:es)?\b|\bbeaches\b.*\b(?:near|around|options?)\b/i.test(value)) return ["nearby-areas-and-day-trips"];
  const matched = [...new Set(QUERY_TOPIC_RULES.filter(([, pattern]) => pattern.test(String(query || ""))).map(([topic]) => topic))];
  // Cuisine intent is specific; references to "near Pelican Beach Resort" describe location,
  // not a request for resort or beach facts.
  if (matched.includes("restaurants")) return ["restaurants"];
  return matched.slice(0, 4);
}

function topicIds(topics) {
  const requested = new Set();
  for (const topic of Array.isArray(topics) ? topics : []) {
    for (const id of TOPIC_ALIASES[topic] || [topic]) requested.add(id);
  }
  return requested;
}

function entryText(entry) {
  return [
    entry?.name,
    ...(entry?.aliases || []),
    ...(entry?.retrieval_tags || []),
    ...(entry?.guest_questions || []),
    ...(entry?.facts || []).map(fact => fact?.claim),
    ...(entry?.recommendation_notes || []).map(note => note?.text),
    ...(entry?.tradeoffs || []),
    entry?.safe_fallback,
    entry?.example_spoken_answers?.short,
    entry?.example_spoken_answers?.detailed_follow_up,
  ].filter(Boolean).join("\n");
}

function renderEntry(topic, entry) {
  const claims = (entry?.facts || [])
    .filter(fact => fact?.publication_status === "approved")
    .map(fact => String(fact.claim || "").trim())
    .filter(Boolean);
  const recommendations = (entry?.recommendation_notes || [])
    .filter(note => note?.publication_status === "approved")
    .map(note => String(note.text || "").trim())
    .filter(Boolean);
  const spoken = String(entry?.example_spoken_answers?.detailed_follow_up || entry?.example_spoken_answers?.short || "").trim();
  const tradeoffs = (entry?.tradeoffs || []).map(value => String(value || "").trim()).filter(Boolean);
  const text = [
    entry?.name ? `${entry.name}:` : "",
    ...claims,
    ...recommendations,
    ...tradeoffs.map(value => `Trade-off: ${value}`),
    spoken ? `Suggested conversational phrasing: ${spoken}` : "",
  ].filter(Boolean).join(" ");
  return { section: topic?.title || topic?.topic_id || "Published knowledge", topicId: topic?.topic_id || "", entryId: entry?.id || "", name: entry?.name || "", text: text.slice(0, 3500) };
}

export function rankPublishedKnowledge(bundle, { query = "", topics = [], limit = 8, requireMatch = false } = {}) {
  const selectedTopics = topicIds(topics);
  const qTerms = terms(query);
  let preferredEntryId = "";
  if (selectedTopics.size === 1 && selectedTopics.has("restaurants")) {
    for (const locationWord of ["pelican", "beach", "resort", "nearby", "close", "restaurant", "dining", "food", "place"]) qTerms.delete(locationWord);
  }
  if (selectedTopics.has("transport") && /\b(?:(?:do|will|should) i (?:need|have|rent)|without) (?:a )?car\b/i.test(String(query || ""))) {
    qTerms.add("choice");
    preferredEntryId = "transport_car_choice";
  }
  const candidates = [];
  for (const topic of Array.isArray(bundle?.topics) ? bundle.topics : []) {
    if (selectedTopics.size && !selectedTopics.has(topic?.topic_id)) continue;
    for (const entry of Array.isArray(topic?.entries) ? topic.entries : []) {
      const rendered = renderEntry(topic, entry);
      if (!rendered.text) continue;
      const haystack = terms(entryText(entry));
      let matchedTerms = 0;
      for (const term of qTerms) if (haystack.has(term)) matchedTerms += 1;
      let score = matchedTerms * 4;
      if (selectedTopics.has(topic?.topic_id)) score += 2;
      if (entry?.publication_status === "approved") score += 1;
      candidates.push({ ...rendered, score, matchedTerms });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.text.length - b.text.length);
  const cap = Math.max(1, Math.min(Number(limit) || 8, 12));
  const bestMatchCount = candidates.reduce((best, item) => Math.max(best, item.matchedTerms), 0);
  const snippets = candidates
    .filter((item, index) => preferredEntryId
      ? item.entryId === preferredEntryId
      : requireMatch ? (qTerms.size ? item.matchedTerms === bestMatchCount && bestMatchCount > 0 : selectedTopics.size > 0) : item.score > 0 || index < Math.min(2, candidates.length))
    .slice(0, cap);
  const urls = [...new Set(snippets.flatMap(item => item.text.match(URL_RE) || []).map(url => url.replace(/[.,!?;:]+$/, "")))];
  return { snippets: snippets.map(({ score, matchedTerms, ...item }) => item), urls };
}

async function loadBundle({ fetchImpl, env }) {
  if (!enabled(env)) return { status: "disabled", bundle: null };
  const endpoint = String(env.DESTINY_PUBLISHED_KNOWLEDGE_URL || DEFAULT_ENDPOINT).trim();
  const maxAge = Math.max(5_000, Number(env.DESTINY_PUBLISHED_KNOWLEDGE_CACHE_MS) || DEFAULT_CACHE_MS);
  if (cachedBundle && cachedEndpoint === endpoint && Date.now() - cachedAt < maxAge) return { status: "success", bundle: cachedBundle, cached: true };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetchImpl(endpoint, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) return { status: `http_${response.status}`, bundle: null };
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.topics) || !payload.manifest) return { status: "invalid_payload", bundle: null };
    cachedBundle = payload;
    cachedAt = Date.now();
    cachedEndpoint = endpoint;
    return { status: "success", bundle: payload, cached: false };
  } catch (error) {
    return { status: error?.name === "AbortError" ? "timeout" : "unavailable", bundle: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function searchPublishedKnowledge({ query = "", topics = [], limit = 8, requireMatch = false, fetchImpl = globalThis.fetch, env = process.env } = {}) {
  const loaded = await loadBundle({ fetchImpl, env });
  if (!loaded.bundle) return { query, topics, snippets: [], urls: [], source: "legacy", status: loaded.status };
  const result = rankPublishedKnowledge(loaded.bundle, { query, topics, limit, requireMatch });
  return { query, topics, ...result, source: "published", status: result.snippets.length ? "success" : "no_match", revision: loaded.bundle.revision || loaded.bundle.commit || null };
}

export function resetPublishedKnowledgeCacheForTests() {
  cachedBundle = null;
  cachedAt = 0;
  cachedEndpoint = "";
}
