import {
  CAR_RENTAL_URLS,
  LOCAL_GUIDE_TOPICS,
  MAX_OCCUPANCY,
  MULTI_AIRPORT_MAIN,
  OWNER_CONTACT,
  STATIC_URLS,
  TRIPSHOCK_CATEGORIES,
  UNITS,
  addIsoDays,
  applyStatePatch,
  buildBookingLink,
  buildFlightLink,
  buildTripShockLink,
  collectAllowedUrls,
  createDefaultState,
  detectAccidentalDamage,
  detectBedroomMismatch,
  detectEscalation,
  detectExternalDisturbance,
  detectLockedOut,
  detectMaintenance,
  detectOwnerChatRequest,
  detectPets,
  detectScamCrisis,
  diffNights,
  extractDates,
  extractEmail,
  extractIssueDescription,
  extractOrigin,
  extractSingleDate,
  findValidTwoUnitSplits,
  isIsoDate,
  isValidEmail,
  normalizeNullableInteger,
  normalizeState,
  parseDateText,
  safeFallback,
  todayIso,
  validateDateRange,
  validateParty,
  validateReply,
} from "./business.js";
import { ACK_MESSAGES } from "./services.js";
import { buildAgentInstructions, buildCorrectionInstructions } from "./agent-prompt.js";
import { KNOWLEDGE_TOPICS, searchBusinessKnowledge } from "./knowledge-retrieval.js";

const nullableString = { type: ["string", "null"] };
const nullableInteger = { type: ["integer", "null"] };

export const TOOL_DEFINITIONS = Object.freeze([
  {
    type: "function",
    function: {
      name: "remember_booking_details",
      description: "Store explicit booking details from the current guest message without checking availability. Use when some, but not all, dates/party details are known.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          date_text: { ...nullableString, description: "Exact verbatim date wording from the latest guest message, or null when reusing existing state." },
          date_role: { type: ["string", "null"], enum: ["range", "arrival", "departure", null] },
          arrival: { ...nullableString, description: "Literal ISO date only if the guest wrote it exactly; otherwise null." },
          departure: { ...nullableString, description: "Literal ISO date only if the guest wrote it exactly; otherwise null." },
          adults: nullableInteger,
          adults_evidence: { ...nullableString, description: "One contiguous verbatim quote from the latest message supporting the adult count." },
          children: nullableInteger,
          children_evidence: { ...nullableString, description: "One contiguous verbatim quote from the latest message. Required for 0 as well." },
          total_guests: nullableInteger,
          total_guests_evidence: { ...nullableString, description: "Verbatim quote such as '10 people' when only total party size is known." },
          preferred_unit: { type: ["string", "null"], enum: ["707", "1006", null] },
          bedrooms_requested: nullableInteger,
          bedrooms_evidence: nullableString,
        },
        required: ["date_text", "date_role", "arrival", "departure", "adults", "adults_evidence", "children", "children_evidence", "total_guests", "total_guests_evidence", "preferred_unit", "bedrooms_requested", "bedrooms_evidence"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check live OwnerRez availability for both condos after check-in, check-out, adults, and children are known. Returns structured availability and code-built booking links only for confirmed available units.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          date_text: nullableString,
          arrival: nullableString,
          departure: nullableString,
          adults: nullableInteger,
          adults_evidence: nullableString,
          children: nullableInteger,
          children_evidence: nullableString,
          total_guests: nullableInteger,
          total_guests_evidence: nullableString,
          preferred_unit: { type: ["string", "null"], enum: ["707", "1006", null] },
          bedrooms_requested: nullableInteger,
          bedrooms_evidence: nullableString,
        },
        required: ["date_text", "arrival", "departure", "adults", "adults_evidence", "children", "children_evidence", "total_guests", "total_guests_evidence", "preferred_unit", "bedrooms_requested", "bedrooms_evidence"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_open_windows",
      description: "Find nearby alternative date windows using live OwnerRez data when requested dates are unavailable or the guest asks for flexible options.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          target_date_text: nullableString,
          target_arrival: nullableString,
          target_departure: nullableString,
          flexibility_days: { type: "integer", minimum: 0, maximum: 30 },
          adults: nullableInteger,
          adults_evidence: nullableString,
          children: nullableInteger,
          children_evidence: nullableString,
          total_guests: nullableInteger,
          total_guests_evidence: nullableString,
        },
        required: ["target_date_text", "target_arrival", "target_departure", "flexibility_days", "adults", "adults_evidence", "children", "children_evidence", "total_guests", "total_guests_evidence"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_existing_booking",
      description: "Retrieve the currently authorized guest booking from the signed/legacy booking link supplied to the server. Takes no guest-controlled booking identifier.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "build_booking_links",
      description: "Return previously verified booking links again. Use only when the guest asks to resend links. The tool refuses stale or unverified availability.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "build_flight_search",
      description: "Build one complete Aviasales affiliate flight-search URL. Accept flight dates separately from lodging dates, preserve the guest's full round-trip range, and never claim live fare or seat availability.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          origin_text: { ...nullableString, description: "Exact guest city or IATA wording, such as Chicago or ORD, or null when reusing saved flight state." },
          destination_iata: { type: ["string", "null"], enum: ["VPS", "PNS", "ECP", null] },
          date_text: { ...nullableString, description: "Exact natural-language flight date wording from the conversation, or null." },
          departure_date: { ...nullableString, description: "Normalized outbound ISO date (YYYY-MM-DD), or null." },
          return_date: { ...nullableString, description: "Normalized return ISO date (YYYY-MM-DD), or null." },
          adults: nullableInteger,
          adults_evidence: { ...nullableString, description: "Verbatim evidence from the latest guest message when a new adult count is supplied, otherwise null." },
          children: nullableInteger,
          children_evidence: { ...nullableString, description: "Verbatim evidence from the latest guest message when a new child count is supplied, including zero, otherwise null." },
          infants: { type: ["integer", "null"], minimum: 0, maximum: 12 },
        },
        required: ["origin_text", "destination_iata", "date_text", "departure_date", "return_date", "adults", "adults_evidence", "children", "children_evidence", "infants"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_destin_weather",
      description: "Fetch the verified seven-day Destin weather forecast. Use for forecast, rain, air-temperature, and packing questions.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_local_guide",
      description: "Fetch a verified Destin local-guide page or code-owned photo/itinerary links. Use for event dates, restaurants, beaches, airports, activities, nightlife, car rental, spas, family ideas, and local information.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { topic: { type: "string", enum: LOCAL_GUIDE_TOPICS } },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity_options",
      description: "Build one complete TripShock affiliate link for a validated activity category. This is a link builder, not a live TripShock inventory search. When the guest supplied dates, preserve the full range and pass normalized ISO start_date and end_date.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string", enum: Object.keys(TRIPSHOCK_CATEGORIES) },
          date_text: { ...nullableString, description: "Exact natural-language activity date wording from the conversation, or null when no dates were supplied." },
          start_date: { ...nullableString, description: "Normalized ISO activity start date (YYYY-MM-DD), or null when no dates were supplied." },
          end_date: { ...nullableString, description: "Normalized ISO activity end date (YYYY-MM-DD), preserving the guest's complete requested range, or null when no dates were supplied." },
          arrival: { ...nullableString, description: "Legacy alias for start_date." },
          departure: { ...nullableString, description: "Legacy alias for end_date." },
        },
        required: ["category", "date_text", "start_date", "end_date", "arrival", "departure"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_maintenance_alert",
      description: "Propose a maintenance or emergency alert. Code validates the latest message, suppresses accidental damage/external disturbances, deduplicates issues, and decides whether Discord is called.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: { type: "string", enum: ["maintenance", "emergency"] },
          summary: { type: "string", minLength: 3, maxLength: 120 },
        },
        required: ["severity", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "capture_lead",
      description: "Capture a valid email in Brevo for an eligible popup/banner/page flow. The email must appear verbatim in the latest guest message.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          email: { type: "string" },
          first_name: nullableString,
        },
        required: ["email", "first_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_unit_facts",
      description: "Return code-owned facts about Unit 707, Unit 1006, the main building versus The Terrace, bedrooms, laundry, amenities, resort facilities, occupancy, or policies.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          topics: {
            type: "array",
            minItems: 1,
            maxItems: 10,
            items: { type: "string", enum: ["units", "terrace", "bedrooms", "laundry", "amenities", "resort", "occupancy", "pets", "smoking", "parking", "beach_chairs", "wifi", "checkin", "comparison"] },
          },
        },
        required: ["topics"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "relay_owner_message",
      description: "Send a guest-requested message or direct ping to Ozan through Discord. Code verifies that the latest guest message explicitly asks to contact, alert, tell, or message Ozan. If no actual message content was supplied, it records a pending relay and asks for the message.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          message_summary: { type: ["string", "null"], description: "Short summary of the message to relay, or null when the guest has not supplied the content yet." },
        },
        required: ["message_summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_owner_chat",
      description: "Invite Ozan into the live chat when the guest explicitly asks for Ozan, the owner, a human, or a real person.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_business_knowledge",
      description: "Retrieve verified business facts and policies copied from the production v1 knowledge base. Use for property, resort, check-in, appliances, policies, owner background, booking/payment, contacts, cable TV, local tips, blogs, seasonal weather, child safety, and maintenance guidance. Pass a concise semantic query and optional topic filters.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", minLength: 2, maxLength: 300 },
          topics: { type: "array", maxItems: 6, items: { type: "string", enum: KNOWLEDGE_TOPICS } },
          limit: { type: "integer", minimum: 1, maximum: 12 },
        },
        required: ["query", "topics", "limit"],
      },
    },
  },
]);

function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label || "operation"}_timeout`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function normalizeEvidence(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceAppears(evidence, latestUser) {
  const e = normalizeEvidence(evidence);
  const m = normalizeEvidence(latestUser);
  return e.length > 0 && m.includes(e);
}

function exactTextAppears(fragment, latestUser) {
  if (!fragment) return false;
  return normalizeEvidence(latestUser).includes(normalizeEvidence(fragment));
}

function userConversationTexts(messages, latestUser) {
  const texts = (Array.isArray(messages) ? messages : [])
    .filter(message => message?.role === "user")
    .map(message => String(message.content || ""))
    .filter(Boolean);
  if (latestUser && !texts.includes(String(latestUser))) texts.push(String(latestUser));
  return texts;
}

// Normalize a mixed numeric range such as "7/26 -7-31" into the standard
// "7/26-7/31" form understood by the shared deterministic date parser.
// This is date normalization only; it does not classify conversational intent.
function normalizeActivityDateText(value) {
  return String(value || "")
    .replace(/(\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})-(\d{1,2})(?!\d)/g, "$1/$2-$3/$4")
    .trim();
}

function sameDateRange(left, right) {
  return Boolean(left && right && left.arrival === right.arrival && left.departure === right.departure);
}

function latestConversationDateRange(messages, latestUser, now) {
  const texts = userConversationTexts(messages, latestUser);
  for (let index = texts.length - 1; index >= 0; index -= 1) {
    const normalized = normalizeActivityDateText(texts[index]);
    const range = extractDates(normalized, now);
    if (range) return range;
    const single = extractSingleDate(normalized, now);
    if (single) return { arrival: single, departure: addIsoDays(single, 1) };
  }
  return null;
}

function resolveActivityDates(args, context) {
  const { state, messages, latestUser, now } = context;
  const persisted = state?.verified?.activityQuery;
  const persistedRange = isIsoDate(persisted?.arrival) && isIsoDate(persisted?.departure)
    ? { arrival: persisted.arrival, departure: persisted.departure }
    : null;

  const conversationRange = latestConversationDateRange(messages, latestUser, now);
  const dateText = normalizeActivityDateText(args.date_text);
  let textRange = null;
  if (dateText) {
    // Ground date_text in any user turn, not just the latest follow-up message.
    const appears = userConversationTexts(messages, latestUser)
      .some(text => normalizeEvidence(text).includes(normalizeEvidence(args.date_text)));
    if (appears) {
      textRange = extractDates(dateText, now);
      if (!textRange) {
        const single = extractSingleDate(dateText, now);
        if (single) textRange = { arrival: single, departure: addIsoDays(single, 1) };
      }
    }
  }

  const rawStart = args.start_date || args.arrival || null;
  const rawEnd = args.end_date || args.departure || null;
  let structuredRange = isIsoDate(rawStart) && isIsoDate(rawEnd)
    ? { arrival: rawStart, departure: rawEnd }
    : null;
  if (structuredRange && structuredRange.arrival === structuredRange.departure) {
    structuredRange = { arrival: structuredRange.arrival, departure: addIsoDays(structuredRange.departure, 1) };
  }

  // Structured dates are accepted only when grounded by the conversation or
  // by the previously verified activity range. This blocks invented dates.
  if (structuredRange && (
    sameDateRange(structuredRange, textRange)
    || sameDateRange(structuredRange, conversationRange)
    || sameDateRange(structuredRange, persistedRange)
  )) return structuredRange;

  return textRange || conversationRange || persistedRange
    || (state.booking?.arrival && state.booking?.departure
      ? { arrival: state.booking.arrival, departure: state.booking.departure }
      : null);
}

function resolveFlightDates(args, context) {
  const { state, messages, latestUser, now } = context;
  const persistedRange = isIsoDate(state?.flight?.departureDate) && isIsoDate(state?.flight?.returnDate)
    ? { arrival: state.flight.departureDate, departure: state.flight.returnDate }
    : null;
  const bookingRange = isIsoDate(state?.booking?.arrival) && isIsoDate(state?.booking?.departure)
    ? { arrival: state.booking.arrival, departure: state.booking.departure }
    : null;
  const conversationRange = latestConversationDateRange(messages, latestUser, now);
  const dateText = normalizeActivityDateText(args.date_text);
  let textRange = null;
  if (dateText) {
    const appears = userConversationTexts(messages, latestUser)
      .some(text => normalizeEvidence(text).includes(normalizeEvidence(args.date_text)));
    if (appears) textRange = extractDates(dateText, now);
  }

  const rawDeparture = args.departure_date || null;
  const rawReturn = args.return_date || null;
  const structuredRange = isIsoDate(rawDeparture) && isIsoDate(rawReturn)
    ? { arrival: rawDeparture, departure: rawReturn }
    : null;
  if (structuredRange && (
    sameDateRange(structuredRange, textRange)
    || sameDateRange(structuredRange, conversationRange)
    || sameDateRange(structuredRange, persistedRange)
    || sameDateRange(structuredRange, bookingRange)
  )) return { dates: structuredRange, source: "structured_guest_dates" };

  if (textRange) return { dates: textRange, source: "guest_date_text" };
  if (conversationRange) return { dates: conversationRange, source: "conversation_history" };
  if (persistedRange) return { dates: persistedRange, source: state.flight.dateSource || "saved_flight_state" };
  if (bookingRange) return { dates: bookingRange, source: "saved_stay_dates" };
  return { dates: null, source: null };
}

function scopeIsUsable(evidence, latestUser) {
  const message = String(latestUser || "").toLowerCase();
  const needle = String(evidence || "").toLowerCase();
  const index = message.indexOf(needle);
  const context = index >= 0 ? message.slice(Math.max(0, index - 90), index + needle.length + 90) : message;
  if (/last time|previous (?:trip|stay)|there were|used to|years? ago|before we/i.test(context)) return false;
  if (/isn'?t coming|is not coming|not coming|won'?t come|will not come|she isn'?t|he isn'?t|they aren'?t/i.test(context)) return false;
  if (/what if|hypothetical|would .* cost|could .* stay|if .* came/i.test(context)) return false;
  if (/sleep(?:s)?|fit|capacity|big enough|maximum|max guests?/i.test(context)) return false;
  if (/ages? (?:are|is)|years? old|yr[- ]?old/i.test(context)) return false;
  return true;
}

function acceptCount({ value, evidence, latestUser, kind }) {
  if (value === null || value === undefined) return null;
  const min = kind === "adults" ? 1 : 0;
  const n = normalizeNullableInteger(value, min, 12);
  if (n === null || !evidenceAppears(evidence, latestUser) || !scopeIsUsable(evidence, latestUser)) return null;
  if (kind === "children" && n === 0 && !/\b(?:n+o+|zero)\b|kid[- ]?free|without|sin\s+ni(?:ñ|n)os?|sin\s+hijos?|sans\s+enfants?|sem\s+crian[cç]as?|keine\s+kinder|çocuk\s+yok|cocuk\s+yok|без\s+детей/i.test(String(evidence || ""))) return null;
  return n;
}

function deriveAwaiting(state) {
  if (state.mode !== "booking") return state.awaiting.filter(x => ["origin_city", "email", "first_name", "relay_message"].includes(x));
  const awaiting = [];
  if (!state.booking.arrival) awaiting.push("arrival");
  if (!state.booking.departure) awaiting.push("departure");
  if (state.booking.adults === null) awaiting.push("adults");
  if (state.booking.children === null) awaiting.push("children");
  return [...new Set([...state.awaiting.filter(x => ["origin_city", "email", "first_name", "hoa_confirmation", "relay_message"].includes(x)), ...awaiting])];
}

function mergeUnique(left, right) {
  return [...new Set([...(left || []), ...(right || [])])];
}

export function mergeToolPatch(state, patch) {
  if (!patch) return normalizeState(state);
  const base = normalizeState(state);
  const merged = applyStatePatch(base, patch);
  if (patch.verified) {
    for (const key of ["bookingUrls", "activityUrls", "blogUrls", "flightUrls", "facts"]) {
      merged.verified[key] = mergeUnique(base.verified[key], patch.verified[key]);
    }
  }
  if (patch.openIssues) merged.openIssues = patch.openIssues;
  merged.awaiting = deriveAwaiting(merged);
  merged.meta.updatedAt = new Date().toISOString();
  return normalizeState(merged);
}

function toolResult({ name, kind = "info", ok = true, status = "success", data = {}, urls = [], facts = [], statePatch = null, sessionUpdate = null, error = null }) {
  return { name, kind, ok, status, data, urls: [...new Set(urls.filter(Boolean))], facts, statePatch, sessionUpdate, error };
}

function bookingInputFromArgs(args, context) {
  const { state, latestUser, now } = context;
  const dateText = args.date_text || args.target_date_text || null;
  let dates = null;
  if (dateText && exactTextAppears(dateText, latestUser)) {
    dates = parseDateText({ dateText, currentDates: state.booking, now });
  }
  if (!dates && args.arrival && args.departure && String(latestUser).includes(args.arrival) && String(latestUser).includes(args.departure)) {
    dates = parseDateText({ arrival: args.arrival, departure: args.departure, currentDates: state.booking, now });
  }
  if (!dates && args.target_arrival && args.target_departure && String(latestUser).includes(args.target_arrival) && String(latestUser).includes(args.target_departure)) {
    dates = parseDateText({ arrival: args.target_arrival, departure: args.target_departure, currentDates: state.booking, now });
  }
  if (!dates && state.booking.arrival && state.booking.departure) dates = { arrival: state.booking.arrival, departure: state.booking.departure };

  const explicitAdults = acceptCount({ value: args.adults, evidence: args.adults_evidence, latestUser, kind: "adults" });
  const explicitChildren = acceptCount({ value: args.children, evidence: args.children_evidence, latestUser, kind: "children" });
  const explicitTotalGuests = acceptCount({ value: args.total_guests, evidence: args.total_guests_evidence, latestUser, kind: "adults" });
  const adults = explicitAdults ?? state.booking.adults;
  const children = explicitChildren ?? state.booking.children;
  const totalGuests = explicitTotalGuests ?? state.booking.totalGuests ?? (adults !== null && children !== null ? adults + children : null);
  const preferredUnit = ["707", "1006"].includes(String(args.preferred_unit)) ? String(args.preferred_unit) : state.booking.preferredUnit;
  const bedroomsRequested = args.bedrooms_requested != null && evidenceAppears(args.bedrooms_evidence, latestUser)
    ? normalizeNullableInteger(args.bedrooms_requested, 1, 20)
    : state.booking.bedroomsRequested;
  return { dates, adults, children, totalGuests, preferredUnit, bedroomsRequested, explicitAdults, explicitChildren, explicitTotalGuests, dateText };
}

function bookingStatePatch(input, source = "tool") {
  return {
    mode: "booking",
    booking: {
      arrival: input.dates?.arrival ?? null,
      departure: input.dates?.departure ?? null,
      adults: input.adults ?? null,
      children: input.children ?? null,
      totalGuests: input.totalGuests ?? null,
      preferredUnit: input.preferredUnit ?? null,
      bedroomsRequested: input.bedroomsRequested ?? null,
      dateSource: input.dates ? source : null,
    },
    flags: { bedroomMismatch: (input.bedroomsRequested || 0) >= 2 },
  };
}

function parsePartialCalendarOptions(calendar, adults, children) {
  if (!calendar) return [];
  const options = [];
  for (const [unit, key] of [["707", "unit707"], ["1006", "unit1006"]]) {
    const info = calendar[key];
    const window = info?.longestWindow;
    if (!window?.from || !window?.to || !isIsoDate(window.from) || !isIsoDate(window.to)) continue;
    const nights = diffNights(window.from, window.to);
    if (!nights || nights < 2 || adults + children > MAX_OCCUPANCY) continue;
    const url = buildBookingLink(unit, window.from, window.to, adults, children);
    if (url) options.push({ unit, arrival: window.from, departure: window.to, nights, bookingUrl: url });
  }
  return options;
}

function unitFacts(topics) {
  const facts = [];
  for (const topic of topics || []) {
    if (topic === "units") facts.push({ topic, value: [
      { unit: "707", floor: 7, name: "Classic Coastal", style: UNITS["707"].style },
      { unit: "1006", floor: 10, name: "Fresh Coastal", style: UNITS["1006"].style },
    ]});
    if (topic === "terrace") facts.push({ topic, value: "The Terrace is a different building and is not beachfront. Units 707 and 1006 are in the main Pelican Beach Resort building, directly on the beach." });
    if (topic === "bedrooms") facts.push({ topic, value: "Both units are one-bedroom, two-bath condos with a king bed, hallway bunks, and a queen sofa bed." });
    if (topic === "laundry") facts.push({ topic, value: "Neither unit has an in-unit washer/dryer. Coin-operated laundry is on every floor and accepts quarters and credit cards." });
    if (topic === "amenities") facts.push({ topic, value: "Both units have identical amenities: full kitchen, dishwasher, ice maker, FlexBrew coffee maker, air fryer, smart TVs, Wi-Fi smart lock, fast Wi-Fi, workspace, Pack N Play, and two beach chairs plus umbrella." });
    if (topic === "resort") facts.push({ topic, value: "The resort has an indoor heated swim-out pool, two outdoor pools, kiddie pool, two hot tubs, sauna, steam room, fitness center, tennis, pickleball, grills, café, seasonal Tiki Bar, and 24/7 front desk/security." });
    if (topic === "occupancy") facts.push({ topic, value: "Maximum occupancy is six per unit and twelve across both; HOA requires at least one adult per three children." });
    if (topic === "pets") facts.push({ topic, value: "Current business policy is a strict no-pets rule, including emotional-support animals." });
    if (topic === "smoking") facts.push({ topic, value: "Both units are strictly nonsmoking, including balconies." });
    if (topic === "parking") facts.push({ topic, value: "Free parking for up to two cars; guests collect a parking pass at the front desk. Two paid J1772 chargers are on site." });
    if (topic === "beach_chairs") facts.push({ topic, value: "Two chairs and an umbrella are included. HOA requires private setups behind the LDV beach-service area." });
    if (topic === "wifi") facts.push({ topic, value: "Free Wi-Fi is 250+ Mbps through Eero 6 and is suitable for video calls." });
    if (topic === "checkin") facts.push({ topic, value: "Normal check-in is 4:00 PM and checkout is 10:00 AM unless an authorized booking says otherwise." });
    if (topic === "comparison") facts.push({ topic, value: "Both units are equal in overall value. The factual differences are floor level and decor style; Unit 1006 has a higher vantage point." });
  }
  return facts;
}

export async function executeTool(name, args, context) {
  const { services, state, latestUser, now, sessionId, guestBid, guestSig, pageSource, sawBanner, logger = console } = context;
  try {
    if (name === "remember_booking_details") {
      const input = bookingInputFromArgs(args, context);
      if (!input.dates && args.date_text && exactTextAppears(args.date_text, latestUser)) {
        const single = extractSingleDate(args.date_text, now);
        if (single) {
          if (args.date_role === "departure" && state.booking.arrival) input.dates = { arrival: state.booking.arrival, departure: single };
          else if (args.date_role === "arrival") input.dates = { arrival: single, departure: state.booking.departure };
        }
      }
      const patch = bookingStatePatch(input, "guest_message");
      const next = mergeToolPatch(state, patch);
      return toolResult({
        name,
        kind: "state",
        data: { stored: next.booking, awaiting: next.awaiting },
        facts: [`Booking details stored with null preserved for unstated fields.`],
        statePatch: { ...patch, awaiting: next.awaiting },
      });
    }

    if (name === "check_availability") {
      const input = bookingInputFromArgs(args, context);
      const dateCheck = validateDateRange(input.dates, now);
      const party = validateParty(input.adults, input.children, { allowTwoUnits: true });
      let patch = bookingStatePatch(input, "availability_request");
      if (!dateCheck.ok || !party.ok) {
        const missing = [];
        if (!input.dates?.arrival) missing.push("arrival");
        if (!input.dates?.departure) missing.push("departure");
        if (input.adults === null) missing.push("adults");
        if (input.children === null) missing.push("children");
        patch.awaiting = missing;
        const totalOnlyFacts = [];
        let status = dateCheck.ok ? party.code : dateCheck.code;
        if (dateCheck.ok && input.totalGuests !== null && (input.adults === null || input.children === null)) {
          status = input.totalGuests > 12 ? "occupancy_exceeded" : "needs_party_composition";
          if (input.totalGuests > 6) totalOnlyFacts.push(`The guest stated ${input.totalGuests} total people, which exceeds the six-person limit for one unit; adult/child composition is required to evaluate a two-unit split.`);
          else totalOnlyFacts.push(`The guest stated ${input.totalGuests} total people, but adult and child counts are still required.`);
        }
        return toolResult({
          name,
          kind: "booking",
          ok: false,
          status,
          data: { query: { ...input.dates, adults: input.adults, children: input.children, totalGuests: input.totalGuests }, missing, dateValidation: dateCheck, partyValidation: party },
          facts: [dateCheck.message, ...totalOnlyFacts].filter(Boolean),
          statePatch: patch,
        });
      }

      if (party.needsTwoUnits) {
        const splits = findValidTwoUnitSplits(party.adults, party.children);
        if (!splits.length) {
          return toolResult({ name, kind: "booking", ok: false, status: "no_valid_two_unit_split", data: { query: { ...input.dates, adults: party.adults, children: party.children } }, statePatch: patch });
        }
        const availability = await services.checkBothUnits(input.dates.arrival, input.dates.departure);
        const split = splits[0];
        const units = [
          { unit: "707", available: availability["707"], adults: split.a1, children: split.c1, bookingUrl: availability["707"] === true && availability["1006"] === true ? buildBookingLink("707", input.dates.arrival, input.dates.departure, split.a1, split.c1) : null },
          { unit: "1006", available: availability["1006"], adults: split.a2, children: split.c2, bookingUrl: availability["707"] === true && availability["1006"] === true ? buildBookingLink("1006", input.dates.arrival, input.dates.departure, split.a2, split.c2) : null },
        ];
        const urls = units.map(u => u.bookingUrl).filter(Boolean);
        patch = {
          ...patch,
          verified: {
            bookingUrls: urls,
            availabilityCheckedAt: new Date(now).toISOString(),
            availabilityQuery: { ...input.dates, adults: party.adults, children: party.children },
            availabilityUnits: availability,
            facts: [`Both units are required for ${party.total} guests.`, `Suggested split: Unit 707 ${split.a1} adults/${split.c1} children; Unit 1006 ${split.a2} adults/${split.c2} children.`],
          },
        };
        return toolResult({ name, kind: "booking", status: urls.length === 2 ? "success" : "unavailable", data: { query: { ...input.dates, adults: party.adults, children: party.children }, needsTwoUnits: true, split, units, checkedAt: new Date(now).toISOString() }, urls, facts: patch.verified.facts, statePatch: patch });
      }

      const [availability, priceDrops] = await Promise.all([
        services.checkBothUnits(input.dates.arrival, input.dates.departure),
        services.fetchPriceDrops(input.dates.arrival, input.dates.departure),
      ]);
      const units = ["707", "1006"].map(unit => ({
        unit,
        available: availability[unit],
        bookingUrl: availability[unit] === true ? buildBookingLink(unit, input.dates.arrival, input.dates.departure, party.adults, party.children) : null,
      }));
      let alternatives = [];
      if (availability["707"] === false && availability["1006"] === false) {
        alternatives = parsePartialCalendarOptions(await services.fetchCalendarAlternatives(input.dates.arrival, input.dates.departure), party.adults, party.children);
      }
      const urls = [...units.map(u => u.bookingUrl), ...alternatives.map(a => a.bookingUrl)].filter(Boolean);
      const facts = [
        `Availability checked for ${input.dates.arrival} through ${input.dates.departure}.`,
        ...units.map(u => `Unit ${u.unit}: ${u.available === true ? "available" : u.available === false ? "booked" : "unknown"}.`),
        ...priceDrops.drops.map(d => `Unit ${d.unit} price dropped ${d.dropPct}% over ${d.windowDays} days from $${d.fromPrice} to $${d.toPrice} average nightly before fees and taxes.`),
      ];
      patch = {
        ...patch,
        verified: {
          bookingUrls: urls,
          availabilityCheckedAt: new Date(now).toISOString(),
          availabilityQuery: { ...input.dates, adults: party.adults, children: party.children },
          availabilityUnits: availability,
          facts,
        },
      };
      return toolResult({
        name,
        kind: "booking",
        status: units.some(u => u.available === true) ? "success" : units.every(u => u.available === false) ? "unavailable" : "partial_failure",
        data: { query: { ...input.dates, adults: party.adults, children: party.children }, units, alternatives, priceDrops: priceDrops.drops, checkedAt: new Date(now).toISOString() },
        urls,
        facts,
        statePatch: patch,
      });
    }

    if (name === "find_open_windows") {
      const input = bookingInputFromArgs(args, context);
      const dateCheck = validateDateRange(input.dates, now);
      const party = validateParty(input.adults, input.children, { allowTwoUnits: true });
      if (!dateCheck.ok || !party.ok) return toolResult({ name, kind: "booking", ok: false, status: dateCheck.ok ? party.code : dateCheck.code, data: { dateValidation: dateCheck, partyValidation: party }, statePatch: bookingStatePatch(input) });
      const windows = await services.findOpenWindows({ targetArrival: input.dates.arrival, targetDeparture: input.dates.departure, flexibilityDays: args.flexibility_days });
      const split = party.needsTwoUnits ? findValidTwoUnitSplits(party.adults, party.children)[0] : null;
      const options = windows.map(window => {
        const links = [];
        if (party.needsTwoUnits) {
          if (split && window.units["707"] === true && window.units["1006"] === true) {
            links.push({ unit: "707", url: buildBookingLink("707", window.arrival, window.departure, split.a1, split.c1), adults: split.a1, children: split.c1 });
            links.push({ unit: "1006", url: buildBookingLink("1006", window.arrival, window.departure, split.a2, split.c2), adults: split.a2, children: split.c2 });
          }
        } else {
          for (const unit of ["707", "1006"]) if (window.units[unit] === true) links.push({ unit, url: buildBookingLink(unit, window.arrival, window.departure, party.adults, party.children) });
        }
        return { ...window, links: links.filter(x => x.url) };
      }).filter(option => option.links.length);
      const urls = options.flatMap(option => option.links.map(link => link.url));
      const facts = options.map(option => `Open window ${option.arrival} through ${option.departure}: ${option.links.map(x => `Unit ${x.unit}`).join(" and ")}.`);
      return toolResult({ name, kind: "booking", status: options.length ? "success" : "unavailable", data: { requested: input.dates, flexibilityDays: args.flexibility_days, options }, urls, facts, statePatch: { mode: "booking", verified: { bookingUrls: urls, facts } } });
    }

    if (name === "get_existing_booking") {
      if (!guestBid) return toolResult({ name, kind: "existing_guest", ok: false, status: "not_authorized", data: { reason: "No booking link was supplied to the server." } });
      const signature = services.verifyGuestLinkSignature(guestBid, guestSig);
      if (!signature.ok) return toolResult({ name, kind: "existing_guest", ok: false, status: "not_authorized", data: { reason: signature.reason } });
      const booking = await services.fetchGuestBooking(guestBid);
      if (!booking) return toolResult({ name, kind: "existing_guest", ok: false, status: "not_found", data: {} });
      const patch = {
        mode: "existing_guest",
        existingGuest: { authorized: true, bookingId: String(guestBid), booking },
        booking: { arrival: booking.arrival, departure: booking.departure, adults: booking.adults ?? null, children: booking.children ?? null, preferredUnit: booking.unit },
        verified: { facts: [`Authorized booking for Unit ${booking.unit}, ${booking.arrival} through ${booking.departure}.`, booking.doorCode ? `Door code released by OwnerRez: ${booking.doorCode}.` : "No door code was released."] },
      };
      return toolResult({ name, kind: "existing_guest", data: booking, facts: patch.verified.facts, statePatch: patch });
    }

    if (name === "build_booking_links") {
      const verified = state.verified;
      const checkedAt = verified.availabilityCheckedAt ? new Date(verified.availabilityCheckedAt).getTime() : 0;
      const ageMs = new Date(now).getTime() - checkedAt;
      if (!verified.bookingUrls.length || !verified.availabilityQuery || ageMs > 15 * 60 * 1000) {
        return toolResult({ name, kind: "booking", ok: false, status: "stale_or_missing_verification", data: { checkedAt: verified.availabilityCheckedAt } });
      }
      return toolResult({ name, kind: "booking", data: { query: verified.availabilityQuery, units: verified.availabilityUnits, resent: true }, urls: verified.bookingUrls, facts: verified.facts });
    }

    if (name === "build_flight_search") {
      const originText = args.origin_text && exactTextAppears(args.origin_text, latestUser) ? args.origin_text : null;
      const origin = originText ? extractOrigin(originText) : state.flight.originIata;
      const destination = ["VPS", "PNS", "ECP"].includes(args.destination_iata) ? args.destination_iata : state.flight.destinationIata || "VPS";
      const resolved = resolveFlightDates(args, context);
      const explicitAdults = acceptCount({ value: args.adults, evidence: args.adults_evidence, latestUser, kind: "adults" });
      const explicitChildren = acceptCount({ value: args.children, evidence: args.children_evidence, latestUser, kind: "children" });
      const adults = explicitAdults ?? state.flight.adults ?? state.booking.adults;
      const children = explicitChildren ?? state.flight.children ?? state.booking.children;
      const infants = normalizeNullableInteger(args.infants, 0, 12) ?? state.flight.infants ?? 0;
      const flightPatch = {
        originIata: origin || null,
        destinationIata: destination,
        departureDate: resolved.dates?.arrival || state.flight.departureDate || null,
        returnDate: resolved.dates?.departure || state.flight.returnDate || null,
        adults: adults ?? null,
        children: children ?? null,
        infants,
        dateSource: resolved.source || state.flight.dateSource || null,
      };
      const missing = [];
      if (!origin) missing.push("origin_city");
      if (!flightPatch.departureDate) missing.push("flight_departure");
      if (!flightPatch.returnDate) missing.push("flight_return");
      if (adults === null || adults === undefined) missing.push("adults");
      if (children === null || children === undefined) missing.push("children");
      if (missing.length) {
        return toolResult({
          name,
          kind: "flight",
          ok: false,
          status: "needs_flight_details",
          data: { missing, saved: flightPatch },
          facts: ["A flight affiliate search can be built after origin, outbound date, return date, adults, and children are known."],
          statePatch: { mode: "local_info", flight: flightPatch },
        });
      }
      const url = buildFlightLink(origin, flightPatch.departureDate, flightPatch.returnDate, adults, children, infants, destination);
      if (!url) return toolResult({ name, kind: "flight", ok: false, status: "invalid_flight_search", data: { saved: flightPatch }, statePatch: { mode: "local_info", flight: flightPatch } });
      const fact = `Aviasales affiliate search built from ${origin}${MULTI_AIRPORT_MAIN[origin] ? ` (${MULTI_AIRPORT_MAIN[origin]})` : ""} to ${destination} for ${flightPatch.departureDate} through ${flightPatch.returnDate}. This does not confirm live fares or seat availability.`;
      return toolResult({
        name,
        kind: "flight",
        data: { origin, originLabel: MULTI_AIRPORT_MAIN[origin] || origin, destination, departureDate: flightPatch.departureDate, returnDate: flightPatch.returnDate, adults, children, infants, url, liveInventoryChecked: false },
        urls: [url],
        facts: [fact],
        statePatch: { mode: "local_info", flight: flightPatch, awaiting: state.awaiting.filter(x => x !== "origin_city"), verified: { flightUrls: [url], flightQuery: { origin, destination, departureDate: flightPatch.departureDate, returnDate: flightPatch.returnDate, adults, children, infants }, facts: [fact] } },
      });
    }

    if (name === "get_destin_weather") {
      const weather = await services.fetchDestinWeather();
      const facts = weather.forecast.map(day => `${day.date}: ${day.desc}; high ${day.hi}°F, low ${day.lo}°F, rain chance ${day.rain}%.`);
      return toolResult({ name, kind: "weather", ok: weather.status === "success", status: weather.status, data: weather, facts, statePatch: { verified: { facts } } });
    }

    if (name === "get_local_guide") {
      if (args.topic === "photos") {
        const urls = [STATIC_URLS.virtualTour, UNITS["707"].bookingBase, UNITS["1006"].bookingBase, STATIC_URLS.reviews];
        const facts = ["The virtual tour, both public unit pages, and guest reviews are available at the returned URLs."];
        return toolResult({ name, kind: "guide", data: { topic: "photos", description: facts[0] }, urls, facts, statePatch: { verified: { blogUrls: urls, facts } } });
      }
      if (args.topic === "car") {
        const guide = await services.fetchBlogContent("car");
        const guideUrl = guide.url || CAR_RENTAL_URLS.guide;
        const urls = [...new Set([CAR_RENTAL_URLS.booking, guideUrl].filter(Boolean))];
        const facts = [
          "The DiscoverCars URL is the direct affiliate browsing/booking link and should be prioritized when the guest wants to compare or reserve a car.",
          "The direct link is not prefilled with dates, pickup location, driver age, price, or availability.",
          ...(guide.content ? [guide.content] : []),
        ];
        return toolResult({
          name,
          kind: "guide",
          ok: true,
          status: "success",
          data: {
            topic: "car",
            directBookingUrl: CAR_RENTAL_URLS.booking,
            guideUrl,
            liveInventoryChecked: false,
            datesPrefilled: false,
          },
          urls,
          facts,
          statePatch: { verified: { blogUrls: urls, facts } },
        });
      }
      const guide = await services.fetchBlogContent(args.topic);
      const urls = guide.url ? [guide.url] : [];
      const facts = guide.content ? [guide.content] : [];
      return toolResult({ name, kind: "guide", ok: guide.status === "success", status: guide.status, data: guide, urls, facts, statePatch: { verified: { blogUrls: urls, facts } } });
    }

    if (name === "get_activity_options") {
      const dates = resolveActivityDates(args, context);
      const url = buildTripShockLink(args.category, dates);
      const fact = `TripShock affiliate link built for activity category ${args.category}${dates ? ` for ${dates.arrival} through ${dates.departure}` : " without guest-supplied dates"}. This does not confirm live TripShock availability.`;
      return toolResult({
        name,
        kind: "activity",
        data: { category: args.category, dates, url, liveInventoryChecked: false },
        urls: [url],
        facts: [fact],
        statePatch: {
          mode: "local_info",
          verified: {
            activityUrls: [url],
            activityQuery: dates ? { arrival: dates.arrival, departure: dates.departure } : state.verified?.activityQuery || null,
            facts: [fact],
          },
        },
      });
    }

    if (name === "create_maintenance_alert") {
      const accidental = detectAccidentalDamage(latestUser);
      const external = detectExternalDisturbance(latestUser);
      const emergencyApproved = detectLockedOut(latestUser) || /gas smell|fire|flooding|medical emergency|can't breathe|cant breathe/i.test(latestUser);
      const maintenanceApproved = detectMaintenance(latestUser) && !accidental && !external;
      const approvedSeverity = emergencyApproved ? "emergency" : maintenanceApproved ? "maintenance" : null;
      if (!approvedSeverity) {
        return toolResult({ name, kind: "alert", ok: false, status: accidental ? "accidental_damage_no_auto_alert" : external ? "external_disturbance_no_auto_alert" : "not_approved", data: { accidentalDamage: accidental, externalDisturbance: external } });
      }
      const description = extractIssueDescription(latestUser) || String(args.summary || "Guest reported an issue").substring(0, 90);
      const alreadyOpen = state.openIssues.some(issue => normalizeEvidence(issue.description || issue) === normalizeEvidence(description) && (issue.status || "open") === "open");
      if (alreadyOpen) return toolResult({ name, kind: "alert", status: "deduplicated", data: { severity: approvedSeverity, description, sent: false }, statePatch: { mode: approvedSeverity === "emergency" ? "emergency" : "maintenance", flags: { alertSent: state.flags.alertSent } } });
      const openIssues = [...state.openIssues, { type: approvedSeverity, description, status: "open", reportedAt: new Date(now).toISOString() }].slice(-20);
      const reason = approvedSeverity === "emergency" ? "🚨 EMERGENCY — Guest needs urgent help" : openIssues.length > 1 ? `🔧 MAINTENANCE — New issue reported (${openIssues.length} open issues)` : "🔧 MAINTENANCE ISSUE — Guest reporting a problem in the unit";
      const sent = await services.sendEmergencyDiscord(latestUser, sessionId, reason, approvedSeverity, openIssues.map(x => x.description));
      return toolResult({ name, kind: "alert", ok: sent.sent, status: sent.sent ? "sent" : "send_failed", data: { severity: approvedSeverity, description, sent: sent.sent, reason: sent.reason || null }, facts: [sent.sent ? "Ozan was alerted through Discord." : "The alert could not be confirmed as sent."], statePatch: { mode: approvedSeverity === "emergency" ? "emergency" : "maintenance", openIssues, flags: { alertSent: state.flags.alertSent || sent.sent }, verified: { facts: [sent.sent ? "Ozan was alerted through Discord." : "The alert could not be confirmed as sent."] } } });
    }

    if (name === "capture_lead") {
      const eligible = Boolean(pageSource || sawBanner);
      const emailInMessage = extractEmail(latestUser);
      if (!eligible || !isValidEmail(args.email) || args.email !== emailInMessage) return toolResult({ name, kind: "lead", ok: false, status: "not_approved", data: { eligible, emailPresent: Boolean(emailInMessage) } });
      const result = await services.addBrevoContact(args.email, args.first_name || state.lead.firstName || "");
      const patch = result.captured ? { lead: { firstName: args.first_name || state.lead.firstName, email: args.email, capturedAt: new Date(now).toISOString(), blueCodeRevealed: true }, verified: { facts: ["A valid email was captured; code BLUE may now be revealed for the extra 5%."] } } : null;
      return toolResult({ name, kind: "lead", ok: result.captured, status: result.captured ? "captured" : "capture_failed", data: { email: args.email, firstName: args.first_name, blueCodeUnlocked: result.captured, reason: result.reason || null }, facts: result.captured ? ["Code BLUE is authorized for this guest."] : [], statePatch: patch });
    }

    if (name === "get_unit_facts") {
      const facts = unitFacts(args.topics);
      return toolResult({ name, kind: "facts", data: { topics: args.topics, facts }, facts: facts.map(f => typeof f.value === "string" ? f.value : JSON.stringify(f.value)), statePatch: { verified: { facts: facts.map(f => typeof f.value === "string" ? f.value : JSON.stringify(f.value)) } } });
    }


    if (name === "relay_owner_message") {
      const explicitRequest = /alert.*ozan|ping.*ozan|notify.*ozan|contact.*ozan|reach.*ozan|get.*ozan|call.*ozan|let.*ozan.*know|send.*(?:ozan|owner|host|manager|him)|message.*(?:ozan|owner|host|manager)|tell.*(?:ozan|owner|host)|pass.*(?:ozan|owner|host)|forward.*(?:to|ozan)|^send\s+a?\s*message|^can\s+you\s+send|^please\s+send/i.test(latestUser);
      const followUp = state.ownerChat?.relayPending && String(latestUser || "").trim().length >= 2;
      if (!explicitRequest && !followUp) return toolResult({ name, kind: "relay", ok: false, status: "not_explicitly_requested", data: {} });
      const summary = String(args.message_summary || "").trim();
      const hasContent = summary.length >= 3 || (followUp && String(latestUser).trim().length >= 3);
      if (!hasContent) {
        return toolResult({ name, kind: "relay", ok: true, status: "needs_message", data: { sent: false }, statePatch: { ownerChat: { relayPending: true }, awaiting: mergeUnique(state.awaiting, ["relay_message"]) } });
      }
      const sent = await services.sendEmergencyDiscord(latestUser, sessionId, "💬 Guest message to relay to Ozan", "emergency", state.openIssues.map(x => x.description || String(x)));
      return toolResult({ name, kind: "relay", ok: sent.sent, status: sent.sent ? "sent" : "send_failed", data: { sent: sent.sent, summary: summary || latestUser, reason: sent.reason || null }, facts: [sent.sent ? "The guest's message was relayed to Ozan." : "The relay could not be confirmed as sent."], statePatch: { ownerChat: { relayPending: false }, awaiting: state.awaiting.filter(x => x !== "relay_message"), flags: { alertSent: state.flags.alertSent || sent.sent }, verified: { facts: [sent.sent ? "The guest's message was relayed to Ozan." : "The relay could not be confirmed as sent."] } } });
    }

    if (name === "request_owner_chat") {
      if (!detectOwnerChatRequest(latestUser)) return toolResult({ name, kind: "owner_chat", ok: false, status: "not_explicitly_requested", data: {} });
      if (!sessionId) return toolResult({ name, kind: "owner_chat", ok: false, status: "missing_session", data: {} });
      const existing = await services.readSessState(sessionId);
      const alreadyInvited = existing?.ozanActive === "TRUE" || existing?.ozanActive === "PENDING";
      const inviteToken = existing?.inviteToken || Buffer.from(`${sessionId}:${new Date(now).getTime()}`).toString("base64url").substring(0, 20);
      let sent = { sent: false, enterChatUrl: null };
      if (!alreadyInvited) {
        await services.writeSessState(sessionId, { ozanActive: "PENDING", inviteToken });
        sent = await services.sendOwnerChatInvite({ sessionId, guestMessage: latestUser, inviteToken });
      }
      // The owner-entry URL is internal. It is sent only to Ozan via Discord and
      // is deliberately omitted from model-visible data and the reply URL allow-list.
      return toolResult({ name, kind: "owner_chat", status: alreadyInvited ? "already_invited" : sent.sent ? "invited" : "invite_failed", ok: alreadyInvited || sent.sent, data: { alreadyInvited, sent: sent.sent }, urls: [], facts: [alreadyInvited ? "Ozan was already invited to this chat." : sent.sent ? "Ozan was invited to this chat." : "The owner-chat invitation could not be confirmed."], statePatch: { ownerChat: { active: false, pending: true, invitedAt: new Date(now).toISOString() } } });
    }

    if (name === "get_business_knowledge") {
      const result = searchBusinessKnowledge({
        query: String(args.query || latestUser || "").slice(0, 300),
        topics: Array.isArray(args.topics) ? args.topics : [],
        limit: Number(args.limit) || 8,
      });
      return toolResult({
        name,
        kind: "knowledge",
        ok: result.snippets.length > 0,
        status: result.snippets.length > 0 ? "success" : "no_match",
        data: { query: result.query, topics: result.topics, snippets: result.snippets },
        urls: result.urls,
        facts: result.snippets.map(item => item.text),
        statePatch: { verified: { facts: result.snippets.map(item => item.text).slice(0, 12), blogUrls: result.urls } },
      });
    }

    return toolResult({ name, ok: false, status: "unknown_tool", error: `Unknown tool: ${name}` });
  } catch (error) {
    logger.error(`Tool ${name} failed:`, error);
    return toolResult({ name, ok: false, status: "error", error: error.message, data: {} });
  }
}

function parseToolArguments(toolCall) {
  try {
    const raw = toolCall?.arguments ?? toolCall?.function?.arguments ?? "{}";
    const parsed = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return { __parseError: error.message };
  }
}

export async function applySafetyBackstops({ state, latestUser, services, sessionId, now }) {
  let next = normalizeState(state || createDefaultState());
  next.flags.scamCrisis = detectScamCrisis(latestUser);
  next.flags.bedroomMismatch = next.flags.bedroomMismatch || detectBedroomMismatch(latestUser);
  next.flags.petsMentioned = next.flags.petsMentioned || detectPets(latestUser);
  next.flags.externalDisturbance = detectExternalDisturbance(latestUser);
  next.flags.accidentalDamage = detectAccidentalDamage(latestUser);
  if (next.flags.bedroomMismatch && !next.booking.bedroomsRequested) {
    const match = String(latestUser).match(/\b(2|3|4|two|three|four)\s*(?:bed(?:room)?s?|br)\b/i);
    const values = { two: 2, three: 3, four: 4 };
    next.booking.bedroomsRequested = match ? Number(match[1]) || values[match[1].toLowerCase()] : 2;
  }
  if (next.flags.scamCrisis) {
    next.mode = "local_info";
    return { state: next, toolResults: [] };
  }

  const emergency = detectLockedOut(latestUser) || /gas smell|fire in|medical emergency|can't breathe|cant breathe/i.test(latestUser);
  const maintenance = detectMaintenance(latestUser) && !next.flags.accidentalDamage && !next.flags.externalDisturbance;
  if (!emergency && !maintenance) return { state: next, toolResults: [] };
  const severity = emergency ? "emergency" : "maintenance";
  const result = await executeTool("create_maintenance_alert", { severity, summary: extractIssueDescription(latestUser) || "Guest reported an issue" }, { services, state: next, latestUser, now, sessionId, guestBid: null, guestSig: null, pageSource: null, sawBanner: false });
  next = mergeToolPatch(next, result.statePatch);
  return { state: next, toolResults: [result] };
}

function intentFromState(state) {
  if (state.mode === "emergency") return "EMERGENCY";
  if (state.mode === "maintenance") return "MAINTENANCE";
  if (state.ownerChat?.pending || state.ownerChat?.active) return "OZAN_ACTIVE";
  return "INFO";
}

async function callChatCompletion(openai, payload, timeoutMs, label) {
  return withTimeout(openai.chat.completions.create(payload), timeoutMs, label);
}


export const RESPONSE_TOOL_DEFINITIONS = Object.freeze(TOOL_DEFINITIONS.map((tool) => ({
  type: "function",
  name: tool.function.name,
  description: tool.function.description,
  parameters: tool.function.parameters,
  strict: false,
})));

function responseFunctionCalls(response) {
  return (response?.output || []).filter((item) => item?.type === "function_call");
}

function responseText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
  const parts = [];
  for (const item of response?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if ((content?.type === "output_text" || content?.type === "text") && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function conversationInput(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message && ["user", "assistant"].includes(message.role))
    .slice(-24)
    .map((message) => ({ role: message.role, content: String(message.content || "") }));
}

async function callResponses(openai, payload, timeoutMs, label) {
  if (!openai?.responses?.create) {
    throw new Error("OpenAI Responses API is unavailable. Upgrade the openai npm package before deploying chat-agent.");
  }
  return withTimeout(openai.responses.create(payload), timeoutMs, label);
}

async function correctiveRewrite({ openai, model, state, latestUser, toolResults, allowedUrls, violations, now, timeoutMs }) {
  const instructions = buildCorrectionInstructions({
    state,
    latestUser,
    toolResults,
    allowedUrls,
    violations,
    today: todayIso(now),
    currentTime: now.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", hour12: true }),
  });
  const response = await callResponses(openai, {
    model,
    input: [{ role: "developer", content: instructions }],
    tool_choice: "none",
    reasoning: { effort: "low" },
    store: false,
    max_output_tokens: 1200,
  }, timeoutMs, "agent_correction");
  return responseText(response);
}

export async function runAgentTurn({
  openai,
  model = "gpt-5-mini",
  services,
  state,
  messages,
  latestUser,
  sessionId,
  guestBid = null,
  guestSig = null,
  pageSource = null,
  sawBanner = false,
  ozanAckType = null,
  now = new Date(),
  logger = console,
  maxToolRounds = 4,
  toolTimeoutMs = 12000,
  agentTimeoutMs = 25000,
}) {
  let workingState = normalizeState(state || createDefaultState());
  const safety = await applySafetyBackstops({ state: workingState, latestUser, services, sessionId, now });
  workingState = safety.state;
  const toolResults = [...safety.toolResults];

  if (workingState.flags.scamCrisis) {
    const reply = safeFallback({ state: workingState, latestUser });
    return {
      reply,
      state: workingState,
      toolResults,
      detectedIntent: intentFromState(workingState),
      debug: { agentic: true, safetyIntercept: "scam_crisis", toolCalls: [], toolRounds: 0, validation: { ok: true, violations: [] } },
    };
  }

  const instructions = buildAgentInstructions({
    state: workingState,
    latestUser,
    today: todayIso(now),
    currentTime: now.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", hour12: true }),
    pageSource,
    existingGuest: workingState.existingGuest?.authorized === true,
    priorToolResults: safety.toolResults,
  });

  const input = [
    { role: "developer", content: instructions },
    ...conversationInput(messages),
  ];
  const toolCallsDebug = [];
  let finalResponse = null;
  let agentError = null;
  let rounds = 0;
  const responseDiagnostics = [];

  for (let round = 0; round < maxToolRounds; round += 1) {
    rounds = round + 1;
    let response;
    try {
      response = await callResponses(openai, {
        model,
        input,
        tools: RESPONSE_TOOL_DEFINITIONS,
        tool_choice: "auto",
        parallel_tool_calls: true,
        reasoning: { effort: "low" },
        store: false,
        max_output_tokens: 1800,
      }, agentTimeoutMs, `agent_round_${round + 1}`);
    } catch (error) {
      agentError = error.message;
      break;
    }

    responseDiagnostics.push({
      round: round + 1,
      id: response?.id || null,
      status: response?.status || null,
      incompleteReason: response?.incomplete_details?.reason || null,
      outputTypes: (response?.output || []).map((item) => item?.type || "unknown"),
      outputTokens: response?.usage?.output_tokens ?? null,
      reasoningTokens: response?.usage?.output_tokens_details?.reasoning_tokens ?? null,
      hasOutputText: Boolean(responseText(response)),
    });

    const calls = responseFunctionCalls(response);
    if (!calls.length) {
      finalResponse = response;
      break;
    }

    // Preserve every model output item, including reasoning items, before adding
    // function outputs. This is the documented Responses API continuation pattern.
    input.push(...(response.output || []));

    const roundResults = await Promise.all(calls.map(async (call) => {
      const args = parseToolArguments(call);
      toolCallsDebug.push({ round: round + 1, callId: call.call_id, name: call.name, args });
      if (args.__parseError) {
        return toolResult({ name: call.name || "unknown", ok: false, status: "malformed_arguments", error: args.__parseError });
      }
      return withTimeout(executeTool(call.name, args, {
        services,
        state: workingState,
        messages,
        latestUser,
        now,
        sessionId,
        guestBid,
        guestSig,
        pageSource,
        sawBanner,
        logger,
      }), toolTimeoutMs, `tool_${call.name}`).catch((error) => toolResult({
        name: call.name || "unknown",
        ok: false,
        status: "timeout_or_error",
        error: error.message,
      }));
    }));

    for (let index = 0; index < calls.length; index += 1) {
      const result = roundResults[index];
      toolResults.push(result);
      workingState = mergeToolPatch(workingState, result.statePatch);
      input.push({
        type: "function_call_output",
        call_id: calls[index].call_id,
        output: JSON.stringify({
          ok: result.ok,
          status: result.status,
          data: result.data,
          urls: result.urls,
          facts: result.facts,
          error: result.error,
        }),
      });
    }
  }

  if (!finalResponse && !agentError) {
    try {
      finalResponse = await callResponses(openai, {
        model,
        input: [
          ...input,
          { role: "developer", content: "Tool budget is exhausted. Write the final guest-facing answer now from the verified state and tool outputs. Do not call another tool." },
        ],
        tool_choice: "none",
        reasoning: { effort: "low" },
        store: false,
        max_output_tokens: 1800,
      }, agentTimeoutMs, "agent_final_after_budget");
    } catch (error) {
      agentError = error.message;
    }
  }

  let reply = responseText(finalResponse);
  const allowedUrls = collectAllowedUrls(toolResults, workingState, { includeStateVerified: false });
  let validation = validateReply({
    reply,
    allowedUrls,
    toolResults,
    state: workingState,
    latestUser,
    requireCurrentTurnUrls: true,
  });

  if (!reply || !validation.ok) {
    try {
      const corrected = await correctiveRewrite({
        openai,
        model,
        state: workingState,
        latestUser,
        toolResults,
        allowedUrls,
        violations: validation.violations || [{ code: "empty_reply" }],
        now,
        timeoutMs: agentTimeoutMs,
      });
      if (corrected) {
        reply = corrected;
        validation = validateReply({ reply, allowedUrls, toolResults, state: workingState, latestUser, requireCurrentTurnUrls: true });
      }
    } catch (error) {
      agentError ||= error.message;
    }
  }

  if (!reply || !validation.ok) {
    reply = safeFallback({ state: workingState, latestUser, reason: validation.violations?.[0]?.code || agentError || "agent_failure" });
  }

  workingState.meta.lastIntent = intentFromState(workingState);
  workingState.meta.updatedAt = new Date(now).toISOString();
  return {
    reply,
    state: normalizeState(workingState),
    toolResults,
    detectedIntent: intentFromState(workingState),
    debug: {
      agentic: true,
      api: "responses",
      model,
      toolCalls: toolCallsDebug,
      toolRounds: toolCallsDebug.length ? Math.max(...toolCallsDebug.map((item) => item.round)) : 0,
      responseRounds: rounds,
      agentError,
      validation,
      allowedUrls: [...allowedUrls],
      ozanAckType: ozanAckType || null,
      responseDiagnostics,
    },
  };
}
