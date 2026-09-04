import Head from "next/head";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/VoiceLab.module.css";
import { VoiceResponseCoordinator } from "../lib/destiny-agent/voice-coordinator.js";
import { VoiceAudioOutputController } from "../lib/destiny-agent/voice-audio-output.js";
import { audioRms, createClientVoiceGate } from "../lib/destiny-agent/client-voice-gate.js";
import { extractVoiceCompanionLinks } from "../lib/destiny-agent/voice-links.js";
import { classifyVoiceUtterance, createVoiceCallIdentity, createVoiceOpeningGreetingEvent, inferExpectedVoiceReply, isDirectedVoiceUtterance, isExpectedVoiceReply, isVoiceTranscriptionArtifact, resolveVoiceModel, voiceLookupLabel, voiceProgressInstructions, VOICE_INPUT_CLASSIFICATION_TIMEOUT_MS, VOICE_MODEL, VOICE_TOOL_PROGRESS_SILENCE_MS } from "../lib/destiny-agent/voice-experience.js";

const initialStatus = "Tap the call button when you're ready.";

export async function getServerSideProps({ res }) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.setHeader("Cache-Control", "private, no-store");
  return { props: {} };
}

export default function VoiceLab() {
  const [status, setStatus] = useState(initialStatus);
  const [phase, setPhase] = useState("idle");
  const [transcript, setTranscript] = useState([]);
  const [companionLinks, setCompanionLinks] = useState([]);
  const [telemetryHealth, setTelemetryHealth] = useState({ storedThrough: 0, failure: "" });
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const audioOutputRef = useRef(null);
  const inputAudioContextRef = useRef(null);
  const inputAnalyserRef = useRef(null);
  const inputAnalysisTimerRef = useRef(null);
  const clientVoiceGateRef = useRef(null);
  const historyRef = useRef([]);
  const sessionRef = useRef(null);
  const callRef = useRef(null);
  const eventSequenceRef = useRef(0);
  const callStartedMonotonicRef = useRef(0);
  const seenProviderEventsRef = useRef(new Set());
  const logQueueRef = useRef(Promise.resolve());
  const logBufferRef = useRef([]);
  const logFlushTimerRef = useRef(null);
  const logRetryTimerRef = useRef(null);
  const logInFlightRef = useRef(new Map());
  const pendingToolsRef = useRef(new Map());
  const toolCallTombstonesRef = useRef(new Set());
  const toolWavesRef = useRef(new Map());
  const completedResponseIdsRef = useRef(new Set());
  const callEpochRef = useRef(0);
  const pendingCommittedTurnsRef = useRef(new Map());
  const activeCandidateRef = useRef(null);
  const transportIdRef = useRef(null);
  const voiceModelRef = useRef(VOICE_MODEL);
  const userDesiredMutedRef = useRef(false);
  const coordinatorEffectRef = useRef(() => {});
  const coordinatorRef = useRef(null);
  if (!coordinatorRef.current) coordinatorRef.current = new VoiceResponseCoordinator({ emit: effect => coordinatorEffectRef.current(effect) });
  const openingGreetingSentRef = useRef(false);
  const openingGreetingTimerRef = useRef(null);
  const cancellationWatchdogRef = useRef(null);
  const historySyncTimerRef = useRef(null);
  const expectedReplyRef = useRef(null);
  const disconnectGraceTimerRef = useRef(null);
  const setupAbortRef = useRef(null);

  const sendInputEvent = event => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== "open") return false;
    channel.send(JSON.stringify(event));
    return true;
  };

  const clearQuietInput = () => {
    if (userDesiredMutedRef.current || !streamRef.current?.getAudioTracks().some(track => track.enabled)) return;
    sendInputEvent({ type: "input_audio_buffer.clear", event_id: `input-clear-${Date.now()}` });
  };

  const startClientVoiceGate = async stream => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("This browser does not support safe voice interruption.");
    const context = new AudioContextClass();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.2;
    context.createMediaStreamSource(stream).connect(analyser);
    await context.resume();
    const samples = new Float32Array(analyser.fftSize);
    const gate = createClientVoiceGate({
      onQuietClear: clearQuietInput,
      onStart: ({ threshold, noiseFloor }) => {
        if (userDesiredMutedRef.current) return;
        const candidateId = `client-${callEpochRef.current}-${Date.now()}`;
        const activeLease = coordinatorRef.current.activeLease();
        activeCandidateRef.current = {
          candidateId,
          partial: "",
          interruptionConfirmed: false,
          coordinatorArmed: false,
          startedDuringPlayback: Boolean(activeLease && !activeLease.playbackTerminal),
        };
        pendingToolsRef.current.forEach(pending => {
          pending.timerGeneration += 1;
          clearTimeout(pending.silenceTimer);
        });
        setStatus(coordinatorRef.current.hasLease() ? "Destiny is speaking…" : "Listening…");
        queueVoiceEvent({ eventType: "client_vad_started", role: "system", text: `threshold=${threshold.toFixed(4)};noise=${noiseFloor.toFixed(4)}`, candidateId });
      },
      onStop: ({ durationMs, commit }) => {
        const candidate = activeCandidateRef.current;
        if (!candidate) return;
        queueVoiceEvent({ eventType: "client_vad_stopped", role: "system", text: `duration_ms=${Math.round(durationMs)};commit=${commit}`, candidateId: candidate.candidateId });
        if (!commit) {
          activeCandidateRef.current = null;
          clearQuietInput();
          return;
        }
        if (sendInputEvent({ type: "input_audio_buffer.commit", event_id: `input-commit-${candidate.candidateId}` })) {
          candidate.awaitingTranscript = true;
          queueVoiceEvent({ eventType: "input_commit_requested", role: "system", text: "client_voice_gate", candidateId: candidate.candidateId });
          if (!coordinatorRef.current.hasLease()) setStatus("Destiny is thinking…");
        }
      },
    });
    inputAudioContextRef.current = context;
    inputAnalyserRef.current = analyser;
    clientVoiceGateRef.current = gate;
    inputAnalysisTimerRef.current = setInterval(() => {
      if (context.state !== "running" || activeCandidateRef.current?.awaitingTranscript) return;
      analyser.getFloatTimeDomainData(samples);
      gate.sample(audioRms(samples));
    }, 50);
  };

  const armCancellationWatchdog = interruptedLease => {
    clearTimeout(cancellationWatchdogRef.current);
    cancellationWatchdogRef.current = setTimeout(() => {
      const active = coordinatorRef.current.activeLease();
      if (active && active.requestToken === interruptedLease?.requestToken) {
        coordinatorRef.current.probeCancellation(active.requestToken);
      }
    }, 4000);
  };

  const finishOpeningGreeting = () => {
    clearTimeout(openingGreetingTimerRef.current);
    openingGreetingTimerRef.current = null;
    clearTimeout(historySyncTimerRef.current);
    historySyncTimerRef.current = null;
    expectedReplyRef.current = null;
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !userDesiredMutedRef.current; });
    clientVoiceGateRef.current?.reset();
    clearQuietInput();
    setStatus("Listening — you can interrupt anytime.");
  };

  const requestFinalToolAnswer = waveId => {
    const wave = toolWavesRef.current.get(waveId);
    if (!wave || wave.finalRequested || wave.superseded) return;
    const pending = [...wave.callIds].map(callId => pendingToolsRef.current.get(callId)).find(Boolean);
    if (!pending) return;
    wave.callIds.forEach(callId => clearTimeout(pendingToolsRef.current.get(callId)?.silenceTimer));
    wave.finalRequested = true;
    coordinatorRef.current.request("tool_final", {}, { toolCallId: pending.callId, turnId: waveId, waveId });
  };

  const maybeFinalizeToolWave = waveId => {
    const wave = toolWavesRef.current.get(waveId);
    if (!wave || !wave.sealed || wave.superseded || wave.finalRequested) return;
    const calls = [...wave.callIds].map(callId => pendingToolsRef.current.get(callId));
    if (!calls.length || calls.some(pending => !pending || (!pending.resolved && !pending.superseded))) return;
    if (!wave.outputsSent) {
      const orderedCallIds = wave.expectedCallIds?.length ? wave.expectedCallIds : [...wave.callIds];
      orderedCallIds.forEach((callId, ordinal) => {
        const pending = pendingToolsRef.current.get(callId);
        if (!pending || pending.outputSent) return;
        pending.outputSent = true;
        channelRef.current?.send(JSON.stringify({
          type: "conversation.item.create",
          event_id: `tool-output-${callId}-${ordinal}`,
          item: { type: "function_call_output", call_id: callId, output: String(pending.output) },
        }));
      });
      wave.outputsSent = true;
    }
    if (wave.progressRequested && !wave.progressTerminal) {
      const active = coordinatorRef.current.activeLease();
      const ownsActiveProgress = active && ["tool_progress", "presence"].includes(active.kind) && active.context?.waveId === waveId;
      if (!ownsActiveProgress) {
        coordinatorRef.current.invalidateQueued(job => ["tool_progress", "presence"].includes(job.kind) && job.context?.waveId === waveId, "result_ready");
        wave.progressTerminal = true;
        requestFinalToolAnswer(waveId);
      } else {
        wave.finalQueued = true;
        if (active.playbackStatus !== "playing") {
          coordinatorRef.current.interrupt("progress_superseded_by_result", { dropQueued: false });
          armCancellationWatchdog(active);
        }
      }
    } else requestFinalToolAnswer(waveId);
  };

  const requestProgressCheckIn = callId => {
    const pending = pendingToolsRef.current.get(callId);
    if (!pending || pending.resolved || pending.superseded || pending.progressRequested || !channelRef.current) return;
    const wave = toolWavesRef.current.get(pending.originResponseId);
    if (!wave || wave.progressRequested || wave.superseded) return;
    clearTimeout(pending.silenceTimer);
    pending.progressRequested = true;
    wave.progressRequested = true;
    wave.progressCallId = callId;
    coordinatorRef.current.request("tool_progress", {
      conversation: "none",
      instructions: voiceProgressInstructions(pending.label),
      tools: [],
      tool_choice: "none",
      output_modalities: ["audio"],
      max_output_tokens: 300,
    }, { toolCallId: callId, turnId: pending.turnId, waveId: pending.originResponseId });
  };

  const flushVoiceEvents = ({ beacon = false } = {}) => {
    clearTimeout(logFlushTimerRef.current);
    logFlushTimerRef.current = null;
    const events = logBufferRef.current.splice(0, 12);
    if (!events.length) return;
    const body = JSON.stringify({ events });
    const batchId = `${events[0].eventId}:${events[events.length - 1].eventId}`;
    let beaconAccepted = true;
    if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const accepted = navigator.sendBeacon("/api/destiny-voice-events", new Blob([body], { type: "application/json" }));
      if (!accepted) {
        beaconAccepted = false;
        logBufferRef.current.unshift(...events);
        setTelemetryHealth(current => ({ ...current, failure: "browser_rejected_beacon" }));
      }
    } else {
      logInFlightRef.current.set(batchId, events);
      logQueueRef.current = logQueueRef.current.then(async () => {
        let lastStatus = 0;
        let lastReason = "network_error";
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const response = await fetch("/api/destiny-voice-events", {
              method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true,
            });
            lastStatus = response.status;
            const result = await response.json().catch(() => ({}));
            lastReason = result.reason || result.error || `http_${response.status}`;
            if (response.ok) {
              logInFlightRef.current.delete(batchId);
              const storedThrough = Math.max(...events.map(item => Number(item.sequence) || 0));
              setTelemetryHealth({ storedThrough, failure: "" });
              try { localStorage.setItem("destinyVoiceTelemetryCheckpoint", JSON.stringify({ callId: events[0].callId, storedThrough, at: new Date().toISOString() })); } catch {}
              return;
            }
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
              logInFlightRef.current.delete(batchId);
              setTelemetryHealth(current => ({ ...current, failure: `${response.status}:${lastReason}` }));
              try { localStorage.setItem("destinyVoiceTelemetryDeadLetter", JSON.stringify({ status: response.status, reason: lastReason, events })); } catch {}
              return;
            }
          } catch {}
          await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
        }
        logInFlightRef.current.delete(batchId);
        const queuedIds = new Set(logBufferRef.current.map(item => item.eventId));
        logBufferRef.current.unshift(...events.filter(item => !queuedIds.has(item.eventId)));
        const failure = `${lastStatus || "network"}:${lastReason}`;
        setTelemetryHealth(current => ({ ...current, failure }));
        console.warn("[VOICE LOG] event batch retained for retry", failure, events.map(item => item.eventId));
        clearTimeout(logRetryTimerRef.current);
        logRetryTimerRef.current = setTimeout(() => flushVoiceEvents(), 2500);
      });
    }
    if (logBufferRef.current.length) {
      if (beacon && beaconAccepted) flushVoiceEvents({ beacon: true });
      else logFlushTimerRef.current = setTimeout(() => flushVoiceEvents(), 150);
    }
  };

  const beaconOutstandingVoiceEvents = () => {
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
    const outstanding = [...logInFlightRef.current.values()].flat();
    const known = new Set(logBufferRef.current.map(item => item.eventId));
    outstanding.forEach(item => { if (!known.has(item.eventId)) logBufferRef.current.unshift(item); });
    flushVoiceEvents({ beacon: true });
  };

  const queueVoiceEvent = (event, { beacon = false } = {}) => {
    const callId = callRef.current;
    if (!callId) return;
    const sequence = ++eventSequenceRef.current;
    const providerEventId = String(event.providerEventId || "").trim();
    const eventId = `${callId}:${event.eventType}:${providerEventId || sequence}`;
    const snapshot = coordinatorRef.current.snapshot();
    const lease = snapshot.lease || {};
    const payload = {
      schemaVersion: 2,
      sessionId: sessionRef.current,
      callId,
      eventId,
      sequence,
      monotonicMs: Math.max(0, Math.round(performance.now() - callStartedMonotonicRef.current)),
      callEpoch: callEpochRef.current,
      transportId: transportIdRef.current || "",
      voiceModel: voiceModelRef.current,
      clearInitiator: lease.clearInitiator || "",
      responseId: lease.responseId || "",
      requestToken: lease.requestToken || "",
      leaseKind: lease.kind || "",
      playbackState: lease.playbackStatus || "",
      generationState: lease.generationStatus || "",
      candidateId: snapshot.candidate?.candidateId || "",
      taskId: lease.context?.taskId || "",
      waveId: lease.context?.waveId || "",
      turnId: lease.context?.turnId || "",
      queueDepth: snapshot.queueDepth,
      clientTimestamp: new Date().toISOString(),
      ...event,
    };
    logBufferRef.current.push(payload);
    if (beacon || logBufferRef.current.length >= 12) flushVoiceEvents({ beacon });
    else if (!logFlushTimerRef.current) logFlushTimerRef.current = setTimeout(() => flushVoiceEvents(), 350);
  };

  const addLine = (role, text) => {
    const clean = String(text || "").trim();
    if (!clean) return;
    setTranscript(current => [...current.slice(-5), { role, text: clean }]);
    historyRef.current = [...historyRef.current, { role, content: clean }].slice(-20);
  };

  const armProgressTimer = (callId, delayMs = VOICE_TOOL_PROGRESS_SILENCE_MS) => {
    const pending = pendingToolsRef.current.get(callId);
    if (!pending || pending.resolved || pending.superseded || pending.progressRequested) return;
    clearTimeout(pending.silenceTimer);
    const ownedEpoch = callEpochRef.current;
    const timerGeneration = ++pending.timerGeneration;
    pending.silenceTimer = setTimeout(() => {
      const current = pendingToolsRef.current.get(callId);
      if (callEpochRef.current !== ownedEpoch || !current || current.timerGeneration !== timerGeneration) return;
      requestProgressCheckIn(callId);
    }, Math.max(0, delayMs));
  };

  const handlePendingPresenceCheck = () => {
    const pendingEntry = [...pendingToolsRef.current.entries()].find(([, pending]) => !pending.resolved && !pending.superseded);
    if (!pendingEntry) return false;
    const [pendingCallId, pending] = pendingEntry;
    clearTimeout(pending.silenceTimer);
    coordinatorRef.current.request("presence", {
      conversation: "none",
      instructions: voiceProgressInstructions(pending.label),
      tools: [],
      tool_choice: "none",
      output_modalities: ["audio"],
      max_output_tokens: 300,
    }, { toolCallId: pendingCallId, turnId: pending.turnId, waveId: pending.originResponseId });
    pending.guestCheckIn = true;
    pending.progressRequested = true;
    return true;
  };

  const stopCall = ({ reason = "user_ended", beacon = false } = {}) => {
    if (callRef.current) queueVoiceEvent({ eventType: reason === "cancelled" ? "cancelled" : "call_ended", role: "system", text: reason }, { beacon });
    if (beacon) beaconOutstandingVoiceEvents();
    callEpochRef.current += 1;
    transportIdRef.current = null;
    coordinatorRef.current.end();
    const channel = channelRef.current;
    const peer = peerRef.current;
    const stream = streamRef.current;
    const audioOutput = audioOutputRef.current;
    const inputAudioContext = inputAudioContextRef.current;
    setupAbortRef.current?.abort();
    setupAbortRef.current = null;
    channelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
    audioOutputRef.current = null;
    inputAudioContextRef.current = null;
    inputAnalyserRef.current = null;
    clientVoiceGateRef.current = null;
    clearInterval(inputAnalysisTimerRef.current);
    inputAnalysisTimerRef.current = null;
    callRef.current = null;
    channel?.close();
    peer?.close();
    stream?.getTracks().forEach(track => track.stop());
    audioOutput?.close();
    inputAudioContext?.close().catch(() => {});
    if (audioRef.current) audioRef.current.srcObject = null;
    pendingToolsRef.current.forEach(pending => {
      clearTimeout(pending.silenceTimer);
      pending.abortController?.abort();
    });
    pendingToolsRef.current.clear();
    toolCallTombstonesRef.current.clear();
    toolWavesRef.current.clear();
    completedResponseIdsRef.current.clear();
    pendingCommittedTurnsRef.current.forEach(turn => {
      clearTimeout(turn.classificationTimer);
      clearTimeout(turn.decisionRetireTimer);
    });
    pendingCommittedTurnsRef.current.clear();
    clearTimeout(openingGreetingTimerRef.current);
    openingGreetingTimerRef.current = null;
    clearTimeout(cancellationWatchdogRef.current);
    cancellationWatchdogRef.current = null;
    clearTimeout(disconnectGraceTimerRef.current);
    disconnectGraceTimerRef.current = null;
    activeCandidateRef.current = null;
    openingGreetingSentRef.current = false;
    setPhase("idle");
    setStatus("Call ended. Tap to talk again.");
  };

  useEffect(() => () => stopCall({ reason: "page_unloaded", beacon: true }), []);

  const sendToolResult = async event => {
    let output;
    const startedAt = Date.now();
    const ownedEpoch = callEpochRef.current;
    const toolName = String(event.name || "unknown");
    const callId = String(event.call_id || event.event_id || `tool-${Date.now()}`);
    if (pendingToolsRef.current.has(callId) || toolCallTombstonesRef.current.has(callId)) return;
    toolCallTombstonesRef.current.add(callId);
    let args = {};
    try { args = JSON.parse(event.arguments || "{}"); } catch {}
    const label = voiceLookupLabel(args.query || event.name);
    const abortController = new AbortController();
    const originResponseId = String(event.response_id || `tool-wave-${callId}`);
    const pending = { callId, resolved: false, superseded: false, progressRequested: false, guestCheckIn: false, label, turnId: originResponseId, originResponseId, silenceTimer: null, timerGeneration: 0, abortController, output: null, outputSent: false };
    pendingToolsRef.current.set(callId, pending);
    let wave = toolWavesRef.current.get(originResponseId);
    if (!wave) {
      wave = { callIds: new Set(), expectedCallIds: [], outputsSent: false, sealed: completedResponseIdsRef.current.has(originResponseId), progressRequested: false, progressTerminal: false, progressCallId: null, finalQueued: false, finalRequested: false, superseded: false };
      toolWavesRef.current.set(originResponseId, wave);
    }
    wave.callIds.add(callId);
    queueVoiceEvent({ eventType: "tool_call", role: "system", toolName, providerEventId: event.call_id || event.event_id || "" });
    try {
      if (event.name === "check_live_availability") {
        const response = await fetch("/api/destiny-voice-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
          signal: abortController.signal,
        });
        const data = await response.json();
        output = data.reply || data.error || "Live availability could not be checked.";
      } else if (event.name === "ask_destiny_brain") {
        const question = String(args.query || "").trim();
        const lastHistory = historyRef.current.at(-1);
        const messages = (lastHistory?.role === "user" && lastHistory.content.trim() === question
          ? [...historyRef.current]
          : [...historyRef.current, { role: "user", content: question }]).slice(-20);
        const response = await fetch("/api/destiny-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, sessionId: sessionRef.current, voiceMode: true, pageSource: "voice-lab" }),
          signal: abortController.signal,
        });
        const data = await response.json();
        output = data.reply || data.message || "I couldn't retrieve that information.";
      } else {
        output = "That action is not available in this voice test.";
      }
    } catch (error) {
      if (error?.name === "AbortError" || pending.superseded || ownedEpoch !== callEpochRef.current) return;
      output = "The lookup failed. Please answer briefly without inventing any result.";
    }
    if (ownedEpoch !== callEpochRef.current || pending.superseded || callRef.current == null) return;
    queueVoiceEvent({
      eventType: "tool_result",
      role: "system",
      toolName,
      toolStatus: /failed|couldn.?t|unavailable|error/i.test(String(output)) ? "failed" : "completed",
      providerEventId: event.call_id || event.event_id || "",
      latencyMs: Date.now() - startedAt,
    });
    pending.resolved = true;
    pending.output = output;
    clearTimeout(pending.silenceTimer);
    const discoveredLinks = extractVoiceCompanionLinks(output);
    if (discoveredLinks.length) {
      setCompanionLinks(current => {
        const byHref = new Map(current.map(link => [link.href, link]));
        discoveredLinks.forEach(link => byHref.set(link.href, link));
        return [...byHref.values()].slice(-6);
      });
    }
    if (!coordinatorRef.current.hasLease() && !wave.progressRequested) armProgressTimer(callId);
    maybeFinalizeToolWave(originResponseId);
  };

  const requestTurnResponse = turnId => {
    coordinatorRef.current.request("turn", {}, { turnId });
  };

  const supersedeForegroundTool = () => {
    const candidates = [...pendingToolsRef.current.entries()].filter(([, pending]) => !pending.superseded);
    const foreground = candidates.at(-1);
    if (!foreground) return false;
    const [, foregroundPending] = foreground;
    const targetWaveId = foregroundPending.originResponseId;
    coordinatorRef.current.invalidateQueued(job => job.context?.waveId === targetWaveId || job.context?.turnId === targetWaveId, "task_superseded");
    pendingToolsRef.current.forEach((pending, pendingCallId) => {
      if (pending.originResponseId !== targetWaveId || pending.superseded) return;
      pending.superseded = true;
      pending.timerGeneration += 1;
      clearTimeout(pending.silenceTimer);
      pending.abortController?.abort();
      if (!pending.outputSent) {
        pending.outputSent = true;
        channelRef.current?.send(JSON.stringify({
          type: "conversation.item.create",
          event_id: `tool-output-superseded-${pendingCallId}`,
          item: { type: "function_call_output", call_id: pendingCallId, output: "The guest moved to a new request. Do not answer the superseded lookup." },
        }));
      }
      const wave = toolWavesRef.current.get(pending.originResponseId);
      if (wave) wave.superseded = true;
    });
    return true;
  };

  coordinatorEffectRef.current = effect => {
    const telemetryLease = effect.lease || effect.owner || effect.job || {};
    const lifecycleTypes = {
      state: "coordinator_state", queued: "lease_queued", dropped: "lease_dropped",
      bound: "lease_bound", released: "lease_released", send_response: "response_requested",
      send_cancel: "cancel_requested", clear_audio: "audio_clear_requested",
    };
    if (lifecycleTypes[effect.type]) {
      queueVoiceEvent({
        eventType: lifecycleTypes[effect.type], role: "system",
        text: String(effect.state || effect.reason || effect.type),
        reason: String(effect.reason || ""), responseId: String(effect.responseId || telemetryLease.responseId || ""),
        requestToken: String(telemetryLease.requestToken || ""), leaseKind: String(telemetryLease.kind || ""),
        coordinatorState: String(effect.state || ""), playbackState: String(telemetryLease.playbackStatus || ""),
        generationState: String(telemetryLease.generationStatus || ""), taskId: String(telemetryLease.context?.taskId || ""),
        waveId: String(telemetryLease.context?.waveId || ""), turnId: String(telemetryLease.context?.turnId || ""),
      });
    }
    if (effect.type === "duck_audio") {
      audioOutputRef.current?.duck();
      queueVoiceEvent({ eventType: "audio_duck_started", role: "system", text: effect.candidateId || "" });
      return;
    }
    if (effect.type === "restore_audio") {
      audioOutputRef.current?.restore();
      queueVoiceEvent({ eventType: "audio_duck_restored", role: "system", text: effect.reason || "" });
      return;
    }
    if (effect.type === "contain_unowned") {
      channelRef.current?.send(JSON.stringify({ type: "response.cancel", event_id: `contain-cancel-${effect.responseId}`, response_id: effect.responseId }));
      channelRef.current?.send(JSON.stringify({ type: "output_audio_buffer.clear", event_id: `contain-clear-${effect.responseId}` }));
      queueVoiceEvent({ eventType: "error", role: "system", text: "unowned_response_detected", providerEventId: effect.responseId });
      stopCall({ reason: "unowned_response_detected" });
      return;
    }
    if (effect.type === "dropped") {
      if (effect.job.kind === "tool_progress") {
        const pending = pendingToolsRef.current.get(effect.job.context.toolCallId);
        const wave = toolWavesRef.current.get(pending?.originResponseId);
        if (pending) pending.progressRequested = false;
        if (wave) wave.progressRequested = false;
      }
      if (effect.job.kind === "tool_final") {
        const wave = toolWavesRef.current.get(effect.job.context.waveId);
        if (wave) {
          wave.finalRequested = false;
          wave.finalQueued = true;
        }
      }
      return;
    }
    if (effect.type === "send_response") {
      channelRef.current?.send(JSON.stringify({
        type: "response.create",
        event_id: `response-${effect.job.requestToken}`,
        response: effect.job.response,
      }));
      return;
    }
    if (effect.type === "send_cancel") {
      channelRef.current?.send(JSON.stringify({
        type: "response.cancel",
        event_id: `cancel-${effect.responseId}`,
        response_id: effect.responseId,
      }));
      return;
    }
    if (effect.type === "clear_audio") {
      channelRef.current?.send(JSON.stringify({
        type: "output_audio_buffer.clear",
        event_id: `clear-${effect.responseId}`,
      }));
      return;
    }
    if (effect.type === "probe_sent") {
      queueVoiceEvent({ eventType: "cancellation_probe", role: "system", text: effect.reason, providerEventId: telemetryLease.responseId || "" });
      armCancellationWatchdog(effect.lease);
      return;
    }
    if (effect.type === "retire_connection") {
      queueVoiceEvent({ eventType: "connection_retired", role: "system", text: effect.reason, providerEventId: telemetryLease.responseId || "" }, { beacon: true });
      stopCall({ reason: "ownership_uncertain", beacon: true });
      setStatus("The voice connection paused safely. Tap to continue.");
      return;
    }
    if (effect.type === "repair_required") {
      queueVoiceEvent({ eventType: "repair_requested", role: "system", text: effect.reason, providerEventId: telemetryLease.responseId || "" });
      coordinatorRef.current.request("repair", {
        instructions: "The previous assistant audio was automatically cut off by a likely false interruption or background sound. Ignore that non-directed sound and naturally continue the answer from the point the guest may not have heard. Do not restart from the beginning, respond to the noise, or claim the guest heard the missing audio.",
        tools: [],
        tool_choice: "none",
        output_modalities: ["audio"],
        max_output_tokens: 500,
      }, { turnId: effect.lease?.context?.turnId || "", taskId: effect.lease?.context?.taskId || "", waveId: effect.lease?.context?.waveId || "" });
      return;
    }
    if (effect.type === "recovered") return;
    if (effect.type !== "released") return;
    clearTimeout(cancellationWatchdogRef.current);
    cancellationWatchdogRef.current = null;
    const { lease } = effect;
    if (lease.repairRequired && !lease.interrupted) return;
    if (lease.kind === "opening") {
      finishOpeningGreeting();
      return;
    }
    if (lease.kind === "tool_progress" || lease.kind === "presence") {
      const pending = pendingToolsRef.current.get(lease.context.toolCallId);
      const wave = toolWavesRef.current.get(pending?.originResponseId);
      if (wave) wave.progressTerminal = true;
      if (wave?.finalQueued) requestFinalToolAnswer(pending.originResponseId);
      else if (pending && !pending.resolved) setStatus("Still checking that for you…");
      return;
    }
    if (lease.kind === "tool_final") {
      const wave = toolWavesRef.current.get(lease.context.waveId);
      wave?.callIds.forEach(callId => pendingToolsRef.current.delete(callId));
      toolWavesRef.current.delete(lease.context.waveId);
    }
    if (!lease.interrupted && !coordinatorRef.current.hasLease()) setStatus("Listening — you can interrupt anytime.");
    pendingToolsRef.current.forEach((pending, pendingCallId) => {
      if (!pending.resolved && pending.originResponseId === lease.responseId) armProgressTimer(pendingCallId);
    });
  };

  const handleEvent = event => {
    if (event.type === "session.created") {
      setPhase("live");
      setStatus("Destiny is answering…");
      queueVoiceEvent({ eventType: "call_started", role: "system", providerEventId: event.event_id || event.session?.id || "" });
    }
    if (event.type === "response.created") {
      coordinatorRef.current.responseCreated(event.response);
      const lease = coordinatorRef.current.activeLease();
      queueVoiceEvent({ eventType: "response_created", role: "system", providerEventId: event.event_id || "", responseId: event.response?.id || "", requestToken: event.response?.metadata?.destiny_request_token || lease?.requestToken || "", leaseKind: event.response?.metadata?.destiny_kind || lease?.kind || "", generationState: event.response?.status || lease?.generationStatus || "" });
    }
    if (event.type === "input_audio_buffer.speech_started") {
      setStatus("Listening…");
      pendingToolsRef.current.forEach(pending => {
        pending.timerGeneration += 1;
        clearTimeout(pending.silenceTimer);
      });
      const candidateId = String(event.item_id || event.event_id || `candidate-${Date.now()}`);
      activeCandidateRef.current = { candidateId, partial: "", interruptionConfirmed: false, startedDuringPlayback: true };
      // Defensive fallback only. Production sessions use the client voice gate.
      coordinatorRef.current.speechStarted(candidateId);
      queueVoiceEvent({ eventType: "vad_started", role: "system", providerEventId: event.event_id || "", candidateId });
    }
    if (event.type === "input_audio_buffer.speech_stopped") {
      queueVoiceEvent({ eventType: "vad_stopped", role: "system", providerEventId: event.event_id || "", candidateId: activeCandidateRef.current?.candidateId || "" });
      if (!coordinatorRef.current.hasLease()) setStatus("Destiny is thinking…");
    }
    if (event.type === "input_audio_buffer.committed") {
      const turnId = String(event.item_id || event.event_id || `turn-${Date.now()}`);
      const ownedEpoch = callEpochRef.current;
      const candidateId = activeCandidateRef.current?.candidateId || turnId;
      const turn = { turnId, candidateId, startedDuringPlayback: Boolean(activeCandidateRef.current?.startedDuringPlayback), classificationTimer: null, decisionRetireTimer: null };
      turn.classificationTimer = setTimeout(() => {
        if (callEpochRef.current !== ownedEpoch || pendingCommittedTurnsRef.current.get(turnId) !== turn) return;
        turn.timedOut = true;
        turn.classificationTimer = null;
        queueVoiceEvent({ eventType: "candidate_timed_out", role: "system", text: "decision_barrier_retained_awaiting_transcript", turnId, providerEventId: turnId });
        turn.decisionRetireTimer = setTimeout(() => {
          if (callEpochRef.current !== ownedEpoch || pendingCommittedTurnsRef.current.get(turnId) !== turn) return;
          queueVoiceEvent({ eventType: "connection_retired", role: "system", text: "transcript_state_unproven", turnId, providerEventId: turnId }, { beacon: true });
          stopCall({ reason: "transcript_state_unproven", beacon: true });
          setStatus("The voice connection paused safely. Tap to continue.");
        }, 8000);
      }, VOICE_INPUT_CLASSIFICATION_TIMEOUT_MS);
      pendingCommittedTurnsRef.current.set(turnId, turn);
      queueVoiceEvent({ eventType: "audio_committed", role: "system", providerEventId: event.event_id || "", turnId, candidateId });
    }
    if (event.type === "conversation.item.input_audio_transcription.delta") {
      const pendingTurn = pendingCommittedTurnsRef.current.get(event.item_id);
      if (pendingTurn && !pendingTurn.transcriptionStartedLogged) {
        pendingTurn.transcriptionStartedLogged = true;
        queueVoiceEvent({ eventType: "transcription_started", role: "system", providerEventId: event.event_id || "", turnId: event.item_id || "", candidateId: pendingTurn.candidateId || "" });
      }
    }
    if (event.type === "conversation.item.input_audio_transcription.completed") {
      const pendingTurn = pendingCommittedTurnsRef.current.get(event.item_id);
      if (pendingTurn?.timedOut) {
        queueVoiceEvent({ eventType: "late_transcript_received", role: "system", text: "processed_after_classification_deadline", turnId: event.item_id || "", providerEventId: event.event_id || "" });
      }
      const cleanTranscript = String(event.transcript || "").trim();
      if (!cleanTranscript) {
        if (pendingTurn) {
          clearTimeout(pendingTurn.classificationTimer);
          clearTimeout(pendingTurn.decisionRetireTimer);
          pendingCommittedTurnsRef.current.delete(event.item_id);
        }
        coordinatorRef.current.restoreSpeech(pendingTurn?.candidateId || activeCandidateRef.current?.candidateId, "empty_transcript");
        activeCandidateRef.current = null;
        clientVoiceGateRef.current?.reset();
        clearQuietInput();
        queueVoiceEvent({ eventType: "cancelled", role: "system", text: "ignored_empty_audio_transcript", turnId: event.item_id || "", providerEventId: event.item_id || event.event_id || "" });
        return;
      }
      if (isVoiceTranscriptionArtifact(event.transcript)) {
        if (pendingTurn) {
          clearTimeout(pendingTurn.classificationTimer);
          clearTimeout(pendingTurn.decisionRetireTimer);
          pendingCommittedTurnsRef.current.delete(event.item_id);
        }
        coordinatorRef.current.restoreSpeech(pendingTurn?.candidateId || activeCandidateRef.current?.candidateId, "known_transcription_artifact");
        activeCandidateRef.current = null;
        clientVoiceGateRef.current?.reset();
        clearQuietInput();
        queueVoiceEvent({ eventType: "cancelled", role: "system", text: "suppressed_transcription_artifact", turnId: event.item_id || "", providerEventId: event.item_id || event.event_id || "" });
        return;
      }
      const providerEventId = event.item_id || event.event_id || "";
      const dedupeKey = `user:${providerEventId || event.transcript}`;
      if (!seenProviderEventsRef.current.has(dedupeKey)) {
        seenProviderEventsRef.current.add(dedupeKey);
        addLine("you", event.transcript);
        queueVoiceEvent({ eventType: "user_transcript", role: "user", text: event.transcript, turnId: event.item_id || "", providerEventId });
      }
      if (pendingTurn) {
        clearTimeout(pendingTurn.classificationTimer);
        clearTimeout(pendingTurn.decisionRetireTimer);
        pendingCommittedTurnsRef.current.delete(event.item_id);
      }
      const candidateId = pendingTurn?.candidateId || activeCandidateRef.current?.candidateId;
      let classification = classifyVoiceUtterance(event.transcript);
      const leaseBeforeDecision = coordinatorRef.current.activeLease();
      const duringPlayback = Boolean(pendingTurn?.startedDuringPlayback || (leaseBeforeDecision && !leaseBeforeDecision.playbackTerminal));
      const answersExpectedQuestion = isExpectedVoiceReply(event.transcript, expectedReplyRef.current?.kind);
      if (classification === "uncertain" && (answersExpectedQuestion || isDirectedVoiceUtterance(event.transcript, { duringPlayback }) || !leaseBeforeDecision)) classification = "substantive";
      queueVoiceEvent({ eventType: "candidate_classified", role: "system", text: classification, turnId: event.item_id || "", providerEventId: event.event_id || "" });
      if (classification === "noise") coordinatorRef.current.restoreSpeech(candidateId, "noise_or_artifact");
      else if (classification === "uncertain") coordinatorRef.current.restoreSpeech(candidateId, "uncertain_non_directed_audio");
      else if (classification === "presence") {
        const interruptedLease = coordinatorRef.current.activeLease();
        coordinatorRef.current.speechStarted(candidateId);
        if (!activeCandidateRef.current?.interruptionConfirmed && coordinatorRef.current.confirmInterruption(candidateId, "presence_check", { dropQueued: false })) armCancellationWatchdog(interruptedLease);
        if (!handlePendingPresenceCheck()) requestTurnResponse(event.item_id);
      } else if (classification === "interrupt_only") {
        const interruptedLease = coordinatorRef.current.activeLease();
        coordinatorRef.current.speechStarted(candidateId);
        if (!activeCandidateRef.current?.interruptionConfirmed && coordinatorRef.current.confirmInterruption(candidateId, "interrupt_only", { dropQueued: false })) armCancellationWatchdog(interruptedLease);
      } else if (classification === "cancel_task") {
        const interruptedLease = coordinatorRef.current.activeLease();
        coordinatorRef.current.speechStarted(candidateId);
        if (!activeCandidateRef.current?.interruptionConfirmed && coordinatorRef.current.confirmInterruption(candidateId, "cancel_task", { dropQueued: false })) armCancellationWatchdog(interruptedLease);
        supersedeForegroundTool();
      } else {
        expectedReplyRef.current = null;
        const interruptedLease = coordinatorRef.current.activeLease();
        coordinatorRef.current.speechStarted(candidateId);
        if (!activeCandidateRef.current?.interruptionConfirmed && coordinatorRef.current.confirmInterruption(candidateId, "substantive_guest_turn", { dropQueued: false })) armCancellationWatchdog(interruptedLease);
        supersedeForegroundTool();
        requestTurnResponse(event.item_id);
      }
      activeCandidateRef.current = null;
      clientVoiceGateRef.current?.reset();
      clearQuietInput();
    }
    if (event.type === "conversation.item.input_audio_transcription.failed") {
      const pendingTurn = pendingCommittedTurnsRef.current.get(event.item_id);
      if (pendingTurn) {
        clearTimeout(pendingTurn.classificationTimer);
        clearTimeout(pendingTurn.decisionRetireTimer);
        pendingCommittedTurnsRef.current.delete(event.item_id);
      }
      coordinatorRef.current.restoreSpeech(pendingTurn?.candidateId || activeCandidateRef.current?.candidateId, "transcription_failed");
      activeCandidateRef.current = null;
      clientVoiceGateRef.current?.reset();
      clearQuietInput();
      queueVoiceEvent({ eventType: "transcription_failed", role: "system", text: event.error?.message || "input_transcription_failed", turnId: event.item_id || "", providerEventId: event.event_id || "" });
    }
    if (event.type === "response.audio_transcript.done" || event.type === "response.output_audio_transcript.done") {
      const providerEventId = event.item_id || event.response_id || event.event_id || "";
      const dedupeKey = `assistant:${providerEventId || event.transcript}`;
      if (!seenProviderEventsRef.current.has(dedupeKey)) {
        seenProviderEventsRef.current.add(dedupeKey);
        coordinatorRef.current.assistantItem(event.response_id, event.item_id);
        const expectedKind = inferExpectedVoiceReply(event.transcript);
        expectedReplyRef.current = expectedKind ? { kind: expectedKind, responseId: event.response_id || "", itemId: event.item_id || "" } : null;
        addLine("destiny", event.transcript);
        queueVoiceEvent({ eventType: "assistant_transcript", role: "assistant", text: event.transcript, turnId: event.item_id || event.response_id || "", providerEventId });
      }
    }
    if (event.type === "response.audio.delta" || event.type === "response.output_audio.delta") setStatus("Destiny is speaking…");
    if (event.type === "output_audio_buffer.started") { coordinatorRef.current.audioStarted(event.response_id); queueVoiceEvent({ eventType: "audio_playback_started", role: "system", providerEventId: event.event_id || "", responseId: event.response_id || "", playbackState: "playing" }); }
    if (event.type === "output_audio_buffer.stopped") { coordinatorRef.current.audioStopped(event.response_id); queueVoiceEvent({ eventType: "audio_playback_stopped", role: "system", providerEventId: event.event_id || "", responseId: event.response_id || "", playbackState: "stopped" }); }
    if (event.type === "output_audio_buffer.cleared") {
      const initiator = coordinatorRef.current.activeLease()?.clearRequested ? "client_ack" : "provider";
      coordinatorRef.current.audioCleared(event.response_id, { initiator });
      queueVoiceEvent({ eventType: "audio_playback_cleared", role: "system", providerEventId: event.event_id || "", responseId: event.response_id || "", playbackState: "cleared", clearInitiator: initiator });
      if (initiator === "provider") {
        clearTimeout(historySyncTimerRef.current);
        historySyncTimerRef.current = setTimeout(() => coordinatorRef.current.retireIfHistoryPending(event.response_id), 4000);
      }
    }
    if (event.type === "response.done") {
      coordinatorRef.current.responseDone(event.response);
      queueVoiceEvent({ eventType: "response_done", role: "system", providerEventId: event.event_id || "", responseId: event.response?.id || "", generationState: event.response?.status || "", reason: event.response?.status_details?.reason || event.response?.status_details?.error?.code || "" });
      const responseId = String(event.response?.id || "");
      if (responseId) {
        completedResponseIdsRef.current.add(responseId);
        const expectedCallIds = (event.response?.output || []).filter(item => item?.type === "function_call" && item.call_id).map(item => String(item.call_id));
        let wave = toolWavesRef.current.get(responseId);
        if (!wave && expectedCallIds.length) {
          wave = { callIds: new Set(), expectedCallIds: [], outputsSent: false, sealed: false, progressRequested: false, progressTerminal: false, progressCallId: null, finalQueued: false, finalRequested: false, superseded: false };
          toolWavesRef.current.set(responseId, wave);
        }
        if (wave) {
          expectedCallIds.forEach(callId => wave.callIds.add(callId));
          wave.expectedCallIds = expectedCallIds;
          wave.sealed = true;
          maybeFinalizeToolWave(responseId);
        }
      }
      const responseStatus = event.response?.status || "";
      if (["cancelled", "incomplete", "failed"].includes(responseStatus)) {
        const detail = event.response?.status_details?.reason || event.response?.status_details?.error?.code || "";
        queueVoiceEvent({ eventType: responseStatus === "cancelled" ? "interrupted" : "error", role: "system", interrupted: responseStatus === "cancelled", providerEventId: event.response?.id || event.event_id || "", text: detail ? `${responseStatus}:${detail}` : responseStatus });
      }
    }
    if (event.type === "conversation.item.truncated") {
      clearTimeout(historySyncTimerRef.current);
      historySyncTimerRef.current = null;
      coordinatorRef.current.historyTruncated(event.item_id);
      queueVoiceEvent({ eventType: "interrupted", role: "system", interrupted: true, providerEventId: event.item_id || event.event_id || "" });
    }
    if (event.type === "response.function_call_arguments.done") {
      setStatus("Checking that for you…");
      sendToolResult(event);
    }
    if (event.type === "error") {
      setStatus(event.error?.message || "The voice connection had a problem.");
      queueVoiceEvent({ eventType: "error", role: "system", text: String(event.error?.message || "Realtime error"), providerEventId: event.event_id || "" });
    }
  };

  const startCall = async () => {
    if (phase !== "idle") return stopCall();
    setPhase("connecting");
    setStatus("Connecting to Destiny…");
    const identity = createVoiceCallIdentity();
    callStartedMonotonicRef.current = performance.now();
    callEpochRef.current += 1;
    const ownedEpoch = callEpochRef.current;
    const transportId = `transport_${identity.callId}`;
    transportIdRef.current = transportId;
    const setupAbort = new AbortController();
    setupAbortRef.current = setupAbort;
    sessionRef.current = identity.sessionId;
    callRef.current = identity.callId;
    historyRef.current = [];
    setTranscript([]);
    setCompanionLinks([]);
    eventSequenceRef.current = 0;
    coordinatorRef.current.start(ownedEpoch);
    seenProviderEventsRef.current = new Set();
    openingGreetingSentRef.current = false;
    userDesiredMutedRef.current = false;
    const ownsCall = () => callEpochRef.current === ownedEpoch && transportIdRef.current === transportId && !setupAbort.signal.aborted;
    try {
      const audioOutput = new VoiceAudioOutputController({
        audioElement: audioRef.current,
        onError: code => queueVoiceEvent({ eventType: "error", role: "system", text: code }),
        preferElementPlayback: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      });
      audioOutputRef.current = audioOutput;
      await audioOutput.prepare();
      if (!ownsCall()) return audioOutput.close();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }, video: false });
      if (!ownsCall()) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      stream.getAudioTracks().forEach(track => { track.enabled = false; });
      await startClientVoiceGate(stream);
      if (!ownsCall()) return;
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      peer.ontrack = ({ streams }) => {
        if (!ownsCall()) return;
        audioOutput.attach(streams[0]).then(mode => {
          if (ownsCall()) queueVoiceEvent({ eventType: "audio_path_attached", role: "system", text: mode });
        }).catch(() => {
          if (!ownsCall()) return;
          queueVoiceEvent({ eventType: "error", role: "system", text: "remote_audio_play_failed" });
          stopCall({ reason: "remote_audio_play_failed" });
        });
      };
      peer.onconnectionstatechange = () => {
        if (!ownsCall()) return;
        queueVoiceEvent({ eventType: "transport_state", role: "system", text: peer.connectionState, coordinatorState: peer.connectionState });
        if (peer.connectionState === "disconnected") {
          setStatus("Voice connection interrupted—reconnecting…");
          clearTimeout(disconnectGraceTimerRef.current);
          disconnectGraceTimerRef.current = setTimeout(() => {
            if (ownsCall() && peer.connectionState === "disconnected") stopCall({ reason: "disconnected" });
          }, 2500);
        } else if (peer.connectionState === "connected") {
          clearTimeout(disconnectGraceTimerRef.current);
          disconnectGraceTimerRef.current = null;
        } else if (peer.connectionState === "failed") stopCall({ reason: "failed" });
      };
      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onclose = () => { if (ownsCall()) queueVoiceEvent({ eventType: "data_channel_state", role: "system", text: "closed", coordinatorState: "closed" }); };
      channel.onerror = () => { if (ownsCall()) queueVoiceEvent({ eventType: "data_channel_state", role: "system", text: "error", coordinatorState: "error" }); };
      channel.onopen = () => {
        if (!ownsCall() || openingGreetingSentRef.current) return;
        queueVoiceEvent({ eventType: "data_channel_state", role: "system", text: "open", coordinatorState: "open" });
        openingGreetingSentRef.current = true;
        setStatus("Destiny is answering…");
        const opening = createVoiceOpeningGreetingEvent();
        coordinatorRef.current.request("opening", opening.response, { turnId: "opening" });
        openingGreetingTimerRef.current = setTimeout(() => {
          if (!ownsCall()) return;
          if (coordinatorRef.current.activeLease()?.kind === "opening") {
            coordinatorRef.current.interrupt("opening_timeout");
            armCancellationWatchdog(coordinatorRef.current.activeLease());
          }
        }, 8000);
      };
      channel.onmessage = message => {
        if (!ownsCall()) return;
        try { handleEvent(JSON.parse(message.data)); } catch {}
      };
      const offer = await peer.createOffer();
      if (!ownsCall()) return;
      await peer.setLocalDescription(offer);
      if (!ownsCall()) return;
      const response = await fetch("/api/destiny-realtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          "X-Destiny-Voice-Model": resolveVoiceModel(new URLSearchParams(window.location.search).get("model")),
        },
        body: offer.sdp,
        signal: setupAbort.signal,
      });
      if (!ownsCall()) return;
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Voice conversation could not start");
      const answer = await response.text();
      if (!ownsCall()) return;
      voiceModelRef.current = resolveVoiceModel(response.headers.get("x-destiny-voice-model"));
      queueVoiceEvent({ eventType: "effective_session_config", role: "system", text: `model=${voiceModelRef.current}`, voiceModel: voiceModelRef.current });
      await peer.setRemoteDescription({ type: "answer", sdp: answer });
      if (ownsCall()) setupAbortRef.current = null;
    } catch (error) {
      if (error?.name === "AbortError" || !ownsCall()) return;
      queueVoiceEvent({ eventType: "error", role: "system", text: String(error?.message || "Voice connection failed") });
      stopCall({ reason: "connection_failed" });
      setStatus(error?.message === "Permission denied" ? "Microphone permission was denied." : (error?.message || "Voice conversation could not start."));
    }
  };

  return <main className={styles.page}>
    <Head>
      <title>Destiny Blue Voice Lab</title>
      <meta name="description" content="Private Destiny Blue voice testing page." />
      <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
      <meta name="googlebot" content="noindex,nofollow,noarchive,nosnippet" />
      <meta name="bingbot" content="noindex,nofollow,noarchive,nosnippet" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    </Head>
    <section className={styles.phone} aria-label="Destiny Blue voice test phone">
      <div className={styles.island}><span></span><i></i></div>
      <div className={styles.screen}>
        <div className={styles.topbar}><span>9:41</span><div><span>●●●</span><span>⌁</span><span>▰</span></div></div>
        {phase !== "idle" ? <button type="button" className={styles.topHangup} onClick={() => stopCall()} aria-label="End call">End</button> : null}
        <div className={styles.private}>PRIVATE VOICE LAB</div>
        <div className={`${styles.pulse} ${phase === "live" ? styles.live : ""}`}>
          <Image src="/destiny_avatar.png" alt="Destiny Blue" fill priority sizes="144px" />
        </div>
        <p className={styles.eyebrow}>AI CONCIERGE</p>
        <h1>Destiny Blue</h1>
        <p className={styles.status}>{status}</p>
        <div className={styles.transcript} aria-live="polite">
          {transcript.length ? transcript.map((line, index) => <p key={`${line.role}-${index}`} className={line.role === "you" ? styles.you : styles.destiny}><strong>{line.role === "you" ? "You" : "Destiny"}</strong>{line.text}</p>) : <p className={styles.hint}>This transcript is only for testing. The final voice experience can hide it.</p>}
          {companionLinks.length ? <div className={styles.companionLinks} aria-label="Links from Destiny">
            {companionLinks.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<span aria-hidden="true"> ↗</span></a>)}
          </div> : null}
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.smallButton} onClick={() => { setTranscript([]); setCompanionLinks([]); }} aria-label="Clear transcript and links">⌫<span>Clear</span></button>
          <button type="button" className={`${styles.callButton} ${phase !== "idle" ? styles.hangup : ""}`} onClick={startCall} disabled={phase === "connecting"} aria-label={phase === "idle" ? "Call Destiny Blue" : "End call"}>
            <span>{phase === "idle" ? "☎" : "×"}</span>
          </button>
          <button type="button" className={styles.smallButton} onClick={() => {
            userDesiredMutedRef.current = !userDesiredMutedRef.current;
            streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !userDesiredMutedRef.current; });
            setStatus(userDesiredMutedRef.current ? "Microphone muted." : "Listening…");
          }} aria-label="Mute microphone">♩<span>Mute</span></button>
        </div>
        <p className={styles.disclosure}>You are speaking with an AI. For emergencies, call 911.</p>
        <p className={styles.telemetryHealth} aria-live="polite">Telemetry: #{telemetryHealth.storedThrough || 0}{telemetryHealth.failure ? ` · retrying (${telemetryHealth.failure})` : " stored"}</p>
        <div className={styles.homeIndicator}></div>
      </div>
    </section>
    <audio ref={audioRef} autoPlay playsInline />
  </main>;
}
