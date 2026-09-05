import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validRecordingId, validRecordingFile, recordingCookie, recordingUploader, recordingReader, sealRecording, openRecording } from "../lib/voice-recording-access.js";
import { VoiceTestCapture } from "../lib/destiny-agent/voice-test-capture.js";
import { VoiceRecordingOutbox } from "../lib/destiny-agent/voice-recording-outbox.js";

test("recording storage paths reject traversal and unbounded chunks", () => {
  assert.ok(validRecordingId("a".repeat(32)));
  assert.equal(validRecordingId("../"), false);
  for (const value of ["../snapshot.json", "guest-00200.bin", "guest-99999.bin", "other.bin"]) assert.equal(validRecordingFile(value), false);
  assert.ok(validRecordingFile("guest-00199.bin"));
  assert.ok(validRecordingFile("snapshot.json"));
});
test("upload cookie expires and cannot authenticate the downloader", () => {
  const secret = "owner-upload-key", now = 1000;
  const req = { headers: { cookie: `voice_upload=${recordingCookie(secret, now + 1000)}` } };
  assert.equal(recordingUploader(req, secret, now), true);
  assert.equal(recordingUploader(req, "wrong-key", now), false);
  assert.equal(recordingUploader(req, secret, now + 2000), false);
  assert.equal(recordingReader(req, "download-key"), false);
  assert.equal(recordingReader({ headers: { authorization: "Bearer download-key" } }, "download-key"), true);
});
test("stored recordings are encrypted and bound to their exact path", () => {
  const original = Buffer.from("Private audio bytes"), secret = "download-key", path = "a/guest-00000.bin";
  const encrypted = sealRecording(original, secret, path);
  assert.equal(encrypted.includes(original), false);
  assert.deepEqual(openRecording(encrypted, secret, path), original);
  assert.throws(() => openRecording(encrypted, "wrong", path));
  assert.throws(() => openRecording(encrypted, secret, "other-path"));
});
test("recording limits finalize persisted audio without owning call termination", async () => {
  let trackStops = 0, callback = 0; const saved = [];
  class Recorder {
    static isTypeSupported() { return true; }
    constructor() { this.state = "inactive"; this.mimeType = "audio/webm"; }
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.ondataavailable({ data: new Blob(["final audio"]) }); queueMicrotask(() => this.onstop()); }
  }
  const capture = new VoiceTestCapture({ Recorder, metadata: {}, persist: (file, blob) => saved.push({ file, blob }), onLimit: () => callback++ });
  capture.attach("guest", { getAudioTracks: () => [{ stop: () => trackStops++, getSettings: () => ({}) }] });
  capture.limit(); await capture.stop();
  assert.equal(callback, 1); assert.equal(trackStops, 0);
  assert.equal(await saved.find(x => x.file === "guest-00000.bin").blob.text(), "final audio");
  assert.equal(JSON.parse(await saved.at(-1).blob.text()).finalized, true);
  const page = readFileSync(new URL("../pages/voice-lab.js", import.meta.url), "utf8");
  assert.doesNotMatch(page, /onLimit:\s*\(\) => stopCall/);
  assert.match(page, /recording_limit_call_continues/);
});

test("pending audio survives an outbox instance closing and retries without deletion on failure", async () => {
  const previousIdb = globalThis.indexedDB, previousFetch = globalThis.fetch;
  const records = new Map(); let uploads = 0;
  globalThis.indexedDB = { open() {
    const request = {};
    setTimeout(() => {
      request.result = { close() {}, transaction() {
        const tx = {};
        const requestFor = result => {
          const req = { result };
          setTimeout(() => { req.onsuccess?.(); setTimeout(() => tx.oncomplete?.(), 0); }, 0);
          return req;
        };
        tx.objectStore = () => ({
          put: item => { records.set(item.key, item); return requestFor(item.key); },
          getAll: () => requestFor([...records.values()]),
          get: key => requestFor(records.get(key)),
          delete: key => { records.delete(key); return requestFor(undefined); },
        });
        return tx;
      } };
      request.onsuccess();
    }, 0);
    return request;
  } };
  const first = new VoiceRecordingOutbox();
  let second;
  try {
    globalThis.fetch = async () => { uploads++; return { ok: false }; };
    first.save("a".repeat(32), "guest-00000.bin", new Blob(["test audio"]));
    await first.saving;
    for (let i = 0; i < 100 && (first.busy || uploads === 0); i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(records.size, 1); assert.ok(uploads >= 1);
    first.close();
    globalThis.fetch = async () => ({ ok: true });
    second = new VoiceRecordingOutbox();
    await second.flush();
    assert.equal(records.size, 0);
  } finally { first.close(); second?.close(); globalThis.indexedDB = previousIdb; globalThis.fetch = previousFetch; }
});
