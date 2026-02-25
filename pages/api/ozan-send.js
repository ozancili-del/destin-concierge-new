// pages/api/ozan-send.js
// Ozan types a message in /ozan page → stored in sessions tab → guest polls it
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
  if (req.method !== "POST") return res.status(405).end();

  const { sessionId, text, t: token, role = "ozan" } = req.body || {};

  // Guest messages don't require token — only Ozan messages do
  if (!sessionId) return res.status(400).json({ error: "Missing session" });
  if (role === "ozan" && !token) return res.status(401).json({ error: "Unauthorized" });
  if (!sessionId || !text) return res.status(400).json({ error: "Missing fields" });

  try {
    const token = await getSheetsToken();
    if (!token) return res.status(500).json({ error: "Auth failed" });

    // Read current row
    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SESS_TAB}!A:G`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const sheetData = await sheetRes.json();
    const rows = sheetData.values || [];
    let rowIndex = null;
    let currentRow = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === sessionId) { rowIndex = i + 1; currentRow = rows[i]; break; }
    }

    const existing = currentRow?.[3] ? JSON.parse(currentRow[3]) : [];
    const updated = [...existing, { role, text, ts: Date.now() }];
    const newRow = [
      sessionId,
      currentRow?.[1] || "FALSE",
      "TRUE",
      JSON.stringify(updated),
      new Date().toISOString(),
      currentRow?.[5] || "",
    ];

    if (rowIndex) {
      const wr = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SESS_TAB}!A${rowIndex}:G${rowIndex}?valueInputOption=USER_ENTERED`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [newRow] }) }
      );
      if (!wr?.ok) console.error("ozan-send PUT failed:", await wr?.text?.());
      else console.log("ozan-send PUT ok for", sessionId);
    } else {
      // No existing session row — create it (first message before ozan-join completes)
      const wr = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SESS_TAB}!A1:append?valueInputOption=USER_ENTERED`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [newRow] }) }
      );
      if (!wr?.ok) console.error("ozan-send APPEND failed:", await wr?.text?.());
      else console.log("ozan-send APPEND ok for", sessionId);
    }

    return res.status(200).json({ ok: true, messageCount: updated.length });
  } catch (err) {
    console.error("ozan-send error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
