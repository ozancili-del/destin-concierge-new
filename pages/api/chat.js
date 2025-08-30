// pages/api/chat.js
import OpenAI from "openai";

const hasKey = !!process.env.OPENAI_API_KEY;
const client = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// super-simple concierge fallback: short useful answers without AI
function fallbackReply(userText = "") {
  const t = userText.toLowerCase();
  if (t.includes("parking")) return "We have free on-site parking. One spot per unit; overflow street parking is available.";
  if (t.includes("check-in") || t.includes("check in")) return "Check-in is 4pm. Early check-in may be possible—just ask with your dates.";
  if (t.includes("check-out") || t.includes("check out")) return "Check-out is 11am. Late check-out is subject to availability.";
  if (t.includes("wifi") || t.includes("internet")) return "Yes—fast Wi-Fi is included. The network name and password are in your arrival email.";
  if (t.includes("pets")) return "We welcome small, well-behaved pets with prior approval and a cleaning fee.";
  if (t.includes("book") || t.includes("availability") || t.includes("reserve")) {
    return "I can help—what are your check-in/check-out dates and number of guests? For instant booking, use the link on this page.";
  }
  return "I’m Destiny Blue. Tell me your dates, guests, and any questions—parking, Wi-Fi, late check-out, local tips, etc.";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages = [] } = req.body || {};
    const lastUser = [...messages].reverse().find(m => m.role === "user")?.content || "";

    if (!hasKey) {
      // No key? Stay friendly and useful.
      return res.status(200).json({ reply: fallbackReply(lastUser) });
    }

    // Try OpenAI
    const systemPrompt =
      "You are Destiny Blue, a warm and concise AI hotel concierge. " +
      "If booking is requested, gather check-in/check-out dates, number of guests, preferred unit, and special needs. " +
      "Never take payments—direct guests to the official booking link.";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [{ role: "system", content: systemPrompt }, ...messages.filter(m => m.role !== "system")],
    });

    const reply = response?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty AI reply");
    return res.status(200).json({ reply });
  } catch (err) {
    // If it’s a quota/429 issue, keep UX smooth with a helpful message.
    const msg = String(err || "");
    const isQuota = /429|rate|quota|insufficient|payment/i.test(msg);
    if (isQuota) {
      return res.status(200).json({
        reply:
          "I’m at my message limit right now, but I can still help: what are your check-in/check-out dates and number of guests? " +
          "For instant booking, please use the link on this page.",
      });
    }
    console.error("Chat API error:", err);
    return res.status(200).json({
      reply: "I hit a temporary error reaching the AI service. Please try again, or share your dates and guest count and I’ll assist.",
    });
  }
}
