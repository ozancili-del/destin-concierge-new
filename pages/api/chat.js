// pages/api/chat.js
export default async function handler(req, res) {
  try {
    const { messages = [] } = req.body || {};
    const lastUser = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const reply = `Hi! I’m Destiny Blue. You said: "${lastUser}". I can help with dates, prices, and local tips.`;
    res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI error" });
  }
}
