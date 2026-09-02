import crypto from "node:crypto";

const COOKIE_NAME = "interview_lab_access";

function accessToken(secret) {
  return crypto.createHmac("sha256", secret).update("interview-lab-access-v1").digest("base64url");
}

function cookieValue(req, name) {
  for (const cookie of String(req.headers.cookie || "").split(";")) {
    const [key, ...value] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function interviewLabSecret() {
  return String(process.env.INTERVIEW_LAB_SECRET || "").trim();
}

export function hasInterviewLabAccess(req) {
  const secret = interviewLabSecret();
  return Boolean(secret) && safeEqual(cookieValue(req, COOKIE_NAME), accessToken(secret));
}

export function isValidInterviewLabKey(value) {
  const secret = interviewLabSecret();
  return Boolean(secret) && safeEqual(value, secret);
}

export function grantInterviewLabAccess(res) {
  const secret = interviewLabSecret();
  if (!secret) return false;
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(accessToken(secret))}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`);
  return true;
}
