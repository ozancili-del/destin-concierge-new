// lib/destiny/helpers.js
// Battle-tested functions COPIED VERBATIM from pages/api/chat.js (production v1).
// Per the rewrite brief §3.3: wrapped, not reimplemented. Do not "improve" logic here.
// The only changes vs v1: module exports, and consts hoisted so functions resolve.
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const OWNERREZ_USER = "ozan@destincondogetaways.com";
export const UNIT_707_PROPERTY_ID = "293722";
export const UNIT_1006_PROPERTY_ID = "410894";


// ─────────────────────────────────────────────────────────────────────────────
// Blog URL map - all slugs confirmed
// ─────────────────────────────────────────────────────────────────────────────
export const BLOG_URLS = {
  restaurants:  "https://www.destincondogetaways.com/blog/best-restaurants-destin",
  restaurants2: "https://www.destincondogetaways.com/blog/best-restaurants-destin-local-guide",
  beaches:      "https://www.destincondogetaways.com/blog/best-beaches-destin",
  activities:   "https://www.destincondogetaways.com/blog/destinocen",
  weather:      "https://www.destincondogetaways.com/blog/destinweather",
  events:       "https://www.destincondogetaways.com/blog/destin-events-2026",
  airport:      "https://www.destincondogetaways.com/blog/destinairport",
  romance:      "https://www.destincondogetaways.com/blog/destinromance",
  car:          "https://www.destincondogetaways.com/blog/destincar",
  spa:          "https://www.destincondogetaways.com/blog/destinspa",
  nightlife:    "https://www.destincondogetaways.com/blog/destin-live-music-2026",
  essentials:   "https://www.destincondogetaways.com/blog/destinessentials",
  kids:         "https://www.destincondogetaways.com/blog/destinkids",
  supermarkets: "https://www.destincondogetaways.com/blog/destinsupermarkets",
  history:      "https://www.destincondogetaways.com/blog/destindiversehistory",
  explore:      "https://www.destincondogetaways.com/blog/destinexplore",
  fireworks:    "https://www.destincondogetaways.com/blog/destin-fireworks-2026",
  besttime:     "https://www.destincondogetaways.com/blog/best-time-to-visit-destin-florida",
  itinerary:    "https://www.destincondogetaways.com/destin-vacation-itinerary-planner-574049367",
};

export async function sendEmergencyDiscord(guestMessage, sessionId, reason = "Guest needs urgent assistance", alertType = "emergency", openIssues = []) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!token || !channelId) return;

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

    // Build open issues list for bundled alerts
    const issueLines = openIssues.length > 0
      ? "\n\n📋 **Open issues this session:**\n" + openIssues.map((iss, i) => `  ${i + 1}. ${iss}`).join("\n")
      : "";

    const msg = {
      content: `🚨 **ALERT — CHECK YOUR PHONE OZAN** 🚨

${reason}

**Guest message:** "${guestMessage.substring(0, 300)}"
**Session:** ${sessionId || "unknown"}${issueLines}

⚡ Please call or text the guest immediately!`,
      components,
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

// ─────────────────────────────────────────────────────────────────────────────
// TripShock deep link builder
// ─────────────────────────────────────────────────────────────────────────────
export const TRIPSHOCK_BASE = "https://www.tripshock.com";
export const TRIPSHOCK_AFF  = "aff=destindreamcondo";
export const TRIPSHOCK_CATEGORIES = {
  dolphin:      "dolphin-cruises-and-tours",
  fishing:      "fishing-charters",
  jetski:       "jet-ski-rentals-tours",
  waverunner:   "jet-ski-rentals-tours",
  pontoon:      "boat-rentals",
  boat:         "boat-rentals",
  parasail:     "parasailing",
  crabisland:   "crab-island-tours-and-activities",
  snorkel:      "snorkeling-tours",
  sunset:       "sunset-cruises-tours",
  pirate:       "pirate-cruises",
  kayak:        "canoe-kayak-paddleboard-rentals",
  paddleboard:  "canoe-kayak-paddleboard-rentals",
  fireworks:    "fireworks-cruises",
  tiki:         "tiki-boats",
  banana:       "banana-boat-rides",
  photographer: "beach-photographers",
  boattour:     "boat-tours",
};

export function detectTripShockCategory(text) {
  const t = text.toLowerCase();
  if (t.match(/dolphin/))                          return "dolphin";
  if (t.match(/fish|charter|angl/))                return "fishing";
  if (t.match(/jet.?ski|waverunner/))              return "jetski";
  if (t.match(/pontoon|boat.rent/))                return "pontoon";
  if (t.match(/parasail/))                         return "parasail";
  if (t.match(/crab.?island/))                     return "crabisland";
  if (t.match(/snorkel/))                          return "snorkel";
  if (t.match(/sunset.?cruis|sunset.?tour/))       return "sunset";
  if (t.match(/pirate/))                           return "pirate";
  if (t.match(/kayak/))                            return "kayak";
  if (t.match(/paddleboard|paddle.?board/))        return "paddleboard";
  if (t.match(/firework/))                         return "fireworks";
  if (t.match(/tiki/))                             return "tiki";
  if (t.match(/banana.?boat/))                     return "banana";
  if (t.match(/beach.?photo|photo.*beach|beach.*picture|picture.*beach|family.*photo|photo.*family|family.*picture|picture.*family/)) return "photographer";
  if (t.match(/boat.?tour|tour.*boat/))            return "boattour";
  return null;
}

// Extract single date for TripShock activity links (does not affect availability checking)
export function extractSingleDate(text) {
  // Extract explicit year from text if present
  const yearMatch = text.match(/\b(202[6-9]|203\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  const months = {
    january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
    july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
    jan:"01",feb:"02",mar:"03",apr:"04",jun:"06",
    jul:"07",aug:"08",sept:"09",sep:"09",oct:"10",nov:"11",dec:"12"
  };
  const mn = Object.keys(months).join("|");
  // "March 12th", "March 12", "12th March", "12 March" — (?!\d) prevents matching 4-digit years
  const m1 = text.match(new RegExp("(" + mn + ")\\s+(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)", "i"));
  if (m1 && m1[2].length <= 2) return `${year}-${months[m1[1].toLowerCase()]}-${m1[2].padStart(2,"0")}`;
  const m2 = text.match(new RegExp("(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)\\s+(?:of\\s+)?(" + mn + ")", "i"));
  if (m2 && m2[1].length <= 2) return `${year}-${months[m2[2].toLowerCase()]}-${m2[1].padStart(2,"0")}`;
  // M/D slash format: "3/3", "03/15"
  const m3b = text.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (m3b && parseInt(m3b[1]) >= 1 && parseInt(m3b[1]) <= 12 && parseInt(m3b[2]) >= 1 && parseInt(m3b[2]) <= 31) {
    return `${year}-${m3b[1].padStart(2,"0")}-${m3b[2].padStart(2,"0")}`;
  }
  // M.D dot format: "3.12", "03.15"
  const m4 = text.match(/\b(\d{1,2})\.(\d{1,2})\b/);
  if (m4 && parseInt(m4[1]) >= 1 && parseInt(m4[1]) <= 12 && parseInt(m4[2]) >= 1 && parseInt(m4[2]) <= 31) {
    return `${year}-${m4[1].padStart(2,"0")}-${m4[2].padStart(2,"0")}`;
  }
  return null;
}

export function buildTripShockLink(category, dates) {
  const slug = TRIPSHOCK_CATEGORIES[category];
  let from, to;
  if (dates && dates.arrival && dates.departure) {
    const fmt = d => { const p = d.split("-"); return `${p[1]}/${p[2]}/${p[0]}`; };
    from = fmt(dates.arrival);
    to   = fmt(dates.departure);
  } else if (dates && dates.arrival) {
    const fmt = d => { const p = d.split("-"); return `${p[1]}/${p[2]}/${p[0]}`; };
    from = fmt(dates.arrival);
    const next = new Date(dates.arrival); next.setDate(next.getDate() + 1);
    const pad = n => String(n).padStart(2,"0");
    to = `${pad(next.getMonth()+1)}/${pad(next.getDate())}/${next.getFullYear()}`;
  }
  if (slug && from && to) {
    return `${TRIPSHOCK_BASE}/destination/fl/destin/things-to-do/${slug}/?from=${from}&to=${to}&${TRIPSHOCK_AFF}`;
  }
  return `${TRIPSHOCK_BASE}/?${TRIPSHOCK_AFF}`;
}

export async function fetchDestinWeather() {
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

export async function fetchBlogContent(topic) {
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
// Detect escalation/emergency/threat scenarios
// ─────────────────────────────────────────────────────────────────────────────
export function detectEscalation(text) {
  return /dying|passed away|funeral|death|asthma|medical|emergency|storm|hurricane|power outage|displaced|sick child|hospital|review|1.star|one star|sue|lawyer|legal|lawsuit|going to post|tell everyone|already checked in|friends just arrived|sleeping in car|floor|waiver|sign anything|please don't turn|breaking point|at my limit|\bscam\b|\bscammer\b|\bfraud\b|\bfraudulent\b|rip.?off|\bphishing\b|\bfake site\b|\bfake website\b|reporting (you|this)/i.test(text);
}

export function detectExcessGuests(text) {
  return /7 (people|guests|of us)|8 (people|guests|of us)|9 (people|guests|of us)|ten people|seven people|eight people|won't count|doesn't count|don't count|sleeping in car|sleep on floor|won't use|won't need/i.test(text);
}

// Detect locked out / door code emergency
export function detectLockedOut(text) {
  return /can't get in|cant get in|locked out|pin.*not work|pin.*wrong|wrong.*pin|code.*not work|code.*wrong|wrong.*code|won't open|wont open|door.*won't|door.*not open|can't enter|cant enter|stuck outside|standing outside|waiting outside|deleted.*email|lost.*code|forgot.*code.*can't|cant.*get.*in|can't find.*code|cant find.*code|can't find.*pin|cant find.*pin|can't find.*door|cant find.*door|where.*door code|where.*pin code|don't have.*code|dont have.*code|no.*door code|missing.*code|need.*door code|need.*pin|what.*door code|what.*pin/i.test(text);
}

export function detectMaintenance(text) {
  return /broken|not working|isn't working|won't work|doesn't work|not cooling|not heating|no hot water|no water|no power|no electricity|power out|power outage|lights out|power went out|electricity out|lost power|loud.*heat|heat.*loud|noise.*heat|heating.*noise|loud.*AC|AC.*loud|loud.*unit|leaking|leak|flooded|flooding|clogged|backed up|toilet.*over|won't flush|wont flush|smell|smells|mold|\bbug\b|\bbugs\b|\broach\b|\bants\b|\bant\b(?!ic|ique|hem|i)|\bmouse\b|\bmice\b|AC.*off|AC.*broken|heat.*off|heat.*broken|TV.*broken|TV.*not|dishwasher|washing machine|dryer.*broken|microwave.*broken|fridge.*broken|freezer.*broken|oven.*broken|stove.*broken|Wi-?Fi.*down|wifi.*not|internet.*down|cable.*out|remote.*missing|remote.*broken|blind.*broken|door.*broken|lock.*broken|key.*stuck|window.*broken|light.*out|lights.*out|bulb.*out|outlet.*not|socket.*not|fan.*broken|fan.*not|noise.*unit|loud.*noise|banging|dripping|running water|water pressure|no pressure/i.test(text);
}

export function detectAccidentalDamage(text) {
  return /broke.*(?:plate|glass|cup|dish|mug|bowl|mirror|vase|frame|window|lamp)|(?:plate|glass|cup|dish|mug|bowl|mirror|vase|frame|lamp).*broke|cracked.*(?:plate|glass|cup|dish|mirror)|(?:plate|glass|cup|dish|mirror).*cracked|accidentally.*broke|accidentally.*broken|broke.*by.*accident|dropped.*(?:plate|glass|cup|dish|mug|bowl)|(?:spilled|stained).*(?:carpet|couch|sofa|mattress|furniture)/i.test(text);
}

// These are NOT maintenance issues — Ozan cannot fix them
export function detectExternalDisturbance(text) {
  return /jackhammer|jack hammer|jack-hammer|construction.*noise|remodel.*noise|renovation.*noise|noise.*construction|noise.*remodel|noise.*neighbor|neighbor.*noise|hammering|drilling|sawing|loud.*next door|next door.*loud|noise.*above|noise.*below|floor.*above|floor.*below|someone.*above|someone.*below|music.*beach|beach.*music|loud.*outside|outside.*noise|smell.*outside|outside.*smell|smoke.*hallway|hallway.*smoke|weed|marijuana|cigarette.*smell|smoke.*smell|garbage.*smell|smell.*garbage|trash.*smell|fireworks|loud.*party.*outside|outside.*party/i.test(text);
}

// Summarize raw guest issue descriptions into clean natural phrases
// Called only when building the ack message — ~300-500ms, worth it for quality
export async function summarizeIssues(issues) {
  try {
    if (!issues || issues.length === 0) return issues;
    const prompt = `You are cleaning up maintenance issue descriptions reported by hotel guests.
Convert each raw guest message into a SHORT, CLEAN, NATURAL issue description (3-6 words max).
Remove filler words like "also", "and", "OMG", "got it", "our", typos.
Preserve the actual problem.

Examples:
"OMG TV is not working" → "TV not working"
"also dishwasher is broken" → "dishwasher broken"
"got it also there is a water leak" → "water leak"
"our AC wont turn on" → "AC not working"
"diswahser is not wkrkin" → "dishwasher not working"

Input issues: ${JSON.stringify(issues)}

Respond with ONLY a JSON array of cleaned strings, nothing else. Example: ["TV not working","dishwasher broken"]`;

    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0,
    });
    const raw = result.choices[0]?.message?.content?.trim() || "";
    const cleaned = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (Array.isArray(cleaned) && cleaned.length === issues.length) return cleaned;
    return issues; // fallback to raw if parse fails
  } catch (err) {
    console.error("summarizeIssues error:", err.message);
    return issues; // always fall back gracefully
  }
}

export async function fetchGuestBooking(bookingId) {
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
    if (!response.ok) {
      console.error(`fetchGuestBooking error: ${response.status} for booking ${bookingId}`);
      return null;
    }
    const b = await response.json();
    if (b.is_block || b.status === "canceled") return null;

    // Calculate days until arrival
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    const arrival = new Date(b.arrival + "T00:00:00");
    const departure = new Date(b.departure + "T00:00:00");
    const daysUntilArrival = Math.ceil((arrival - todayDate) / (1000 * 60 * 60 * 24));
    const isCheckedIn = todayDate >= arrival && todayDate < departure;
    const isCheckedOut = todayDate >= departure;

    // Door code: only show if within 7 days of arrival or during stay, not after checkout
    const showDoorCode = !isCheckedOut && (isCheckedIn || daysUntilArrival <= 7);
    const doorCode = showDoorCode && b.door_codes?.length > 0 ? b.door_codes[0].code : null;

    const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    return {
      guestFirstName: b.guest?.first_name || null,
      guestLastName:  b.guest?.last_name || null,
      unit:           b.property?.name?.includes("707") ? "707" : "1006",
      propertyName:   b.property?.name || "your unit",
      arrival:        b.arrival,
      departure:      b.departure,
      arrivalFmt:     fmtDate(b.arrival),
      departureFmt:   fmtDate(b.departure),
      checkIn:        b.check_in || "16:00",
      checkOut:       b.check_out || "10:00",
      nights:         Math.ceil((departure - arrival) / (1000 * 60 * 60 * 24)),
      doorCode,
      showDoorCode,
      daysUntilArrival,
      isCheckedIn,
      isCheckedOut,
      adults:         b.adults,
      children:       b.children,
      status:         b.status,
    };
  } catch (err) {
    console.error("fetchGuestBooking error:", err.message);
    return null;
  }
}

export async function checkAvailability(propertyId, arrival, departure, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
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
      console.error(`OwnerRez API error: ${response.status} for property ${propertyId} (attempt ${attempt})`);
      if (attempt < retries) { await new Promise(r => setTimeout(r, 800)); continue; }
      return null;
    }

    const data = await response.json();
    const bookings = data?.items || data?.bookings || [];
    const requestArrival = new Date(arrival);
    const requestDeparture = new Date(departure);

    const hasConflict = bookings.some((booking) => {
      // Skip only canceled/blocked — all other statuses (confirmed, ok_pre_arrival, etc.) count as occupied
      const status = (booking.status || "").toLowerCase();
      if (status === "cancelled" || status === "canceled") return false;
      const bookingArrival = new Date(booking.arrival || booking.check_in || booking.arrivalDate);
      const bookingDeparture = new Date(booking.departure || booking.check_out || booking.departureDate);
      return bookingArrival < requestDeparture && bookingDeparture > requestArrival;
    });

    console.log(`OwnerRez property ${propertyId}: ${hasConflict ? "BOOKED" : "AVAILABLE"} for ${arrival}→${departure}`);
    return !hasConflict;
  } catch (err) {
    console.error(`OwnerRez fetch error (attempt ${attempt}):`, err.message);
    if (attempt < retries) { await new Promise(r => setTimeout(r, 800)); continue; }
    return null;
  }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract dates from message
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeMonths(text) {
  const corrections = [
    [/\b(decmber|decemer|decmeber|decembre|dcember|decmebr)\b/gi, 'december'],
    [/\b(novmber|noveber|novemebr|novmeber|novembr|nvember)\b/gi, 'november'],
    [/\b(septemebr|septmber|sepember|septeber|spetember|setpember)\b/gi, 'september'],
    [/\b(feburary|febuary|februray|februaray|febrary|febraury)\b/gi, 'february'],
    [/\b(januray|januaray|janury|janaury)\b/gi, 'january'],
    [/\b(ocotber|octobr|ocober|octobar)\b/gi, 'october'],
    [/\b(augest|augst|agust|auguts)\b/gi, 'august'],
    [/\b(jully|jule|juli)\b/gi, 'july'],
    [/\b(marh|mrach|mach)\b/gi, 'march'],
    [/\b(apirl|aprl|aprli)\b/gi, 'april'],
    // Common preposition typos
    [/\buntl\b/gi, 'until'],
    [/\bunitl\b/gi, 'until'],
    [/\bunil\b/gi, 'until'],
    [/\btill\b/gi, 'until'],
    [/\bthru\b/gi, 'through'],
    [/\btrhough\b/gi, 'through'],
  ];
  let out = text;
  for (const [pattern, correct] of corrections) {
    out = out.replace(pattern, correct);
  }
  return out;
}

export function extractDates(text) {
  // Extract year from text if present (e.g. "2027"), otherwise use current year
  const yearMatch = text.match(/\b(202[6-9]|203\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  // Strip trailing punctuation from words so "march." "march," "march!" all match
  text = text.replace(/([a-zA-Z])[.,!?;:]+(\s|$)/g, '$1$2');
  const t = normalizeMonths(text.toLowerCase());

  // "3-8/9 of June" format — day range with slash alternate end date (take first and last number)
  const slashAltMonthPattern = /(\d{1,2})-(\d{1,2})\/(\d{1,2})\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i;
  const slashAltMonthMatch = t.match(slashAltMonthPattern);
  if (slashAltMonthMatch) {
    const months2 = {january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',july:'07',august:'08',september:'09',october:'10',november:'11',december:'12'};
    const m2 = months2[slashAltMonthMatch[4].toLowerCase()];
    return {
      arrival:   `${year}-${m2}-${slashAltMonthMatch[1].padStart(2,'0')}`,
      departure: `${year}-${m2}-${slashAltMonthMatch[3].padStart(2,'0')}`,
    };
  }

  const isoPattern = /(\d{4}-\d{2}-\d{2})/g;
  const isoMatches = text.match(isoPattern);
  if (isoMatches && isoMatches.length >= 2) {
    return { arrival: isoMatches[0], departure: isoMatches[1] };
  }

  // Numeric M-D to M-D format: "3-3 to 3-12", "03-03 until 03-12", "3-3 through 3-12"
  const mdToMdPattern = /(\d{1,2})-(\d{1,2})\s*(?:to|until|through|thru)\s*(\d{1,2})-(\d{1,2})/i;
  const mdToMdMatch = text.match(mdToMdPattern);
  if (mdToMdMatch) {
    return {
      arrival:   `${year}-${mdToMdMatch[1].padStart(2,"0")}-${mdToMdMatch[2].padStart(2,"0")}`,
      departure: `${year}-${mdToMdMatch[3].padStart(2,"0")}-${mdToMdMatch[4].padStart(2,"0")}`,
    };
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

  // Slash format with words: 7/12 to 7/28, 7/12 until 7/28
  const slashWordPattern = /(\d{1,2})\/(\d{1,2})\s*(?:to|until|through|thru)\s*(\d{1,2})\/(\d{1,2})/i;
  const slashWordMatch = text.match(slashWordPattern);
  if (slashWordMatch) {
    return {
      arrival:   `${year}-${slashWordMatch[1].padStart(2,"0")}-${slashWordMatch[2].padStart(2,"0")}`,
      departure: `${year}-${slashWordMatch[3].padStart(2,"0")}-${slashWordMatch[4].padStart(2,"0")}`,
    };
  }
  // M.D to M.D dot with any connector: "3.5 to 3.12", "3.5 - 3.12"
  const dotPattern = /(\d{1,2})\.(\d{1,2})\s*(?:to|until|through|thru|[-–])\s*(\d{1,2})\.(\d{1,2})/i;
  const dotMatch = text.match(dotPattern);
  if (dotMatch) {
    return {
      arrival:   `${year}-${dotMatch[1].padStart(2,"0")}-${dotMatch[2].padStart(2,"0")}`,
      departure: `${year}-${dotMatch[3].padStart(2,"0")}-${dotMatch[4].padStart(2,"0")}`,
    };
  }

  const months = {
    january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
    july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
    jan:"01",feb:"02",mar:"03",apr:"04",jun:"06",
    jul:"07",aug:"08",sept:"09",sep:"09",oct:"10",nov:"11",dec:"12"
  };
  const mn = Object.keys(months).join("|");

  const sameMonthRange = new RegExp("(" + mn + ")\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*[-\u2013]\\s*(\\d{1,2})(?:st|nd|rd|th)?(?!\\s*(?:adult|child|kid|guest|person|people|ppl|pax|infant|baby|toddler))", "i");
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
  const mrMatch = t.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*(\d{1,2})(?:st|nd|rd|th)?(?!\s*(?:adult|child|kid|guest|person|people|ppl|pax|infant|baby|toddler))/i);
  if (mrMatch) {
    const month = months[mrMatch[1].toLowerCase()];
    return {
      arrival:   `${year}-${month}-${mrMatch[2].padStart(2,"0")}`,
      departure: `${year}-${month}-${mrMatch[3].padStart(2,"0")}`,
    };
  }

  const crossPattern = new RegExp("(" + mn + ")\\s*(\\d{1,2})(?:(?:\\s+(?:to|and|through|until|till|untl|thru)\\s+|\\s*[-\u2013]\\s*)(?:(" + mn + ")\\s*)?(\\d{1,2}))(?!\\s*(?:adult|child|kid|guest|person|people|ppl|pax|infant|baby|toddler))", "i");
  const crossMatch = text.match(crossPattern);
  if (crossMatch) {
    const month1 = months[crossMatch[1].toLowerCase()];
    const month2 = crossMatch[3] ? months[crossMatch[3].toLowerCase()] : month1;
    return {
      arrival: `${year}-${month1}-${crossMatch[2].padStart(2,"0")}`,
      departure: `${year}-${month2}-${crossMatch[4].padStart(2,"0")}`
    };
  }

  const monthDayPattern = new RegExp("(" + mn + ")\\s+(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)(?!\\s*(?:adult|child|kid|guest|person|people|infant|baby|toddler))", "gi");
  const allMatches = [...text.matchAll(monthDayPattern)];
  if (allMatches.length >= 2) {
    const toISO = (m) => `${year}-${months[m[1].toLowerCase()]}-${m[2].padStart(2,"0")}`;
    return { arrival: toISO(allMatches[0]), departure: toISO(allMatches[1]) };
  }

  // Day-Month format: "4th july", "4th of july", "12 july", "4 July and 12 July"
  // Must come BEFORE dmDayMatch to avoid "12th of march 2" being misread as day-month-day
  // Filter out "day month" matches where the match is immediately followed by a guest count word
  // e.g. "12th of march 2 ppl" → the "2" after "march" is a guest count, not a second date
  const dmMatchesRaw = [...t.matchAll(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)/gi)];
  const dmMatches = dmMatchesRaw.filter(m => {
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 20);
    if (/^\s*[-–,]?\s*(to|until|through|thru)\b/i.test(after)) return true;
    if (/^\s*[-–]\s*\d/i.test(after)) return true;
    return !/^\s*\d*\s*(adult|kid|child|children|guest|person|people|ppl|pax|infant|baby|toddler)/i.test(after);
  });
  if (dmMatches.length >= 2) {
    const toISO2 = (m) => `${year}-${months[m[2].toLowerCase()]}-${m[1].padStart(2,"0")}`;
    return { arrival: toISO2(dmMatches[0]), departure: toISO2(dmMatches[1]) };
  }

  // "4 september 12" or "4th september 12th" — day month day, no connector
  // Only runs when dmMatches found fewer than 2 matches
  const dmDayMatch = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?!\s*(?:adult|kid|child|children|guest|person|people|ppl|pax|infant|baby|toddler|pet|dog|cat|bird|animal))(?=\s+\S)/i);
  if (dmDayMatch) {
    const month = months[dmDayMatch[2].toLowerCase()];
    return {
      arrival:   `${year}-${month}-${dmDayMatch[1].padStart(2,"0")}`,
      departure: `${year}-${month}-${dmDayMatch[3].padStart(2,"0")}`,
    };
  }

  // "4th of july to 12th" — single day+month then second day
  const sdmMatch = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s*(?:to|until|through|and|-)\s*(\d{1,2})/i);
  if (sdmMatch) {
    const month = months[sdmMatch[2].toLowerCase()];
    return {
      arrival:   `${year}-${month}-${sdmMatch[1].padStart(2,"0")}`,
      departure: `${year}-${month}-${sdmMatch[3].padStart(2,"0")}`,
    };
  }

  // "9 to 11 april" — digit connector digit month (month at end, word connector)
  const numToNumMonthMatch = t.match(/(\d{1,2})\s*(?:to|until|through|thru|till)\s*(\d{1,2})\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)/i);
  if (numToNumMonthMatch) {
    const month = months[numToNumMonthMatch[3].toLowerCase()];
    return {
      arrival:   `${year}-${month}-${numToNumMonthMatch[1].padStart(2,"0")}`,
      departure: `${year}-${month}-${numToNumMonthMatch[2].padStart(2,"0")}`,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Aviasales flight deep link (affiliate tracked)
// ─────────────────────────────────────────────────────────────────────────────
export function buildFlightLink(origin, departure, returnDate, adults = 1, children = 0, infants = 0, destination = "VPS") {
  if (!origin || !departure || !returnDate) return null;
  try {
    const dep = new Date(departure);
    const ret = new Date(returnDate);
    const dd = String(dep.getDate()).padStart(2, "0");
    const dm = String(dep.getMonth() + 1).padStart(2, "0");
    const rd = String(ret.getDate()).padStart(2, "0");
    const rm = String(ret.getMonth() + 1).padStart(2, "0");
    const pax = parseInt(adults) + parseInt(children) + parseInt(infants);
    const base = `https://www.aviasales.com/search/${origin.toUpperCase()}${dd}${dm}${destination}${rd}${rm}${pax}`;
    return `${base}?adults=${adults}&children=${children}&infants=${infants}&marker=709191`;
  } catch (e) {
    return null;
  }
}

export function buildLink(unit, arrival, departure, adults, children) {
  const base = unit === "707"
    ? "https://www.destincondogetaways.com/pelican-beach-resort-unit-707-orp5b47b5ax"
    : "https://www.destincondogetaways.com/pelican-beach-resort-unit-1006-orp5b6450ex";
  const totalGuests = parseInt(adults) + parseInt(children);
  return `${base}?or_arrival=${arrival}&or_departure=${departure}&or_adults=${adults}&or_children=${children}&or_guests=${totalGuests}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brevo — capture website lead (name + email) from popup flow

export async function addBrevoContact(email, firstName) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) { console.warn("BREVO_API_KEY not set"); return false; }
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email,
        attributes: { FIRSTNAME: firstName || "" },
        listIds: [5],
        updateEnabled: true,
      }),
    });
    if (res.status === 201 || res.status === 204) {
      console.log(`Brevo contact added: ${email}`);
      return true;
    }
    const body = await res.text();
    console.warn(`Brevo add contact failed: ${res.status} ${body}`);
    return false;
  } catch (err) {
    console.error("Brevo error:", err.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Log conversation to Google Sheets

export async function getSheetsToken(retries = 3) {
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
      if (attempt < retries) await new Promise(r => setTimeout(r, attempt === 1 ? 1000 : 1500));
    }
  }
  return null;
}

export const SESS_TAB = "ozanchat";

export const ACK_MESSAGES = {
  OZAN_ACK:        "Great news — Ozan has seen the alert and confirmed he is on it. He will reach out to you very shortly 🙏",
  MAINT_ONSITE:    "Great news — Ozan has opened a maintenance ticket and the onsite team will be in touch with you shortly 🙏",
  MAINT_OZAN:      "Great news — Ozan is personally handling this and will get in touch with you shortly 🙏",
  MAINT_EMERGENCY: "Ozan is calling you right now — please pick up! 🙏",
};

export const ACK_TYPES = ["OZAN_ACK", "MAINT_ONSITE", "MAINT_OZAN", "MAINT_EMERGENCY"];

export async function loadSession(sessionId) {
  try {
    if (!sessionId) return { history: [], ozanAckType: null };
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) return { history: [], ozanAckType: null };
    const accessToken = await getSheetsToken();
    if (!accessToken) return { history: [], ozanAckType: null };

    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:H`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!sheetRes.ok) return { history: [], ozanAckType: null };
    const data = await sheetRes.json();
    const rows = (data.values || []).filter(row => row[1] === sessionId);

    let ozanAckType = null;
    let ackDeliveredToGuest = false;
    let priorIssueAcked = false;
    let openIssues = []; // list of unacknowledged issue descriptions
    let ackedIssues = []; // snapshot of issues that were open when Ozan acked
    const messages = [];

    for (const row of rows) {
      const ackType = row[7];
      const colF = row[5] || "";
      const colG = row[6] || "";
      const guestMsg = row[2] || "";
      const assistantMsg = row[3] || "";

      // New MAINTENANCE or EMERGENCY row after a prior ack = new issue started.
      // ONLY reset if it's a genuine new issue description, not a follow-up "any update?" message.
      const isFollowUpMsg = /any update|any news|heard.*back|anything yet|still waiting|did.*ozan|ozan.*call|anything|any word|update me|following up/i.test(guestMsg);
      const isNewIssueRow = guestMsg && assistantMsg && !isFollowUpMsg &&
        (colF === "MAINTENANCE" || colF === "EMERGENCY");
      if (isNewIssueRow && priorIssueAcked) {
        ozanAckType = null;
        ackDeliveredToGuest = false;
        priorIssueAcked = false;
        openIssues = []; // prior issues were acked — start fresh
      }

      // Read open issues list stored in col G when alert fired
      if (colG && colG.startsWith("{")) {
        try {
          const parsed = JSON.parse(colG);
          if (Array.isArray(parsed.issues)) openIssues = parsed.issues;
        } catch (_) {}
      }

      // ACK_CONFIRMED in col F = canned ack was already delivered to guest
      if (colF.startsWith("ACK_CONFIRMED")) ackDeliveredToGuest = true;

      if (ACK_TYPES.includes(ackType)) {
        // Ack row — save snapshot of what was open when Ozan acked, then clear
        ozanAckType = ackType;
        priorIssueAcked = true;
        ackedIssues = [...openIssues]; // snapshot for dynamic ack message
        openIssues = []; // clear — these issues are now handled
        const ackMsg = ACK_MESSAGES[ackType];
        if (ackMsg) messages.push({ role: "assistant", content: ackMsg });
      } else if (guestMsg && assistantMsg) {
        messages.push({ role: "user", content: guestMsg });
        messages.push({ role: "assistant", content: assistantMsg });
      }
    }

    // Strip stale "still waiting" messages logged before ack was known
    if (ozanAckType) {
      const stillWaitingPattern = /still waiting|no update yet|waiting to hear|haven't heard|not heard back|waiting for.*ozan|ozan.*hasn't/i;
      const ackMsg = ACK_MESSAGES[ozanAckType];
      const ackIdx = messages.findIndex(m => m.role === "assistant" && m.content === ackMsg);
      const cleaned = messages.filter((m, idx) => {
        if (m.role !== "assistant") return true;
        if (!stillWaitingPattern.test(m.content)) return true;
        return ackIdx !== -1 && idx > ackIdx;
      });
      messages.length = 0;
      cleaned.forEach(m => messages.push(m));
    }

    // Keep last 20 messages to avoid context overflow
    const history = messages.slice(-20);
    console.log(`Session ${sessionId}: loaded ${history.length} messages (ackType: ${ozanAckType || "none"} | ackDelivered: ${ackDeliveredToGuest} | openIssues: ${openIssues.length})`);
    return { history, ozanAckType, ackDeliveredToGuest, openIssues, ackedIssues };
  } catch (err) {
    console.error("loadSession error:", err.message);
    return { history: [], ozanAckType: null, ackDeliveredToGuest: false, openIssues: [], ackedIssues: [] };
  }
}

export async function logToSheets(sessionId, guestMessage, destinyReply, datesAsked, availabilityStatus, alertSummary = "") {
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

// ── FLIGHT ORIGIN RESOLUTION — copied verbatim from v1 handler (hoisted) ──

// ── FLIGHT ORIGIN RESOLUTION (hoisted so the prompt can be deterministic) ──
export const cityIataMap = {
  // ── Multi-airport cities: main airport is the default ──
  chicago:"ORD", "o'hare":"ORD", ohare:"ORD", midway:"MDW", "chicago midway":"MDW",
  "new york":"JFK", nyc:"JFK", "new york city":"JFK", jfk:"JFK", laguardia:"LGA", "la guardia":"LGA", newark:"EWR",
  "washington":"IAD", "washington dc":"IAD", "washington d.c.":"IAD", dulles:"IAD", reagan:"DCA", "national airport":"DCA", baltimore:"BWI",
  houston:"IAH", "george bush":"IAH", hobby:"HOU",
  dallas:"DFW", "dallas fort worth":"DFW", "fort worth":"DFW", "love field":"DAL",
  "san francisco":"SFO", "bay area":"SFO", oakland:"OAK", "san jose":"SJC",
  // ── Single-airport / primary cities ──
  denver:"DEN", atlanta:"ATL", nashville:"BNA", "los angeles":"LAX", la:"LAX",
  miami:"MIA", "fort lauderdale":"FLL", orlando:"MCO", charlotte:"CLT", boston:"BOS",
  seattle:"SEA", phoenix:"PHX", philadelphia:"PHL", detroit:"DTW", minneapolis:"MSP",
  "st paul":"MSP", cleveland:"CLE", cincinnati:"CVG", columbus:"CMH", indianapolis:"IND",
  memphis:"MEM", "kansas city":"MCI", "st louis":"STL", "saint louis":"STL",
  pittsburgh:"PIT", raleigh:"RDU", "raleigh durham":"RDU", durham:"RDU",
  tampa:"TPA", jacksonville:"JAX", austin:"AUS", "san antonio":"SAT",
  "oklahoma city":"OKC", tulsa:"TUL", "new orleans":"MSY", birmingham:"BHM",
  richmond:"RIC", lexington:"LEX", knoxville:"TYS", "baton rouge":"BTR", "little rock":"LIT",
  // ── Previously missing mid-size cities (silent dead-end fix) ──
  "salt lake city":"SLC", "salt lake":"SLC", portland:"PDX", "san diego":"SAN",
  sacramento:"SMF", milwaukee:"MKE", buffalo:"BUF", albany:"ALB", hartford:"BDL",
  providence:"PVD", rochester:"ROC", syracuse:"SYR", omaha:"OMA", "des moines":"DSM",
  wichita:"ICT", boise:"BOI", spokane:"GEG", reno:"RNO", tucson:"TUS", albuquerque:"ABQ",
  "el paso":"ELP", "colorado springs":"COS", "grand rapids":"GRR", "fort wayne":"FWA",
  madison:"MSN", "green bay":"GRB", dayton:"DAY", toledo:"TOL", louisville:"SDF",
  greenville:"GSP", columbia:"CAE", savannah:"SAV", charleston:"CHS", augusta:"AGS",
  huntsville:"HSV", montgomery:"MGM", mobile:"MOB", pensacola:"PNS", tallahassee:"TLH",
  gainesville:"GNV", "west palm beach":"PBI", "palm beach":"PBI", sarasota:"SRQ",
  "fort myers":"RSW", norfolk:"ORF", greensboro:"GSO", asheville:"AVL",
  chattanooga:"CHA", "little rock arkansas":"LIT", shreveport:"SHV", jackson:"JAN",
  "sioux falls":"FSD", fargo:"FAR", billings:"BIL", anchorage:"ANC", honolulu:"HNL",
  // ── Canada (common origins) ──
  toronto:"YYZ", montreal:"YUL", vancouver:"YVR", calgary:"YYC", ottawa:"YOW"
};

// Valid origin IATA codes we accept when a guest types a bare code.
// Whitelisting prevents random 3-letter words ("BTW", "ANY", "THE")
// from being silently misread as an airport — the failure mode where a
// guest gets a confidently wrong flight link.
export const VALID_ORIGIN_IATA = new Set([
  ...Object.values(cityIataMap),
  // extra valid codes guests may type that aren't a map default
  "DAL","HOU","MDW","LGA","EWR","DCA","BWI","OAK","SJC","BUR","LGB","SNA","ONT",
  "IAD","JFK","ORD","SFO","IAH","DFW","SLC","PDX","SAN","SMF","MKE","BUF","MSY",
  "MCO","TPA","FLL","PBI","RSW","SRQ","JAX","VPS","ECP","PNS","BHM","HSV","MOB"
]);

export const extractOrigin = (text) => {
  const lower = text.toLowerCase();
  // 1) City names FIRST — longest key first so "kansas city" beats "kansas",
  //    "chicago midway" beats "chicago", "san antonio" beats "antonio".
  //    Word-boundary matched so "la" doesn't fire inside "Atlanta"/"Dallas".
  const cityKeys = Object.keys(cityIataMap).sort((a, b) => b.length - a.length);
  for (const city of cityKeys) {
    const safe = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${safe}\\b`, "i").test(lower)) return cityIataMap[city];
  }
  // 2) Bare IATA code — only if it's a REAL airport code (whitelist),
  //    so "BTW"/"ANY"/"THE" can never become a bogus origin.
  const iataMatches = text.match(/\b([A-Z]{3})\b/g);
  if (iataMatches) {
    for (const code of iataMatches) {
      if (VALID_ORIGIN_IATA.has(code)) return code;
    }
  }
  return null;
};

export const MULTI_AIRPORT_MAIN = { ORD: "Chicago O'Hare", JFK: "New York JFK", IAD: "Washington Dulles", IAH: "Houston Bush", DFW: "Dallas/Fort Worth", SFO: "San Francisco" };
export const VAGUE_AIRPORT_REPLY = /^\s*(any|anyone|any one|any of them|whichever|whatever|either|doesn'?t matter|dont matter|no preference|you (pick|choose|decide)|up to you|surprise me|closest|cheapest|the (main|major|biggest) one)\s*[.!]*\s*$/i;


// ── fetchPropertyBookings / isRangeFree ─────────────────────────────────────
// The fetch and the conflict rule are lifted from checkAvailability above so
// find_open_windows can reuse them without 20 API round-trips. The overlap
// semantics are IDENTICAL to checkAvailability — if you change one, change both.
export async function fetchPropertyBookings(propertyId, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const token = process.env.OWNERREZ_API_TOKEN;
      const credentials = Buffer.from(`${OWNERREZ_USER}:${token}`).toString("base64");
      const since = new Date();
      since.setFullYear(since.getFullYear() - 1);
      const url = `https://api.ownerrez.com/v2/bookings?property_ids=${propertyId}&since_utc=${since.toISOString()}&status=active`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "DestinyBlue/1.0",
        },
      });
      if (!response.ok) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 800)); continue; }
        return null;
      }
      const data = await response.json();
      return data?.items || data?.bookings || [];
    } catch (err) {
      if (attempt < retries) { await new Promise(r => setTimeout(r, 800)); continue; }
      return null;
    }
  }
  return null;
}

export function isRangeFree(bookings, arrival, departure) {
  const requestArrival = new Date(arrival);
  const requestDeparture = new Date(departure);
  const hasConflict = (bookings || []).some((booking) => {
    const status = (booking.status || "").toLowerCase();
    if (status === "cancelled" || status === "canceled") return false;
    const bookingArrival = new Date(booking.arrival || booking.check_in || booking.arrivalDate);
    const bookingDeparture = new Date(booking.departure || booking.check_out || booking.departureDate);
    return bookingArrival < requestDeparture && bookingDeparture > requestArrival;
  });
  return !hasConflict;
}
