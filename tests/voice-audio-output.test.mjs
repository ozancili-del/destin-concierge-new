import test from "node:test";
import assert from "node:assert/strict";
import { VoiceAudioOutputController } from "../lib/destiny-agent/voice-audio-output.js";

class FakeGainParameter {
  constructor() { this.value = 1; this.ramps = []; }
  cancelScheduledValues() {}
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value, time) { this.value = value; this.ramps.push({ value, time }); }
}

class FakeAudioContext {
  constructor() { this.state = "running"; this.currentTime = 10; this.destination = {}; }
  createGain() { return { gain: new FakeGainParameter(), connect() {}, disconnect() {} }; }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  async resume() { this.state = "running"; }
  async close() { this.state = "closed"; }
}

test("Web Audio output ducks immediately and restores without pausing playback", async () => {
  const previous = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;
  const audioElement = { srcObject: null, volume: 1, pauseCount: 0, pause() { this.pauseCount += 1; } };
  try {
    const controller = new VoiceAudioOutputController({ audioElement });
    assert.equal(await controller.prepare(), true);
    assert.equal(await controller.attach({ id: "remote" }), "web_audio");
    controller.duck();
    assert.equal(controller.gain.gain.value, 0.22);
    controller.restore();
    assert.equal(controller.gain.gain.value, 1);
    assert.equal(audioElement.pauseCount, 1, "the fallback element is disabled, not used as a second audible sink");
    await controller.close();
  } finally {
    globalThis.AudioContext = previous;
  }
});

test("audio element fallback remains available when Web Audio is unsupported", async () => {
  const previous = globalThis.AudioContext;
  const previousWebkit = globalThis.webkitAudioContext;
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  const audioElement = { srcObject: null, volume: 1, played: false, async play() { this.played = true; }, pause() {} };
  try {
    const controller = new VoiceAudioOutputController({ audioElement });
    assert.equal(await controller.prepare(), false);
    assert.equal(await controller.attach({ id: "remote" }), "element");
    controller.duck();
    assert.equal(audioElement.volume, 0.22);
    controller.restore();
    assert.equal(audioElement.volume, 1);
  } finally {
    if (previous) globalThis.AudioContext = previous;
    if (previousWebkit) globalThis.webkitAudioContext = previousWebkit;
  }
});
