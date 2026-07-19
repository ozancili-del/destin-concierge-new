// lib/destiny/tools.js
// Stage 1 tool set, implemented. Every tool: validates in code, executes the
// battle-tested v1 helper, returns STRUCTURED data (never prose instructions),
// and registers any URL it produced into turn.allowedUrls for the output guard.
//
// "turn" is a per-request context object created by the handler:
//   { state, todayIso, allowedUrls:Set, urlsProduced:{...}, backstopAlertFired,
//     sessionId, pageSource, sawBanner, alertsFiredThisTurn:[], blueAuthorized }

import {
  checkAvailability, fetchPropertyBookings, isRangeFree,
  buildLink, buildFlightLink, buildTripShockLink, TRIPSHOCK_CATEGORIES,
  fetchGuestBooking, fetchDestinWeather, fetchBlogContent, BLOG_URLS,
  sendEmergencyDiscord, addBrevoContact,
  extractOrigin, MULTI_AIRPORT_MAIN, cityIataMap, VALID_ORIGIN_IATA,
  UNIT_707_PROPERTY_ID, UNIT_1006_PROPERTY_ID,
  detectAccidentalDamage, detectExternalDisturbance, detectTripShockCategory,
} from "./helpers.js";
import { validateCounts, mergeBooking } from "./state.js";
import { OCCUPANCY, DISCOUNTS } from "./knowledge.js";

const AVAILABILITY_PAGE = "https://www.destincondogetaways.com/availability";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// ─────────────────────────────────────────────────────────────────────────────
// Tool schemas (what the model sees)
// ─────────────────────────────────────────────────────────────────────────────
export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "note_party_details",
      description:
        "Record booking details the guest just stated, even when no availability check is possible yet (e.g. dates unknown). Pass ONLY values the guest explicitly stated in this conversation about THIS stay. null means not stated; children:0 means the guest explicitly said no kids. Never infer counts from past stays, other people's families, or hypotheticals.",
      parameters: {
        type: "object",
        properties: {
          adults: { type: ["integer", "null"], minimum: 1, maximum: 20 },
          children: { type: ["integer", "null"], minimum: 0, maximum: 20 },
          bedroomsRequested: { type: ["integer", "null"], minimum: 1, maximum: 6 },
          preferredUnit: { type: ["string", "null"], enum: ["707", "1006", null] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "Check live availability for both units for an EXACT date range and party size, and get verified booking links. Call whenever the guest wants to book, asks price/availability for specific dates, changes dates, or changes party size. Returns per-unit availability, pre-built booking URLs (pass through verbatim — never modify), occupancy/HOA rulings, and alternatives if unavailable. For month-level or flexible dates use find_open_windows instead. If dates or adult count are unknown, ask the guest — never guess.",
      parameters: {
        type: "object",
        properties: {
          arrival: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          departure: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          adults: { type: "integer", minimum: 1, maximum: 20 },
          children: {
            type: ["integer", "null"], minimum: 0, maximum: 20,
            description: "null = guest has not said; 0 = guest explicitly said none",
          },
        },
        required: ["arrival", "departure", "adults", "children"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_standard_booking_reply",
      description:
        "Ship the standard availability answer directly to the guest, composed by the system. Call ONLY when ALL true: (1) the guest's current message is purely a booking/availability request or a direct answer to a booking question you asked; (2) it contains NO other question, concern, complaint, comparison, or topic — not even a small one; (3) arrival, departure, adults and children are all known (children may be an explicit 0). If the guest asked ANYTHING else in the same message, call check_availability instead and compose the full answer yourself. When in doubt, do not call this.",
      parameters: {
        type: "object",
        properties: {
          arrival: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          departure: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          adults: { type: "integer", minimum: 1, maximum: 6 },
          children: { type: "integer", minimum: 0, maximum: 6 },
        },
        required: ["arrival", "departure", "adults", "children"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_open_windows",
      description:
        "Find open date windows when the guest is flexible: they named a month ('sometime in October'), a vague part of a month ('first week of July'), asked what's available, or their exact dates were unavailable and they can shift. Returns real open windows with verified booking links. Not for exact fixed dates — use check_availability for those.",
      parameters: {
        type: "object",
        properties: {
          month: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}$" },
          monthPart: { type: ["string", "null"], enum: ["early", "mid", "late", null] },
          targetArrival: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          targetDeparture: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          flexibilityDays: { type: ["integer", "null"], minimum: 1, maximum: 7 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_existing_booking",
      description:
        "Look up the current guest's VERIFIED booking (unit, dates, times, door code if releasable, party size). Call when an existing guest asks about their stay, door code, extending, or the other unit. Only works when the session has a verified booking. Never state booking details or door codes from memory.",
      parameters: {
        type: "object",
        properties: {
          purpose: { type: "string", enum: ["stay_details", "door_code", "extension", "other_unit"] },
          extensionNights: { type: ["integer", "null"], minimum: 1, maximum: 21 },
        },
        required: ["purpose"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "build_flight_search",
      description:
        "Build a verified flight search link to the Destin area. Call when the guest names their departure city/airport, or gives a vague 'any/whichever' answer after being asked. Pass the guest's RAW wording — the system resolves it. If the result is unresolved_origin, NO link exists: say you didn't catch the city and ask them to confirm it. Never guess an origin from a typo; never claim a link exists unless this returned one.",
      parameters: {
        type: "object",
        properties: {
          originText: { type: "string", description: "Guest's own words for where they fly from, verbatim, typos included" },
          destination: { type: "string", enum: ["VPS", "PNS", "ECP"] },
        },
        required: ["originText"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_destin_weather",
      description:
        "Real 7-day Destin forecast plus seasonal climate averages. Call for any weather/temperature/rain/packing question. Never state temperatures from memory. For live Gulf water/sea conditions it returns live-widget links — share those instead of numbers.",
      parameters: {
        type: "object",
        properties: { focus: { type: "string", enum: ["forecast", "seasonal", "water_conditions"] } },
        required: ["focus"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_local_guide",
      description:
        "Verified local-guide content + correct blog link for a topic. Call for any local/info question so answers come from real content, not memory — including specific event dates, which must come from this tool or be honestly declared unknown.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: [...Object.keys(BLOG_URLS), "photos"],
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity_options",
      description:
        "Verified TripShock booking link for a local activity (dolphin, fishing, jetski, pontoon, parasail, crabisland, snorkel, sunset, pirate, kayak, paddleboard, fireworks, tiki, banana, photographer, boattour) or 'general'. Use the returned link verbatim; never quote activity prices.",
      parameters: {
        type: "object",
        properties: {
          category: { type: ["string", "null"] },
          dateFrom: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          dateTo: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_maintenance_alert",
      description:
        "Propose an alert to the owner about a maintenance problem, lockout, or emergency the guest reports. The system decides whether it sends (it deduplicates; it may have already fired automatically). Call whenever the guest reports something broken, being locked out, or a safety issue — even alongside other topics. Never tell the guest an alert was sent unless the result confirms sent:true.",
      parameters: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["maintenance", "lockout", "emergency"] },
          summary: { type: "string", maxLength: 120 },
        },
        required: ["severity", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notify_owner",
      description:
        "Propose a non-maintenance message to the owner: guest explicitly asked to relay a message to Ozan, urgent contact, resend request, or mentioned a special occasion (anniversary/honeymoon/birthday) during a verified stay. System decides whether it sends.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["relay", "urgent_contact", "resend", "special_occasion"] },
          content: { type: ["string", "null"], maxLength: 400 },
        },
        required: ["kind"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "capture_lead",
      description:
        "Propose capturing the guest's email for the discount unlock. Call when the guest provides an email in a popup/banner/concierge context. The system validates and decides; the result says whether a discount code may be revealed. NEVER reveal any discount code unless the result explicitly authorizes it via revealText.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string" },
          firstName: { type: ["string", "null"] },
        },
        required: ["email"],
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared internals
// ─────────────────────────────────────────────────────────────────────────────

function registerUrl(turn, url, kind = "other") {
  if (!url) return;
  turn.allowedUrls.add(url);
  (turn.urlsProduced[kind] ||= []).push(url);
}

function pastDateRuling(arrival, departure, todayIso) {
  // v1 logic (chat.js 2437-2482): auto-roll to next year when >=2 months past
  // and no explicit year was given this conversation; else surface past_dates.
  if (arrival >= todayIso) return { ok: true, arrival, departure };
  const monthsPast =
    (new Date(todayIso) - new Date(arrival)) / (1000 * 60 * 60 * 24 * 30.44);
  if (monthsPast >= 2 && !turnMentionedYear.value) {
    const roll = (d) => `${parseInt(d.slice(0, 4), 10) + 1}${d.slice(4)}`;
    return { ok: true, arrival: roll(arrival), departure: roll(departure), rolled: true };
  }
  return { ok: false };
}
// The handler sets this per-request before the loop runs (ugly but simple:
// avoids threading one boolean through every signature).
export const turnMentionedYear = { value: false };

function sanityCheckDates(args, todayIso) {
  if (!ISO.test(args.arrival || "") || !ISO.test(args.departure || ""))
    return { status: "invalid_dates", detail: "Dates must be YYYY-MM-DD." };
  let departure = args.departure;
  if (departure <= args.arrival) {
    // Cross-year repair: "Dec 29 - Jan 3" parses with both dates in the same
    // year (verbatim extractDates behavior — confirmed against production).
    // If rolling the departure forward one year yields a sane stay (<= 31
    // nights), that is clearly what the guest meant. Otherwise: reversed.
    const rolled = `${parseInt(departure.slice(0, 4), 10) + 1}${departure.slice(4)}`;
    const nights = (new Date(rolled) - new Date(args.arrival)) / 86400000;
    if (nights > 0 && nights <= 31) {
      departure = rolled;
    } else {
      return { status: "invalid_dates", detail: "Departure must be after arrival — the dates look reversed." };
    }
  }
  args = { ...args, departure };
  const past = pastDateRuling(args.arrival, args.departure, todayIso);
  if (!past.ok)
    return { status: "past_dates", detail: `Arrival ${args.arrival} is in the past.`, suggestion: `${parseInt(args.arrival.slice(0, 4), 10) + 1}${args.arrival.slice(4)}` };
  return { status: "ok", arrival: past.arrival, departure: past.departure, rolled: !!past.rolled };
}

function occupancyRuling(adults, children) {
  // Battle-tested rules, code-owned (chat.js 2597-2776):
  //   max 6 per unit, max 12 across both, HOA requires 1 adult per 3 children.
  const kids = children == null ? 0 : children;
  const total = adults + kids;
  const requiredAdults = Math.ceil(kids / OCCUPANCY.adultsPerChildren);
  if (total > OCCUPANCY.maxBothUnits) return { status: "occupancy_exceeded", total };
  const hoaViolation = adults < requiredAdults;
  const needsTwoCondos = total > OCCUPANCY.maxPerUnit || (hoaViolation && adults === 1 && kids === 5);
  if (needsTwoCondos) return { status: "two_condo_option", total, requiredAdults, hoaViolation };
  if (adults === 1 && kids === 4) return { status: "hoa_uncertain", total, requiredAdults };
  if (hoaViolation) return { status: "hoa_violation", total, requiredAdults };
  return { status: "ok", total, requiredAdults };
}

function enumerateSplits(adults, children) {
  // Verbatim port of chat.js 2647-2703: all valid 2-unit splits, most balanced first.
  const kids = children == null ? 0 : children;
  const validSplits = [];
  for (let a1 = 1; a1 < adults; a1++) {
    for (let c1 = 0; c1 <= kids; c1++) {
      const a2 = adults - a1, c2 = kids - c1;
      if (a2 < 1) continue;
      if (a1 + c1 > 6 || a2 + c2 > 6) continue;
      if (a1 < Math.ceil(c1 / 3) || a2 < Math.ceil(c2 / 3)) continue;
      validSplits.push({ a1, c1, a2, c2 });
    }
  }
  validSplits.sort(
    (x, y) => Math.abs(x.a1 + x.c1 - (x.a2 + x.c2)) - Math.abs(y.a1 + y.c1 - (y.a2 + y.c2))
  );
  return validSplits;
}

async function fetchPartialWindows(arrival, departure) {
  // Both-booked fallback — same /api/calendar mechanism as v1 (chat.js 2792+).
  try {
    const calRes = await fetch(
      `https://destin-concierge-new.vercel.app/api/calendar?arrival=${arrival}&departure=${departure}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!calRes.ok) return null;
    return await calRes.json();
  } catch {
    return null;
  }
}

async function fetchPriceDrop(arrival, departure) {
  try {
    const res = await fetch(
      `https://destin-concierge-new.vercel.app/api/price-drops?arrival=${arrival}&departure=${departure}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.drops?.length) return null;
    // Best drop, same pick rule as v1 (largest pct)
    return data.drops.sort((a, b) => (b.pct || 0) - (a.pct || 0))[0];
  } catch {
    return null;
  }
}

// Core availability pipeline shared by check_availability and the fast path.
export async function runAvailabilityPipeline(args, turn) {
  const sanity = sanityCheckDates(args, turn.todayIso);
  if (sanity.status !== "ok") return sanity;
  const { arrival, departure, rolled } = sanity;

  const v = validateCounts(args.adults, args.children);
  if (!v.ok) return { status: "invalid_counts", detail: v.reason };
  const adults = v.adults, children = v.children;

  // State cross-check: explicitly-stated state wins over silent contradiction.
  const sb = turn.state.booking;
  if (sb.adults != null && adults !== sb.adults && !turn.guestRestatedCounts) {
    return {
      status: "state_conflict",
      detail: `Guest previously stated ${sb.adults} adults${sb.children != null ? ` and ${sb.children} children` : ""}. Use those values or ask the guest to confirm the change.`,
      state: { adults: sb.adults, children: sb.children },
    };
  }

  const occ = occupancyRuling(adults, children);
  const nights = Math.round((new Date(departure) - new Date(arrival)) / 86400000);
  const base = {
    query: { arrival, departure, adults, children, nights, datesRolledForwardToNextYear: rolled || undefined },
    gates: { maxPerUnit: OCCUPANCY.maxPerUnit, requiredAdults: occ.requiredAdults ?? null },
    availabilityFallbackUrl: AVAILABILITY_PAGE,
    checkedAt: new Date().toISOString(),
  };
  registerUrl(turn, AVAILABILITY_PAGE, "fallback");

  if (occ.status === "occupancy_exceeded")
    return { ...base, status: "occupancy_exceeded", detail: `${occ.total} guests exceeds the ${OCCUPANCY.maxBothUnits}-guest maximum across both units.` };
  if (occ.status === "hoa_violation")
    return { ...base, status: "hoa_violation", detail: `HOA requires at least 1 adult per 3 children — ${children} children need ${occ.requiredAdults} adults.` };
  if (occ.status === "hoa_uncertain")
    return { ...base, status: "hoa_uncertain", detail: "1 adult + 4 children needs HOA confirmation — ask if another adult is joining." };

  if (occ.status === "two_condo_option") {
    const [avail707, avail1006] = await Promise.all([
      checkAvailability(UNIT_707_PROPERTY_ID, arrival, departure),
      checkAvailability(UNIT_1006_PROPERTY_ID, arrival, departure),
    ]);
    const splits = enumerateSplits(adults, children);
    if (!splits.length)
      // e.g. 1 adult + 5 children: two condos are required, but each unit needs
      // at least 1 adult (and 1 adult per 3 children), so no valid split exists
      // without another adult. Tell the guest both facts — don't silently reject.
      return {
        ...base,
        status: "two_condo_option",
        twoCondo: null,
        needsSecondAdult: true,
        detail: `${occ.total} guests requires two condos, and a valid split needs at least one adult per unit (HOA: 1 adult per 3 children). Ask if another adult can join.`,
      };
    const s = splits[0];
    const url707 = buildLink("707", arrival, departure, s.a1, s.c1);
    const url1006 = buildLink("1006", arrival, departure, s.a2, s.c2);
    registerUrl(turn, url707, "booking");
    registerUrl(turn, url1006, "booking");
    return {
      ...base,
      status: "two_condo_option",
      bothUnitsAvailable: avail707 === true && avail1006 === true,
      units: [
        { unit: "707", available: avail707, bookingUrl: avail707 ? url707 : null },
        { unit: "1006", available: avail1006, bookingUrl: avail1006 ? url1006 : null },
      ],
      twoCondo: {
        suggestedSplit: {
          unit707: { adults: s.a1, children: s.c1, url: url707 },
          unit1006: { adults: s.a2, children: s.c2, url: url1006 },
        },
        altSplits: splits.slice(1, 4).map((x) => `${x.a1}A+${x.c1}K in 707 / ${x.a2}A+${x.c2}K in 1006`),
      },
    };
  }

  // Normal single-unit path: both units checked in parallel.
  const [avail707, avail1006] = await Promise.all([
    checkAvailability(UNIT_707_PROPERTY_ID, arrival, departure),
    checkAvailability(UNIT_1006_PROPERTY_ID, arrival, departure),
  ]);

  const kids = children == null ? 0 : children;
  const mkUrl = (unit) => buildLink(unit, arrival, departure, adults, kids);
  const units = [
    { unit: "707", available: avail707, bookingUrl: null },
    { unit: "1006", available: avail1006, bookingUrl: null },
  ];
  for (const u of units) {
    if (u.available === true || u.available === null) {
      u.bookingUrl = mkUrl(u.unit);
      if (u.available === null) u.unverified = true; // OwnerRez check failed — honest fallback (v1 behavior)
      registerUrl(turn, u.bookingUrl, "booking");
    }
  }

  const result = {
    ...base,
    status: avail707 === null && avail1006 === null ? "check_failed" : "ok",
    units,
    discounts: DISCOUNTS, // verified numbers the composer may state
  };

  // Both definitively booked → partial windows + alternatives (v1 2792-2916).
  if (avail707 === false && avail1006 === false) {
    const cal = await fetchPartialWindows(arrival, departure);
    if (cal?.partialWindows?.length) {
      result.alternatives = { partialWindows: [] };
      for (const w of cal.partialWindows.slice(0, 4)) {
        const url = buildLink(w.unit, w.from, w.to, adults, kids);
        registerUrl(turn, url, "booking");
        result.alternatives.partialWindows.push({ ...w, url });
      }
      if (cal.combinedStay) result.alternatives.combinedStay = cal.combinedStay;
      if (cal.earlierArrival) {
        const ea = cal.earlierArrival;
        const url = buildLink(ea.unit, ea.arrival, departure, adults, kids);
        registerUrl(turn, url, "booking");
        result.alternatives.earlierArrival = { ...ea, url };
      }
    }
  }

  const drop = await fetchPriceDrop(arrival, departure);
  if (drop) result.priceDrop = drop;

  // Persist to state — validated values only.
  mergeBooking(turn.state, { arrival, departure, adults, children });
  turn.state.verified.availabilityCheckedAt = result.checkedAt;
  turn.state.verified.linksSentFor = { arrival, departure, adults, children: kids };
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Executors
// ─────────────────────────────────────────────────────────────────────────────

export async function executeTool(name, args, turn) {
  switch (name) {
    case "note_party_details": {
      const v = validateCounts(args.adults ?? null, args.children ?? null);
      if (!v.ok) return { status: "rejected", reason: v.reason };
      const kids = v.children == null ? 0 : v.children;
      if (v.adults != null && v.adults + kids > OCCUPANCY.maxBothUnits)
        return { status: "rejected", reason: "exceeds_max_occupancy", max: OCCUPANCY.maxBothUnits };
      const changed = mergeBooking(turn.state, {
        adults: v.adults, children: v.children,
        bedroomsRequested: args.bedroomsRequested ?? null,
        preferredUnit: args.preferredUnit ?? null,
      });
      const over6 = v.adults != null && v.adults + kids > OCCUPANCY.maxPerUnit;
      return {
        status: "ok", changed, state: turn.state.booking,
        occupancyNote: over6 ? `Party exceeds the ${OCCUPANCY.maxPerUnit}-guest per-unit maximum — two-condo split will be required.` : null,
        bedroomNote: (args.bedroomsRequested ?? 0) >= 2 ? "Both units are 1-bedroom (king bed + hallway bunks + queen sofa bed, sleeps 6). Tell the guest clearly before offering links." : null,
      };
    }

    case "check_availability":
      return runAvailabilityPipeline(args, turn);

    case "send_standard_booking_reply": {
      // Downgrade rule 1 lives in the handler (same-turn tool check).
      const result = await runAvailabilityPipeline(args, turn);
      const clean = result.status === "ok" && result.units?.some((u) => u.available === true);
      const cleanBothBooked = result.status === "ok" && result.units?.every((u) => u.available === false);
      if (!clean && !cleanBothBooked) {
        return { status: "downgraded", reason: `Result status '${result.status}' needs conversational handling — compose the reply yourself.`, availability: result };
      }
      return { status: "fast_path_ok", availability: result };
    }

    case "find_open_windows": {
      const hasMonth = !!args.month;
      const hasFlex = args.targetArrival && args.targetDeparture && args.flexibilityDays;
      if (!hasMonth && !hasFlex)
        return { status: "invalid", detail: "Provide month (YYYY-MM) or targetArrival+targetDeparture+flexibilityDays." };

      // 2 OwnerRez calls total — each property's bookings fetched once,
      // all windows evaluated locally (replaces v1's 20-call month probe).
      const [b707, b1006] = await Promise.all([
        fetchPropertyBookings(UNIT_707_PROPERTY_ID),
        fetchPropertyBookings(UNIT_1006_PROPERTY_ID),
      ]);
      if (b707 === null && b1006 === null)
        return { status: "check_failed", availabilityFallbackUrl: AVAILABILITY_PAGE };
      registerUrl(turn, AVAILABILITY_PAGE, "fallback");

      const adults = turn.state.booking.adults ?? 2;
      const children = turn.state.booking.children ?? 0;
      const assumedCounts = turn.state.booking.adults == null;

      let windows = [];
      if (hasMonth) {
        const [y, m] = args.month.split("-").map(Number);
        const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
        let startDay = 1, endDay = daysInMonth;
        if (args.monthPart === "early") endDay = 10;
        else if (args.monthPart === "mid") { startDay = 11; endDay = 20; }
        else if (args.monthPart === "late") startDay = 21;
        // Same probe semantics as v1: 3-night windows stepped through the range.
        for (let d = startDay; d + 3 <= endDay + 1; d += 3) {
          const from = `${args.month}-${String(d).padStart(2, "0")}`;
          const toD = Math.min(d + 3, daysInMonth);
          const to = `${args.month}-${String(toD).padStart(2, "0")}`;
          if (from < turn.todayIso) continue;
          windows.push({ from, to });
        }
      } else {
        const flex = args.flexibilityDays;
        const shiftIso = (d, n) => {
          const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n);
          return x.toISOString().slice(0, 10);
        };
        for (let off = -flex; off <= flex; off++) {
          const from = shiftIso(args.targetArrival, off);
          const to = shiftIso(args.targetDeparture, off);
          if (from < turn.todayIso) continue;
          windows.push({ from, to, offsetDays: off });
        }
      }

      const evaluated = windows.map((w) => {
        const free707 = b707 ? isRangeFree(b707, w.from, w.to) : null;
        const free1006 = b1006 ? isRangeFree(b1006, w.from, w.to) : null;
        return { ...w, free707, free1006 };
      });
      const open = evaluated.filter((w) => w.free707 || w.free1006);
      const pct = (arr, k) => arr.length ? Math.round((arr.filter((w) => w[k]).length / arr.length) * 100) : 0;

      // Spread picks: first, middle, last open windows (v1's 3-spread rule).
      const picks = open.length <= 3 ? open
        : [open[0], open[Math.floor(open.length / 2)], open[open.length - 1]];
      const openWindows = picks.map((w) => {
        const units = [];
        for (const [unit, free] of [["707", w.free707], ["1006", w.free1006]]) {
          if (free) {
            const url = buildLink(unit, w.from, w.to, adults, children);
            registerUrl(turn, url, "booking");
            units.push({ unit, url });
          }
        }
        return { from: w.from, to: w.to, offsetDays: w.offsetDays, units };
      });

      return {
        status: "ok",
        scope: hasMonth ? { month: args.month, monthPart: args.monthPart ?? null } : { targetArrival: args.targetArrival, targetDeparture: args.targetDeparture, flexibilityDays: args.flexibilityDays },
        summary: {
          band: open.length === 0 ? "FULLY_BOOKED" : open.length === evaluated.length ? "WIDE_OPEN" : "SOME_OPENINGS",
          pct707: pct(evaluated, "free707"),
          pct1006: pct(evaluated, "free1006"),
          windowsChecked: evaluated.length,
        },
        openWindows,
        assumedCounts,
        countsUsed: { adults, children },
        availabilityFallbackUrl: AVAILABILITY_PAGE,
        checkedAt: new Date().toISOString(),
      };
    }

    case "get_existing_booking": {
      const bid = turn.state.verifiedBookingId;
      if (!bid) return { status: "no_verified_booking", detail: "No server-verified booking in this session. Ask the guest to open chat from their booking link, or offer Ozan's contact." };
      const booking = await fetchGuestBooking(bid); // server-side re-verify every time
      if (!booking) return { status: "lookup_failed" };
      const out = { status: "ok", booking: { ...booking } };
      // Door code release window is enforced inside fetchGuestBooking (v1 rules).
      if (args.purpose !== "door_code" && args.purpose !== "stay_details") delete out.booking.doorCode;
      if (out.booking.doorCode) turn.doorCodeReleased = String(out.booking.doorCode);

      if (args.purpose === "extension") {
        const nights = args.extensionNights || 1;
        const extFrom = booking.departure;
        const d = new Date(extFrom + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + nights);
        const extTo = d.toISOString().slice(0, 10);
        const pid = booking.unit === "707" ? UNIT_707_PROPERTY_ID : UNIT_1006_PROPERTY_ID;
        const avail = await checkAvailability(pid, extFrom, extTo);
        const url = avail ? buildLink(booking.unit, extFrom, extTo, booking.adults || 2, booking.children || 0) : null;
        if (url) registerUrl(turn, url, "booking");
        out.extension = { from: extFrom, to: extTo, available: avail, bookingUrl: url };
      }
      if (args.purpose === "other_unit") {
        const other = booking.unit === "707" ? "1006" : "707";
        const pid = other === "707" ? UNIT_707_PROPERTY_ID : UNIT_1006_PROPERTY_ID;
        const avail = await checkAvailability(pid, booking.arrival, booking.departure);
        const url = avail ? buildLink(other, booking.arrival, booking.departure, booking.adults || 2, booking.children || 0) : null;
        if (url) registerUrl(turn, url, "booking");
        out.otherUnit = { unit: other, available: avail, bookingUrl: url };
      }
      turn.state.mode = "existing_guest";
      return out;
    }

    case "build_flight_search": {
      const b = turn.state.booking;
      if (!b.arrival || !b.departure || b.adults == null)
        return { status: "missing_trip_details", detail: "Need trip dates and adult count before building a flight link." };
      let iata = extractOrigin(String(args.originText || ""));
      if (!iata && turn.state.flight.originIata) iata = turn.state.flight.originIata;
      if (!iata) return { status: "unresolved_origin", url: null, detail: "Could not resolve an origin city/airport from the guest's words. Ask them to confirm the city. Do NOT guess. No link exists." };
      const dest = args.destination || "VPS";
      const url = buildFlightLink(iata, b.arrival, b.departure, b.adults, b.children ?? 0, 0, dest);
      registerUrl(turn, url, "flight");
      turn.state.flight.originIata = iata;
      turn.state.flight.destinationIata = dest;
      const isMulti = Object.prototype.hasOwnProperty.call(MULTI_AIRPORT_MAIN, iata);
      return {
        status: "ok",
        origin: { iata, isMultiAirport: isMulti, mainAirportLabel: isMulti ? MULTI_AIRPORT_MAIN[iata] : null },
        destination: { iata: dest },
        passengers: { adults: b.adults, children: b.children ?? 0 },
        url,
        composeRule: isMulti
          ? "State which airport you used and that they can switch airports on the search page. Never ask which airport."
          : "Confirm the origin in one short sentence.",
      };
    }

    case "get_destin_weather": {
      if (args.focus === "water_conditions") {
        const links = {
          liveConditions: "https://destinweather.destincondogetaways.com",
          beachCam: "https://beachcam.destincondogetaways.com",
        };
        Object.values(links).forEach((u) => registerUrl(turn, u, "blog"));
        return { status: "ok", useLinksNotNumbers: true, links };
      }
      if (args.focus === "seasonal") {
        return {
          status: "ok",
          seasonal: {
            spring: { highF: [68, 77, 84], gulfF: [66, 72, 78], note: "Mar-May; May feels like early summer" },
            summer: { highF: [88, 90, 90], gulfF: [82, 86, 86], note: "Jun-Aug; brief afternoon storms common" },
            fall: { highF: [86, 79, 71], gulfF: [84, 78, 70], note: "Sep-Nov; Sept still swimmable" },
            winter: { highF: [63, 61, 63], gulfF: [64, 58, 58], note: "Dec-Feb; mild, not swim season" },
          },
        };
      }
      const forecast = await fetchDestinWeather();
      if (!forecast) return { status: "unavailable", detail: "Live forecast unavailable — say so honestly; offer seasonal averages instead." };
      return { status: "ok", forecast, fetchedAt: new Date().toISOString() };
    }

    case "get_local_guide": {
      if (args.topic === "photos") {
        const links = {
          virtualTour: "https://www.destincondogetaways.com/virtual-tour",
          unit707: "https://www.destincondogetaways.com/pelican-707",
          unit1006: "https://www.destincondogetaways.com/pelican-1006",
          reviews: "https://www.destincondogetaways.com/reviews",
        };
        Object.values(links).forEach((u) => registerUrl(turn, u, "blog"));
        return { status: "ok", topic: "photos", links };
      }
      const blog = await fetchBlogContent(args.topic);
      if (!blog) return { status: "unavailable", topic: args.topic, detail: "Could not fetch content — answer honestly without inventing specifics; do not state event dates from memory." };
      registerUrl(turn, blog.url, "blog");
      return { status: "ok", topic: args.topic, content: blog.content, url: blog.url };
    }

    case "get_activity_options": {
      const category = args.category && TRIPSHOCK_CATEGORIES[args.category] ? args.category : (args.category ? detectTripShockCategory(args.category) : null);
      // Date fallback cascade (v1 2941-2967): explicit args → state dates.
      let dates = null;
      if (args.dateFrom && args.dateTo) dates = { arrival: args.dateFrom, departure: args.dateTo };
      else if (turn.state.booking.arrival && turn.state.booking.departure)
        dates = { arrival: turn.state.booking.arrival, departure: turn.state.booking.departure };
      const url = buildTripShockLink(category, dates);
      registerUrl(turn, url, "activity");
      return { status: "ok", category: category || "general", url, datesApplied: dates, composeRules: ["One TripShock link per reply.", "Never say 'affiliate'.", "Never quote activity prices."] };
    }

    case "create_maintenance_alert": {
      // UNION, NEVER VETO: the regex backstop may have fired pre-loop; the model
      // may fire here. Neither suppresses the other. Dedup only against issues
      // already open this session.
      const summary = String(args.summary || "").slice(0, 120);
      const norm = summary.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      const dup = turn.state.openIssues.some(
        (i) => i.status !== "resolved" && i.description.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim() === norm
      );
      if (turn.backstopAlertFired)
        return { sent: true, via: "backstop", detail: "Alert already fired automatically this turn.", openIssues: turn.state.openIssues };
      if (dup)
        return { sent: false, reason: "duplicate", detail: "This issue is already open and Ozan has been alerted.", openIssues: turn.state.openIssues };
      // Model classifications the code declines to auto-fire (v1 rules) — but
      // only for plain maintenance severity; lockout/emergency always eligible.
      if (args.severity === "maintenance" && (detectAccidentalDamage(turn.lastUser || "") || detectExternalDisturbance(turn.lastUser || ""))) {
        // The guest broke something themselves / external noise: v1 does not alert.
        // The model can still escalate by choosing severity emergency if genuine.
        return { sent: false, reason: "not_alertable", detail: "Accidental guest damage and external disturbances are handled conversationally, not alerted (v1 policy). Reassure the guest; offer Ozan's contact for damage." };
      }
      const alertType = args.severity === "maintenance" ? "maintenance" : "emergency";
      turn.state.openIssues.push({ type: args.severity, description: summary, status: "open" });
      const ok = await sendEmergencyDiscord(
        turn.lastUser || summary, turn.sessionId,
        args.severity === "lockout" ? "Guest locked out" : args.severity === "emergency" ? "EMERGENCY reported by guest" : "Maintenance issue reported",
        alertType,
        turn.state.openIssues
      );
      if (ok) turn.alertsFiredThisTurn.push(args.severity);
      return { sent: !!ok, via: ok ? "model" : null, reason: ok ? null : "discord_failed", openIssues: turn.state.openIssues };
    }

    case "notify_owner": {
      if (args.kind === "special_occasion") {
        if (turn.state.specialOccasionAlerted) return { sent: false, reason: "already_alerted" };
        if (!turn.state.verifiedBookingId) return { sent: false, reason: "no_verified_stay" };
        const ok = await sendEmergencyDiscord(args.content || turn.lastUser || "Special occasion mentioned", turn.sessionId, "🎉 Special occasion during stay", "emergency", []);
        if (ok) turn.state.specialOccasionAlerted = true;
        return { sent: !!ok, silent: true, detail: "Do not tell the guest an alert was sent — acknowledge the occasion warmly." };
      }
      if (args.kind === "relay" && !args.content) {
        turn.state.pendingRelay = true;
        return { sent: false, reason: "awaiting_content", detail: "Ask the guest what they'd like passed along." };
      }
      const clean = String(args.content || "").replace(/\b(fuck|shit|bitch|asshole)\w*\b/gi, "***").slice(0, 400);
      const reasonMap = { relay: "💬 Guest message relay", urgent_contact: "📞 Guest requests urgent contact", resend: "🔁 Guest asked to resend/repeat alert" };
      const ok = await sendEmergencyDiscord(clean || turn.lastUser || "", turn.sessionId, reasonMap[args.kind] || "Guest message", "emergency", turn.state.openIssues);
      if (ok) { turn.state.pendingRelay = false; turn.alertsFiredThisTurn.push(args.kind); }
      return { sent: !!ok, reason: ok ? null : "discord_failed" };
    }

    case "capture_lead": {
      const email = String(args.email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
        return { stored: false, revealCode: null, revealText: null, reason: "invalid_email" };
      if (turn.state.emailCaptured && turn.state.blueUnlocked)
        return { stored: true, revealCode: "BLUE", revealText: "Your extra 5% code is BLUE — combined with the automatic 10% direct discount, that's 15% total off.", reason: "already_captured" };
      const ok = await addBrevoContact(email, args.firstName || "");
      if (!ok) return { stored: false, revealCode: null, revealText: null, reason: "brevo_failed" };
      turn.state.emailCaptured = true;
      turn.state.blueUnlocked = true;
      turn.blueAuthorized = true; // Stage 4 gate: BLUE may appear this turn only when true
      return {
        stored: true,
        revealCode: "BLUE",
        revealText: "Your extra 5% code is BLUE — combined with the automatic 10% direct discount, that's 15% total off.",
      };
    }

    default:
      return { status: "unknown_tool", name };
  }
}

export const CONSEQUENTIAL_TOOLS = new Set(["create_maintenance_alert", "notify_owner", "capture_lead"]);
