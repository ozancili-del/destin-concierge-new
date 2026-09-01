import Head from "next/head";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/VoiceLab.module.css";
import { extractVoiceCompanionLinks } from "../lib/destiny-agent/voice-links.js";

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
  const sessionRef = useRef(`voice_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);
  const callRef = useRef(null);
  const eventSequenceRef = useRef(0);
  const seenProviderEventsRef = useRef(new Set());
  const logQueueRef = useRef(Promise.resolve());

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
    setPhase("idle");
    setStatus("Call ended. Tap to talk again.");
  };

  useEffect(() => () => stopCall({ reason: "page_unloaded", beacon: true }), []);

  const sendToolResult = async event => {
    let output;
    const startedAt = Date.now();
    const toolName = String(event.name || "unknown");
    queueVoiceEvent({ eventType: "tool_call", role: "system", toolName, providerEventId: event.call_id || event.event_id || "" });
    try {
      const args = JSON.parse(event.arguments || "{}");
      if (event.name === "check_live_availability") {
        const response = await fetch("/api/destiny-voice-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
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
        });
        const data = await response.json();
        output = data.reply || data.message || "I couldn't retrieve that information.";
      } else {
        output = "That action is not available in this voice test.";
      }
    } catch {
      output = "The lookup failed. Please answer briefly without inventing any result.";
    }
    queueVoiceEvent({
      eventType: "tool_result",
      role: "system",
      toolName,
      toolStatus: /failed|couldn.?t|unavailable|error/i.test(String(output)) ? "failed" : "completed",
      providerEventId: event.call_id || event.event_id || "",
      latencyMs: Date.now() - startedAt,
    });
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
    channelRef.current?.send(JSON.stringify({ type: "response.create" }));
  };

  const handleEvent = event => {
    if (event.type === "session.created") {
      setPhase("live");
      setStatus("Listening — just speak naturally.");
      queueVoiceEvent({ eventType: "call_started", role: "system", providerEventId: event.event_id || event.session?.id || "" });
    }
    if (event.type === "input_audio_buffer.speech_started") setStatus("Listening…");
    if (event.type === "input_audio_buffer.speech_stopped") setStatus("Destiny is thinking…");
    if (event.type === "conversation.item.input_audio_transcription.completed") {
      const providerEventId = event.item_id || event.event_id || "";
      const dedupeKey = `user:${providerEventId || event.transcript}`;
      if (!seenProviderEventsRef.current.has(dedupeKey)) {
        seenProviderEventsRef.current.add(dedupeKey);
        addLine("you", event.transcript);
        queueVoiceEvent({ eventType: "user_transcript", role: "user", text: event.transcript, turnId: event.item_id || "", providerEventId });
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
    if (event.type === "response.done") {
      setStatus("Listening — you can interrupt anytime.");
      const responseStatus = event.response?.status || "";
      if (["cancelled", "incomplete", "failed"].includes(responseStatus)) {
        queueVoiceEvent({ eventType: responseStatus === "cancelled" ? "interrupted" : "error", role: "system", interrupted: responseStatus === "cancelled", providerEventId: event.response?.id || event.event_id || "", text: responseStatus });
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
    callRef.current = `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    eventSequenceRef.current = 0;
    seenProviderEventsRef.current = new Set();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      streamRef.current = stream;
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      peer.ontrack = ({ streams }) => {
        if (audioRef.current) {
          audioRef.current.srcObject = streams[0];
          audioRef.current.play().catch(() => {});
        }
      };
      peer.onconnectionstatechange = () => {
        if (["failed", "disconnected"].includes(peer.connectionState)) stopCall({ reason: peer.connectionState });
      };
      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
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
