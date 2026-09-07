import { resolveEntities, separateSubjectAndOrigin } from "./entity-index.js";
import { inferPublishedKnowledgeTopics } from "../destiny-agent/published-knowledge.js";

const MONTHS = Object.freeze({ january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12, ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6, temmuz: 7, agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12 });

function fold(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[’]/g, "'");
}

function detectedMonth(text) {
  const value = fold(text);
  return Object.entries(MONTHS).find(([name]) => new RegExp(`\\b${name}\\b`, "i").test(value))?.[1] || null;
}

function isoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function explicitDateRange(text, nowValue) {
  const value = fold(text);
  const match = value.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(?:to|through|until|-)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (!match) return null;
  const month = MONTHS[match[1]];
  const startDay = Number(match[2]);
  const endDay = Number(match[3]);
  const now = new Date(nowValue);
  let year = Number.isNaN(now.getTime()) ? new Date().getUTCFullYear() : now.getUTCFullYear();
  const candidate = isoDate(year, month, startDay);
  const today = Number.isNaN(now.getTime()) ? null : now.toISOString().slice(0, 10);
  if (candidate && today && candidate < today) year += 1;
  const arrival = isoDate(year, month, startDay);
  const departure = isoDate(year, month, endDay);
  return arrival && departure && departure > arrival ? { arrival, departure } : null;
}

function recommendationCount(text, fallback = 3) {
  const value = fold(text);
  if (/\b(?:only|just) one\b|\bone(?: option| place)?(?:,| please|\.|$)/.test(value)) return 1;
  const word = value.match(/\b(one|two|three|four|five|six)\b/);
  if (word) return ({ one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 })[word[1]];
  const number = value.match(/\b([1-9]|1[0-2])\b/);
  return number ? Number(number[1]) : fallback;
}

function cuisineCategory(text, activeCategory = "") {
  const value = fold(text);
  if (/\bitalian|pasta\b/.test(value)) return "restaurant-italian";
  if (/\bseafood|oyster\b/.test(value) && !/\b(?:no|avoid|without) seafood\b/.test(value)) return "restaurant-seafood";
  if (/\bsushi|japanese|thai|asian\b/.test(value)) return "restaurant-sushi-asian";
  if (/\bbreakfast|brunch\b/.test(value)) return "restaurant-breakfast";
  if (/\bpizza|takeout\b/.test(value)) return "restaurant-pizza-takeout";
  if (/\brestaurant|places? to eat|where should we eat|where can we eat|where do we eat\b/.test(value)) return "restaurant";
  if (/\bwhat about kids\b/.test(value) && String(activeCategory).startsWith("restaurant")) return activeCategory;
  if (/\bother (?:ones?|options?)|what else|anything else\b/.test(value) && activeCategory) return activeCategory;
  if (/\b(?:only|just) one\b/.test(value) && activeCategory) return activeCategory;
  if (/\b(?:cheap|budget|affordable|close|nearby|family friendly|for kids|romantic|quiet)\b/.test(value) && String(activeCategory).startsWith("restaurant")) return activeCategory;
  return "";
}

function requestedFields(text, category) {
  const value = fold(text);
  if (category) return [category];
  if (/\b(?:close|near|distance|far|minutes?|drive)\b/.test(value)) return ["distance_minutes"];
  if (/\bev\b|electric vehicle|j1772/.test(value) && /\b(?:rates?|prices?|fees?|cost|charging)\b/.test(value)) return ["session_fee", "energy_fee", "idle_fee", "idle_cap", "idle_exemption"];
  if (/\bbalance\b.*\bdue\b|\bdue\b.*\bbalance\b/.test(value)) return ["balance_due"];
  if (/\bairport|vps|pns|ecp\b/.test(value)) return ["airports"];
  if (/\bweather|forecast\b/.test(value)) return ["forecast"];
  if (/\bgulf|water\b/.test(value) && /\btemperature|warm|cold\b/.test(value)) return ["typical_water_temperature"];
  if (/\bbeach flags?|rip current|surf conditions?\b/.test(value)) return ["current_flags"];
  if (/\bwheelchair|accessible|accessibility|disability\b/.test(value)) return ["accessibility_limitations"];
  return [];
}

export function interpretRouterInput(input) {
  const text = input.originalText;
  const value = fold(text);
  const context = input.context || {};
  const resolved = resolveEntities(text, context);
  const separated = separateSubjectAndOrigin(resolved.subjectIds, text);
  const category = cuisineCategory(text, context.activeCategory);
  const month = detectedMonth(text);
  const explicitCurrent = /\b(?:today|tomorrow|tonight|right now|currently|current|latest|this week|this weekend|open now)\b/.test(value);
  const ignoresHours = /\b(?:avoid|do not|don't|not|no|without)\s+(?:(?:any|the)\s+)?(?:(?:current|live|latest|real[- ]?time)\s+)?(?:hours?|opening status)\b/.test(value);
  const ignoresForecast = /\b(?:avoid|do not|don't|not|no|without)\s+(?:(?:any|the)\s+)?(?:(?:current|live|latest|real[- ]?time)\s+)?(?:forecast|conditions?)\b/.test(value);
  const asksRecommendations = Boolean(category) || /\b(?:recommend|suggest|options?|where should we eat|airports? should we consider|what airports?|shops?|shopping)\b/.test(value);
  const asksRepeat = /\b(?:repeat that|same (?:three|ones?|options?) again|say that again)\b/.test(value);
  const acknowledgment = /^(?:thanks?|thank you|okay|ok|got it|perfect)[.! ]*$/.test(value.trim());
  const protectedReservation = /\b(?:cancel|change|modify|look up|find)\b[^.]{0,40}\b(?:my|someone else's|somebody else's|their)?\s*(?:booking|reservation)\b|\b(?:booking|reservation)\b[^.]{0,40}\b(?:cancel|change|modify|confirmation)\b/.test(value);
  const availability = /\b(?:availability|available|open dates?|book a condo)\b/.test(value);
  const liveFlight = /\b(?:check|search|find)\b[^.]{0,25}\bflights?\b|\bflight inventory\b/.test(value);
  const liveVenueStatus = !ignoresHours && (/\bopen now\b|\bcheck (?:their |its |the )?(?:hours?|opening)\b|\bhours?\b/.test(value)) && !/\bbalance\b/.test(value);
  const liveForecast = !ignoresForecast && /\b(?:weather|forecast|rain|temperature)\b/.test(value) && explicitCurrent;
  const seasonalClimate = (/\b(?:usually|typical|generally|seasonal|average)\b/.test(value) || month) && /\b(?:weather|climate|gulf|water|temperature|warm|cold|rain|hava|sicaklik|yagmur)\b/.test(value) && !liveForecast;
  const beachConditions = /\b(?:beach flags?|rip current|surf conditions?)\b/.test(value) && explicitCurrent;
  const accommodation = /\b(?:wheelchair|accessible|accessibility|disability|service animal|accommodation)\b/.test(value);
  const livePrice = /\b(?:rate|rates|price|quote|how much)\b/.test(value) && /\b(?:condo|unit|stay|tonight)\b/.test(value);
  const shopping = /\b(?:shops?|shopping|mall)\b/.test(value);
  const airports = /\b(?:airports?|vps|pns|ecp|pensacola|panama city|fort walton)\b/.test(value);
  const genericFollowUp = /\b(?:what other ones|anything else|what else)\b/.test(value);
  const expectedField = context.expectedReply?.field || null;
  const expectedNumber = value.trim().match(/^(?:two|2)\.?$/) ? 2 : null;
  const ambiguousExpectedDate = Boolean(expectedField && /\btonight\b.*\bnext week\b|\bnext week\b.*\btonight\b/.test(value));
  const party = /\b(?:two|2) adults?\b/.test(value)
    ? { adults: 2, children: /\b(?:no|0|zero) children\b/.test(value) ? 0 : null }
    : null;
  const dates = explicitDateRange(text, context.now);
  const knowledgeTopics = inferPublishedKnowledgeTopics(text);

  return Object.freeze({
    text,
    value,
    evidence: Object.freeze([{ source: "original_text", start: 0, end: text.length, stateRef: null, interpretation: "Deterministic shadow interpretation of the accepted guest text." }]),
    entities: Object.freeze({ subjectIds: separated.subjectIds, originId: separated.originId, unresolvedMentions: resolved.unresolvedMentions }),
    category,
    knowledgeTopics: Object.freeze(knowledgeTopics),
    month,
    flags: Object.freeze({ acknowledgment, asksRepeat, asksRecommendations, protectedReservation, availability, liveFlight, liveVenueStatus, liveForecast, seasonalClimate, beachConditions, accommodation, livePrice, shopping, airports, genericFollowUp }),
    expectedSlot: expectedField && expectedNumber !== null ? Object.freeze({ field: expectedField === "party" ? "adults" : expectedField, value: expectedNumber }) : null,
    ambiguousExpectedDate,
    party,
    booking: party || dates ? Object.freeze({ ...(dates || {}), ...(party || {}) }) : null,
    fields: Object.freeze(requestedFields(text, category)),
    requestedCount: asksRecommendations ? recommendationCount(text) : null,
    filters: Object.freeze({
      cuisines: Object.freeze(category.startsWith("restaurant-") ? [category.replace("restaurant-", "")] : []),
      fits: Object.freeze(/\b(?:kids?|children|family)\b/.test(value) ? ["family"] : []),
      excludedEntityIds: Object.freeze([...(context.offeredEntityIds || [])]),
      maxMinutes: null,
      priceBand: null,
      hardConstraints: Object.freeze(/\b(?:no|avoid|without) seafood\b/.test(value) ? ["exclude:seafood-only"] : []),
    }),
  });
}
