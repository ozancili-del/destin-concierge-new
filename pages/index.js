import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I’m your Destin Concierge. Tell me unit, dates, adults, kids." }
  ]);

  async function send(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");

    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input })
    });
    const data = await r.json();
    setMessages([...next, { role: "assistant", content: data.reply }]);
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui, Arial" }}>
      <h1>Destin Concierge</h1>
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, minHeight: 240 }}>
        {messages.map((m, i) => (
          <p key={i}><b>{m.role === "user" ? "You" : "AI"}:</b> {m.content}</p>
        ))}
      </div>
      <form onSubmit={send} style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
        <button style={{ padding: "10px 16px", borderRadius: 10 }}>Send</button>
      </form>
    </main>
  );
}
