// Local-only diagnostics. Never owns, pauses, or stops the live audio tracks.
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export async function makeDiagnosticZip(files) {
  const local = [], central = [];
  let offset = 0, centralSize = 0;
  for (const [name, value] of Object.entries(files)) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error("Unsafe diagnostic filename");
    const bytes = new Uint8Array(await new Blob([value]).arrayBuffer());
    const filename = new TextEncoder().encode(name);
    const checksum = crc32(bytes);
    const header = new Uint8Array(30 + filename.length);
    const h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true);
    h.setUint32(14, checksum, true); h.setUint32(18, bytes.length, true); h.setUint32(22, bytes.length, true);
    h.setUint16(26, filename.length, true); header.set(filename, 30);
    const directory = new Uint8Array(46 + filename.length);
    const d = new DataView(directory.buffer);
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true);
    d.setUint32(16, checksum, true); d.setUint32(20, bytes.length, true); d.setUint32(24, bytes.length, true);
    d.setUint16(28, filename.length, true); d.setUint32(42, offset, true); directory.set(filename, 46);
    local.push(header, bytes); central.push(directory);
    offset += header.length + bytes.length; centralSize += directory.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, central.length, true); e.setUint16(10, central.length, true);
  e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  return new Blob([...local, ...central, end], { type: "application/zip" });
}

export class VoiceTestCapture {
  constructor({ metadata, now = () => performance.now(), Recorder = globalThis.MediaRecorder, onLimit = () => {}, persist = null }) {
    if (!Recorder) throw new Error("Audio recording is unavailable in this browser");
    this.Recorder = Recorder; this.now = now; this.metadata = metadata;
    this.events = []; this.tracks = []; this.closed = false; this.bytes = 0;
    this.persist = persist;
    this.snapshotTimer = persist ? setInterval(() => this.checkpoint(), 4000) : null;
    this.limit = () => {
      if (!this.closed) {
        this.event({ eventType: "recording_limit" });
        try { onLimit(); } finally { this.stop(); }
      }
    };
    this.timer = setTimeout(this.limit, 180000);
  }
  event(event) {
    if (!this.closed && this.events.length < 20000) this.events.push({ monotonicMs: this.now(), ...event });
  }
  attach(label, stream) {
    if (this.closed || this.tracks.some(track => track.label === label)) return;
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(type => this.Recorder.isTypeSupported(type));
    const recorder = new this.Recorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000 });
    const track = { label, recorder, chunks: [], startedMs: this.now(), settings: stream.getAudioTracks()[0]?.getSettings?.() || {} };
    // Do not retain device/group identifiers in diagnostic exports.
    delete track.settings.deviceId; delete track.settings.groupId;
    track.done = new Promise(resolve => { track.finish = resolve; });
    recorder.ondataavailable = ({ data }) => {
      if (data?.size) {
        this.bytes += data.size;
        // Mobile recorders can batch large blobs after being backgrounded.
        // Split transport pieces; concatenation preserves the original media bytes.
        for (let offset = 0; offset < data.size; offset += 480000) {
          const part = data.slice(offset, offset + 480000, data.type);
          const index = track.chunks.length;
          track.chunks.push(part);
          try { this.persist?.(`${label}-${String(index).padStart(5, "0")}.bin`, part); } catch {}
        }
        this.checkpoint();
      }
      if (this.bytes > 16 * 1024 * 1024) this.limit();
    };
    recorder.onstop = () => { track.stoppedMs = this.now(); clearTimeout(track.stopTimer); track.finish(); this.checkpoint(); };
    recorder.onerror = () => this.event({ eventType: "recording_error", text: label });
    this.tracks.push(track);
    try { recorder.start(2000); } catch (error) { this.tracks.pop(); throw error; }
  }
  stop() {
    if (this.stopping) return this.stopping;
    this.closed = true; clearTimeout(this.timer); clearInterval(this.snapshotTimer);
    for (const track of this.tracks) {
      // A broken browser recorder must not block exporting the remaining evidence.
      track.stopTimer = setTimeout(() => { track.incomplete = true; track.finish(); }, 3000);
      if (track.recorder.state !== "inactive") {
        try { track.recorder.stop(); } catch { track.incomplete = true; track.finish(); }
      } else { clearTimeout(track.stopTimer); track.finish(); }
    }
    this.stopping = Promise.all(this.tracks.map(track => track.done)).then(() => this.checkpoint(true));
    return this.stopping;
  }
  checkpoint(finalized = false) {
    if (!this.persist) return;
    const snapshot = { schemaVersion: 1, ...this.metadata, finalized, updatedAt: new Date().toISOString(),
      events: this.events, tracks: this.tracks.map(track => ({ label: track.label, chunks: track.chunks.length,
        mime: track.recorder.mimeType, startedMs: track.startedMs, stoppedMs: track.stoppedMs, settings: track.settings })) };
    try { this.persist("snapshot.json", new Blob([JSON.stringify(snapshot)], { type: "application/json" })); } catch {}
  }
  async zip() {
    await this.stop();
    const files = {};
    const tracks = this.tracks.map(track => {
      const mime = track.recorder.mimeType || track.chunks[0]?.type || "application/octet-stream";
      const file = `${track.label}.${mime.includes("mp4") ? "m4a" : mime.includes("webm") ? "webm" : "bin"}`;
      files[file] = new Blob(track.chunks, { type: mime });
      return { file, mime, startedMs: track.startedMs, stoppedMs: track.stoppedMs, incomplete: !!track.incomplete, settings: track.settings };
    });
    files["run.json"] = JSON.stringify({ schemaVersion: 1, ...this.metadata, tracks,
      limitations: "Destiny is received digital audio BEFORE local volume/ducking and physical speaker output. Logs describe playback events, not proof of audible delivery. Guest capture follows track mute. Synthetic tests bypass microphone acoustics." }, null, 2);
    files["events.json"] = JSON.stringify(this.events, null, 2);
    files["report.json"] = JSON.stringify(summarizeVoiceTest(this.events), null, 2);
    return makeDiagnosticZip(files);
  }
}

export function summarizeVoiceTest(events) {
  const steps = events.filter(e => e.eventType === "fixture_ended").map(end => {
    const nextStart = events.find(e => e.eventType === "fixture_started" && e.monotonicMs > end.monotonicMs);
    const window = events.filter(e => e.monotonicMs >= end.monotonicMs && (!nextStart || e.monotonicMs < nextStart.monotonicMs));
    const playback = window.find(e => e.eventType === "audio_playback_started");
    return { fixture: end.text, endMs: end.monotonicMs, nextPlaybackEventLatencyMs: playback ? playback.monotonicMs - end.monotonicMs : null,
      userTranscripts: window.filter(e => e.eventType === "user_transcript").map(e => e.text),
      note: "Timing observation, not a correctness or physical audibility verdict." };
  });
  return { verdict: "REQUIRES_AUDIO_REVIEW", steps,
    clears: events.filter(e => e.eventType === "audio_playback_cleared"),
    errors: events.filter(e => e.eventType === "error" || e.eventType === "recording_error"),
    ending: events.findLast(e => e.eventType === "call_ended")?.text || "not captured" };
}
