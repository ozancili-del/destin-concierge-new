// pages/api/chat.js
import OpenAI from "openai";

const hasKey = !!process.env.OPENAI_API_KEY;
const client = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// normalize: lowercase + remove spaces/hyphens/underscores
function norm(s = "") {
  return s.toLowerCase().replace(/[\s\-_]/g, "");
}

// quick FAQ intent router (runs BEFORE any AI call)
function faqReply(userText = "") {
  const n = norm(userText);

  if (n.includes("wifi") || n.includes("internet"))
    return "Yes—fast Wi-Fi is included. The network name and password are in your arrival email.";

  if (n.includes("parking"))
    return "We have free on-site parking. One spot per unit; overflow street parking is available.";

  if (n.includes("checkin") || n.includes("earlycheckin"))
    return "Check-in is 4pm. Early check-in may be possible—tell me your dates and I’ll check.";

  if (n.includes("checkout") || n.includes("latecheckout"))
    return "Check-out is 11am. Late check-out is subject to availability.";

  if (n.includes("pets") || n.includes("petfriendly"))
    return "We welcome small, well-behaved pets with prior approval and a cleaning fee.";

  if (n.includes("restaurant") || n.includes("food") || n.includes("breakfast"))
    return "Happy to recommend local spots—tell me what you’re craving (casual, seafood, coffee, etc.).";

  if (n.includes("pool"))
    return "There’s no pool on site, but I can point you to great nearby options and beach access.";

  if (n.includes("cancellation") || n.includes("policy"))
    return "Cancellation terms are shown during checkout. Ask me your dates and I’ll confirm the exact policy.";

  if (n.includes("book") || n.includes("availability") || n.includes("reserve"))
    return "I can help—what are your check-in/check-out dates and number of guests? For instant booking, use the link on this page.";

  return null; // no FAQ hit
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages = [] } = req.body || {};
    const lastUser = [...messages].reverse().find(m => m.role === "user")?.content || "";

    // 1) Answer FAQs first (works even with no credits)
    const faq = faqReply(lastUser);
    if (faq) return res.status(200).json({ reply: faq });

    // 2) If no key, graceful generic reply
    if (!hasKey) {
      return res.status(200).json({
        reply:
          "I’m Destiny Blue. Share your check-in/check-out dates and guest count, and I’ll assist. " +
          "For instant booking, please use the link on this page."
      });
    }

    // 3) Real AI reply
    const systemPrompt =
      "You are Destiny Blue, a warm and concise AI hotel concierge. " +
      "If booking is requested, gather check-in/check-out dates, number of guests, preferred unit, and special needs. " +
      "Never take payments—direct guests to the official booking link.";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [{ role: "system", content: systemPrompt }, ...messages.filter(m => m.role !== "system")],
    });

    const reply = response?.choices?.[0]?.message?.content?.trim() || null;
    if (reply) return res.status(200).json({ reply });

    throw new Error("Empty AI reply");
  } catch (err) {
    const msg = String(err || "");
    const isQuota = /429|rate|quota|insufficient|payment/i.test(msg);
    if (isQuota) {
      return res.status(200).json({
        reply:
          "I’m at my message limit right now. Meanwhile, tell me your dates and guest count and I’ll assist, " +
          "or use the booking link on this page."
      });
    }
    console.error("Chat API error:", err);
    return res.status(200).json({
      reply: "I hit a temporary error reaching the AI service. Please try again in a moment."
    });
  }
}
