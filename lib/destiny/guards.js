// lib/destiny/guards.js
// Stage 4 (core) — permission-based output validation. The composed reply is
// checked BEFORE it ships. Regex "repair" patterns that survive from v1 are the
// battle-tested claim guards (chat.js 4075-4137), now backed by a real per-turn
// URL allow-list instead of pattern-matching alone.

import { CONTACTS } from "./knowledge.js";

// Static URLs the model may always use (site pages it's told about in the KB).
export const STATIC_ALLOWED_URLS = [
  "https://www.destincondogetaways.com/availability",
  "https://www.destincondogetaways.com/virtual-tour",
  "https://www.destincondogetaways.com/reviews",
  "https://www.destincondogetaways.com/pelican-707",
  "https://www.destincondogetaways.com/pelican-1006",
  "https://www.destincondogetaways.com/beach-deals",
  "https://www.destincondogetaways.com/contact",
];

const URL_RE = /https?:\/\/[^\s)\]>"']+/g;

export function validateReply(reply, turn) {
  const violations = [];
  let text = String(reply || "");

  // 1) Placeholder tokens — never permitted (v1's worst leak class).
  if (/\{url\d*\}|\{link\}|\[link\]|\[url\]|\[activity\]|\[booking link\]/i.test(text)) {
    violations.push("placeholder_token");
    text = text.replace(/\{url\d*\}|\{link\}|\[link\]|\[url\]|\[activity\]|\[booking link\]/gi, "").replace(/ {2,}/g, " ");
  }

  // 2) URL allow-list — every URL must have been produced by a tool this turn
  //    or be a known static page. Unknown URLs are stripped and logged.
  const found = text.match(URL_RE) || [];
  for (const raw of found) {
    const url = raw.replace(/[.,!?;:]+$/, "");
    const allowed =
      turn.allowedUrls.has(url) ||
      STATIC_ALLOWED_URLS.some((s) => url === s || url.startsWith(s + "?")) ||
      // registered tool URLs sometimes appear with tracking params appended by
      // the model — reject those too: exact match or nothing.
      false;
    if (!allowed) {
      violations.push(`disallowed_url:${url.slice(0, 80)}`);
      text = text.split(raw).join("[link removed]");
    }
  }

  // 3) Booking-link claim guard (v1 4107-4120): claims links but has none.
  const hasBookingUrl = /destincondogetaways\.com\/pelican-beach-resort-unit-(707-orp5b47b5ax|1006-orp5b6450ex)\?or_arrival=/.test(text);
  const claimsLinks = /here (are|is) (your|the) (booking )?links?|booking links?:|follow the links?|links? below|links? again for you|share the links? again|provide the booking links?/i.test(text);
  if (claimsLinks && !hasBookingUrl && !turn.linksSentEarlier) violations.push("false_link_claim");

  // 4) Flight-link claim guard (v1 4122-4137).
  const hasFlightUrl = /aviasales\.com/.test(text);
  const claimsFlight = /here'?s? (your|the) (direct )?flight( search)? link|flight search link|search flights? (link|for)|flight link (is )?(ready|below)|pre-?filled|already filled in/i.test(text);
  if (claimsFlight && !hasFlightUrl) violations.push("false_flight_claim");

  // 5) BLUE gate — the code may only appear with an authorizing capture_lead
  //    result this turn, or if it was legitimately unlocked earlier in session.
  if (/\bBLUE\b/.test(text) && !turn.blueAuthorized && !turn.state?.blueUnlocked) {
    violations.push("blue_leak");
    text = text.replace(/[^.!?\n]*\bBLUE\b[^.!?\n]*[.!?]?/g, "").replace(/ {2,}/g, " ").trim();
  }

  // 6) Alert claim — "Ozan has been notified/alerted" requires a real send.
  const claimsAlert = /(ozan|owner) (has been|was|is) (notified|alerted)|sent (an? )?(urgent )?alert/i.test(text);
  const alertReal = turn.backstopAlertFired || (turn.alertsFiredThisTurn && turn.alertsFiredThisTurn.length > 0) || turn.priorAlertSent;
  if (claimsAlert && !alertReal) violations.push("false_alert_claim");

  // 7) Escalation enforcement (v1 §3.6): serious tone, contact info, no emojis,
  //    no booking questions. Code-enforced, not prompt-trusted.
  if (turn.escalationActive) {
    text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "");
    if (/how many (adults|children|guests|people)|check-?in date|what dates|your dates/i.test(text)) {
      violations.push("escalation_booking_question");
    }
    if (!text.includes(CONTACTS.ozanPhone) && !text.toLowerCase().includes(CONTACTS.ozanEmail)) {
      text = text.trimEnd() + `\n\nYou can reach Ozan directly anytime: ${CONTACTS.ozanPhone} or ${CONTACTS.ozanEmail}.`;
    }
  }

  // 8) Availability claims must match the latest tool result this turn.
  if (turn.latestAvailability?.units) {
    for (const u of turn.latestAvailability.units) {
      const claimsAvail = new RegExp(`unit ${u.unit}[^.!?\\n]{0,60}\\b(is|are) available`, "i").test(text);
      if (claimsAvail && u.available === false) violations.push(`false_availability_claim:${u.unit}`);
    }
  }

  return { text, violations, fatal: violations.some((v) =>
    v === "false_link_claim" || v === "false_flight_claim" || v === "false_alert_claim" ||
    v === "escalation_booking_question" || v.startsWith("false_availability_claim")
  ) };
}

// Deterministic safe fallbacks when re-composition also fails.
export function safeFallback(turn) {
  if (turn.escalationActive) {
    return `I hear you, and I want to be completely straightforward: this is a real, owner-operated business — two condos at Pelican Beach Resort owned and personally managed by Ozan. No pressure and no sales talk. You can reach Ozan directly anytime: ${CONTACTS.ozanPhone} or ${CONTACTS.ozanEmail}. He will personally sort this out with you.`;
  }
  if (turn.urlsProduced?.booking?.length) {
    return `Here's what I can confirm right now — you can check live availability and book directly here: ${turn.urlsProduced.booking[0]}\n\nIf anything looks off, Ozan is reachable at ${CONTACTS.ozanPhone} or ${CONTACTS.ozanEmail}.`;
  }
  return `I want to make sure I give you accurate information rather than guess. Could you tell me a little more about what you need? You can also check live availability anytime at https://www.destincondogetaways.com/availability — and Ozan is reachable directly at ${CONTACTS.ozanPhone} or ${CONTACTS.ozanEmail}.`;
}
