// pages/api/ozan-join.js
// Called when Ozan taps "Enter Chat" from Discord
// Sets ozanActive=TRUE in sessions tab, stores initial history snapshot
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

async function readSessRow(token, sessionId) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SESS_TAB)}!A:G`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const rows = data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === sessionId) return { rowIndex: i + 1, row: rows[i] };
  }
  return null;
}

async function writeSessRow(token, sessionId, rowData, rowIndex) {
  if (rowIndex) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SESS_TAB)}!A${rowIndex}:G${rowIndex}?valueInputOption=USER_ENTERED`,
      { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [rowData] }) }
    );
  } else {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SESS_TAB)}!A1:append?valueInputOption=USER_ENTERED`,
      { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [rowData] }) }
    );
  }
}

export default async function handler(req, res) {
  const sessionId = req.query.s || req.body?.sessionId;
  const token = req.query.t || req.body?.t;

  if (!sessionId || !token) {
    return res.status(400).json({ error: "Missing session or token" });
  }
  if (!sessionId) {
    return res.status(400).json({ error: "Missing session" });
  }

  try {
    const accessToken = await getSheetsToken();
    if (!accessToken) return res.status(500).json({ error: "Auth failed" });

    const existing = await readSessRow(accessToken, sessionId);
    // No hard token validation — link is private (Discord only)
    // If session row doesn't exist yet (write may have failed), we'll create it now
    const currentRow = existing?.row || [];

    const updatedRow = [
      sessionId,
      currentRow[1] || "FALSE", // ozanAcked — preserve
      "TRUE",                    // ozanActive = Ozan is now IN the chat
      currentRow[3] || "[]",    // ozanMessages — preserve existing
      new Date().toISOString(), // lastUpdate
      currentRow[5] || "",      // ozanAckType — preserve
      currentRow[6] || token,   // inviteToken — preserve or set from URL
    ];

    await writeSessRow(accessToken, sessionId, updatedRow, existing?.rowIndex);
    console.log(`Ozan joined session ${sessionId} ✅`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("ozan-join error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
