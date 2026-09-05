import { createClient } from "@supabase/supabase-js";
import { allowSameOriginRequest, enforceRateLimit } from "../../lib/public-api-security.js";
import { RECORDING_BUCKET, validRecordingId, validRecordingFile, equalSecret, recordingCookie, recordingUploader, recordingReader, sealRecording, openRecording } from "../../lib/voice-recording-access.js";

export const config = { api: { bodyParser: false, responseLimit: "2mb" } };
async function body(req, limit) {
  const parts = []; let size = 0;
  for await (const part of req) { size += part.length; if (size > limit) throw new Error("body_limit"); parts.push(part); }
  return Buffer.concat(parts);
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (!allowSameOriginRequest(req, res, { methods: ["GET", "POST", "PUT"] })) return;
  const writer = process.env.VOICE_RECORDING_UPLOAD_SECRET;
  const reader = process.env.VOICE_RECORDING_DOWNLOAD_SECRET;
  if (!writer || !reader || process.env.VERCEL_ENV === "production") return res.status(503).json({ error: "Private recording storage is not configured" });
  const readAccess = recordingReader(req, reader);
  const writeAccess = recordingUploader(req, writer);
  const { op, id, file } = req.query;
  try {
    if (op === "login" && req.method === "POST") {
      if (!enforceRateLimit(req, res, { scope: "voice-recording-login", limit: 6, windowMs: 600000 })) return;
      const code = JSON.parse((await body(req, 1024)).toString()).code;
      if (!equalSecret(code, writer)) return res.status(401).json({ error: "Incorrect recording access code" });
      res.setHeader("Set-Cookie", `voice_upload=${recordingCookie(writer)}; Path=/api/voice-recordings; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`);
      return res.json({ ok: true });
    }
    if (op === "status" && req.method === "GET") return res.json({ enabled: writeAccess });
    if (!readAccess && !writeAccess) return res.status(401).json({ error: "Recording access required" });
    const client = createClient(process.env.GUESTVIEW_SUPABASE_URL || process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL, process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const bucket = client.storage.from(RECORDING_BUCKET);
    if (op === "list" && req.method === "GET" && readAccess) {
      if (id && !validRecordingId(id)) return res.status(400).end();
      const { data, error } = await bucket.list(id || "", { limit: 1000, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      return res.json({ files: data });
    }
    if (op === "purge-expired" && req.method === "POST" && readAccess && validRecordingId(id)) {
      const { data, error } = await bucket.list(id, { limit: 1000 });
      if (error) throw error;
      if (!data.length || data.some(item => !validRecordingFile(item.name) || !item.updated_at || Date.now() - Date.parse(item.updated_at) < 7 * 86400000)) return res.json({ removed: false });
      const removed = await bucket.remove(data.map(item => `${id}/${item.name}`));
      if (removed.error) throw removed.error;
      return res.json({ removed: true });
    }
    if (!validRecordingId(id) || !validRecordingFile(file)) return res.status(400).json({ error: "Invalid recording path" });
    const path = `${id}/${file}`;
    if (req.method === "PUT" && writeAccess) {
      const bytes = await body(req, 512 * 1024 - 28);
      const { error } = await bucket.upload(path, sealRecording(bytes, reader, path), { contentType: "application/octet-stream", upsert: file === "snapshot.json" });
      // Immutable numbered chunks make retries idempotent.
      if (error && String(error.statusCode) !== "409" && error.message !== "The resource already exists") throw error;
      return res.json({ ok: true });
    }
    if (req.method === "GET" && readAccess) {
      const { data, error } = await bucket.download(path);
      if (error) throw error;
      res.setHeader("Content-Type", "application/octet-stream");
      return res.send(openRecording(Buffer.from(await data.arrayBuffer()), reader, path));
    }
    return res.status(403).json({ error: "Operation not permitted" });
  } catch (error) {
    return res.status(error.message === "body_limit" ? 413 : 500).json({ error: error.message === "body_limit" ? "Recording chunk too large" : "Recording storage request failed; retry later" });
  }
}
