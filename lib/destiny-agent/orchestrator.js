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
  if (latestUser ×n½öÚ$z{-®éÜj×ÖW76vRv2&VÆ–VBFò÷¦ââ"¢%F†R&VÆ’6÷VÆBæ÷B&R6öæf—&ÖVB26VçBâ%ÒÒÒÒ“°Ð¢ÐÐ Ð¢–b†æÖRÓÓÒ'&WVW7Eö÷væW%ö6†B"’°Ð¢–b‚FWFV7D÷væW$6†E&WVW7B†ÆFW7EW6W"’’&WGW&âFööÅ&W7VÇB‡²æÖRÂ¶–æC¢&÷væW%ö6†B"Âö³¢fÇ6RÂ7FGW3¢&æ÷EöW‡Æ–6—FÇ•÷&WVW7FVB"ÂFF¢·ÒÒ“°Ð¢–b‚6W76–öä–B’&WGW&âFööÅ&W7VÇB‡²æÖRÂ¶–æC¢&÷væW%ö6†B"Âö³¢fÇ6RÂ7FGW3¢&Ö—76–æu÷6W76–öâ"ÂFF¢·ÒÒ“°Ð¢6öç7BW†—7F–ærÒv—B6W'f–6W2ç&VE6W757FFR‡6W76–öä–B“°Ð¢6öç7BÇ&VG”–çf—FVBÒW†—7F–æsòæ÷¦ä7F—fRÓÓÒ%E%TR"ÇÂW†—7F–æsòæ÷¦ä7F—fRÓÓÒ%TäD”är#°Ð¢6öç7B–çf—FUFö¶VâÒW†—7F–æsòæ–çf—FUFö¶VâÇÂ'VffW"æg&öÒ†G·6W76–öä–GÓ¢G¶æWrFFR†æ÷r’ævWEF–ÖR‚—Ö’çFõ7G&–ær‚&&6ScGW&Â"’ç7V'7G&–ærƒÂ#“°Ð¢ÆWB6VçBÒ²6VçC¢fÇ6RÂVçFW$6†EW&Ã¢çVÆÂÓ°Ð¢–b‚Ç&VG”–çf—FVB’°Ð¢v—B6W'f–6W2çw&—FU6W757FFR‡6W76–öä–BÂ²÷¦ä7F—fS¢%TäD”är"Â–çf—FUFö¶VâÒ“°Ð¢6VçBÒv—B6W'f–6W2ç6VæD÷væW$6†D–çf—FR‡²6W76–öä–BÂwVW7DÖW76vS¢ÆFW7EW6W"Â–çf—FUFö¶VâÒ“°Ð¢ÐÐ¢òòF†R÷væW"ÖVçG'’U$Â—2–çFW&æÂâ—B—26VçBöæÇ’Fò÷¦âf–F—66÷&Bæ@Ð¢òò—2FVÆ–&W&FVÇ’öÖ—GFVBg&öÒÖöFVÂ×f—6–&ÆRFFæBF†R&WÇ’U$ÂÆÆ÷rÖÆ—7BàÐ¢&WGW&âFööÅ&W7VÇB‡²æÖRÂ¶–æC¢&÷væW%ö6†B"Â7FGW3¢Ç&VG”–çf—FVBò&Ç&VG•ö–çf—FVB"¢6VçBç6VçBò&–çf—FVB"¢&–çf—FUöf–ÆVB"Âö³¢Ç&VG”–çf—FVBÇÂ6VçBç6VçBÂFF¢²Ç&VG”–çf—FVBÂ6VçC¢6VçBç6VçBÒÂW&Ç3¢µÒÂf7G3¢¶Ç&VG”–çf—FVBò$÷¦âv2Ç&VG’–çf—FVBFòF†—26†Bâ"¢6VçBç6VçBò$÷¦âv2–çf—FVBFòF†—26†Bâ"¢%F†R÷væW"Ö6†B–çf—FF–öâ6÷VÆBæ÷B&R6öæf—&ÖVBâ%ÒÂ7FFUF6ƒ¢²÷væW$6†C¢²7F—fS¢fÇ6RÂVæF–æs¢G'VRÂ–çf—FVDC¢æWrFFR†æ÷r’çFô•4õ7G&–ær‚’ÒÒÒ“°Ð¢ÐÐ Ð¢–b†æÖRÓÓÒ&vWEö'W6–æW75ö¶æ÷vÆVFvR"’°Ð¢6öç7B&W7VÇBÒ6V&6„'W6–æW74¶æ÷vÆVFvR‡°Ð¢VW'“¢7G&–ær†&w2çVW'’ÇÂÆFW7EW6W"ÇÂ""’ç6Æ–6RƒÂ3’ÀÐ¢F÷–73¢'&’æ—4'&’†&w2çF÷–72’ò&w2çF÷–72¢µÒÀÐ¢Æ–Ö—C¢çVÖ&W"†&w2æÆ–Ö—B’ÇÂ‚ÀÐ¢Ò“°Ð¢&WGW&âFööÅ&W7VÇB‡°Ð¢æÖRÀÐ¢¶–æC¢&¶æ÷vÆVFvR"ÀÐ¢ö³¢&W7VÇBç6æ—WG2æÆVæwF‚âÀÐ¢7FGW3¢&W7VÇBç6æ—WG2æÆVæwF‚âò'7V66W72"¢&æõöÖF6‚"ÀÐ¢FF¢²VW'“¢&W7VÇBçVW'’ÂF÷–73¢&W7VÇBçF÷–72Â6æ—WG3¢&W7VÇBç6æ—WG2ÒÀÐ¢W&Ç3¢&W7VÇBçW&Ç2ÀÐ¢f7G3¢&W7VÇBç6æ—WG2æÖ†—FVÒÓâ—FVÒçFW‡B’ÀÐ¢7FFUF6ƒ¢²fW&–f–VC¢²f7G3¢&W7VÇBç6æ—WG2æÖ†—FVÒÓâ—FVÒçFW‡B’ç6Æ–6RƒÂ"’Â&ÆöuW&Ç3¢&W7VÇBçW&Ç2ÒÒÀÐ¢Ò“°Ð¢ÐÐ Ð¢&WGW&âFööÅ&W7VÇB‡²æÖRÂö³¢fÇ6RÂ7FGW3¢'Væ¶æ÷vå÷FööÂ"ÂW'&÷#¢Væ¶æ÷vâFööÃ¢G¶æÖWÖÒ“°Ð¢Ò6F6‚†W'&÷"’°Ð¢ÆövvW"æW'&÷"†FööÂG¶æÖWÒf–ÆVC¦ÂW'&÷"“°Ð¢&WGW&âFööÅ&W7VÇB‡²æÖRÂö³¢fÇ6RÂ7FGW3¢&W'&÷""ÂW'&÷#¢W'&÷"æÖW76vRÂFF¢·ÒÒ“°Ð¢ÐÐ§ÐÐ Ð¦gVæ7F–öâ'6UFööÄ&wVÖVçG2‡FööÄ6ÆÂ’°Ð¢G'’°Ð¢6öç7B&rÒFööÄ6ÆÃòæ&wVÖVçG2óòFööÄ6ÆÃòægVæ7F–öãòæ&wVÖVçG2óò'·Ò#°Ð¢6öç7B'6VBÒG—Vöb&rÓÓÒ'7G&–ær"ò¥4ôâç'6R‡&rÇÂ'·Ò"’¢&s°Ð¢&WGW&â'6VBbbG—Vöb'6VBÓÓÒ&ö&¦V7B"bb'&’æ—4'&’‡'6VB’ò'6VB¢·Ó°Ð¢Ò6F6‚†W'&÷"’°Ð¢&WGW&â²õ÷'6TW'&÷#¢W'&÷"æÖW76vRÓ°Ð¢ÐÐ§ÐÐ Ð¦W‡÷'B7–æ2gVæ7F–öâÇ•6fWG”&6·7F÷2‡²7FFRÂÆFW7EW6W"Â6W'f–6W2Â6W76–öä–BÂæ÷rÒ’°Ð¢ÆWBæW‡BÒæ÷&ÖÆ—¦U7FFR‡7FFRÇÂ7&VFTFVfVÇE7FFR‚’“°Ð¢æW‡BæfÆw2ç66Ô7&—6—2ÒFWFV7E66Ô7&—6—2†ÆFW7EW6W"“°Ð¢æW‡BæfÆw2æ&VG&ööÔÖ—6ÖF6‚ÒæW‡BæfÆw2æ&VG&ööÔÖ—6ÖF6‚ÇÂFWFV7D&VG&ööÔÖ—6ÖF6‚†ÆFW7EW6W"“°Ð¢æW‡BæfÆw2çWG4ÖVçF–öæVBÒæW‡BæfÆw2çWG4ÖVçF–öæVBÇÂFWFV7EWG2†ÆFW7EW6W"“°Ð¢æW‡BæfÆw2æW‡FW&æÄF—7GW&&æ6RÒFWFV7DW‡FW&æÄF—7GW&&æ6R†ÆFW7EW6W"“°Ð¢æW‡BæfÆw2æ66–FVçFÄFÖvRÒFWFV7D66–FVçFÄFÖvR†ÆFW7EW6W"“°Ð¢–b†æW‡BæfÆw2æ&VG&ööÔÖ—6ÖF6‚bbæW‡Bæ&öö¶–æræ&VG&öö×5&WVW7FVB’°Ð¢6öç7BÖF6‚Ò7G&–ær†ÆFW7EW6W"’æÖF6‚‚õÆ"ƒ'Ã7ÃGÇGv÷ÇF‡&VWÆf÷W"•Ç2¢ƒó¦&VBƒó§&ööÒ“÷3÷Æ'"•Æ"ö’“°Ð¢6öç7BfÇVW2Ò²Gvó¢"ÂF‡&VS¢2Âf÷W#¢BÓ°Ð¢æW‡Bæ&öö¶–æræ&VG&öö×5&WVW7FVBÒÖF6‚òçVÖ&W"†ÖF6…³Ò’ÇÂfÇVW5¶ÖF6…³ÒçFôÆ÷vW$66R‚•Ò¢#°Ð¢ÐÐ¢–b†æW‡BæfÆw2ç66Ô7&—6—2’°Ð¢æW‡BæÖöFRÒ&Æö6Åö–æfò#°Ð¢&WGW&â²7FFS¢æW‡BÂFööÅ&W7VÇG3¢µÒÓ°Ð¢ÐÐ Ð¢6öç7BVÖW&vVæ7’ÒFWFV7DÆö6¶VD÷WB†ÆFW7EW6W"’ÇÂöv26ÖVÆÇÆf—&R–çÆÖVF–6ÂVÖW&vVæ7—Æ6âwB'&VF†WÆ6çB'&VF†Rö’çFW7B†ÆFW7EW6W"“°Ð¢6öç7BÖ–çFVææ6RÒFWFV7DÖ–çFVææ6R†ÆFW7EW6W"’bbæW‡BæfÆw2æ66–FVçFÄFÖvRbbæW‡BæfÆw2æW‡FW&æÄF—7GW&&æ6S°Ð¢–b‚VÖW&vVæ7’bbÖ–çFVææ6R’&WGW&â²7FFS¢æW‡BÂFööÅ&W7VÇG3¢µÒÓ°Ð¢6öç7B6WfW&—G’ÒVÖW&vVæ7’ò&VÖW&vVæ7’"¢&Ö–çFVææ6R#°Ð¢6öç7B&W7VÇBÒv—BW†V7WFUFööÂ‚&7&VFUöÖ–çFVææ6UöÆW'B"Â²6WfW&—G’Â7VÖÖ'“¢W‡G&7D—77VTFW67&—F–öâ†ÆFW7EW6W"’ÇÂ$wVW7B&W÷'FVBâ—77VR"ÒÂ²6W'f–6W2Â7FFS¢æW‡BÂÆFW7EW6W"Âæ÷rÂ6W76–öä–BÂwVW7D&–C¢çVÆÂÂwVW7E6–s¢çVÆÂÂvU6÷W&6S¢çVÆÂÂ6t&ææW#¢fÇ6RÒ“°Ð¢æW‡BÒÖW&vUFööÅF6‚†æW‡BÂ&W7VÇBç7FFUF6‚“°Ð¢&WGW&â²7FFS¢æW‡BÂFööÅ&W7VÇG3¢·&W7VÇEÒÓ°Ð§ÐÐ Ð¦gVæ7F–öâ–çFVçDg&öÕ7FFR‡7FFR’°Ð¢–b‡7FFRæÖöFRÓÓÒ&VÖW&vVæ7’"’&WGW&â$TÔU$tTä5’#°Ð¢–b‡7FFRæÖöFRÓÓÒ&Ö–çFVææ6R"’&WGW&â$Ô”åDTää4R#°Ð¢–b‡7FFRæ÷væW$6†CòçVæF–ærÇÂ7FFRæ÷væW$6†Còæ7F—fR’&WGW&â$õ¤åô5D•dR#°Ð¢&WGW&â$”ädò#°Ð§ÐÐ Ð¦7–æ2gVæ7F–öâ6ÆÄ6†D6ö×ÆWF–öâ†÷Væ’Â–ÆöBÂF–ÖV÷WD×2ÂÆ&VÂ’°Ð¢&WGW&âv—F…F–ÖV÷WB†÷Væ’æ6†Bæ6ö×ÆWF–öç2æ7&VFR‡–ÆöB’ÂF–ÖV÷WD×2ÂÆ&VÂ“°Ð§ÐÐ Ð Ð¦W‡÷'B6öç7B$U5ôå4UõDôôÅôDTd”ä•D”ôå2Òö&¦V7Bæg&VW¦R…DôôÅôDTd”ä•D”ôå2æÖ‚‡FööÂ’Óâ‡°Ð¢G—S¢&gVæ7F–öâ"ÀÐ¢æÖS¢FööÂægVæ7F–öâææÖRÀÐ¢FW67&—F–öã¢FööÂægVæ7F–öâæFW67&—F–öâÀÐ¢&ÖWFW'3¢FööÂægVæ7F–öâç&ÖWFW'2ÀÐ¢7G&–7C¢fÇ6RÀÐ§Ò’’“°Ð Ð¦gVæ7F–öâ&W7öç6TgVæ7F–öä6ÆÇ2‡&W7öç6R’°Ð¢&WGW&â‡&W7öç6Sòæ÷WGWBÇÂµÒ’æf–ÇFW"‚†—FVÒ’Óâ—FVÓòçG—RÓÓÒ&gVæ7F–öåö6ÆÂ"“°Ð§ÐÐ Ð¦gVæ7F–öâ&W7öç6UFW‡B‡&W7öç6R’°Ð¢–b‡G—Vöb&W7öç6Sòæ÷WGWE÷FW‡BÓÓÒ'7G&–ær"bb&W7öç6Ræ÷WGWE÷FW‡BçG&–Ò‚’’&WGW&â&W7öç6Ræ÷WGWE÷FW‡BçG&–Ò‚“°Ð¢6öç7B'G2ÒµÓ°Ð¢f÷"†6öç7B—FVÒöb&W7öç6Sòæ÷WGWBÇÂµÒ’°Ð¢–b†—FVÓòçG—RÓÒ&ÖW76vR"’6öçF–çVS°Ð¢f÷"†6öç7B6öçFVçBöb—FVÒæ6öçFVçBÇÂµÒ’°Ð¢–b‚†6öçFVçCòçG—RÓÓÒ&÷WGWE÷FW‡B"ÇÂ6öçFVçCòçG—RÓÓÒ'FW‡B"’bb6öçFVçBçFW‡B’'G2çW6‚†6öçFVçBçFW‡B“°Ð¢ÐÐ¢ÐÐ¢&WGW&â'G2æ¦ö–â‚%Æâ"’çG&–Ò‚“°Ð§ÐÐ Ð¦gVæ7F–öâ6öçfW'6F–öä–çWB†ÖW76vW2’°Ð¢&WGW&â„'&’æ—4'&’†ÖW76vW2’òÖW76vW2¢µÒÐ¢æf–ÇFW"‚†ÖW76vR’ÓâÖW76vRbb²'W6W""Â&76—7FçB%Òæ–æ6ÇVFW2†ÖW76vRç&öÆR’Ð¢ç6Æ–6R‚Ó#BÐ¢æÖ‚†ÖW76vR’Óâ‡²&öÆS¢ÖW76vRç&öÆRÂ6öçFVçC¢7G&–ær†ÖW76vRæ6öçFVçBÇÂ""’Ò’“°Ð§ÐÐ Ð¦7–æ2gVæ7F–öâ6ÆÅ&W7öç6W2†÷Væ’Â–ÆöBÂF–ÖV÷WD×2ÂÆ&VÂ’°Ð¢–b‚÷Væ“òç&W7öç6W3òæ7&VFR’°Ð¢F‡&÷ræWrW'&÷"‚$÷Vä’&W7öç6W2’—2Væf–Æ&ÆRâWw&FRF†R÷Væ’çÒ6¶vR&Vf÷&RFWÆ÷––ær6†BÖvVçBâ"“°Ð¢ÐÐ¢&WGW&âv—F…F–ÖV÷WB†÷Væ’ç&W7öç6W2æ7&VFR‡–ÆöB’ÂF–ÖV÷WD×2ÂÆ&VÂ“°Ð§ÐÐ Ð¦7–æ2gVæ7F–öâ6÷'&V7F—fU&Ww&—FR‡²÷Væ’ÂÖöFVÂÂ7FFRÂÆFW7EW6W"ÂFööÅ&W7VÇG2ÂÆÆ÷vVEW&Ç2Âf–öÆF–öç2Âæ÷rÂF–ÖV÷WD×2Ò’°Ð¢6öç7B–ç7G'V7F–öç2Ò'V–ÆD6÷'&V7F–öä–ç7G'V7F–öç2‡°Ð¢7FFRÀÐ¢ÆFW7EW6W"ÀÐ¢FööÅ&W7VÇG2ÀÐ¢ÆÆ÷vVEW&Ç2ÀÐ¢f–öÆF–öç2ÀÐ¢FöF“¢FöF”—6ò†æ÷r’ÀÐ¢7W'&VçEF–ÖS¢æ÷rçFôÆö6ÆUF–ÖU7G&–ær‚&VâÕU2"Â²F–ÖU¦öæS¢$ÖW&–6ô6†–6vò"Â†÷W#¢&çVÖW&–2"ÂÖ–çWFS¢#"ÖF–v—B"Â†÷W##¢G'VRÒ’ÀÐ¢Ò“°Ð¢6öç7B&W7öç6RÒv—B6ÆÅ&W7öç6W2†÷Væ’Â°Ð¢ÖöFVÂÀÐ¢–çWC¢·²&öÆS¢&FWfVÆ÷W""Â6öçFVçC¢–ç7G'V7F–öç2ÕÒÀÐ¢FööÅö6†ö–6S¢&æöæR"ÀÐ¢&V6öæ–æs¢²Vff÷'C¢&Æ÷r"ÒÀÐ¢7F÷&S¢fÇ6RÀÐ¢Ö…ö÷WGWE÷Fö¶Vç3¢#ÀÐ¢ÒÂF–ÖV÷WD×2Â&vVçEö6÷'&V7F–öâ"“°Ð¢&WGW&â&W7öç6UFW‡B‡&W7öç6R“°Ð§ÐÐ Ð¦W‡÷'B7–æ2gVæ7F–öâ'VävVçEGW&â‡°Ð¢÷Væ’ÀÐ¢ÖöFVÂÒ&wBÓRÖÖ–æ’"ÀÐ¢6W'f–6W2ÀÐ¢7FFRÀÐ¢ÖW76vW2ÀÐ¢ÆFW7EW6W"ÀÐ¢6W76–öä–BÀÐ¢wVW7D&–BÒçVÆÂÀÐ¢wVW7E6–rÒçVÆÂÀÐ¢vU6÷W&6RÒçVÆÂÀ¢F–6¶W%Væ—BÒçVÆÂÀ¢6t&ææW"ÒfÇ6RÀ¢÷¦ä6µG—RÒçVÆÂÀÐ¢æ÷rÒæWrFFR‚’ÀÐ¢ÆövvW"Ò6öç6öÆRÀÐ¢Ö…FööÅ&÷VæG2ÒBÀÐ¢FööÅF–ÖV÷WD×2Ò#ÀÐ¢vVçEF–ÖV÷WD×2Ò#SÀÐ§Ò’°Ð¢ÆWBv÷&¶–æu7FFRÒæ÷&ÖÆ—¦U7FFR‡7FFRÇÂ7&VFTFVfVÇE7FFR‚’“°Ð¢6öç7B6fWG’Òv—BÇ•6fWG”&6·7F÷2‡²7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Â6W'f–6W2Â6W76–öä–BÂæ÷rÒ“°¢v÷&¶–æu7FFRÒ6fWG’ç7FFS°¢6öç7BFööÅ&W7VÇG2Ò²ââç6fWG’çFööÅ&W7VÇG5Ó°¢6öç7B6VVåFööÄ6ÆÇ2ÒæWr6WB‡6fWG’çFööÅ&W7VÇG2æÖ‡&W7VÇBÓâ&W7VÇCòææÖR’æf–ÇFW"„&ööÆVâ’æÖ†æÖRÓâæÖRÓÓÒ&7&VFUöÖ–çFVææ6UöÆW'B"òæÖR¢çVÆÂ’æf–ÇFW"„&ööÆVâ’“° Ð¢–b‡v÷&¶–æu7FFRæfÆw2ç66Ô7&—6—2’°Ð¢6öç7B&WÇ’Ò6fTfÆÆ&6²‡²7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Ò“°Ð¢&WGW&â°Ð¢&WÇ’ÀÐ¢7FFS¢v÷&¶–æu7FFRÀÐ¢FööÅ&W7VÇG2ÀÐ¢FWFV7FVD–çFVçC¢–çFVçDg&öÕ7FFR‡v÷&¶–æu7FFR’ÀÐ¢FV'Vs¢²vVçF–3¢G'VRÂ6fWG”–çFW&6WC¢'66Õö7&—6—2"ÂFööÄ6ÆÇ3¢µÒÂFööÅ&÷VæG3¢ÂfÆ–FF–öã¢²ö³¢G'VRÂf–öÆF–öç3¢µÒÒÒÀÐ¢Ó°Ð¢ÐÐ Ð¢6öç7B–ç7G'V7F–öç2Ò'V–ÆDvVçD–ç7G'V7F–öç2‡°Ð¢7FFS¢v÷&¶–æu7FFRÀÐ¢ÆFW7EW6W"ÀÐ¢FöF“¢FöF”—6ò†æ÷r’ÀÐ¢7W'&VçEF–ÖS¢æ÷rçFôÆö6ÆUF–ÖU7G&–ær‚&VâÕU2"Â²F–ÖU¦öæS¢$ÖW&–6ô6†–6vò"Â†÷W#¢&çVÖW&–2"ÂÖ–çWFS¢#"ÖF–v—B"Â†÷W##¢G'VRÒ’ÀÐ¢vU6÷W&6RÀ¢F–6¶W%Væ—BÀ¢W†—7F–ætwVW7C¢v÷&¶–æu7FFRæW†—7F–ætwVW7CòæWF†÷&—¦VBÓÓÒG'VRÀ¢&–÷%FööÅ&W7VÇG3¢6fWG’çFööÅ&W7VÇG2ÀÐ¢Ò“°Ð Ð¢6öç7B–çWBÒ°Ð¢²&öÆS¢&FWfVÆ÷W""Â6öçFVçC¢–ç7G'V7F–öç2ÒÀÐ¢ââæ6öçfW'6F–öä–çWB†ÖW76vW2’ÀÐ¢Ó°Ð¢6öç7BFööÄ6ÆÇ4FV'VrÒµÓ°Ð¢ÆWBf–æÅ&W7öç6RÒçVÆÃ°Ð¢ÆWBvVçDW'&÷"ÒçVÆÃ°Ð¢ÆWB&÷VæG2Ò°Ð¢6öç7B&W7öç6TF–væ÷7F–72ÒµÓ°Ð Ð¢f÷"†ÆWB&÷VæBÒ²&÷VæBÂÖ…FööÅ&÷VæG3²&÷VæB³Ò’°Ð¢&÷VæG2Ò&÷VæB²°Ð¢ÆWB&W7öç6S°Ð¢G'’°Ð¢&W7öç6RÒv—B6ÆÅ&W7öç6W2†÷Væ’Â°Ð¢ÖöFVÂÀÐ¢–çWBÀÐ¢FööÇ3¢$U5ôå4UõDôôÅôDTd”ä•D”ôå2ÀÐ¢FööÅö6†ö–6S¢&WFò"ÀÐ¢&ÆÆVÅ÷FööÅö6ÆÇ3¢G'VRÀÐ¢&V6öæ–æs¢²Vff÷'C¢&Æ÷r"ÒÀÐ¢7F÷&S¢fÇ6RÀÐ¢Ö…ö÷WGWE÷Fö¶Vç3¢ƒÀÐ¢ÒÂvVçEF–ÖV÷WD×2ÂvVçE÷&÷VæEòG·&÷VæB²Ö“°Ð¢Ò6F6‚†W'&÷"’°Ð¢vVçDW'&÷"ÒW'&÷"æÖW76vS°Ð¢'&V³°Ð¢ÐÐ Ð¢&W7öç6TF–væ÷7F–72çW6‚‡°Ð¢&÷VæC¢&÷VæB²ÀÐ¢–C¢&W7öç6Sòæ–BÇÂçVÆÂÀÐ¢7FGW3¢&W7öç6Sòç7FGW2ÇÂçVÆÂÀÐ¢–æ6ö×ÆWFU&V6öã¢&W7öç6Sòæ–æ6ö×ÆWFUöFWF–Ç3òç&V6öâÇÂçVÆÂÀÐ¢÷WGWEG—W3¢‡&W7öç6Sòæ÷WGWBÇÂµÒ’æÖ‚†—FVÒ’Óâ—FVÓòçG—RÇÂ'Væ¶æ÷vâ"’ÀÐ¢÷WGWEFö¶Vç3¢&W7öç6SòçW6vSòæ÷WGWE÷Fö¶Vç2óòçVÆÂÀÐ¢&V6öæ–æuFö¶Vç3¢&W7öç6SòçW6vSòæ÷WGWE÷Fö¶Vç5öFWF–Ç3òç&V6öæ–æu÷Fö¶Vç2óòçVÆÂÀÐ¢†4÷WGWEFW‡C¢&ööÆVâ‡&W7öç6UFW‡B‡&W7öç6R’’ÀÐ¢Ò“°Ð Ð¢6öç7B6ÆÇ2Ò&W7öç6TgVæ7F–öä6ÆÇ2‡&W7öç6R“°Ð¢–b‚6ÆÇ2æÆVæwF‚’°Ð¢f–æÅ&W7öç6RÒ&W7öç6S°Ð¢'&V³°Ð¢ÐÐ Ð¢òò&W6W'fRWfW'’ÖöFVÂ÷WGWB—FVÒÂ–æ6ÇVF–ær&V6öæ–ær—FV×2Â&Vf÷&RFF–æpÐ¢òògVæ7F–öâ÷WGWG2âF†—2—2F†RFö7VÖVçFVB&W7öç6W2’6öçF–çVF–öâGFW&âàÐ¢–çWBçW6‚‚âââ‡&W7öç6Ræ÷WGWBÇÂµÒ’“°Ð Ð¢6öç7B&÷VæE&W7VÇG2Òv—B&öÖ—6RæÆÂ†6ÆÇ2æÖ†7–æ2†6ÆÂ’Óâ°¢6öç7B&w2Ò'6UFööÄ&wVÖVçG2†6ÆÂ“°¢FööÄ6ÆÇ4FV'VrçW6‚‡²&÷VæC¢&÷VæB²Â6ÆÄ–C¢6ÆÂæ6ÆÅö–BÂæÖS¢6ÆÂææÖRÂ&w2Ò“°¢–b†&w2åõ÷'6TW'&÷"’°¢&WGW&âFööÅ&W7VÇB‡²æÖS¢6ÆÂææÖRÇÂ'Væ¶æ÷vâ"Âö³¢fÇ6RÂ7FGW3¢&ÖÆf÷&ÖVEö&wVÖVçG2"ÂW'&÷#¢&w2åõ÷'6TW'&÷"Ò“°¢Ð¢6öç7B6–væGW&RÒ6ÆÂææÖRÓÓÒ&7&VFUöÖ–çFVææ6UöÆW'B ¢ò6ÆÂææÖP¢¢G¶6ÆÂææÖWÓ¢G´¥4ôâç7G&–æv–g’†&w2Âö&¦V7Bæ¶W—2†&w2’ç6÷'B‚’—Ö°¢–b‡6VVåFööÄ6ÆÇ2æ†2‡6–væGW&R’’°¢&WGW&âFööÅ&W7VÇB‡²æÖS¢6ÆÂææÖRÇÂ'Væ¶æ÷vâ"Âö³¢fÇ6RÂ7FGW3¢&GWÆ–6FU÷7W&W76VB"ÂFF¢²&V6öã¢'6ÖUöwVW7EöÖW76vR"ÒÒ“°¢Ð¢6VVåFööÄ6ÆÇ2æFB‡6–væGW&R“°¢&WGW&âv—F…F–ÖV÷WB†W†V7WFUFööÂ†6ÆÂææÖRÂ&w2Â°¢6W'f–6W2ÀÐ¢7FFS¢v÷&¶–æu7FFRÀÐ¢ÖW76vW2ÀÐ¢ÆFW7EW6W"ÀÐ¢æ÷rÀÐ¢6W76–öä–BÀÐ¢wVW7D&–BÀÐ¢wVW7E6–rÀÐ¢vU6÷W&6RÀÐ¢6t&ææW"ÀÐ¢ÆövvW"ÀÐ¢Ò’ÂFööÅF–ÖV÷WD×2ÂFööÅòG¶6ÆÂææÖWÖ’æ6F6‚‚†W'&÷"’ÓâFööÅ&W7VÇB‡°Ð¢æÖS¢6ÆÂææÖRÇÂ'Væ¶æ÷vâ"ÀÐ¢ö³¢fÇ6RÀÐ¢7FGW3¢'F–ÖV÷WEö÷%öW'&÷""ÀÐ¢W'&÷#¢W'&÷"æÖW76vRÀÐ¢Ò’“°Ð¢Ò’“°Ð Ð¢f÷"†ÆWB–æFW‚Ò²–æFW‚Â6ÆÇ2æÆVæwFƒ²–æFW‚³Ò’°Ð¢6öç7B&W7VÇBÒ&÷VæE&W7VÇG5¶–æFW…Ó°Ð¢FööÅ&W7VÇG2çW6‚‡&W7VÇB“°Ð¢v÷&¶–æu7FFRÒÖW&vUFööÅF6‚‡v÷&¶–æu7FFRÂ&W7VÇBç7FFUF6‚“°Ð¢–çWBçW6‚‡°Ð¢G—S¢&gVæ7F–öåö6ÆÅö÷WGWB"ÀÐ¢6ÆÅö–C¢6ÆÇ5¶–æFW…Òæ6ÆÅö–BÀÐ¢÷WGWC¢¥4ôâç7G&–æv–g’‡°Ð¢ö³¢&W7VÇBæö²ÀÐ¢7FGW3¢&W7VÇBç7FGW2ÀÐ¢FF¢&W7VÇBæFFÀÐ¢W&Ç3¢&W7VÇBçW&Ç2ÀÐ¢f7G3¢&W7VÇBæf7G2ÀÐ¢W'&÷#¢&W7VÇBæW'&÷"ÀÐ¢Ò’ÀÐ¢Ò“°Ð¢ÐÐ¢ÐÐ Ð¢–b‚f–æÅ&W7öç6RbbvVçDW'&÷"’°Ð¢G'’°Ð¢f–æÅ&W7öç6RÒv—B6ÆÅ&W7öç6W2†÷Væ’Â°Ð¢ÖöFVÂÀÐ¢–çWC¢°Ð¢ââæ–çWBÀÐ¢²&öÆS¢&FWfVÆ÷W""Â6öçFVçC¢%FööÂ'VFvWB—2W††W7FVBâw&—FRF†Rf–æÂwVW7BÖf6–ærç7vW"æ÷rg&öÒF†RfW&–f–VB7FFRæBFööÂ÷WGWG2âFòæ÷B6ÆÂæ÷F†W"FööÂâ"ÒÀÐ¢ÒÀÐ¢FööÅö6†ö–6S¢&æöæR"ÀÐ¢&V6öæ–æs¢²Vff÷'C¢&Æ÷r"ÒÀÐ¢7F÷&S¢fÇ6RÀÐ¢Ö…ö÷WGWE÷Fö¶Vç3¢ƒÀÐ¢ÒÂvVçEF–ÖV÷WD×2Â&vVçEöf–æÅögFW%ö'VFvWB"“°Ð¢Ò6F6‚†W'&÷"’°Ð¢vVçDW'&÷"ÒW'&÷"æÖW76vS°Ð¢ÐÐ¢ÐÐ Ð¢ÆWB&WÇ’Ò&W7öç6UFW‡B†f–æÅ&W7öç6R“°Ð¢6öç7BÆÆ÷vVEW&Ç2Ò6öÆÆV7DÆÆ÷vVEW&Ç2‡FööÅ&W7VÇG2Âv÷&¶–æu7FFRÂ²–æ6ÇVFU7FFUfW&–f–VC¢fÇ6RÒ“°Ð¢ÆWBfÆ–FF–öâÒfÆ–FFU&WÇ’‡°Ð¢&WÇ’ÀÐ¢ÆÆ÷vVEW&Ç2ÀÐ¢FööÅ&W7VÇG2ÀÐ¢7FFS¢v÷&¶–æu7FFRÀÐ¢ÆFW7EW6W"ÀÐ¢&WV—&T7W'&VçEGW&åW&Ç3¢G'VRÀÐ¢Ò“°Ð Ð¢–b‚&WÇ’ÇÂfÆ–FF–öâæö²’°Ð¢G'’°Ð¢6öç7B6÷'&V7FVBÒv—B6÷'&V7F—fU&Ww&—FR‡°Ð¢÷Væ’ÀÐ¢ÖöFVÂÀÐ¢7FFS¢v÷&¶–æu7FFRÀÐ¢ÆFW7EW6W"ÀÐ¢FööÅ&W7VÇG2ÀÐ¢ÆÆ÷vVEW&Ç2ÀÐ¢f–öÆF–öç3¢fÆ–FF–öâçf–öÆF–öç2ÇÂ·²6öFS¢&V×G•÷&WÇ’"ÕÒÀÐ¢æ÷rÀÐ¢F–ÖV÷WD×3¢vVçEF–ÖV÷WD×2ÀÐ¢Ò“°Ð¢–b†6÷'&V7FVB’°Ð¢&WÇ’Ò6÷'&V7FVC°Ð¢fÆ–FF–öâÒfÆ–FFU&WÇ’‡²&WÇ’ÂÆÆ÷vVEW&Ç2ÂFööÅ&W7VÇG2Â7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Â&WV—&T7W'&VçEGW&åW&Ç3¢G'VRÒ“°Ð¢ÐÐ¢Ò6F6‚†W'&÷"’°Ð¢vVçDW'&÷"ÇÃÒW'&÷"æÖW76vS°Ð¢ÐÐ¢ÐÐ Ð¢–b‚&WÇ’ÇÂfÆ–FF–öâæö²’°Ð¢&WÇ’Ò6fTfÆÆ&6²‡²7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Â&V6öã¢fÆ–FF–öâçf–öÆF–öç3òå³Óòæ6öFRÇÂvVçDW'&÷"ÇÂ&vVçEöf–ÇW&R"Ò“°Ð¢ÐÐ Ð¢v÷&¶–æu7FFRæÖWFæÆ7D–çFVçBÒ–çFVçDg&öÕ7FFR‡v÷&¶–æu7FFR“°Ð¢v÷&¶–æu7FFRæÖWFçWFFVDBÒæWrFFR†æ÷r’çFô•4õ7G&–ær‚“°Ð¢&WGW&â°Ð¢&WÇ’ÀÐ¢7FFS¢æ÷&ÖÆ—¦U7FFR‡v÷&¶–æu7FFR’ÀÐ¢FööÅ&W7VÇG2ÀÐ¢FWFV7FVD–çFVçC¢–çFVçDg&öÕ7FFR‡v÷&¶–æu7FFR’ÀÐ¢FV'Vs¢°Ð¢vVçF–3¢G'VRÀÐ¢“¢'&W7öç6W2"ÀÐ¢ÖöFVÂÀÐ¢FööÄ6ÆÇ3¢FööÄ6ÆÇ4FV'VrÀÐ¢FööÅ&÷VæG3¢FööÄ6ÆÇ4FV'VræÆVæwF‚òÖF‚æÖ‚‚ââçFööÄ6ÆÇ4FV'VræÖ‚†—FVÒ’Óâ—FVÒç&÷VæB’’¢ÀÐ¢&W7öç6U&÷VæG3¢&÷VæG2ÀÐ¢vVçDW'&÷"ÀÐ¢fÆ–FF–öâÀÐ¢ÆÆ÷vVEW&Ç3¢²ââæÆÆ÷vVEW&Ç5ÒÀÐ¢÷¦ä6µG—S¢÷¦ä6µG—RÇÂçVÆÂÀÐ¢&W7öç6TF–væ÷7F–72ÀÐ¢ÒÀÐ¢Ó°Ð§ÐÐ 