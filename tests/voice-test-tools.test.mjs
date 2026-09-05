import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { crc32, makeDiagnosticZip, VoiceTestCapture, summarizeVoiceTest } from "../lib/destiny-agent/voice-test-capture.js";
import { validateVoiceSuite, VoiceFixtureRunner } from "../lib/destiny-agent/voice-fixture-runner.js";

test("synthetic caller starts after greeting without waiting for provider VAD", () => {
  const page = readFileSync(new URL("../pages/voice-lab.js", import.meta.url), "utf8");
  const openingComplete = page.slice(page.indexOf("const finishOpeningGreeting ="), page.indexOf("const requestFinalToolAnswer ="));
  assert.match(openingComplete, /fixtureRunnerRef\.current\?\.event\(\{ eventType: "listening" \}\)/);
  assert.ok(openingComplete.indexOf("track.enabled =") < openingComplete.indexOf("fixtureRunnerRef"));
});

test("ZIP stores correct CRC and directory offsets", async () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  const bytes = new Uint8Array(await (await makeDiagnosticZip({ "run.json": "{}" })).arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  const centralOffset = view.getUint32(bytes.length - 6, true);
  assert.equal(view.getUint32(centralOffset, true), 0x02014b50);
  assert.equal(view.getUint32(centralOffset + 42, true), 0);
  await assert.rejects(makeDiagnosticZip({ "../private": "no" }));
});

class Recorder {
  static isTypeSupported(type) { return type === "audio/mp4"; }
  constructor(stream, options) { this.stream = stream; this.mimeType = options.mimeType; this.state = "inactive"; }
  start() { this.state = "recording"; }
  stop() { this.state = "inactive"; this.ondataavailable({ data: new Blob(["audio"]) }); queueMicrotask(() => this.onstop()); }
}
test("capture never stops source tracks; stop is idempotent and exports final chunk", async () => {
  let stops = 0;
  const stream = { getAudioTracks: () => [{ getSettings: () => ({ deviceId: "secret", sampleRate: 48000 }), stop: () => stops++ }] };
  const capture = new VoiceTestCapture({ metadata: { callId: "test" }, Recorder, now: () => 12 });
  capture.attach("guest", stream); capture.attach("guest", stream);
  assert.equal(capture.tracks.length, 1);
  assert.equal(capture.tracks[0].settings.deviceId, undefined);
  capture.event({ eventType: "test" });
  await Promise.all([capture.stop(), capture.stop()]);
  assert.equal(stops, 0); assert.equal(capture.tracks[0].chunks.length, 1);
  assert.ok((await capture.zip()).size > 100);
});
test("capture unsupported browser fails before arming resources", () => {
  assert.throws(() => new VoiceTestCapture({ Recorder: null }), /unavailable/);
});
test("suite validates bounds and filenames", () => {
  assert.throws(() => validateVoiceSuite({ steps: [] }));
  assert.throws(() => validateVoiceSuite({ steps: [{ file: "../hi.wav", after: "listening" }] }));
  assert.throws(() => validateVoiceSuite({ steps: [{ file: "hi.wav", after: "listening", delayMs: -1 }] }));
  assert.throws(() => validateVoiceSuite({ steps: [{ file: "hi.wav", after: "anything" }] }));
  assert.equal(validateVoiceSuite({ steps: [{ file: "hi.wav", after: "listening" }] })[0].delayMs, 700);
});
test("runner injects once per trigger, never connects to speakers, and closes cleanly", async () => {
  let source, stopped = 0, connections = [];
  class Context {
    createMediaStreamDestination() { return { stream: { getTracks: () => [{ stop: () => stopped++ }] } }; }
    resume() { return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 1 }); }
    createBufferSource() { source = { connect: node => connections.push(node), disconnect() {}, start() {}, stop() {} }; return source; }
    close() { return Promise.resolve(); }
  }
  const events = [];
  const runner = new VoiceFixtureRunner({ Context, emit: event => events.push(event), onFinish() {} });
  await runner.prepare({ steps: [{ file: "hi.wav", after: "listening", delayMs: 0 }] }, [{ name: "hi.wav", size: 1, arrayBuffer: async () => new ArrayBuffer(1) }]);
  runner.event({ eventType: "unrelated" }); assert.equal(source, undefined);
  runner.event({ eventType: "listening" }); runner.event({ eventType: "listening" });
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(connections.length, 1); assert.equal(connections[0], runner.destination);
  source.onended(); assert.deepEqual(events.map(e => e.eventType), ["fixture_started", "fixture_ended"]);
  runner.close(); runner.close(); assert.equal(stopped, 1);
});
test("reports timing honestly rather than treating transcripts as heard audio", () => {
  const report = summarizeVoiceTest([{ eventType: "fixture_ended", text: "hello.wav", monotonicMs: 200 }, { eventType: "audio_playback_started", monotonicMs: 900 }]);
  assert.equal(report.steps[0].nextPlaybackEventLatencyMs, 700);
  assert.equal(report.verdict, "REQUIRES_AUDIO_REVIEW");
});
