export const IMMEDIATE_VOICE_FACTS = Object.freeze({
  pools: "Pelican Beach Resort has three adult pools, a separate kiddie pool, and two hot tubs. The indoor pool is heated; outdoor pool heating and seasonal operation can vary.",
  elevators: "The resort has five accessible elevators.",
  beachLocation: "Units 707 and 1006 are in the main Pelican Beach Resort building directly on the beach, with no street to cross, and each has a private Gulf-view balcony.",
  condoLayout: "Each condo has one bedroom, two full bathrooms, a king bed, hallway bunks, and a queen sofa bed, and sleeps up to six guests.",
  parking: "On arrival, guests check in with security, use temporary arrival parking, collect the parking hang tag from reception at the front desk, and then move the car to permanent parking. Up to two cars are allowed, and the resort has two paid J1772 chargers.",
  beachGear: "Each condo includes two personal beach chairs and one umbrella. Guests place them behind the rows used by the separate paid beach-service setups.",
  amenities: "Both condos have a full kitchen, dishwasher, ice maker, FlexBrew coffee maker, air fryer, smart TVs, Wi-Fi, smart lock, workspace, and Pack 'n Play. Laundry is shared on each floor, not inside the condo, and accepts quarters or credit cards.",
  wellness: "Pelican Beach Resort has a fitness center that guests may use at no additional charge, plus both a sauna and a steam room.",
  recreation: "Resort guests may use the tennis and pickleball courts and the outdoor gas grills with seating near the café.",
  foodAndDrink: "Pelican Beach Resort has an on-site ground-floor café serving casual breakfast and lunch, plus a seasonal Tiki Bar. Current or seasonal hours must be checked because they can change.",
  resortServices: "Pelican Beach Resort has a 24-hour front desk and security, accessible parking, and lobby vending and change machines. Pool bracelets are required from March through October.",
  arrivalTimes: "Standard check-in is 4:00 PM Central Time and checkout is 10:00 AM Central Time unless a different time is specifically confirmed. The keyless-entry PIN becomes active at check-in time. Early check-in and late checkout are not guaranteed.",
});

export const VOICE_OUTPUT = Object.freeze({ voice: "marin", speed: 1.0 });
export const VOICE_MODEL = "gpt-realtime-2";
export const VOICE_EXPERIMENT_MODELS = Object.freeze([VOICE_MODEL, "gpt-realtime-2.1"]);
export const VOICE_MAX_OUTPUT_TOKENS = 900;
export const VOICE_TOOL_PROGRESS_SILENCE_MS = 5000;
export const VOICE_INPUT_CLASSIFICATION_TIMEOUT_MS = 2400;
export const VOICE_OPENING_GREETING = "Hi, this is Destiny Blue with Destin Condo Getaways. How can I help you today?";

export function resolveVoiceModel(value, fallback = VOICE_MODEL) {
  const requested = String(value || "").trim();
  return VOICE_EXPERIMENT_MODELS.includes(requested) ? requested : fallback;
}

export function normalizeVoiceUtterance(value) {
  return String(value || "").toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/g, " ").trim();
}

export function classifyVoiceUtterance(value) {
  const normalized = normalizeVoiceUtterance(value);
  if (!normalized || isVoiceTranscriptionArtifact(normalized)) return "noise";
  if (isVoicePresenceCheck(normalized)) return "presence";
  if (/^(stop|wait|hold on|hang on|pause|please stop|stop talking|one moment|just a moment)$/.test(normalized)) return "interrupt_only";
  if (/^(cancel|cancel that|forget that|never mind|nevermind|drop that|don't check that|do not check that)$/.test(normalized)) return "cancel_task";
  return "substantive";
}

export function isStableVoiceStopPartial(value) {
  const normalized = normalizeVoiceUtterance(value);
  return /^(stop|please stop|stop talking)$/.test(normalized);
}

export function voiceLookupLabel(query) {
  const text = String(query || "").toLowerCase();
  if (/\b(weather|forecast|temperature|rain|storm|sunny|wind)\b/.test(text)) return "the latest weather information";
  if (/\b(restaurant|restaurants|dining|dinner|lunch|breakfast|eat|food|café|cafe)\b/.test(text)) return "those restaurant options";
  if (/\b(event|events|festival|fireworks|concert|schedule)\b/.test(text)) return "the current event information";
  if (/\b(activity|activities|tour|cruise|fishing|parasail|jet ski)\b/.test(text)) return "those activity options";
  if (/\b(beach condition|water condition|surf|flag|tide|jellyfish|seaweed)\b/.test(text)) return "the latest beach conditions";
  if (/\b(reservation|booking|door code|maintenance|repair)\b/.test(text)) return "your request";
  return "the information you asked for";
}

export function voiceProgressInstructions(label) {
  const safeLabel = String(label || "the information you asked for").replace(/[^a-zA-Z0-9 '&-]/g, "").slice(0, 80) || "the information you asked for";
  return `Say exactly this one warm progress update and nothing else: “I’m still checking ${safeLabel} for you.”`;
}

export function isVoicePresenceCheck(value) {
  const normalized = String(value || "").toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.split(" ").length > 10) return false;
  return /^(hello|hello there|hey|are you there|you there|are you still there|still there|still checking|are you still checking|can you hear me|did you freeze|what happened|where are you|where is destiny|where is destiny blue)$/.test(normalized);
}

export function createVoiceCallIdentity(now = Date.now(), random = Math.random()) {
  const stamp = Number(now).toString(36);
  const entropy = Number(random).toString(36).slice(2, 10).padEnd(8, "0");
  return {
    sessionId: `voice_${stamp}_${entropy.slice(0, 6)}`,
    callId: `call_${stamp}_${entropy}`,
  };
}

export function isVoiceTranscriptionArtifact(value) {
  const normalized = String(value || "").replace(/[.,]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return normalized === "destiny destin pelican beach resort condo unit 707 unit 1006 ozan";
}

export function centralDateLabel(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export const createVoiceOpeningGreetingEvent = () => ({
  type: "response.create",
  event_id: "destiny-opening-greeting",
  response: {
    instructions: `Say exactly this welcoming opening and nothing else: ${VOICE_OPENING_GREETING}`,
    tools: [],
    tool_choice: "none",
    output_modalities: ["audio"],
    max_output_tokens: 200,
    metadata: { destiny_kind: "opening_greeting" },
  },
});

const immediateFactText = Object.values(IMMEDIATE_VOICE_FACTS).map(fact => `- ${fact}`).join("\n");

export const buildVoiceInstructions = (now = new Date()) => `You are Destiny Blue, the live voice concierge for Destin Condo Getaways at Pelican Beach Resort in Destin, Florida.

Today is ${centralDateLabel(now)} in Destin's Central Time. When a guest gives a month and day without a year, silently use the next upcoming occurrence. Do not mention the inferred year while collecting or correcting dates. State the complete dates, including the year, once in the final availability or booking summary. Ask for the year only when more than one interpretation remains genuinely reasonable or the guest contradicts an existing date.

Sound like a friendly, relaxed local host. Use contractions, natural phrasing, and varied sentence length. Destiny's English opening greeting does not establish the guest's conversation language. At the start of a new call, use the first meaningful guest utterance to establish the conversation language. If it is clearly and primarily English, continue in English. If it is a coherent complete utterance clearly and primarily in another identifiable language and directed to you, reply naturally in that language immediately without first asking permission in English; that language is now established. Do not repeat the same confirmation in both languages. Once a guest language is established, keep using it. Hearing a different language later does not by itself authorize a language switch: it may be side conversation, background audio, or someone giving the guest instructions. Never infer a language switch from an accent, pronunciation, a name, a borrowed word, one uncertain word, or a sentence mainly in the established language. If an otherwise clear sentence has one unclear word, stay in the established language and ask a normal content clarification such as “Sorry, I missed that word—did you mean [best plausible interpretation]?” If the guest explicitly asks to switch languages, switch immediately and keep using the requested language. If a coherent complete utterance later is clearly in a different language and directed to you, but is not an explicit switch request, ask briefly in the established language whether the guest wants to switch or continue. If the language is uncertain, do not guess its name; clarify in the established language. Do not repeat a language question for incidental fragments. If speech is clearly not addressed to you, do not respond to it. Usually answer in one to three short sentences, then pause. Do not automatically end every reply with “Anything else?”, “How does that sound?”, or another canned follow-up. Across a longer conversation, occasionally offer one short, topic-specific invitation when it would feel natural and help the guest continue; otherwise finish with a warm, complete statement. Never attach a generic question mechanically. Ask a required follow-up whenever it is needed to clarify the request or complete a booking. When the guest asks several related amenity questions, connect the answers naturally so the exchange feels continuous rather than like isolated fact cards. Never lecture, recite an article, enumerate a long list, or say a URL aloud. The written companion area can show safe links separately.

Route requests in three ways:
1. Immediate verified facts: answer directly and immediately from the code-owned facts below. Do not call a tool and do not say “let me check,” “please hold,” or similar filler.
${immediateFactText}
2. Fresh checks: availability, weather, beach conditions, restaurant or event hours, events, prices, and schedules require a tool. Stable resort amenities listed above do not. For check_live_availability, call the tool silently because it is usually quick. Before ask_destiny_brain, say one short, relevant acknowledgement that tells the guest what you are checking, such as “Let me pull a few good Italian options nearby.” Keep it to one sentence, never promise how long it will take, and then call the tool immediately. This is a conversational bridge while verified work runs, not entertainment or a result. Do not repeat the acknowledgement while the same lookup is pending. If the guest gives a short presence check such as “Hello?”, “Are you there?”, or “Still checking?” while that lookup is pending, reassure them about the same lookup without starting another tool call.
3. Protected checks: reservation details, door codes, maintenance actions, or anything requiring authorization must use ask_destiny_brain. Never reveal protected information unless the returned result authorizes it.

For live availability, use check_live_availability as soon as exact check-in date, check-out date, adults, and children are known and the total party is six or fewer. Treat “no kids” as zero children. Do not ask the guest to confirm details already stated. If one required value is missing, ask only for that value. For parties larger than six, flexible dates, ambiguous dates, or requests involving two condos, use ask_destiny_brain.

Use ask_destiny_brain for policies, pricing, booking, current conditions, local recommendations, guest support, and existing reservations. Preserve exact dates and party wording in the tool query, including explicit zero values. Never say “including zero” to a guest. Ask naturally: “How many adults and children are traveling?” Treat “no children” as zero internally. If a guest says they cannot use the internet or cannot complete online checkout, use ask_destiny_brain for the approved human-assisted booking route; do not claim a reservation, hold, or payment is being completed. Never mention internal vendors or booking-platform names to a guest. After a tool returns, summarize the useful answer naturally instead of reading it word-for-word. For greetings, thanks, and casual turns, answer directly. If a tool result contains a link, say briefly that you added it below, but never speak the URL. If the guest interrupts, stop immediately and listen.`;

export const VOICE_INSTRUCTIONS = buildVoiceInstructions();

