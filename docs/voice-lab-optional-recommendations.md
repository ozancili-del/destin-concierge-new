# Voice Lab deferred recommendations

Recorded from the September 3, 2026 Realtime lifecycle review. These items are intentionally deferred, not rejected. They must be evaluated separately after the core response, playback, interruption, and task-coordination implementation is stable.

## Audio and speech classification

- Add locally computed RMS/energy summaries only if transcript-gated ducking still produces too many false classifications. Do not retain raw PCM.
- Investigate echo-correlation only if browser echo cancellation and the single-output audio graph are insufficient.
- Add sophisticated directed-speech or side-conversation detection only after real-call evidence shows the deterministic conservative classifier is inadequate.
- Consider a second AI classifier only if deterministic rules plus Realtime transcription cannot safely distinguish directed speech. It must never be on the immediate ducking path.
- Consider a concise repair/repeat mechanism when a false duck causes the guest to miss an important factual clause.

## Realtime tuning

- Keep semantic VAD eagerness at `high` initially. A/B test `medium` only after collecting baseline turn-fragmentation and latency measurements.
- Measure the latency and reliability effect of waiting for `conversation.item.created` acknowledgement for every function output before requesting the continuation. Adopt acknowledgement gating only if it improves correctness without materially hurting fast availability.
- Use manual `conversation.item.truncate` only when an exact assistant item, content index, and reliable played-audio offset are available and server-managed WebRTC clearing did not already synchronize the conversation.

## Product behavior

- Add explicit multi-task stacking for requests containing “also.” Until designed and tested, the newest directed substantive task wins.
- Build authenticated arbitrary-reservation lookup, identity verification, and protected booking-code access as a separate product project. Do not mix it into the interruption repair.
- Remove the visible transcript from the eventual guest experience; retain only useful companion links and an optional email/mobile sharing flow, as previously directed.

## Rollout and operations

- Run a public percentage canary only after the private Voice Lab passes the scripted device matrix. The current surface remains private.
- Expand device testing across desktop Safari, iOS Safari, Android Chrome, wired/Bluetooth routes, route changes, background/foreground, screen lock, incoming audio interruption, and low-power mode.
- Calibrate the Web Audio duck gain, attack, and restore ramps from device recordings. Preserve the regular `<audio>` element fallback.
- Add full lifecycle shadow comparison and production promotion dashboards if Voice graduates beyond private testing.
- Add aggregate audio-delta and optional audio-energy telemetry only with explicit retention/privacy review.

## Promotion evidence required

- Zero overlapping audible owners, progress/final overlaps, stale cross-call effects, duplicate tool executions, and duplicate finals.
- Zero task cancellations from scripted cough/throat-clear/noise cases.
- Measured acceptable duck onset, fast-availability latency, restoration behavior, and mobile playback reliability.
