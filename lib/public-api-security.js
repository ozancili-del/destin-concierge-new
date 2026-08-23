import crypto from "node:crypto";

const RATE_LIMIT_STORE = globalThis.__dcgPublicApiRateLimits || new Map();
globalThis.__dcgPublicApiRateLimits = RATE_LIMIT_STORE;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "unknown";
}

export function enforceRateLimit(req, res, { scope, limit, windowMs }) {
  const now = Date.now();
  const key = `${scope}:${clientIp(req)}`;
  const current = RATE_LIMIT_STORE.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;
  bucket.count += 1;
  RATE_LIMIT_STORE.set(key, bucket);

  res.setHeader("RateLimit-Limit", String(limit));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
  res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
  if (bucket.count <= limit) return true;

  res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
  res.status(429).json({ error: "Too many requests. Please wait and try again." });
  return false;
}

function requestHost(req) {
  return String(req.headers["x-forwarded-host"] || req.headers.host || "").split(":")[0].toLowerCase();
}

export function allowSameOriginRequest(req, res, { methods = ["POST"] } = {}) {
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", [...methods, "OPTIONS"].join(", "));
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");

  const origin = String(req.headers.origin || "");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.protocol !== "https:" && originUrl.hostname !== "localhost") {
        res.status(403).json({ error: "Origin not allowed" });
        return false;
      }
      if (originUrl.hostname.toLowerCase() !== requestHost(req)) {
        res.status(403).json({ error: "Origin not allowed" });
        return false;
      }
      res.setHeader("Access-Control-Allow-Origin", origin);
    } catch {
      res.status(403).json({ error: "Origin not allowed" });
      return false;
    }
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }
  if (!methods.includes(req.method)) {
    res.setHeader("Allow", methods.join(", "));
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  return true;
}

export function enforceJsonSize(req, res, maxBytes) {
  const declared = Number(req.headers["content-length"] || 0);
  let measured = 0;
  try {
    measured = Buffer.byteLength(JSON.stringify(req.body || {}), "utf8");
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return false;
  }
  if (declared > maxBytes || measured > maxBytes) {
    res.status(413).json({ error: "Request is too large" });
    return false;
  }
  return true;
}

export function cleanText(value, maxLength, { multiline = false } = {}) {
  if (typeof value !== "string") return "";
  const normalized = value.normalize("NFKC").replace(/\u0000/g, "");
  const whitespace = multiline
    ? normalized.replace(/\r\n?/g, "\n").replace(/[\t\f\v]+/g, " ")
    : normalized.replace(/\s+/g, " ");
  return whitespace.trim().slice(0, maxLength);
}

export function validEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isBotTrapFilled(body) {
  return Boolean(cleanText(body?.website || body?.company || body?._hp || "", 200));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function signPayload(payload, secret) {
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(stableJson(payload)).digest("base64url");
}

export function verifyPayloadSignature(payload, signature, secret) {
  if (!signature || !secret) return false;
  const expected = signPayload(payload, secret);
  const suppliedBuffer = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(String(expected));
  return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export function parseIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00-05:00`);
  if (Number.isNaN(date.getTime())) return null;
  const [year, month, day] = value.split("-").map(Number);
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
    ? date
    : null;
}

export function safeExternalHttpUrl(value, { allowedHosts = [] } = {}) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:") return "";
    if (allowedHosts.length && !allowedHosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return "";
    return url.toString();
  } catch {
    return "";
  }
}
