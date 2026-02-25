// pages/api/inbox.js
// Destiny Blue - Phase 1B: OwnerRez webhook receiver + Discord approval flow
// Completely separate from chat.js — website chat is untouched

import OpenAI from "openai";
import { createSign } from "crypto";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Google Sheets auth + Ozan acknowledgment writer
// ─────────────────────────────────────────────────────────────────────────────
async function getSheetsToken(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const rawKey = process.env.GOOGLE_PRIVATE_KEY;
      if (!email || !rawKey) return null;
      const privateKey = rawKey.replace(/\\n/g, "\n").replace(/\n/g, "\n").trim();
      const { createSign } = await import("crypto");
      const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
      const now = Math.floor(Date.now() / 1000);
      const claim = Buffer.from(JSON.stringify({
        iss: email, scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now,
      })).toString("base64url");
      const sign = createSign("RSA-SHA256");
      sign.update(`${header}.${claim}`);
      const signature = sign.sign(privateKey, "base64url");
      const jwt = `${header}.${claim}.${signature}`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
      });
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) return tokenData.access_token;
      throw new Error("No access token in response");
    } catch (err) {
      console.error(`getSheetsToken attempt ${attempt} failed:`, err.message);
      if (attempt < retries) await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

// ─── sessions tab helper ─────────────────────────────────────────────────────
const SESS_TAB = "sessions";
async function readSessState(sessionId) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sessionId || !sheetId) return null;
    const token = await getSheetsToken();
    if (!token) return null;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SESS_TAB}!A:F`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rows = data.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === sessionId) {
        return { rowIndex: i + 1, ozanAcked: rows[i][1] === "TRUE", ozanActive: rows[i][2] || "FALSE",
          ozanMessages: rows[i][3] ? JSON.parse(rows[i][3]) : [], ozanAckType: rows[i][5] || null };
      }
    }
    return null;
  } catch(e) { console.error("readSessState:", e.message); return null; }
}
async function writeSessState(sessionId, updates) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sessionId || !sheetId) return;
    const token = await getSheetsToken();
    if (!token) return;
    const existing = await readSessState(sessionId);
    const merged = {
      ozanAcked: existing?.ozanAcked ?? false,
      ozanActive: existing?.ozanActive ?? "FALSE",
      ozanMessages: existing?.ozanMessages ?? [],
      ozanAckType: existing?.ozanAckType ?? null,
      ...updates,
    };
    const row = [sessionId, merged.ozanAcked ? "TRUE" : "FALSE", merged.ozanActive,
      JSON.stringify(merged.ozanMessages), new Date().toISOString(), merged.ozanAckType || ""];
    if (existing?.rowIndex) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SESS_TAB}!A${existing.rowIndex}:F${existing.rowIndex}?valueInputOption=USER_ENTERED`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [row] }) }
      );
    } else {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SESS_TAB}!A1:append?valueInputOption=USER_ENTERED`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [row] }) }
      );
    }
  } catch(e) { console.error("writeSessState:", e.message); }
}


async function writeOzanAck(sessionId, ackType = "ozanack") {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) return;
    const accessToken = await getSheetsToken();
    if (!accessToken) return;
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const ackLabel = {
      "ozanack": "OZAN_ACK",
      "maint_onsite": "MAINT_ONSITE",
      "maint_ozan": "MAINT_OZAN",
      "maint_emergency": "MAINT_EMERGENCY",
    }[ackType] || "OZAN_ACK";
    const row = [timestamp, sessionId, "", "", "", "", "", ackLabel];
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    });
    console.log(`Ack written [${ackLabel}] for session ${sessionId} ✅`);

    // Also write to sessions tab as authoritative ack source — fixes unreliable ack detection
    await writeSessState(sessionId, { ozanAcked: true, ozanAckType: ackLabel });
  } catch (err) {
    console.error("writeOzanAck error:", err.message);
  }
}

const OWNERREZ_USER = "destindreamcondo@gmail.com";
const UNIT_707_PROPERTY_ID = "293722";
const UNIT_1006_PROPERTY_ID = "410894";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// ─────────────────────────────────────────────────────────────────────────────
// Fetch conversation history from OwnerRez for a specific booking/inquiry
// ─────────────────────────────────────────────────────────────────────────────
async function fetchConversationHistory(bookingId) {
  try {
    const token = process.env.OWNERREZ_API_TOKEN;
    const credentials = Buffer.from(`${OWNERREZ_USER}:${token}`).toString("base64");

    const url = `https://api.ownerrez.com/v2/messages?booking_id=${bookingId}&limit=20`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "DestinyBlue/1.0",
      },
    });

    if (!response.ok) {
      console.error("OwnerRez messages fetch error:", response.status);
      return [];
    }

    const data = await response.json();
    const messages = data?.items || [];

    // Return last 10 messages formatted for context
    return messages.slice(-10).map(m => ({
      role: m.from_guest ? "guest" : "host",
      content: m.body || m.text || "",
      date: m.created_at || "",
    }));
  } catch (err) {
    console.error("fetchConversationHistory error:", err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch booking details from OwnerRez
// ─────────────────────────────────────────────────────────────────────────────
async function fetchBookingDetails(bookingId) {
  try {
    const token = process.env.OWNERREZ_API_TOKEN;
    const credentials = Buffer.from(`${OWNERREZ_USER}:${token}`).toString("base64");

    const url = `https://api.ownerrez.com/v2/bookings/${bookingId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "DestinyBlue/1.0",
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("fetchBookingDetails error:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Send message to Discord with Confirm/Edit buttons
// ─────────────────────────────────────────────────────────────────────────────
async function sendToDiscord(payload) {
  try {
    const { guestName, guestMessage, draftReply, bookingId, unit, checkIn, checkOut, messageId } = payload;

    const discordMessage = {
      content: `🏖️ **New Guest Message — Action Required**`,
      embeds: [{
        color: 0x1E90FF,
        fields: [
          { name: "👤 Guest", value: guestName || "Unknown", inline: true },
          { name: "🏠 Unit", value: unit || "Unknown", inline: true },
          { name: "📅 Check-in", value: checkIn || "TBD", inline: true },
          { name: "📅 Check-out", value: checkOut || "TBD", inline: true },
          { name: "📨 Guest Message", value: guestMessage?.substring(0, 500) || "No message" },
          { name: "💬 Destiny's Draft Reply", value: draftReply?.substring(0, 1000) || "No draft" },
        ],
        footer: { text: `Booking ID: ${bookingId || "N/A"} | Message ID: ${messageId || "N/A"}` },
        timestamp: new Date().toISOString(),
      }],
      components: [{
        type: 1,
        components: [
          {
            type: 2,
            style: 3, // Green
            label: "✅ Send This Reply",
            custom_id: `confirm_${bookingId}_${messageId}`,
          },
          {
            type: 2,
            style: 2, // Grey
            label: "✏️ Edit Before Sending",
            custom_id: `edit_${bookingId}_${messageId}`,
          },
          {
            type: 2,
            style: 4, // Red
            label: "🚫 Skip / Handle Manually",
            custom_id: `skip_${bookingId}_${messageId}`,
          },
        ],
      }],
    };

    const response = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(discordMessage),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Discord send error:", response.status, err);
      return false;
    }

    const sent = await response.json();
    console.log("Discord message sent:", sent.id);
    return sent.id;
  } catch (err) {
    console.error("sendToDiscord error:", err.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Send reply back to guest via OwnerRez
// ─────────────────────────────────────────────────────────────────────────────
async function sendReplyViaOwnerRez(bookingId, replyText) {
  try {
    const token = process.env.OWNERREZ_API_TOKEN;
    const credentials = Buffer.from(`${OWNERREZ_USER}:${token}`).toString("base64");

    const url = `https://api.ownerrez.com/v2/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "DestinyBlue/1.0",
      },
      body: JSON.stringify({
        booking_id: bookingId,
        body: replyText,
        from_guest: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OwnerRez send reply error:", response.status, err);
      return false;
    }

    console.log("Reply sent via OwnerRez ✅");
    return true;
  } catch (err) {
    console.error("sendReplyViaOwnerRez error:", err.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft reply using GPT with booking context
// ─────────────────────────────────────────────────────────────────────────────
async function generateDraftReply({ guestName, guestMessage, unit, checkIn, checkOut, adults, children, conversationHistory }) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  const historyText = conversationHistory.length > 0
    ? conversationHistory.map(m => `${m.role === "guest" ? "Guest" : "Host"}: ${m.content}`).join("\n")
    : "No previous messages.";

  const unitName = unit === UNIT_707_PROPERTY_ID ? "Unit 707" : unit === UNIT_1006_PROPERTY_ID ? "Unit 1006" : "the unit";

  const SYSTEM_PROMPT = `You are Destiny Blue, a warm and professional AI assistant helping manage guest communications for Destin Condo Getaways at Pelican Beach Resort in Destin, Florida.

Today is ${today}.

You are drafting a reply to a CONFIRMED GUEST (not a prospect). Tone shift:
- Less sales, more hospitality and service
- Warm, personal, use guest's first name
- Concise and helpful — guests don't want long messages
- Never mention booking platforms by name
- Never guess — if you don't know something, say Ozan will confirm

BOOKING DETAILS:
- Guest name: ${guestName || "Guest"}
- Unit: ${unitName}
- Check-in: ${checkIn || "TBD"}
- Check-out: ${checkOut || "TBD"}
- Adults: ${adults || "?"}, Children: ${children || "0"}

CONVERSATION HISTORY:
${historyText}

PROPERTY KNOWLEDGE:
- Check-in: 4:00 PM CST — PIN sent 7 days and 1 day before. Go directly to unit, no lobby check-in needed.
- Check-out: BY 10:00 AM CST — guests can leave any time before 10 AM
- Stop at front desk for parking pass and pool bracelets (March-October)
- Free parking up to 2 cars
- Max 6 guests — fire code, no exceptions
- Pets: zero exceptions, HOA rule
- Smoking: not allowed in unit or balcony. Two areas: next to Tiki Bar, north entrance of garage left side. $250 violation charge.
- WiFi: 250+ Mbps, Eero 6
- Beach chairs + umbrella included (behind LDV rental section)
- LDV Beach service: 9AM-5PM March 1-Oct 31, $40/day for 2 umbrellas+chair
- 3 pools: indoor heated (year-round) + 2 outdoor + kiddie pool
- Sauna, steam room, fitness center, tennis + pickleball courts
- Washer/dryer on every floor — quarters and credit card
- 24/7 front desk: (850) 654-1425
- Ozan: (972) 357-4262 | ozan@destincondogetaways.com
- Code DESTINY = 10% off (only mention if relevant)
- PIN sent 7 days before. Check spam if not received.
- 2 EV chargers on site (J1772, paid)
- Big Kahuna's water park across street
- Walking distance: Target, Walgreens, McDonald's ~1 mile

RULES FOR THIS DRAFT:
- Keep reply under 150 words
- Use guest's first name once at start
- Never use markdown bold or bullet points — plain conversational text only
- Never invent policies — refer to Ozan if unsure
- End warmly but not with "If you have any other questions just let me know"
- Never put a period immediately after a URL`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Guest message: "${guestMessage}"` },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || "I'll get back to you shortly!";
}

// ─────────────────────────────────────────────────────────────────────────────
// Store draft reply temporarily (using a simple in-memory store)
// In production this should be a KV store or database
// ─────────────────────────────────────────────────────────────────────────────
const draftStore = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {

  // ── DISCORD INTERACTION HANDLER (button clicks) ──────────────────────────
  const isDiscordInteraction = req.method === "POST" && req.headers["x-signature-ed25519"];
  if (isDiscordInteraction) {
    // Verify Discord signature (required or Discord rejects the endpoint)
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (publicKey) {
      try {
        const { webcrypto } = await import("crypto");
        const encoder = new TextEncoder();
        const rawBody = JSON.stringify(req.body);
        const cryptoKey = await webcrypto.subtle.importKey(
          "raw", Buffer.from(publicKey, "hex"),
          { name: "Ed25519" }, false, ["verify"]
        );
        const isValid = await webcrypto.subtle.verify(
          "Ed25519", cryptoKey,
          Buffer.from(signature, "hex"),
          encoder.encode(timestamp + rawBody)
        );
        if (!isValid) {
          console.error("Discord signature invalid");
          return res.status(401).end("invalid request signature");
        }
      } catch (err) {
        console.error("Signature verify error:", err.message);
        return res.status(401).end("verification error");
      }
    }
    const interaction = req.body;

    if (interaction.type === 1) {
      // Ping verification
      return res.status(200).json({ type: 1 });
    }

    if (interaction.type === 3) {
      // Button click
      const customId = interaction.data?.custom_id || "";
      const [action, bookingId, messageId] = customId.split("_");
      // Maintenance button prefix detection (custom_ids use multi-part prefixes)
      const maintAction = customId.startsWith("maint_onsite_") ? "maint_onsite"
        : customId.startsWith("maint_ozan_") ? "maint_ozan"
        : customId.startsWith("maint_emergency_") ? "maint_emergency"
        : null;
      const draftKey = `${bookingId}_${messageId}`;
      const draft = draftStore.get(draftKey);

      if (action === "confirm" && draft) {
        await sendReplyViaOwnerRez(bookingId, draft.reply);
        draftStore.delete(draftKey);
        return res.status(200).json({
          type: 4,
          data: { content: `✅ Reply sent to ${draft.guestName}!`, flags: 64 },
        });
      }

      if (action === "edit") {
        return res.status(200).json({
          type: 4,
          data: {
            content: `✏️ **Edit mode** — reply with your custom message and I'll send it.\nDraft was:\n\n${draft?.reply || "N/A"}`,
            flags: 64,
          },
        });
      }

      if (action === "skip") {
        draftStore.delete(draftKey);
        return res.status(200).json({
          type: 4,
          data: { content: `🚫 Skipped — handle manually in OwnerRez.`, flags: 64 },
        });
      }

      // 🫡 Ozan acknowledged emergency/lockout alert
      if (action === "ozanack") {
        const sessionId = customId.replace("ozanack_", "");
        res.status(200).json({
          type: 4,
          data: { content: `🫡 Got it — Destiny Blue will let the guest know you're on it!`, flags: 64 },
        });
        await writeOzanAck(sessionId, "ozanack");
        return;
      }

      // 🔧 Maintenance — Onsite Ticket opened
      if (maintAction === "maint_onsite") {
        const sessionId = customId.replace("maint_onsite_", "");
        res.status(200).json({
          type: 4,
          data: { content: `🔧 Onsite ticket opened — Destiny Blue will notify the guest.`, flags: 64 },
        });
        await writeOzanAck(sessionId, "maint_onsite");
        return;
      }

      // 👨‍🔧 Maintenance — Ozan handling directly
      if (maintAction === "maint_ozan") {
        const sessionId = customId.replace("maint_ozan_", "");
        res.status(200).json({
          type: 4,
          data: { content: `👨‍🔧 Got it — Destiny Blue will let the guest know you're handling it.`, flags: 64 },
        });
        await writeOzanAck(sessionId, "maint_ozan");
        return;
      }

      // 🚨 Maintenance — Emergency, Ozan calling
      if (maintAction === "maint_emergency") {
        const sessionId = customId.replace("maint_emergency_", "");
        res.status(200).json({
          type: 4,
          data: { content: `🚨 Emergency escalated — Destiny Blue will tell the guest you're calling them now.`, flags: 64 },
        });
        await writeOzanAck(sessionId, "maint_emergency");
        return;
      }
    }

    return res.status(200).json({ type: 1 });
  }

  // ── OWNERREZ WEBHOOK HANDLER ─────────────────────────────────────────────
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body;
    console.log("OwnerRez webhook received:", JSON.stringify(payload).substring(0, 500));

    // Extract the event type and data
    const eventType = payload?.type || payload?.event_type || "";
    const data = payload?.data || payload || {};

    // We care about messages/inquiries — ignore property/quote/guest updates
    const isMessageEvent = eventType.toLowerCase().includes("message") ||
                           eventType.toLowerCase().includes("inquiry") ||
                           eventType.toLowerCase().includes("booking");

    if (!isMessageEvent) {
      console.log("Non-message event, ignoring:", eventType);
      return res.status(200).json({ ok: true, ignored: true });
    }

    // Extract key fields from webhook payload
    const bookingId = data?.booking_id || data?.id || data?.booking?.id || "";
    const guestMessage = data?.message?.body || data?.body || data?.message || data?.inquiry?.message || "";
    const guestName = data?.guest?.name || data?.booking?.guest_name || data?.name || "Guest";
    const messageId = data?.message?.id || data?.id || Date.now().toString();

    // Skip if no message content
    if (!guestMessage) {
      console.log("No message content in webhook, ignoring");
      return res.status(200).json({ ok: true, ignored: true });
    }

    // Skip automated/system messages
    if (guestMessage.toLowerCase().includes("booking confirmed") ||
        guestMessage.toLowerCase().includes("automatically generated")) {
      console.log("System message, ignoring");
      return res.status(200).json({ ok: true, ignored: true });
    }

    console.log(`Processing message from ${guestName}: "${guestMessage.substring(0, 100)}"`);

    // Fetch booking details and conversation history in parallel
    const [booking, history] = await Promise.all([
      bookingId ? fetchBookingDetails(bookingId) : Promise.resolve(null),
      bookingId ? fetchConversationHistory(bookingId) : Promise.resolve([]),
    ]);

    const unit = booking?.property_id || data?.property_id || "";
    const checkIn = booking?.arrival || booking?.check_in || data?.arrival || "";
    const checkOut = booking?.departure || booking?.check_out || data?.departure || "";
    const adults = booking?.adults || data?.adults || "2";
    const children = booking?.children || data?.children || "0";

    // Draft the reply
    const draftReply = await generateDraftReply({
      guestName,
      guestMessage,
      unit,
      checkIn,
      checkOut,
      adults,
      children,
      conversationHistory: history,
    });

    // Store draft for when Ozan clicks confirm
    const draftKey = `${bookingId}_${messageId}`;
    draftStore.set(draftKey, {
      reply: draftReply,
      guestName,
      bookingId,
      timestamp: Date.now(),
    });

    // Clean up old drafts (older than 24 hours)
    for (const [key, value] of draftStore.entries()) {
      if (Date.now() - value.timestamp > 86400000) draftStore.delete(key);
    }

    // Send to Discord for Ozan's approval
    const discordMessageId = await sendToDiscord({
      guestName,
      guestMessage,
      draftReply,
      bookingId,
      unit: unit === UNIT_707_PROPERTY_ID ? "Unit 707" : unit === UNIT_1006_PROPERTY_ID ? "Unit 1006" : unit,
      checkIn,
      checkOut,
      messageId,
    });

    if (discordMessageId) {
      console.log("Draft sent to Discord for approval ✅");
    } else {
      console.error("Failed to send to Discord ❌");
    }

    return res.status(200).json({ ok: true, drafted: true });

  } catch (err) {
    console.error("Inbox handler error:", err);
    return res.status(200).json({ ok: true, error: err.message });
    // Always return 200 to OwnerRez so it doesn't retry
  }
}

// Required: disable body parser so Discord signature verification works with raw body
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
