const DEFAULT_ENDPOINT = "https://www.mypelicanbeach.com/api/destiny-knowledge";
const DEFAULT_CACHE_MS = 5 * 60 * 1000;
const URL_RE = /https?:\/\/[^\s)\]>'"]+/g;
const WORD_RE = /[a-z0-9]{3,}/g;
const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "our", "have", "has", "what", "when", "where", "which", "does", "can", "will", "about", "into", "only", "guest", "guests", "destin"]);

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
  spa: ["activities", "amenities"],
  nightlife: ["activities"],
  essentials: ["everyday-essentials"],
  kids: ["family-planning"],
  supermarkets: ["everyday-essentials"],
  explore: ["nearby-areas-and-day-trips", "activities"],
  besttime: ["seasonal-weather", "couples-and-quieter-stays", "family-planning"],
});

let cachedBundle = null;
let cachedAt = 0;
let cachedEndpoint = "";

function enabled(env) {
  return String(env?.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED || "").toLowerCase() === "true";
}

function terms(value) {
  return new Set((String(value || "").toLowerCase().match(WORD_RE) || []).filter(word => !STOP.has(word)));
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
  return { section: topic?.title || topic?.topic_id || "Published knowledge", entryId: entry?.id || "", text: text.slice(0, 3500) };
}

export function rankPublishedKnowledge(bundle, { query = "", topics = [], limit = 8 } = {}) {
  const selectedTopics = topicIds(topics);
  const qTerms = terms(query);
  const candidates = [];
  for (const topic of Array.isArray(bundle?.topics) ? bundle.topics : []) {
    if (selectedTopics.size && !selectedTopics.has(topic?.topic_id)) continue;
    for (const entry of Array.isArray(topic?.entries) ? topic.entries : []) {
      const rendered = renderEntry(topic, entry);
      if (!rendered.text) continue;
      const haystack = terms(entryText(entry));
      let score = 0;
      for (const term of qTerms) if (haystack.has(term)) score += 4;
      if (selectedTopics.has(topic?.topic_id)) score += 2;
      if (entry?.publication_status === "approved") score += 1;
      candidates.push({ ...rendered, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.text.length - b.text.length);
  const cap = Math.max(1, Math.min(Number(limit) || 8, 12));
  const snippets = candidates.filter((item, index) => item.score > 0 || index < Math.min(2, candidates.length)).slice(0, cap);
  const urls = [...new Set(snippets.flatMap(item => item.text.match(URL_RE) || []).map(url => url.replace(/[.,!?;:]+$/, "")))];
  return { snippets: snippets.map(({ score, ...item }) => item), urls };
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

export async function searchPublishedKnowledge({ query = "", topics = [], limit = 8, fetchImpl = globalThis.fetch, env = process.env } = {}) {
  const loaded = await loadBundle({ fetchImpl, env });
  if (!loaded.bundle) return { query, topics, snippets: [], urls: [], source: "legacy", status: loaded.status };
  const result = rankPublishedKnowledge(loaded.bundle, { query, topics, limit });
  return { query, topics, ...result, source: "published", status: result.snippets.length ? "success" : "no_match", revision: loaded.bundle.revision || loaded.bundle.commit || null };
}

export function resetPublishedKnowledgeCacheForTests() {
  cachedBundle = null;
  cachedAt = 0;
  cachedEndpoint = "";
}
