const NORMAL_GAIN = 1;
const DUCKED_GAIN = 0.22;

export class VoiceAudioOutputController {
  constructor({ audioElement, onError = () => {}, preferElementPlayback = false } = {}) {
    this.audioElement = audioElement || null;
    this.onError = onError;
    this.preferElementPlayback = preferElementPlayback;
    this.context = null;
    this.gain = null;
    this.source = null;
    this.stream = null;
    this.mode = "uninitialized";
  }

  async prepare() {
    // Mobile browsers can accept a Web Audio graph while producing no audible
    // WebRTC output. Keep their remote stream on the native media element,
    // which also preserves the browser's normal speaker-routing behavior.
    if (this.preferElementPlayback) return false;
    if (this.context) {
      if (this.context.state === "suspended") await this.context.resume();
      return true;
    }
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      this.context = new AudioContextClass();
      this.gain = this.context.createGain();
      this.gain.gain.value = NORMAL_GAIN;
      this.gain.connect(this.context.destination);
      if (this.context.state === "suspended") await this.context.resume();
      return true;
    } catch (error) {
      this.onError("audio_context_prepare_failed", error);
      await this.#closeContext();
      return false;
    }
  }

  async attach(stream) {
    this.stream = stream;
    if (this.context && this.gain) {
      try {
        this.source?.disconnect();
        this.source = this.context.createMediaStreamSource(stream);
        this.source.connect(this.gain);
        if (this.audioElement) {
          this.audioElement.pause();
          this.audioElement.srcObject = null;
        }
        this.mode = "web_audio";
        return "web_audio";
      } catch (error) {
        this.onError("audio_graph_attach_failed", error);
      }
    }
    if (!this.audioElement) throw new Error("No usable audio output is available");
    this.audioElement.srcObject = stream;
    this.audioElement.volume = NORMAL_GAIN;
    await this.audioElement.play();
    this.mode = "element";
    return "element";
  }

  duck() { this.#setGain(DUCKED_GAIN, 0.035); }
  restore() { this.#setGain(NORMAL_GAIN, 0.08); }

  async close() {
    this.source?.disconnect();
    this.source = null;
    this.gain?.disconnect();
    this.gain = null;
    this.stream = null;
    this.mode = "closed";
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement.volume = NORMAL_GAIN;
    }
    await this.#closeContext();
  }

  #setGain(value, seconds) {
    if (this.mode === "web_audio" && this.gain && this.context) {
      const parameter = this.gain.gain;
      const now = this.context.currentTime;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(parameter.value, now);
      parameter.linearRampToValueAtTime(value, now + seconds);
      return;
    }
    if (this.mode === "element" && this.audioElement) this.audioElement.volume = value;
  }

  async #closeContext() {
    if (!this.context) return;
    const context = this.context;
    this.context = null;
    try { await context.close(); } catch {}
  }
}
