// Destiny Blue v2 â€” external service adapters.
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
const DESTIN_FIRE_FLAGS_URL = "https://www.destinfire.gov/today-s-warning-condition-beach-flags";
const NWS_SURF_PRODUCTS_URL = "https://api.weather.gov/products/types/SRF/locations/MOB";
const NWS_OKALOOSA_ALERTS_URL = "https://api.weather.gov/alerts/active?zone=FLZ206";
const NWS_HEADERS = Object.freeze({ "User-Agent": "DestinyBlue/3.0 ozan@destincondogetaways.com", Accept: "application/geo+json" });

export const ACK_MESSAGES = Object.freeze({
  OZAN_ACK:        "Great news â€” Ozan has seen the alert and confirmed he is on it. He will reach out to you very shortly ðŸ™",
  MAINT_ONSITE:    "Great news â€” Ozan has opened a maintenance ticket and the onsite team will be in touch with you shortly ðŸ™",
  MAINT_OZAN:      "Great news â€” Ozan is personally handling this and will get in touch with you shortly ðŸ™",
  MAINT_EMERGENCY: "Ozan is calling you right now â€” please pick up! ðŸ™",
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
          { type: 2, style: 1, label: "ðŸ”§ Onsite Ticket", custom_id: `maint_onsite_${sessionId || "unknown"}` },
          { type: 2, style: 3, label: "ðŸ‘¨â€ðŸ”§ Ozan Handling", custom_id: `maint_ozan_${sessionId || "unknown"}` },
          { type: 2, style: 4, label: "ðŸš¨ Emergency", custom_id: `maint_emergency_${sessionId || "unknown"}` },
        ]
      }] : [{
        type: 1,
        components: [{
          type: 2, style: 3, label: "ðŸ«¡ I'm on it",
          custom_id: `ozanack_${sessionId || "unknown"}`,
        }]
      }];

      const issueLines = openIssues.length > 0
        ? "\n\nðŸ“‹ **Open issues this session:**\n" + openIssues.map((iss, i) => `  ${i + 1}. ${iss}`).join("\n")
        : "";

      const msg = {
        content: `ðŸš¨ **ALERT â€” CHECK YOUR PHONE OZAN** ðŸš¨\n\n${reason}\n\n**Guest message:** "${String(guestMessage || "").substring(0, 300)}"\n**Session:** ${sessionId || "unknown"}${issueLines}\n\nâš¡ Please call or text the guest immediately!`,
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
      logger.log("Emergency Discord alert sent âœ…");
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
          content: `ðŸ™‹ **GUEST WANTS TO CHAT**\n\nðŸ’¬ **Guest wants to talk:** "${String(guestMessage || "").substring(0, 300)}"\n**Session:** ${sessionId}\n\nTap below to enter the live chat ðŸ‘‡`,
          components: [{
            type: 1,
            components: [{ type: 2, style: 5, label: "ðŸ’¬ Enter Chat", url: enterChatUrl }]
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
      // The legacy production endpoint already uses GOOGLE_MAPS_KEY for the
      // Google Weather API. Keep the dedicated name as an optional override,
      // but inherit the deployed key so Agent v3 has integration parity.
      const apiKey = env.GOOGLE_WEATHER_API_KEY || env.GOOGLE_MAPS_KEY;
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

  async function fetchBeachConditions() {
    const checkedAt = now().toISOString();
    const flag = { status: "unavailable", value: null, source: DESTIN_FIRE_FLAGS_URL };
    const surf = { status: "unavailable", issuedAt: null, ripCurrentRisk: null, surfHeight: null, waterTemperature: null, weather: null, winds: null, source: null };
    const alerts = { status: "unavailable", items: [], source: NWS_OKALOOSA_ALERTS_URL };

    await Promise.all([
      (async () => {
        try {
          const response = await fetchWithTimeout(fetchImpl, DESTIN_FIRE_FLAGS_URL, { headers: { "User-Agent": NWS_HEADERS["User-Agent"] } }, 8000);
          if (!response.ok) { flag.reason = `http_${response.status}`; return; }
          const html = await response.text();
          const match = html.match(/<h3[^>]*>\s*Current Status:\s*([^<]+)<\/h3>/i);
          const value = String(match?.[1] || "").replace(/&amp;/gi, "&").trim();
          const allowed = ["Water Closed to Public", "High Hazard", "Medium Hazard", "Low Hazard", "Dangerous Marine Life"];
          if (!allowed.includes(value)) { flag.reason = "unrecognized_status"; return; }
          flag.status = "success";
          flag.value = value;
        } catch (error) { flag.reason = error.name === "AbortError" ? "timeout" : error.message; }
      })(),
      (async () => {
        try {
          const listResponse = await fetchWithTimeout(fetchImpl, NWS_SURF_PRODUCTS_URL, { headers: NWS_HEADERS }, 8000);
          if (!listResponse.ok) { surf.reason = `list_http_${listResponse.status}`; return; }
          const list = await listResponse.json();
          const latest = Array.isArray(list?.["@graph"]) ? list["@graph"][0] : null;
          if (!latest?.id) { surf.reason = "missing_product"; return; }
          const productResponse = await fetchWithTimeout(fetchImpl, `https://api.weather.gov/products/${encodeURIComponent(latest.id)}`, { headers: NWS_HEADERS }, 8000);
          if (!productResponse.ok) { surf.reason = `product_http_${productResponse.status}`; return; }
          const product = await productResponse.json();
          const text = String(product?.productText || "");
          const zoneStart = text.search(/FLZ202-204-206-/i);
          if (zoneStart < 0) { surf.reason = "okaloosa_section_missing"; return; }
          const zoneText = text.slice(zoneStart);
          const todayMatch = zoneText.match(/\.TODAY\.\.\.([\s\S]*?)(?=\n\.TONIGHT|\n\.MONDAY|\n\.TUESDAY|\n\.WEDNESDAY|\n\.THURSDAY|\n\.FRIDAY|\n\.SATURDAY|\n\.SUNDAY|\n\.EXTENDED|\n&&)/i);
          const today = todayMatch?.[1] || "";
          const field = label => today.match(new RegExp(`${label}\\*?\\.*\\s*([^\\n]+)`, "i"))?.[1]?.trim() || null;
          surf.status = today ? "success" : "unavailable";
          surf.reason = today ? null : "today_section_missing";
          surf.issuedAt = latest.issuanceTime || null;
          surf.ripCurrentRisk = field("Rip Current Risk");
          surf.surfHeight = field("Surf Height");
          surf.waterTemperature = field("Water Temperature");
          surf.weather = field("Weather");
          surf.winds = field("Winds");
          surf.source = latest["@id"] || `https://api.weather.gov/products/${latest.id}`;
        } catch (error) { surf.reason = error.name === "AbortError" ? "timeout" : error.message; }
      })(),
      (async () => {
        try {
          const response = await fetchWithTimeout(fetchImpl, NWS_OKALOOSA_ALERTS_URL, { headers: NWS_HEADERS }, 8000);
          if (!response.ok) { alerts.reason = `http_${response.status}`; return; }
          const data = await response.json();
          const relevant = /rip current|high surf|beach hazard|coastal flood|tropical storm|hurricane|storm surge/i;
          alerts.items = (Array.isArray(data?.features) ? data.features : []).flatMap(feature => {
            const properties = feature?.properties || {};
            if (!relevant.test(String(properties.event || ""))) return [];
            return [{ event: properties.event || null, severity: properties.severity || null, urgency: properties.urgency || null, headline: properties.headline || null, effective: properties.effective || null, expires: properties.expires || null, url: feature.id || properties["@id"] || null }];
          });
          alerts.status = "success";
        } catch (error) { alerts.reason = error.name === "AbortError" ? "timeout" : error.message; }
      })(),
    ]);

    const availableSources = [flag.status, surf.status, alerts.status].filter(status => status === "success").length;
    return { status: availableSources === 3 ? "success" : availableSources > 0 ? "partial" : "unavailable", checkedAt, flag, surf, alerts };
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
      if (!isIsoDate(b.arrival) || !isIsoDateÛŽ¶¶‰žËkºwµçyÁÕÍ  ¸¸¹‰…Ñ¡I•ÍÕ±ÑÌ¤ì4(€€€€€¥˜€¡É•ÍÕ±ÑÌ¹™¥±Ñ•È¡È€ôøÈ¹Õ¹¥ÑÍlˆÜÀÜ‰t€ôôôÑÉÕ”ñðÈ¹Õ¹¥ÑÍlˆÄÀÀØ‰t€ôôôÑÉÕ”¤¹±•¹Ñ €øô€Ô¤‰É•…¬ì4(€€€ô4(€€€É•ÑÕÉ¸É•ÍÕ±ÑÌ¹™¥±Ñ•È¡È€ôøÈ¹Õ¹¥ÑÍlˆÜÀÜ‰t€ôôôÑÉÕ”ñðÈ¹Õ¹¥ÑÍlˆÄÀÀØ‰t€ôôôÑÉÕ”¤¹Í±¥” À°€Ô¤ì4(€ô4(4(€…Íå¹Œ™Õ¹Ñ¥½¸…‘‘	É•Ù½½¹Ñ…Ð¡•µ…¥°°™¥ÉÍÑ9…µ”¤ì4(€€€ÑÉäì4(€€€€€½¹ÍÐ…Á¥-•ä€ô•¹Ø¹	IY=}A%}-dì4(€€€€€¥˜€ ……Á¥-•ä¤É•ÑÕÉ¸ì…ÁÑÕÉ•è™…±Í”°É•…Í½¸è€‰µ¥ÍÍ¥¹}½¹™¥ÕÉ…Ñ¥½¸ˆôì4(€€€€€½¹ÍÐÉ•Ì€ô…Ý…¥Ð™•Ñ¡]¥Ñ¡Q¥µ•½ÕÐ¡™•Ñ¡%µÁ°°€‰¡ÑÑÁÌè¼½…Á¤¹‰É•Ù¼¹½´½ØÌ½½¹Ñ…ÑÌˆ°ì4(€€€€€€€µ•Ñ¡½è€‰A=MPˆ°4(€€€€€€€¡•…‘•ÉÌèì€‰½¹Ñ•¹ÐµQåÁ”ˆè€‰…ÁÁ±¥…Ñ¥½¸½©Í½¸ˆ°€‰…Á¤µ­•äˆè…Á¥-•äô°4(€€€€€€€‰½‘äè)M=8¹ÍÑÉ¥¹¥™ä¡ì4(€€€€€€€€€•µ…¥°°4(€€€€€€€€€…ÑÑÉ¥‰ÕÑ•Ìèì%IMQ95è™¥ÉÍÑ9…µ”ñð€ˆˆô°4(€€€€€€€€€±¥ÍÑ%‘ÌèlÕt°4(€€€€€€€€€ÕÁ‘…Ñ•¹…‰±•èÑÉÕ”°4(€€€€€€€ô¤°4(€€€€€ô°€àÀÀÀ¤ì4(€€€€€¥˜€¡É•Ì¹ÍÑ…ÑÕÌ€ôôô€ÈÀÄñðÉ•Ì¹ÍÑ…ÑÕÌ€ôôô€ÈÀÐ¤É•ÑÕÉ¸ì…ÁÑÕÉ•èÑÉÕ”ôì4(€€€€€É•ÑÕÉ¸ì…ÁÑÕÉ•è™…±Í”°É•…Í½¸è¡ÑÑÁ|‘íÉ•Ì¹ÍÑ…ÑÕÍõ€°‰½‘äè…Ý…¥ÐÉ•Ì¹Ñ•áÐ ¤ôì4(€€€ô…Ñ €¡•ÉÉ½È¤ì4(€€€€€±½•È¹•ÉÉ½È ‰	É•Ù¼•ÉÉ½Èèˆ°•ÉÉ½È¹µ•ÍÍ…”¤ì4(€€€€€É•ÑÕÉ¸ì…ÁÑÕÉ•è™…±Í”°É•…Í½¸è•ÉÉ½È¹µ•ÍÍ…”ôì4(€€€ô4(€ô4(4(€…Íå¹Œ™Õ¹Ñ¥½¸™•Ñ¡AÉ¥•É½ÁÌ¡…ÉÉ¥Ù…°°‘•Á…ÉÑÕÉ”¤ì4(€€€ÑÉäì4(€€€€€½¹ÍÐÉ•ÍÁ½¹Í”€ô…Ý…¥Ð™•Ñ¡]¥Ñ¡Q¥µ•½ÕÐ¡™•Ñ¡%µÁ°°¡ÑÑÁÌè¼½‘•ÍÑ¥¸µ½¹¥•É”µ¹•Ü¹Ù•É•°¹…ÁÀ½…Á¤½ÁÉ¥”µ‘É½ÁÌý…ÉÉ¥Ù…°ô‘í•¹½‘•UI%½µÁ½¹•¹Ð¡…ÉÉ¥Ù…°¥ô™‘•Á…ÉÑÕÉ”ô‘í•¹½‘•UI%½µÁ½¹•¹Ð¡‘•Á…ÉÑÕÉ”¥õ€°íô°€ÔÀÀÀ¤ì4(€€€€€¥˜€ …É•ÍÁ½¹Í”¹½¬¤É•ÑÕÉ¸ìÍÑ…ÑÕÌè€‰Õ¹…Ù…¥±…‰±”ˆ°‘É½ÁÌèmtôì4(€€€€€½¹ÍÐ‘…Ñ„€ô…Ý…¥ÐÉ•ÍÁ½¹Í”¹©Í½¸ ¤ì4(€€€€€½¹ÍÐ‘É½ÁÌ€ômtì4(€€€€€™½È€¡½¹ÍÐÕ¹¥Ð½˜lˆÜÀÜˆ°€ˆÄÀÀØ‰t¤ì4(€€€€€€€½¹ÍÐ¥Ñ•´€ô‘…Ñ„ü¹mÕ¹¥Ñtì4(€€€€€€€¥˜€ …¥Ñ•´¤½¹Ñ¥¹Õ”ì4(€€€€€€€½¹ÍÐ‘É½ÁAÐ€ô9Õµ‰•È¡¥Ñ•´¹‘É½ÁAÐ¤ì4(€€€€€€€½¹ÍÐÝ¥¹‘½Ý…åÌ€ô9Õµ‰•È¡¥Ñ•´¹Ý¥¹‘½Ý…åÌ¤ì4(€€€€€€€½¹ÍÐ™É½µAÉ¥”€ô9Õµ‰•È¡¥Ñ•´¹™É½µAÉ¥”¤ì4(€€€€€€€½¹ÍÐÑ½AÉ¥”€ô9Õµ‰•È¡¥Ñ•´¹Ñ½AÉ¥”¤ì4(€€€€€€€¥˜€¡9Õµ‰•È¹¥Í¥¹¥Ñ”¡‘É½ÁAÐ¤€˜˜‘É½ÁAÐ€øô€Ô€˜˜‘É½ÁAÐ€ðô€ØÀ4(€€€€€€€€€€˜˜9Õµ‰•È¹¥Í¥¹¥Ñ”¡Ý¥¹‘½Ý…åÌ¤€˜˜Ý¥¹‘½Ý…åÌ€øô€Ä€˜˜Ý¥¹‘½Ý…åÌ€ðô€ØÀ4(€€€€€€€€€€˜˜9Õµ‰•È¹¥Í¥¹¥Ñ”¡™É½µAÉ¥”¤€˜˜9Õµ‰•È¹¥Í¥¹¥Ñ”¡Ñ½AÉ¥”¤€˜˜™É½µAÉ¥”€øÑ½AÉ¥”€˜˜Ñ½AÉ¥”€ø€À¤ì4(€€€€€€€€€‘É½ÁÌ¹ÁÕÍ ¡ìÕ¹¥Ð°‘É½ÁAÐ°Ý¥¹‘½Ý…åÌ°™É½µAÉ¥”°Ñ½AÉ¥”ô¤ì4(€€€€€€€ô4(€€€€€ô4(€€€€€É•ÑÕÉ¸ìÍÑ…ÑÕÌè€‰ÍÕ•ÍÌˆ°‘É½ÁÌ°¡•­•‘Ðè¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤ôì4(€€€ô…Ñ €¡•ÉÉ½È¤ì4(€€€€€É•ÑÕÉ¸ìÍÑ…ÑÕÌè€‰Õ¹…Ù…¥±…‰±”ˆ°‘É½ÁÌèmt°É•…Í½¸è•ÉÉ½È¹µ•ÍÍ…”ôì4(€€€ô4(€ô4(4(€…Íå¹Œ™Õ¹Ñ¥½¸ÉÕ¹‘µ¥¹AÉ¥•M¹…ÁÍ¡½Ð ¤ì4(€€€ÑÉäì4(€€€€€½¹ÍÐÍ¹…ÁI•Ì€ô…Ý…¥Ð™•Ñ¡]¥Ñ¡Q¥µ•½ÕÐ¡™•Ñ¡%µÁ°°€‰¡ÑÑÁÌè¼½‘•ÍÑ¥¸µ½¹¥•É”µ¹•Ü¹Ù•É•°¹…ÁÀ½…Á¤½ÁÉ¥”µÍ¹…ÁÍ¡½Ðˆ°ì4(€€€€€€€µ•Ñ¡½è€‰Pˆ°4(€€€€€€€¡•…‘•ÉÌèì€‰àµÉ½¸µÍ•É•Ðˆè•¹Ø¹I=9}MIPô°4(€€€€€ô°€ÄÔÀÀÀ¤ì4(€€€€€¥˜€ …Í¹…ÁI•Ì¹½¬¤É•ÑÕÉ¸ìÍÕ•ÍÌè™…±Í”°É•…Í½¸è¡ÑÑÁ|‘íÍ¹…ÁI•Ì¹ÍÑ…ÑÕÍõ€ôì4(€€€€€½¹ÍÐÍ¹…Á…Ñ„€ô…Ý…¥ÐÍ¹…ÁI•Ì¹©Í½¸ ¤ì4(€€€€€¥˜€ …Í¹…Á…Ñ„ñðÑåÁ•½˜Í¹…Á…Ñ„€„ôô€‰½‰©•Ðˆ¤É•ÑÕÉ¸ìÍÕ•ÍÌè™…±Í”°É•…Í½¸è€‰¥¹Ù…±¥‘}É•ÍÁ½¹Í”ˆôì4(€€€€€¥˜€¡Í¹…Á…Ñ„¹ÍÕ•ÍÌ¤ì4(€€€€€€€ÑÉäì4(€€€€€€€€€½¹ÍÐÉ•Ù…±¥‘…Ñ”€ô…Ý…¥Ð™•Ñ¡]¥Ñ¡Q¥µ•½ÕÐ¡™•Ñ¡%µÁ°°€‰¡ÑÑÁÌè¼½‘•…±Ì¹‘•ÍÑ¥¹½¹‘½•Ñ…Ý…åÌ¹½´½…Á¤½É•Ù…±¥‘…Ñ”µ‘•…±Ìˆ°ì4(€€€€€€€€€€€µ•Ñ¡½è€‰A=MPˆ°4(€€€€€€€€€€€¡•…‘•ÉÌèì€‰àµÉ•Ù…±¥‘…Ñ”µÍ•É•Ðˆè•¹Ø¹I=9}MIPô°4(€€€€€€€€€ô°€ÄÀÀÀÀ¤ì4(€€€€€€€€€¥˜€ …É•Ù…±¥‘…Ñ”¹½¬¤±½•È¹•ÉÉ½È ‰mIY1%Qt‰•… µ‘•…±ÌÉ•Ù…±¥‘…Ñ¥½¸™…¥±•èˆ°¡ÑÑÁ|‘íÉ•Ù…±¥‘…Ñ”¹ÍÑ…ÑÕÍõ€¤ì4(€€€€€€€ô…Ñ €¡•ÉÉ½È¤ì4(€€€€€€€€€±½•È¹•ÉÉ½È ‰mIY1%Qt‰•… µ‘•…±ÌÉ•Ù…±¥‘…Ñ¥½¸™…¥±•èˆ°•ÉÉ½È¹µ•ÍÍ…”¤ì4(€€€€€€€ô4(€€€€€ô4(€€€€€É•ÑÕÉ¸Í¹…Á…Ñ„ì4(€€€ô…Ñ €¡•ÉÉ½È¤ì4(€€€€€±½•È¹•ÉÉ½È ‰AÉ¥”Í¹…ÁÍ¡½Ð™…¥±•èˆ°•ÉÉ½È¹µ•ÍÍ…”¤ì4(€€€€€É•ÑÕÉ¸ìÍÕ•ÍÌè™…±Í”°É•…Í½¸è•ÉÉ½È¹µ•ÍÍ…”ôì4(€€€ô4(€ô4(4(€…Íå¹Œ™Õ¹Ñ¥½¸•ÑM¡••ÑÍQ½­•¸¡É•ÑÉ¥•Ì€ô€Ì¤ì4(€€€™½È€¡±•Ð…ÑÑ•µÁÐ€ô€Äì…ÑÑ•µÁÐ€ðôÉ•ÑÉ¥•Ìì…ÑÑ•µÁÐ¬¬¤ì4(€€€€€ÑÉäì4(€€€€€€€½¹ÍÐ•µ…¥°€ô•¹Ø¹==1}MIY%}=U9Q}5%0ì4(€€€€€€€½¹ÍÐÉ…Ý-•ä€ô•¹Ø¹==1}AI%YQ}-dì4(€€€€€€€¥˜€ …•µ…¥°ñð€…É…Ý-•ä¤É•ÑÕÉ¸¹Õ±°ì4(€€€€€€€½¹ÍÐÁÉ¥Ù…Ñ•-•ä€ôÉ…Ý-•ä¹É•Á±…” ½qq¸½œ°€‰q¸ˆ¤¹ÑÉ¥´ ¤ì4(€€€€€€€½¹ÍÐ¡•…‘•È€ô	Õ™™•È¹™É½´¡)M=8¹ÍÑÉ¥¹¥™ä¡ì…±œè€‰ILÈÔØˆ°ÑåÀè€‰)]Pˆô¤¤¹Ñ½MÑÉ¥¹œ ‰‰…Í”ØÑÕÉ°ˆ¤ì4(€€€€€€€½¹ÍÐÑ¥µ•ÍÑ…µÀ€ô5…Ñ ¹™±½½È¡¹½Ü ¤¹•ÑQ¥µ” ¤€¼€ÄÀÀÀ¤ì4(€€€€€€€½¹ÍÐ±…¥´€ô	Õ™™•È¹™É½´¡)M=8¹ÍÑÉ¥¹¥™ä¡ì4(€€€€€€€€€¥ÍÌè•µ…¥°°4(€€€€€€€€€Í½Á”è€‰¡ÑÑÁÌè¼½ÝÝÜ¹½½±•…Á¥Ì¹½´½…ÕÑ ½ÍÁÉ•…‘Í¡••ÑÌˆ°4(€€€€€€€€€…Õè€‰¡ÑÑÁÌè¼½½…ÕÑ È¹½½±•…Á¥Ì¹½´½Ñ½­•¸ˆ°4(€€€€€€€€€•áÀèÑ¥µ•ÍÑ…µÀ€¬€ÌØÀÀ°4(€€€€€€€€€¥…ÐèÑ¥µ•ÍÑ…µÀ°4(€€€€€€€ô¤¤¹Ñ½MÑÉ¥¹œ ‰‰…Í”ØÑÕÉ°ˆ¤ì4(€€€€€€€½¹ÍÐÍ¥¸€ôÉ•…Ñ•M¥¸ ‰IMµM!ÈÔØˆ¤ì4(€€€€€€€Í¥¸¹ÕÁ‘…Ñ”¡€‘í¡•…‘•Éô¸‘í±…¥µõ€¤ì4(€€€€€€€½¹ÍÐÍ¥¹…ÑÕÉ”€ôÍ¥¸¹Í¥¸¡ÁÉ¥Ù…Ñ•-•ä°€‰‰…Í”ØÑÕÉ°ˆ¤ì4(€€€€€€€½¹ÍÐ©ÝÐ€ô€‘í¡•…‘•Éô¸‘í±…¥µô¸‘íÍ¥¹…ÑÕÉ•õ€ì4(€€€€€€€½¹ÍÐÑ½­•¹I•Ì€ô…Ý…¥Ð™•Ñ¡]¥Ñ¡Q¥µ•½ÕÐ¡™•Ñ¡%µÁ°°€‰¡ÑÑÁÌè¼½½…ÕÑ È¹½½±•…Á¥Ì¹½´½Ñ½­•¸ˆ°ì4(€€€€€€€€€µ•Ñ¡½è€‰A=MPˆ°4(€€€€€€€€€¡•…‘•ÉÌèì€‰½¹Ñ•¹ÐµQåÁ”ˆè€‰…ÁÁ±¥…Ñ¥½¸½àµÝÝÜµ™½É´µÕÉ±•¹½‘•ˆô°4(€€€€€€€€€‰½‘äèÉ…¹Ñ}ÑåÁ”õÕÉ¸”Í¥•Ñ˜”ÍÁ…É…µÌ”Í½…ÕÑ ”ÍÉ…¹ÐµÑåÁ””Í©ÝÐµ‰•…É•È™…ÍÍ•ÉÑ¥½¸ô‘í©ÝÑõ€°4(€€€€€€€ô°€àÀÀÀ¤ì4(€€€€€€€½¹ÍÐÑ½­•¹…Ñ„€ô…Ý…¥ÐÑ½­•¹I•Ì¹©Í½¸ ¤ì4(€€€€€€€¥˜€¡Ñ½­•¹…Ñ„¹…•ÍÍ}Ñ½­•¸¤É•ÑÕÉ¸Ñ½­•¹…Ñ„¹…•ÍÍ}Ñ½­•¸ì4(€€€€€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰9¼…•ÍÌÑ½­•¸¥¸É•ÍÁ½¹Í”ˆ¤ì4(€€€€€ô…Ñ €¡•ÉÉ½È¤ì4(€€€€€€€±½•È¹•ÉÉ½È¡•ÑM¡••ÑÍQ½­•¸…ÑÑ•µÁÐ€‘í…ÑÑ•µÁÑô™…¥±•é€°•ÉÉ½È¹µ•ÍÍ…”¤ì4(€€€€€€€¥˜€¡…ÑÑ•µÁÐ€ðÉ•ÑÉ¥•Ì¤…Ý…¥ÐÍ±••À¡…ÑÑ•µÁÐ€ôôô€Ä€ü€ÄÀÀÀ€è€ÄÔÀÀ¤ì4(€€€€€ô4(€€€ô4(€€€É•ÑÕÉ¸¹Õ±°ì4(€ô4(4(€…Íå¹Œ™Õ¹Ñ¥½¸É•…‘M•ÍÍMÑ…Ñ”¡Í•ÍÍ¥½¹%¤ì4(€€€ÑÉäì4(€€€€€½¹ÍÐÍ¡••Ñ%€ô•¹Ø¹==1}M!Q}%ì4(€€€€€¥˜€ …Í•ÍÍ¥½¹%ñð€…Í¡••Ñ%¤É•ÑÕÉ¸¹Õ±°ì4(€€€€€½¹ÍÐÑ½­•¸€ô…Ý…¥Ð•ÑM¡••ÑÍQ½­•¸ ¤ì4(€€€€€¥˜€ …Ñ½­•¸¤É•ÑÕÉ¸¹Õ±°ì4(€€€€€½¹ÍÐÉ•Ì€ô…Ý…¥Ð™•Ñ¡]¥Ñ¡Q¥µ•½ÕÐ¡™•Ñ¡%µÁ°°¡ÑÑÁÌè¼½Í¡••ÑÌ¹½½±•…Á¥Ì¹½´½ØÐ½ÍÁÉ•…‘Í¡••ÑÌ¼‘íÍ¡••Ñ%‘ô½Ù…±Õ•Ì¼‘íMMM}Q	ô…è‘íMQQ}=1U59õ€°ì4(€€€€€€€¡•…‘•ÉÌèìÕÑ¡½É¥é…Ñ¥½¸è	•…É•È€‘íÑ½­•¹õ€ô°4(€€€€€ô°€àÀÀÀ¤ì4(€€€€€¥˜€ …É•Ì¹½¬¤É•ÑÕÉ¸¹Õ±°ì4(€€€€€½¹ÍÐ‘…Ñ„€ô…Ý…¥ÐÉ•Ì¹©Í½¸ ¤ì4(€€€€€½¹ÍÐÉ½ÝÌ€ô‘…Ñ„¹Ù…±Õ•Ìñðmtì4(€€€€€™½È€¡±•Ð¤€ô€Äì¤€ðÉ½ÝÌ¹±•¹Ñ ì¤¬¬¤ì4(€€€€€€€¥˜€¡É½ÝÍm¥ulÁt€„ôôÍ•ÍÍ¥½¹%¤½¹Ñ¥¹Õ”ì4(€€€€€€€±•ÐØÉMÑ…Ñ”€ô¹Õ±°ì4(€€€€€€€±•Ð½é…¹5•ÍÍ…•Ì€ômtì4(€€€€€€€ÑÉäìØÉMÑ…Ñ”€ôÉ½ÝÍm¥ulÝt€ü¹½Éµ…±¥é•MÑ…Ñ”¡)M=8¹Á…ÉÍ”¡É½ÝÍm¥ulÝt¤¤€è¹Õ±°ìô…Ñ €¡|¤íô4(€€€€€€€ÑÉäì½é…¹5•ÍÍ…•Ì€ôÉ½ÝÍm¥ulÍt€ü)M=8¹Á…ÉÍ”¡É½ÝÍm¥ulÍt¤€èmtìô…Ñ €¡|¤ì½é…¹5•ÍÍ…•Ì€ômtìô4(€€€€€€€¥˜€ …ÉÉ…ä¹¥ÍÉÉ…ä¡½é…¹5•ÍÍ…•Ì¤¤½é…¹5•ÍÍ…•Ì€ômtì4(€€€€€€€É•ÑÕÉ¸ì4(€€€€€€€€€É½Ý%¹‘•àè¤€¬€Ä°4(€€€€€€€€€½é…¹­•èÉ½ÝÍm¥ulÅt€ôôô€‰QIUˆ°4(€€€€€€€€€½é…¹Ñ¥Ù”èÉ½ÝÍm¥ulÉtñð€‰1Mˆ°4(€€€€€€€€€½é…¹5•ÍÍ…•Ì°4(€€€€€€€€€½é…¹­QåÁ”èÉ½ÝÍm¥ulÕtñð¹Õ±°°4(€€€€€€€€€¥¹Ù¥Ñ•Q½­•¸èÉ½ÝÍm¥ulÙtñð¹Õ±°°4(€€€€€€€€€ØÉMÑ…Ñ”°4(€€€€€€€ôì4(€€€€€ô4(€€€€€É•ÑÕÉ¸¹Õ±°ì4(€€€ô…Ñ €¡•ÉÉ½È¤ì4(€€€€€±½•È¹•ÉÉ½È ‰É•…‘M•ÍÍMÑ…Ñ”èˆ°•ÉÉ½È¹µ•ÍÍ…”¤ì4(€€€€€É•ÑÕÉ¸¹Õ±°ì4(€€€ô4(€ô4(4(€…Íå¹Œ™Õ¹Ñ¥½¸ÝÉ¥Ñ•M•ÍÍMÑ…Ñ”¡Í•ÍÍ¥½¹%°ÕÁ‘…Ñ•Ì°•á¥ÍÑ¥¹Q½­•¸¤ì4(€€€ÑÉäì4(€€€€€½¹ÍÐÍ¡••Ñ%€ô•¹Ø¹==1}M!Q}%ì4(€€€€€¥˜€ …Í•ÍÍ¥½¹%ñð€…Í¡••Ñ%¤É•ÑÕÉ¸ì½¬è™…±Í”°É•…Í½¸è€‰µ¥ÍÍ¥¹}Í•ÍÍ¥½¹}½É}Í¡••Ðˆôì4(€€€€€½¹ÍÐÑ½­•¸€ô•á¥ÍÑ¥¹Q½­•¸ñð…Ý…¥Ð•ÑM¡••ÑÍQ½­•¸ ¤ì4(€€€€€¥˜€ …Ñ½­•¸¤É•ÑÕÉ¸ì½¬è™…±Í”°É•…Í½¸è€‰…ÕÑ¡}™…¥±•ˆôì4(€€€€€½¹ÍÐÉ•…‘I•Ì€ô…Ý…¥Ð™•Ñ¡]¥Ñ¡Q¥µ•½ÕÐ¡™•Ñ¡%µÁ°°¡ÑÑÁÌè¼½Í¡••ÑÌ¹½½±•…Á¥Ì¹½´½ØÐ½ÍÁÉ•…‘Í¡••ÑÌ¼‘íÍ¡••Ñ%‘ô½Ù…±Õ•Ì¼‘íMMM}Q	ô…è‘íMQQ}=1U59õ€°ì4(€€€€€€€¡•…‘•ÉÌèìÕÑ¡½É¥é…Ñ¥½¸è	•…É•È€‘íÑ½­•¹õ€ô°4(€€€€€ô°€àÀÀÀ¤ì4(€€€€€±•ÐÉ½Ý%¹‘•à€ô¹Õ±°ì4(€€€€€±•Ð•á¥ÍÑ¥¹œ€ô¹Õ±°ì4(€€€€€¥˜€¡É•…‘I•Ì¹½¬¤ì4(€€€€€€€½¹ÍÐÉ½ÝÌ€ô€¡…Ý…¥ÐÉ•…‘I•Ì¹©Í½¸ ¤¤¹Ù…±Õ•Ìñðmtì4(€€€€€€€™½È€¡±•Ð¤€ô€Äì¤€ðÉ½ÝÌ¹±•¹Ñ ì¤¬¬¤ì4(€€€€€€€€€¥˜€¡É½ÝÍm¥ulÁt€ôôôÍ•ÍÍ¥½¹%¤ì4(€€€€€€€€€€€É½Ý%¹‘•à€ô¤€¬€Äì4(€€€€€€€€€€€±•ÐØÉMÑ…Ñ”€ô¹Õ±°ì4(€€€€€€€€€€€±•Ð½é…¹5•ÍÍ…•Ì€ômtì4(€€€€€€€€€€€ÑÉäìØÉMÑ…Ñ”€ôÉ½ÝÍm¥ulÝt€ü¹½Éµ…±¥é•MÑ…Ñ”¡)M=8¹Á…ÉÍ”¡É½ÝÍm¥ulÝt¤¤€è¹Õ±°ìô…Ñ €¡|¤íô4(€€€€€€€€€€€ÑÉäì½é…¹5•ÍÍ…•Ì€ôÉ½ÝÍm¥ulÍt€ü)M=8¹Á…ÉÍ”¡É½ÝÍm¥ulÍt¤€èmtìô…Ñ €¡|¤ì½é…¹5•ÍÍ…•Ì€ômtìô4(€€€€€€€€€€€¥˜€ …ÉÉ…ä¹¥ÍÉÉ…ä¡½é…¹5•ÍÍ…•Ì¤¤½é…¹5•ÍÍ…•Ì€ômtì4(€€€€€€€€€€€•á¥ÍÑ¥¹œ€ôì4(€€€€€€€€€€€€€½é…¹­•èÉ½ÝÍm¥ulÅt€ôôô€‰QIUˆ°4(€€€€€€€€€€€€€½é…¹Ñ¥Ù”èÉ½ÝÍm¥ulÉtñð€‰1Mˆ°4(€€€€€€€€€€€€€½é…¹5•ÍÍ…•Ì°4(€€€€€€€€€€€€€½é…¹­QåÁ”èÉ½ÝÍm¥ulÕtñð¹Õ±°°4(€€€€€€€€€€€€€¥¹Ù¥Ñ•Q½­•¸èÉ½ÝÍm¥ulÙtñð¹Õ±°°4(€€€€€€€€€€€€€ØÉMÑ…Ñ”°4(€€€€€€€€€€€ôì4(€€€€€€€€€€€‰É•…¬ì4(€€€€€€€€€ô4(€€€€€€€ô4(€€€€€ô4(€€€€€½¹ÍÐµ•É•€ôì4(€€€€€€€½é…¹­•è•á¥ÍÑ¥¹œü¹½é…¹­•€üü™…±Í”°4(€€€€€€€½é…¹Ñ¥Ù”è•á¥ÍÑ¥¹œü¹½é…¹Ñ¥Ù”€üü€‰1Mˆ°4(€€€€€€€½é…¹5•ÍÍ…•Ìè•á¥ÍÑ¥¹œü¹½é…¹5•ÍÍ…•Ì€üümt°4(€€€€€€€½é…¹­QåÁ”è•á¥ÍÑ¥¹œü¹½é…¹­QåÁ”€üü¹Õ±°°4(€€€€€€€¥¹Ù¥Ñ•Q½­•¸è•á¥ÍÑ¥¹œü¹¥¹Ù¥Ñ•Q½­•¸€üü€ˆˆ°4(€€€€€€€ØÉMÑ…Ñ”è•á¥ÍÑ¥¹œü¹ØÉMÑ…Ñ”€üü¹Õ±°°4(€€€€€€€€¸¸¹ÕÁ‘…Ñ•Ì°4(€€€€€ôì4(€€€€€½¹ÍÐÉ½Ü€ôl4(€€€€€€€Í•ÍÍ¥½¹%°4(€€€€€€€µ•É•¹½é…¹­•€ü€‰QIUˆ€è€‰1Mˆ°4(€€€€€€€µ•É•¹½é…¹Ñ¥Ù”°4(€€€€€€€)M=8¹ÍÑÉ¥¹¥™ä¡µ•É•¹½é…¹5•ÍÍ…•Ì¤°4(€€€€€€€¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤°4(€€€€€€€µ•É•¹½é…¹­QåÁ”ñð€ˆˆ°4(€€€€€€€µ•É•¹¥¹Ù¥Ñ•Q½­•¸ñð€ˆˆ°4(€€€€€€€µ•É•¹ØÉMÑ…Ñ”€ü)M=8¹ÍÑÉ¥¹¥™ä¡¹½Éµ…±¥é•MÑ…Ñ”¡µ•É•¹ØÉMÑ…Ñ”¤¤€è€ˆˆ°4(€€€€€tì4(€€€€€½¹ÍÐÕÉ°€ôÉ½Ý%¹‘•à4(€€€€€€€€ü¡ÑÑÁÌè¼½Í¡••ÑÌ¹½½±•…Á¥Ì¹½´½ØÐ½ÍÁÉ•…‘Í¡••ÑÌ¼‘íÍ¡••Ñ%‘ô½Ù…±Õ•Ì¼‘íMMM}Q	ô…‘íÉ½Ý%¹‘•áôè‘íMQQ}=1U59ô‘íÉ½Ý%¹‘•áôýÙ…±Õ•%¹ÁÕÑ=ÁÑ¥½¸õUMI}9QI€4(€€€€€€€€è¡ÑÑÁÌè¼½Í¡••ÑÌ¹½½±•…Á¥Ì¹½´½ØÐ½ÍÁÉ•…‘Í¡••ÑÌ¼‘íÍ¡••Ñ%‘ô½Ù…±Õ•Ì¼‘íMMM}Q	ô…Äé…ÁÁ•¹ýÙ…±Õ•%¹ÁÕÑ=ÁÑ¥½¸õUMI}9QI€ì4(€€€€€½¹ÍÐÉ•ÍÁ½¹Í”€ô…Ý…¥Ð™•Ñ¡]¥Ñ¡Q¥µ•½ÕÐ¡™•Ñ¡%µÁ°°ÕÉ°°ì4(€€€€€€€µ•Ñ¡½èÉ½Ý%¹‘•à€ü€‰AUPˆ€è€‰A=MPˆ°4(€€€€€€€¡•…‘•ÉÌèìÕÑ¡½É¥é…Ñ¥½¸è	•…É•È€‘íÑ½­•¹õ€°€‰½¹Ñ•¹ÐµQåÁ”ˆè€‰…ÁÁ±¥…Ñ¥½¸½©Í½¸ˆô°4(€€€€€€€‰½‘äè)M=8¹ÍÑÉ¥¹¥™ä¡ìÙ…±Õ•ÌèmÉ½Ýtô¤°4(€€€€€ô°€àÀÀÀ¤ì4(€€€€€É•ÑÕÉ¸ì½¬èÉ•ÍÁ½¹Í”¹½¬°É½Ý%¹‘•à°ÍÑ…ÑÕÌèÉ•ÍÁ½¹Í”¹ÍÑ…ÑÕÌôì4(€€€ô…Ñ €¡•ÉÉ½È¤ì4(€€€€€±½•È¹•ÉÉ½È ‰ÝÉ¥Ñ•M•ÍÍMÑ…Ñ”•á•ÁÑ¥½¸èˆ°•ÉÉ½È¹µ•ÍÍ…”¤ì4(€€€€€É•ÑÕÉ¸ì½¬è™…±Í”°É•…Í½¸è•ÉÉ½È¹µ•ÍÍ…”ôì4(€€€ô4(€ô4(4(€…Íå¹Œ™Õ¹Ñ¥½¸±½…‘M•ÍÍ¥½¸¡Í•ÍÍ¥½¹%¤ì4(€€€ÑÉäì4(€€€€€¥˜€ …Í•ÍÍ¥½¹%ñð€…•¹Ø¹==1}M!Q}%¤É•ÑÕÉ¸ì¡¥ÍÑ½Éäèmt°½é…¹­QåÁ”è¹Õ±°°…­•±¥Ù•É•‘Q½Õ•ÍÐè™…±Í”°½Á•¹%ÍÍÕ•Ìèmt°…­•‘%ÍÍÕ•Ìèmtôì4(€€€€€½¹ÍÐ…•ÍÍQ½­•¸€ô…Ý…¥Ð•ÑM¡••ÑÍQ½­•¸ ¤ì4(€€€€€¥˜€ ……•ÍÍQ½­•¸¤É•ÑÕÉ¸ì¡¥ÍÑ½Éäèmt°½é…¹­QåÁ”è¹Õ±°°…­•±¥Ù•É•‘Q½Õ•ÍÐè™…±Í”°½Á•¹%ÍÍÕ•Ìèmt°…­•‘%ÍÍÕ•Ìèmtôì4(€€€€€½¹ÍÐÍ¡••ÑI•Ì€ô…Ý…¥Ð™•Ñ¡]¥Ñ¡Q¥µ•½ÕÐ¡™•Ñ¡%µÁ°°¡ÑÑÁÌè¼½Í¡••ÑÌ¹½½±•…Á¥Ì¹½´½ØÐ½ÍÁÉ•…‘Í¡••ÑÌ¼‘í•¹Ø¹==1}M!Q}%ô½Ù…±Õ•Ì½M¡••ÐÄ…é!€°ì4(€€€€€€€¡•…‘•ÉÌèìÕÑ¡½É¥é…Ñ¥½¸è	•…É•È€‘í…•ÍÍQ½­•¹õ€ô°4(€€€€€ô°€àÀÀÀ¤ì4(€€€€€¥˜€ …Í¡••ÑI•Ì¹½¬¤É•ÑÕÉ¸ì¡¥ÍÑ½Éäèmt°½é…¹­QåÁ”è¹Õ±°°…­•±¥Ù•É•‘Q½Õ•ÍÐè™…±Í”°½Á•¹%ÍÍÕ•Ìèmt°…­•‘%ÍÍÕ•Ìèmtôì4(€€€€€½¹ÍÐÉ½ÝÌ€ô€ ¡…Ý…¥ÐÍ¡••ÑI•Ì¹©Í½¸ ¤¤¹Ù…±Õ•Ìñðmt¤¹™¥±Ñ•È¡É½Ü€ôøÉ½ÝlÅt€ôôôÍ•ÍÍ¥½¹%¤ì4(€€€€€±•Ð½é…¹­QåÁ”€ô¹Õ±°ì4(€€€€€±•Ð…­•±¥Ù•É•‘Q½Õ•ÍÐ€ô™…±Í”ì4(€€€€€±•ÐÁÉ¥½É%ÍÍÕ•­•€ô™…±Í”ì4(€€€€€±•Ð½Á•¹%ÍÍÕ•Ì€ômtì4(€€€€€±•Ð…­•‘%ÍÍÕ•Ì€ômtì4(€€€€€½¹ÍÐµ•ÍÍ…•Ì€ômtì4(€€€€€™½È€¡½¹ÍÐÉ½Ü½˜É½ÝÌ¤ì4(€€€€€€€½¹ÍÐ…­QåÁ”€ôÉ½ÝlÝtì4(€€€€€€€½¹ÍÐ½±€ôÉ½ÝlÕtñð€ˆˆì4(€€€€€€€½¹ÍÐ½±€ôÉ½ÝlÙtñð€ˆˆì4(€€€€€€€½¹ÍÐÕ•ÍÑ5Íœ€ôÉ½ÝlÉtñð€ˆˆì4(€€€€€€€½¹ÍÐ…ÍÍ¥ÍÑ…¹Ñ5Íœ€ôÉ½ÝlÍtñð€ˆˆì4(€€€€€€€½¹ÍÐ¥Í½±±½ÝUÁ5Íœ€ô€½…¹äÕÁ‘…Ñ•ñ…¹ä¹•ÝÍñ¡•…É¸©‰…­ñ…¹åÑ¡¥¹œå•ÑñÍÑ¥±°Ý…¥Ñ¥¹ñ‘¥¸©½é…¹ñ½é…¸¸©…±±ñ…¹åÑ¡¥¹ñ…¹äÝ½É‘ñÕÁ‘…Ñ”µ•ñ™½±±½Ý¥¹œÕÀ½¤¹Ñ•ÍÐ¡Õ•ÍÑ5Íœ¤ì4(€€€€€€€½¹ÍÐ¥Í9•Ý%ÍÍÕ•I½Ü€ôÕ•ÍÑ5Íœ€˜˜…ÍÍ¥ÍÑ…¹Ñ5Íœ€˜˜€…¥Í½±±½ÝUÁ5Íœ€˜˜€¡½±€ôôô€‰5%9Q99ˆñð½±€ôôô€‰5I9dˆ¤ì4(€€€€€€€¥˜€¡¥Í9•Ý%ÍÍÕ•I½Ü€˜˜ÁÉ¥½É%ÍÍÕ•­•¤ì4(€€€€€€€€€½é…¹­QåÁ”€ô¹Õ±°ì4(€€€€€€€€€…­•±¥Ù•É•‘Q½Õ•ÍÐ€ô™…±Í”ì4(€€€€€€€€€ÁÉ¥½É%ÍÍÕ•­•€ô™…±Í”ì4(€€€€€€€€€½Á•¹%ÍÍÕ•Ì€ômtì4(€€€€€€€ô4(€€€€€€€¥˜€¡½±€˜˜½±¹ÍÑ…ÉÑÍ]¥Ñ  ‰ìˆ¤¤ì4(€€€€€€€€€ÑÉäì4(€€€€€€€€€€€½¹ÍÐÁ…ÉÍ•€ô)M=8¹Á…ÉÍ”¡½±¤ì4(€€€€€€€€€€€¥˜€¡ÉÉ…ä¹¥ÍÉÉ…ä¡Á…ÉÍ•¹¥ÍÍÕ•Ì¤¤½Á•¹%ÍÍÕ•Ì€ôÁ…ÉÍ•¹¥ÍÍÕ•Ìì4(€€€€€€€€€ô…Ñ €¡|¤íô4(€€€€€€€ô4(€€€€€€€¥˜€¡½±¹ÍÑ…ÉÑÍ]¥Ñ  ‰-}=9%I5ˆ¤¤…­•±¥Ù•É•‘Q½Õ•ÍÐ€ôÑÉÕ”ì4(€€€€€€€¥˜€¡-}QeAL¹¥¹±Õ‘•Ì¡…­QåÁ”¤¤ì4(€€€€€€€€€½é…¹­QåÁ”€ô…­QåÁ”ì4(€€€€€€€€€ÁÉ¥½É%ÍÍÕ•­•€ôÑÉÕ”ì4(€€€€€€€€€…­•‘%ÍÍÕ•Ì€ôl¸¸¹½Á•¹%ÍÍÕ•Ítì4(€€€€€€€€€½Á•¹%ÍÍÕ•Ì€ômtì4(€€€€€€€€€¥˜€¡-}5MMMm…­QåÁ•t¤µ•ÍÍ…•Ì¹ÁÕÍ ¡ìÉ½±”è€‰…ÍÍ¥ÍÑ…¹Ðˆ°½¹Ñ•¹Ðè-}5MMMm…­QåÁ•tô¤ì4(€€€€€€€ô•±Í”¥˜€¡Õ•ÍÑ5Íœ€˜˜…ÍÍ¥ÍÑ…¹Ñ5Íœ¤ì4(€€€€€€€€€µ•ÍÍ…•Ì¹ÁÕÍ ¡ìÉ½±”è€‰ÕÍ•Èˆ°½¹Ñ•¹ÐèÕ•ÍÑ5Íœô¤ì4(€€€€€€€€€µ•ÍÍ…•Ì¹ÁÕÍ ¡ìÉ½±”è€‰…ÍÍ¥ÍÑ…¹Ðˆ°½¹Ñ•¹Ðè…ÍÍ¥ÍÑ…¹Ñ5Íœô¤ì4(€€€€€€€ô4(€€€€€ô4(€€€€€É•ÑÕÉ¸ì¡¥ÍÑ½Éäèµ•ÍÍ…•Ì¹Í±¥” ´ÈÀ¤°½é…¹­QåÁ”°…­•±¥Ù•É•‘Q½Õ•ÍÐ°½Á•¹%ÍÍÕ•Ì°…­•‘%ÍÍÕ•Ìôì4(€€€ô…Ñ €¡•ÉÉ½È¤ì4(€€€€€±½•È¹•ÉÉ½È ‰±½…‘M•ÍÍ¥½¸•ÉÉ½Èèˆ°•ÉÉ½È¹µ•ÍÍ…”¤ì4(€€€€€É•ÑÕÉ¸ì¡¥ÍÑ½Éäèmt°½é…¹­QåÁ”è¹Õ±°°…­•±¥Ù•É•‘Q½Õ•ÍÐè™…±Í”°½Á•¹%ÍÍÕ•Ìèmt°…­•‘%ÍÍÕ•Ìèmtôì4(€€€ô4(€ô4(4(€…Íå¹Œ™Õ¹Ñ¥½¸±½Q½M¡••ÑÌ¡Í•ÍÍ¥½¹%°Õ•ÍÑ5•ÍÍ…”°‘•ÍÑ¥¹åI•Á±ä°‘…Ñ•ÍÍ­•°…Ù…¥±…‰¥±¥ÑåMÑ…ÑÕÌ°…±•ÉÑMÕµµ…Éä€ô€ˆˆ¤ì4(€€€ÑÉäì4(€€€€€½¹ÍÐÍ¡••Ñ%€ô•¹Ø¹==1}M!Q}%ì4(€€€€€¥˜€ …Í¡••Ñ%¤É•ÑÕÉ¸ì½¬è™…±Í”°É•…Í½¸è€‰µ¥ÍÍ¥¹}½¹™¥ÕÉ…Ñ¥½¸ˆôì4(€€€€€½¹ÍÐ…•ÍÍQ½­•¸€ô…Ý…¥Ð•ÑM¡••ÑÍQ½­•¸ ¤ì4(€€€€€¥˜€ ……•ÍÍQ½­•¸¤É•ÑÕÉ¸ì½¬è™…±Í”°É•…Í½¸è€‰…ÕÑ¡}™…¥±•ˆôì4(€€€€€½¹ÍÐÑ¥µ•ÍÑ…µÀ€ô¹½Ü ¤¹Ñ½1½…±•MÑÉ¥¹œ ‰•¸µULˆ°ìÑ¥µ•i½¹”è€‰µ•É¥„½¡¥…¼ˆô¤ì4(€€€€€½¹ÍÐÉ½Ü€ômÑ¥µ•ÍÑ…µÀ°Í•ÍÍ¥½¹%ñð€ˆˆ°Õ•ÍÑ5•ÍÍ…”°‘•ÍÑ¥¹åI•Á±ä°‘…Ñ•ÍÍ­•ñð€ˆˆ°…Ù…¥±…‰¥±¥ÑåMÑ…ÑÕÌñð€ˆˆ°…±•ÉÑMÕµµ…Éåtì4(€€€€€½¹ÍÐÍ¡••ÑI•Ì€ô…Ý…¥Ð™•Ñ¡]¥Ñ¡Q¥µ•½ÕÐ¡™•Ñ¡%µÁ°°¡ÑÑÁÌè¼½Í¡••ÑÌ¹½½±•…Á¥Ì¹½´½ØÐ½ÍÁÉ•…‘Í¡••ÑÌ¼‘íÍ¡••Ñ%‘ô½Ù…±Õ•Ì½M¡••ÐÄ…Äé…ÁÁ•¹ýÙ…±Õ•%¹ÁÕÑ=ÁÑ¥½¸õUMI}9QI€°ì4(€€€€€€€µ•Ñ¡½è€‰A=MPˆ°4(€€€€€€€¡•…‘•ÉÌèìÕÑ¡½É¥é…Ñ¥½¸è	•…É•È€‘í…•ÍÍQ½­•¹õ€°€‰½¹Ñ•¹ÐµQåÁ”ˆè€‰…ÁÁ±¥…Ñ¥½¸½©Í½¸ˆô°4(€€€€€€€‰½‘äè)M=8¹ÍÑÉ¥¹¥™ä¡ìÙ…±Õ•ÌèmÉ½Ýtô¤°4(€€€€€ô°€àÀÀÀ¤ì4(€€€€€É•ÑÕÉ¸ì½¬èÍ¡••ÑI•Ì¹½¬°ÍÑ…ÑÕÌèÍ¡••ÑI•Ì¹ÍÑ…ÑÕÌôì4(€€€ô…Ñ €¡•ÉÉ½È¤ì4(€€€€€±½•È¹•ÉÉ½È ‰½½±”M¡••ÑÌ±½¥¹œ•ÉÉ½Èèˆ°•ÉÉ½È¹µ•ÍÍ…”¤ì4(€€€€€É•ÑÕÉ¸ì½¬è™…±Í”°É•…Í½¸è•ÉÉ½È¹µ•ÍÍ…”ôì4(€€€ô4(€ô4(4(€™Õ¹Ñ¥½¸Ù•É¥™åÕ•ÍÑ1¥¹­M¥¹…ÑÕÉ”¡‰½½­¥¹%°Í¥¹…ÑÕÉ”¤ì4(€€€½¹ÍÐÍ•É•Ð€ô•¹Ø¹UMQ}1%9-}MIPì4(€€€¥˜€ …Í•É•Ð¤É•ÑÕÉ¸ì½¬èÑÉÕ”°±•…äèÑÉÕ”ôì4(€€€¥˜€ …‰½½­¥¹%ñð€…Í¥¹…ÑÕÉ”¤É•ÑÕÉ¸ì½¬è™…±Í”°É•…Í½¸è€‰µ¥ÍÍ¥¹}Í¥¹…ÑÕÉ”ˆôì4(€€€½¹ÍÐ•áÁ•Ñ•€ôÉ•…Ñ•!µ…Œ ‰Í¡„ÈÔØˆ°Í•É•Ð¤¹ÕÁ‘…Ñ”¡MÑÉ¥¹œ¡‰½½­¥¹%¤¤¹‘¥•ÍÐ ‰‰…Í”ØÑÕÉ°ˆ¤ì4(€€€ÑÉäì4(€€€€€½¹ÍÐ„€ô	Õ™™•È¹™É½´¡•áÁ•Ñ•¤ì4(€€€€€½¹ÍÐˆ€ô	Õ™™•È¹™É½´¡MÑÉ¥¹œ¡Í¥¹…ÑÕÉ”¤¤ì4(€€€€€É•ÑÕÉ¸„¹±•¹Ñ €ôôôˆ¹±•¹Ñ €˜˜Ñ¥µ¥¹M…™•ÅÕ…°¡„°ˆ¤€üì½¬èÑÉÕ”°±•…äè™…±Í”ô€èì½¬è™…±Í”°É•…Í½¸è€‰¥¹Ù…±¥‘}Í¥¹…ÑÕÉ”ˆôì4(€€€ô…Ñ €¡|¤ì4(€€€€€É•ÑÕÉ¸ì½¬è™…±Í”°É•…Í½¸è€‰¥¹Ù…±¥‘}Í¥¹…ÑÕÉ”ˆôì4(€€€ô4(€ô4(4(€É•ÑÕÉ¸ì4(€€€Í•¹‘µ•É•¹å¥Í½É°4(€€€Í•¹‘=Ý¹•É¡…Ñ%¹Ù¥Ñ”°4(€€€™•Ñ¡•ÍÑ¥¹]•…Ñ¡•È°(€€€™•Ñ¡	•…¡½¹‘¥Ñ¥½¹Ì°(€€€™•Ñ¡	±½½¹Ñ•¹Ð°4(€€€™•Ñ¡Õ•ÍÑ	½½­¥¹œ°4(€€€¡•­Ù…¥±…‰¥±¥Ñä°4(€€€¡•­	½Ñ¡U¹¥ÑÌ°4(€€€™•Ñ¡…±•¹‘…É±Ñ•É¹…Ñ¥Ù•Ì°4(€€€™¥¹‘=Á•¹]¥¹‘½ÝÌ°4(€€€…‘‘	É•Ù½½¹Ñ…Ð°4(€€€™•Ñ¡AÉ¥•É½ÁÌ°4(€€€ÉÕ¹‘µ¥¹AÉ¥•M¹…ÁÍ¡½Ð°4(€€€•ÑM¡••ÑÍQ½­•¸°4(€€€É•…‘M•ÍÍMÑ…Ñ”°4(€€€ÝÉ¥Ñ•M•ÍÍMÑ…Ñ”°4(€€€±½…‘M•ÍÍ¥½¸°4(€€€±½Q½M¡••ÑÌ°4(€€€Ù•É¥™åÕ•ÍÑ1¥¹­M¥¹…ÑÕÉ”°4(€ôì4)ô4(