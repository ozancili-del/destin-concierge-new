export const DESTINY_DOMAIN_CONTRACT_VERSION = 1;
export const DESTINY_ROUTER_CONTRACT_VERSION = 2;
export const DESTINY_ROUTER_POLICY_VERSION = "destiny-router-policy-v2-shadow-1";

export const DESTINY_ROUTER_CHANNELS = Object.freeze(["voice", "chat"]);
export const DESTINY_ROUTER_PROFILES = Object.freeze([
  "voice_lab_guest",
  "chat_public_guest",
  "chat_verified_guest",
]);

export const DESTINY_ROUTER_ROUTES = Object.freeze([
  "conversational",
  "cached_answer",
  "knowledge",
  "live",
  "availability",
  "link",
  "refer",
  "emergency",
  "clarify",
]);

export const DESTINY_ROUTER_CAPABILITIES = Object.freeze([
  "none",
  "answer.read",
  "knowledge.read",
  "weather.read",
  "safety.read",
  "venue_status.read",
  "events.read",
  "travel.read",
  "price.read",
  "availability.read",
  "links.read",
]);

export const DESTINY_DOMAIN_STATUSES = Object.freeze([
  "complete",
  "partial",
  "clarify",
  "unavailable",
  "denied",
  "error",
]);

const DOMAIN_STATUS_SET = new Set(DESTINY_DOMAIN_STATUSES);

export function cleanDomainId(value, max = 160) {
  const cleaned = String(value || "").trim().slice(0, max);
  return /^[a-zA-Z0-9._:-]+$/.test(cleaned) ? cleaned : "";
}

export function createDomainResult({
  traceId = "",
  turnId = "",
  subrequestId = "",
  status = "error",
  requestedRoute = "",
  executedRoute = "",
  httpStatus = null,
  revision = "",
  source = "",
  cacheState = "",
  fallbackReason = "",
  resolved = [],
  unresolved = [],
} = {}) {
  return {
    version: DESTINY_DOMAIN_CONTRACT_VERSION,
    traceId: cleanDomainId(traceId),
    turnId: cleanDomainId(turnId),
    subrequestId: cleanDomainId(subrequestId),
    status: DOMAIN_STATUS_SET.has(status) ? status : "error",
    requestedRoute: cleanDomainId(requestedRoute, 80),
    executedRoute: cleanDomainId(executedRoute, 80),
    httpStatus: Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? httpStatus : null,
    revision: cleanDomainId(revision, 160),
    source: cleanDomainId(source, 80),
    cacheState: cleanDomainId(cacheState, 40),
    fallbackReason: cleanDomainId(fallbackReason, 120),
    resolved: [...new Set((Array.isArray(resolved) ? resolved : []).map(value => cleanDomainId(value, 120)).filter(Boolean))],
    unresolved: [...new Set((Array.isArray(unresolved) ? unresolved : []).map(value => cleanDomainId(value, 120)).filter(Boolean))],
  };
}

export function domainResultSucceeded(domain) {
  return domain?.status === "complete" || domain?.status === "partial";
}

function boundedText(value, max, fallback = "") {
  const text = String(value ?? "").trim().slice(0, max);
  return text || fallback;
}

function boundedStringList(values, maxItems = 12, maxLength = 160) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(value => boundedText(value, maxLength))
    .filter(Boolean))].slice(0, maxItems);
}

function safeInteger(value, fallback, minimum = 0) {
  return Number.isInteger(value) && value >= minimum ? value : fallback;
}

export function createRouterContext(context = {}) {
  const profile = DESTINY_ROUTER_PROFILES.includes(context.profile)
    ? context.profile
    : "chat_public_guest";
  return Object.freeze({
    version: safeInteger(context.version, 0),
    profile,
    revision: boundedText(context.revision, 160, "unversioned-shadow"),
    policyVersion: boundedText(context.policyVersion, 160, DESTINY_ROUTER_POLICY_VERSION),
    locale: boundedText(context.locale, 30, "en"),
    timezone: boundedText(context.timezone, 80, "America/Chicago"),
    now: boundedText(context.now, 80, new Date().toISOString()),
    activePlanId: cleanDomainId(context.activePlanId) || null,
    activeCategory: cleanDomainId(context.activeCategory) || null,
    focusedEntityIds: boundedStringList(context.focusedEntityIds || context.focusedEntities, 12),
    offeredEntityIds: boundedStringList(context.offeredEntityIds || context.offered, 64),
    expectedReply: context.expectedReply && typeof context.expectedReply === "object"
      ? Object.freeze({
        planId: cleanDomainId(context.expectedReply.planId) || "shadow-prior-plan",
        field: cleanDomainId(context.expectedReply.field) || "unknown",
        allowedValues: boundedStringList(context.expectedReply.allowedValues, 12),
      })
      : null,
    booking: context.booking && typeof context.booking === "object" ? Object.freeze({ ...context.booking }) : null,
    latestAnswerId: cleanDomainId(context.latestAnswerId) || (context.previousAnswerFrame ? "shadow-previous-answer" : null),
    pendingExternalRestaurantSearch: boundedText(context.pendingExternalRestaurantSearch, 500) || null,
  });
}

export function createRouterInput({
  sessionId,
  epoch = 1,
  turnId,
  sequence = 1,
  channel,
  originalText,
  proposedRewrite = null,
  context = {},
} = {}) {
  const safeChannel = DESTINY_ROUTER_CHANNELS.includes(channel) ? channel : "chat";
  const text = boundedText(originalText, 4000);
  if (!text) throw new TypeError("Router input requires originalText.");
  return Object.freeze({
    kind: "input",
    version: DESTINY_ROUTER_CONTRACT_VERSION,
    sessionId: cleanDomainId(sessionId) || "shadow-session",
    epoch: safeInteger(epoch, 1, 1),
    turnId: cleanDomainId(turnId) || `shadow-turn-${safeInteger(sequence, 1, 1)}`,
    sequence: safeInteger(sequence, 1, 1),
    channel: safeChannel,
    originalText: text,
    proposedRewrite: proposedRewrite ? boundedText(proposedRewrite, 2000) : null,
    inputSource: safeChannel === "voice" ? "accepted_voice_transcript" : "chat_message",
    context: createRouterContext({ ...context, profile: context.profile || (safeChannel === "voice" ? "voice_lab_guest" : "chat_public_guest") }),
  });
}

export function validateRouterPlan(plan) {
  const errors = [];
  if (plan?.kind !== "plan" || plan?.version !== DESTINY_ROUTER_CONTRACT_VERSION) errors.push("invalid_plan_version");
  if (!cleanDomainId(plan?.planId)) errors.push("invalid_plan_id");
  if (!Array.isArray(plan?.subrequests) || plan.subrequests.length < 1 || plan.subrequests.length > 6) errors.push("invalid_subrequest_count");
  const ids = new Set();
  for (const subrequest of plan?.subrequests || []) {
    if (!cleanDomainId(subrequest?.id) || ids.has(subrequest.id)) errors.push("invalid_or_duplicate_subrequest_id");
    ids.add(subrequest?.id);
    if (!DESTINY_ROUTER_ROUTES.includes(subrequest?.route)) errors.push(`invalid_route:${subrequest?.id || "unknown"}`);
    if (!DESTINY_ROUTER_CAPABILITIES.includes(subrequest?.capability)) errors.push(`invalid_capability:${subrequest?.id || "unknown"}`);
    if (!Array.isArray(subrequest?.requirements) || !subrequest.requirements.length) errors.push(`missing_requirements:${subrequest?.id || "unknown"}`);
  }
  for (const subrequest of plan?.subrequests || []) {
    for (const dependency of subrequest?.dependsOn || []) if (!ids.has(dependency)) errors.push(`unknown_dependency:${dependency}`);
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze([...new Set(errors)]) });
}
