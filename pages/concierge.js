// pages/concierge.js
import { useState, useEffect, useRef } from "react";

function generateSessionId() {
  return "db_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default function Concierge() {
  const [log, setLog] = useState([
    { role: "assistant", content: "Hi! I'm Destiny Blue. How can I help with your stay?" }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [pendingRelay, setPendingRelay] = useState(false);
  const [ozanAcked, setOzanAcked] = useState(false);
  const [ozanAckType, setOzanAckType] = useState(null);
  const [ozanInvited, setOzanInvited] = useState(false);  // @ozan typed, waiting
  const [ozanIsActive, setOzanIsActive] = useState(false); // Ozan in chat
  const [lastSeenTs, setLastSeenTs] = useState(0);
  const sessionIdRef = useRef(null);
  const chatEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    try {
      let sid = localStorage.getItem("destiny_session_id");
      if (!sid) { sid = generateSessionId(); localStorage.setItem("destiny_session_id", sid); }
      sessionIdRef.current = sid;
    } catch (e) {
      sessionIdRef.current = generateSessionId();
    }
  }, []);

  // Poll for Ozan activity when invited or active
  useEffect(() => {
    if (!ozanInvited && !ozanIsActive) return;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const poll = async () => {
      if (!sessionIdRef.current) return;
      try {
        const r = await fetch(`/api/ozan-poll?s=${sessionIdRef.current}&since=${lastSeenTs}`);
        const data = await r.json();

        // Ozan just joined
        if (data.ozanActive === "TRUE" && !ozanIsActive) {
          setOzanIsActive(true);
          setOzanInvited(false);
          setLog(l => [...l, { role: "system", content: "🟢 Ozan has joined the chat" }]);
        }

        // Ozan left
        if (data.ozanActive === "FALSE" && ozanIsActive) {
          setOzanIsActive(false);
          clearInterval(pollIntervalRef.current);
          setLog(l => [...l, { role: "system", content: "Ozan has left the chat — I'm back! 😊" }]);
        }

        // New messages from Ozan
        if (data.messages?.length > 0) {
          const newMsgs = data.messages.filter(m => m.role === "ozan");
          if (newMsgs.length > 0) {
            setLog(l => [...l, ...newMsgs.map(m => ({ role: "ozan", content: m.text }))]);
            setLastSeenTs(Math.max(...newMsgs.map(m => m.ts)));
          }
        }
      } catch (e) { /* ignore */ }
    };

    pollIntervalRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollIntervalRef.current);
  }, [ozanInvited, ozanIsActive, lastSeenTs]);

  // Scroll INSIDE the chat box, not the whole page
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [log, busy]);

  async function send(e) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const userMsg = { role: "user", content: input.trim() };
    setLog(l => [...l, userMsg]);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...log, userMsg], sessionId: sessionIdRef.current, alertSent, pendingRelay, ozanAcked, ozanAckType })
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
      // @ozan invited — start polling, show waiting message
      if (data.ozanInvited) setOzanInvited(true);
      // Ozan is active — guest message was stored, no bot reply
      if (data.ozanActive) {
        setOzanIsActive(true);
        return; // don't add bot bubble
      }
      // Empty reply = ozan active, skip bot bubble
      const reply = data?.reply;
      if (!reply) return;
      setLog(l => [...l, { role: "assistant", content: reply }]);
    } catch {
      setLog(l => [...l, { role: "assistant", content: "Sorry—there was an error reaching the bot." }]);
    } finally {
      setBusy(false);
    }
  }

  const linkify = (t) =>
    t.replace(/(https?:\/\/[^\s]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`)
     .replace(/\n/g, "<br/>");

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 12, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, margin: "8px 0" }}>Destiny Blue — Your AI Concierge</h1>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        {/* scrollContainerRef on THIS div — scrolls internally, page stays still */}
        <div
          ref={scrollContainerRef}
          style={{ height: 520, overflowY: "auto", padding: 12, background: "#fff" }}
        >
          {log.map((m, i) => {
            if (m.role === "system") return (
              <div key={i} style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", margin: "6px 0", fontStyle: "italic" }}>
                {m.content}
              </div>
            );
            const isUser = m.role === "user";
            const isOzan = m.role === "ozan";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 8 }}>
                <div style={{ maxWidth: "82%" }}>
                  {isOzan && <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2, fontWeight: "bold" }}>Ozan</div>}
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 14,
                      background: isUser ? "#111827" : isOzan ? "#0369a1" : "#f3f4f6",
                      color: isUser || isOzan ? "#fff" : "#111827",
                      wordBreak: "break-word"
                    }}
                  >
                    {isUser ? m.content : <div dangerouslySetInnerHTML={{ __html: linkify(m.content) }} />}
                  </div>
                </div>
              </div>
            );
          })}
          {busy && <div style={{ fontSize: 12, color: "#6b7280" }}>{ozanIsActive ? "Ozan is typing…" : "Destiny Blue is typing…"}</div>}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={send} style={{ display: "flex", gap: 8, borderTop: "1px solid #e5e7eb", padding: 8, background: "#fafafa" }}>
          <textarea
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="e.g. 2025-10-10 to 2025-10-15, 2 adults 1 child"
            style={{ flex: 1, resize: "none", padding: 8, borderRadius: 12, border: "1px solid #e5e7eb" }}
          />
          <button
            type="submit"
            disabled={busy}
            style={{ padding: "8px 14px", borderRadius: 12, border: 0, background: "#2563eb", color: "#fff", opacity: busy ? 0.6 : 1 }}
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
