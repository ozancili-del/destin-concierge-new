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
      description: "Build one complete TripShock affiliate link for a validated activity category. Call this for every TripShock-covered activity you recommend, including suggestions introduced by you during a broader local-guide or rainy-day answer. This is a link builder, not a live TripShock inventory search. When the guest supplied dates, preserve the full range and pass normalized ISO start_date and end_date.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string", enum: Object.keys(TRIPSHOCK_CATEGORIES) },
          date_text: { ...nullableString, description: "Exact verbatÛN=îÚ$z{-®éÜj×E÷FW‡BÓÓÒ'7G&–ær"bb&W7öç6Ræ÷WGWE÷FW‡BçG&–Ò‚’’&WGW&â&W7öç6Ræ÷WGWE÷FW‡BçG&–Ò‚“°Ğ¢6öç7B'G2ÒµÓ°Ğ¢f÷"†6öç7B—FVÒöb&W7öç6Sòæ÷WGWBÇÂµÒ’°Ğ¢–b†—FVÓòçG—RÓÒ&ÖW76vR"’6öçF–çVS°Ğ¢f÷"†6öç7B6öçFVçBöb—FVÒæ6öçFVçBÇÂµÒ’°Ğ¢–b‚†6öçFVçCòçG—RÓÓÒ&÷WGWE÷FW‡B"ÇÂ6öçFVçCòçG—RÓÓÒ'FW‡B"’bb6öçFVçBçFW‡B’'G2çW6‚†6öçFVçBçFW‡B“°Ğ¢ĞĞ¢ĞĞ¢&WGW&â'G2æ¦ö–â‚%Æâ"’çG&–Ò‚“°Ğ§ĞĞ Ğ¦gVæ7F–öâ6öçfW'6F–öä–çWB†ÖW76vW2’°¢6öç7B6æF–FFW2Ò„'&’æ—4'&’†ÖW76vW2’òÖW76vW2¢µÒ¢æf–ÇFW"‚†ÖW76vR’ÓâÖW76vRbb²'W6W""Â&76—7FçB%Òæ–æ6ÇVFW2†ÖW76vRç&öÆR’¢ç6Æ–6R‚Ó#B“°¢6öç7B&÷VæFVBÒµÓ°¢ÆWB&VÖ–æ–ærÒ#°¢f÷"†ÆWB–æFW‚Ò6æF–FFW2æÆVæwF‚Ò²–æFW‚ãÒbb&VÖ–æ–ærâ²–æFW‚ÓÒ’°¢6öç7B&rÒ7G&–ær†6æF–FFW5¶–æFW…Òæ6öçFVçBÇÂ""“°¢6öç7BW$ÖW76vTÆ–Ö—BÒÖF‚æÖ–âƒ#Â&VÖ–æ–ær“°¢6öç7B6öçFVçBÒ&ræÆVæwF‚ÃÒW$ÖW76vTÆ–Ö—@¢ò&p¢¢W$ÖW76vTÆ–Ö—BÃÒc@¢ò&rç6Æ–6R‚×W$ÖW76vTÆ–Ö—B¢¢G·&rç6Æ–6RƒÂÖF‚æfÆö÷"‚‡W$ÖW76vTÆ–Ö—BÒ3"’ò"’—ÕÆå¶ÖW76vRG'Væ6FVEÕÆâG·&rç6Æ–6R‚ÔÖF‚æ6V–Â‚‡W$ÖW76vTÆ–Ö—BÒ3"’ò"’—Ö°¢&÷VæFVBçVç6†–gB‡²&öÆS¢6æF–FFW5¶–æFW…Òç&öÆRÂ6öçFVçBÒ“°¢&VÖ–æ–ærÓÒ6öçFVçBæÆVæwFƒ°¢Ğ¢&WGW&â&÷VæFVC°§Ğ Ğ¦7–æ2gVæ7F–öâ6ÆÅ&W7öç6W2†÷Væ’Â–ÆöBÂF–ÖV÷WD×2ÂÆ&VÂ’°¢–b‚÷Væ“òç&W7öç6W3òæ7&VFR’°Ğ¢F‡&÷ræWrW'&÷"‚$÷Vä’&W7öç6W2’—2Væf–Æ&ÆRâWw&FRF†R÷Væ’çÒ6¶vR&Vf÷&RFWÆ÷––ær6†BÖvVçBâ"“°Ğ¢ĞĞ¢&WGW&âv—F…F–ÖV÷WB†÷Væ’ç&W7öç6W2æ7&VFR‡–ÆöB’ÂF–ÖV÷WD×2ÂÆ&VÂ“°Ğ§Ğ ¦gVæ7F–öâfW&–f–VDf–Æ&–Æ—G”fÆÆ&6²‡FööÅ&W7VÇG2’°¢6öç7B&W7VÇBÒ²ââçFööÅ&W7VÇG5Òç&WfW'6R‚’æf–æB†—FVÒÓâ—FVÓòææÖRÓÓÒ&6†V6µöf–Æ&–Æ—G’"bb—FVÓòç7FGW2ÓÓÒ'7V66W72"“°¢–b‚&W7VÇB’&WGW&âçVÆÃ°¢6öç7BVW'’Ò&W7VÇBæFFòçVW'“°¢6öç7BVæ—G2Ò'&’æ—4'&’‡&W7VÇBæFFòçVæ—G2’ò&W7VÇBæFFçVæ—G2¢µÓ°¢6öç7Bf–Æ&ÆRÒVæ—G2æf–ÇFW"‡Væ—BÓâVæ—Còæf–Æ&ÆRÓÓÒG'VRbbVæ—Còæ&öö¶–æuW&Â“°¢–b‚VW'“òæ'&—fÂÇÂVW'“òæFW'GW&RÇÂf–Æ&ÆRæÆVæwF‚ÓÓÒ’&WGW&âçVÆÃ°¢6öç7B'G’ÒG·VW'’æGVÇG7ÒG·VW'’æGVÇG2ÓÓÒò&GVÇB"¢&GVÇG2'ÒæBG·VW'’æ6†–ÆG&VçÒG·VW'’æ6†–ÆG&VâÓÓÒò&6†–ÆB"¢&6†–ÆG&Vâ'Ö°¢6öç7BÆ–æ·2Òf–Æ&ÆRæÖ‡Væ—BÓâÒVæ—BG·Væ—BçVæ—GÓ¢G·Væ—Bæ&öö¶–æuW&ÇÖ’æ¦ö–â‚%Æâ"“°¢&WGW&â’6†V6¶VBG·VW'’æ'&—fÇÒF‡&÷Vv‚G·VW'’æFW'GW&WÒf÷"G·'G—ÒâG¶f–Æ&ÆRæÆVæwF‚ÓÓÒò%F†—26öæFò—2f–Æ&ÆR"¢%F†W6R6öæF÷2&Rf–Æ&ÆR'Ó¥ÆâG¶Æ–æ·7ÕÆåÆåÆV6R&Wf–WrF†RwVW7B6÷VçBæB6ö×ÆWFRç’&W6W'fF–öâöâF†R6V7W&R&öö¶–ærvRâ’6âç7vW"VW7F–öç2&÷WBV—F†W"Væ—BÂ'WB’6ææ÷B†öÆB÷"6ö×ÆWFR&W6W'fF–öâf÷"–÷Ræ°§Ğ ¦gVæ7F–öâfW&–f–VD&V6„6öæF—F–öç4fÆÆ&6²‡FööÅ&W7VÇG2’°¢6öç7B&W7VÇBÒ²ââçFööÅ&W7VÇG5Òç&WfW'6R‚’æf–æB†—FVÒÓâ—FVÓòææÖRÓÓÒ&vWEö&V6…ö6öæF—F–öç2"bb—FVÓòæö²ÓÓÒG'VR“°¢6öç7B6öæF—F–öç2Ò&W7VÇCòæFF°¢–b‚6öæF—F–öç2’&WGW&âçVÆÃ°¢6öç7BÆ–æW2ÒµÓ°¢–b†6öæF—F–öç2æfÆsòç7FGW2ÓÓÒ'7V66W72"’Æ–æW2çW6‚†FW7F–âf—&R7W'&VçFÇ’&W÷'G3¢G¶6öæF—F–öç2æfÆrçfÇVWÒæ“°¢VÇ6RÆ–æW2çW6‚‚$’6÷VÆBæ÷BfW&–g’F†R7W'&VçBFW7F–âf—&R&V6‚ÖfÆr7FGW2â"“°¢–b†6öæF—F–öç2ç7W&còç7FGW2ÓÓÒ'7V66W72"’°¢Æ–æW2çW6‚†F†Råu27W'&VçFÇ’&W÷'G2G¶6öæF—F–öç2ç7W&bç&—7W'&VçE&—6²ÇÂ&âVç7V6–f–VB'Ò&—Ö7W'&VçB&—6²ÂG¶6öæF—F–öç2ç7W&bç7W&d†V–v‡BÇÂ'Væf–Æ&ÆR7W&b†V–v‡B'ÒÂvFW"FV×W&GW&RG¶6öæF—F–öç2ç7W&bçvFW%FV×W&GW&RÇÂ'Væf–Æ&ÆR'ÒÂæBG¶6öæF—F–öç2ç7W&bçv–æG2ÇÂ'Væf–Æ&ÆRv–æG2'Òæ“°¢ÒVÇ6RÆ–æW2çW6‚‚$’6÷VÆBæ÷BfW&–g’F†R7W'&VçBåu2ö¶Æö÷66ö7FÂ7W&bf÷&V67Bâ"“°¢f÷"†6öç7BÆW'Böb6öæF—F–öç2æÆW'G3òæ—FV×2ÇÂµÒ’Æ–æW2çW6‚†7F—fRåu2ÆW'C¢G¶ÆW'Bæ†VFÆ–æRÇÂÆW'BæWfVçGÒG¶ÆW'BæW‡—&W2ò†W‡—&W2G¶ÆW'BæW‡—&W7Ò–¢"'Òæ“°¢Æ–æW2çW6‚†6†V6¶VBG¶6öæF—F–öç2æ6†V6¶VDBÇÂ&§W7Bæ÷r'Òâ6öæF—F–öç26â6†ævRV–6¶Ç(	FföÆÆ÷r÷7FVBfÆw2æBÆ–fVwV&B–ç7G'V7F–öç2ÂæBFòæ÷BVçFW"F†RwVÆbv†–ÆRF†RvFW"—26Æ÷6VBæ“°¢6öç7BW&Ç2Ò¶6öæF—F–öç2æfÆsòç6÷W&6RÂ6öæF—F–öç2ç7W&còç6÷W&6RÂ6öæF—F–öç2æÆW'G3òç6÷W&6UÒæf–ÇFW"„&ööÆVâ“°¢&WGW&âG¶Æ–æW2æ¦ö–â‚%ÆåÆâ"—ÒG·W&Ç2æÆVæwF‚òÆåÆäöff–6–Â6÷W&6W3¥ÆâG·W&Ç2æÖ‡W&ÂÓâÒG·W&ÇÖ’æ¦ö–â‚%Æâ"—Ö¢"'Ö°§Ğ ¦7–æ2gVæ7F–öâ6÷'&V7F—fU&Ww&—FR‡²÷Væ’ÂÖöFVÂÂ7FFRÂÆFW7EW6W"ÂFööÅ&W7VÇG2ÂÆÆ÷vVEW&Ç2Âf–öÆF–öç2Âæ÷rÂF–ÖV÷WD×2Ò’°¢6öç7B–ç7G'V7F–öç2Ò'V–ÆD6÷'&V7F–öä–ç7G'V7F–öç2‡°Ğ¢7FFRÀĞ¢ÆFW7EW6W"ÀĞ¢FööÅ&W7VÇG2ÀĞ¢ÆÆ÷vVEW&Ç2ÀĞ¢f–öÆF–öç2ÀĞ¢FöF“¢FöF”—6ò†æ÷r’ÀĞ¢7W'&VçEF–ÖS¢æ÷rçFôÆö6ÆUF–ÖU7G&–ær‚&VâÕU2"Â²F–ÖU¦öæS¢$ÖW&–6ô6†–6vò"Â†÷W#¢&çVÖW&–2"ÂÖ–çWFS¢#"ÖF–v—B"Â†÷W##¢G'VRÒ’ÀĞ¢Ò“°Ğ¢6öç7B&W7öç6RÒv—B6ÆÅ&W7öç6W2†÷Væ’Â°Ğ¢ÖöFVÂÀĞ¢–çWC¢·²&öÆS¢&FWfVÆ÷W""Â6öçFVçC¢–ç7G'V7F–öç2ÕÒÀĞ¢FööÅö6†ö–6S¢&æöæR"ÀĞ¢&V6öæ–æs¢²Vff÷'C¢&Æ÷r"ÒÀĞ¢7F÷&S¢fÇ6RÀĞ¢Ö…ö÷WGWE÷Fö¶Vç3¢#ÀĞ¢ÒÂF–ÖV÷WD×2Â&vVçEö6÷'&V7F–öâ"“°Ğ¢&WGW&â&W7öç6UFW‡B‡&W7öç6R“°§Ğ ¦gVæ7F–öâÆFW7E&WVW7EÆâ‡FööÅ&W7VÇG2’°¢6öç7B&W7VÇBÒ²âââ‡FööÅ&W7VÇG2ÇÂµÒ•Òç&WfW'6R‚’æf–æB†—FVÒÓâ—FVÓòææÖRÓÓÒ'6WE÷&WVW7E÷Æâ"bb—FVÓòæö²ÓÓÒG'VR“°¢&WGW&â'&’æ—4'&’‡&W7VÇCòæFFòçF6·2’ò&W7VÇBæFFçF6·2¢µÓ°§Ğ ¦gVæ7F–öâ–æ6ö×ÆWFUÆææVEF6·2‡F6·2ÂFööÅ&W7VÇG2’°¢6öç7BGFV×FVBÒæWr6WB‚‡FööÅ&W7VÇG2ÇÂµÒ’æÖ‡&W7VÇBÓâ&W7VÇCòææÖR’æf–ÇFW"„&ööÆVâ’“°¢&WGW&âF6·2æf–ÇFW"‡F6²ÓâF6²ç&WV—&VEFööÂbbGFV×FVBæ†2‡F6²ç&WV—&VEFööÂ’“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâ'VävVçEGW&â‡°¢÷Væ’ÀĞ¢ÖöFVÂÒ&wBÓRÖÖ–æ’"ÀĞ¢6W'f–6W2ÀĞ¢7FFRÀĞ¢ÖW76vW2ÀĞ¢ÆFW7EW6W"ÀĞ¢6W76–öä–BÀĞ¢wVW7D&–BÒçVÆÂÀĞ¢wVW7E6–rÒçVÆÂÀĞ¢vU6÷W&6RÒçVÆÂÀ¢F–6¶W%Væ—BÒçVÆÂÀ¢6t&ææW"ÒfÇ6RÀ¢÷¦ä6µG—RÒçVÆÂÀĞ¢æ÷rÒæWrFFR‚’ÀĞ¢ÆövvW"Ò6öç6öÆRÀ¢Ö…FööÅ&÷VæG2ÒBÀ¢Ö…FööÄ6ÆÇ5W%&÷VæBÒ‚À¢Ö…F÷FÅFööÄ6ÆÇ2Ò‚À¢FööÅF–ÖV÷WD×2Ò#À¢vVçEF–ÖV÷WD×2Ò#SÀĞ§Ò’°Ğ¢ÆWBv÷&¶–æu7FFRÒæ÷&ÖÆ—¦U7FFR‡7FFRÇÂ7&VFTFVfVÇE7FFR‚’“°Ğ¢6öç7B6fWG’Òv—BÇ•6fWG”&6·7F÷2‡²7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Â6W'f–6W2Â6W76–öä–BÂæ÷rÒ“°¢v÷&¶–æu7FFRÒ6fWG’ç7FFS°¢6öç7BFööÅ&W7VÇG2Ò²ââç6fWG’çFööÅ&W7VÇG5Ó°¢6öç7B6VVåFööÄ6ÆÇ2ÒæWr6WB‡6fWG’çFööÅ&W7VÇG2æÖ‡&W7VÇBÓâ&W7VÇCòææÖR’æf–ÇFW"„&ööÆVâ’æÖ†æÖRÓâæÖRÓÓÒ&7&VFUöÖ–çFVææ6UöÆW'B"òæÖR¢çVÆÂ’æf–ÇFW"„&ööÆVâ’“°¢ÆWBW†V7WFVEFööÄ6ÆÇ2Ò° Ğ¢–b‡v÷&¶–æu7FFRæfÆw2ç66Ô7&—6—2’°¢6öç7B&WÇ’Ò6fTfÆÆ&6²‡²7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Ò“°Ğ¢&WGW&â°Ğ¢&WÇ’ÀĞ¢7FFS¢v÷&¶–æu7FFRÀĞ¢FööÅ&W7VÇG2ÀĞ¢FWFV7FVD–çFVçC¢–çFVçDg&öÕ7FFR‡v÷&¶–æu7FFR’ÀĞ¢FV'Vs¢²vVçF–3¢G'VRÂ6fWG”–çFW&6WC¢'66Õö7&—6—2"ÂFööÄ6ÆÇ3¢µÒÂFööÅ&÷VæG3¢ÂfÆ–FF–öã¢²ö³¢G'VRÂf–öÆF–öç3¢µÒÒÒÀĞ¢Ó°¢Ğ ¢6öç7B–ç7G'V7F–öç2Ò'V–ÆDvVçD–ç7G'V7F–öç2‡°¢7FFS¢v÷&¶–æu7FFRÀĞ¢ÆFW7EW6W"ÀĞ¢FöF“¢FöF”—6ò†æ÷r’ÀĞ¢7W'&VçEF–ÖS¢æ÷rçFôÆö6ÆUF–ÖU7G&–ær‚&VâÕU2"Â²F–ÖU¦öæS¢$ÖW&–6ô6†–6vò"Â†÷W#¢&çVÖW&–2"ÂÖ–çWFS¢#"ÖF–v—B"Â†÷W##¢G'VRÒ’ÀĞ¢vU6÷W&6RÀ¢F–6¶W%Væ—BÀ¢W†—7F–ætwVW7C¢v÷&¶–æu7FFRæW†—7F–ætwVW7CòæWF†÷&—¦VBÓÓÒG'VRÀ¢&–÷%FööÅ&W7VÇG3¢6fWG’çFööÅ&W7VÇG2ÀĞ¢Ò“°Ğ Ğ¢6öç7B–çWBÒ°Ğ¢²&öÆS¢&FWfVÆ÷W""Â6öçFVçC¢–ç7G'V7F–öç2ÒÀĞ¢ââæ6öçfW'6F–öä–çWB†ÖW76vW2’ÀĞ¢Ó°Ğ¢6öç7BFööÄ6ÆÇ4FV'VrÒµÓ°Ğ¢ÆWBf–æÅ&W7öç6RÒçVÆÃ°Ğ¢ÆWBvVçDW'&÷"ÒçVÆÃ°¢ÆWB&÷VæG2Ò°¢6öç7B&W7öç6TF–væ÷7F–72ÒµÓ°¢ÆWB6ö×ÆWF–öå&W&ö×G2Ò° Ğ¢f÷"†ÆWB&÷VæBÒ²&÷VæBÂÖ…FööÅ&÷VæG3²&÷VæB³Ò’°Ğ¢&÷VæG2Ò&÷VæB²°Ğ¢ÆWB&W7öç6S°Ğ¢G'’°Ğ¢&W7öç6RÒv—B6ÆÅ&W7öç6W2†÷Væ’Â°Ğ¢ÖöFVÂÀĞ¢–çWBÀĞ¢FööÇ3¢$U5ôå4UõDôôÅôDTd”ä•D”ôå2ÀĞ¢FööÅö6†ö–6S¢&WFò"ÀĞ¢&ÆÆVÅ÷FööÅö6ÆÇ3¢G'VRÀĞ¢&V6öæ–æs¢²Vff÷'C¢&Æ÷r"ÒÀĞ¢7F÷&S¢fÇ6RÀĞ¢Ö…ö÷WGWE÷Fö¶Vç3¢ƒÀĞ¢ÒÂvVçEF–ÖV÷WD×2ÂvVçE÷&÷VæEòG·&÷VæB²Ö“°Ğ¢Ò6F6‚†W'&÷"’°Ğ¢vVçDW'&÷"ÒW'&÷"æÖW76vS°Ğ¢'&V³°Ğ¢ĞĞ Ğ¢&W7öç6TF–væ÷7F–72çW6‚‡°Ğ¢&÷VæC¢&÷VæB²ÀĞ¢–C¢&W7öç6Sòæ–BÇÂçVÆÂÀĞ¢7FGW3¢&W7öç6Sòç7FGW2ÇÂçVÆÂÀĞ¢–æ6ö×ÆWFU&V6öã¢&W7öç6Sòæ–æ6ö×ÆWFUöFWF–Ç3òç&V6öâÇÂçVÆÂÀĞ¢÷WGWEG—W3¢‡&W7öç6Sòæ÷WGWBÇÂµÒ’æÖ‚†—FVÒ’Óâ—FVÓòçG—RÇÂ'Væ¶æ÷vâ"’ÀĞ¢÷WGWEFö¶Vç3¢&W7öç6SòçW6vSòæ÷WGWE÷Fö¶Vç2óòçVÆÂÀĞ¢&V6öæ–æuFö¶Vç3¢&W7öç6SòçW6vSòæ÷WGWE÷Fö¶Vç5öFWF–Ç3òç&V6öæ–æu÷Fö¶Vç2óòçVÆÂÀĞ¢†4÷WGWEFW‡C¢&ööÆVâ‡&W7öç6UFW‡B‡&W7öç6R’’ÀĞ¢Ò“°Ğ Ğ¢6öç7B6ÆÇ2Ò&W7öç6TgVæ7F–öä6ÆÇ2‡&W7öç6R“°¢–b‚6ÆÇ2æÆVæwF‚’°¢6öç7B&WVW7EÆâÒÆFW7E&WVW7EÆâ‡FööÅ&W7VÇG2“°¢6öç7BÖ—76–æuF6·2Ò–æ6ö×ÆWFUÆææVEF6·2‡&WVW7EÆâÂFööÅ&W7VÇG2“°¢–b†Ö—76–æuF6·2æÆVæwF‚bb&÷VæB²ÂÖ…FööÅ&÷VæG2bbW†V7WFVEFööÄ6ÆÇ2ÂÖ…F÷FÅFööÄ6ÆÇ2’°¢–çWBçW6‚‚âââ‡&W7öç6Ræ÷WGWBÇÂµÒ’“°¢–çWBçW6‚‡°¢&öÆS¢&FWfVÆ÷W""À¢6öçFVçC¢4ôÕÄUD”ôâ4„T4³¢–÷W"÷vâ&WVW7BÆâ7F–ÆÂ†2VæGFV×FVB÷WF6öÖW3¢G¶Ö—76–æuF6·2æÖ‡F6²ÓâG·F6²æ–GÓ¢G·F6²æ÷WF6öÖWÒ‡W6RG·F6²ç&WV—&VEFööÇÒ–’æ¦ö–â‚#²"—ÒâW†V7WFRF†÷6RFööÇ2æ÷rv—F†–âF†R&VÖ–æ–ær'VFvWBâ–bFööÂf–Ç2Â&W6W'fRF†B&W7VÇBæBW‡Æ–âF†Rf–ÇW&R†öæW7FÇ’–âF†Rf–æÂ&WÇ’æÀ¢Ò“°¢6ö×ÆWF–öå&W&ö×G2³Ò°¢6öçF–çVS°¢Ğ¢f–æÅ&W7öç6RÒ&W7öç6S°¢'&V³°¢ĞĞ Ğ¢òò&W6W'fRWfW'’ÖöFVÂ÷WGWB—FVÒÂ–æ6ÇVF–ær&V6öæ–ær—FV×2Â&Vf÷&RFF–æpĞ¢òògVæ7F–öâ÷WGWG2âF†—2—2F†RFö7VÖVçFVB&W7öç6W2’6öçF–çVF–öâGFW&âàĞ¢–çWBçW6‚‚âââ‡&W7öç6Ræ÷WGWBÇÂµÒ’“°Ğ Ğ¢ÆWB&÷VæDW†V7WFVEFööÄ6ÆÇ2Ò°¢6öç7B&÷VæE&W7VÇG2Òv—B&öÖ—6RæÆÂ†6ÆÇ2æÖ†7–æ2†6ÆÂ’Óâ°¢6öç7B&w2Ò'6UFööÄ&wVÖVçG2†6ÆÂ“°¢–b†&w2åõ÷'6TW'&÷"’°¢&WGW&âFööÅ&W7VÇB‡²æÖS¢6ÆÂææÖRÇÂ'Væ¶æ÷vâ"Âö³¢fÇ6RÂ7FGW3¢&ÖÆf÷&ÖVEö&wVÖVçG2"ÂW'&÷#¢&w2åõ÷'6TW'&÷"Ò“°¢Ğ¢6öç7B—5Æææ–æt6ÆÂÒ6ÆÂææÖRÓÓÒ'6WE÷&WVW7E÷Æâ#°¢6öç7B6–væGW&RÒ6ÆÂææÖRÓÓÒ&7&VFUöÖ–çFVææ6UöÆW'B ¢ò6ÆÂææÖP¢¢G¶6ÆÂææÖWÓ¢G´¥4ôâç7G&–æv–g’†&w2Âö&¦V7Bæ¶W—2†&w2’ç6÷'B‚’—Ö°¢–b‡6VVåFööÄ6ÆÇ2æ†2‡6–væGW&R’’°¢&WGW&âFööÅ&W7VÇB‡²æÖS¢6ÆÂææÖRÇÂ'Væ¶æ÷vâ"Âö³¢fÇ6RÂ7FGW3¢&GWÆ–6FU÷7W&W76VB"ÂFF¢²&V6öã¢'6ÖUöwVW7EöÖW76vR"ÒÒ“°¢Ğ¢–b‚—5Æææ–æt6ÆÂbb‡&÷VæDW†V7WFVEFööÄ6ÆÇ2ãÒÖ…FööÄ6ÆÇ5W%&÷VæBÇÂW†V7WFVEFööÄ6ÆÇ2ãÒÖ…F÷FÅFööÄ6ÆÇ2’’°¢&WGW&âFööÅ&W7VÇB‡²æÖS¢6ÆÂææÖRÇÂ'Væ¶æ÷vâ"Âö³¢fÇ6RÂ7FGW3¢'FööÅö6ÆÅöÆ–Ö—EöW†6VVFVB"ÂFF¢²Ö…FööÄ6ÆÇ5W%&÷VæBÂÖ…F÷FÅFööÄ6ÆÇ2ÒÒ“°¢Ğ¢6VVåFööÄ6ÆÇ2æFB‡6–væGW&R“°¢–b‚—5Æææ–æt6ÆÂ’°¢&÷VæDW†V7WFVEFööÄ6ÆÇ2³Ò°¢W†V7WFVEFööÄ6ÆÇ2³Ò°¢Ğ¢FööÄ6ÆÇ4FV'VrçW6‚‡²&÷VæC¢&÷VæB²Â6ÆÄ–C¢6ÆÂæ6ÆÅö–BÂæÖS¢6ÆÂææÖRÂ&w2Ò“°¢&WGW&âv—F…F–ÖV÷WB†W†V7WFUFööÂ†6ÆÂææÖRÂ&w2Â°¢6W'f–6W2ÀĞ¢7FFS¢v÷&¶–æu7FFRÀĞ¢ÖW76vW2ÀĞ¢ÆFW7EW6W"ÀĞ¢æ÷rÀĞ¢6W76–öä–BÀĞ¢wVW7D&–BÀĞ¢wVW7E6–rÀĞ¢vU6÷W&6RÀĞ¢6t&ææW"ÀĞ¢ÆövvW"ÀĞ¢Ò’ÂFööÅF–ÖV÷WD×2ÂFööÅòG¶6ÆÂææÖWÖ’æ6F6‚‚†W'&÷"’ÓâFööÅ&W7VÇB‡°Ğ¢æÖS¢6ÆÂææÖRÇÂ'Væ¶æ÷vâ"ÀĞ¢ö³¢fÇ6RÀĞ¢7FGW3¢'F–ÖV÷WEö÷%öW'&÷""ÀĞ¢W'&÷#¢W'&÷"æÖW76vRÀĞ¢Ò’“°Ğ¢Ò’“°Ğ Ğ¢f÷"†ÆWB–æFW‚Ò²–æFW‚Â6ÆÇ2æÆVæwFƒ²–æFW‚³Ò’°Ğ¢6öç7B&W7VÇBÒ&÷VæE&W7VÇG5¶–æFW…Ó°Ğ¢FööÅ&W7VÇG2çW6‚‡&W7VÇB“°Ğ¢v÷&¶–æu7FFRÒÖW&vUFööÅF6‚‡v÷&¶–æu7FFRÂ&W7VÇBç7FFUF6‚“°Ğ¢–çWBçW6‚‡°Ğ¢G—S¢&gVæ7F–öåö6ÆÅö÷WGWB"ÀĞ¢6ÆÅö–C¢6ÆÇ5¶–æFW…Òæ6ÆÅö–BÀĞ¢÷WGWC¢¥4ôâç7G&–æv–g’‡°Ğ¢ö³¢&W7VÇBæö²ÀĞ¢7FGW3¢&W7VÇBç7FGW2ÀĞ¢FF¢&W7VÇBæFFÀĞ¢W&Ç3¢&W7VÇBçW&Ç2ÀĞ¢f7G3¢&W7VÇBæf7G2ÀĞ¢W'&÷#¢&W7VÇBæW'&÷"ÀĞ¢Ò’ÀĞ¢Ò“°Ğ¢ĞĞ¢ĞĞ Ğ¢–b‚f–æÅ&W7öç6RbbvVçDW'&÷"’°Ğ¢G'’°Ğ¢f–æÅ&W7öç6RÒv—B6ÆÅ&W7öç6W2†÷Væ’Â°Ğ¢ÖöFVÂÀĞ¢–çWC¢°Ğ¢ââæ–çWBÀĞ¢²&öÆS¢&FWfVÆ÷W""Â6öçFVçC¢%FööÂ'VFvWB—2W††W7FVBâw&—FRF†Rf–æÂwVW7BÖf6–ærç7vW"æ÷rg&öÒF†RfW&–f–VB7FFRæBFööÂ÷WGWG2âFòæ÷B6ÆÂæ÷F†W"FööÂâ"ÒÀĞ¢ÒÀĞ¢FööÅö6†ö–6S¢&æöæR"ÀĞ¢&V6öæ–æs¢²Vff÷'C¢&Æ÷r"ÒÀĞ¢7F÷&S¢fÇ6RÀĞ¢Ö…ö÷WGWE÷Fö¶Vç3¢ƒÀĞ¢ÒÂvVçEF–ÖV÷WD×2Â&vVçEöf–æÅögFW%ö'VFvWB"“°Ğ¢Ò6F6‚†W'&÷"’°Ğ¢vVçDW'&÷"ÒW'&÷"æÖW76vS°Ğ¢ĞĞ¢ĞĞ Ğ¢ÆWB&WÇ’Ò&W7öç6UFW‡B†f–æÅ&W7öç6R“°Ğ¢6öç7BÆÆ÷vVEW&Ç2Ò6öÆÆV7DÆÆ÷vVEW&Ç2‡FööÅ&W7VÇG2Âv÷&¶–æu7FFRÂ²–æ6ÇVFU7FFUfW&–f–VC¢fÇ6RÒ“°Ğ¢ÆWBfÆ–FF–öâÒfÆ–FFU&WÇ’‡°Ğ¢&WÇ’ÀĞ¢ÆÆ÷vVEW&Ç2ÀĞ¢FööÅ&W7VÇG2ÀĞ¢7FFS¢v÷&¶–æu7FFRÀĞ¢ÆFW7EW6W"ÀĞ¢&WV—&T7W'&VçEGW&åW&Ç3¢G'VRÀĞ¢Ò“°Ğ Ğ¢–b‚&WÇ’ÇÂfÆ–FF–öâæö²’°Ğ¢G'’°Ğ¢6öç7B6÷'&V7FVBÒv—B6÷'&V7F—fU&Ww&—FR‡°Ğ¢÷Væ’ÀĞ¢ÖöFVÂÀĞ¢7FFS¢v÷&¶–æu7FFRÀĞ¢ÆFW7EW6W"ÀĞ¢FööÅ&W7VÇG2ÀĞ¢ÆÆ÷vVEW&Ç2ÀĞ¢f–öÆF–öç3¢fÆ–FF–öâçf–öÆF–öç2ÇÂ·²6öFS¢&V×G•÷&WÇ’"ÕÒÀĞ¢æ÷rÀĞ¢F–ÖV÷WD×3¢vVçEF–ÖV÷WD×2ÀĞ¢Ò“°Ğ¢–b†6÷'&V7FVB’°Ğ¢&WÇ’Ò6÷'&V7FVC°Ğ¢fÆ–FF–öâÒfÆ–FFU&WÇ’‡²&WÇ’ÂÆÆ÷vVEW&Ç2ÂFööÅ&W7VÇG2Â7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Â&WV—&T7W'&VçEGW&åW&Ç3¢G'VRÒ“°Ğ¢ĞĞ¢Ò6F6‚†W'&÷"’°Ğ¢vVçDW'&÷"ÇÃÒW'&÷"æÖW76vS°Ğ¢ĞĞ¢ĞĞ Ğ¢–b‚&WÇ’ÇÂfÆ–FF–öâæö²’°¢6öç7BæVVG5'G”6Æ&–f–6F–öâÒFööÅ&W7VÇG2ç6öÖR‡&W7VÇBÓâ&W7VÇCòç7FGW2ÓÓÒ&æVVG5÷'G•ö6Æ&–f–6F–öâ"“°¢6öç7Bf–Æ&–Æ—G”fÆÆ&6²ÒfW&–f–VDf–Æ&–Æ—G”fÆÆ&6²‡FööÅ&W7VÇG2“°¢6öç7B&V6„6öæF—F–öç4fÆÆ&6²ÒfW&–f–VD&V6„6öæF—F–öç4fÆÆ&6²‡FööÅ&W7VÇG2“°¢&WÇ’ÒæVVG5'G”6Æ&–f–6F–öà¢ò$&Vf÷&R’6†V6²f–Æ&–Æ—G’ÂÆV6R6öæf—&ÒF†Rf–æÂçVÖ&W"öbGVÇG2æB6†–ÆG&Vâv†òv–ÆÂ&RG&fVÆ–ærâ’vöî(	—B77VÖRç–öæR–â÷"÷WBâ ¢¢f–Æ&–Æ—G”fÆÆ&6²ÇÂ&V6„6öæF—F–öç4fÆÆ&6²ÇÂ6fTfÆÆ&6²‡²7FFS¢v÷&¶–æu7FFRÂÆFW7EW6W"Â&V6öã¢fÆ–FF–öâçf–öÆF–öç3òå³Óòæ6öFRÇÂvVçDW'&÷"ÇÂ&vVçEöf–ÇW&R"Ò“°¢Ğ Ğ¢v÷&¶–æu7FFRæÖWFæÆ7D–çFVçBÒ–çFVçDg&öÕ7FFR‡v÷&¶–æu7FFR“°Ğ¢v÷&¶–æu7FFRæÖWFçWFFVDBÒæWrFFR†æ÷r’çFô•4õ7G&–ær‚“°Ğ¢&WGW&â°Ğ¢&WÇ’ÀĞ¢7FFS¢æ÷&ÖÆ—¦U7FFR‡v÷&¶–æu7FFR’ÀĞ¢FööÅ&W7VÇG2ÀĞ¢FWFV7FVD–çFVçC¢–çFVçDg&öÕ7FFR‡v÷&¶–æu7FFR’ÀĞ¢FV'Vs¢°Ğ¢vVçF–3¢G'VRÀĞ¢“¢'&W7öç6W2"ÀĞ¢ÖöFVÂÀĞ¢FööÄ6ÆÇ3¢FööÄ6ÆÇ4FV'VrÀĞ¢FööÅ&÷VæG3¢FööÄ6ÆÇ4FV'VræÆVæwF‚òÖF‚æÖ‚‚ââçFööÄ6ÆÇ4FV'VræÖ‚†—FVÒ’Óâ—FVÒç&÷VæB’’¢ÀĞ¢&W7öç6U&÷VæG3¢&÷VæG2ÀĞ¢vVçDW'&÷"ÀĞ¢fÆ–FF–öâÀĞ¢ÆÆ÷vVEW&Ç3¢²ââæÆÆ÷vVEW&Ç5ÒÀĞ¢÷¦ä6µG—S¢÷¦ä6µG—RÇÂçVÆÂÀĞ¢&W7öç6TF–væ÷7F–72À¢6ö×ÆWF–öã¢°¢&WVW7FVC¢ÆFW7E&WVW7EÆâ‡FööÅ&W7VÇG2’æÖ‡F6²ÓâF6²æ–B’À¢GFV×FVC¢ÆFW7E&WVW7EÆâ‡FööÅ&W7VÇG2’æf–ÇFW"‡F6²Óâ–æ6ö×ÆWFUÆææVEF6·2…·F6µÒÂFööÅ&W7VÇG2’æÆVæwF‚’æÖ‡F6²ÓâF6²æ–B’À¢&W&ö×G3¢6ö×ÆWF–öå&W&ö×G2À¢ÒÀ¢ÒÀ¢Ó°Ğ§ĞĞ