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

function detectBlogTopic(text) {
  const t = text.toLowerCase();
  if (t.match(/restaurant|eat|food|dinner|lunch|breakfast|dining|seafood|oyster|where to eat/)) return "restaurants";
  if (t.match(/beach|sand|swim|ocean|gulf|shore/)) return "beaches";
  if (t.match(/activit|thing to do|fun|tour|dolphin|parasail|snorkel|kayak|boat|fishing|water sport|rainy|indoor fun/)) return "activities";
  if (t.match(/weather|temperature|rain|season|when to visit|best time|hot|cold/)) return "weather";
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
  return null;
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

  const isoPattern = /(\d{4}-\d{2}-\d{2})/g;
  const isoMatches = text.match(isoPattern);
  if (isoMatches && isoMatches.length >= 2) {
    return { arrival: isoMatches[0], departure: isoMatches[1] };
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
async function logToSheets(guestMessage, destinyReply, datesAsked, availabilityStatus) {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!email || !rawKey || !sheetId) return;

    const privateKey = rawKey.replace(/\\n/g, "\n");

    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const claim = Buffer.from(JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
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
    const accessToken = tokenData.access_token;
    if (!accessToken) return;

    const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const row = [timestamp, guestMessage, destinyReply, datesAsked || "", availabilityStatus || ""];

    const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });

    if (sheetRes.ok) {
      console.log("Logged to Google Sheets ✅");
    }
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
    const { messages = [] } = req.body || {};
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", weekday: "long",
    });

    const allUserText = messages.filter((m) => m.role === "user").map((m) => m.content).join(" ");

    // ── LAYER 1: Run all detectors ──────────────────────────────────────────
    const isDiscountRequest = detectDiscountIntent(lastUser);
    const isUnitComparison = detectUnitComparison(lastUser);
    const isEscalation = detectEscalation(lastUser) || detectEscalation(allUserText.slice(-500));
    const isExcessGuests = detectExcessGuests(lastUser);
    const wantsAvailability = detectAvailabilityIntent(lastUser);

    // Only look back in history for dates on genuine follow-ups
    const dates = extractDates(lastUser) || (
      lastUser.match(/unit|1006|707|that one|both|available|book/i)
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
      // Check 3 sample windows — full month check was wrong:
      // even 1 booking overlapping the full range = entire month shows "booked"
      const year = new Date().getFullYear();
      const monthNum = monthNames[mentionedMonth];
      const windows = [
        { arrival: `${year}-${monthNum}-01`, departure: `${year}-${monthNum}-04` },
        { arrival: `${year}-${monthNum}-10`, departure: `${year}-${monthNum}-13` },
        { arrival: `${year}-${monthNum}-20`, departure: `${year}-${monthNum}-23` },
      ];

      console.log(`Month check: ${mentionedMonth}, windows:`, JSON.stringify(windows));
      const windowChecks = await Promise.all(
        windows.flatMap(w => [
          checkAvailability(UNIT_707_PROPERTY_ID, w.arrival, w.departure),
          checkAvailability(UNIT_1006_PROPERTY_ID, w.arrival, w.departure),
        ])
      );

      console.log(`Month check results for ${mentionedMonth}:`, JSON.stringify(windowChecks));
      const hasAnyAvailability = windowChecks.some(r => r === true);
      console.log(`hasAnyAvailability for ${mentionedMonth}:`, hasAnyAvailability);
      availabilityStatus = `MONTH_QUERY:${mentionedMonth} | windows_checked:3 | any_available:${hasAnyAvailability}`;

      if (hasAnyAvailability) {
        availabilityContext = `MONTH AVAILABILITY: Live spot-checks found SOME openings in ${mentionedMonth} but it is not wide open. Do NOT say great news or imply lots of availability. Say something like: "${mentionedMonth} has some openings but dates do fill up — share your exact check-in and check-out dates plus number of adults and children and I'll check live and create a booking link for you! You can also browse open dates at https://www.destincondogetaways.com/availability"`;
      } else {
        availabilityContext = `MONTH AVAILABILITY: All spot-checks show ${mentionedMonth} appears heavily booked. Be honest — tell guest it looks like a busy month. Suggest sharing exact dates so you can check precisely, or browsing https://www.destincondogetaways.com/availability for any open gaps.`;
      }
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
        availabilityContext = `AVAILABILITY CHECK FAILED. Ask guest to contact Ozan at (972) 357-4262.`;
      }
    }

    // Blog content
    let blogContext = "";
    const blogTopic = detectBlogTopic(lastUser);
    if (blogTopic) {
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

${discountContext ? discountContext + "\n\n" : ""}${unitComparisonContext ? unitComparisonContext + "\n\n" : ""}${escalationContext ? escalationContext + "\n\n" : ""}${availabilityContext ? "⚡ " + availabilityContext + "\n\nIMPORTANT: Use ONLY these live results. Never offer booked units. Always include exact booking link(s).\n\n" : ""}${blogContext}

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
- 2 beach chairs + umbrella (set up in open public section behind LDV rental chairs). If guests want front-row beach service, mention LDV Beach Chairs: 866-651-1869 | https://www.ldvbeach.com — recommend booking in advance!
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
- 3 pools: indoor heated pool (year-round) + 2 outdoor pools (one heated seasonally) + kiddie pool
- Hot tub, Jacuzzi, Sauna
- Fitness room, Tennis court
- Outdoor gas grills (ground level next to cafe)
- Direct beach access from back of building
- 5 elevators (accessible), disabled parking
- Gated resort — security at entrance for guest safety and privacy
- Pool bracelets required March–October — keeps resort comfortable and secure during busy season
- Washer/dryer on every floor — right side of hallway at the end. Quarters AND credit card. Any floor.
- EV charging on premises
- Free parking up to 2 cars — parking pass at front desk

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECK-IN & CHECK-OUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Check-in: 4:00 PM CST — PIN active at this time, keyless entry
- Go directly to unit — no lobby check-in needed
- Stop at front desk for parking pass and pool bracelets (Mar-Oct) — before or after settling in
- Check-out: 10:00 AM CST — next guests are counting on it
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

SMOKING: Not allowed in unit or on balcony. Two designated areas:
1) Next to the Tiki Bar  2) North entrance of garage, left side
Violations charged to card on file.

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
TOWELS: Unit towels stay inside. Bring beach towels.
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
- Invent policies (booking transfers, date changes) — refer to Ozan

INFORMATIONAL QUESTIONS: Answer directly and warmly. Ask one engaging follow-up.
BOOKING QUESTIONS WITH DATES: Always include booking link + mention code DESTINY.
DISCOUNT/DEAL QUESTIONS: Follow the 🚨 instruction at the top of this prompt exactly.`;

    const openAIMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openAIMessages,
      max_tokens: 450,
      temperature: 0.75,
    });

    const reply = completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response. Please try again!";

    await logToSheets(
      lastUser,
      reply,
      dates ? `${dates.arrival} to ${dates.departure}` : "",
      availabilityStatus || "INFO_QUESTION"
    );

    return res.status(200).json({ reply });

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
