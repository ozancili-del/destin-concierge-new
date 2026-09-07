const DEFAULT_ENDPOINT = "https://www.mypelicanbeach.com/api/destiny-knowledge";
const DEFAULT_FALLBACK_ENDPOINT = "https://mydestinstay.vercel.app/api/destiny-knowledge";
const DEFAULT_CACHE_MS = 5 * 60 * 1000;
const ACTIVE_STATUSES = new Set(["approved", "published"]);
const URL_RE = /https?:\/\/[^\s)\]>'"]+/g;
const WORD_RE = /[a-z0-9]{3,}/g;
// These are normalized before comparison. Keep request scaffolding here, while
// leaving useful qualifiers such as "Italian", "indoor", "family", and
// "romantic" available to rank the approved entries.
const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "our", "have", "has", "what", "when", "where", "which", "does", "can", "will", "would", "could", "should", "about", "into", "only", "any", "here", "there",
  "guest", "destin", "near", "around", "please", "tell", "generally", "like", "need", "want", "give", "show", "list", "name", "find", "help", "looking", "follow", "request",
  "recommend", "recommendation", "suggest", "suggestion", "best", "top", "good", "great", "favorite", "favourite", "idea", "choice", "pick", "option",
  "some", "few", "several", "other", "another", "else", "one", "two", "three", "four", "five", "more", "spot",
]);

const RECOMMENDATION_CUE_RE = /\b(?:recommend(?:ation)?s?|suggest(?:ion)?s?|best|top|favorites?|favourites?|ideas?|options?|choices?|picks?|alternatives?|other ones?|some|a few|several)\b/i;
const IMPLICIT_MULTI_CHOICE_RE = /\b(?:restaurants|beaches|activities|attractions|shops|shopping|groceries|supermarkets|spas|airports?|which airport|where (?:should|can|could|do) (?:we|i) eat|what (?:can|should|could) (?:we|i) do)\b/i;
const GENERIC_RECOMMENDATION_FOLLOW_UP_RE = /^(?:(?:and|also)\s+)?(?:(?:what|how)\s+about\s+|what\s+)?(?:(?:do\s+you\s+have|are\s+there)\s+)?(?:any\s+)?(?:other|another|more|additional|different)\b|^(?:what|anything)\s+else\b/i;

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
  ["amenities", /\b(?:amenit(?:y|ies)|pools?|hot tubs?|saunas?|steam rooms?|gyms?|fitness|laundry|washers?|dryers?|park(?:ing)?|ev (?:chargers?|charging)|electric vehicles?|j1772)\b/i],
  ["arrival-and-logistics", /\b(?:arriv(?:al|e)|check[ -]?in|check[ -]?out|front desk|reception|security|wristbands?|parking tags?|unload|luggage|lockers?|smart locks?)\b/i],
  ["beach-and-services", /\b(?:beach|chairs?|umbrellas?|coolers?|wagons?|canop(?:y|ies)|paddle ?boards?|kayaks?)\b/i],
  ["booking-and-assistance", /\b(?:book(?:ing)?|reservations?|cancell?(?:ation|ing|ed)?|refunds?|deposits?|balances?|payments?|rate plans?|processing fees?|minimum age|occupancy|polic(?:y|ies))\b/i],
  ["restaurants", /\b(?:restaurants?|dining|dinner|lunch|breakfast|brunch|italian|seafood|pizza|pasta|sushi|steaks?|places? to eat|where (?:should|can|could|do) (?:we|i) eat|eateries|food)\b/i],
  ["everyday-essentials", /\b(?:starter kits?|supplies|toiletr(?:y|ies)|toilet paper|paper towels?|soaps?|shampoo|conditioners?|dishwasher|trash bags?|coffee|grocer(?:y|ies)|supermarkets?|towels?|pack(?:ing|ed)?|bring|sun protection|rain gear|power banks?|chargers?)\b/i],
  ["family-planning", /\b(?:kids?|child|children|famil(?:y|ies)|infants?|bab(?:y|ies)|toddlers?|cribs?|pack(?:\s*[’']?n\s*|\s+)play)\b/i],
  ["rainy-day-options", /\b(?:rainy day|indoor activit|bad weather activit)\b/i],
  ["activities", /\b(?:activit(?:y|ies)|things to do|attractions?|fishing|dolphin cruises?|parasail|golf|shops?|shopping|malls?)\b/i],
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

const KNOWLEDGE_CATEGORY_PROFILES = Object.freeze([
  {
    id: "destin-airports",
    topic: "transport",
    pattern: /\b(?:airports?|vps|pns|ecp)\b/i,
    followUpEntities: /\b(?:fort walton|pensacola|panama city|vps|pns|ecp)\b/i,
    entryOrder: [
      "transport_destin_fort_walton_beach_airport_vps",
      "transport_pensacola_international_airport_pns",
      "transport_northwest_florida_beaches_international_airport_ecp",
    ],
  },
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

const NORMALIZED_STOP = new Set([...STOP].map(normalizedTerm));
const TERM_SYNONYMS = Object.freeze({
  park: ["parking"],
  toiletry: ["starter", "supply", "soap", "shampoo", "conditioner"],
});

function terms(value) {
  const result = new Set((String(value || "").toLowerCase().match(WORD_RE) || [])
    .map(normalizedTerm)
    .filter(word => !NORMALIZED_STOP.has(word)));
  for (const word of [...result]) for (const synonym of TERM_SYNONYMS[word] || []) result.add(synonym);
  return result;
}

export function isBroadPublishedKnowledgeRecommendation(query, topics = inferPublishedKnowledgeTopics(query)) {
  if (!topicIds(topics).size) return false;
  const value = String(query || "");
  return RECOMMENDATION_CUE_RE.test(value) || IMPLICIT_MULTI_CHOICE_RE.test(value);
}

export function isGenericPublishedKnowledgeFollowUp(query) {
  return GENERIC_RECOMMENDATION_FOLLOW_UP_RE.test(String(query || "").trim());
}

function positiveRouteIntentText(query) {
  return String(query || "").toLowerCase()
    // Tool prompts often describe exclusions such as "not live hours" or
    // "no current forecast". Those words are metadata about what not to do,
    // not positive evidence that a live lookup is required.
    .replace(/\b(?:do\s+not|don't)\s+(?:(?:need|include|use|check|look\s+up|provide|give|return)\s+)?(?:any\s+)?(?:(?:live|current|latest|exact|real[- ]?time)\s+)?(?:hours?|forecast|conditions?|warnings?|closures?|availability)\b/g, " ")
    .replace(/\b(?:not|no|without)\s+(?:a\s+|any\s+)?(?:(?:live|current|latest|exact|real[- ]?time)\s+)?(?:hours?|forecast|conditions?|warnings?|closures?|availability)\b/g, " ");
}

export function classifyPublishedKnowledgeRoute(query) {
  const value = positiveRouteIntentText(query);
  if (/\b(?:reservation|booking)\b.{0,60}\b(?:look up|find|change|modify|cancel|extend|confirmation|payment|card)\b/.test(value)
    || /\b(?:look up|find|change|modify|cancel|extend)\b.{0,60}\b(?:my|our|the|this|that)?\s*(?:reservation|booking)\b/.test(value)) return "live";
  if (/\b(?:weather|forecast|temperature|rain|storm)\b/.test(value)
    && /\b(?:today|tomorrow|tonight|this week|this weekend|next \d+ days?|current|latest|forecast)\b/.test(value)) return "live";
  if (/\b(?:beach|surf|gulf|flag|flags)\b/.test(value)
    && /\b(?:today|tomorrow|current|latest|conditions?|warnings?|flags?|open|closed)\b/.test(value)) return "live";
  if (/\b(?:open now|open today|hours?|wait time|closed|closure|close tonight|closes? (?:today|tonight)|reservation availability)\b/.test(value)) return "live";
  if (/\b(?:events?|festival|fireworks|concert|live music)\b/.test(value)
    && /\b(?:today|tomorrow|tonight|this week|this weekend|current|latest|schedule|time|times)\b/.test(value)) return "live";
  if (/\b(?:verify|check|confirm)\b.*\b(?:current|latest|exact)\b.*\b(?:price|rate|fee|cost)\b/.test(value)) return "live";
  if (/\b(?:gulf|water|surf)\b.*\b(?:temperature|warm|cold)\b|\b(?:temperature|warm|cold)\b.*\b(?:gulf|water|surf)\b/.test(value)) return "live";
  if (/\b(?:availability|available|open dates?|book(?:ing)? dates?)\b/.test(value)
    && /\b(?:unit|condo|stay|night|check[ -]?in|check[ -]?out|707|1006|dates?|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(value)) return "availability";
  if (/\b(?:total price|quote|how much is (?:the condo|my stay|it))\b/.test(value) && !/\b(?:ev|charger|charging|beach chair|umbrella)\b/.test(value)) return "live";
  return "knowledge";
}

export function inferPublishedRecommendationCategory(query, topics = inferPublishedKnowledgeTopics(query)) {
  const value = String(query || "").toLowerCase();
  if (topics.includes("restaurants")) {
    if (/\bitalian|pasta\b/.test(value)) return "restaurant-italian";
    if (/\bseafood|oyster\b/.test(value)) return "restaurant-seafood";
    if (/\bsushi|asian|japanese|thai\b/.test(value)) return "restaurant-sushi-asian";
    if (/\bbreakfast|brunch\b/.test(value)) return "restaurant-breakfast";
    if (/\bfamily|kids?|children\b/.test(value)) return "restaurant-family";
    if (/\bwaterfront|beachfront|harbor view\b/.test(value)) return "restaurant-waterfront";
    if (/\bromantic|special occasion|anniversary|date night\b/.test(value)) return "restaurant-special-occasion";
    if (/\bpizza|takeout\b/.test(value)) return "restaurant-pizza-takeout";
    if (/\bcasual|budget|cheap\b/.test(value)) return "restaurant-casual-budget";
    const unsupportedCuisine = value.match(/\b(vegan|vegetarian|mexican|french|indian|mediterranean|greek|cuban|korean|vietnamese)\b/);
    if (unsupportedCuisine) return `restaurant-${unsupportedCuisine[1]}`;
    return "restaurant";
  }
  if (topics.includes("rainy-day-options") || /\brainy|indoor\b/.test(value)) return "rainy-day";
  if (/\bshopping|shops?|mall\b/.test(value)) return "shopping";
  if (/\bspa|massage\b/.test(value)) return "spas";
  if (/\bgrocer|supermarket\b/.test(value)) return "groceries";
  if (/\bairport|vps|pns|ecp\b/.test(value)) return "airports";
  if (topics.includes("transport")) return "transportation";
  if (topics.includes("nearby-areas-and-day-trips") && /\bbeach/.test(value)) return "beaches";
  if (topics.includes("nearby-areas-and-day-trips")) return "day-trips";
  if (topics.includes("activities") && /\b(?:kids?|children|toddlers?|family)\b/.test(value)) return "children-activities";
  if (topics.includes("activities") && /\bcouple|romantic|quiet\b/.test(value)) return "couples-activities";
  if (topics.includes("activities") && /\boutdoor|water|fishing|cruise\b/.test(value)) return "outdoor-water";
  return "";
}

export function inferPublishedKnowledgeTopics(query) {
  const value = String(query || "");
  if (/\brainy(?:\s|-)?day\b|\brain\b.*\b(?:activities|things to do)\b/i.test(value)) return ["rainy-day-options", "activities"];
  if (/\b(?:what (?:can|should|could) (?:we|i) do|things to do|activities?)\b.*\b(?:kids?|children|toddlers?|family)\b|\b(?:kids?|children|toddlers?|family)\b.*\b(?:things to do|activities?)\b/i.test(value)) return ["activities", "family-planning"];
  if (/\b(?:recommend(?:ation)?s?|suggest(?:ion)?s?|best|other|alternative|public)\b.*\bbeach(?:es)?\b|\bbeach(?:es)?\b.*\b(?:recommend(?:ation)?s?|suggest(?:ion)?s?|best|other|alternative|public|near|around|options?)\b/i.test(value)) return ["nearby-areas-and-day-trips"];
  const matched = [...new Set(QUERY_TOPIC_RULES.filter(([, pattern]) => pattern.test(String(query || ""))).map(([topic]) => topic))];
  // Cuisine intent is specific; references to "near Pelican Beach Resort" describe location,
  // not a request for resort or beach facts.
  if (matched.includes("restaurants")) return ["restaurants"];
  return matched.slice(0, 4);
}

export function contextualizePublishedKnowledgeQuery(query, priorQuery = "") {
  const current = String(query || "").trim();
  const prior = String(priorQuery || "").trim();
  if (!current || !prior) return current;
  const priorProfile = KNOWLEDGE_CATEGORY_PROFILES.find(profile => profile.pattern.test(prior));
  if (priorProfile?.followUpEntities.test(current)) return `${prior} Follow-up choice: ${current}`.slice(0, 900);
  if (isBroadPublishedKnowledgeRecommendation(prior, inferPublishedKnowledgeTopics(prior))
    && /^what about (?:kids?|children|toddlers?|famil(?:y|ies)|couples?|romantic|indoor|outdoor|budget|waterfront|italian|seafood)\??$/i.test(current)) {
    return `${prior} Follow-up fit: ${current}`.slice(0, 900);
  }
  if (!inferPublishedKnowledgeTopics(current).length
    && inferPublishedKnowledgeTopics(prior).length
    && GENERIC_RECOMMENDATION_FOLLOW_UP_RE.test(current)) {
    return `${prior} Follow-up request: ${current}`.slice(0, 900);
  }
  return current;
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

function matchingTermCount(queryTerms, values) {
  const haystack = terms((Array.isArray(values) ? values : [values]).filter(Boolean).join("\n"));
  return [...queryTerms].filter(term => haystack.has(term)).length;
}

function renderEntry(topic, entry, { queryTerms = new Set(), includeMatchingFacts = false } = {}) {
  const claims = (entry?.facts || [])
    .filter(fact => ACTIVE_STATUSES.has(fact?.publication_status))
    .map(fact => String(fact.claim || "").trim())
    .filter(Boolean);
  const recommendations = (entry?.recommendation_notes || [])
    .filter(note => ACTIVE_STATUSES.has(note?.publication_status))
    .map(note => String(note.text || "").trim())
    .filter(Boolean);
  const spoken = String(entry?.example_spoken_answers?.detailed_follow_up || entry?.example_spoken_answers?.short || "").trim();
  const tradeoffs = (entry?.tradeoffs || []).map(value => String(value || "").trim()).filter(Boolean);
  const voiceReady = entry?.voice_ready && typeof entry.voice_ready === "object" ? entry.voice_ready : null;
  const voiceParts = voiceReady ? [
    entry?.name ? `${entry.name}:` : "",
    voiceReady.summary,
    voiceReady.differentiator && voiceReady.differentiator !== voiceReady.summary ? voiceReady.differentiator : "",
    voiceReady.caveat && !String(voiceReady.caveat).includes(voiceReady.summary) ? `Caveat: ${voiceReady.caveat}` : "",
  ].filter(Boolean) : [];
  if (voiceReady && includeMatchingFacts && queryTerms.size) {
    const detailTerms = new Set(queryTerms);
    if ([...queryTerms].some(term => ["cost", "price", "pricing", "fee", "rate"].includes(term))) {
      for (const term of ["cost", "price", "pricing", "fee", "rate", "kwh", "dollar"]) detailTerms.add(term);
    }
    const renderedTerms = terms(voiceParts.join(" "));
    const matchingDetails = claims.map(claim => {
      const claimTerms = terms(claim);
      const matches = [...detailTerms].filter(term => claimTerms.has(term)).length;
      const novelTerms = [...claimTerms].filter(term => !renderedTerms.has(term)).length;
      return { claim, matches, novelTerms };
    }).filter(item => item.matches > 0 && item.novelTerms >= 2)
      .sort((a, b) => b.matches - a.matches || b.novelTerms - a.novelTerms);
    if (matchingDetails[0]) voiceParts.push(`Relevant approved detail: ${matchingDetails[0].claim}`);
  }
  const text = voiceReady ? voiceParts.join(" ") : [
    entry?.name ? `${entry.name}:` : "",
    ...claims,
    ...recommendations,
    ...tradeoffs.map(value => `Trade-off: ${value}`),
    spoken ? `Suggested conversational phrasing: ${spoken}` : "",
  ].filter(Boolean).join(" ");
  return { section: topic?.title || topic?.topic_id || "Published knowledge", topicId: topic?.topic_id || "", entryId: entry?.id || "", name: entry?.name || "", text: text.slice(0, 3500) };
}

export function rankPublishedKnowledge(bundle, { query = "", topics = [], limit = 8, requireMatch = false, excludeEntryIds = [] } = {}) {
  const selectedTopics = topicIds(topics);
  const excludedEntries = new Set(Array.isArray(excludeEntryIds) ? excludeEntryIds : []);
  const qTerms = terms(query);
  const broadRecommendation = isBroadPublishedKnowledgeRecommendation(query, topics);
  const recommendationCategory = broadRecommendation ? inferPublishedRecommendationCategory(query, topics) : "";
  const categoryProfile = KNOWLEDGE_CATEGORY_PROFILES.find(profile => selectedTopics.has(profile.topic) && profile.pattern.test(String(query || "")));
  const categoryOrder = categoryProfile ? new Map(categoryProfile.entryOrder.map((id, index) => [id, index])) : null;
  const hasSpecificCategoryEntity = Boolean(categoryProfile?.followUpEntities?.test(String(query || "")));
  let preferredEntryId = "";
  if (selectedTopics.size === 1 && selectedTopics.has("restaurants")) {
    for (const locationWord of ["pelican", "beach", "resort", "nearby", "close", "restaurant", "dining", "food", "place", "eat", "meal"]) qTerms.delete(locationWord);
  }
  if (selectedTopics.size === 1 && selectedTopics.has("activities")) {
    for (const categoryWord of ["activity", "attraction", "thing"]) qTerms.delete(categoryWord);
  }
  if (selectedTopics.has("transport") && /\b(?:(?:do|will|should) i (?:need|have|rent)|without) (?:a )?car\b/i.test(String(query || ""))) {
    qTerms.add("choice");
    preferredEntryId = "transport_car_choice";
  }
  const candidates = [];
  for (const topic of Array.isArray(bundle?.topics) ? bundle.topics : []) {
    if (selectedTopics.size && !selectedTopics.has(topic?.topic_id)) continue;
    for (const entry of Array.isArray(topic?.entries) ? topic.entries : []) {
      if (excludedEntries.has(entry?.id)) continue;
      if (categoryOrder && !categoryOrder.has(entry?.id)) continue;
      if (recommendationCategory && !(entry?.recommendation_categories || []).includes(recommendationCategory)) continue;
      const rendered = renderEntry(topic, entry, { queryTerms: qTerms, includeMatchingFacts: !broadRecommendation });
      if (!rendered.text) continue;
      const activeClaims = (entry?.facts || [])
        .filter(fact => ACTIVE_STATUSES.has(fact?.publication_status))
        .map(fact => fact?.claim);
      const nameMatches = matchingTermCount(qTerms, [entry?.name]);
      const aliasTagMatches = matchingTermCount(qTerms, [...(entry?.aliases || []), ...(entry?.retrieval_tags || [])]);
      const questionMatches = matchingTermCount(qTerms, entry?.guest_questions || []);
      const evidenceMatches = matchingTermCount(qTerms, activeClaims);
      const voiceMatches = matchingTermCount(qTerms, [entry?.voice_ready?.summary, entry?.voice_ready?.differentiator, entry?.voice_ready?.caveat]);
      const haystack = terms(entryText(entry));
      const matchedTerms = [...qTerms].filter(term => haystack.has(term)).length;
      // Subject identity and curated retrieval metadata outweigh incidental prose.
      // Approved claim matches remain mandatory for specific factual answers below.
      let score = nameMatches * 12 + aliasTagMatches * 8 + questionMatches * 6 + evidenceMatches * 4 + voiceMatches * 2;
      if (selectedTopics.has(topic?.topic_id)) score += 2;
      if (entry?.publication_status === "approved") score += 1;
      const categoryRank = Number(entry?.recommendation_rankings?.[recommendationCategory]) || Number.MAX_SAFE_INTEGER;
      const editorialPriority = Number(entry?.recommendation_priority) || 0;
      const distanceMinutes = Number.isFinite(entry?.distance_minutes) ? entry.distance_minutes : Number.MAX_SAFE_INTEGER;
      candidates.push({ ...rendered, score, matchedTerms, evidenceMatches, categoryRank, editorialPriority, distanceMinutes, categories: entry?.recommendation_categories || [] });
    }
  }
  // A broad recommendation is an editorial product, not a lexical search result.
  // When HQ publishes explicit ranks for the inferred category, those ranks are
  // authoritative. Query relevance still controls qualified/specific requests
  // and remains the fallback for legacy categories without curated ranks.
  const hasCuratedCategoryRanks = broadRecommendation
    && Boolean(recommendationCategory)
    && candidates.some(item => Number.isFinite(item.categoryRank) && item.categoryRank < Number.MAX_SAFE_INTEGER);
  candidates.sort((a, b) => (hasCuratedCategoryRanks ? a.categoryRank - b.categoryRank : 0)
    || b.score - a.score
    || (categoryOrder ? categoryOrder.get(a.entryId) - categoryOrder.get(b.entryId) : 0)
    || a.categoryRank - b.categoryRank
    || b.editorialPriority - a.editorialPriority
    || a.distanceMinutes - b.distanceMinutes
    || a.entryId.localeCompare(b.entryId));
  const cap = Math.max(1, Math.min(Number(limit) || 8, 12));
  const bestMatchCount = candidates.reduce((best, item) => Math.max(best, item.matchedTerms), 0);
  const bestSpecificScore = candidates.reduce((best, item) => Math.max(best, item.score), 0);
  const eligible = candidates
    .filter((item, index) => preferredEntryId
      ? item.entryId === preferredEntryId
      : recommendationCategory ? (!hasSpecificCategoryEntity || bestMatchCount === 0 || item.matchedTerms === bestMatchCount)
      : requireMatch ? (qTerms.size ? item.score === bestSpecificScore && bestSpecificScore > 2 : selectedTopics.size > 0) : item.score > 0 || index < Math.min(2, candidates.length))
  const snippets = [];
  const usedSecondary = new Set();
  for (const item of eligible) {
    const secondary = item.categories.filter(category => category !== recommendationCategory);
    // Curated category ranks already encode the owner's desired fit/diversity.
    // Do not silently replace a ranked choice with a lower-ranked alternative.
    const addsDiversity = hasCuratedCategoryRanks || !broadRecommendation || snippets.length < 1 || secondary.some(category => !usedSecondary.has(category));
    if (!addsDiversity && eligible.length > cap) continue;
    snippets.push(item);
    secondary.forEach(category => usedSecondary.add(category));
    if (snippets.length >= cap) break;
  }
  if (snippets.length < cap) for (const item of eligible) {
    if (!snippets.includes(item)) snippets.push(item);
    if (snippets.length >= cap) break;
  }
  const urls = [...new Set(snippets.flatMap(item => item.text.match(URL_RE) || []).map(url => url.replace(/[.,!?;:]+$/, "")))];
  return { snippets: snippets.map(({ score, matchedTerms, evidenceMatches, categoryRank, editorialPriority, distanceMinutes, categories, ...item }) => item), urls };
}

async function loadBundle({ fetchImpl, env }) {
  if (!enabled(env)) return { status: "disabled", bundle: null };
  const endpoint = String(env.DESTINY_PUBLISHED_KNOWLEDGE_URL || DEFAULT_ENDPOINT).trim();
  const maxAge = Math.max(5_000, Number(env.DESTINY_PUBLISHED_KNOWLEDGE_CACHE_MS) || DEFAULT_CACHE_MS);
  if (cachedBundle && cachedEndpoint === endpoint && Date.now() - cachedAt < maxAge) return { status: "success", bundle: cachedBundle, cached: true };
  // Both origins serve the same production artifact. Keep an explicitly
  // configured endpoint authoritative, but make the built-in production route
  // resilient to a transient custom-domain 404 or edge failure.
  const endpoints = endpoint === DEFAULT_ENDPOINT
    ? [DEFAULT_ENDPOINT, DEFAULT_FALLBACK_ENDPOINT]
    : [endpoint];
  let terminalStatus = "unavailable";
  for (const candidateEndpoint of endpoints) {
    const requestUrl = new URL(candidateEndpoint);
    requestUrl.searchParams.set("knowledge_window", String(Math.floor(Date.now() / maxAge)));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetchImpl(requestUrl.toString(), { headers: { Accept: "application/json" }, signal: controller.signal });
      if (!response.ok) {
        terminalStatus = `http_${response.status}`;
        continue;
      }
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.topics) || !payload.manifest) {
        terminalStatus = "invalid_payload";
        continue;
      }
      cachedBundle = payload;
      cachedAt = Date.now();
      cachedEndpoint = endpoint;
      return { status: "success", bundle: payload, cached: false };
    } catch (error) {
      terminalStatus = error?.name === "AbortError" ? "timeout" : "unavailable";
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: terminalStatus, bundle: null };
}

export async function searchPublishedKnowledge({ query = "", topics = [], limit = 8, requireMatch = false, excludeEntryIds = [], fetchImpl = globalThis.fetch, env = process.env } = {}) {
  const loaded = await loadBundle({ fetchImpl, env });
  if (!loaded.bundle) return { query, topics, snippets: [], urls: [], source: "legacy", status: loaded.status, cacheState: "unavailable" };
  const result = rankPublishedKnowledge(loaded.bundle, { query, topics, limit, requireMatch, excludeEntryIds });
  return { query, topics, ...result, source: "published", status: result.snippets.length ? "success" : "no_match", revision: loaded.bundle.revision || loaded.bundle.commit || null, cacheState: loaded.cached ? "hit" : "miss" };
}

export function resetPublishedKnowledgeCacheForTests() {
  cachedBundle = null;
  cachedAt = 0;
  cachedEndpoint = "";
}
