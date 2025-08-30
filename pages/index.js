// pages/index.js
import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I’m your Destin Concierge. Tell me unit, dates, adults, kids." },
  ]);
  const [loading, setLoading] = useState(false);

  async function send(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      const data = await res.json();

      if (data?.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Hmm, I didn’t get a reply. Try again?" },
        ]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error talking to the concierge. Please retry." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui, Arial" }}>
      <h1>Destin Concierge</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, minHeight: 240 }}>
        {messages.map((m, i) => (
          <p key={i}>
            <b>{m.role === "user" ? "You" : "AI"}:</b> {m.content}
          </p>
        ))}
        {loading && <p><i>AI is typing…</i></p>}
      </div>

      <form onSubmit={send} style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Book me a 2-bedroom condo for 4 adults, 2 kids, June 12–19"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "10px 16px", borderRadius: 10 }}
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </form>
    </main>
  );
}
