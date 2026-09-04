export const CLIENT_VOICE_GATE_DEFAULTS = Object.freeze({
  pollMs: 50,
  startFrames: 2,
  stopSilenceMs: 650,
  minimumCandidateMs: 180,
  absoluteThreshold: 0.018,
  noiseMultiplier: 3.2,
  quietClearMs: 700,
});

export function createClientVoiceGate({
  now = () => performance.now(),
  onStart = () => {},
  onStop = () => {},
  onQuietClear = () => {},
  options = {},
} = {}) {
  const config = { ...CLIENT_VOICE_GATE_DEFAULTS, ...options };
  let state = "quiet";
  let noiseFloor = 0.004;
  let loudFrames = 0;
  let candidateStartedAt = 0;
  let lastLoudAt = 0;
  let lastClearAt = 0;

  const reset = timestamp => {
    state = "quiet";
    loudFrames = 0;
    candidateStartedAt = 0;
    lastLoudAt = 0;
    lastClearAt = timestamp ?? now();
  };

  const sample = (rms, timestamp = now()) => {
    const level = Number.isFinite(rms) ? Math.max(0, rms) : 0;
    const threshold = Math.max(config.absoluteThreshold, noiseFloor * config.noiseMultiplier);
    const loud = level >= threshold;

    if (state === "quiet") {
      if (!loud) {
        noiseFloor = Math.max(0.001, noiseFloor * 0.96 + level * 0.04);
        loudFrames = 0;
        if (timestamp - lastClearAt >= config.quietClearMs) {
          lastClearAt = timestamp;
          onQuietClear({ timestamp, noiseFloor, threshold });
        }
        return;
      }
      loudFrames += 1;
      if (loudFrames < config.startFrames) return;
      state = "candidate";
      candidateStartedAt = timestamp - ((config.startFrames - 1) * config.pollMs);
      lastLoudAt = timestamp;
      onStart({ timestamp: candidateStartedAt, noiseFloor, threshold });
      return;
    }

    if (loud) lastLoudAt = timestamp;
    if (timestamp - lastLoudAt < config.stopSilenceMs) return;
    const durationMs = Math.max(0, lastLoudAt - candidateStartedAt);
    state = "quiet";
    loudFrames = 0;
    lastClearAt = timestamp;
    onStop({ timestamp, durationMs, commit: durationMs >= config.minimumCandidateMs, noiseFloor, threshold });
  };

  const forceStop = (timestamp = now()) => {
    if (state !== "candidate") return false;
    const durationMs = Math.max(0, timestamp - candidateStartedAt);
    state = "quiet";
    loudFrames = 0;
    lastClearAt = timestamp;
    onStop({ timestamp, durationMs, commit: durationMs >= config.minimumCandidateMs, noiseFloor, threshold: Math.max(config.absoluteThreshold, noiseFloor * config.noiseMultiplier), forced: true });
    return true;
  };

  return { sample, forceStop, reset, snapshot: () => ({ state, noiseFloor, candidateStartedAt, lastLoudAt, lastClearAt }) };
}

export function audioRms(samples) {
  if (!samples?.length) return 0;
  let sum = 0;
  for (let index = 0; index < samples.length; index += 1) sum += samples[index] * samples[index];
  return Math.sqrt(sum / samples.length);
}
