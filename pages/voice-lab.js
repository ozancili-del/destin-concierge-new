import Head from "next/head";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/VoiceLab.module.css";

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
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const historyRef = useRef([]);
  const sessionRef = useRef(`voice_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);

  const addLine = (role, text) => {
    const clean = String(text || "").trim();
    if (!clean) return;
    setTranscript(current => [...current.slice(-5), { role, text: clean }]);
    historyRef.current = [...historyRef.current, { role, content: clean }].slice(-20);
  };

  const stopCall = () => {
    channelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (audioRef.current) audioRef.current.srcObject = null;
    channelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
    setPhase("idle");
    setStatus("Call ended. Tap to talk again.");
  };

  useEffect(() => () => {
    channelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const sendToolResult = async event => {
    let output;
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
    }
    if (event.type === "input_audio_buffer.speech_started") setStatus("Listening…");
    if (event.type === "input_audio_buffer.speech_stopped") setStatus("Destiny is thinking…");
    if (event.type === "conversation.item.input_audio_transcription.completed") addLine("you", event.transcript);
    if (event.type === "response.audio_transcript.done" || event.type === "response.output_audio_transcript.done") {
      addLine("destiny", event.transcript);
    }
    if (event.type === "response.audio.delta" || event.type === "response.output_audio.delta") setStatus("Destiny is speaking…");
    if (event.type === "response.done") setStatus("Listening — you can interrupt anytime.");
    if (event.type === "response.function_call_arguments.done") {
      setStatus("Checking that for you…");
      sendToolResult(event);
    }
    if (event.type === "error") {
      setStatus(event.error?.message || "The voice connection had a problem.");
    }
  };

  const startCall = async () => {
    if (phase !== "idle") return stopCall();
    setPhase("connecting");
    setStatus("Connecting to Destiny…");
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
        if (["failed", "disconnected", "closed"].includes(peer.connectionState)) stopCall();
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
      stopCall();
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
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.smallButton} onClick={() => setTranscript([])} aria-label="Clear transcript">⌫<span>Clear</span></button>
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
