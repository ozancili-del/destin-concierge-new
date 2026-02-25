// pages/ozan.js
// Ozan's live chat interface — accessible via Discord link
// URL: /ozan?s=SESSION_ID&key=OZAN_KEY
import { useState, useEffect, useRef } from "react";

export default function OzanChat() {
  const [authorized, setAuthorized] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [key, setKey] = useState(null);
  const [log, setLog] = useState([]); // { role: "guest"|"ozan"|"system", text, ts }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const [left, setLeft] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);
  const scrollRef = useRef(null);
  const pollRef = useRef(null);

  // Parse session + key from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("s");
    const k = params.get("key");
    if (!s || !k) return;
    setSessionId(s);
    setKey(k);
    setAuthorized(true);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [log]);

  // Join chat on mount (once authorized)
  useEffect(() => {
    if (!authorized || !sessionId || joined) return;
    joinChat();
  }, [authorized, sessionId]);

  async function joinChat() {
    try {
      const r = await fetch(`/api/ozan-join?s=${sessionId}&key=${key}`, { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, key }) });
      if (r.ok) {
        setJoined(true);
        addSystem("You joined the chat. Guest will see: 🟢 Ozan has joined.");
        startPolling();
      }
    } catch (e) {
      addSystem("⚠️ Could not join — check your connection.");
    }
  }

  function addSystem(text) {
    setLog(l => [...l, { role: "system", text, ts: Date.now() }]);
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(pollForMessages, 3000);
  }

  async function pollForMessages() {
    if (!sessionId) return;
    try {
      const r = await fetch(`/api/ozan-poll?s=${sessionId}&since=${lastSeen}`);
      const data = await r.json();

      if (data.messages?.length > 0) {
        const newMsgs = data.messages.filter(m => m.ts > lastSeen);
        if (newMsgs.length > 0) {
          setLog(l => [...l, ...newMsgs]);
          setLastSeen(Math.max(...newMsgs.map(m => m.ts)));
        }
      }
    } catch (e) { /* ignore poll errors */ }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    setBusy(true);
    // Optimistically show message
    const msg = { role: "ozan", text, ts: Date.now() };
    setLog(l => [...l, msg]);
    try {
      await fetch("/api/ozan-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text, key, role: "ozan" }),
      });
    } catch (e) {
      addSystem("⚠️ Send failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveChat() {
    if (!confirm("Leave the chat? Destiny Blue will resume with the guest.")) return;
    clearInterval(pollRef.current);
    try {
      await fetch("/api/ozan-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, key }),
      });
      setLeft(true);
      addSystem("You left the chat. Destiny Blue has resumed.");
    } catch (e) {
      addSystem("⚠️ Leave failed — try again.");
    }
  }

  if (!authorized) return (
    <div style={{ padding: 24, fontFamily: "system-ui", textAlign: "center", marginTop: 80 }}>
      <p style={{ color: "#dc2626", fontSize: 18 }}>⛔ Access denied — invalid or missing session link.</p>
      <p style={{ color: "#6b7280", fontSize: 14 }}>Use the link from Discord.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 12, fontFamily: "system-ui, sans-serif", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#0f172a", color: "#fff", padding: "12px 16px", borderRadius: 12, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: 15 }}>💬 Live Chat — Destiny Blue</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Session: {sessionId?.substring(0, 16)}…</div>
        </div>
        {!left && (
          <button onClick={leaveChat} style={{ background: "#dc2626", color: "#fff", border: 0, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: "bold" }}>
            Leave Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, marginBottom: 8 }}>
        {log.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", marginTop: 40 }}>
            Waiting for guest messages...
          </div>
        )}
        {log.map((m, i) => {
          if (m.role === "system") return (
            <div key={i} style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", margin: "8px 0", fontStyle: "italic" }}>
              {m.text}
            </div>
          );
          const isOzan = m.role === "ozan";
          return (
            <div key={i} style={{ display: "flex", justifyContent: isOzan ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{ maxWidth: "80%" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2, textAlign: isOzan ? "right" : "left" }}>
                  {isOzan ? "Ozan" : "Guest"} · {new Date(m.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </div>
                <div style={{
                  padding: "8px 12px", borderRadius: 12,
                  background: isOzan ? "#0f172a" : "#e2e8f0",
                  color: isOzan ? "#fff" : "#0f172a",
                  wordBreak: "break-word", fontSize: 14,
                }}>
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      {!left ? (
        <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message…"
            disabled={busy}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, outline: "none" }}
          />
          <button type="submit" disabled={busy || !input.trim()}
            style={{ padding: "10px 16px", borderRadius: 10, border: 0, background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: "bold", cursor: "pointer", opacity: busy ? 0.5 : 1 }}>
            Send
          </button>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: 16, color: "#94a3b8", fontSize: 13 }}>
          Chat ended. Destiny Blue has taken over.
        </div>
      )}
    </div>
  );
}
