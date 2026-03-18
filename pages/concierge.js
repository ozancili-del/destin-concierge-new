// pages/concierge.js
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

function generateSessionId() {
  return "db_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default function Concierge() {
  const router = useRouter();
  const [log, setLog] = useState([
    { role: "assistant", content: "Hey there! 👋 I'm Destiny Blue — I can check live availability for both units, build you a booking link in seconds, recommend dolphin tours and activities, or connect you straight to Ozan. What can I help you with? 😊" }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [pendingRelay, setPendingRelay] = useState(false);
  const [ozanAcked, setOzanAcked] = useState(false);
  const [ozanAckType, setOzanAckType] = useState(null);
  const [ozanInvited, setOzanInvited] = useState(false);
  const [ozanIsActive, setOzanIsActive] = useState(false);
  const lastSeenTsRef = useRef(0);
  const sessionIdRef = useRef(null);
  const chatEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const ozanTokenRef = useRef(null);
  const guestBidRef = useRef(null);
  const guestBookingRef = useRef(null);
  const pageSourceRef = useRef("ai-concierge");

  useEffect(() => {
    try {
      let sid = localStorage.getItem("destiny_session_id");
      if (!sid) { sid = generateSessionId(); localStorage.setItem("destiny_session_id", sid); }
      sessionIdRef.current = sid;
    } catch (e) {
      sessionIdRef.current = generateSessionId();
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.pageSource) pageSourceRef.current = router.query.pageSource;
    const bid = router.query.bid;
    const fname = router.query.fname;
    if (!bid) return;
    guestBidRef.current = bid;
    setLog([]);
    setBusy(true);
    let sid = sessionIdRef.current;
    if (!sid) {
      try { sid = localStorage.getItem("destiny_session_id") || generateSessionId(); }
      catch(e) { sid = generateSessionId(); }
      sessionIdRef.current = sid;
    }
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [], sessionId: sid, guestBid: bid, pageSource: "ai-concierge" }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.reply) {
          setLog([{ role: "assistant", content: data.reply }]);
          if (data.guestBooking) guestBookingRef.current = data.guestBooking;
        } else {
          setLog([{ role: "assistant", content: `Hey${fname ? " " + fname : " there"}! 🌊 I'm Destiny Blue — ask me anything about your stay! 😊` }]);
        }
      })
      .catch(() => {
        setLog([{ role: "assistant", content: `Hey${fname ? " " + fname : " there"}! 🌊 I'm Destiny Blue — ask me anything about your stay! 😊` }]);
      })
      .finally(() => setBusy(false));
  }, [router.isReady, router.query.bid]);

  useEffect(() => {
    if (!router.isReady) return;
    const ps = router.query.pageSource;
    if (!ps || ps === "ai-concierge") return;
    setLog([]);
    setBusy(true);
    let sid = sessionIdRef.current;
    if (!sid) {
      try { sid = localStorage.getItem("destiny_session_id") || generateSessionId(); }
      catch(e) { sid = generateSessionId(); }
      sessionIdRef.current = sid;
    }
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [], sessionId: sid, pageSource: ps }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.reply) setLog([{ role: "assistant", content: data.reply }]);
        else setLog([{ role: "assistant", content: "Hey there! 👋 I'm Destiny Blue — how can I help? 😊" }]);
      })
      .catch(() => {
        setLog([{ role: "assistant", content: "Hey there! 👋 I'm Destiny Blue — how can I help? 😊" }]);
      })
      .finally(() => setBusy(false));
  }, [router.isReady, router.query.pageSource]);

  useEffect(() => {
    if (!ozanInvited && !ozanIsActive) return;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    const poll = async () => {
      if (!sessionIdRef.current) return;
      try {
        const r = await fetch(`/api/ozan-poll?s=${sessionIdRef.current}&since=${lastSeenTsRef.current}&_t=${Date.now()}`);
        const data = await r.json();
        if (data.ozanActive === "TRUE" && !ozanIsActive) {
          setOzanIsActive(true);
          setOzanInvited(false);
          setLog(l => [...l, { role: "system", content: "🟢 Ozan has joined the chat" }]);
        }
        if (data.ozanActive === "FALSE" && ozanIsActive) {
          setOzanIsActive(false);
          clearInterval(pollIntervalRef.current);
          setLog(l => [...l, { role: "system", content: "Ozan has left the chat — I'm back! 😊" }]);
        }
        if (data.messages?.length > 0) {
          const newMsgs = data.messages.filter(m => m.role === "ozan");
          if (newMsgs.length > 0) {
            setLog(l => [...l, ...newMsgs.map(m => ({ role: "ozan", content: m.text }))]);
            lastSeenTsRef.current = Math.max(...newMsgs.map(m => m.ts));
          }
        }
      } catch (e) { }
    };
    pollIntervalRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollIntervalRef.current);
  }, [ozanInvited, ozanIsActive]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [log, busy]);

  async function send(e) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    if (ozanIsActive || ozanInvited) {
      setLog(l => [...l, { role: "user", content: text }]);
      try {
        await fetch("/api/ozan-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current, text, t: ozanTokenRef.current || "pending", role: "guest" }),
        });
      } catch(e) { }
      if (!ozanIsActive) {
        setLog(l => [...l, { role: "system", content: "⏳ Message held — Ozan will see it when he joins" }]);
      }
      return;
    }
    const userMsg = { role: "user", content: text };
    setLog(l => [...l, userMsg]);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...log, userMsg], sessionId: sessionIdRef.current, alertSent, pendingRelay, ozanAcked, ozanAckType, pageSource: pageSourceRef.current, sawBanner: typeof localStorage !== "undefined" ? (localStorage.getItem('db_saw_banner') || sessionStorage.getItem('db_saw_banner')) : null, guestBooking: guestBookingRef.current || null })
      });
      const data = await r.json();
      if (data.alertSent) setAlertSent(true);
      setPendingRelay(data.pendingRelay === true);
      if (data.ozanAcked) setOzanAcked(true);
      if (data.ozanAckType) setOzanAckType(data.ozanAckType);
      if (data.ozanAckType && !ozanAckType) {
        setAlertSent(false);
        setOzanAcked(false);
      }
      if (data.ozanInvited) {
        setOzanInvited(true);
        if (data.ozanToken) ozanTokenRef.current = data.ozanToken;
      }
      if (data.ozanActive === "TRUE" || data.ozanActive === "PENDING" || data.ozanActive === true) {
        if (data.ozanActive === "TRUE") setOzanIsActive(true);
        setOzanInvited(true);
        return;
      }
      const reply = data?.reply;
      if (!reply || reply === "⏳") return;
      setLog(l => [...l, { role: "assistant", content: reply }]);
    } catch {
      setLog(l => [...l, { role: "assistant", content: "Sorry—there was an error reaching the bot." }]);
    } finally {
      setBusy(false);
    }
  }

  const linkify = (t) =>
    t.replace(/(https?:\/\/[^\s]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;">${u}</a>`)
     .replace(/\n/g, "<br/>");

  const styles = {
    page: { maxWidth: 820, margin: "0 auto", padding: 12, fontFamily: "system-ui, sans-serif" },
    heading: { fontSize: 22, margin: "8px 0 12px" },
    chatBox: {
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
      border: "0.5px solid rgba(0,0,0,0.08)"
    },
    header: {
      background: "linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%)",
      padding: "14px 18px",
      display: "flex",
      alignItems: "center",
      gap: 10
    },
    headerAvatar: {
      width: 40, height: 40, borderRadius: "50%",
      background: "rgba(255,255,255,0.2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 20,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      border: "2px solid rgba(255,255,255,0.3)",
      flexShrink: 0
    },
    headerName: { color: "#fff", fontWeight: 500, fontSize: 15, margin: 0 },
    headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 11, margin: 0 },
    messagesArea: {
      height: 520, overflowY: "auto", padding: "16px 14px",
      background: "#f0f4fa",
      display: "flex", flexDirection: "column", gap: 10
    },
    systemMsg: { textAlign: "center", fontSize: 11, color: "#9ca3af", fontStyle: "italic" },
    botIcon: {
      width: 28, height: 28, borderRadius: "50%",
      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
      boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, flexShrink: 0,
      border: "1.5px solid rgba(255,255,255,0.7)"
    },
    botBubble: {
      background: "linear-gradient(145deg, #ffffff, #f0f4ff)",
      color: "#1e293b",
      borderRadius: "18px 18px 18px 4px",
      padding: "11px 15px",
      fontSize: 14, lineHeight: 1.55,
      maxWidth: "78%",
      boxShadow: "0 4px 12px rgba(37,99,235,0.12), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
      border: "0.5px solid rgba(37,99,235,0.15)",
      wordBreak: "break-word"
    },
    userBubble: {
      background: "linear-gradient(145deg, #2f74eb, #1a56d6)",
      color: "#fff",
      borderRadius: "18px 18px 4px 18px",
      padding: "11px 15px",
      fontSize: 14, lineHeight: 1.55,
      maxWidth: "78%",
      boxShadow: "0 4px 14px rgba(37,99,235,0.35), 0 1px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)",
      wordBreak: "break-word"
    },
    ozanIcon: {
      width: 28, height: 28, borderRadius: "50%",
      background: "linear-gradient(135deg, #0369a1, #0284c7)",
      boxShadow: "0 2px 8px rgba(3,105,161,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, color: "white", fontWeight: 500, flexShrink: 0
    },
    ozanBubble: {
      background: "linear-gradient(145deg, #e0f2fe, #bae6fd)",
      color: "#0c4a6e",
      borderRadius: "18px 18px 18px 4px",
      padding: "11px 15px",
      fontSize: 14, lineHeight: 1.55,
      maxWidth: "78%",
      boxShadow: "0 4px 12px rgba(3,105,161,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
      border: "0.5px solid rgba(3,105,161,0.2)",
      wordBreak: "break-word"
    },
    typingBubble: {
      background: "linear-gradient(145deg, #ffffff, #f0f4ff)",
      borderRadius: "18px 18px 18px 4px",
      padding: "10px 14px",
      boxShadow: "0 4px 12px rgba(37,99,235,0.1), inset 0 1px 0 rgba(255,255,255,0.9)",
      border: "0.5px solid rgba(37,99,235,0.12)",
      display: "flex", gap: 4, alignItems: "center"
    },
    inputArea: {
      display: "flex", gap: 8,
      borderTop: "0.5px solid rgba(0,0,0,0.08)",
      padding: "10px 12px",
      background: "#fff",
      alignItems: "flex-end"
    },
    textarea: {
      flex: 1, resize: "none", padding: "9px 14px",
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      fontSize: 14,
      background: "#f8fafc",
      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
      fontFamily: "system-ui, sans-serif",
      outline: "none"
    },
    sendBtn: {
      padding: "9px 16px", borderRadius: 12, border: 0,
      background: "linear-gradient(145deg, #2f74eb, #1a56d6)",
      color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
      boxShadow: "0 3px 10px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.2)"
    }
  };

  return (
    <main style={styles.page}>
      <h1 style={styles.heading}>Destiny Blue — Your AI Concierge</h1>

      <div style={styles.chatBox}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerAvatar}>🌊</div>
          <div>
            <p style={styles.headerName}>Destiny Blue</p>
            <p style={styles.headerSub}>Your AI Concierge · Online</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} style={styles.messagesArea}>
          {log.map((m, i) => {
            if (m.role === "system") return (
              <div key={i} style={styles.systemMsg}>{m.content}</div>
            );
            const isUser = m.role === "user";
            const isOzan = m.role === "ozan";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
                {!isUser && (
                  <div style={isOzan ? styles.ozanIcon : styles.botIcon}>
                    {isOzan ? "OZ" : "🌊"}
                  </div>
                )}
                <div style={isUser ? styles.userBubble : isOzan ? styles.ozanBubble : styles.botBubble}>
                  {isOzan && <div style={{ fontSize: 10, color: "#0369a1", fontWeight: "bold", marginBottom: 3 }}>Ozan</div>}
                  {isUser ? m.content : <div dangerouslySetInnerHTML={{ __html: linkify(m.content) }} />}
                </div>
              </div>
            );
          })}

          {ozanInvited && !ozanIsActive && (
            <div style={{ fontSize: 12, color: "#0369a1", fontWeight: "bold", padding: "4px 0" }}>
              🟡 Connecting you with Ozan — type and he'll see your messages when he joins…
            </div>
          )}

          {busy && !ozanInvited && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <div style={styles.botIcon}>🌊</div>
              <div style={styles.typingBubble}>
                {[0, 200, 400].map((delay, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%", background: "#94a3b8",
                    animation: "db-bounce 1.2s infinite",
                    animationDelay: `${delay}ms`
                  }} />
                ))}
              </div>
            </div>
          )}

          {ozanIsActive && busy && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>Ozan is typing…</div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={send} style={styles.inputArea}>
          <textarea
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
            placeholder="Ask about availability, local restaurants, activities, plan your Destin trip or anything about Destin 😊"
            style={styles.textarea}
          />
          <button type="submit" disabled={busy} style={{ ...styles.sendBtn, opacity: busy ? 0.6 : 1 }}>
            Send
          </button>
        </form>
      </div>

      <style>{`
        @keyframes db-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </main>
  );
}
