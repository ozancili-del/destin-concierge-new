// pages/ozan.js — Ozan's live chat interface
import { useState, useEffect, useRef } from "react";

export default function OzanChat() {
  const [authorized, setAuthorized] = useState(false);
  const [joined, setJoined] = useState(false);
  const [left, setLeft] = useState(false);
  const [log, setLog] = useState([]); // { role: "guest"|"ozan"|"system", text }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  // Stable refs — safe to use inside setInterval
  const sessionIdRef = useRef(null);
  const tokenRef = useRef(null);
  const lastSeenRef = useRef(0);
  const pollRef = useRef(null);
  const scrollRef = useRef(null);

  // Parse URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("s");
    const t = params.get("t");
    if (!s || !t) return;
    sessionIdRef.current = s;
    tokenRef.current = t;
    setAuthorized(true);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [log]);

  // Join once authorized
  useEffect(() => {
    if (!authorized || joined) return;
    joinChat();
  }, [authorized]);

  function addMsg(role, text) {
    setLog(l => [...l, { role, text }]);
  }

  async function joinChat() {
    try {
      const r = await fetch("/api/ozan-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, t: tokenRef.current }),
      });
      if (r.ok) {
        setJoined(true);
        addMsg("system", "You joined the chat. Guest will see: 🟢 Ozan has joined.");
        startPolling();
      } else {
        addMsg("system", "⚠️ Could not join — invalid or expired link.");
      }
    } catch (e) {
      addMsg("system", "⚠️ Network error joining chat.");
    }
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(poll, 3000);
  }

  async function poll() {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const r = await fetch("/api/ozan-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s: sid, since: lastSeenRef.current }),
      });
      if (!r.ok) return;
      const data = await r.json();

      const newMsgs = (data.messages || []).filter(m => m.ts > lastSeenRef.current);
      if (newMsgs.length > 0) {
        // Only show guest messages — ozan ones are shown optimistically on send
        const incoming = newMsgs.filter(m => m.role !== "ozan");
        if (incoming.length > 0) {
          setLog(l => [...l, ...incoming.map(m => ({ role: m.role, text: m.text }))]);
        }
        lastSeenRef.current = Math.max(...newMsgs.map(m => m.ts));
      }
    } catch (e) { /* silent */ }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");

    // Show immediately (optimistic) — set lastSeenRef ahead so poll skips this message
    lastSeenRef.current = Math.max(lastSeenRef.current, Date.now() + 1);
    addMsg("ozan", text);

    setBusy(true);
    try {
      await fetch("/api/ozan-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, text, t: tokenRef.current, role: "ozan" }),
      });
    } catch (e) {
      addMsg("system", "⚠️ Send failed.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveChat() {
    if (!confirm("Leave the chat? Destiny Blue will resume.")) return;
    clearInterval(pollRef.current);
    try {
      await fetch("/api/ozan-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, t: tokenRef.current }),
      });
      setLeft(true);
      addMsg("system", "You left the chat. Destiny Blue has resumed.");
    } catch (e) {
      addMsg("system", "⚠️ Leave failed.");
    }
  }

  if (!authorized) return (
    <div style={{ padding: 24, textAlign: "center", marginTop: 80, fontFamily: "system-ui" }}>
      <p style={{ color: "#dc2626", fontSize: 18 }}>⛔ Invalid or missing link. Use the link from Discord.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 12, fontFamily: "system-ui, sans-serif", height: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#0f172a", color: "#fff", padding: "12px 16px", borderRadius: 12, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: 15 }}>💬 Live Chat — Destiny Blue</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>Session: {sessionIdRef.current?.substring(0, 16)}…</div>
        </div>
        {!left && (
          <button onClick={leaveChat} style={{ background: "#dc2626", color: "#fff", border: 0, borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontWeight: "bold" }}>
            Leave Chat
          </button>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, marginBottom: 8 }}>
        {log.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 40 }}>Waiting for guest messages…</div>
        )}
        {log.map((m, i) => {
          if (m.role === "system") return (
            <div key={i} style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", margin: "8px 0", fontStyle: "italic" }}>{m.text}</div>
          );
          const isOzan = m.role === "ozan";
          return (
            <div key={i} style={{ display: "flex", justifyContent: isOzan ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{ maxWidth: "80%" }}>
                {!isOzan && <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2, fontWeight: 600 }}>Guest</div>}
                <div style={{
                  padding: "9px 13px", borderRadius: 12, wordBreak: "break-word", fontSize: 14,
                  background: isOzan ? "#0f172a" : "#dbeafe",
                  color: isOzan ? "#fff" : "#1e3a5f",
                }}>
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!left ? (
        <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message…"
            disabled={busy}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 15, outline: "none" }}
          />
          <button type="submit" disabled={busy || !input.trim()}
            style={{ padding: "11px 18px", borderRadius: 10, border: 0, background: "#0f172a", color: "#fff", fontSize: 15, fontWeight: "bold", cursor: "pointer", opacity: busy ? 0.5 : 1 }}>
            Send
          </button>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: 16, color: "#94a3b8", fontSize: 13 }}>Chat ended — Destiny Blue resumed.</div>
      )}
    </div>
  );
}
