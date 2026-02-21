// pages/concierge.js
import { useState, useEffect, useRef } from "react";

function generateSessionId() {
  return "db_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default function Concierge() {
  const [log, setLog] = useState([
    { role: "assistant", content: "Hi! I’m Destiny Blue. How can I help with your stay?" }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [pendingRelay, setPendingRelay] = useState(false);
  const [ozanAcked, setOzanAcked] = useState(false);
  const sessionIdRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    try {
      let sid = localStorage.getItem("destiny_session_id");
      if (!sid) { sid = generateSessionId(); localStorage.setItem("destiny_session_id", sid); }
      sessionIdRef.current = sid;
    } catch (e) {
      sessionIdRef.current = generateSessionId();
    }
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [log, busy]);

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
        body: JSON.stringify({ messages: [...log, userMsg], sessionId: sessionIdRef.current, alertSent, pendingRelay, ozanAcked })
      });
      const data = await r.json();
      if (data.alertSent) setAlertSent(true);
      setPendingRelay(data.pendingRelay === true);
      if (data.ozanAcked) setOzanAcked(true);
      const reply = data?.reply || "Hmm, I didn’t get a reply.";
      setLog(l => [...l, { role: "assistant", content: reply }]);
    } catch {
      setLog(l => [...l, { role: "assistant", content: "Sorry—there was an error reaching the bot." }]);
    } finally {
      setBusy(false);
    }
  }

  // turn URLs in assistant messages into clickable links
  const linkify = (t) =>
    t.replace(/(https?:\/\/[^\s]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`)
     .replace(/\n/g, "<br/>");

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 12, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, margin: "8px 0" }}>Destiny Blue — Your AI Concierge</h1>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ height: 520, overflowY: "auto", padding: 12, background: "#fff" }}>
          {log.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 8 }}>
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "8px 12px",
                    borderRadius: 14,
                    background: isUser ? "#111827" : "#f3f4f6",
                    color: isUser ? "#fff" : "#111827",
                    wordBreak: "break-word"
                  }}
                >
                  {isUser ? (
                    m.content
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: linkify(m.content) }} />
                  )}
                </div>
              </div>
            );
          })}
          {busy && <div style={{ fontSize: 12, color: "#6b7280" }}>Destiny Blue is typing…</div>}
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
