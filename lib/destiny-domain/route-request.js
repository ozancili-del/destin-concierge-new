import {
  DESTINY_ROUTER_CONTRACT_VERSION,
  DESTINY_ROUTER_POLICY_VERSION,
  validateRouterPlan,
} from "./contracts.js";
import { interpretRouterInput } from "./interpret-request.js";
import { authorizePlan } from "./policy.js";

const ROUTE_CAPABILITY = Object.freeze({
  conversational: "none",
  cached_answer: "answer.read",
  knowledge: "knowledge.read",
  live: "weather.read",
  availability: "availability.read",
  link: "links.read",
  refer: "none",
  emergency: "safety.read",
  clarify: "none",
});

function pseudoFingerprint(value) {
  // Shadow-only deterministic correlation key. Before E2 activation, replace this
  // with a server-generated idempotency key backed by the durable plan ledger.
  const text = String(value || "");
  const seeds = [2166136261, 2246822519, 3266489917, 668265263, 374761393, 2654435761, 1597334677, 3812015801];
  return seeds.map(seed => {
    let hash = seed >>> 0;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }).join("");
}

function temporal(kind = "stable", month = null) {
  return Object.freeze({ kind, startDate: null, endDate: null, month, maxAgeSeconds: kind === "current" ? 900 : null });
}

function entities(source = {}, overrides = {}) {
  return Object.freeze({
    subjectIds: Object.freeze([...(overrides.subjectIds || source.subjectIds || [])]),
    originId: overrides.originId ?? source.originId ?? null,
    unresolvedMentions: Object.freeze([...(overrides.unresolvedMentions || source.unresolvedMentions || [])]),
  });
}

function filters(source = {}, overrides = {}) {
  return Object.freeze({
    cuisines: Object.freeze([...(overrides.cuisines || source.cuisines || [])]),
    fits: Object.freeze([...(overrides.fits || source.fits || [])]),
    excludedEntityIds: Object.freeze([...(overrides.excludedEntityIds || source.excludedEntityIds || [])]),
    maxMinutes: overrides.maxMinutes ?? source.maxMinutes ?? null,
    priceBand: overrides.priceBand ?? source.priceBand ?? null,
    hardConstraints: Object.freeze([...(overrides.hardConstraints || source.hardConstraints || [])]),
  });
}

function makeSubrequest({ id, intent, route, interpretation, fields = [], subjectIds, originId, unresolvedMentions, requestedCount = null, dependsOn = [], capability, requirements, fallbacks, temporalKind = "stable", month = null, booking = null, filterOverrides = {} }) {
  const safeFields = [...new Set(fields)];
  const safeSubjects = subjectIds || interpretation.entities.subjectIds;
  const generatedRequirements = safeFields.length
    ? safeFields.map((field, index) => ({ id: `${id}-r${index + 1}`, subjectId: safeSubjects.length === 1 ? safeSubjects[0] : null, field, required: true }))
    : [{ id: `${id}-r1`, subjectId: safeSubjects.length === 1 ? safeSubjects[0] : null, field: "outcome", required: true }];
  return Object.freeze({
    id,
    intent,
    route,
    entities: entities(interpretation.entities, { subjectIds: safeSubjects, originId, unresolvedMentions }),
    fields: Object.freeze(safeFields),
    temporal: temporal(temporalKind, month),
    filters: filters(interpretation.filters, filterOverrides),
    requestedCount,
    dependsOn: Object.freeze([...dependsOn]),
    capability: capability || ROUTE_CAPABILITY[route] || "none",
    requirements: Object.freeze(requirements || generatedRequirements),
    fallbacks: Object.freeze(fallbacks || (route === "knowledge" ? ["same_revision_origin", "eligible_lkg", "disclose_partial"] : route === "live" ? ["retry_same_read", "disclose_partial"] : ["clarify"])),
    booking,
  });
}

function buildSubrequests(input, interpretation) {
  const { flags } = interpretation;
  const result = [];
  const add = spec => result.push(makeSubrequest({ id: `s${result.length + 1}`, interpretation, ...spec }));

  if (input.context.pendingExternalRestaurantSearch && flags.affirmative) {
    add({ intent: "restaurant_research", route: "live", capability: "venue_status.read", fields: ["external_restaurant_research"], temporalKind: "current" });
    return result;
  }
  if (input.context.pendingExternalRestaurantSearch && flags.negative) {
    add({ intent: "acknowledgment", route: "conversational", fields: ["external_restaurant_search_declined"] });
    return result;
  }

  if (flags.acknowledgment) {
    add({ intent: "acknowledgment", route: "conversational", fields: ["acknowledgment"] });
    return result;
  }
  if (flags.asksRepeat) {
    add({ intent: "repeat", route: input.context.latestAnswerId ? "cached_answer" : "clarify", fields: ["previous_answer"] });
    return result;
  }
  if (interpretation.expectedSlot) {
    add({ intent: "availability", route: "clarify", fields: [interpretation.expectedSlot.field], booking: { [interpretation.expectedSlot.field]: interpretation.expectedSlot.value } });
    return result;
  }
  if (interpretation.ambiguousExpectedDate) {
    add({ intent: "availability", route: "clarify", fields: [input.context.expectedReply?.field || "arrival"] });
    return result;
  }
  if (flags.protectedReservation) {
    add({ intent: "protected_reservation", route: "refer", fields: ["owner_contact"] });
    return result;
  }
  if (flags.beachConditions) {
    add({ intent: "beach_conditions", route: "live", capability: "safety.read", fields: ["current_flags"], temporalKind: "current" });
    return result;
  }
  if (flags.liveForecast) {
    add({ intent: "forecast", route: "live", capability: "weather.read", fields: ["forecast"], temporalKind: "current" });
    return result;
  }
  if (flags.livePrice) {
    add({ intent: "live_price", route: input.context.priceAdapterEnabled ? "live" : "refer", capability: input.context.priceAdapterEnabled ? "price.read" : "none", fields: ["current_rate"], temporalKind: "current" });
    return result;
  }
  // "Table availability" must not be mistaken for condo availability. A
  // recognized restaurant stays on its stored HQ profile and refers the guest
  // to the restaurant for the operational guarantee.
  if (flags.availability && interpretation.entities.subjectIds.some(id => id.startsWith("restaurant_"))) {
    add({ intent: "place_detail", route: "knowledge", fields: ["stored_restaurant_profile"] });
    return result;
  }
  if (flags.availability || (input.context.booking && interpretation.booking)) {
    add({ intent: "availability", route: "availability", capability: "availability.read", fields: ["unit_availability"], temporalKind: "date_range", booking: interpretation.booking ? { ...(input.context.booking || {}), ...interpretation.booking } : input.context.booking });
    return result;
  }

  if (flags.airports) {
    add({
      intent: "recommendations",
      route: "knowledge",
      fields: ["airports"],
      requestedCount: interpretation.requestedCount || 3,
      subjectIds: [
        "transport_destin_fort_walton_beach_airport_vps",
        "transport_pensacola_international_airport_pns",
        "transport_northwest_florida_beaches_international_airport_ecp",
      ],
    });
    if (flags.liveFlight) add({ intent: "live_travel", route: input.context.flightAdapterEnabled ? "live" : "refer", capability: input.context.flightAdapterEnabled ? "travel.read" : "none", fields: ["flight_inventory"], temporalKind: "current" });
    return result;
  }

  const restaurantCategory = interpretation.category;
  if (restaurantCategory || flags.shopping) {
    const category = restaurantCategory || "shopping";
    add({ intent: "recommendations", route: "knowledge", fields: [category], requestedCount: interpretation.requestedCount || 3 });
    return result;
  }

  if (flags.liveVenueStatus) {
    const subjects = interpretation.entities.subjectIds;
    const restaurantRequest = interpretation.knowledgeTopics.includes("restaurants") || subjects.some(id => id.startsWith("restaurant_"));
    if (restaurantRequest) {
      add({ intent: "place_detail", route: "knowledge", fields: ["stored_normal_hours"] });
      return result;
    }
    if (subjects.length > 1) {
      for (const subjectId of subjects) add({ intent: "venue_status", route: "live", capability: "venue_status.read", fields: ["opening_status"], subjectIds: [subjectId], temporalKind: "current" });
    } else add({ intent: "venue_status", route: subjects.length ? "live" : "clarify", capability: subjects.length ? "venue_status.read" : "none", fields: ["opening_status"] });
    return result;
  }

  if (interpretation.entities.unresolvedMentions.length) {
    add({ intent: "unknown", route: "clarify", fields: ["subject"] });
    return result;
  }
  if (interpretation.fields.includes("distance_minutes")) {
    add({ intent: "place_detail", route: interpretation.entities.subjectIds.length === 1 ? "knowledge" : "clarify", fields: ["distance_minutes"] });
    return result;
  }
  if (interpretation.entities.subjectIds.some(id => id.startsWith("restaurant_"))) {
    add({ intent: "place_detail", route: "knowledge", fields: ["stored_restaurant_profile"] });
    return result;
  }
  if (flags.seasonalClimate) {
    add({ intent: "seasonal_climate", route: "knowledge", fields: interpretation.fields.length ? interpretation.fields : ["seasonal_weather"], temporalKind: "seasonal", month: interpretation.month });
    return result;
  }
  if (interpretation.fields.includes("balance_due")) {
    add({ intent: "stable_fact", route: "knowledge", fields: ["balance_due"] });
    return result;
  }
  if (interpretation.fields.includes("session_fee")) {
    add({ intent: "approved_dated_fact", route: "knowledge", fields: interpretation.fields, temporalKind: "approved_dated" });
    return result;
  }
  if (flags.accommodation) {
    add({ intent: "stable_fact", route: "knowledge", fields: ["accessibility_limitations"] });
    add({ intent: "accommodation_request", route: "refer", fields: ["owner_contact"] });
    return result;
  }
  if (interpretation.knowledgeTopics.length) {
    add({ intent: "stable_fact", route: "knowledge", fields: interpretation.knowledgeTopics.map(topic => `topic:${topic}`) });
    return result;
  }
  if (flags.genericFollowUp) {
    add({ intent: "unknown", route: "clarify", fields: ["category"] });
    return result;
  }
  // Unknown informational wording gets one bounded HQ attempt before the
  // gateway falls back. This prevents a missing paraphrase in the deterministic
  // topic vocabulary from bypassing knowledge that actually exists.
  add({ intent: "knowledge_candidate", route: "knowledge", fields: ["answer"] });
  return result;
}

export function routeRequest(input, { deadlineMs = 2000 } = {}) {
  const interpretation = interpretRouterInput(input);
  const subrequests = Object.freeze(buildSubrequests(input, interpretation));
  const createdAt = new Date(input.context.now || Date.now());
  const plan = Object.freeze({
    kind: "plan",
    version: DESTINY_ROUTER_CONTRACT_VERSION,
    planId: `plan:${input.sessionId}:${input.epoch}:${input.turnId}`.slice(0, 160),
    sessionId: input.sessionId,
    epoch: input.epoch,
    turnId: input.turnId,
    contextVersion: input.context.version,
    policyVersion: input.context.policyVersion || DESTINY_ROUTER_POLICY_VERSION,
    interpreterVersion: "deterministic-shadow-v2.1",
    revision: input.context.revision,
    requestFingerprint: pseudoFingerprint(JSON.stringify({ sessionId: input.sessionId, epoch: input.epoch, turnId: input.turnId, text: input.originalText, contextVersion: input.context.version, policyVersion: input.context.policyVersion, revision: input.context.revision })),
    supersedes: null,
    createdAt: createdAt.toISOString(),
    deadlineAt: new Date(createdAt.getTime() + deadlineMs).toISOString(),
    evidence: interpretation.evidence,
    subrequests,
    budget: Object.freeze({ maxInterpreterCalls: 0, maxProviderReads: subrequests.filter(item => ["live", "availability"].includes(item.route)).length, maxConcurrentReads: 2, maxRetriesPerRead: 1 }),
  });
  const validation = validateRouterPlan(plan);
  if (!validation.ok) throw new TypeError(`Invalid router plan: ${validation.errors.join(", ")}`);
  const authorization = authorizePlan(input.context.profile, plan.subrequests);
  if (!authorization.allowed) throw new TypeError(`Unauthorized router plan: ${authorization.decisions.filter(item => !item.allowed).map(item => `${item.subrequestId}:${item.reason}`).join(", ")}`);
  return plan;
}

export function summarizeRouterPlan(plan) {
  return Object.freeze({
    version: plan.version,
    policyVersion: plan.policyVersion,
    planId: plan.planId,
    routes: Object.freeze(plan.subrequests.map(item => item.route)),
    intents: Object.freeze(plan.subrequests.map(item => item.intent)),
    fields: Object.freeze([...new Set(plan.subrequests.flatMap(item => item.fields))]),
    capabilities: Object.freeze([...new Set(plan.subrequests.map(item => item.capability))]),
    requestedCounts: Object.freeze(plan.subrequests.map(item => item.requestedCount)),
    shadow: true,
  });
}
