// pages/api/chat.js
// Destiny Blue - Real AI Concierge powered by OpenAI + OwnerRez live availability

import OpenAI from "openai";
import { createSign } from "crypto";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OWNERREZ_USER = "destindreamcondo@gmail.com";
const UNIT_707_PROPERTY_ID = "293722";
const UNIT_1006_PROPERTY_ID = "410894";

// ─────────────────────────────────────────────────────────────────────────────
// Blog URL map - all slugs confirmed
// ─────────────────────────────────────────────────────────────────────────────
const BLOG_URLS = {
  restaurants:  "https://www.destincondogetaways.com/blog/best-restaurants-destin",
  beaches:      "https://www.destincondogetaways.com/blog/best-beaches-destin",
  activities:   "https://www.destincondogetaways.com/blog/destinocen",
  weather:      "https://www.destincondogetaways.com/blog/destinweather",
  events:       "https://www.destincondogetaways.com/blog/destin-events-2026",
  airport:      "https://www.destincondogetaways.com/blog/destinairport",
  romance:      "https://www.destincondogetaways.com/blog/destinromance",
  car:          "https://www.destincondogetaways.com/blog/destinscar",
  spa:          "https://www.destincondogetaways.com/blog/destinspa",
  nightlife:    "https://www.destincondogetaways.com/blog/destinnights",
  essentials:   "https://www.destincondogetaways.com/blog/destinessentials",
  kids:         "https://www.destincondogetaways.com/blog/destinkids",
  supermarkets: "https://www.destincondogetaways.com/blog/destinsupermarkets",
  history:      "https://www.destincondogetaways.com/blog/destindiversehistory",
  explore:      "https://www.destincondogetaways.com/blog/destinexplore",
};

// ─────────────────────────────────────────────────────────────────────────────
// Send emergency Discord alert to Ozan
// ─────────────────────────────────────────────────────────────────────────────
async function sendEmergencyDiscord(guestMessage, sessionId, reason = "Guest needs urgent assistance") {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!token || !channelId) return;

    const msg = {
      content: `🚨 **ALERT — CHECK YOUR PHONE OZAN** 🚨

${reason}

**Guest message:** "${guestMessage.substring(0, 300)}"
**Session:** ${sessionId || "unknown"}

⚡ Please call or text the guest immediately!`,
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 3,
          label: "🫡 I'm on it",
          custom_id: `ozanack_${sessionId || "unknown"}`,
        }],
      }],
    };

    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(msg),
    });
    console.log("Emergency Discord alert sent ✅");
  } catch (err) {
    console.error("Emergency Discord error:", err.message);
  }
}

function detectBlogTopic(text) {
  const t = text.toLowerCase();
  // Weather MUST come first — "weather" contains "eat" which would match restaurants
  if (t.match(/weather|forecast|temperature|rain|season|when to visit|best time|how hot|how cold|highs|lows|high and low/)) return "weather";
  if (t.match(/restaurant|eat|food|dinner|lunch|breakfast|dining|seafood|oyster|where to eat/)) return "restaurants";
  if (t.match(/beach|sand|swim|ocean|gulf|shore/)) return "beaches";
  if (t.match(/activit|thing to do|fun|tour|dolphin|parasail|snorkel|kayak|boat|fishing|water sport|rainy|indoor fun/)) return "activities";
  if (t.match(/event|festival|concert|firework|show|calendar/)) return "events";
  if (t.match(/airport|fly|flight|drive|get there|closest airport|transportation/)) return "airport";
  if (t.match(/romantic|romance|couple|honeymoon|anniversary|date night/)) return "romance";
  if (t.match(/rent a car|car rental|enterprise|hertz|avis/)) return "car";
  if (t.match(/spa|massage|facial|relax|wellness/)) return "spa";
  if (t.match(/nightlife|night out|club|live music|drinks/)) return "nightlife";
  if (t.match(/essentials|packing|what to bring|checklist/)) return "essentials";
  if (t.match(/kids|children|family|toddler|playground|child.friendly/)) return "kids";
  if (t.match(/grocery|supermarket|walmart|publix|winn.dixie|target|food store/)) return "supermarkets";
  if (t.match(/history|culture|museum|heritage|historic/)) return "history";
  if (t.match(/explore|sightseeing|attractions|must see|hidden gem/)) return "explore";
  if (t.match(/photo|picture|image|virtual tour|look like|show me|what does.*look|gallery|interior|inside the unit|see the unit/)) return "photos";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch real Destin weather from Google Weather API
// ─────────────────────────────────────────────────────────────────────────────
async function fetchDestinWeather() {
  try {
    const apiKey = process.env.GOOGLE_WEATHER_API_KEY;
    if (!apiKey) { console.error("GOOGLE_WEATHER_API_KEY not set"); return null; }
    const url = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${apiKey}&location.latitude=30.3935&location.longitude=-86.4958&days=7&languageCode=en-US&unitsSystem=IMPERIAL`;
    console.log("Calling Google Weather API...");
    const res = await fetch(url);
    if (!res.ok) { console.error("Google Weather error:", res.status, await res.text()); return null; }
    const data = await res.json();
    const days = data.forecastDays || [];
    if (!days.length) return null;
    const forecast = days.map(day => ({
      date: day.date ? `${day.date.year}-${String(day.date.month).padStart(2,"0")}-${String(day.date.day).padStart(2,"0")}` : "",
      hi:   Math.round(day.maxTemperature?.degrees ?? 0),
      lo:   Math.round(day.minTemperature?.degrees ?? 0),
      rain: Math.round((day.precipitationProbability ?? 0) * 100),
      desc: day.daytimeForecast?.weatherCondition?.description?.text || day.condition?.description?.text || "mixed",
    }));
    console.log("Google Weather success:", forecast.length, "days");
    console.log("Google Weather data:", JSON.stringify(forecast));
    return forecast;
  } catch (err) {
    console.error("Google Weather fetch error:", err.message);
    return null;
  }
}

async function fetchBlogContent(topic) {
  try {
    const url = BLOG_URLS[topic];
    if (!url) return null;
    const response = await fetch(url, { headers: { "User-Agent": "DestinyBlue/1.0" } });
    if (!response.ok) return null;
    const html = await response.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 1500);
    return { content: text, url };
  } catch (err) {
    console.error("Blog fetch error:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 DETECTORS — these run in code, injected at top of prompt
// ─────────────────────────────────────────────────────────────────────────────

// Detect discount / deal / price negotiation intent
function detectDiscountIntent(text) {
  return /discount|deal|better price|cheaper|price match|waive|waiver|military|repeat guest|long.?stay|my friend got|friend.*discount|beat.*price|lower.*price|negotiate|special rate|promo|coupon|cleaning fee.*waive|can you do better|best you can do|last.?minute.*deal|another condo|other condo|competitor.*cheaper|why should i choose|why choose yours|why book with you/i.test(text);
}

// Detect availability / booking intent (tighter — only real booking signals)
function detectAvailabilityIntent(text) {
  return /avail|availability|open dates|book|booking|reserve|reservation|check.?in|check.?out|when can i|stay.*when|dates.*stay|price|pricing|cost|how much|rate|rates|per night|nightly/i.test(text);
}

// Detect unit comparison questions that need neutral handling
function detectUnitComparison(text) {
  return /which.*better|better.*unit|recommend.*unit|personally recommend|which.*prefer|707.*vs.*1006|1006.*vs.*707|which one|quieter|more sunlight|cheaper unit|best.*view|difference between/i.test(text);
}

// ─────────────────────────────────────────────────────────────────────────────
// Detect escalation/emergency/threat scenarios
// ─────────────────────────────────────────────────────────────────────────────
function detectEscalation(text) {
  return /dying|passed away|funeral|death|asthma|medical|emergency|storm|hurricane|power outage|displaced|sick child|hospital|review|1.star|one star|sue|lawyer|legal|lawsuit|going to post|tell everyone|already checked in|friends just arrived|sleeping in car|floor|waiver|sign anything|please don't turn|breaking point|at my limit/i.test(text);
}

function detectExcessGuests(text) {
  return /7 (people|guests|of us)|8 (people|guests|of us)|9 (people|guests|of us)|ten people|seven people|eight people|won't count|doesn't count|don't count|sleeping in car|sleep on floor|won't use|won't need/i.test(text);
}

// Detect locked out / door code emergency
function detectLockedOut(text) {
  return /can't get in|cant get in|locked out|pin.*not work|pin.*wrong|wrong.*pin|code.*not work|code.*wrong|wrong.*code|won't open|wont open|door.*won't|door.*not open|can't enter|cant enter|stuck outside|standing outside|waiting outside|deleted.*email|lost.*code|forgot.*code.*can't|cant.*get.*in|can't find.*code|cant find.*code|can't find.*pin|cant find.*pin|can't find.*door|cant find.*door|where.*door code|where.*pin code|don't have.*code|dont have.*code|no.*door code|missing.*code|need.*door code|need.*pin|what.*door code|what.*pin/i.test(text);
}

// ─────────────────────────────────────────────────────────────────────────────
// Check availability using OwnerRez v2 bookings API
// ─────────────────────────────────────────────────────────────────────────────
async function checkAvailability(propertyId, arrival, departure) {
  try {
    const token = process.env.OWNERREZ_API_TOKEN;
    const credentials = Buffer.from(`${OWNERREZ_USER}:${token}`).toString("base64");

    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    const sinceUtc = since.toISOString();
    const url = `https://api.ownerrez.com/v2/bookings?property_ids=${propertyId}&since_utc=${sinceUtc}&status=active`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "DestinyBlue/1.0",
      },
    });

    if (!response.ok) {
      console.error(`OwnerRez API error: ${response.status} for property ${propertyId}`);
      return null;
    }

    const data = await response.json();
    const bookings = data?.items || data?.bookings || [];
    const requestArrival = new Date(arrival);
    const requestDeparture = new Date(departure);

    const hasConflict = bookings.some((booking) => {
      const bookingArrival = new Date(booking.arrival || booking.check_in || booking.arrivalDate);
      const bookingDeparture = new Date(booking.departure || booking.check_out || booking.departureDate);
      return bookingArrival < requestDeparture && bookingDeparture > requestArrival;
    });

    return !hasConflict;
  } catch (err) {
    console.error("OwnerRez fetch error:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract dates from message
// ─────────────────────────────────────────────────────────────────────────────
function extractDates(text) {
  const year = new Date().getFullYear();
  const t = text.toLowerCase();

  const isoPattern = /(\d{4}-\d{2}-\d{2})/g;
  const isoMatches = text.match(isoPattern);
  if (isoMatches && isoMatches.length >= 2) {
    return { arrival: isoMatches[0], departure: isoMatches[1] };
  }

  // Slash format: 7/10-7/17 or 7/10 - 7/17
  const slashPattern = /(\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})/;
  const slashMatch = text.match(slashPattern);
  if (slashMatch) {
    return {
      arrival:   `${year}-${slashMatch[1].padStart(2,"0")}-${slashMatch[2].padStart(2,"0")}`,
      departure: `${year}-${slashMatch[3].padStart(2,"0")}-${slashMatch[4].padStart(2,"0")}`,
    };
  }

  const months = {
    january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
    july:"07",august:"08",september:"09",october:"10",november:"11",december:"12"
  };
  const mn = Object.keys(months).join("|");

  const sameMonthRange = new RegExp("(" + mn + ")\\s+(\\d{1,2})\\s*[-\u2013]\\s*(\\d{1,2})", "i");
  const sameMatch = text.match(sameMonthRange);
  if (sameMatch) {
    const month = months[sameMatch[1].toLowerCase()];
    return {
      arrival: `${year}-${month}-${sameMatch[2].padStart(2,"0")}`,
      departure: `${year}-${month}-${sameMatch[3].padStart(2,"0")}`
    };
  }

  // "1-7 march" format (day range BEFORE month name)
  const drMatch = t.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i);
  if (drMatch) {
    const month = months[drMatch[3].toLowerCase()];
    return {
      arrival:   `${year}-${month}-${drMatch[1].padStart(2,"0")}`,
      departure: `${year}-${month}-${drMatch[2].padStart(2,"0")}`,
    };
  }

  // "march 1-7" format (month THEN day range)
  const mrMatch = t.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})/i);
  if (mrMatch) {
    const month = months[mrMatch[1].toLowerCase()];
    return {
      arrival:   `${year}-${month}-${mrMatch[2].padStart(2,"0")}`,
      departure: `${year}-${month}-${mrMatch[3].padStart(2,"0")}`,
    };
  }

  const crossPattern = new RegExp("(" + mn + ")\\s+(\\d{1,2})(?:\\s+(?:to|and|through|-)\\s+(?:(" + mn + ")\\s+)?(\\d{1,2}))", "i");
  const crossMatch = text.match(crossPattern);
  if (crossMatch) {
    const month1 = months[crossMatch[1].toLowerCase()];
    const month2 = crossMatch[3] ? months[crossMatch[3].toLowerCase()] : month1;
    return {
      arrival: `${year}-${month1}-${crossMatch[2].padStart(2,"0")}`,
      departure: `${year}-${month2}-${crossMatch[4].padStart(2,"0")}`
    };
  }

  const monthDayPattern = new RegExp("(" + mn + ")\\s+(\\d{1,2})", "gi");
  const allMatches = [...text.matchAll(monthDayPattern)];
  if (allMatches.length >= 2) {
    const toISO = (m) => `${year}-${months[m[1].toLowerCase()]}-${m[2].padStart(2,"0")}`;
    return { arrival: toISO(allMatches[0]), departure: toISO(allMatches[1]) };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build booking link
// ─────────────────────────────────────────────────────────────────────────────
function buildLink(unit, arrival, departure, adults, children) {
  const base = unit === "707"
    ? "https://www.destincondogetaways.com/pelican-beach-resort-unit-707-orp5b47b5ax"
    : "https://www.destincondogetaways.com/pelican-beach-resort-unit-1006-orp5b6450ex";
  const totalGuests = parseInt(adults) + parseInt(children);
  return `${base}?or_arrival=${arrival}&or_departure=${departure}&or_adults=${adults}&or_children=${children}&or_guests=${totalGuests}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Log conversation to Google Sheets
// ─────────────────────────────────────────────────────────────────────────────

async function getSheetsToken(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const rawKey = process.env.GOOGLE_PRIVATE_KEY;
      if (!email || !rawKey) return null;
      const privateKey = rawKey
        .replace(/\\n/g, "\n")  // double-escaped newlines
        .replace(/\n/g, "\n")    // literal \n strings
        .trim();
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

async function checkOzanAcknowledged(sessionId) {
  try {
    if (!sessionId) return false;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) return false;
    const accessToken = await getSheetsToken();
    if (!accessToken) return false;
    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:H`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!sheetRes.ok) return false;
    const data = await sheetRes.json();
    const rows = data.values || [];
    const acked = rows.some(row => row[1] === sessionId && row[7] === "OZAN_ACK");
    if (acked) console.log(`Ozan acknowledged session ${sessionId} ✅`);
    return acked;
  } catch (err) {
    console.error("checkOzanAcknowledged error:", err.message);
    return false;
  }
}

async function fetchSessionHistory(sessionId) {
  try {
    if (!sessionId) return [];
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) return [];
    const accessToken = await getSheetsToken();
    if (!accessToken) return [];
    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:F`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!sheetRes.ok) return [];
    const data = await sheetRes.json();
    const rows = data.values || [];
    // Format: [timestamp, sessionId, guestMessage, destinyReply, dates, status]
    const history = rows
      .filter(row => row[1] === sessionId && row[2] && row[3])
      .slice(-15)
      .map(row => [
        { role: "user", content: row[2] },
        { role: "assistant", content: row[3] },
      ])
      .flat();
    console.log(`Session ${sessionId}: loaded ${history.length / 2} previous exchanges`);
    return history;
  } catch (err) {
    console.error("fetchSessionHistory error:", err.message);
    return [];
  }
}

async function logToSheets(sessionId, guestMessage, destinyReply, datesAsked, availabilityStatus, alertSummary = "") {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) return;
    const accessToken = await getSheetsToken();
    if (!accessToken) return;
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const row = [timestamp, sessionId || "", guestMessage, destinyReply, datesAsked || "", availabilityStatus || "", alertSummary];
    const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    });
    if (sheetRes.ok) console.log("Logged to Google Sheets ✅");
  } catch (err) {
    console.error("Google Sheets logging error:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API Handler
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, status: "Destiny Blue is online" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [], sessionId = null, alertSent: priorAlertSent = false, pendingRelay: priorPendingRelay = false, ozanAcked: priorOzanAcked = false } = req.body || {};
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    // Fetch session history from Sheets if sessionId provided
    // If frontend already confirmed ack, skip Sheets read entirely
    const [sessionHistory, ozanAcknowledged] = await Promise.all([
      fetchSessionHistory(sessionId),
      priorOzanAcked ? Promise.resolve(true) : checkOzanAcknowledged(sessionId),
    ]);
    const isReturningGuest = sessionHistory.length > 0;
    const ozanAcknowledgedFinal = ozanAcknowledged || priorOzanAcked;
    console.log(`Session: ${sessionId || "anonymous"} | Returning: ${isReturningGuest} | OzanAck: ${ozanAcknowledgedFinal}`);

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", weekday: "long",
    });

    const allUserText = messages.filter((m) => m.role === "user").map((m) => m.content).join(" ");

    // ── LOCKDOWN EXIT DETECTION ────────────────────────────────────────────
    const isResolutionMessage = /got it|i'm in|i am in|i'm inside|sorted|never mind|found it|found the code|figured it out|all good|thanks got|got in|in now|no worries|never mind|forget it/i.test(lastUser);
    const isOffTopic = detectAvailabilityIntent(lastUser) || detectBlogTopic(lastUser) !== null || detectDiscountIntent(lastUser);
    const lockdownResolved = ozanAcknowledgedFinal || isResolutionMessage || isOffTopic;

    // ── LAYER 1: Run all detectors ──────────────────────────────────────────
    const isDiscountRequest = detectDiscountIntent(lastUser);
    const isUnitComparison = detectUnitComparison(lastUser);
    const isEscalation = detectEscalation(lastUser) || detectEscalation(allUserText.slice(-500));
    const isExcessGuests = detectExcessGuests(lastUser);
    const isLockedOut = !lockdownResolved && (detectLockedOut(lastUser) || detectLockedOut(allUserText.slice(-300)));
    // Deep escalation: locked out AND can't reach Ozan
    const isLockoutEscalation = isLockedOut && /can't reach|cant reach|not answer|no answer|not responding|still stuck|still can't|still cant|not picking|voicemail|tried.*ozan|ozan.*not/i.test(allUserText.slice(-500));
    // Also catch: forgot/lost code + I don't have it in conversation history
    const forgotCodeInHistory = /forgot.*code|lost.*code|can't find.*code|dont have.*code|don't have.*code|deleted.*email/i.test(allUserText);
    const cantReachInHistory = /can't reach|cant reach|not answer|no answer|not responding|not picking/i.test(allUserText);
    const shouldFireAlert = isLockoutEscalation || (forgotCodeInHistory && cantReachInHistory);
    const wantsAvailability = detectAvailabilityIntent(lastUser);

    // Only look back in history for dates on genuine follow-ups
    const dates = extractDates(lastUser) || (
      lastUser.match(/unit|1006|707|that one|both|available|book|price|cost|how much|rate|what is the/i)
        ? extractDates(allUserText)
        : null
    );

    // Detect month-only intent
    const monthNames = {january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",july:"07",august:"08",september:"09",october:"10",november:"11",december:"12"};
    const monthOnlyMatch = !dates && lastUser.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
    const mentionedMonth = monthOnlyMatch ? monthOnlyMatch[1].toLowerCase() : null;

    // ── LAYER 1: Build injected context blocks ──────────────────────────────
    let discountContext = "";
    let availabilityContext = "";
    let unitComparisonContext = "";
    let availabilityStatus = "";

    // 🚨 DISCOUNT DETECTOR — highest priority injection
    if (isDiscountRequest) {
      availabilityStatus = "DISCOUNT_REQUEST";
      discountContext = `🚨 DISCOUNT/DEAL REQUEST DETECTED — FOLLOW THIS EXACTLY, DO NOT DEVIATE:
The guest is asking about a discount, deal, price match, cleaning fee waiver, or better price.
Do NOT explain pricing. Do NOT say "we can't offer discounts." Do NOT mention Airbnb by name.
Instead follow these steps IN ORDER:
1. Acknowledge their request warmly and with empathy (1 sentence max)
2. Say: "Share your dates, number of adults and children and I'll create your booking link — you can then use the Comments/Questions box and hit Send Inquiry and Ozan will review your request personally 😊"
3. If they have already provided dates in this conversation, skip asking — create the booking link immediately and still tell them to use the Comments/Questions box and Send Inquiry for Ozan to review.
NEVER name Airbnb, VRBO, or any platform by name — say "booking platforms" instead.`;
    }

    // 🔵 UNIT COMPARISON — inject neutral rule
    if (isUnitComparison) {
      unitComparisonContext = `🔵 UNIT COMPARISON QUESTION DETECTED — FOLLOW THIS EXACTLY:
Both units are EQUAL in overall value — never say one is objectively better than the other.
You MAY state factual differences: floor level (7th vs 10th), decor style (classic coastal vs fresh coastal), and that 10th floor gives a higher vantage point for views. These are facts, not recommendations.
NEVER say one is quieter, better for families, more suitable, or superior overall.
NEVER mention furniture purchase dates or renovation years.
Both units have the same WiFi smart lock, same amenities, same Gulf views.
Present BOTH options positively and equally, then let the guest decide.
If directly asked "which do you personally recommend?" — say: "I honestly couldn't pick — they're both wonderful! Unit 707 has classic coastal warmth, Unit 1006 has a fresh modern feel and slightly higher vantage point. It really comes down to your personal style 😊 Want me to check availability for both?"`;
    }

    // 🚨 LOCKOUT ESCALATION — fire Discord alert to Ozan
    // Also trigger if locked out context exists anywhere in conversation + can't reach now
    const lockoutInHistory = allUserText.match(/can't get in|cant get in|locked out|stuck outside|forgotten.*code|forgot.*code/i);
    const cantReachNow = /can't reach|cant reach|not answer|no answer|not responding|still stuck|still can't|not picking|voicemail/i.test(lastUser);
    let alertWasFired = false;

    // Persist alert state FIRST — before any firing logic so we never fire twice
    if (priorAlertSent) alertWasFired = true;

    if (!alertWasFired && (shouldFireAlert || (lockoutInHistory && cantReachNow))) {
      sendEmergencyDiscord(allUserText.slice(-500), sessionId, "🔐 Guest locked out / cannot reach Ozan"); // fire and forget
      alertWasFired = true;
    }

    // ── RELAY / ALERT DETECTORS ──────────────────────────────────────────────

    // Type 1: DIRECT PING — guest wants Ozan alerted/contacted, no message needed
    // Fires immediately — no waiting for content
    const directPing = /alert.*ozan|ping.*ozan|notify.*ozan|contact.*ozan|reach.*ozan|get.*ozan|call.*ozan|let.*ozan.*know|send.*alert|send.*emergency|send.*urgent/i.test(lastUser);

    // Type 2: RESEND — guest asks to send again
    const resendRequest = /send again|resend|try again|send it again|alert again|send another|send one more/i.test(lastUser);

    // Type 3: RELAY WITH CONTENT
    // Trigger: any way guest asks to send a message — with or without naming recipient
    const relayTrigger = /send.*(?:ozan|owner|host|manager|landlord|him|them)|message.*(?:ozan|owner|host|manager)|tell.*(?:ozan|owner|host)|pass.*(?:ozan|owner|host)|^send\s+a?\s*message|^can\s+you\s+send|^please\s+send/i.test(lastUser);
    // Extract content after trigger phrase
    const relayTriggerMatch = lastUser.match(/(?:send|message|pass|tell|forward|contact|let).*?(?:ozan|owner|host|manager|landlord|him|them|message)[,:]?\s*(.*)/i);
    const contentAfterTrigger = relayTriggerMatch ? relayTriggerMatch[1].trim() : "";
    // Also check: words after "send a message" or "send message" with no named recipient
    const bareMessageMatch = lastUser.match(/send\s+a?\s*message\s+(.*)/i);
    const contentAfterBareMessage = bareMessageMatch ? bareMessageMatch[1].trim() : "";
    const bestContent = contentAfterTrigger.length > contentAfterBareMessage.length ? contentAfterTrigger : contentAfterBareMessage;
    const relayWithContent = relayTrigger
      && (bestContent.split(/\s+/).filter(Boolean).length >= 2
          || lastUser.match(/[“”"]/i)
          || lastUser.length >= 80);

    // Type 4: BARE RELAY — guest asks to relay a message but hasn't provided content yet
    const bareRelayRequest = relayTrigger
      && !relayWithContent
      && !directPing
      && lastUser.length < 80;

    // Follow-up content: previous turn was a bare relay request
    const followUpRelay = priorPendingRelay === true && !bareRelayRequest && !directPing;

    // stillStuckCode only fires when guest shows they have already tried
    const stillStuckCode = /still.*can't find|still.*cant find|still.*no code|still.*forgot|still.*door code|still.*pin/i.test(lastUser);

    // Detect maintenance/issue relay content
    const maintenanceKeywords = /ac|air.?con|heat|heater|heating|tv|television|wifi|wi.fi|internet|coffee|dishwasher|microwave|oven|stove|fridge|refrigerator|freezer|washer|dryer|shower|toilet|sink|drain|faucet|tap|hot water|water.*hot|lock|door|balcony|window|blind|curtain|light|lamp|outlet|socket|plug|remote|key|safe|pool|elevator|parking|noise|smell|leak|broken|not work|wont work|won't work|doesn't work|stopped work|out of order|need.*fix|need.*repair|replace|clogg|blocked|overflow|back.*up|backed.*up|tub|bathtub/i.test(bestContent || lastUser);

    // demandAlert used for system prompt context and alertSummary reason
    const demandAlert = directPing || resendRequest || relayWithContent || followUpRelay;


    // ── FIRE DISCORD ALERTS
    // ── FIRE DISCORD ALERTS ───────────────────────────────────────────────────

    // Direct pings always fire — explicit action request from guest
    if (directPing) {
      sendEmergencyDiscord(lastUser, sessionId, "📣 Guest requesting urgent contact with Ozan");
      alertWasFired = true;
    }

    // Resend always fires — guest is explicitly asking again
    if (resendRequest) {
      sendEmergencyDiscord(lastUser, sessionId, "🔁 Guest requesting follow-up — no response yet");
      alertWasFired = true;
    }

    // Relay with content always fires — guest provided a specific message
    if (relayWithContent || followUpRelay) {
      sendEmergencyDiscord(lastUser, sessionId, maintenanceKeywords ? "🔧 MAINTENANCE ISSUE — Guest reporting a problem in the unit" : "💬 Guest message to relay to Ozan");
      alertWasFired = true;
    }

    // stillStuckCode fires once only — automatic detection, not explicit request
    if (!alertWasFired && stillStuckCode) {
      sendEmergencyDiscord(lastUser, sessionId, "🔐 Guest still cannot find door code");
      alertWasFired = true;
    }

    // Auto-fire for bare maintenance complaints — no relay phrase needed
    const isLockoutMessage = detectLockedOut(lastUser);
    const bareMaintenance = !alertWasFired && !relayWithContent && !directPing && !resendRequest && !followUpRelay && !isLockoutMessage && maintenanceKeywords;
    if (bareMaintenance) {
      sendEmergencyDiscord(lastUser, sessionId, "🔧 MAINTENANCE ISSUE — Guest reporting a problem in the unit");
      alertWasFired = true;
    }

    // Build alert summary for Sheets column G
    let alertSummary = "";
    if (alertWasFired && !priorAlertSent) {
      const cst = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const reason = isLockedOut ? "Guest locked out / door code issue"
        : demandAlert ? "Guest requested message relay to Ozan"
        : stillStuckCode ? "Guest cannot find door code"
        : isLockoutEscalation ? "Lockout escalation — could not reach Ozan"
        : "Emergency / escalation alert";
      alertSummary = `${cst} CST | ${reason}`;
    }

    // 🔐 LOCKED OUT / DOOR CODE CONTEXT
    let lockedOutContext = "";
    if (isLockedOut) {
      lockedOutContext = `🔐 LOCKED OUT / DOOR CODE REQUEST DETECTED — FOLLOW THIS EXACTLY:
The guest cannot get into their unit or has forgotten/lost their door code.
NEVER send them to front desk or resort security — they cannot help with unit door codes.
NEVER say you can't provide the code for security reasons in a loop — that's unhelpful.
Follow these steps IN ORDER:
1. Show genuine empathy — being locked out is stressful.
2. Tell them: "Your PIN code is in your booking confirmation email — search for an email from OwnerRez or Destin Condo Getaways sent around the time you booked. Check your spam folder too."
3. If they say they deleted the email: "The PIN is also in your booking confirmation on the platform you booked through — check your booking details there."
4. If still stuck: "Please TEXT Ozan at (972) 357-4262 — texting reaches him faster than calling. He can resend your PIN immediately."
5. If Ozan not responding: "Please email ozan@destincondogetaways.com — he monitors email closely and can resend your PIN."
6. NEVER suggest front desk, resort security, or any other party — they have NO access to unit PINs.
7. NEVER keep repeating the same suggestion if guest says it didn't work — move to the next step.
8. Stay calm and warm throughout — this is stressful for the guest.
9. NEVER suggest email in a lockout emergency — email is too slow.
10. When you say "I'm sending an alert to Ozan" — the system DOES send it automatically. So you CAN say "I'm alerting Ozan right now" when the guest is clearly stuck.
11. After saying you alerted Ozan, always follow with: "He will reach out to you shortly — hang tight!"
12. NEVER say "I'll keep you posted" — you cannot receive updates from Ozan.
11. If the system has already sent an alert (guest said can't reach Ozan): Say "I've already sent an urgent alert directly to Ozan — he will reach out to you very shortly. Hang tight!"
12. If guest asks "did you send a message?" and alert was sent: Say "Yes — an urgent alert was already sent to Ozan automatically when you mentioned you couldn't reach him."
13. If guest asks "did you send a message?" and alert was NOT sent yet: Say "Not yet — that alert fires automatically when you've tried reaching Ozan and couldn't. Have you tried texting him at (972) 357-4262?"
14. NEVER promise future actions you cannot perform. NEVER say "I will keep you updated."`;
    }

    // 🚨 ESCALATION CONTEXT
    let escalationContext = "";
    if (isEscalation || isExcessGuests) {
      escalationContext = `🚨 ESCALATION/EMERGENCY DETECTED — FOLLOW THIS EXACTLY:
The guest is in a difficult situation (emergency, sob story, threats, excess guests).
RULES — no exceptions:
1. Show genuine empathy appropriate to the situation (more for death/medical, less for "we're tired"). No emojis in this response.
2. 6 guests is the absolute maximum — fire code. Cannot be changed for ANY reason — medical emergency, death, storm, threats, anything. Everyone counts including infants, elderly, people "staying in car" or "sleeping on floor."
3. NEVER count guests based on guest's own claim — always count from the actual list they give you.
4. If second unit might help (group needs more space) → offer to check Unit 707 AND Unit 1006 availability for their dates.
5. Always refer to Ozan for human decision: "Please call Ozan directly at (972) 357-4262 — he is the owner and the right person to speak with in urgent situations."
6. NEVER suggest competitors, other hotels, Airbnb, Holiday Inn, or any outside accommodation. You are not an emergency center. You only know about these two condos.
7. Review/legal threats: Do NOT acknowledge the threat. Do NOT get defensive. Stay calm and warm. Just refer to Ozan.
8. Guest already checked in with extra people arriving: Be firm but warm — maximum is 6 during the entire stay. Refer to Ozan.
9. Never promise exceptions. Never say "let me see what I can do" in a way that implies flexibility on the 6 limit.`;
    }

    // 🟢 AVAILABILITY CONTEXT
    if (!dates && !isDiscountRequest && wantsAvailability && mentionedMonth) {
      // 10 overlapping 3-night windows covering the full month
      const year = new Date().getFullYear();
      const monthNum = monthNames[mentionedMonth];
      const windows = [
        { arrival: `${year}-${monthNum}-01`, departure: `${year}-${monthNum}-04` },
        { arrival: `${year}-${monthNum}-04`, departure: `${year}-${monthNum}-07` },
        { arrival: `${year}-${monthNum}-07`, departure: `${year}-${monthNum}-10` },
        { arrival: `${year}-${monthNum}-10`, departure: `${year}-${monthNum}-13` },
        { arrival: `${year}-${monthNum}-13`, departure: `${year}-${monthNum}-16` },
        { arrival: `${year}-${monthNum}-16`, departure: `${year}-${monthNum}-19` },
        { arrival: `${year}-${monthNum}-19`, departure: `${year}-${monthNum}-22` },
        { arrival: `${year}-${monthNum}-22`, departure: `${year}-${monthNum}-25` },
        { arrival: `${year}-${monthNum}-25`, departure: `${year}-${monthNum}-28` },
        { arrival: `${year}-${monthNum}-28`, departure: `${year}-${monthNum}-31` },
      ];

      // Check all 10 windows for both units in parallel
      const results = await Promise.all(
        windows.map(async (w) => {
          const [a707, a1006] = await Promise.all([
            checkAvailability(UNIT_707_PROPERTY_ID, w.arrival, w.departure),
            checkAvailability(UNIT_1006_PROPERTY_ID, w.arrival, w.departure),
          ]);
          return { w, a707, a1006 };
        })
      );

      // Score per unit
      const open707  = results.filter(r => r.a707  === true).length;
      const open1006 = results.filter(r => r.a1006 === true).length;
      const openEither = results.filter(r => r.a707 === true || r.a1006 === true).length;
      const pct707    = Math.round((open707  / windows.length) * 100);
      const pct1006   = Math.round((open1006 / windows.length) * 100);
      const pctEither = Math.round((openEither / windows.length) * 100);

      // Availability band
      let band = "LIMITED";
      if      (pctEither >= 70) band = "WIDE_OPEN";
      else if (pctEither >= 40) band = "SOME_OPENINGS";
      else if (pctEither >= 15) band = "LIMITED";
      else                      band = "HEAVILY_BOOKED";

      console.log(`Month probe ${mentionedMonth}: pctEither=${pctEither}% pct707=${pct707}% pct1006=${pct1006}% band=${band}`);
      console.log("Window detail:", results.map(r => ({ from: r.w.arrival, to: r.w.departure, u707: r.a707, u1006: r.a1006 })));

      availabilityStatus = `MONTH:${mentionedMonth} band:${band} pctEither:${pctEither} pct707:${pct707} pct1006:${pct1006}`;

      const bandMessages = {
        WIDE_OPEN:      `${mentionedMonth} looks fairly open based on a quick spot-check — though exact availability always depends on your specific dates.`,
        SOME_OPENINGS:  `${mentionedMonth} has some openings, but popular weeks can book up fast.`,
        LIMITED:        `${mentionedMonth} looks a bit tight — there are some gaps but it is filling up.`,
        HEAVILY_BOOKED: `${mentionedMonth} appears mostly booked, but there may still be some gaps depending on your exact dates.`,
      };

      // Build per-unit honest message
      let monthMsg = "";
      if (pct707 >= 70 && pct1006 >= 70) {
        monthMsg = `Both units look fairly open in ${mentionedMonth} based on a quick spot-check.`;
      } else if (pct707 >= 70 && pct1006 < 70) {
        monthMsg = `Unit 707 looks fairly open in ${mentionedMonth}, but Unit 1006 is filling up — some weeks are already taken.`;
      } else if (pct707 < 70 && pct1006 >= 70) {
        monthMsg = `Unit 1006 looks fairly open in ${mentionedMonth}, but Unit 707 is filling up — some weeks are already taken.`;
      } else if (pct707 >= 40 || pct1006 >= 40) {
        monthMsg = `${mentionedMonth} has some openings but popular weeks are booking up fast.`;
      } else if (pct707 >= 15 || pct1006 >= 15) {
        monthMsg = `${mentionedMonth} is looking quite tight — there are some gaps but it is filling up quickly.`;
      } else {
        monthMsg = `${mentionedMonth} appears mostly booked, but there may still be a gap depending on your exact dates.`;
      }

      availabilityContext = `MONTH PROBE (10 windows checked): pct707=${pct707}% pct1006=${pct1006}% pctEither=${pctEither}%.
Use this exact phrasing: "${monthMsg}"
Then always ask: "Share your exact check-in and check-out dates plus number of adults and children — I'll check live availability and create a booking link for you! You can also browse open dates at https://www.destincondogetaways.com/availability"
Do NOT say great news or over-promise. Be specific about which unit is open vs filling up.`
    } else if (!dates && !isDiscountRequest && wantsAvailability) {
      availabilityStatus = "NEEDS_DATES";
      availabilityContext = `NO DATES: Guest is asking about availability/booking but has not given dates. Warmly ask for check-in date, check-out date, number of adults and number of children. Do NOT send to generic page.`;
    }

    if (dates && !isDiscountRequest) {
      const [avail707, avail1006] = await Promise.all([
        checkAvailability(UNIT_707_PROPERTY_ID, dates.arrival, dates.departure),
        checkAvailability(UNIT_1006_PROPERTY_ID, dates.arrival, dates.departure),
      ]);

      const adultsMatch = lastUser.match(/(\d+)\s*adult/i) || allUserText.match(/(\d+)\s*adult/i);
      const childrenMatch = lastUser.match(/(\d+)\s*(kid|child|children)/i) || allUserText.match(/(\d+)\s*(kid|child|children)/i);
      const adults = adultsMatch ? adultsMatch[1] : "2";
      const children = childrenMatch ? childrenMatch[1] : "0";

      console.log(`Availability results - 707: ${avail707}, 1006: ${avail1006}`);

      if (avail707 === false && avail1006 === false) {
        availabilityStatus = `DATES:${dates.arrival}->${dates.departure} | 707:BOOKED | 1006:BOOKED`;
        availabilityContext = `LIVE AVAILABILITY: Both units BOOKED for ${dates.arrival} to ${dates.departure}. Tell guest both unavailable and suggest https://www.destincondogetaways.com/availability for open dates.`;
      } else if (avail707 === true && avail1006 === false) {
        availabilityStatus = `DATES:${dates.arrival}->${dates.departure} | 707:AVAILABLE | 1006:BOOKED`;
        const link = buildLink("707", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: Unit 707 AVAILABLE, Unit 1006 BOOKED for ${dates.arrival} to ${dates.departure}. Only offer Unit 707. Booking link: ${link}`;
      } else if (avail707 === false && avail1006 === true) {
        availabilityStatus = `DATES:${dates.arrival}->${dates.departure} | 707:BOOKED | 1006:AVAILABLE`;
        const link = buildLink("1006", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: Unit 1006 AVAILABLE, Unit 707 BOOKED for ${dates.arrival} to ${dates.departure}. Only offer Unit 1006. Booking link: ${link}`;
      } else if (avail707 === true && avail1006 === true) {
        availabilityStatus = `DATES:${dates.arrival}->${dates.departure} | 707:AVAILABLE | 1006:AVAILABLE`;
        const link707 = buildLink("707", dates.arrival, dates.departure, adults, children);
        const link1006 = buildLink("1006", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: BOTH units AVAILABLE for ${dates.arrival} to ${dates.departure}. Offer both equally. Unit 707 link: ${link707} — Unit 1006 link: ${link1006}`;
      } else {
        availabilityStatus = `DATES:${dates.arrival}->${dates.departure} | CHECK_FAILED`;
        const link707fb = buildLink("707", dates.arrival, dates.departure, adults, children);
        const link1006fb = buildLink("1006", dates.arrival, dates.departure, adults, children);
        availabilityContext = `AVAILABILITY CHECK FAILED — could not confirm live status. Still provide both booking links so guest can proceed: Unit 707: ${link707fb} — Unit 1006: ${link1006fb} — Tell guest: "I wasn't able to confirm live availability right now, but here are your direct booking links — use code DESTINY for 10% off! If you have any issues, contact Ozan at (972) 357-4262."`;
      }
    }

    // Blog content or real weather
    let blogContext = "";
    const blogTopic = detectBlogTopic(lastUser);
    if (blogTopic === "photos") {
      blogContext = `\n\nPHOTOS/VIRTUAL TOUR REQUEST: Guest wants to see photos or take a virtual tour. Give them these links directly in plain text:\n- Virtual tour: https://www.destincondogetaways.com/virtual-tour\n- Unit 707 photos & booking: https://www.destincondogetaways.com/pelican-beach-resort-unit-707-orp5b47b5ax\n- Unit 1006 photos & booking: https://www.destincondogetaways.com/pelican-beach-resort-unit-1006-orp5b6450ex\nDo NOT send them to the blog or events page. Share all 3 links warmly and invite them to ask questions.`;
    } else if (blogTopic === "weather") {
      console.log("Weather question — fetching real Destin forecast...");
      const forecast = await fetchDestinWeather();
      if (forecast) {
        const lines = forecast.map(d =>
          `${d.date}: ${d.desc}, high ${d.hi}°F / low ${d.lo}°F, ${d.rain}% rain chance`
        ).join("\n");
        blogContext = `\n\nREAL-TIME DESTIN WEATHER FORECAST (7 days) — use this data, do not guess:\n${lines}\nSummarize in 2-3 sentences max. No markdown bold. No bullet lists. Just warm conversational text.\nGulf swimming: ideal June-September, cool Oct-May, cold Dec-March → always suggest indoor heated pool for winter months.`;
      } else {
        blogContext = `\n\nWEATHER DATA UNAVAILABLE: Real-time weather could not be fetched. Do NOT guess or invent temperatures. Tell the guest honestly: "I don't have live weather data at the moment — for the most accurate Destin forecast I'd recommend checking weather.com. What I can say is that February in Destin typically sees highs in the mid-50s to low 60s°F, and the Gulf is quite chilly — our indoor heated pool is perfect this time of year!" Do NOT confidently state specific temperatures you are not sure about.`;
      }
    } else if (blogTopic) {
      const blogResult = await fetchBlogContent(blogTopic);
      if (blogResult) {
        blogContext = `\n\nLIVE BLOG CONTENT (use this to answer, include blog link ${blogResult.url} at end of answer):\n${blogResult.content}`;
      }
    }

    // ── BUILD SYSTEM PROMPT ─────────────────────────────────────────────────
    const SYSTEM_PROMPT = `You are Destiny Blue, a warm and caring AI concierge for Destin Condo Getaways.
You help guests discover and book beachfront condos at Pelican Beach Resort in Destin, Florida.
You sound like a knowledgeable local friend — warm, genuine, never robotic.
Today is ${today}.

${ozanAcknowledgedFinal ? "✅ OZAN ACKNOWLEDGED THIS SESSION: Ozan has seen the emergency alert and confirmed he is on it. Tell the guest warmly: \"Good news — Ozan has seen your message and will reach out to you very shortly 🙏\" Only say this ONCE — if you have already said it earlier in this conversation, do not repeat it. After saying it, switch to normal helpful mode.\n\n" : ""}${alertWasFired ? "🚨 ALERT SENT THIS SESSION: An emergency Discord alert was automatically sent to Ozan during this conversation. If guest asks if you contacted Ozan or sent a message — say YES, an urgent alert was already sent to him. Do not say you will send it — it is already done.\n\n" : ""}${discountContext ? discountContext + "\n\n" : ""}${lockedOutContext ? lockedOutContext + "\n\n" : ""}${unitComparisonContext ? unitComparisonContext + "\n\n" : ""}${escalationContext ? escalationContext + "\n\n" : ""}${availabilityContext ? "⚡ " + availabilityContext + "\n\nIMPORTANT: Use ONLY these live results. Never offer booked units. Always include exact booking link(s).\n\n" : ""}${blogContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOCATION: Directly beachfront — no street to cross. Elevator down, few steps past the pool deck, and you're on the sand 🌊

IMPORTANT — PELICAN BEACH RESORT TERRACE: This is a DIFFERENT building and is NOT beachfront. Our units are in the main Pelican Beach Resort building, which IS directly on the beach.

UNIT 707 — 7th floor — Classic Coastal Vibe
Bright, classic coastal style with beachy artwork and warm cozy atmosphere. Open living area with recliner, sofa queen pull-out, large smart TV. Updated kitchen with granite counters, stainless appliances, full cookware. Hamilton Beach FlexBrew coffee maker (compatible with K-Cup pods, single-serve pods, or ground coffee + full 12-cup carafe), air fryer, wireless phone charger. King bedroom + hallway bunk beds.

UNIT 1006 — 10th floor — Fresh Coastal Vibe  
Fresh coastal feel with turquoise and sea-glass color pops, lighter finishes, bright and airy. Two smart TVs, sleeper sofa, hallway bunk beds. Same kitchen setup: Hamilton Beach FlexBrew, air fryer, wireless phone charger. WiFi smart lock entry.

BOTH UNITS HAVE IDENTICAL AMENITIES — only floor level and decor style differ.
- 1 bed, 2 bath, 873 sq ft, sleeps up to 6 (fire code — cannot change)
- King bed + hallway bunk beds + sofa queen pull-out
- Private balcony facing east-west — beautiful morning light AND stunning Gulf sunsets 🌅
- Both units have WiFi smart lock entry
- Full kitchen, dishwasher, ice maker, wine glasses
- Free WiFi 250+ Mbps, Eero 6 — Ozan works from here himself, video calls with no issues
- Desk, laptop workspace
- 2 beach chairs + umbrella included — set up in the open public section just behind the LDV rental chairs.
- For front-row beach service: LDV Beach Chairs (La Dolce Vita) rents 2 umbrellas + chair for $40/day ($50/day for first row). Hours: 9AM-5PM, March 1 through October 31. Book in advance: 866-651-1869 | https://www.ldvbeach.com
- AC, ceiling fans, iron & board, hair dryer in both bathrooms
- Games, board games, children's books & toys, Pack N Play
- Dining seats 6 (4 chairs + 2 barstools)
- No daily housekeeping — starter supplies on arrival

Starter pack: toilet paper, shampoo, soaps, dish liquid, sponge, dishwasher tablets, paper towels, coffee
Longer stays: Winn-Dixie/Target across the street, or Amazon/Instacart/Walmart delivery
Bring: beach towels (unit towels NOT outside), sunscreen, hat, sunglasses

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESORT FACILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 3 pools: indoor heated swim-out pool (year-round, heated) + 2 outdoor pools (both heated seasonally) + kiddie pool
- 2 hot tubs / Jacuzzis
- Sauna AND steam room
- Fitness center (free for guests)
- Tennis AND Pickleball courts (free for guests)
- Outdoor gas grills (recently renewed) with seating area, ground level next to cafe
- Seasonal Tiki Bar on the beach — serves cocktails, drinks and food directly to beach seating (seasonal)
- Seasonal cafe / convenience store in lobby area
- 24/7 front desk and on-site security
- Vending machines + change machine in lobby (snacks, drinks, basic amenities)
- Direct beach access from back of building — private beach
- 19 floors (20th floor is top floor — no 13th floor)
- Resort built in 1996. Third pool added south side in 2021. Waterproofing renovations 2022-2023.
- 5 elevators (accessible), disabled parking
- Gated resort — security at entrance for guest safety and privacy
- Pool bracelets required March–October — keeps resort comfortable and secure during busy season
- Coin-operated laundry on every floor — near center stairwell. Accepts quarters AND credit card.
- 2 on-site EV chargers (J1772, paid)
- Free parking up to 2 cars — parking pass at front desk

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECK-IN & CHECK-OUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Check-in: 4:00 PM CST — PIN active at this time, keyless entry
- Go directly to unit — no lobby check-in needed
- Stop at front desk for parking pass and pool bracelets (Mar-Oct) — before or after settling in
- Check-out: BY 10:00 AM CST — guests can leave any time before 10 AM, just ensure out by 10. Next guests are counting on it.
- Text cleaning crew when checking out (8–10 AM). Before 8 AM: text unit + time before 8 PM night before
- Early check-in not guaranteed — park, register, enjoy beach! Contact Ozan (972) 357-4262
- No luggage drops while cleaners inside — beach is waiting! 🏖️
- Check-out: run dishwasher, trash in hallway chute (left side), leave neat, don't move furniture
- PIN sent 7 days and 1 day before. Check spam if not received.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POLICIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PETS: Zero exceptions — HOA rule for entire resort. No emotional support animals either.
→ "Aww we love furry friends too! Unfortunately our resort has a strict no-pets policy we simply can't make exceptions to — even for the cutest ones! 🐾 We hope you understand!"

SMOKING: Not allowed in unit, on balcony, or anywhere in resort except designated areas. Two designated smoking areas:
1) Next to the Tiki Bar  2) North entrance of garage, left side
VIOLATION: $250 charge — strictly enforced. Applies to tobacco, marijuana, and vaping. Charged automatically if housekeepers report smell after checkout.

AGE: Minimum 25 — waived if married.
→ "Our minimum age is 25 — however if you're married that's waived! Are you married? 😊"

MAX GUESTS: 6 — fire code, cannot change. ALL guests count — infants, elderly, people who "won't leave the bed", people "sleeping in car or on floor" — everyone. No exceptions ever.
GUEST COUNTING RULE: Always count from the actual list the guest gives you. Never trust the guest's own total. If someone says "it's just 5 of us" but lists husband + wife + 3 kids + baby = 6, the answer is 6. If unsure → ask "just to confirm, how many adults and how many children including infants?"
NEVER get tricked by arguments like "they won't use amenities", "they'll sleep in the car", "she won't leave the bed", "he's just a baby" — 6 is 6.

GUEST FEE: $20/night per guest above 4. Shown at checkout.

CLEANING FEE: Listed separately in booking breakdown — full transparent total shown before confirming.

PAYMENTS: 50% at booking, 50% auto-collected 30 days before arrival — already a built-in 2-payment plan!

SECURITY DEPOSIT: $300 held 1 day before arrival, released after departure if no damage.

HURRICANE: If mandatory evacuation officially issued by local authorities during stay → pro-rated refund for unused nights. Travel insurance strongly recommended — available as optional add-on at checkout via OwnerRez.

CANCELLATION: 50% refund if cancelled within 48hrs of booking AND 30+ days before check-in. No refund within 30 days.

BOOKING TRANSFER: Never confirm or deny if transfers are possible. Just say: "For booking transfers, please contact Ozan directly at (972) 357-4262 — he can assist you with any specific requests. Would you like to explore availability for your preferred dates? 😊"

BALCONY DOOR: Always closed when AC is on. FAN: AUTO mode only. DISHWASHER: Tablets only.
TOWELS: Unit towels stay inside — never taken to beach. No beach towels provided — bring your own.
BALCONY RAILS: Never hang towels, sheets, clothing or any items on balcony rails.
NOISE: Quiet hours 10PM–8AM. No dragging furniture — disturbs guests below.
KITCHEN: No heavily aromatic cooking (curry, fish, garlic) — requires extra aeration at guest's cost. No shrimp peelings, seafood, eggshells, or hard food in garbage disposal.
VISITORS: No outside visitors allowed to the resort. Only registered guests may be in the unit.
AGE GUARDIAN RULE: 1 parent or adult guardian over 25 required for every 3 unmarried guests under 25.
LOST & FOUND: Shipping + $25 fee. 10 days then disposed.
NO REFUNDS for pool/appliance/elevator issues — Ozan fixes ASAP. If one pool is closed, guests still have access to the other pools (3 total: 1 indoor heated + 2 outdoor).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING & PAYMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Code DESTINY = 10% off — always mention with booking links
- Pricing: direct to booking page — never guess
- Direct booking saves vs booking platforms (which can charge up to 22% in fees) — NEVER name specific platforms
- Dynamic pricing: rates vary by demand and season only — NEVER mention decor or floor level as a reason for price difference
- Rate drop after booking: rates move with demand — locking in early protects dates
- Cheapest time to visit: November through February (only say this when directly asked)
- NEVER suggest any specific month is cheaper than another UNLESS directly asked about cheapest time

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Ozan: (972) 357-4262 | ozan@destincondogetaways.com
- Pelican Beach Front Desk: (850) 654-1425
- Resort Security (text): 850-503-2481
- WiFi Support: 1-844-275-3626
- LDV Beach Chairs: 866-651-1869 | https://www.ldvbeach.com
- Beach cam: https://www.destincondogetaways.com/destin-live-beach-cam-574002656
- Activities: http://affiliates.tripshock.com/destindreamcondo
- Browse availability: https://www.destincondogetaways.com/availability

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOCAL TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Always include the relevant blog link when answering local questions.
- Destin Marina & Harborwalk: AJ's, water sports, weekly fireworks, great sunsets
- Dolphin tours: morning recommended, 4-5 operators at Destin Marina
- Crab Island: pontoon/motorboat rentals, playground for kids
- Topsail Hill & Henderson Beach State Parks
- Village of Baytowne Wharf at Sandestin: best at night, live music, fireworks
- Silver Sands Premium Outlets: designer brands at discount
- Yelp app for restaurant waitlists!
- Winn-Dixie & Target across the street. Amazon/Instacart/Walmart deliver.
- Walking distance: Target, Walgreens, McDonald's about 1 mile away. Some restaurants just a block or two away.
- Pelican Beach is minutes from Harborwalk Village and across from Big Kahuna's water park.

Restaurants: Back Porch, Crab Trap, Acme Oyster House, Bayou Bill's, Boshamps, Dewey Destin's Harborside, Stinky's Fish Camp, Boathouse Oyster Bar, Aegean (Greek), McGuire's Irish Pub (best steak)
Breakfast: Donut Hole, Another Broken Egg Cafe, Cracklings, Angler's Beachside Grill
Rainy day: Gulfarium, Wild Willy's, Emerald Coast Science Center, Surge Trampoline, Escapology, Fudpuckers, Big Kahuna's, Movie Theatre at Destin Commons, Rock Out Climbing Gym

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESTINY BLUE'S TONE & RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WARMTH & EMPATHY:
- Sound like a caring local friend, not a robot
- Show genuine empathy especially on policy questions ("I completely understand, here's what I can do...")
- Pets, smoking, age questions → always warm and understanding tone
- NEVER cold or dismissive
- ILLNESS / FAMILY EMERGENCY / BAD NEWS: When a guest mentions sickness, injury, family emergency or any difficult personal situation — lead with genuine human empathy FIRST, NO emojis in that response, THEN explain the policy calmly. Example: "I'm so sorry to hear that — I genuinely hope everyone feels better soon. Here's how our cancellation policy works in this situation..."

GULF WATER TEMPERATURE: Never claim the Gulf is warm in winter months. Honest guide:
- June through September: warm, great for swimming 🌊
- October, November, April, May: mild, refreshing, some enjoy it
- December through March: cold (upper 50s to mid 60s°F) — NOT comfortable for swimming. Always suggest the indoor heated pool.
Never tell a guest the Gulf is warm or inviting in February, January, December, March.

WEATHER RESPONSES: When giving weather forecasts, NEVER use markdown bold (**text**) or bullet lists. Write as warm conversational prose in 2-3 sentences max. Example: "This week in Destin looks mostly sunny with highs around 68°F — a few showers possible Monday but clearing up nicely after. Nights will be cool in the mid-50s, and the Gulf will be chilly this time of year so our indoor heated pool is perfect for a swim!"

TONE VARIETY — NEVER repeat the same ending:
Rotate naturally between: "Would you like me to check your dates? 🌊", "Planning a family trip or couples getaway?", "Want me to create a direct booking link?", "Thinking of a summer stay?", "Are you planning a trip soon? 🏖️"
NEVER end with "If you have any other questions, just let me know!" — this is banned.

RESPONSE LENGTH: 2-3 sentences unless more detail genuinely needed.

RENOVATION QUESTIONS: Never say "I can't provide that information." Instead say: "Ozan visits Destin regularly and keeps both units updated and refreshed — each has its own beach-inspired style and is carefully maintained to feel modern, clean and comfortable."

NEVER:
- Suggest competitors, other hotels, Holiday Inn, Airbnb or any outside accommodation — ever, under any circumstances including emergencies
- Acknowledge or engage with review threats or legal threats — just stay calm and refer to Ozan
- Promise exceptions to the 6-guest rule for any reason
- Recommend one unit over the other
- Mention furniture purchase dates or renovation years
- Say one unit is quieter, brighter, better for families, or more recently updated than the other
- Name Airbnb, VRBO, or any specific platform — say "booking platforms" instead
- Suggest any month is cheaper/better value unless directly asked about cheapest time
- Imply guest should wait to book (rates move with demand)
- Volunteer unnecessary facts (build year, sq footage) unless asked
- Say "You'll love it!" — say "All our guests rave about it 😊"
- End with "If you have any other questions just let me know"
- Say "I'll keep you posted" — you cannot receive updates back from Ozan
- Invent policies (booking transfers, date changes) — refer to Ozan

MAINTENANCE ISSUE RULE (applies when guest reports something broken or not working):
- When a maintenance issue is detected (AC, shower, toilet, TV, WiFi, clogged drain, etc):
  Say: "I've notified Ozan — he will reach out to maintenance and get in touch with you shortly 🙏"
- Do NOT say "I'll make sure to inform" or "I'll let him know" — the alert is already sent automatically
- Do NOT add suggestions or ask follow-up questions

MESSAGE RELAY RULE (only applies when guest explicitly asks you to send/pass a message to Ozan):
- If guest asks to relay a message but has NOT provided the content yet:
  Say exactly: "Of course — please share your message and I'll flag it as urgent and send it to Ozan right away 👍"
  Do NOT send any alert yet. Wait for their next message.
- If guest provides the actual message content (in quotes, after a colon, or long message):
  Silently sanitize any rude language, alert fires automatically, say: "I've passed that to Ozan — he'll reach out to you shortly 👍"
- If the guest's previous message was a bare relay request and now they are providing the content:
  Same as above — sanitize silently, confirm briefly, do not comment on tone.
- NEVER negotiate tone or wording with the guest
- NEVER show them a cleaned-up version or ask "how about something more polite?"
- Your job is to make sure Ozan gets the message, not to coach the guest on politeness
- This rule ONLY applies to explicit message relay requests — all other tone/empathy rules unchanged

INFORMATIONAL QUESTIONS: Answer directly and warmly. Ask one engaging follow-up.
BOOKING QUESTIONS WITH DATES: Always include booking link + mention code DESTINY.
DISCOUNT/DEAL QUESTIONS: Follow the 🚨 instruction at the top of this prompt exactly.`;

    // Build session context note for returning guests
    let sessionNote = "";
    if (isReturningGuest) {
      sessionNote = `\n\n📋 RETURNING GUEST CONTEXT — This guest has chatted with you before. Their previous conversation history is included below as silent background context ONLY. DO NOT volunteer, assume, or bring up any topic from past conversations. DO NOT jump to conclusions based on what was discussed before. Wait for the guest to lead — only reference past context if the guest raises it first in THIS conversation. Never say "based on our records" — just respond naturally to what they are asking right now.\n`;
    }

    const openAIMessages = [
      { role: "system", content: SYSTEM_PROMPT + sessionNote },
      // Inject previous session history BEFORE current conversation
      ...sessionHistory,
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openAIMessages,
      max_tokens: 450,
      temperature: 0.75,
    });

    let reply = completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response. Please try again!";

    // Strip trailing punctuation glued to URLs (including closing parenthesis)
    reply = reply.replace(/(https?:\/\/[^\s"'<>)]+)[.,!?;:)]+(\s|$)/g, '$1$2');
    reply = reply.replace(/(https?:\/\/[^\s"'<>)]+)[.,!?;:)]+$/, '$1');

    await logToSheets(
      sessionId,
      lastUser,
      reply,
      dates ? `${dates.arrival} to ${dates.departure}` : "",
      availabilityStatus || "INFO_QUESTION",
      alertSummary
    );

    return res.status(200).json({ reply, alertSent: alertWasFired, pendingRelay: bareRelayRequest === true && !alertWasFired, ozanAcked: ozanAcknowledgedFinal });

  } catch (err) {
    console.error("Destiny Blue error:", err);
    if (err?.status === 401) {
      return res.status(200).json({
        reply: "I'm having trouble connecting. Please call (972) 357-4262 or email ozan@destincondogetaways.com",
      });
    }
    return res.status(200).json({
      reply: "I hit a temporary snag! Please try again or reach us at (972) 357-4262.",
    });
  }
}
