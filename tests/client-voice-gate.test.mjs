import test from "node:test";
import assert from "node:assert/strict";
import { audioRms, createClientVoiceGate } from "../lib/destiny-agent/client-voice-gate.js";

test("client voice gate clears stale quiet audio and commits one completed candidate", () => {
  const events = [];
  const gate = createClientVoiceGate({
    onQuietClear: () => events.push("clear"),
    onStart: () => events.push("start"),
    onStop: event => events.push(event.commit ? "commit" : "discard"),
  });
  gate.reset(0);
  gate.sample(0.002, 700);
  gate.sample(0.04, 750);
  gate.sample(0.04, 800);
  gate.sample(0.04, 1000);
  gate.sample(0.002, 1700);
  assert.deepEqual(events, ["clear", "start", "commit"]);
});

test("brief impulse is discarded rather than committed", () => {
  const events = [];
  const gate = createClientVoiceGate({
    onStart: () => events.push("start"),
    onStop: event => events.push(event.commit ? "commit" : "discard"),
  });
  gate.reset(0);
  gate.sample(0.04, 50);
  gate.sample(0.04, 100);
  gate.sample(0.002, 800);
  assert.deepEqual(events, ["start", "discard"]);
});

test("a candidate can be force-committed when speaker echo prevents silence", () => {
  const events = [];
  const gate = createClientVoiceGate({ onStop: event => events.push(event) });
  gate.reset(0);
  gate.sample(0.04, 50);
  gate.sample(0.04, 100);
  assert.equal(gate.forceStop(2700), true);
  assert.equal(events[0].commit, true);
  assert.equal(events[0].forced, true);
  assert.equal(gate.forceStop(2800), false);
});

test("audioRms reports silence and signal energy", () => {
  assert.equal(audioRms(new Float32Array([0, 0, 0])), 0);
  assert.ok(Math.abs(audioRms(new Float32Array([0.5, -0.5])) - 0.5) < 0.0001);
});

test("realtime session disables provider-owned VAD", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../pages/api/destiny-realtime.js", import.meta.url), "utf8");
  assert.match(source, /turn_detection:\s*null/);
  assert.doesNotMatch(source, /turn_detection:\s*\{\s*type:\s*["']semantic_vad/);
});
