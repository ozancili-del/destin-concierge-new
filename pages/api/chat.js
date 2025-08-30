// pages/api/chat.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [] } = req.body || {};

    const systemPrompt =
      "You are Destiny Blue, a warm and concise AI hotel concierge. " +
      "Answer clearly. If booking is requested, gather dates, number of guests, " +
      "preferred unit, and any special needs. Do NOT take payments here—send users " +
      "to the official booking link when needed.";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.filter(m => m && m.role !== "system")
      ],
    });

    const reply =
      response?.choices?.[0]?.message?.content?.trim() ||
      "Sorry—Destiny Blue couldn’t generate a reply.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: "AI error" });
  }
}
