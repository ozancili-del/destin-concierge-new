import test from "node:test";
import assert from "node:assert/strict";
import { IMMEDIATE_VOICE_FACTS, VOICE_INSTRUCTIONS, VOICE_MODEL, VOICE_OUTPUT } from "../lib/destiny-agent/voice-experience.js";
import { extractVoiceCompanionLinks } from "../lib/destiny-agent/voice-links.js";

test("Voice Lab uses the friendlier normal-speed voice", () => {
  assert.equal(VOICE_MODEL, "gpt-realtime-2");
  assert.deepEqual(VOICE_OUTPUT, { voice: "marin", speed: 1 });
});

test("Voice routing makes stable facts immediate and keeps fresh and protected checks", () => {
  assert.equal(Object.keys(IMMEDIATE_VOICE_FACTS).length, 7);
  assert.match(VOICE_INSTRUCTIONS, /answer directly and immediately/i);
  assert.match(VOICE_INSTRUCTIONS, /Fresh checks: availability, weather, beach conditions, events, prices, and schedules/i);
  assert.match(VOICE_INSTRUCTIONS, /Protected checks: reservation details, door codes, maintenance actions/i);
  assert.match(VOICE_INSTRUCTIONS, /do not say “let me check,” “please hold,”/i);
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
