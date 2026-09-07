const INTENT_POLICY = Object.freeze({
  greeting: Object.freeze({ route: "conversational", capability: "none" }),
  acknowledgment: Object.freeze({ route: "conversational", capability: "none" }),
  repeat: Object.freeze({ route: "cached_answer", capability: "answer.read" }),
  stable_fact: Object.freeze({ route: "knowledge", capability: "knowledge.read" }),
  recommendations: Object.freeze({ route: "knowledge", capability: "knowledge.read" }),
  place_detail: Object.freeze({ route: "knowledge", capability: "knowledge.read" }),
  seasonal_climate: Object.freeze({ route: "knowledge", capability: "knowledge.read" }),
  approved_dated_fact: Object.freeze({ route: "knowledge", capability: "knowledge.read" }),
  forecast: Object.freeze({ route: "live", capability: "weather.read" }),
  beach_conditions: Object.freeze({ route: "live", capability: "safety.read" }),
  venue_status: Object.freeze({ route: "live", capability: "venue_status.read" }),
  restaurant_research: Object.freeze({ route: "live", capability: "venue_status.read" }),
  events: Object.freeze({ route: "live", capability: "events.read" }),
  live_travel: Object.freeze({ route: "live", capability: "travel.read" }),
  live_price: Object.freeze({ route: "live", capability: "price.read" }),
  availability: Object.freeze({ route: "availability", capability: "availability.read" }),
  booking_link: Object.freeze({ route: "link", capability: "links.read" }),
  contact_link: Object.freeze({ route: "link", capability: "links.read" }),
  protected_reservation: Object.freeze({ route: "refer", capability: "none" }),
  accommodation_request: Object.freeze({ route: "refer", capability: "none" }),
  emergency: Object.freeze({ route: "emergency", capability: "safety.read" }),
  unknown: Object.freeze({ route: "clarify", capability: "none" }),
});

const PROFILE_CAPABILITIES = Object.freeze({
  voice_lab_guest: new Set(["none", "answer.read", "knowledge.read", "weather.read", "safety.read", "venue_status.read", "events.read", "availability.read", "links.read"]),
  chat_public_guest: new Set(["none", "answer.read", "knowledge.read", "weather.read", "safety.read", "venue_status.read", "events.read", "travel.read", "availability.read", "links.read"]),
  chat_verified_guest: new Set(["none", "answer.read", "knowledge.read", "weather.read", "safety.read", "venue_status.read", "events.read", "travel.read", "availability.read", "links.read"]),
});

export function policyForIntent(intent) {
  return INTENT_POLICY[intent] || INTENT_POLICY.unknown;
}

export function authorizeSubrequest(profile, subrequest) {
  if (["clarify", "refer"].includes(subrequest.route) && subrequest.capability === "none") return Object.freeze({ allowed: true, reason: "safe_nonexecuting_route" });
  const expected = policyForIntent(subrequest.intent);
  if (subrequest.route !== expected.route || subrequest.capability !== expected.capability) {
    return Object.freeze({ allowed: false, reason: "intent_route_capability_mismatch" });
  }
  const allowed = PROFILE_CAPABILITIES[profile] || PROFILE_CAPABILITIES.chat_public_guest;
  return allowed.has(subrequest.capability)
    ? Object.freeze({ allowed: true, reason: "profile_capability_allowed" })
    : Object.freeze({ allowed: false, reason: "profile_capability_denied" });
}

export function authorizePlan(profile, subrequests) {
  const decisions = (subrequests || []).map(subrequest => Object.freeze({ subrequestId: subrequest.id, ...authorizeSubrequest(profile, subrequest) }));
  return Object.freeze({ allowed: decisions.every(item => item.allowed), decisions: Object.freeze(decisions) });
}
