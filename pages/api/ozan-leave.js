// pages/api/ozan-leave.js
// Ozan taps "Leave Chat" — sets ozanActive=FALSE, Destiny Blue resumes
import { createSign } from "crypto";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SESS_TAB = "sessions";

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
  if (req.method !== "POST") return res.status(405).end();
  const { sessionId, key } = req.body || {};
  if (key !== process.env.OZAN_KEY) return res.status(401).json({ error: "Unauthorized" });
  if (!sessionId) return res.status(400).json({ error: "Missing session" });

  try {
    const token = await getSheetsToken();
    if (!token) return res.status(500).json({ error: "Auth failed" });

    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SESS_TAB}!A:F`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await sheetRes.json();
    const rows = data.values || [];
    let rowIndex = null;
    let currentRow = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === sessionId) { rowIndex = i + 1; currentRow = rows[i]; break; }
    }

    if (!rowIndex) return res.status(404).json({ error: "Session not found" });

    const updatedRow = [
      sessionId,
      currentRow[1] || "FALSE", // preserve ozanAcked
      "FALSE",                   // ozanActive = FALSE
      currentRow[3] || "[]",    // preserve messages (Destiny needs history context)
      new Date().toISOString(),
      currentRow[5] || "",
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SESS_TAB}!A${rowIndex}:F${rowIndex}?valueInputOption=USER_ENTERED`,
      { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [updatedRow] }) }
    );

    console.log(`Ozan left session ${sessionId} ✅`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("ozan-leave error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
