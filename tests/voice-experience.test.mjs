import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildVoiceInstructions, classifyVoiceUtterance, createVoiceCallIdentity, createVoiceOpeningGreetingEvent, IMMEDIATE_VOICE_FACTS, isStableVoiceStopPartial, isVoicePresenceCheck, isVoiceTranscriptionArtifact, resolveVoiceModel, voiceLookupLabel, voiceProgressInstructions, VOICE_EXPERIMENT_MODELS, VOICE_INPUT_CLASSIFICATION_TIMEOUT_MS, VOICE_INSTRUCTIONS, VOICE_MAX_OUTPUT_TOKENS, VOICE_MODEL, VOICE_OPENING_GREETING, VOICE_OUTPUT, VOICE_TOOL_PROGRESS_SILENCE_MS } from "../lib/destiny-agent/voice-experience.js";
import { extractVoiceCompanionLinks } from "../lib/destiny-agent/voice-links.js";

test("Voice Lab uses the friendlier normal-speed voice", () => {
  assert.equal(VOICE_MODEL, "gpt-realtime-2");
  assert.deepEqual(VOICE_EXPERIMENT_MODELS, ["gpt-realtime-2", "gpt-realtime-2.1"]);
  assert.equal(resolveVoiceModel("gpt-realtime-2.1"), "gpt-realtime-2.1");
  assert.equal(resolveVoiceModel("not-an-allowed-model"), VOICE_MODEL);
  assert.equal(VOICE_MAX_OUTPUT_TOKENS, 900);
  assert.equal(VOICE_TOOL_PROGRESS_SILENCE_MS, 5000);
  assert.equal(VOICE_INPUT_CLASSIFICATION_TIMEOUT_MS, 2400);
  assert.match(voiceProgressInstructions("those restaurant options"), /I’m still checking those restaurant options for you/);
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
  assert.match(source, /coordinatorRef\.current\.request\("opening", opening\.response/);
  assert.doesNotMatch(source, /session\.created[\s\S]{0,500}createVoiceOpeningGreetingEvent/);
});

test("Voice Lab prevents startup audio from interrupting its own greeting", async () => {
  const source = await readFile(new URL("../pages/voice-lab.js", import.meta.url), "utf8");
  assert.match(source, /stream\.getAudioTracks\(\)\.forEach\(track => \{ track\.enabled = false; \}\)/);
  assert.match(source, /finishOpeningGreeting[\s\S]{0,400}track\.enabled = !userDesiredMutedRef\.current/);
  assert.match(source, /activeLease\(\)\?\.kind === "opening"[\s\S]{0,100}interrupt\("opening_timeout"\)/);
});

test("each Voice Lab call receives a fresh session and clears browser conversation state", async () => {
  const first = createVoiceCallIdentity(1_000, 0.123456789);
  const second = createVoiceCallIdentity(2_000, 0.987654321);
  assert.notEqual(first.sessionId, second.sessionId);
  assert.notEqual(first.callId, second.callId);

  const source = await readFile(new URL("../pages/voice-lab.js", import.meta.url), "utf8");
  assert.match(source, /const identity = createVoiceCallIdentity\(\)/);
  assert.match(source, /sessionRef\.current = identity\.sessionId/);
  assert.match(source, /sessionRef\.current = identity\.sessionId;[\s\S]{0,250}historyRef\.current = \[\]/);
  assert.match(source, /historyRef\.current = \[\];[\s\S]{0,150}setTranscript\(\[\]\);[\s\S]{0,150}setCompanionLinks\(\[\]\)/);
});

test("Realtime transcription favors English without seeding guest-like text", async () => {
  const source = await readFile(new URL("../pages/api/destiny-realtime.js", import.meta.url), "utf8");
  assert.match(source, /transcription:\s*\{\s*model:\s*"gpt-4o-mini-transcribe",\s*language:\s*"en"\s*\}/);
  assert.doesNotMatch(source, /transcription:\s*\{[^}]*prompt:/);
  assert.doesNotMatch(source, /transcription:[^\n]+prompt:/);
});

test("known transcription-hint echoes are suppressed narrowly", () => {
  assert.equal(isVoiceTranscriptionArtifact("Destiny, Destin, Pelican Beach Resort, condo, Unit 707, Unit 1006, Ozan"), true);
  assert.equal(isVoiceTranscriptionArtifact("Destiny Destin Pelican Beach Resort condo Unit 707 Unit 1006 Ozan."), true);
  assert.equal(isVoiceTranscriptionArtifact("Tell me about Unit 707"), false);
});

test("Voice receives Central date context and next-occurrence date behavior", () => {
  const instructions = buildVoiceInstructions(new Date("2026-09-03T12:00:00Z"));
  assert.match(instructions, /2026-09-03/);
  assert.match(instructions, /silently use the next upcoming occurrence/i);
  assert.match(instructions, /Do not mention the inferred year while collecting or correcting dates/i);
  assert.match(instructions, /including the year, once in the final availability or booking summary/i);
  assert.match(instructions, /Ask for the year only when/i);
});

test("Voice routing makes stable facts immediate and keeps fresh and protected checks", () => {
  assert.equal(Object.keys(IMMEDIATE_VOICE_FACTS).length, 12);
  assert.match(IMMEDIATE_VOICE_FACTS.wellness, /fitness center.*sauna.*steam room/i);
  assert.match(IMMEDIATE_VOICE_FACTS.recreation, /tennis.*pickleball.*grills/i);
  assert.match(IMMEDIATE_VOICE_FACTS.foodAndDrink, /café.*Tiki Bar.*hours must be checked/i);
  assert.match(IMMEDIATE_VOICE_FACTS.resortServices, /24-hour front desk.*security.*accessible parking.*vending.*Pool bracelets/i);
  assert.match(IMMEDIATE_VOICE_FACTS.amenities, /Laundry.*quarters or credit cards/i);
  assert.match(IMMEDIATE_VOICE_FACTS.arrivalTimes, /check-in is 4:00 PM Central Time.*checkout is 10:00 AM Central Time/i);
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
  assert.match(VOICE_INSTRUCTIONS, /English opening greeting does not establish the guest's conversation language/i);
  assert.match(VOICE_INSTRUCTIONS, /first meaningful guest utterance to establish the conversation language/i);
  assert.match(VOICE_INSTRUCTIONS, /reply naturally in that language immediately without first asking permission in English/i);
  assert.match(VOICE_INSTRUCTIONS, /Do not repeat the same confirmation in both languages/i);
  assert.match(VOICE_INSTRUCTIONS, /Once a guest language is established, keep using it/i);
  assert.match(VOICE_INSTRUCTIONS, /different language later does not by itself authorize a language switch/i);
  assert.match(VOICE_INSTRUCTIONS, /Never infer a language switch from an accent/i);
  assert.match(VOICE_INSTRUCTIONS, /sentence mainly in the established language/i);
  assert.match(VOICE_INSTRUCTIONS, /stay in the established language and ask a normal content clarification/i);
  assert.match(VOICE_INSTRUCTIONS, /explicitly asks to switch languages, switch immediately/i);
  assert.match(VOICE_INSTRUCTIONS, /coherent complete utterance later is clearly in a different language/i);
  assert.match(VOICE_INSTRUCTIONS, /ask briefly in the established language whether the guest wants to switch or continue/i);
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

test("voice utterance classification never treats duration alone as guest intent", () => {
  assert.equal(classifyVoiceUtterance(""), "noise");
  assert.equal(classifyVoiceUtterance("Destiny, Destin, Pelican Beach Resort, condo, Unit 707, Unit 1006, Ozan"), "noise");
  assert.equal(classifyVoiceUtterance("Are you still there?"), "presence");
  assert.equal(classifyVoiceUtterance("Please stop"), "interrupt_only");
  assert.equal(classifyVoiceUtterance("Never mind"), "cancel_task");
  assert.equal(classifyVoiceUtterance("What is the weather in November?"), "substantive");
  assert.equal(isStableVoiceStopPartial("stop"), true);
  assert.equal(isStableVoiceStopPartial("stop by the restaurant"), false);
});

test("Voice Lab measures quiet time from audio playback and intercepts pending presence checks", async () => {
  const source = await readFile(new URL("../pages/voice-lab.js", import.meta.url), "utf8");
  const realtimeSource = await readFile(new URL("../pages/api/destiny-realtime.js", import.meta.url), "utf8");
  assert.match(source, /event\.type === "output_audio_buffer\.stopped"/);
  assert.match(source, /armProgressTimer\(pendingCallId\)/);
  assert.doesNotMatch(source, /VOICE_TOOL_PROGRESS_FALLBACK_MS|progressFailsafe/);
  assert.equal((source.match(/max_output_tokens: 300/g) || []).length, 2, "progress and presence audio need enough budget to finish cleanly");
  assert.match(source, /classification === "presence"/);
  assert.match(source, /response_id: effect\.responseId/);
  assert.match(source, /type: "output_audio_buffer\.clear"/);
  assert.match(source, /expectedCallIds[\s\S]{0,500}wave\.callIds\.add\(callId\)/);
  assert.match(source, /wave\.progressRequested && !wave\.progressTerminal/);
  assert.match(source, /effect\.type === "dropped"/);
  assert.match(realtimeSource, /create_response:\s*false/);
  assert.match(realtimeSource, /interrupt_response:\s*false/);
  assert.doesNotMatch(source, /VOICE_BARGE_IN_CONFIRM_MS/);
  assert.match(source, /coordinatorRef\.current\.speechStarted\(candidateId\)/);
  assert.match(source, /coordinatorRef\.current\.restoreSpeech/);
  assert.match(source, /ignored_empty_audio_transcript/);
  assert.doesNotMatch(source, /pendingCommittedTurnsRef\.current\.delete\(turnId\);\s*supersedePendingTools\(\);\s*requestTurnResponse\(turnId\)/);
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
