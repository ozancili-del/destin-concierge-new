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
function normalizeAc×m»òÚ$z{-®éÜj×V6öã¢6VçBç&V6öâÇÂçVÆÂÒÂf7G3¢·6VçBç6VçBò%F†RwVW7Bw2ÖW76vRv2&VÆ–VBFò÷¦ââ"¢%F†R&VÆ’6÷VÆBæ÷B&R6öæf—&ÖVB26VçBâ%ÒÂ7FFUF6ƒ¢²÷væW$6†C¢²&VÆ•VæF–æs¢fÇ6RÒÂv—F–æs¢7FFRæv—F–æræf–ÇFW"‡‚Óâ‚ÓÒ'&VÆ•öÖW76vR"’ÂfÆw3¢²ÆW'E6VçC¢7FFRæfÆw2æÆW'E6VçBÇÂ6VçBç6VçBÒÂfW&–f–VC¢²f7G3¢·6VçBç6VçBò%F†RwVW7Bw2ÖW76vRv2&VÆ–VBFò÷¦ââ"¢%F†R&VÆ’6÷VÆBæ÷B&R6öæf—&ÖVB26VçBâ%ÒÒÒÒ“°¢Ð ¢–b†æÖRÓÓÒ'&WVW7Eö÷væW%ö6†B"’°¢–b‚FWFV7D÷væW$6†E&WVW7B†ÆFW7EW6W"’’&WGW&âFööÅ&W7VÇB‡²æÖRÂ¶–æC¢&÷væW%ö6†B"Âö³¢fÇ6RÂ7FGW3¢&æ÷EöW‡Æ–6—FÇ•÷&WVW7FVB"ÂFF¢·ÒÒ“°¢–b‚6W76–öä–B’&WGW&âFööÅ&W7VÇB‡²æÖRÂ¶–æC¢&÷væW%ö6†B"Âö³¢fÇ6RÂ7FGW3¢&Ö—76–æu÷6W76–öâ"ÂFF¢·ÒÒ“°¢6öç7BW†—7F–ærÒv—B6W'f–6W2ç&VE6W757FFR‡6W76–öä–B“°¢6öç7BÇ&VG”–çf—FVBÒW†—7F–æsòæ÷¦ä7F—fRÓÓÒ%E%TR"ÇÂW†—7F–æsòæ÷¦ä7F—fRÓÓÒ%TäD”är#°¢6öç7B–çf—FUFö¶VâÒW†—7F–æsòæ–çf—FUFö¶VâÇÂ'VffW"æg&öÒ†G·6W76–öä–GÓ¢G¶æWrFFR†æ÷r’ævWEF–ÖR‚—Ö’çFõ7G&–ær‚&&6ScGW&Â"’ç7V'7G&–ærƒÂ#“°¢ÆWB6VçBÒ²6VçC¢fÇ6RÂVçFW$6†EW&Ã¢çVÆÂÓ°¢–b‚Ç&VG”–çf—FVB’°¢v—B6W'f–6W2çw&—FU6W757FFR‡6W76–öä–BÂ²÷¦ä7F—fS¢%TäD”är"Â–çf—FUFö¶VâÒ“°¢6VçBÒv—B6W'f–6W2ç6VæD÷væW$6†D–çf—FR‡²6W76–öä–BÂwVW7DÖW76vS¢ÆFW7EW6W"Â–çf—FUFö¶VâÒ“°¢Ð¢òòF†R÷væW"ÖVçG'’U$Â—2–çFW&æÂâ—B—26VçBöæÇ’Fò÷¦âf–F—66÷&Bæ@¢òò—2FVÆ–&W&FVÇ’öÖ—GFVBg&öÒÖöFVÂ×f—6–&ÆRFFæBF†R&WÇ’U$ÂÆÆ÷rÖÆ—7Bà¢&WGW&âFööÅ&W7VÇB‡²æÖRÂ¶–æC¢&÷væW%ö6†B"Â7FGW3¢Ç&VG”–çf—FVBò&Ç&VG•ö–çf—FVB"¢6VçBç6VçBò&–çf—FVB"¢&–çf—FUöf–ÆVB"Âö³¢Ç&VG”–çf—FVBÇÂ6VçBç6VçBÂFF¢²Ç&VG”–çf—FVBÂ6VçC¢6VçBç6VçBÒÂW&Ç3¢µÒÂf7G3¢¶Ç&VG”–çf—FVBò$÷¦âv2Ç&VG’–çf—FVBFòF†—26†Bâ"¢6VçBç6VçBò$÷¦âv2–çf—FVBFòF†—26†Bâ"¢%F†R÷væW"Ö6†B–çf—FF–öâ6÷VÆBæ÷B&R6öæf—&ÖVBâ%ÒÂ7FFUF6ƒ¢²÷væW$6†C¢²7F—fS¢fÇ6RÂVæF–æs¢G'VRÂ–çf—FVDC¢æWrFFR†æ÷r’çFô•4õ7G&–ær‚’ÒÒÒ“°¢Ð ¢–b†æÖRÓÓÒ&vWEö'W6–æW75ö¶æ÷vÆVFvR"’°¢6öç7B&W7VÇBÒ6V&6„'W6–æW74¶æ÷vÆVFvR‡°¢VW'“¢7G&–ær†&w2çVW'’ÇÂÆFW7EW6W"ÇÂ""’ç6Æ–6RƒÂ3’À¢F÷–73¢'&’æ—4'&’†&w2çF÷–72’ò&w2çF÷–72¢µÒÀ¢Æ–Ö—C¢çVÖ&W"†&w2æÆ–Ö—B’ÇÂ‚À¢Ò“°¢&WGW&âFööÅ&W7VÇB‡°¢æÖRÀ¢¶–æC¢&¶æ÷vÆVFvR"À¢ö³¢&W7VÇBç6æ—WG2æÆVæwF‚âÀ¢7FGW3¢&W7VÇBç6æ—WG2æÆVæwF‚âò'7V66W72"¢&æõöÖF6‚"À¢FF¢²VW'“¢&W7VÇBçVW'’ÂF÷–73¢&W7VÇBçF÷–72Â6æ—WG3¢&W7VÇBç6æ—WG2ÒÀ¢W&Ç3¢&W7VÇBçW&Ç2À¢f7G3¢&W7VÇBç6æ—WG2æÖ†—FVÒÓâ—FVÒçFW‡B’À¢7FFUF6ƒ¢²fW&–f–VC¢²f7G3¢&W7VÇBç6æ—WG2æÖ†—FVÒÓâ—FVÒçFW‡B’ç6Æ–6RƒÂ"’Â&ÆöuW&Ç3¢&W7VÇBçW&Ç2ÒÒÀ¢Ò“°¢Ð ¢&WGW&âFööÅ&W7VÇB‡²æÖRÂö³¢fÇ6RÂ7FGW3¢'Væ¶æ÷vå÷FööÂ"ÂW'&÷#¢Væ¶æ÷vâFööÃ¢G¶æÖWÖÒ“°¢Ò6F6‚†W'&÷"’°¢ÆövvW"æW'&÷"†FööÂG¶æÖWÒf–ÆVC¦ÂW'&÷"“°¢&WGW&âFööÅ&W7VÇB‡²æÖRÂö³¢fÇ6RÂ7FGW3¢&W'&÷""ÂW'&÷#¢W'&÷"æÖW76vRÂFF¢·ÒÒ“°¢Ð§Ð ¦gVæ7F–öâ'6UFööÄ&wVÖVçG2‡FööÄ6ÆÂ’°¢G'’°¢6öç7B&rÒFööÄ6ÆÃòæ&wVÖVçG2óòFööÄ6ÆÃòægVæ7F–öãòæ&wVÖVçG2óò'·Ò#°¢6öç7B'6VBÒG—Vöb&rÓÓÒ'7G&–ær"ò¥4ôâç'6R‡&rÇÂ'·Ò"’¢&s°¢&WGW&â'6VBbbG—Vöb'6VBÓÓÒ&ö&¦V7B"bb'&’æ—4'&’‡'6VB’ò'6VB¢·Ó°¢Ò6F6‚†W'&÷"’°¢&WGW&â²õ÷'6TW'&÷#¢W'&÷"æÖW76vRÓ°¢Ð§Ð ¦W‡÷'B7–æ2gVæ7F–öâÇ•6fWG”&6·7F÷2‡²7FFRÂÆFW7EW6W"Â6W'f–6W2Â6W76–öä–BÂæ÷rÒ’°¢ÆWBæW‡BÒæ÷&ÖÆ—¦U7FFR‡7FFRÇÂ7&VFTFVfVÇE7FFR‚’“°¢æW‡BæfÆw2ç66Ô7&—6—2ÒFWFV7E66Ô7&—6—2†ÆFW7EW6W"“°¢æW‡BæfÆw2æ&VG&ööÔÖ—6ÖF6‚ÒæW‡BæfÆw2æ&VG&ööÔÖ—6ÖF6‚ÇÂFWFV7D&VG&ööÔÖ—6ÖF6‚†ÆFW7EW6W"“°¢æW‡BæfÆw2çWG4ÖVçF–öæVBÒæW‡BæfÆw2çWG4ÖVçF–öæVBÇÂFWFV7EWG2†ÆFW7EW6W"“°¢æW‡BæfÆw2æW‡FW&æÄF—7GW&&æ6RÒFWFV7DW‡FW&æÄF—7GW&&æ6R†ÆFW7EW6W"“°¢æW‡BæfÆw2æ66–FVçFÄFÖvRÒFWFV7D66–FVçFÄFÖvR†ÆFW7EW6W"“°¢–b†æW‡BæfÆw2æ&VG&ööÔÖ—6ÖF6‚bbæW‡Bæ&öö¶–æræ&VG&öö×5&WVW7FVB’°¢6öç7BÖF6‚Ò7G&–ær†ÆFW7EW6W"’æÖF6‚‚õÆ"ƒ'Ã7ÃGÇGv÷ÇF‡&VWÆf÷W"•Ç2¢ƒó¦&VBƒó§&ööÒ“÷3÷Æ'"•Æ"ö’“°¢6öç7BfÇVW2Ò²Gvó¢"ÂF‡&VS¢2Âf÷W#¢BÓ°¢æW‡Bæ&öö¶–æræ&VG&öö×5&WVW7FVBÒÖF6‚òçVÖ&W"†ÖF6…³Ò’ÇÂfÇVW5¶ÖF6…³ÒçFôÆ÷vW$66R‚•Ò¢#°¢Ð¢–b†æW‡BæfÆw2ç66Ô7&—6—2’°¢æW‡BæÖöFRÒ&Æö6Åö–æfò#°¢&WGW&â²7FFS¢æW‡BÂFööÅ&W7VÇG3¢µÒÓ°¢Ð ¢6öç7BVÖW&vVæ7’ÒFWFV7DÆö6¶VD÷WB†ÆFW7EW6W"’ÇÂöv26ÖVÆÇÆf—&R–çÆÖVF–6ÂVÖW&vVæ7—Æ6âwB'&VF†WÆ6çB'&VF†Rö’çFW7B†ÆFW7EW6W"“°¢6öç7BÖ–çFVææ6RÒFWFV7DÖ–çFVææ6R†ÆFW7EW6W"’bbæW‡BæfÆw2æ66–FVçFÄFÖvRbbæW‡BæfÆw2æW‡FW&æÄF—7GW&&æ6S°¢–b‚VÖW&vVæ7’bbÖ–çFVææ6R’&WGW&â²7FFS¢æW‡BÂFööÅ&W7VÇG3¢µÒÓ°¢6öç7B6WfW&—G’ÒVÖW&vVæ7’ò&VÖW&vVæ7’"¢&Ö–çFVææ6R#°¢6öç7B&W7VÇBÒv—BW†V7WFUFööÂ‚&7&VFUöÖ–çFVææ6UöÆW'B"Â²6WfW&—G’Â7VÖÖ'“¢W‡G&7D—77VTFW67&—F–öâ†ÆFW7EW6W"’ÇÂ$wVW7B&W÷'FVBâ—77VR"ÒÂ²6W'f–6W2Â7FFS¢æW‡BÂÆFW7EW6W"Âæ÷rÂ6W76–öä–BÂwVW7D&–C¢çVÆÂÂwVW7E6–s¢çVÆÂÂvU6÷W&6S¢çVÆÂÂ6t&ææW#¢fÇ6RÒ“°¢æW‡BÒÖW&vUFööÅF6‚†æW‡BÂ&W7VÇBç7FFUF6‚“°¢&WGW&â²7FFS¢æW‡BÂFööÅ&W7VÇG3¢·&W7VÇEÒÓ°§Ð ¦gVæ7F–öâ–çFVçDg&öÕ7FFR‡7FFR’°¢–b‡7FFRæÖöFRÓÓÒ&VÖW&vVæ7’"’&WGW&â$TÔU$tTä5’#°¢–b‡7FFRæÖöFRÓÓÒ&Ö–çFVææ6R"’&WGW&â$Ô”åDTää4R#°¢–b‡7FFRæ÷væW$6†CòçVæF–ærÇÂ7FFRæ÷væW$6†Còæ7F—fR’&WGW&â$õ¤åô5D•dR#°¢&WGW&â$”ädò#°§Ð ¦7–æ2gVæ7F–öâ6ÆÄ6†D6ö×ÆWF–öâ†÷Væ’Â–ÆöBÂF–ÖV÷WD×2ÂÆ&VÂ’°¢&WGW&âv—F…F–ÖV÷WB†÷Væ’æ6†Bæ6ö×ÆWF–öç2æ7&VFR‡–ÆöB’ÂF–ÖV÷WD×2ÂÆ&VÂ“°§Ð  ¦W‡÷'B6öç7B$U5ôå4UõDôôÅôDTd”ä•D”ôå2Òö&¦V7Bæg&VW¦R…DôôÅôDTd”ä•D”ôå2æÖ‚‡FööÂ’Óâ‡°¢G—S¢&gVæ7F–öâ"À¢æÖS¢FööÂægVæ7F–öâææÖRÀ¢FW67&—F–öã¢FööÂægVæ7F–öâæFW67&—F–öâÀ¢&ÖWFW'3¢FööÂægVæ7F–öâç&ÖWFW'2À¢7G&–7C¢fÇ6RÀ§Ò’’“° ¦gVæ7F–öâ&W7öç6TgVæ7F–öä6ÆÇ2‡&W7öç6R’°¢&WGW&â‡&W7öç6Sòæ÷WGWBÇÂµÒ’æf–ÇFW"‚†—FVÒ’Óâ—FVÓòçG—RÓÓÒ&gVæ7F–öåö6ÆÂ"“°§Ð ¦gVæ7F–öâ&W7öç6UFW‡B‡&W7öç6R’°¢–b‡G—Vöb&W7öç6Sòæ÷WGWE÷FW‡BÓÓÒ'7G&–ær"bb&W7öç6Ræ÷WGWE÷FW‡BçG&–Ò‚’’&WGW&â&W7öç6Ræ÷WGWE÷FW‡BçG&–Ò‚“°¢6öç7B'G2ÒµÓ°¢f÷"†6öç7B—FVÒöb&W7öç6Sòæ÷WGWBÇÂµÒ’°¢–b†—FVÓòçG—RÓÒ&ÖW76vR"’6öçF–çVS°¢f÷"†6öç7B6öçFVçBöb—FVÒæ6öçFVçBÇÂµÒ’°¢–b‚†6öçFVçCòçG—RÓÓÒ&÷WGWE÷FW‡B"ÇÂ6öçFVçCòçG—RÓÓÒ'FW‡B"’bb6öçFVçBçFW‡B’'G2çW6‚†6öçFVçBçFW‡B“°¢Ð¢Ð¢&WGW&â'G2æ¦ö–â‚%Æâ"’çG&–Ò‚“°§Ð ¦gVæ7F–öâ6öçfW'6F–öä–çWB†ÖW76vW2’°¢&WGW&â„'&’æ—4'&’†ÖW76vW2’òÖW76vW2¢µÒ¢æf–ÇFW"‚†ÖW76vR’ÓâÖW76vRbb²'W6W""Â&76—7FçB%Òæ–æ6ÇVFW2†ÖW76vRç&öÆR’¢ç6Æ–6R‚Ó#B¢æÖ‚†ÖW76vR’Óâ‡²&öÆS¢ÖW76vRç&öÆRÂ6öçFVçC¢7G&–ær†ÖW76vRæ6öçFVçBÇÂ""’Ò’“°§Ð ¦7–æ2gVæ7F–öâ6ÆÅ&W7öç6W2†÷Væ’Â–ÆöBÂF–ÖV÷WD×2ÂÆ&VÂ’°¢–b‚÷Væ“òç&W7öç6W3òæ7&VFR’°¢F‡&÷ræWrW'&÷"‚$÷Vä’&W7öç6W2’—2Væf–Æ&ÆRâWw&FRF†R÷Væ’çÒ6¶vR&Vf÷&RFWÆ÷––ær6†BÖvVçBâ"“°¢Ð¢&WGW&âv—F…F–ÖV÷WB†÷Væ’ç&W7öç6W2æ7&VFR‡–ÆöB’ÂF–ÖV÷WD×2ÂÆ&VÂ“°§Ð ¦7–æ2gVæ7F–öâ6÷'&V7F—fU&Ww&—FR‡²÷Væ’ÂÖöFVÂÂ7FFRÂÆFW7EW6W"ÂFööÅ&W7VÇG2ÂÆÆ÷vVEW&Ç2Âf–öÆF–öç2Âæ÷rÂF–ÖV÷WD×2Ò’°¢6öç7B–ç7G'V7F–öç2Ò'V–ÆD6÷'&V7F–öä–ç7G'V7F–öç2‡°¢7FFRÀ¢ÆFW7EW6W"À¢FööÅ&W7VÇG2À¢ÆÆ÷vVEW&Ç2À¢f–öÆF–öç2À¢FöF“¢FöF”—6ò†æ÷r’À¢7W'&VçEF–ÖS¢æ÷rçFôÆö6ÆUF–ÖU7G&–ær‚&VâÕU2"Â²F–ÖU¦öæS¢$ÖW&–6ô6†–6vò"Â†÷W#¢&çVÖW&–2"ÂÖ–çWFS¢#"ÖF–v—B"Â†÷W##¢G'VRÒ’À¢Ò“°¢6öç7B&W7öç6RÒv—B6ÆÅ&W7öç6W2†÷Væ’Â°¢ÖöFVÂÀ¢–çWC¢·²&öÆS¢&FWfVÆ÷W""Â6öçFVçC¢–ç7G'V7F–öç2ÕÒÀ¢FööÅö6†ö–6S¢&æöæR"À¢&V6öæ–æs¢²Vff÷'C¢&Æ÷r"ÒÀ¢7F÷&S¢fÇ6RÀ¢Ö…ö÷WGWE÷Fö¶Vç3¢#À¢ÒÂF–ÖV÷WD×2Â&vVçEö6÷'&V7F–öâ"“°¢&WGW&â&W7öç6UFW‡B‡&W7öç6R“°§Ð ¦W‡÷'B7–æ2gVæ7F–öâ'VävVçEGW&â‡°¢÷Væ’À¢ÖöFVÂÒ&wBÓRÖÖ–æ’"À¢6W'f–6W2À¢7FFRÀ¢ÖW76vW2À¢ÆFW7EW6W"À¢6W76–öä–BÀ¢wVW7D&–BÒçVÆÂÀ¢wVW7E6–rÒçVÆÂÀ¢vU6÷W&6RÒçVÆÂÀ¢F–6¶W%Væ—BÒçVÆÂÀ¢6t&ææW"ÒfÇ6RÀ¢÷¦ä6µG—RÒçVÆÂÀ¢æ÷rÒæWrFFR‚’À¢ÆövvW"Ò6öç6öÆRÀ¢Ö…FööÅ&÷VæG2ÒBÀ¢FööÅF–ÖV÷WD×2Ò#À¢vVçEF–ÖV÷WD×2Ò#SÀ§Ò’°¢ÆWBv÷&¶–æu7FFRÒæ÷&ÖÆ—¦U7FFR‡7FFRÇÂ7&VFTFVfVÇE7FFR‚’“°¢6öç7B6fWG’Òv—BÇ•6fWG”&6·7F÷2‡²7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Â6W'f–6W2Â6W76–öä–BÂæ÷rÒ“°¢v÷&¶–æu7FFRÒ6fWG’ç7FFS°¢6öç7BFööÅ&W7VÇG2Ò²ââç6fWG’çFööÅ&W7VÇG5Ó°¢6öç7B6VVåFööÄ6ÆÇ2ÒæWr6WB‡6fWG’çFööÅ&W7VÇG2æÖ‡&W7VÇBÓâ&W7VÇCòææÖR’æf–ÇFW"„&ööÆVâ’æÖ†æÖRÓâæÖRÓÓÒ&7&VFUöÖ–çFVææ6UöÆW'B"òæÖR¢çVÆÂ’æf–ÇFW"„&ööÆVâ’“° ¢–b‡v÷&¶–æu7FFRæfÆw2ç66Ô7&—6—2’°¢6öç7B&WÇ’Ò6fTfÆÆ&6²‡²7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Ò“°¢&WGW&â°¢&WÇ’À¢7FFS¢v÷&¶–æu7FFRÀ¢FööÅ&W7VÇG2À¢FWFV7FVD–çFVçC¢–çFVçDg&öÕ7FFR‡v÷&¶–æu7FFR’À¢FV'Vs¢²vVçF–3¢G'VRÂ6fWG”–çFW&6WC¢'66Õö7&—6—2"ÂFööÄ6ÆÇ3¢µÒÂFööÅ&÷VæG3¢ÂfÆ–FF–öã¢²ö³¢G'VRÂf–öÆF–öç3¢µÒÒÒÀ¢Ó°¢Ð ¢6öç7B–ç7G'V7F–öç2Ò'V–ÆDvVçD–ç7G'V7F–öç2‡°¢7FFS¢v÷&¶–æu7FFRÀ¢ÆFW7EW6W"À¢FöF“¢FöF”—6ò†æ÷r’À¢7W'&VçEF–ÖS¢æ÷rçFôÆö6ÆUF–ÖU7G&–ær‚&VâÕU2"Â²F–ÖU¦öæS¢$ÖW&–6ô6†–6vò"Â†÷W#¢&çVÖW&–2"ÂÖ–çWFS¢#"ÖF–v—B"Â†÷W##¢G'VRÒ’À¢vU6÷W&6RÀ¢F–6¶W%Væ—BÀ¢W†—7F–ætwVW7C¢v÷&¶–æu7FFRæW†—7F–ætwVW7CòæWF†÷&—¦VBÓÓÒG'VRÀ¢&–÷%FööÅ&W7VÇG3¢6fWG’çFööÅ&W7VÇG2À¢Ò“° ¢6öç7B–çWBÒ°¢²&öÆS¢&FWfVÆ÷W""Â6öçFVçC¢–ç7G'V7F–öç2ÒÀ¢ââæ6öçfW'6F–öä–çWB†ÖW76vW2’À¢Ó°¢6öç7BFööÄ6ÆÇ4FV'VrÒµÓ°¢ÆWBf–æÅ&W7öç6RÒçVÆÃ°¢ÆWBvVçDW'&÷"ÒçVÆÃ°¢ÆWB&÷VæG2Ò°¢6öç7B&W7öç6TF–væ÷7F–72ÒµÓ° ¢f÷"†ÆWB&÷VæBÒ²&÷VæBÂÖ…FööÅ&÷VæG3²&÷VæB³Ò’°¢&÷VæG2Ò&÷VæB²°¢ÆWB&W7öç6S°¢G'’°¢&W7öç6RÒv—B6ÆÅ&W7öç6W2†÷Væ’Â°¢ÖöFVÂÀ¢–çWBÀ¢FööÇ3¢$U5ôå4UõDôôÅôDTd”ä•D”ôå2À¢FööÅö6†ö–6S¢&WFò"À¢&ÆÆVÅ÷FööÅö6ÆÇ3¢G'VRÀ¢&V6öæ–æs¢²Vff÷'C¢&Æ÷r"ÒÀ¢7F÷&S¢fÇ6RÀ¢Ö…ö÷WGWE÷Fö¶Vç3¢ƒÀ¢ÒÂvVçEF–ÖV÷WD×2ÂvVçE÷&÷VæEòG·&÷VæB²Ö“°¢Ò6F6‚†W'&÷"’°¢vVçDW'&÷"ÒW'&÷"æÖW76vS°¢'&V³°¢Ð ¢&W7öç6TF–væ÷7F–72çW6‚‡°¢&÷VæC¢&÷VæB²À¢–C¢&W7öç6Sòæ–BÇÂçVÆÂÀ¢7FGW3¢&W7öç6Sòç7FGW2ÇÂçVÆÂÀ¢–æ6ö×ÆWFU&V6öã¢&W7öç6Sòæ–æ6ö×ÆWFUöFWF–Ç3òç&V6öâÇÂçVÆÂÀ¢÷WGWEG—W3¢‡&W7öç6Sòæ÷WGWBÇÂµÒ’æÖ‚†—FVÒ’Óâ—FVÓòçG—RÇÂ'Væ¶æ÷vâ"’À¢÷WGWEFö¶Vç3¢&W7öç6SòçW6vSòæ÷WGWE÷Fö¶Vç2óòçVÆÂÀ¢&V6öæ–æuFö¶Vç3¢&W7öç6SòçW6vSòæ÷WGWE÷Fö¶Vç5öFWF–Ç3òç&V6öæ–æu÷Fö¶Vç2óòçVÆÂÀ¢†4÷WGWEFW‡C¢&ööÆVâ‡&W7öç6UFW‡B‡&W7öç6R’’À¢Ò“° ¢6öç7B6ÆÇ2Ò&W7öç6TgVæ7F–öä6ÆÇ2‡&W7öç6R“°¢–b‚6ÆÇ2æÆVæwF‚’°¢f–æÅ&W7öç6RÒ&W7öç6S°¢'&V³°¢Ð ¢òò&W6W'fRWfW'’ÖöFVÂ÷WGWB—FVÒÂ–æ6ÇVF–ær&V6öæ–ær—FV×2Â&Vf÷&RFF–æp¢òògVæ7F–öâ÷WGWG2âF†—2—2F†RFö7VÖVçFVB&W7öç6W2’6öçF–çVF–öâGFW&âà¢–çWBçW6‚‚âââ‡&W7öç6Ræ÷WGWBÇÂµÒ’“° ¢6öç7B&÷VæE&W7VÇG2Òv—B&öÖ—6RæÆÂ†6ÆÇ2æÖ†7–æ2†6ÆÂ’Óâ°¢6öç7B&w2Ò'6UFööÄ&wVÖVçG2†6ÆÂ“°¢FööÄ6ÆÇ4FV'VrçW6‚‡²&÷VæC¢&÷VæB²Â6ÆÄ–C¢6ÆÂæ6ÆÅö–BÂæÖS¢6ÆÂææÖRÂ&w2Ò“°¢–b†&w2åõ÷'6TW'&÷"’°¢&WGW&âFööÅ&W7VÇB‡²æÖS¢6ÆÂææÖRÇÂ'Væ¶æ÷vâ"Âö³¢fÇ6RÂ7FGW3¢&ÖÆf÷&ÖVEö&wVÖVçG2"ÂW'&÷#¢&w2åõ÷'6TW'&÷"Ò“°¢Ð¢6öç7B6–væGW&RÒ6ÆÂææÖRÓÓÒ&7&VFUöÖ–çFVææ6UöÆW'B ¢ò6ÆÂææÖP¢¢G¶6ÆÂææÖWÓ¢G´¥4ôâç7G&–æv–g’†&w2Âö&¦V7Bæ¶W—2†&w2’ç6÷'B‚’—Ö°¢–b‡6VVåFööÄ6ÆÇ2æ†2‡6–væGW&R’’°¢&WGW&âFööÅ&W7VÇB‡²æÖS¢6ÆÂææÖRÇÂ'Væ¶æ÷vâ"Âö³¢fÇ6RÂ7FGW3¢&GWÆ–6FU÷7W&W76VB"ÂFF¢²&V6öã¢'6ÖUöwVW7EöÖW76vR"ÒÒ“°¢Ð¢6VVåFööÄ6ÆÇ2æFB‡6–væGW&R“°¢&WGW&âv—F…F–ÖV÷WB†W†V7WFUFööÂ†6ÆÂææÖRÂ&w2Â°¢6W'f–6W2À¢7FFS¢v÷&¶–æu7FFRÀ¢ÖW76vW2À¢ÆFW7EW6W"À¢æ÷rÀ¢6W76–öä–BÀ¢wVW7D&–BÀ¢wVW7E6–rÀ¢vU6÷W&6RÀ¢6t&ææW"À¢ÆövvW"À¢Ò’ÂFööÅF–ÖV÷WD×2ÂFööÅòG¶6ÆÂææÖWÖ’æ6F6‚‚†W'&÷"’ÓâFööÅ&W7VÇB‡°¢æÖS¢6ÆÂææÖRÇÂ'Væ¶æ÷vâ"À¢ö³¢fÇ6RÀ¢7FGW3¢'F–ÖV÷WEö÷%öW'&÷""À¢W'&÷#¢W'&÷"æÖW76vRÀ¢Ò’“°¢Ò’“° ¢f÷"†ÆWB–æFW‚Ò²–æFW‚Â6ÆÇ2æÆVæwFƒ²–æFW‚³Ò’°¢6öç7B&W7VÇBÒ&÷VæE&W7VÇG5¶–æFW…Ó°¢FööÅ&W7VÇG2çW6‚‡&W7VÇB“°¢v÷&¶–æu7FFRÒÖW&vUFööÅF6‚‡v÷&¶–æu7FFRÂ&W7VÇBç7FFUF6‚“°¢–çWBçW6‚‡°¢G—S¢&gVæ7F–öåö6ÆÅö÷WGWB"À¢6ÆÅö–C¢6ÆÇ5¶–æFW…Òæ6ÆÅö–BÀ¢÷WGWC¢¥4ôâç7G&–æv–g’‡°¢ö³¢&W7VÇBæö²À¢7FGW3¢&W7VÇBç7FGW2À¢FF¢&W7VÇBæFFÀ¢W&Ç3¢&W7VÇBçW&Ç2À¢f7G3¢&W7VÇBæf7G2À¢W'&÷#¢&W7VÇBæW'&÷"À¢Ò’À¢Ò“°¢Ð¢Ð ¢–b‚f–æÅ&W7öç6RbbvVçDW'&÷"’°¢G'’°¢f–æÅ&W7öç6RÒv—B6ÆÅ&W7öç6W2†÷Væ’Â°¢ÖöFVÂÀ¢–çWC¢°¢ââæ–çWBÀ¢²&öÆS¢&FWfVÆ÷W""Â6öçFVçC¢%FööÂ'VFvWB—2W††W7FVBâw&—FRF†Rf–æÂwVW7BÖf6–ærç7vW"æ÷rg&öÒF†RfW&–f–VB7FFRæBFööÂ÷WGWG2âFòæ÷B6ÆÂæ÷F†W"FööÂâ"ÒÀ¢ÒÀ¢FööÅö6†ö–6S¢&æöæR"À¢&V6öæ–æs¢²Vff÷'C¢&Æ÷r"ÒÀ¢7F÷&S¢fÇ6RÀ¢Ö…ö÷WGWE÷Fö¶Vç3¢ƒÀ¢ÒÂvVçEF–ÖV÷WD×2Â&vVçEöf–æÅögFW%ö'VFvWB"“°¢Ò6F6‚†W'&÷"’°¢vVçDW'&÷"ÒW'&÷"æÖW76vS°¢Ð¢Ð ¢ÆWB&WÇ’Ò&W7öç6UFW‡B†f–æÅ&W7öç6R“°¢6öç7BÆÆ÷vVEW&Ç2Ò6öÆÆV7DÆÆ÷vVEW&Ç2‡FööÅ&W7VÇG2Âv÷&¶–æu7FFRÂ²–æ6ÇVFU7FFUfW&–f–VC¢fÇ6RÒ“°¢ÆWBfÆ–FF–öâÒfÆ–FFU&WÇ’‡°¢&WÇ’À¢ÆÆ÷vVEW&Ç2À¢FööÅ&W7VÇG2À¢7FFS¢v÷&¶–æu7FFRÀ¢ÆFW7EW6W"À¢&WV—&T7W'&VçEGW&åW&Ç3¢G'VRÀ¢Ò“° ¢–b‚&WÇ’ÇÂfÆ–FF–öâæö²’°¢G'’°¢6öç7B6÷'&V7FVBÒv—B6÷'&V7F—fU&Ww&—FR‡°¢÷Væ’À¢ÖöFVÂÀ¢7FFS¢v÷&¶–æu7FFRÀ¢ÆFW7EW6W"À¢FööÅ&W7VÇG2À¢ÆÆ÷vVEW&Ç2À¢f–öÆF–öç3¢fÆ–FF–öâçf–öÆF–öç2ÇÂ·²6öFS¢&V×G•÷&WÇ’"ÕÒÀ¢æ÷rÀ¢F–ÖV÷WD×3¢vVçEF–ÖV÷WD×2À¢Ò“°¢–b†6÷'&V7FVB’°¢&WÇ’Ò6÷'&V7FVC°¢fÆ–FF–öâÒfÆ–FFU&WÇ’‡²&WÇ’ÂÆÆ÷vVEW&Ç2ÂFööÅ&W7VÇG2Â7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Â&WV—&T7W'&VçEGW&åW&Ç3¢G'VRÒ“°¢Ð¢Ò6F6‚†W'&÷"’°¢vVçDW'&÷"ÇÃÒW'&÷"æÖW76vS°¢Ð¢Ð ¢–b‚&WÇ’ÇÂfÆ–FF–öâæö²’°¢&WÇ’Ò6fTfÆÆ&6²‡²7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Â&V6öã¢fÆ–FF–öâçf–öÆF–öç3òå³Óòæ6öFRÇÂvVçDW'&÷"ÇÂ&vVçEöf–ÇW&R"Ò“°¢Ð ¢v÷&¶–æu7FFRæÖWFæÆ7D–çFVçBÒ–çFVçDg&öÕ7FFR‡v÷&¶–æu7FFR“°¢v÷&¶–æu7FFRæÖWFçWFFVDBÒæWrFFR†æ÷r’çFô•4õ7G&–ær‚“°¢&WGW&â°¢&WÇ’À¢7FFS¢æ÷&ÖÆ—¦U7FFR‡v÷&¶–æu7FFR’À¢FööÅ&W7VÇG2À¢FWFV7FVD–çFVçC¢–çFVçDg&öÕ7FFR‡v÷&¶–æu7FFR’À¢FV'Vs¢°¢vVçF–3¢G'VRÀ¢“¢'&W7öç6W2"À¢ÖöFVÂÀ¢FööÄ6ÆÇ3¢FööÄ6ÆÇ4FV'VrÀ¢FööÅ&÷VæG3¢FööÄ6ÆÇ4FV'VræÆVæwF‚òÖF‚æÖ‚‚ââçFööÄ6ÆÇ4FV'VræÖ‚†—FVÒ’Óâ—FVÒç&÷VæB’’¢À¢&W7öç6U&÷VæG3¢&÷VæG2À¢vVçDW'&÷"À¢fÆ–FF–öâÀ¢ÆÆ÷vVEW&Ç3¢²ââæÆÆ÷vVEW&Ç5ÒÀ¢÷¦ä6µG—S¢÷¦ä6µG—RÇÂçVÆÂÀ¢&W7öç6TF–væ÷7F–72À¢ÒÀ¢Ó°§Ð 