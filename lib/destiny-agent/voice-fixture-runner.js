// A bounded synthetic caller. Sends real audio through the existing client gate.
// No model judging, no booking writes, no alternate conversation coordinator.
export function validateVoiceSuite(value) {
  if (!value || !Array.isArray(value.steps) || value.steps.length < 1 || value.steps.length > 12) throw new Error("Suite needs 1–12 steps");
  return value.steps.map(step => {
    if (!/^[\w.-]+\.(wav|mp3|m4a|webm|ogg)$/i.test(step.file || "")) throw new Error("Use a plain audio filename");
    if (!["listening", "audio_playback_started", "audio_playback_stopped", "fixture_ended"].includes(step.after)) throw new Error("Unknown step trigger");
    const delayMs = step.delayMs ?? 700;
    if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 10000) throw new Error("Step delay must be 0–10000 ms");
    return { file: step.file, after: step.after, delayMs };
  });
}

export class VoiceFixtureRunner {
  constructor({ emit, onFinish, Context = globalThis.AudioContext || globalThis.webkitAudioContext }) {
    this.context = new Context(); this.destination = this.context.createMediaStreamDestination();
    this.emit = emit; this.onFinish = onFinish; this.index = 0; this.closed = false;
  }
  async prepare(manifest, files) {
    await this.context.resume();
    this.steps = validateVoiceSuite(manifest); this.buffers = new Map();
    for (const step of this.steps) {
      if (this.buffers.has(step.file)) continue;
      const file = files.find(file => file.name === step.file);
      if (!file || file.size > 5 * 1024 * 1024) throw new Error(`Missing or oversized fixture: ${step.file}`);
      const buffer = await this.context.decodeAudioData(await file.arrayBuffer());
      if (buffer.duration > 20) throw new Error("Each fixture must be 20 seconds or less");
      this.buffers.set(step.file, buffer);
    }
    this.timer = setTimeout(() => this.finish("suite_time_limit"), 120000);
    return this.destination.stream;
  }
  event(event) {
    if (this.closed || this.waiting || this.source) return;
    const step = this.steps?.[this.index];
    if (!step || event.eventType !== step.after) return;
    this.waiting = setTimeout(() => {
      this.waiting = null;
      if (this.closed) return;
      const source = this.context.createBufferSource(); this.source = source;
      source.buffer = this.buffers.get(step.file); source.connect(this.destination);
      source.onended = () => {
        source.disconnect(); this.source = null;
        if (this.closed) return;
        this.index++;
        this.emit({ eventType: "fixture_ended", text: step.file });
        if (this.index === this.steps.length) this.tail = setTimeout(() => this.finish("suite_completed"), 20000);
      };
      this.emit({ eventType: "fixture_started", text: step.file });
      source.start();
    }, step.delayMs);
  }
  finish(reason) { if (!this.closed) { this.close(); this.onFinish(reason); } }
  close() {
    if (this.closed) return;
    this.closed = true; clearTimeout(this.timer); clearTimeout(this.tail); clearTimeout(this.waiting);
    try { this.source?.stop(); } catch {}
    this.source?.disconnect(); this.destination.stream.getTracks().forEach(track => track.stop());
    this.context.close().catch(() => {});
  }
}
