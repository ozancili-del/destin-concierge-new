import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { storyAnswer } from "../data/interview-stories";
import { grantInterviewLabAccess, hasInterviewLabAccess, isValidInterviewLabKey } from "../lib/interview-lab-auth";
import styles from "../styles/InterviewLab.module.css";

export async function getServerSideProps({ req, res, query }) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.setHeader("Cache-Control", "private, no-store");
  if (typeof query.key === "string" && isValidInterviewLabKey(query.key)) {
    grantInterviewLabAccess(res);
    return { redirect: { destination: "/interview-lab", permanent: false } };
  }
  if (!hasInterviewLabAccess(req)) return { props: { locked: true, interviewStories: [] } };

  try {
    const interviewStories = JSON.parse(process.env.INTERVIEW_STORIES_JSON || "[]");
    if (!Array.isArray(interviewStories) || interviewStories.length !== 10) throw new Error("INVALID_STORY_PACK");
    return { props: { locked: false, interviewStories } };
  } catch {
    return { props: { locked: false, interviewStories: [], configurationError: true } };
  }
}

function chooseVoices(voices) {
  const english = voices.filter((voice) => /^en[-_]/i.test(voice.lang));
  const pool = english.length ? english : voices;
  const interviewer = pool.find((voice) => /Daniel|Alex|Google UK English Male|Microsoft David/i.test(voice.name)) || pool[0];
  const candidate = pool.find((voice) => voice !== interviewer && /Samantha|Ava|Karen|Google US English|Microsoft Jenny/i.test(voice.name)) || pool.find((voice) => voice !== interviewer) || interviewer;
  return { interviewer, candidate };
}

function speechEngine() {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis || null;
}

function LockedInterviewLab() {
  return <div className={styles.page}>
    <Head><title>Private Interview Rehearsal Lab</title><meta name="robots" content="noindex,nofollow,noarchive,nosnippet" /></Head>
    <main className={styles.locked}>
      <p>Private rehearsal workspace</p>
      <h1>Interview Story Lab</h1>
      <span>Enter your access code to continue.</span>
      <form method="get" action="/interview-lab">
        <input type="password" name="key" aria-label="Access code" autoComplete="current-password" required />
        <button type="submit">Open story lab</button>
      </form>
    </main>
  </div>;
}

function InterviewLabContent({ interviewStories }) {
  const [selectedId, setSelectedId] = useState(interviewStories[0].id);
  const [voices, setVoices] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speaker, setSpeaker] = useState("");
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const playbackId = useRef(0);
  const chatEnd = useRef(null);

  const story = useMemo(() => interviewStories.find((item) => item.id === selectedId) || interviewStories[0], [selectedId]);
  const answer = useMemo(() => storyAnswer(story), [story]);

  useEffect(() => {
    const engine = speechEngine();
    if (!engine || typeof engine.getVoices !== "function") return;
    const load = () => setVoices(engine.getVoices());
    load();
    if (typeof engine.addEventListener === "function") engine.addEventListener("voiceschanged", load);
    return () => {
      if (typeof engine.removeEventListener === "function") engine.removeEventListener("voiceschanged", load);
      if (typeof engine.cancel === "function") engine.cancel();
    };
  }, []);

  useEffect(() => {
    const target = chatEnd.current;
    if (target && typeof target.scrollIntoView === "function") target.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, asking]);

  function stopPlayback() {
    playbackId.current += 1;
    const engine = speechEngine();
    if (engine && typeof engine.cancel === "function") engine.cancel();
    setPlaying(false);
    setPaused(false);
    setSpeaker("");
  }

  function speakLine(text, role, voice, id) {
    return new Promise((resolve) => {
      if (id !== playbackId.current) return resolve();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice || null;
      utterance.rate = role === "Interviewer" ? 0.98 : 0.94;
      utterance.pitch = role === "Interviewer" ? 0.94 : 1.02;
      utterance.onstart = () => setSpeaker(role);
      utterance.onend = resolve;
      utterance.onerror = resolve;
      const engine = speechEngine();
      if (engine && typeof engine.speak === "function") engine.speak(utterance);
      else resolve();
    });
  }

  async function playStory() {
    const engine = speechEngine();
    if (!engine || typeof engine.getVoices !== "function" || typeof engine.speak !== "function") return;
    stopPlayback();
    const id = playbackId.current;
    const selectedVoices = chooseVoices(voices.length ? voices : engine.getVoices());
    setPlaying(true);
    await speakLine(story.question, "Interviewer", selectedVoices.interviewer, id);
    if (id === playbackId.current) await speakLine(answer, "Candidate", selectedVoices.candidate, id);
    if (id === playbackId.current) {
      setPlaying(false);
      setSpeaker("");
    }
  }

  function togglePause() {
    if (!playing) return;
    const engine = speechEngine();
    if (!engine) return;
    if (paused && typeof engine.resume === "function") engine.resume();
    else if (!paused && typeof engine.pause === "function") engine.pause();
    setPaused(!paused);
  }

  function changeStory(id) {
    if (playing) stopPlayback();
    else {
      playbackId.current += 1;
      setPaused(false);
      setSpeaker("");
    }
    setSelectedId(id);
    setMessages((current) => current.length ? [] : current);
  }

  async function askCoach(event) {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || asking) return;
    const previous = messages.slice(-6);
    setMessages((current) => [...current, { role: "user", content: cleanQuestion }]);
    setQuestion("");
    setAsking(true);
    try {
      const response = await fetch("/api/interview-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion, storyTitle: `${story.label}: ${story.competency}`, story: `${story.question}\n\n${answer}`, history: previous }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Request failed");
      setMessages((current) => [...current, { role: "assistant", content: payload.answer }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error.message || "The coach is unavailable." }]);
    } finally {
      setAsking(false);
    }
  }

  return <div className={styles.page}>
    <Head>
      <title>Private Interview Rehearsal Lab</title>
      <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
      <meta name="googlebot" content="noindex,nofollow,noarchive,nosnippet" />
    </Head>

    <header className={styles.header}>
      <p>Private rehearsal workspace</p>
      <h1>Interview Story Lab</h1>
      <span>Choose a STAR story, listen to the mock exchange, then challenge it with your coach.</span>
    </header>

    <main className={styles.main}>
      <section className={styles.selector} aria-labelledby="story-picker-title">
        <div><span>Story library</span><h2 id="story-picker-title">Select your rehearsal</h2></div>
        <select value={selectedId} onChange={(event) => changeStory(event.target.value)} aria-label="Select interview story">
          {interviewStories.map((item) => <option value={item.id} key={item.id}>{item.label} · {item.competency}</option>)}
        </select>
      </section>

      <article className={styles.story}>
        <div className={styles.storyTop}><div><span>{story.label}</span><h2>{story.competency}</h2></div><span className={styles.status}>{speaker ? `${speaker} speaking` : playing ? "Preparing audio" : "Ready"}</span></div>
        <div className={`${styles.bubble} ${styles.interviewer}`}><strong>Interviewer</strong><p>{story.question}</p></div>
        <div className={`${styles.bubble} ${styles.candidate}`}><strong>Your STAR answer</strong><p>{answer}</p></div>
        <div className={styles.controls}>
          <button className={styles.play} type="button" onClick={playStory}>{playing ? "Restart" : "▶ Play conversation"}</button>
          <button type="button" onClick={togglePause} disabled={!playing}>{paused ? "Resume" : "Pause"}</button>
          <button type="button" onClick={stopPlayback} disabled={!playing}>Stop</button>
        </div>
        <p className={styles.voiceNote}>Audio uses two voices available on this device. On iPhone, tap Play once to authorize speech.</p>
      </article>

      <section className={styles.coach} aria-labelledby="coach-title">
        <div className={styles.coachHeading}><span>GPT-5.6 Sol</span><h2 id="coach-title">Question your interview coach</h2><p>Ask for likely follow-ups, weak points, a shorter version, stronger metrics, or a mock challenge.</p></div>
        <div className={styles.messages} aria-live="polite">
          {!messages.length && <div className={styles.promptIdeas}><button onClick={() => setQuestion("What are the three most likely follow-up questions?")}>Likely follow-ups</button><button onClick={() => setQuestion("Where does this story sound weak or vague?")}>Find weak points</button><button onClick={() => setQuestion("Help me make this sound natural in two minutes.")}>Two-minute version</button></div>}
          {messages.map((message, index) => <div className={message.role === "user" ? styles.userMessage : styles.coachMessage} key={`${message.role}-${index}`}><strong>{message.role === "user" ? "You" : "Coach"}</strong><p>{message.content}</p></div>)}
          {asking && <div className={styles.thinking}>Coach is reviewing this story…</div>}
          <div ref={chatEnd} />
        </div>
        <form className={styles.chatForm} onSubmit={askCoach}>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about this story…" maxLength={1600} rows={3} aria-label="Question for interview coach" />
          <button type="submit" disabled={asking || !question.trim()}>{asking ? "Thinking…" : "Ask coach"}</button>
        </form>
      </section>
    </main>
  </div>;
}

export default function InterviewLab(props) {
  if (props.locked) return <LockedInterviewLab />;
  if (props.configurationError || !props.interviewStories.length) return <div className={styles.page}><main className={styles.locked}><h1>Story pack unavailable</h1><p>The private story data is not configured yet.</p></main></div>;
  return <InterviewLabContent {...props} />;
}
