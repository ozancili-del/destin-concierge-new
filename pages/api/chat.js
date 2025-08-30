// pages/api/chat.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Just say: Hello from Destiny Blue" }],
    });

    console.log("OpenAI response:", JSON.stringify(response, null, 2));

    res.status(200).json({
      raw: response, // send back the full object so we see it
      reply: response.choices?.[0]?.message?.content || "no reply",
    });
  } catch (err) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: String(err) });
  }
}
