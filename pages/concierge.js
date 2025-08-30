// pages/concierge.js
import { useState } from "react";

export default function Concierge() {
  const [log, setLog] = useState([
    { role: "assistant", content: "Hi! I’m Destiny Blue. How can I help with your stay?" }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

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
        body: JSON.stringify({ messages: [...log, userMsg] })
      });
      const data = await r.json();
      const reply = data?.reply || "Hmm, I didn’t get a reply.";
      setLog(l => [...l, { role: "assistant", content: reply }]);
    } catch {
      setLog(l => [...l, { role: "assistant", content: "Sorry—there was an error reaching the bot." }]);
    } finally {
      setBusy(false);
    }
  }

  // simple, clean styles so it looks fine in an iframe
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 12, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, margin: "8px 0" }}>Destiny Blue — Your AI Concierge</h1>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ height: 480, overflowY: "auto", padding: 12, background: "#fff" }}>
          {log.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div
                style={{
                  maxWidth: "80%",
                  padding: "8px 12px",
                  borderRadius: 14,
                  background: m.role === "user" ? "#111827" : "#f3f4f6",
                  color: m.role === "user" ? "#fff" : "#111827",
                  whiteSpace: "pre-wrap"
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && <div style={{ fontSize: 12, color: "#6b7280" }}>Destiny Blue is typing…</div>}
        </div>

        <form onSubmit={send} style={{ display: "flex", gap: 8, borderTop: "1px solid #e5e7eb", padding: 8, background: "#fafafa" }}>
          <textarea
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about availability, prices, parking, restaurants…"
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
