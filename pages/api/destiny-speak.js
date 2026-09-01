import { allowSameOriginRequest, enforceJsonSize, enforceRateLimit } from "../../lib/public-api-security.js";
import { toSpokenText } from "../../lib/destiny-agent/speech-text.js";

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
  if (!enforceJsonSize(req, res, 5000)) return;
  if (!enforceRateLimit(req, res, { scope: "destiny-speak", limit: 15, windowMs: 10 * 60 * 1000 })) return;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Voice service is temporarily unavailable" });

  const input = toSpokenText(req.body?.text, 1200);
  if (!input) return res.status(400).json({ error: "There is nothing to speak" });
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "coral", response_format: "mp3", input, instructions: "Speak warmly, clearly, and conversationally as a friendly Destin beach concierge. Do not sound promotional or rushed." }),
    });
    if (!response.ok) {
      console.error("[DESTINY VOICE] speech provider status", response.status);
      return res.status(502).json({ error: "Destiny couldn't speak this response" });
    }
    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Length", String(audio.length));
    return res.status(200).send(audio);
  } catch (error) {
    console.error("[DESTINY VOICE] speech failed", error?.name || "Error");
    return res.status(502).json({ error: "Destiny couldn't speak this response" });
  }
}
