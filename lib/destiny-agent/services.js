// Destiny Blue v2 — external service adapters.
// All network operations are isolated here so orchestration and tests can inject mocks.

import { createSign, createHmac, timingSafeEqual } from "crypto";
import {
  BLOG_URLS,
  OWNER_CONTACT,
  STATE_COLUMN,
  UNITS,
  addIsoDays,
  isIsoDate,
  normalizeState,
  todayIso,
} from "./business.js";

const OWNERREZ_USER = "ozan@destincondogetaways.com";
const SESS_TAB = "ozanchat";

export const ACK_MESSAGES = Object.freeze({
  OZAN_ACK:        "Great news — Ozan has seen the alert and confirmed he is on it. He will reach out to you very shortly 🙏",
  MAINT_ONSITE:    "Great news — Ozan has opened a maintenance ticket and the onsite team will be in touch with you shortly 🙏",
  MAINT_OZAN:      "Great news — Ozan is personally handling this and will get in touch with you shortly 🙏",
  MAINT_EMERGENCY: "Ozan is calling you right now — please pick up! 🙏",
});
export const ACK_TYPES = Object.freeze(Object.keys(ACK_MESSAGES));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: options.signal || controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function createServices({ fetchImpl = globalThis.fetch, env = process.env, now = () => new Date(), logger = console } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");

  async function sendEmergencyDiscord(guestMessage, sessionId, reason = "Guest needs urgent assistance", alertType = "emergency", openIssues = []) {
    try {
      const token = env.DISCORD_BOT_TOKEN;
      const channelId = env.DISCORD_CHANNEL_ID;
      if (!token || !channelId) return { sent: false, reason: "missing_configuration" };

      // Kept byte-for-byte equivalent to the live v1 payload structure.
      const components = alertType === "maintenance" ? [{
        type: 1,
        components: [
          { type: 2, style: 1, label: "🔧 Onsite Ticket", custom_id: `maint_onsite_${sessionId || "unknown"}` },
          { type: 2, style: 3, label: "👨‍🔧 Ozan Handling", custom_id: `maint_ozan_${sessionId || "unknown"}` },
          { type: 2, style: 4, label: "🚨 Emergency", custom_id: `maint_emergency_${sessionId || "unknown"}` },
        ]
      }] : [{
        type: 1,
        components: [{
          type: 2, style: 3, label: "🫡 I'm on it",
          custom_id: `ozanack_${sessionId || "unknown"}`,
        }]
      }];

      const issueLines = openIssues.length > 0
        ? "\n\n📋 **Open issues this session:**\n" + openIssues.map((iss, i) => `  ${i + 1}. ${iss}`).join("\n")
        : "";

      const msg = {
        content: `🚨 **ALERT — CHECK YOUR PHONE OZAN** 🚨\n\n${reason}\n\n**Guest message:** "${String(guestMessage || "").substring(0, 300)}"\n**Session:** ${sessionId || "unknown"}${issueLines}\n\n⚡ Please call or text the guest immediately!`,
        components,
      };

      const response = await fetchWithTimeout(fetchImpl, `https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(msg),
      }, 8000);
      if (!response.ok) {
        logger.error("Emergency Discord error:", response.status, await response.text());
        return { sent: false, reason: `http_${response.status}` };
      }
      logger.log("Emergency Discord alert sent ✅");
      return { sent: true };
    } catch (err) {
      logger.error("Emergency Discord error:", err.message);
      return { sent: false, reason: err.message };
    }
  }

  async function sendOwnerChatInvite({ sessionId, guestMessage, inviteToken }) {
    try {
      const token = env.DISCORD_BOT_TOKEN;
      const channelId = env.DISCORD_CHANNEL_ID;
      if (!token || !channelId || !sessionId || !inviteToken) return { sent: false, reason: "missing_configuration" };
      const enterChatUrl = `https://destin-concierge-new.vercel.app/ozan?s=${encodeURIComponent(sessionId)}&t=${encodeURIComponent(inviteToken)}`;
      const response = await fetchWithTimeout(fetchImpl, `https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🙋 **GUEST WANTS TO CHAT**\n\n💬 **Guest wants to talk:** "${String(guestMessage || "").substring(0, 300)}"\n**Session:** ${sessionId}\n\nTap below to enter the live chat 👇`,
          components: [{
            type: 1,
            components: [{ type: 2, style: 5, label: "💬 Enter Chat", url: enterChatUrl }]
          }]
        }),
      }, 8000);
      return response.ok ? { sent: true, enterChatUrl } : { sent: false, reason: `http_${response.status}` };
    } catch (error) {
      logger.error("Owner chat invite failed:", error.message);
      return { sent: false, reason: error.message };
    }
  }

  async function fetchDestinWeather() {
    try {
      const apiKey = env.GOOGLE_WEATHER_API_KEY;
      if (!apiKey) return { status: "unavailable", reason: "missing_configuration", forecast: [] };
      const url = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${encodeURIComponent(apiKey)}&location.latitude=30.3935&location.longitude=-86.4958&days=7&languageCode=en-US&unitsSystem=IMPERIAL`;
      const res = await fetchWithTimeout(fetchImpl, url, {}, 8000);
      if (!res.ok) return { status: "unavailable", reason: `http_${res.status}`, forecast: [] };
      const data = await res.json();
      const days = Array.isArray(data?.forecastDays) ? data.forecastDays : [];
      const forecast = days.flatMap(day => {
        const year = Number(day?.date?.year);
        const month = Number(day?.date?.month);
        const dateDay = Number(day?.date?.day);
        const hiRaw = Number(day?.maxTemperature?.degrees);
        const loRaw = Number(day?.minTemperature?.degrees);
        if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(dateDay)
          || !Number.isFinite(hiRaw) || !Number.isFinite(loRaw)) return [];
        const date = `${year}-${String(month).padStart(2,"0")}-${String(dateDay).padStart(2,"0")}`;
        if (!isIsoDate(date)) return [];
        const rainRaw = Number(day?.precipitationProbability);
        const rain = Number.isFinite(rainRaw)
          ? Math.max(0, Math.min(100, Math.round(rainRaw <= 1 ? rainRaw * 100 : rainRaw)))
          : 0;
        return [{
          date,
          hi: Math.round(hiRaw),
          lo: Math.round(loRaw),
          rain,
          desc: day?.daytimeForecast?.weatherCondition?.description?.text || day?.condition?.description?.text || "mixed",
        }];
      });
      return { status: forecast.length ? "success" : "unavailable", forecast, checkedAt: now().toISOString() };
    } catch (error) {
      logger.error("Google Weather fetch error:", error.message);
      return { status: "unavailable", reason: error.message, forecast: [] };
    }
  }

  async function fetchBlogContent(topic) {
    try {
      const url = BLOG_URLS[topic];
      if (!url) return { status: "invalid_topic", topic, content: null, url: null };
      if (topic === "itinerary") return { status: "success", topic, content: "Interactive AI trip planner for Destin vacations.", url };
      const response = await fetchWithTimeout(fetchImpl, url, { headers: { "User-Agent": "DestinyBlue/2.0" } }, 8000);
      if (!response.ok) return { status: "unavailable", topic, content: null, url };
      const html = await response.text();
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 3500);
      return { status: text ? "success" : "unavailable", topic, content: text || null, url, checkedAt: now().toISOString() };
    } catch (error) {
      logger.error("Blog fetch error:", error.message);
      return { status: "unavailable", topic, content: null, url: BLOG_URLS[topic] || null, reason: error.message };
    }
  }

  async function fetchGuestBooking(bookingId) {
    try {
      const token = env.OWNERREZ_API_TOKEN;
      if (!token || !bookingId) return null;
      const credentials = Buffer.from(`${OWNERREZ_USER}:${token}`).toString("base64");
      const url = `https://api.ownerrez.com/v2/bookings/${encodeURIComponent(bookingId)}`;
      const response = await fetchWithTimeout(fetchImpl, url, {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "DestinyBlue/2.0",
        },
      }, 9000);
      if (!response.ok) return null;
      const b = await response.json();
      const status = String(b.status || "").toLowerCase();
      if (b.is_block || status === "canceled" || status === "cancelled") return null;
      if (!isIsoDate(b.arrival) || !isIsoDate(b.departure) || b.departure <= b.arrival) return null;
      const todayDate = new Date(`${todayIso(now())}T00:00:00`);
      const arrival = new Date(`${b.arrival}T00:00:00`);
      const departure = new Date(`${b.departure}T00:00:00`);
      const daysUntilArrival = Math.ceil((arrival - todayDate) / 86400000);
      const isCheckedIn = todayDate >= arrival && todayDate < departure;
      const isCheckedOut = todayDate >= departure;
      const showDoorCode = !isCheckedOut && (isCheckedIn || daysUntilArrival <= 7);
      const doorCode = showDoorCode && b.door_codes?.length > 0 ? b.door_codes[0].code : null;
      const fmtDate = d => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const propertyId = String(b.property?.id ?? b.property_id ?? "");
      const propertyName = String(b.property?.name || "");
      const unit = propertyId === UNITS["707"].propertyId || /\b707\b/.test(propertyName)
        ? "707"
        : propertyId === UNITS["1006"].propertyId || /\b1006\b/.test(propertyName)
          ? "1006"
          : null;
      // Booking links are authorized only for the two owned condos. Never map an
      // unknown OwnerRez property to Unit 1006 by default.
      if (!unit) return null;
      return {
        bookingId: String(bookingId),
        guestFirstName: b.guest?.first_name || null,
        guestLastName: b.guest?.last_name || null,
        unit,
        propertyName: propertyName || `Unit ${unit}`,
        arrival: b.arrival,
        departure: b.departure,
        arrivalFmt: fmtDate(b.arrival),
        departureFmt: fmtDate(b.departure),
        checkIn: b.check_in || "16:00",
        checkOut: b.check_out || "10:00",
        nights: Math.ceil((departure - arrival) / 86400000),
        doorCode,
        showDoorCode,
        daysUntilArrival,
        isCheckedIn,
        isCheckedOut,
        adults: b.adults,
        children: b.children,
        status: b.status,
      };
    } catch (error) {
      logger.error("fetchGuestBooking error:", error.message);
      return null;
    }
  }

  async function checkAvailability(propertyId, arrival, departure, retries = 2) {
    if (!propertyId || !isIsoDate(arrival) || !isIsoDate(departure) || departure <= arrival) return null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const token = env.OWNERREZ_API_TOKEN;
        if (!token) return null;
        const credentials = Buffer.from(`${OWNERREZ_USER}:${token}`).toString("base64");
        const since = new Date(now());
        since.setFullYear(since.getFullYear() - 1);
        const url = `https://api.ownerrez.com/v2/bookings?property_ids=${encodeURIComponent(propertyId)}&since_utc=${encodeURIComponent(since.toISOString())}&status=active`;
        const response = await fetchWithTimeout(fetchImpl, url, {
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "DestinyBlue/2.0",
          },
        }, 9000);
        if (!response.ok) {
          if (attempt < retries) { await sleep(800); continue; }
          return null;
        }
        const data = await response.json();
        const hasItems = data && Object.prototype.hasOwnProperty.call(data, "items");
        const hasBookings = data && Object.prototype.hasOwnProperty.call(data, "bookings");
        if (!hasItems && !hasBookings) return null;
        const bookings = hasItems ? data.items : data.bookings;
        if (!Array.isArray(bookings)) return null;
        const requestArrival = new Date(`${arrival}T12:00:00Z`);
        const requestDeparture = new Date(`${departure}T12:00:00Z`);
        let hasConflict = false;
        for (const booking of bookings) {
          const status = String(booking?.status || "").toLowerCase();
          if (status === "cancelled" || status === "canceled") continue;
          const bookingArrivalRaw = booking?.arrival || booking?.check_in || booking?.arrivalDate;
          const bookingDepartureRaw = booking?.departure || booking?.check_out || booking?.departureDate;
          if (!isIsoDate(bookingArrivalRaw) || !isIsoDate(bookingDepartureRaw) || bookingDepartureRaw <= bookingArrivalRaw) {
            // Active malformed records must make availability unknown, never open.
            return null;
          }
          const bookingArrival = new Date(`${bookingArrivalRaw}T12:00:00Z`);
          const bookingDeparture = new Date(`${bookingDepartureRaw}T12:00:00Z`);
          if (bookingArrival < requestDeparture && bookingDeparture > requestArrival) {
            hasConflict = true;
            break;
          }
        }
        return !hasConflict;
      } catch (error) {
        logger.error(`OwnerRez fetch error (attempt ${attempt}):`, error.message);
        if (attempt < retries) { await sleep(800); continue; }
        return null;
      }
    }
    return null;
  }

  async function checkBothUnits(arrival, departure) {
    const [available707, available1006] = await Promise.all([
      checkAvailability(UNITS["707"].propertyId, arrival, departure),
      checkAvailability(UNITS["1006"].propertyId, arrival, departure),
    ]);
    return { "707": available707, "1006": available1006 };
  }

  async function fetchCalendarAlternatives(arrival, departure) {
    try {
      const response = await fetchWithTimeout(fetchImpl, `https://destin-concierge-new.vercel.app/api/calendar?arrival=${encodeURIComponent(arrival)}&departure=${encodeURIComponent(departure)}`, {}, 9000);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      logger.error("Calendar alternatives error:", error.message);
      return null;
    }
  }

  async function findOpenWindows({ targetArrival, targetDeparture, flexibilityDays = 7, minNights = null }) {
    if (!isIsoDate(targetArrival) || !isIsoDate(targetDeparture) || targetDeparture <= targetArrival) return [];
    const requestedNightsRaw = minNights == null ? null : Number(minNights);
    if (requestedNightsRaw != null && (!Number.isInteger(requestedNightsRaw) || requestedNightsRaw < 1 || requestedNightsRaw > 60)) return [];
    const requestedNights = requestedNightsRaw || Math.max(1, Math.round((new Date(`${targetDeparture}T12:00:00Z`) - new Date(`${targetArrival}T12:00:00Z`)) / 86400000));
    const maxFlex = Math.min(Math.max(Number(flexibilityDays) || 7, 0), 30);
    const offsets = [0];
    for (let i = 1; i <= maxFlex; i++) offsets.push(-i, i);
    const candidates = offsets.map(offset => ({
      arrival: addIsoDays(targetArrival, offset),
      departure: addIsoDays(targetArrival, offset + requestedNights),
      offsetDays: offset,
    })).filter(c => c.arrival >= todayIso(now()));

    // Bound concurrency to four windows at a time to protect OwnerRez latency/rate limits.
    const results = [];
    for (let i = 0; i < candidates.length; i += 4) {
      const batch = candidates.slice(i, i + 4);
      const batchResults = await Promise.all(batch.map(async candidate => ({
        ...candidate,
        units: await checkBothUnits(candidate.arrival, candidate.departure),
      })));
      results.push(...batchResults);
      if (results.filter(r => r.units["707"] === true || r.units["1006"] === true).length >= 5) break;
    }
    return results.filter(r => r.units["707"] === true || r.units["1006"] === true).slice(0, 5);
  }

  async function addBrevoContact(email, firstName) {
    try {
      const apiKey = env.BREVO_API_KEY;
      if (!apiKey) return { captured: false, reason: "missing_configuration" };
      const res = await fetchWithTimeout(fetchImpl, "https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          email,
          attributes: { FIRSTNAME: firstName || "" },
          listIds: [5],
          updateEnabled: true,
        }),
      }, 8000);
      if (res.status === 201 || res.status === 204) return { captured: true };
      return { captured: false, reason: `http_${res.status}`, body: await res.text() };
    } catch (error) {
      logger.error("Brevo error:", error.message);
      return { captured: false, reason: error.message };
    }
  }

  async function fetchPriceDrops(arrival, departure) {
    try {
      const response = await fetchWithTimeout(fetchImpl, `https://destin-concierge-new.vercel.app/api/price-drops?arrival=${encodeURIComponent(arrival)}&departure=${encodeURIComponent(departure)}`, {}, 5000);
      if (!response.ok) return { status: "unavailable", drops: [] };
      const data = await response.json();
      const drops = [];
      for (const unit of ["707", "1006"]) {
        const item = data?.[unit];
        if (!item) continue;
        const dropPct = Number(item.dropPct);
        const windowDays = Number(item.windowDays);
        const fromPrice = Number(item.fromPrice);
        const toPrice = Number(item.toPrice);
        if (Number.isFinite(dropPct) && dropPct >= 5 && dropPct <= 60
          && Number.isFinite(windowDays) && windowDays >= 1 && windowDays <= 60
          && Number.isFinite(fromPrice) && Number.isFinite(toPrice) && fromPrice > toPrice && toPrice > 0) {
          drops.push({ unit, dropPct, windowDays, fromPrice, toPrice });
        }
      }
      return { status: "success", drops, checkedAt: now().toISOString() };
    } catch (error) {
      return { status: "unavailable", drops: [], reason: error.message };
    }
  }

  async function runAdminPriceSnapshot() {
    try {
      const snapRes = await fetchWithTimeout(fetchImpl, "https://destin-concierge-new.vercel.app/api/price-snapshot", {
        method: "GET",
        headers: { "x-cron-secret": env.CRON_SECRET },
      }, 15000);
      if (!snapRes.ok) return { success: false, reason: `http_${snapRes.status}` };
      const snapData = await snapRes.json();
      if (!snapData || typeof snapData !== "object") return { success: false, reason: "invalid_response" };
      if (snapData.success) {
        try {
          const revalidate = await fetchWithTimeout(fetchImpl, "https://deals.destincondogetaways.com/api/revalidate-deals", {
            method: "POST",
            headers: { "x-revalidate-secret": env.CRON_SECRET },
          }, 10000);
          if (!revalidate.ok) logger.error("[REVALIDATE] beach-deals revalidation failed:", `http_${revalidate.status}`);
        } catch (error) {
          logger.error("[REVALIDATE] beach-deals revalidation failed:", error.message);
        }
      }
      return snapData;
    } catch (error) {
      logger.error("Price snapshot failed:", error.message);
      return { success: false, reason: error.message };
    }
  }

  async function getSheetsToken(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const rawKey = env.GOOGLE_PRIVATE_KEY;
        if (!email || !rawKey) return null;
        const privateKey = rawKey.replace(/\\n/g, "\n").trim();
        const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
        const timestamp = Math.floor(now().getTime() / 1000);
        const claim = Buffer.from(JSON.stringify({
          iss: email,
          scope: "https://www.googleapis.com/auth/spreadsheets",
          aud: "https://oauth2.googleapis.com/token",
          exp: timestamp + 3600,
          iat: timestamp,
        })).toString("base64url");
        const sign = createSign("RSA-SHA256");
        sign.update(`${header}.${claim}`);
        const signature = sign.sign(privateKey, "base64url");
        const jwt = `${header}.${claim}.${signature}`;
        const tokenRes = await fetchWithTimeout(fetchImpl, "https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
        }, 8000);
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) return tokenData.access_token;
        throw new Error("No access token in response");
      } catch (error) {
        logger.error(`getSheetsToken attempt ${attempt} failed:`, error.message);
        if (attempt < retries) await sleep(attempt === 1 ? 1000 : 1500);
      }
    }
    return null;
  }

  async function readSessState(sessionId) {
    try {
      const sheetId = env.GOOGLE_SHEET_ID;
      if (!sessionId || !sheetId) return null;
      const token = await getSheetsToken();
      if (!token) return null;
      const res = await fetchWithTimeout(fetchImpl, `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SESS_TAB}!A:${STATE_COLUMN}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, 8000);
      if (!res.ok) return null;
      const data = await res.json();
      const rows = data.values || [];
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] !== sessionId) continue;
        let v2State = null;
        let ozanMessages = [];
        try { v2State = rows[i][7] ? normalizeState(JSON.parse(rows[i][7])) : null; } catch (_) {}
        try { ozanMessages = rows[i][3] ? JSON.parse(rows[i][3]) : []; } catch (_) { ozanMessages = []; }
        if (!Array.isArray(ozanMessages)) ozanMessages = [];
        return {
          rowIndex: i + 1,
          ozanAcked: rows[i][1] === "TRUE",
          ozanActive: rows[i][2] || "FALSE",
          ozanMessages,
          ozanAckType: rows[i][5] || null,
          inviteToken: rows[i][6] || null,
          v2State,
        };
      }
      return null;
    } catch (error) {
      logger.error("readSessState:", error.message);
      return null;
    }
  }

  async function writeSessState(sessionId, updates, existingToken) {
    try {
      const sheetId = env.GOOGLE_SHEET_ID;
      if (!sessionId || !sheetId) return { ok: false, reason: "missing_session_or_sheet" };
      const token = existingToken || await getSheetsToken();
      if (!token) return { ok: false, reason: "auth_failed" };
      const readRes = await fetchWithTimeout(fetchImpl, `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SESS_TAB}!A:${STATE_COLUMN}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, 8000);
      let rowIndex = null;
      let existing = null;
      if (readRes.ok) {
        const rows = (await readRes.json()).values || [];
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] === sessionId) {
            rowIndex = i + 1;
            let v2State = null;
            let ozanMessages = [];
            try { v2State = rows[i][7] ? normalizeState(JSON.parse(rows[i][7])) : null; } catch (_) {}
            try { ozanMessages = rows[i][3] ? JSON.parse(rows[i][3]) : []; } catch (_) { ozanMessages = []; }
            if (!Array.isArray(ozanMessages)) ozanMessages = [];
            existing = {
              ozanAcked: rows[i][1] === "TRUE",
              ozanActive: rows[i][2] || "FALSE",
              ozanMessages,
              ozanAckType: rows[i][5] || null,
              inviteToken: rows[i][6] || null,
              v2State,
            };
            break;
          }
        }
      }
      const merged = {
        ozanAcked: existing?.ozanAcked ?? false,
        ozanActive: existing?.ozanActive ?? "FALSE",
        ozanMessages: existing?.ozanMessages ?? [],
        ozanAckType: existing?.ozanAckType ?? null,
        inviteToken: existing?.inviteToken ?? "",
        v2State: existing?.v2State ?? null,
        ...updates,
      };
      const row = [
        sessionId,
        merged.ozanAcked ? "TRUE" : "FALSE",
        merged.ozanActive,
        JSON.stringify(merged.ozanMessages),
        now().toISOString(),
        merged.ozanAckType || "",
        merged.inviteToken || "",
        merged.v2State ? JSON.stringify(normalizeState(merged.v2State)) : "",
      ];
      const url = rowIndex
        ? `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SESS_TAB}!A${rowIndex}:${STATE_COLUMN}${rowIndex}?valueInputOption=USER_ENTERED`
        : `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SESS_TAB}!A1:append?valueInputOption=USER_ENTERED`;
      const response = await fetchWithTimeout(fetchImpl, url, {
        method: rowIndex ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row] }),
      }, 8000);
      return { ok: response.ok, rowIndex, status: response.status };
    } catch (error) {
      logger.error("writeSessState exception:", error.message);
      return { ok: false, reason: error.message };
    }
  }

  async function loadSession(sessionId) {
    try {
      if (!sessionId || !env.GOOGLE_SHEET_ID) return { history: [], ozanAckType: null, ackDeliveredToGuest: false, openIssues: [], ackedIssues: [] };
      const accessToken = await getSheetsToken();
      if (!accessToken) return { history: [], ozanAckType: null, ackDeliveredToGuest: false, openIssues: [], ackedIssues: [] };
      const sheetRes = await fetchWithTimeout(fetchImpl, `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/Sheet1!A:H`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }, 8000);
      if (!sheetRes.ok) return { history: [], ozanAckType: null, ackDeliveredToGuest: false, openIssues: [], ackedIssues: [] };
      const rows = ((await sheetRes.json()).values || []).filter(row => row[1] === sessionId);
      let ozanAckType = null;
      let ackDeliveredToGuest = false;
      let priorIssueAcked = false;
      let openIssues = [];
      let ackedIssues = [];
      const messages = [];
      for (const row of rows) {
        const ackType = row[7];
        const colF = row[5] || "";
        const colG = row[6] || "";
        const guestMsg = row[2] || "";
        const assistantMsg = row[3] || "";
        const isFollowUpMsg = /any update|any news|heard.*back|anything yet|still waiting|did.*ozan|ozan.*call|anything|any word|update me|following up/i.test(guestMsg);
        const isNewIssueRow = guestMsg && assistantMsg && !isFollowUpMsg && (colF === "MAINTENANCE" || colF === "EMERGENCY");
        if (isNewIssueRow && priorIssueAcked) {
          ozanAckType = null;
          ackDeliveredToGuest = false;
          priorIssueAcked = false;
          openIssues = [];
        }
        if (colG && colG.startsWith("{")) {
          try {
            const parsed = JSON.parse(colG);
            if (Array.isArray(parsed.issues)) openIssues = parsed.issues;
          } catch (_) {}
        }
        if (colF.startsWith("ACK_CONFIRMED")) ackDeliveredToGuest = true;
        if (ACK_TYPES.includes(ackType)) {
          ozanAckType = ackType;
          priorIssueAcked = true;
          ackedIssues = [...openIssues];
          openIssues = [];
          if (ACK_MESSAGES[ackType]) messages.push({ role: "assistant", content: ACK_MESSAGES[ackType] });
        } else if (guestMsg && assistantMsg) {
          messages.push({ role: "user", content: guestMsg });
          messages.push({ role: "assistant", content: assistantMsg });
        }
      }
      return { history: messages.slice(-20), ozanAckType, ackDeliveredToGuest, openIssues, ackedIssues };
    } catch (error) {
      logger.error("loadSession error:", error.message);
      return { history: [], ozanAckType: null, ackDeliveredToGuest: false, openIssues: [], ackedIssues: [] };
    }
  }

  async function logToSheets(sessionId, guestMessage, destinyReply, datesAsked, availabilityStatus, alertSummary = "") {
    try {
      const sheetId = env.GOOGLE_SHEET_ID;
      if (!sheetId) return { ok: false, reason: "missing_configuration" };
      const accessToken = await getSheetsToken();
      if (!accessToken) return { ok: false, reason: "auth_failed" };
      const timestamp = now().toLocaleString("en-US", { timeZone: "America/Chicago" });
      const row = [timestamp, sessionId || "", guestMessage, destinyReply, datesAsked || "", availabilityStatus || "", alertSummary];
      const sheetRes = await fetchWithTimeout(fetchImpl, `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row] }),
      }, 8000);
      return { ok: sheetRes.ok, status: sheetRes.status };
    } catch (error) {
      logger.error("Google Sheets logging error:", error.message);
      return { ok: false, reason: error.message };
    }
  }

  function verifyGuestLinkSignature(bookingId, signature) {
    const secret = env.GUEST_LINK_SECRET;
    if (!secret) return { ok: true, legacy: true };
    if (!bookingId || !signature) return { ok: false, reason: "missing_signature" };
    const expected = createHmac("sha256", secret).update(String(bookingId)).digest("base64url");
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(String(signature));
      return a.length === b.length && timingSafeEqual(a, b) ? { ok: true, legacy: false } : { ok: false, reason: "invalid_signature" };
    } catch (_) {
      return { ok: false, reason: "invalid_signature" };
    }
  }

  return {
    sendEmergencyDiscord,
    sendOwnerChatInvite,
    fetchDestinWeather,
    fetchBlogContent,
    fetchGuestBooking,
    checkAvailability,
    checkBothUnits,
    fetchCalendarAlternatives,
    findOpenWindows,
    addBrevoContact,
    fetchPriceDrops,
    runAdminPriceSnapshot,
    getSheetsToken,
    readSessState,
    writeSessState,
    loadSession,
    logToSheets,
    verifyGuestLinkSignature,
  };
}
