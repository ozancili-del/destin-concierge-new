// pages/api/chat.js
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  try {
    const { messages = [] } = req.body || {};
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "You are Destin Concierge, a friendly local expert for Destin, Florida. \
Return concise, useful suggestions: neighborhoods, typical nightly price ranges, \
parking, whether a car is needed, family vs couples options, and a short itinerary. \
Use bullet points when helpful. If dates/adults/kids/bedrooms are given, tailor the advice.",
        },
        ...messages,
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn’t generate a response.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("AI error:", err);
    return res.status(500).json({ error: "AI request failed." });
  }
}
