import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildVoiceInstructions, createVoiceCallIdentity, createVoiceOpeningGreetingEvent, IMMEDIATE_VOICE_FACTS, isVoicePresenceCheck, isVoiceTranscriptionArtifact, voiceLookupLabel, voiceProgressInstructions, VOICE_INSTRUCTIONS, VOICE_MAX_OUTPUT_TOKENS, VOICE_MODEL, VOICE_OPENING_GREETING, VOICE_OUTPUT, VOICE_TOOL_PROGRESS_FALLBACK_MS, VOICE_TOOL_PROGRESS_SILENCE_MS } from "../lib/destiny-agent/voice-experience.js";
import { extractVoiceCompanionLinks } from "../lib/destiny-agent/voice-links.js";

test("Voice Lab uses the friendlier normal-speed voice", () => {
  assert.equal(VOICE_MODEL, "gpt-realtime-2");
  assert.equal(VOICE_MAX_OUTPUT_TOKENS, 900);
  assert.equal(VOICE_TOOL_PROGRESS_SILENCE_MS, 6500);
  assert.equal(VOICE_TOOL_PROGRESS_FALLBACK_MS, 11000);
  assert.match(voiceProgressInstructions("those restaurant options"), /Checking those restaurant options is taking a little longer/);
  assert.deepEqual(VOICE_OUTPUT, { voice: "marin", speed: 1 });
});

test("Voice Lab opens each connected call with one concise spoken introduction", () => {
  const event = createVoiceOpeningGreetingEvent();
  assert.equal(VOICE_OPENING_GREETING, "Hi, this is Destiny Blue with Destin Condo Getaways. How can I help you today?");
  assert.equal(event.type, "response.create");
  assert.equal(event.response.metadata.destiny_kind, "opening_greeting");
  assert.deepEqual(event.response.output_modalities, ["audio"]);
  assert.deepEqual(event.response.tools, []);
  assert.equal(event.response.max_output_tokens, 200);
  assert.match(event.response.instructions, /Say exactly this welcoming opening and nothing else/);
});

test("Voice Lab sends the opening greeting from the data channel open lifecycle", async () => {
  const source = await readFile(new URL("../pages/voice-lab.js", import.meta.url), "utf8");
  assert.match(source, /channel\.onopen\s*=\s*\(\)\s*=>/);
  assert.match(source, /channel\.send\(JSON\.stringify\(createVoiceOpeningGreetingEvent\(\)\)\)/);
  assert.doesNotMatch(source, /session\.created[\s\S]{0,500}createVoiceOpeningGreetingEvent/);
});

test("Voice Lab prevents startup audio from interrupting its own greeting", async () => {
  const source = await readFile(new URL("../pages/voice-lab.js", import.meta.url), "utf8");
  assert.match(source, /stream\.getAudioTracks\(\)\.forEach\(track => \{ track\.enabled = false; \}\)/);
  assert.match(source, /destiny_kind === "opening_greeting"[\s\S]{0,100}finishOpeningGreeting\(\)/);
  assert.match(source, /finishOpeningGreeting[\s\S]{0,400}track\.enabled = true/);
  assert.match(source, /setTimeout\(finishOpeningGreeting, 8000\)/);
});

test("each Voice Lab call receives a fresh session and clears browser conversation state", async () => {
  const first = createVoiceCallIdentity(1_000, 0.123456789);
  const second = createVoiceCallIdentity(2_000, 0.987654321);
  assert.notEqual(first.sessionId, second.sessionId);
  assert.notEqual(first.callId, second.callId);

  const source = await readFile(new URL("../pages/voice-lab.js", import.meta.url), "utf8");
  assert.match(source, /const identity = createVoiceCallIdentity\(\);[\s\S]{0,250}sessionRef\.current = identity\.sessionId/);
  assert.match(source, /sessionRef\.current = identity\.sessionId;[\s\S]{0,250}historyRef\.current = \[\]/);
  assert.match(source, /historyRef\.current = \[\];[\s\S]{0,150}setTranscript\(\[\]\);[\s\S]{0,150}setCompanionLinks\(\[\]\)/);
});

test("Realtime transcription does not seed or force the recognizer with guest-like text", async () => {
  const source = await readFile(new URL("../pages/api/destiny-realtime.js", import.meta.url), "utf8");
  assert.match(source, /transcription:\s*\{\s*model:\s*"gpt-4o-mini-transcribe"\s*\}/);
  assert.doesNotMatch(source, /transcription:[^\n]+prompt:/);
  assert.doesNotMatch(source, /transcription:[^\n]+language:/);
});

test("known transcription-hint echoes are suppressed narrowly", () => {
  assert.equal(isVoiceTranscriptionArtifact("Destiny, Destin, Pelican Beach Resort, condo, Unit 707, Unit 1006, Ozan"), true);
  assert.equal(isVoiceTranscriptionArtifact("Destiny Destin Pelican Beach Resort condo Unit 707 Unit 1006 Ozan."), true);
  assert.equal(isVoiceTranscriptionArtifact("Tell me about Unit 707"), false);
});

test("Voice receives Central date context and next-occurrence date behavior", () => {
  const instructions = buildVoiceInstructions(new Date("2026-09-03T12:00:00Z"));
  assert.match(instructions, /2026-09-03/);
  assert.match(instructions, /month and day without a year, use the next upcoming occurrence/i);
  assert.match(instructions, /Ask for the year only when/i);
});

test("Voice routing makes stable facts immediate and keeps fresh and protected checks", () => {
  assert.equal(Object.keys(IMMEDIATE_VOICE_FACTS).length, 11);
  assert.match(IMMEDIATE_VOICE_FACTS.wellness, /fitness center.*sauna.*steam room/i);
  assert.match(IMMEDIATE_VOICE_FACTS.recreation, /tennis.*pickleball.*grills/i);
  assert.match(IMMEDIATE_VOICE_FACTS.foodAndDrink, /café.*Tiki Bar.*hours must be checked/i);
  assert.match(IMMEDIATE_VOICE_FACTS.resortServices, /24-hour front desk.*security.*accessible parking.*vending.*Pool bracelets/i);
  assert.match(IMMEDIATE_VOICE_FACTS.amenities, /Laundry.*quarters or credit cards/i);
  assert.match(VOICE_INSTRUCTIONS, /answer directly and immediately/i);
  assert.match(VOICE_INSTRUCTIONS, /Fresh checks: availability, weather, beach conditions, restaurant or event hours/i);
  assert.match(VOICE_INSTRUCTIONS, /Stable resort amenities listed above do not/i);
  assert.match(VOICE_INSTRUCTIONS, /Protected checks: reservation details, door codes, maintenance actions/i);
  assert.match(VOICE_INSTRUCTIONS, /Before ask_destiny_brain, say one short, relevant acknowledgement/i);
  assert.match(VOICE_INSTRUCTIONS, /Do not repeat the acknowledgement while the same lookup is pending/i);
  assert.match(VOICE_INSTRUCTIONS, /Never say “including zero” to a guest/i);
  assert.match(VOICE_INSTRUCTIONS, /Do not automatically end every reply with “Anything else\?”/i);
  assert.match(VOICE_INSTRUCTIONS, /occasionally offer one short, topic-specific invitation/i);
  assert.match(VOICE_INSTRUCTIONS, /connect the answers naturally/i);
  assert.doesNotMatch(IMMEDIATE_VOICE_FACTS.pools, /three heated pools/i);
  assert.match(VOICE_INSTRUCTIONS, /English is the default and locked conversation language/i);
  assert.match(VOICE_INSTRUCTIONS, /does not by itself authorize a language switch/i);
  assert.match(VOICE_INSTRUCTIONS, /Never infer a language switch from an accent/i);
  assert.match(VOICE_INSTRUCTIONS, /sentence that is mainly English/i);
  assert.match(VOICE_INSTRUCTIONS, /stay in English and ask a normal content clarification/i);
  assert.match(VOICE_INSTRUCTIONS, /explicitly asks to speak another language/i);
  assert.match(VOICE_INSTRUCTIONS, /coherent complete utterance is primarily non-English/i);
  assert.match(VOICE_INSTRUCTIONS, /Would you like to continue in \[language\], or stay in English\?/i);
  assert.match(VOICE_INSTRUCTIONS, /If the language is uncertain, do not guess its name/i);
  assert.match(VOICE_INSTRUCTIONS, /If speech is clearly not addressed to you, do not respond/i);
  assert.match(VOICE_INSTRUCTIONS, /cannot use the internet/i);
  assert.match(VOICE_INSTRUCTIONS, /Never mention internal vendors or booking-platform names/i);
});

test("slow lookup progress is contextual and presence checks are narrow", () => {
  assert.equal(voiceLookupLabel("What will the weather be tonight?"), "the latest weather information");
  assert.equal(voiceLookupLabel("Find three Italian restaurants"), "those restaurant options");
  assert.equal(voiceLookupLabel("What events are scheduled this weekend?"), "the current event information");
  assert.equal(voiceLookupLabel("Please check my reservation"), "your request");
  assert.equal(voiceLookupLabel("Tell me more"), "the information you asked for");
  for (const phrase of ["Hello?", "Are you still there?", "Still checking?", "Can you hear me?", "What happened?"]) {
    assert.equal(isVoicePresenceCheck(phrase), true, phrase);
  }
  assert.equal(isVoicePresenceCheck("Never mind, what is the weather?"), false);
  assert.equal(isVoicePresenceCheck("Are you there and can you find another restaurant?"), false);
});

test("Voice Lab measures quiet time from audio playback and intercepts pending presence checks", async () => {
  const source = await readFile(new URL("../pages/voice-lab.js", import.meta.url), "utf8");
  assert.match(source, /event\.type === "output_audio_buffer\.stopped"/);
  assert.match(source, /armProgressTimer\(pendingCallId\)/);
  assert.match(source, /fallbackTimer = setTimeout\(\(\) => requestProgressCheckIn\(callId\), VOICE_TOOL_PROGRESS_FALLBACK_MS\)/);
  assert.match(source, /!pending\.silenceClockStarted[\s\S]{0,120}pending\.silenceClockStarted = true/);
  assert.match(source, /clearTimeout\(pending\.silenceTimer\)[\s\S]{0,100}clearTimeout\(pending\.fallbackTimer\)/);
  assert.doesNotMatch(source, /elapsedSinceAudioStopped/);
  assert.match(source, /max_output_tokens: 240/);
  assert.match(source, /isVoicePresenceCheck\(event\.transcript\)[\s\S]{0,100}handlePendingPresenceCheck\(\)/);
  assert.match(source, /type: "response\.cancel"/);
});

test("all active Destiny policy sources use the confirmed 30-day commercial terms", async () => {
  const sources = await Promise.all([
    readFile(new URL("../lib/destiny-agent/knowledge-v1.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/destiny/knowledge.js", import.meta.url), "utf8"),
    readFile(new URL("../pages/api/chat.js", import.meta.url), "utf8"),
  ]);
  for (const source of sources) {
    assert.match(source, /remaining balance is due 30 days before arrival/i);
    assert.match(source, /Cancelling more than 30 days before arrival forfeits/i);
    assert.doesNotMatch(source, /45 days before arrival|within 45 days|45\+ days/i);
  }
});

test("Voice availability output does not expose the internal booking platform", async () => {
  const source = await readFile(new URL("../pages/api/destiny-voice-availability.js", import.meta.url), "utf8");
  assert.match(source, /const reply = `Live availability for/);
  assert.doesNotMatch(source, /const reply = `Live OwnerRez availability/);
});

test("Voice companion links allow, label, and deduplicate trusted URLs", () => {
  const links = extractVoiceCompanionLinks("Book https://www.destincondogetaways.com/pelican-beach-resort-unit-707-orp5b47b5ax and again https://www.destincondogetaways.com/pelican-beach-resort-unit-707-orp5b47b5ax. Try https://www.tripshock.com/foo?aff=destindreamcondo");
  assert.deepEqual(links.map(link => link.label), ["Book Unit 707", "Explore activities"]);
  assert.equal(links.length, 2);
});

test("Voice companion links reject untrusted and lookalike hosts", () => {
  const links = extractVoiceCompanionLinks("https://evil.example/phish https://destincondogetaways.com.evil.example/fake https://destincondogetaways.com/availability");
  assert.deepEqual(links, [{ href: "https://destincondogetaways.com/availability", label: "Check availability" }]);
});
