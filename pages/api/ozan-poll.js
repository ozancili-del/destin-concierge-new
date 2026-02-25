// pages/api/ozan-poll.js
// Guest browser polls this every 3s to check if Ozan is active and get new messages
import { createSign } from "crypto";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SESS_TAB = "ozanchat";

async function getSheetsToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  const privateKey = rawKey.replace(/\\n/g, "\n").trim();
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const claim = Buffer.from(JSON.stringify({
    iss: email, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now,
  })).toString("base64url");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${sign.sign(privateKey, "base64url")}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token || null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  // Accept both GET (concierge) and POST (ozan.js) — read from whichever has data
  const params = req.method === "POST" ? (req.body || {}) : (req.query || {});
  const sessionId = params.s || params.sessionId;
  const since = params.since || "0";
  if (!sessionId) return res.status(400).json({ error: "Missing session" });

  try {
    const token = await getSheetsToken();
    if (!token) return res.status(200).json({ ozanActive: "FALSE", messages: [] });

    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SESS_TAB}!A:G`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!sheetRes.ok) return res.status(200).json({ ozanActive: "FALSE", messages: [] });

    const data = await sheetRes.json();
    const rows = data.values || [];
    let row = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === sessionId) { row = rows[i]; break; }
    }

    if (!row) return res.status(200).json({ ozanActive: "FALSE", messages: [] });

    const ozanActive = row[2] || "FALSE";
    const allMessages = row[3] ? JSON.parse(row[3]) : [];

    // Return only messages newer than `since` timestamp
    const sinceTs = parseInt(since, 10) || 0;
    const newMessages = allMessages.filter(m => m.ts > sinceTs);

    return res.status(200).json({ ozanActive, messages: newMessages });
  } catch (err) {
    console.error("ozan-poll error:", err.message);
    return res.status(200).json({ ozanActive: "FALSE", messages: [] });
  }
}
