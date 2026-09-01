import { allowSameOriginRequest, enforceRateLimit } from "../../lib/public-api-security.js";

export const config = { api: { bodyParser: false } };

async function readBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
  if (!enforceRateLimit(req, res, { scope: "destiny-transcribe", limit: 12, windowMs: 10 * 60 * 1000 })) return;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Voice service is temporarily unavailable" });

  const contentType = String(req.headers["content-type"] || "").split(";")[0].toLowerCase();
  const allowed = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"]);
  if (!allowed.has(contentType)) return res.status(415).json({ error: "Unsupported audio format" });

  try {
    const audio = await readBody(req, 5 * 1024 * 1024);
    if (audio.length < 500) return res.status(400).json({ error: "No speech was recorded" });
    const extension = contentType === "audio/mp4" ? "m4a" : contentType === "audio/mpeg" ? "mp3" : contentType.split("/")[1];
    const form = new FormData();
    form.append("model", "gpt-transcribe");
    form.append("language", "en");
    form.append("file", new Blob([audio], { type: contentType }), `destiny-question.${extension}`);
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!response.ok) {
      console.error("[DESTINY VOICE] transcription provider status", response.status);
      return res.status(502).json({ error: "I couldn't understand that recording" });
    }
    const data = await response.json();
    const text = String(data?.text || "").trim().slice(0, 1200);
    if (!text) return res.status(422).json({ error: "I didn't hear a question" });
    return res.status(200).json({ text });
  } catch (error) {
    if (error?.message === "TOO_LARGE") return res.status(413).json({ error: "Recording is too long" });
    console.error("[DESTINY VOICE] transcription failed", error?.name || "Error");
    return res.status(502).json({ error: "Voice transcription failed" });
  }
}
