import { createServices } from "../../lib/destiny-agent/services.js";
import { allowSameOriginRequest, cleanText, enforceJsonSize, enforceRateLimit } from "../../lib/public-api-security.js";

const services = createServices();
const EVENT_TYPES = new Set([
  "call_started", "call_ended", "user_transcript", "assistant_transcript",
  "tool_call", "tool_result", "interrupted", "cancelled", "error",
  "audio_path_attached", "audio_duck_started", "audio_duck_restored",
  "candidate_classified", "candidate_timed_out", "late_transcript_ignored",
  "transcription_failed",
]);

function cleanId(value, max = 160) {
  const id = cleanText(value, max);
  return /^[a-zA-Z0-9._:-]+$/.test(id) ? id : "";
}

export function createVoiceEventHandler({ servicesClient = services } = {}) {
  return async function handler(req, res) {
    if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
    if (!enforceJsonSize(req, res, 20_000)) return;
    if (!enforceRateLimit(req, res, { scope: "destiny-voice-events", limit: 240, windowMs: 10 * 60 * 1000 })) return;

    const body = req.body || {};
    const sessionId = cleanId(body.sessionId);
    const callId = cleanId(body.callId);
    const eventId = cleanId(body.eventId, 240);
    const eventType = cleanText(body.eventType, 40);
    const role = ["user", "assistant", "system"].includes(body.role) ? body.role : "system";
    const text = cleanText(body.text, 12_000, { multiline: true });

    if (!sessionId || !callId || !eventId || !EVENT_TYPES.has(eventType)) {
      return res.status(400).json({ error: "Invalid voice event" });
    }
    if ((eventType === "user_transcript" || eventType === "assistant_transcript") && !text) {
      return res.status(400).json({ error: "Transcript text is required" });
    }

    const result = await servicesClient.logVoiceEvent({
      sessionId,
      callId,
      eventId,
      eventType,
      role,
      text,
      turnId: cleanId(body.turnId),
      providerEventId: cleanId(body.providerEventId, 240),
      toolName: cleanId(body.toolName, 80),
      toolStatus: cleanId(body.toolStatus, 80),
      interrupted: body.interrupted === true,
      latencyMs: Number.isFinite(body.latencyMs) && body.latencyMs >= 0 ? Math.round(body.latencyMs) : null,
      clientTimestamp: cleanText(body.clientTimestamp, 40),
    });
    if (!result?.ok) return res.status(503).json({ error: "Voice event could not be stored" });
    return res.status(result.duplicate ? 200 : 201).json({ ok: true, duplicate: result.duplicate === true });
  };
}

export default createVoiceEventHandler();
