import crypto from "node:crypto";

export const RECORDING_BUCKET = "destiny-private-voice-tests";
export const validRecordingId = value => /^[a-f0-9]{32}$/.test(String(value || ""));
export const validRecordingFile = value => /^(guest|destiny-received)-\d{5}\.bin$/.test(String(value || "")) && Number(value.slice(value.lastIndexOf("-") + 1, -4)) < 200 || value === "snapshot.json";
export function equalSecret(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
export function recordingCookie(secret, expires = Date.now() + 7 * 86400000) {
  return `${expires}.${crypto.createHmac("sha256", secret).update(`voice-upload:${expires}`).digest("hex")}`;
}
export function recordingUploader(req, secret, now = Date.now()) {
  if (!secret) return false;
  const value = String(req.headers.cookie || "").split(";").map(v => v.trim()).find(v => v.startsWith("voice_upload="))?.slice(13) || "";
  const expires = Number(value.split(".")[0]);
  return expires > now && expires <= now + 8 * 86400000 && equalSecret(value, recordingCookie(secret, expires));
}
export function recordingReader(req, secret) {
  return equalSecret(String(req.headers.authorization || "").replace(/^Bearer /, ""), secret);
}
export function sealRecording(bytes, secret, path) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", crypto.createHash("sha256").update(secret).digest(), iv);
  cipher.setAAD(Buffer.from(path));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}
export function openRecording(bytes, secret, path) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", crypto.createHash("sha256").update(secret).digest(), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(path)); decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
}
