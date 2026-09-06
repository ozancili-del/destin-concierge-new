export const DESTINY_DOMAIN_CONTRACT_VERSION = 1;

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
