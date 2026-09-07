import { allowSameOriginRequest, enforceRateLimit } from "../../lib/public-api-security.js";
import { buildVoiceInstructions, resolveVoiceModel, VOICE_MAX_OUTPUT_TOKENS, VOICE_MODEL, VOICE_OUTPUT } from "../../lib/destiny-agent/voice-experience.js";

export const config = { api: { bodyParser: false } };

async function readSdp(req, maxBytes = 100_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
  if (!enforceRateLimit(req, res, { scope: "destiny-realtime", limit: 6, windowMs: 10 * 60 * 1000 })) return;
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/sdp")) return res.status(415).json({ error: "Expected a WebRTC offer" });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Voice conversation is temporarily unavailable" });

  try {
    const sdp = await readSdp(req);
    if (!sdp.startsWith("v=0")) return res.status(400).json({ error: "Invalid WebRTC offer" });
    const model = resolveVoiceModel(req.headers["x-destiny-voice-model"], resolveVoiceModel(process.env.DESTINY_VOICE_MODEL, VOICE_MODEL));
    const session = {
      type: "realtime",
      model,
      instructions: buildVoiceInstructions(new Date()),
      output_modalities: ["audio"],
      max_output_tokens: VOICE_MAX_OUTPUT_TOKENS,
      audio: {
        input: {
          transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
          noise_reduction: { type: "near_field" },
          // The browser owns turn boundaries. Provider VAD clears WebRTC output as
          // soon as it detects sound, before a cough/noise transcript can be
          // classified. Manual commits let us validate the transcript first.
          turn_detection: null,
        },
        output: VOICE_OUTPUT,
      },
      // The application-owned turn gateway is the only routing authority.
      // Realtime renders its result and never selects or invokes business tools.
      tools: [],
      tool_choice: "none",
    };
    const boundary = `----destiny-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const multipart = Buffer.from([
      `--${boundary}\r\nContent-Disposition: form-data; name="sdp"\r\nContent-Type: application/sdp\r\n\r\n${sdp}\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="session"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(session)}\r\n`,
      `--${boundary}--\r\n`,
    ].join(""), "utf8");
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": String(multipart.length) },
      body: multipart,
    });
    const body = await response.text();
    if (!response.ok) {
      console.error("[DESTINY REALTIME] provider status", response.status, body.slice(0, 500));
      return res.status(502).json({ error: "Voice conversation could not start" });
    }
    res.setHeader("Content-Type", "application/sdp");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Destiny-Voice-Model", model);
    return res.status(200).send(body);
  } catch (error) {
    if (error?.message === "TOO_LARGE") return res.status(413).json({ error: "WebRTC offer is too large" });
    console.error("[DESTINY REALTIME] connection failed", error?.name || "Error");
    return res.status(502).json({ error: "Voice conversation could not start" });
  }
}
