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
  resolveHolidayStay,
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
const partyScope = { type: ["string", "null"], enum: ["current_trip", "not_current_trip", "ambiguous", null], description: "Your semantic classification of the quoted party wording. Use current_trip only for people actually traveling now; not_current_trip for past, hypothetical, or explicitly non-traveling people; ambiguous when multiple interpretations remain." };
const partyEvidence = { ...nullableString, description: "One contiguous exact quote from the latest guest message supporting your interpretation of who is traveling, or null when reusing typed state." };
const holidayName = { type: ["string", "null"], enum: ["christmas", "new_years", "thanksgiving", "memorial_day", "labor_day", "easter", "independence_day", null], description: "The holiday concept expressed by the guest, or null. Explicit guest dates override this field." };
const holidayEvidence = { ...nullableString, description: "One contiguous exact quote from the latest guest message naming the holiday, or null." };

export const TOOL_DEFINITIONS = Object.freeze([
  {
    type: "function",
    function: {
      name: "set_request_plan",
      description: "Record your semantic plan for the latest guest message. List every distinct requested outcome after interpreting the full conversation, including outcomes that need no tool. This is reasoning structure, not guest-visible output.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          tasks: {
            type: "array",
            minItems: 1,
            maxItems: 12,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string", minLength: 1, maxLength: 40 },
                outcome: { type: "string", minLength: 3, maxLength: 180 },
                required_tool: {
                  type: ["string", "null"],
                  enum: [
                    "remember_booking_details", "check_availability", "find_open_windows",
                    "get_existing_booking", "build_booking_links", "build_flight_search",
                    "get_destin_weather", "get_beach_conditions", "get_local_guide", "get_activity_options",
                    "create_maintenance_alert", "capture_lead", "get_unit_facts",
                    "relay_owner_message", "request_owner_chat", "get_business_knowledge", null,
                  ],
                },
              },
              required: ["id", "outcome", "required_tool"],
            },
          },
        },
        required: ["tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remember_booking_details",
      description: "Store explicit booking details from the current guest message without checking availability. Use when some, but not all, dates/party details are known.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          date_text: { ...nullableString, description: "Exact verbatim date wording from the latest guest message that supports the normalized dates, or null when reusing existing state." },
          date_confidence: { type: ["string", "null"], enum: ["explicit", "contextual", "ambiguous", null], description: "Use ambiguous when the wording has multiple reasonable date interpretations; do not supply new normalized dates in that case." },
          date_role: { type: ["string", "null"], enum: ["range", "arrival", "departure", null] },
          arrival: { ...nullableString, description: "Your normalized ISO check-in date (YYYY-MM-DD), grounded by date_text, or null." },
          departure: { ...nullableString, description: "Your normalized ISO check-out date (YYYY-MM-DD), grounded by date_text, or null." },
          holiday_name: holidayName,
          holiday_evidence: holidayEvidence,
          adults: nullableInteger,
          adults_evidence: { ...nullableString, description: "One contiguous verbatim quote from the latest message supporting the adult count." },
          children: nullableInteger,
          children_evidence: { ...nullableString, description: "One contiguous verbatim quote from the latest message. Required for 0 as well." },
          total_guests: nullableInteger,
          total_guests_evidence: { ...nullableString, description: "Verbatim quote such as '10 people' when only total party size is known." },
          party_scope: partyScope,
          party_evidence: partyEvidence,
          preferred_unit: { type: ["string", "null"], enum: ["707", "1006", null] },
          bedrooms_requested: nullableInteger,
          bedrooms_evidence: nullableString,
        },
        required: ["date_text", "date_role", "arrival", "departure", "holiday_name", "holiday_evidence", "adults", "adults_evidence", "children", "children_evidence", "total_guests", "total_guests_evidence", "party_scope", "party_evidence", "preferred_unit", "bedrooms_requested", "bedrooms_evidence"],
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
          date_text: { ...nullableString, description: "Exact verbatim date wording from the latest guest message that supports arrival and departure, or null when reusing typed state." },
          date_confidence: { type: ["string", "null"], enum: ["explicit", "contextual", "ambiguous", null], description: "Use ambiguous when the wording has multiple reasonable date interpretations; ask instead of checking new dates." },
          arrival: { ...nullableString, description: "Your normalized ISO check-in date (YYYY-MM-DD), grounded by date_text, or null." },
          departure: { ...nullableString, description: "Your normalized ISO check-out date (YYYY-MM-DD), grounded by date_text, or null." },
          holiday_name: holidayName,
          holiday_evidence: holidayEvidence,
          adults: nullableInteger,
          adults_evidence: nullableString,
          children: nullableInteger,
          children_evidence: nullableString,
          total_guests: nullableInteger,
          total_guests_evidence: nullableString,
          party_scope: partyScope,
          party_evidence: partyEvidence,
          preferred_unit: { type: ["string", "null"], enum: ["707", "1006", null] },
          bedrooms_requested: nullableInteger,
          bedrooms_evidence: nullableString,
        },
        required: ["date_text", "arrival", "departure", "holiday_name", "holiday_evidence", "adults", "adults_evidence", "children", "children_evidence", "total_guests", "total_guests_evidence", "party_scope", "party_evidence", "preferred_unit", "bedrooms_requested", "bedrooms_evidence"],
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
          target_date_text: { ...nullableString, description: "Exact verbatim date wording from the latest guest message that supports the normalized target range." },
          date_confidence: { type: ["string", "null"], enum: ["explicit", "contextual", "ambiguous", null] },
          target_arrival: { ...nullableString, description: "Your normalized ISO start date (YYYY-MM-DD), grounded by target_date_text, or null." },
          target_departure: { ...nullableString, description: "Your normalized ISO end date (YYYY-MM-DD), grounded by target_date_text, or null." },
          holiday_name: holidayName,
          holiday_evidence: holidayEvidence,
          flexibility_days: { type: "integer", minimum: 0, maximum: 30 },
          adults: nullableInteger,
          adults_evidence: nullableString,
          children: nullableInteger,
          children_evidence: nullableString,
          total_guests: nullableInteger,
          total_guests_evidence: nullableString,
          party_scope: partyScope,
          party_evidence: partyEvidence,
        },
        required: ["target_date_text", "target_arrival", "target_departure", "holiday_name", "holiday_evidence", "flexibility_days", "adults", "adults_evidence", "children", "children_evidence", "total_guests", "total_guests_evidence", "party_scope", "party_evidence"],
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
      description: "Perform a fresh live availability check and generate new booking links when the guest asks to resend or return to prior trip details. Never reuses a persisted URL.",
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
          date_text: { ...nullableString, description: "Exact verbatim flight-date wording from the latest guest message that supports departure_date and return_date, or null when reusing typed state." },
          date_confidence: { type: ["string", "null"], enum: ["explicit", "contextual", "ambiguous", null], description: "Use ambiguous when flight-date wording has multiple reasonable interpretations; ask a clarification instead of building a link." },
          departure_date: { ...nullableString, description: "Normalized outbound ISO date (YYYY-MM-DD), or null." },
          return_date: { ...nullableString, description: "Normalized return ISO date (YYYY-MM-DD), or null." },
          adults: nullableInteger,
          adults_evidence: { ...nullableString, description: "Verbatim evidence from the latest guest message when a new adult count is supplied, otherwise null." },
          children: nullableInteger,
          children_evidence: { ...nullableString, description: "Verbatim evidence from the latest guest message when a new child count is supplied, including zero, otherwise null." },
          infants: { type: ["integer", "null"], minimum: 0, maximum: 12 },
          party_scope: partyScope,
          party_evidence: partyEvidence,
        },
        required: ["origin_text", "destination_iata", "date_text", "departure_date", "return_date", "adults", "adults_evidence", "children", "children_evidence", "infants", "party_scope", "party_evidence"],
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
      name: "get_beach_conditions",
      description: "Fetch current official Destin beach flags plus NWS Okaloosa Coastal rip-current, surf, water-temperature, wind, and active coastal-alert data. Use for swimming safety, beach flags, Gulf conditions, rip currents, surf, water closures, and current water temperature. Never declare the water safe.",
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
          date_text: { ...nullableString, description: "Exact verbatim activity-date wording from the latest guest message that supports start_date and end_date, or null when reusing typed state." },
          date_confidence: { type: ["string", "null"], enum: ["explicit", "contextual", "ambiguous", null], description: "Use ambiguous when activity-date wording has multiple reasonable interpretations." },
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
  return String(value || ""…12835 tokens truncated…NG", inviteToken });
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
  // Owner policy: all reported property damage and external disturbances are
  // surfaced, even when the model might consider them minor.
  const maintenance = detectMaintenance(latestUser) || next.flags.accidentalDamage || next.flags.externalDisturbance;
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
  const candidates = (Array.isArray(messages) ? messages : [])
    .filter((message) => message && ["user", "assistant"].includes(message.role))
    .slice(-24);
  const bounded = [];
  let remaining = 120000;
  for (let index = candidates.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const raw = String(candidates[index].content || "");
    const perMessageLimit = Math.min(12000, remaining);
    const content = raw.length <= perMessageLimit
      ? raw
      : perMessageLimit <= 64
        ? raw.slice(-perMessageLimit)
        : `${raw.slice(0, Math.floor((perMessageLimit - 32) / 2))}\n[message truncated]\n${raw.slice(-Math.ceil((perMessageLimit - 32) / 2))}`;
    bounded.unshift({ role: candidates[index].role, content });
    remaining -= content.length;
  }
  return bounded;
}

async function callResponses(openai, payload, timeoutMs, label) {
  if (!openai?.responses?.create) {
    throw new Error("OpenAI Responses API is unavailable. Upgrade the openai npm package before deploying chat-agent.");
  }
  return withTimeout(openai.responses.create(payload), timeoutMs, label);
}

function verifiedAvailabilityFallback(toolResults) {
  const result = [...toolResults].reverse().find(item => item?.name === "check_availability" && item?.status === "success");
  if (!result) return null;
  const query = result.data?.query;
  const units = Array.isArray(result.data?.units) ? result.data.units : [];
  const available = units.filter(unit => unit?.available === true && unit?.bookingUrl);
  if (!query?.arrival || !query?.departure || available.length === 0) return null;
  const party = `${query.adults} ${query.adults === 1 ? "adult" : "adults"} and ${query.children} ${query.children === 1 ? "child" : "children"}`;
  const links = available.map(unit => `- Unit ${unit.unit}: ${unit.bookingUrl}`).join("\n");
  return `I checked ${query.arrival} through ${query.departure} for ${party}. ${available.length === 1 ? "This condo is available" : "These condos are available"}:\n${links}\n\nPlease review the guest count and complete any reservation on the secure booking page. I can answer questions about either unit, but I cannot hold or complete a reservation for you.`;
}

function verifiedBeachConditionsFallback(toolResults) {
  const result = [...toolResults].reverse().find(item => item?.name === "get_beach_conditions" && item?.ok === true);
  const conditions = result?.data;
  if (!conditions) return null;
  const lines = [];
  if (conditions.flag?.status === "success") lines.push(`Destin Fire currently reports: ${conditions.flag.value}.`);
  else lines.push("I could not verify the current Destin Fire beach-flag status.");
  if (conditions.surf?.status === "success") {
    lines.push(`The NWS currently reports ${conditions.surf.ripCurrentRisk || "an unspecified"} rip-current risk, ${conditions.surf.surfHeight || "unavailable surf height"}, water temperature ${conditions.surf.waterTemperature || "unavailable"}, and ${conditions.surf.winds || "unavailable winds"}.`);
  } else lines.push("I could not verify the current NWS Okaloosa Coastal surf forecast.");
  for (const alert of conditions.alerts?.items || []) lines.push(`Active NWS alert: ${alert.headline || alert.event}${alert.expires ? ` (expires ${alert.expires})` : ""}.`);
  lines.push(`Checked ${conditions.checkedAt || "just now"}. Conditions can change quickly—follow posted flags and lifeguard instructions, and do not enter the Gulf while the water is closed.`);
  const urls = [conditions.flag?.source, conditions.surf?.source, conditions.alerts?.source].filter(Boolean);
  return `${lines.join("\n\n")}${urls.length ? `\n\nOfficial sources:\n${urls.map(url => `- ${url}`).join("\n")}` : ""}`;
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

function latestRequestPlan(toolResults) {
  const result = [...(toolResults || [])].reverse().find(item => item?.name === "set_request_plan" && item?.ok === true);
  return Array.isArray(result?.data?.tasks) ? result.data.tasks : [];
}

function incompletePlannedTasks(tasks, toolResults) {
  const attempted = new Set((toolResults || []).map(result => result?.name).filter(Boolean));
  return tasks.filter(task => task.requiredTool && !attempted.has(task.requiredTool));
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
  tickerUnit = null,
  sawBanner = false,
  ozanAckType = null,
  now = new Date(),
  logger = console,
  maxToolRounds = 4,
  maxToolCallsPerRound = 8,
  maxTotalToolCalls = 8,
  toolTimeoutMs = 12000,
  agentTimeoutMs = 25000,
}) {
  let workingState = normalizeState(state || createDefaultState());
  const safety = await applySafetyBackstops({ state: workingState, latestUser, services, sessionId, now });
  workingState = safety.state;
  const toolResults = [...safety.toolResults];
  const seenToolCalls = new Set(safety.toolResults.map(result => result?.name).filter(Boolean).map(name => name === "create_maintenance_alert" ? name : null).filter(Boolean));
  let executedToolCalls = 0;

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
    tickerUnit,
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
  let completionReprompts = 0;

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
      const requestPlan = latestRequestPlan(toolResults);
      const missingTasks = incompletePlannedTasks(requestPlan, toolResults);
      if (missingTasks.length && round + 1 < maxToolRounds && executedToolCalls < maxTotalToolCalls) {
        input.push(...(response.output || []));
        input.push({
          role: "developer",
          content: `COMPLETION CHECK: Your own request plan still has unattempted outcomes: ${missingTasks.map(task => `${task.id}: ${task.outcome} (use ${task.requiredTool})`).join("; ")}. Execute those tools now within the remaining budget. If a tool fails, preserve that result and explain the failure honestly in the final reply.`,
        });
        completionReprompts += 1;
        continue;
      }
      finalResponse = response;
      break;
    }

    // Preserve every model output item, including reasoning items, before adding
    // function outputs. This is the documented Responses API continuation pattern.
    input.push(...(response.output || []));

    let roundExecutedToolCalls = 0;
    const roundResults = await Promise.all(calls.map(async (call) => {
      const args = parseToolArguments(call);
      if (args.__parseError) {
        return toolResult({ name: call.name || "unknown", ok: false, status: "malformed_arguments", error: args.__parseError });
      }
      const isPlanningCall = call.name === "set_request_plan";
      const signature = call.name === "create_maintenance_alert"
        ? call.name
        : `${call.name}:${JSON.stringify(args, Object.keys(args).sort())}`;
      if (seenToolCalls.has(signature)) {
        return toolResult({ name: call.name || "unknown", ok: false, status: "duplicate_suppressed", data: { reason: "same_guest_message" } });
      }
      if (!isPlanningCall && (roundExecutedToolCalls >= maxToolCallsPerRound || executedToolCalls >= maxTotalToolCalls)) {
        return toolResult({ name: call.name || "unknown", ok: false, status: "tool_call_limit_exceeded", data: { maxToolCallsPerRound, maxTotalToolCalls } });
      }
      seenToolCalls.add(signature);
      if (!isPlanningCall) {
        roundExecutedToolCalls += 1;
        executedToolCalls += 1;
      }
      toolCallsDebug.push({ round: round + 1, callId: call.call_id, name: call.name, args });
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
    const needsPartyClarification = toolResults.some(result => result?.status === "needs_party_clarification");
    const availabilityFallback = verifiedAvailabilityFallback(toolResults);
    const beachConditionsFallback = verifiedBeachConditionsFallback(toolResults);
    reply = needsPartyClarification
      ? "Before I check availability, please confirm the final number of adults and children who will be traveling. I won’t assume anyone in or out."
      : availabilityFallback || beachConditionsFallback || safeFallback({ state: workingState, latestUser, reason: validation.violations?.[0]?.code || agentError || "agent_failure" });
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
      completion: {
        requested: latestRequestPlan(toolResults).map(task => task.id),
        attempted: latestRequestPlan(toolResults).filter(task => !incompletePlannedTasks([task], toolResults).length).map(task => task.id),
        reprompts: completionReprompts,
      },
    },
  };
}
