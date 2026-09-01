import { allowSameOriginRequest, enforceRateLimit } from "../../lib/public-api-security.js";
import { VOICE_INSTRUCTIONS, VOICE_OUTPUT } from "../../lib/destiny-agent/voice-experience.js";

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
    const session = {
      type: "realtime",
      model: "gpt-realtime-1.5",
      instructions: VOICE_INSTRUCTIONS,
      output_modalities: ["audio"],
      max_output_tokens: 420,
      audio: {
        input: {
          transcription: { model: "gpt-4o-mini-transcribe", language: "en", prompt: "Destiny, Destin, Pelican Beach Resort, condo, Unit 707, Unit 1006, Ozan" },
          noise_reduction: { type: "near_field" },
          turn_detection: { type: "semantic_vad", eagerness: "high", create_response: true, interrupt_response: true },
        },
        output: VOICE_OUTPUT,
      },
      tools: [{
        type: "function",
        name: "check_live_availability",
        description: "Directly check both condos in live OwnerRez for one party of no more than six guests. Use immediately when exact dates, adults, and children are known. Zero children is valid and must not be reconfirmed.",
        parameters: {
          type: "object",
          properties: {
            arrival: { type: "string", description: "Check-in date in YYYY-MM-DD format." },
            departure: { type: "string", description: "Check-out date in YYYY-MM-DD format." },
            adults: { type: "integer", minimum: 1, maximum: 6 },
            children: { type: "integer", minimum: 0, maximum: 5 },
          },
          required: ["arrival", "departure", "adults", "children"],
          additionalProperties: false,
        },
      }, {
        type: "function",
        name: "ask_destiny_brain",
        description: "Consult Destiny Blue's authoritative existing knowledge and live tools. Use for all property, resort, policy, booking, availability, weather, local guide, guest support, and reservation questions.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "The guest's complete current question, including relevant context from the conversation." } },
          required: ["query"],
          additionalProperties: false,
        },
      }],
      tool_choice: "auto",
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
    return res.status(200).send(body);
  } catch (error) {
    if (error?.message === "TOO_LARGE") return res.status(413).json({ error: "WebRTC offer is too large" });
    console.error("[DESTINY REALTIME] connection failed", error?.name || "Error");
    return res.status(502).json({ error: "Voice conversation could not start" });
  }
}
