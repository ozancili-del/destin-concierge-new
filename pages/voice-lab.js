import Head from "next/head";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/VoiceLab.module.css";
import { VoiceResponseCoordinator } from "../lib/destiny-agent/voice-coordinator.js";
import { extractVoiceCompanionLinks } from "../lib/destiny-agent/voice-links.js";
import { createVoiceCallIdentity, createVoiceOpeningGreetingEvent, isVoicePresenceCheck, isVoiceTranscriptionArtifact, voiceLookupLabel, voiceProgressInstructions, VOICE_BARGE_IN_CONFIRM_MS, VOICE_TOOL_PROGRESS_SILENCE_MS } from "../lib/destiny-agent/voice-experience.js";

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
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const historyRef = useRef([]);
  const sessionRef = useRef(null);
  const callRef = useRef(null);
  const eventSequenceRef = useRef(0);
  const seenProviderEventsRef = useRef(new Set());
  const logQueueRef = useRef(Promise.resolve());
  const pendingToolsRef = useRef(new Map());
  const toolWavesRef = useRef(new Map());
  const completedResponseIdsRef = useRef(new Set());
  const callEpochRef = useRef(0);
  const pendingCommittedTurnsRef = useRef(new Map());
  const coordinatorEffectRef = useRef(() => {});
  const coordinatorRef = useRef(null);
  if (!coordinatorRef.current) coordinatorRef.current = new VoiceResponseCoordinator({ emit: effect => coordinatorEffectRef.current(effect) });
  const openingGreetingSentRef = useRef(false);
  const openingGreetingTimerRef = useRef(null);
  const cancellationWatchdogRef = useRef(null);
  const bargeInTimerRef = useRef(null);

  const armCancellationWatchdog = interruptedLease => {
    clearTimeout(cancellationWatchdogRef.current);
    cancellationWatchdogRef.current = setTimeout(() => {
      const active = coordinatorRef.current.activeLease();
      if (active && active.requestToken === interruptedLease?.requestToken) stopCall({ reason: "audio_cancellation_timeout" });
    }, 4000);
  };

  const finishOpeningGreeting = () => {
    clearTimeout(openingGreetingTimerRef.current);
    openingGreetingTimerRef.current = null;
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = true; });
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
    if (wave.progressRequested && !wave.progressTerminal) wave.finalQueued = true;
    else requestFinalToolAnswer(waveId);
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
      max_output_tokens: 120,
    }, { toolCallId: callId, turnId: pending.turnId });
  };

  const queueVoiceEvent = (event, { beacon = false } = {}) => {
    const callId = callRef.current;
    if (!callId) return;
    const sequence = ++eventSequenceRef.current;
    const providerEventId = String(event.providerEventId || "").trim();
    const eventId = `${callId}:${event.eventType}:${providerEventId || sequence}`;
    const payload = {
      sessionId: sessionRef.current,
      callId,
      eventId,
      clientTimestamp: new Date().toISOString(),
      ...event,
    };
    if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/destiny-voice-events", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      return;
    }
    logQueueRef.current = logQueueRef.current.then(async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch("/api/destiny-voice-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
          });
          if (response.ok) return;
          if (response.status >= 400 && response.status < 500 && response.status !== 429) return;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
      }
      console.warn("[VOICE LOG] event was not stored", eventId);
    });
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
    coordinatorRef.current.interrupt("presence_check");
    coordinatorRef.current.request("presence", {
      conversation: "none",
      instructions: voiceProgressInstructions(pending.label),
      tools: [],
      tool_choice: "none",
      output_modalities: ["audio"],
      max_output_tokens: 100,
    }, { toolCallId: pendingCallId, turnId: pending.turnId });
    pending.guestCheckIn = true;
    pending.progressRequested = true;
    return true;
  };

  const stopCall = ({ reason = "user_ended", beacon = false } = {}) => {
    if (callRef.current) queueVoiceEvent({ eventType: reason === "cancelled" ? "cancelled" : "call_ended", role: "system", text: reason }, { beacon });
    channelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (audioRef.current) audioRef.current.srcObject = null;
    channelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
    callRef.current = null;
    pendingToolsRef.current.forEach(pending => {
      clearTimeout(pending.silenceTimer);
      pending.abortController?.abort();
    });
    pendingToolsRef.current.clear();
    toolWavesRef.current.clear();
    completedResponseIdsRef.current.clear();
    pendingCommittedTurnsRef.current.forEach(turn => clearTimeout(turn.classificationTimer));
    pendingCommittedTurnsRef.current.clear();
    clearTimeout(openingGreetingTimerRef.current);
    openingGreetingTimerRef.current = null;
    clearTimeout(cancellationWatchdogRef.current);
    cancellationWatchdogRef.current = null;
    clearTimeout(bargeInTimerRef.current);
    bargeInTimerRef.current = null;
    coordinatorRef.current.end();
    callEpochRef.current += 1;
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
    if (pendingToolsRef.current.has(callId)) return;
    let args = {};
    try { args = JSON.parse(event.arguments || "{}"); } catch {}
    const label = voiceLookupLabel(args.query || event.name);
    const abortController = new AbortController();
    const originResponseId = String(event.response_id || `tool-wave-${callId}`);
    const pending = { callId, resolved: false, superseded: false, progressRequested: false, guestCheckIn: false, label, turnId: originResponseId, originResponseId, silenceTimer: null, timerGeneration: 0, abortController };
    pendingToolsRef.current.set(callId, pending);
    let wave = toolWavesRef.current.get(originResponseId);
    if (!wave) {
      wave = { callIds: new Set(), sealed: completedResponseIdsRef.current.has(originResponseId), progressRequested: false, progressTerminal: false, progressCallId: null, finalQueued: false, finalRequested: false, superseded: false };
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
        const messages = [...historyRef.current, { role: "user", content: question }].slice(-20);
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
    clearTimeout(pending.silenceTimer);
    const discoveredLinks = extractVoiceCompanionLinks(output);
    if (discoveredLinks.length) {
      setCompanionLinks(current => {
        const byHref = new Map(current.map(link => [link.href, link]));
        discoveredLinks.forEach(link => byHref.set(link.href, link));
        return [...byHref.values()].slice(-6);
      });
    }
    channelRef.current?.send(JSON.stringify({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: event.call_id, output: String(output) },
    }));
    if (!coordinatorRef.current.hasLease() && !wave.progressRequested) armProgressTimer(callId);
    maybeFinalizeToolWave(originResponseId);
  };

  const requestTurnResponse = turnId => {
    coordinatorRef.current.request("turn", {}, { turnId });
  };

  const supersedePendingTools = () => {
    pendingToolsRef.current.forEach((pending, pendingCallId) => {
      if (pending.resolved) return;
      pending.superseded = true;
      pending.timerGeneration += 1;
      clearTimeout(pending.silenceTimer);
      pending.abortController?.abort();
      channelRef.current?.send(JSON.stringify({
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: pendingCallId, output: "The guest moved to a new request. Do not answer the superseded lookup." },
      }));
      const wave = toolWavesRef.current.get(pending.originResponseId);
      if (wave) wave.superseded = true;
    });
  };

  coordinatorEffectRef.current = effect => {
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
    if (effect.type !== "released") return;
    clearTimeout(cancellationWatchdogRef.current);
    cancellationWatchdogRef.current = null;
    const { lease } = effect;
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
    if (event.type === "response.created") coordinatorRef.current.responseCreated(event.response);
    if (event.type === "input_audio_buffer.speech_started") {
      setStatus("Listening…");
      pendingToolsRef.current.forEach(pending => {
        pending.timerGeneration += 1;
        clearTimeout(pending.silenceTimer);
      });
      clearTimeout(bargeInTimerRef.current);
      const ownedEpoch = callEpochRef.current;
      bargeInTimerRef.current = setTimeout(() => {
        bargeInTimerRef.current = null;
        if (callEpochRef.current !== ownedEpoch) return;
        const interruptedLease = coordinatorRef.current.activeLease();
        if (coordinatorRef.current.interrupt("guest_speech")) armCancellationWatchdog(interruptedLease);
      }, VOICE_BARGE_IN_CONFIRM_MS);
    }
    if (event.type === "input_audio_buffer.speech_stopped") {
      if (bargeInTimerRef.current) {
        clearTimeout(bargeInTimerRef.current);
        bargeInTimerRef.current = null;
      }
      if (!coordinatorRef.current.hasLease()) setStatus("Destiny is thinking…");
    }
    if (event.type === "input_audio_buffer.committed") {
      const turnId = String(event.item_id || event.event_id || `turn-${Date.now()}`);
      const hasPendingLookup = [...pendingToolsRef.current.values()].some(pending => !pending.resolved && !pending.superseded);
      if (!hasPendingLookup) requestTurnResponse(turnId);
      else {
        const ownedEpoch = callEpochRef.current;
        const turn = { turnId, classificationTimer: null };
        turn.classificationTimer = setTimeout(() => {
          if (callEpochRef.current !== ownedEpoch || !pendingCommittedTurnsRef.current.has(turnId)) return;
          pendingCommittedTurnsRef.current.delete(turnId);
          supersedePendingTools();
          requestTurnResponse(turnId);
        }, 2000);
        pendingCommittedTurnsRef.current.set(turnId, turn);
      }
    }
    if (event.type === "conversation.item.input_audio_transcription.completed") {
      if (isVoiceTranscriptionArtifact(event.transcript)) {
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
      const pendingTurn = pendingCommittedTurnsRef.current.get(event.item_id);
      if (pendingTurn) {
        clearTimeout(pendingTurn.classificationTimer);
        pendingCommittedTurnsRef.current.delete(event.item_id);
        if (isVoicePresenceCheck(event.transcript)) handlePendingPresenceCheck();
        else {
          supersedePendingTools();
          requestTurnResponse(event.item_id);
        }
      }
    }
    if (event.type === "response.audio_transcript.done" || event.type === "response.output_audio_transcript.done") {
      const providerEventId = event.item_id || event.response_id || event.event_id || "";
      const dedupeKey = `assistant:${providerEventId || event.transcript}`;
      if (!seenProviderEventsRef.current.has(dedupeKey)) {
        seenProviderEventsRef.current.add(dedupeKey);
        addLine("destiny", event.transcript);
        queueVoiceEvent({ eventType: "assistant_transcript", role: "assistant", text: event.transcript, turnId: event.item_id || event.response_id || "", providerEventId });
      }
    }
    if (event.type === "response.audio.delta" || event.type === "response.output_audio.delta") setStatus("Destiny is speaking…");
    if (event.type === "output_audio_buffer.started") coordinatorRef.current.audioStarted(event.response_id);
    if (event.type === "output_audio_buffer.stopped") coordinatorRef.current.audioStopped(event.response_id);
    if (event.type === "output_audio_buffer.cleared") coordinatorRef.current.audioCleared(event.response_id);
    if (event.type === "response.done") {
      coordinatorRef.current.responseDone(event.response);
      const responseId = String(event.response?.id || "");
      if (responseId) {
        completedResponseIdsRef.current.add(responseId);
        const expectedCallIds = (event.response?.output || []).filter(item => item?.type === "function_call" && item.call_id).map(item => String(item.call_id));
        let wave = toolWavesRef.current.get(responseId);
        if (!wave && expectedCallIds.length) {
          wave = { callIds: new Set(), sealed: false, progressRequested: false, progressTerminal: false, progressCallId: null, finalQueued: false, finalRequested: false, superseded: false };
          toolWavesRef.current.set(responseId, wave);
        }
        if (wave) {
          expectedCallIds.forEach(callId => wave.callIds.add(callId));
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
    callEpochRef.current += 1;
    coordinatorRef.current.start(callEpochRef.current);
    sessionRef.current = identity.sessionId;
    callRef.current = identity.callId;
    historyRef.current = [];
    setTranscript([]);
    setCompanionLinks([]);
    eventSequenceRef.current = 0;
    seenProviderEventsRef.current = new Set();
    openingGreetingSentRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      streamRef.current = stream;
      stream.getAudioTracks().forEach(track => { track.enabled = false; });
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      peer.ontrack = ({ streams }) => {
        if (audioRef.current) {
          audioRef.current.srcObject = streams[0];
          audioRef.current.play().catch(() => {
            queueVoiceEvent({ eventType: "error", role: "system", text: "remote_audio_play_failed" });
            stopCall({ reason: "remote_audio_play_failed" });
          });
        }
      };
      peer.onconnectionstatechange = () => {
        if (["failed", "disconnected"].includes(peer.connectionState)) stopCall({ reason: peer.connectionState });
      };
      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onopen = () => {
        if (openingGreetingSentRef.current) return;
        openingGreetingSentRef.current = true;
        setStatus("Destiny is answering…");
        const opening = createVoiceOpeningGreetingEvent();
        coordinatorRef.current.request("opening", opening.response, { turnId: "opening" });
        const ownedEpoch = callEpochRef.current;
        openingGreetingTimerRef.current = setTimeout(() => {
          if (callEpochRef.current !== ownedEpoch) return;
          if (coordinatorRef.current.activeLease()?.kind === "opening") {
            coordinatorRef.current.interrupt("opening_timeout");
            armCancellationWatchdog(coordinatorRef.current.activeLease());
          }
        }, 8000);
      };
      channel.onmessage = message => {
        try { handleEvent(JSON.parse(message.data)); } catch {}
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const response = await fetch("/api/destiny-realtime", {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp,
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Voice conversation could not start");
      await peer.setRemoteDescription({ type: "answer", sdp: await response.text() });
    } catch (error) {
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
          <button type="button" className={styles.smallButton} onClick={() => streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !track.enabled; setStatus(track.enabled ? "Listening…" : "Microphone muted."); })} aria-label="Mute microphone">♩<span>Mute</span></button>
        </div>
        <p className={styles.disclosure}>You are speaking with an AI. For emergencies, call 911.</p>
        <div className={styles.homeIndicator}></div>
      </div>
    </section>
    <audio ref={audioRef} autoPlay playsInline />
  </main>;
}
