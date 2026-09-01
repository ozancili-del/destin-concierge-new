import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createVoiceOpeningGreetingEvent, IMMEDIATE_VOICE_FACTS, VOICE_INSTRUCTIONS, VOICE_MAX_OUTPUT_TOKENS, VOICE_MODEL, VOICE_OPENING_GREETING, VOICE_OUTPUT, VOICE_TOOL_PROGRESS_DELAY_MS, VOICE_TOOL_PROGRESS_INSTRUCTIONS } from "../lib/destiny-agent/voice-experience.js";
import { extractVoiceCompanionLinks } from "../lib/destiny-agent/voice-links.js";

test("Voice Lab uses the friendlier normal-speed voice", () => {
  assert.equal(VOICE_MODEL, "gpt-realtime-2");
  assert.equal(VOICE_MAX_OUTPUT_TOKENS, 900);
  assert.equal(VOICE_TOOL_PROGRESS_DELAY_MS, 6000);
  assert.match(VOICE_TOOL_PROGRESS_INSTRUCTIONS, /I’m still here—still checking that for you/);
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

test("Voice routing makes stable facts immediate and keeps fresh and protected checks", () => {
  assert.equal(Object.keys(IMMEDIATE_VOICE_FACTS).length, 7);
  assert.match(VOICE_INSTRUCTIONS, /answer directly and immediately/i);
  assert.match(VOICE_INSTRUCTIONS, /Fresh checks: availability, weather, beach conditions, events, prices, and schedules/i);
  assert.match(VOICE_INSTRUCTIONS, /Protected checks: reservation details, door codes, maintenance actions/i);
  assert.match(VOICE_INSTRUCTIONS, /Before ask_destiny_brain, say one short, relevant acknowledgement/i);
  assert.match(VOICE_INSTRUCTIONS, /Do not repeat the acknowledgement while the same lookup is pending/i);
  assert.match(VOICE_INSTRUCTIONS, /Never say “including zero” to a guest/i);
  assert.match(VOICE_INSTRUCTIONS, /Do not automatically end replies with “Anything else\?”/i);
  assert.doesNotMatch(IMMEDIATE_VOICE_FACTS.pools, /three heated pools/i);
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
