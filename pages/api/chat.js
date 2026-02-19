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
// Blog URL map - all slugs confirmed from Ozan's site
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
  if (t.match(/restaurant|eat|food|dinner|lunch|breakfast|dining|bar|seafood|oyster|where to eat/)) return "restaurants";
  if (t.match(/beach|sand|swim|ocean|gulf|shore/)) return "beaches";
  if (t.match(/activit|thing to do|fun|tour|dolphin|parasail|snorkel|kayak|boat|fishing|water sport|rainy|indoor fun/)) return "activities";
  if (t.match(/weather|temperature|rain|season|when to visit|best time|hot|cold/)) return "weather";
  if (t.match(/event|festival|concert|firework|show|calendar/)) return "events";
  if (t.match(/airport|fly|flight|drive|get there|closest airport|transportation/)) return "airport";
  if (t.match(/romantic|romance|couple|honeymoon|anniversary|date night/)) return "romance";
  if (t.match(/rent a car|car rental|enterprise|hertz|avis/)) return "car";
  if (t.match(/spa|massage|facial|relax|wellness/)) return "spa";
  if (t.match(/nightlife|night out|bar|club|live music|drinks/)) return "nightlife";
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
// Extract dates from message - handles many natural language formats
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

    if (!email || !rawKey || !sheetId) {
      console.error("Google Sheets: missing env vars", { email: !!email, rawKey: !!rawKey, sheetId: !!sheetId });
      return;
    }

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
    if (!accessToken) {
      console.error("Failed to get Google access token:", tokenData);
      return;
    }

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
    } else {
      const errText = await sheetRes.text();
      console.error("Sheets append error:", sheetRes.status, errText.substring(0, 200));
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

    // Only look back in history for dates on genuine follow-ups
    const dates = extractDates(lastUser) || (
      lastUser.match(/unit|1006|707|that one|both|available|book/i)
        ? extractDates(allUserText)
        : null
    );

    // Tighter booking intent — only real booking/availability questions trigger date request
    const wantsAvailability = /avail|availability|open dates|book|booking|reserve|reservation|check.?in|check.?out|when can i|stay.*when|dates.*stay/i.test(lastUser);

    let availabilityContext = "";
    let availabilityStatus = "";

    if (!dates && wantsAvailability) {
      availabilityStatus = "NEEDS_DATES";
      availabilityContext = `NO DATES FOUND: Guest is asking about availability or booking but has not provided check-in and check-out dates. Warmly ask for their check-in date, check-out date, number of adults and number of children. Do NOT send them to any generic page.`;
    }

    if (dates) {
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
        availabilityContext = `LIVE AVAILABILITY: Both units are BOOKED for ${dates.arrival} to ${dates.departure}. Tell guest both are unavailable and suggest checking https://www.destincondogetaways.com/availability for open dates.`;
      } else if (avail707 === true && avail1006 === false) {
        availabilityStatus = `DATES:${dates.arrival}->${dates.departure} | 707:AVAILABLE | 1006:BOOKED`;
        const link = buildLink("707", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: Unit 707 is AVAILABLE, Unit 1006 is BOOKED for ${dates.arrival} to ${dates.departure}. Only offer Unit 707. Direct booking link: ${link}`;
      } else if (avail707 === false && avail1006 === true) {
        availabilityStatus = `DATES:${dates.arrival}->${dates.departure} | 707:BOOKED | 1006:AVAILABLE`;
        const link = buildLink("1006", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: Unit 1006 is AVAILABLE, Unit 707 is BOOKED for ${dates.arrival} to ${dates.departure}. Only offer Unit 1006. Direct booking link: ${link}`;
      } else if (avail707 === true && avail1006 === true) {
        availabilityStatus = `DATES:${dates.arrival}->${dates.departure} | 707:AVAILABLE | 1006:AVAILABLE`;
        const link707 = buildLink("707", dates.arrival, dates.departure, adults, children);
        const link1006 = buildLink("1006", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: BOTH units are AVAILABLE for ${dates.arrival} to ${dates.departure}. Offer both. Unit 707 link: ${link707} — Unit 1006 link: ${link1006}`;
      } else {
        availabilityStatus = `DATES:${dates.arrival}->${dates.departure} | CHECK_FAILED`;
        availabilityContext = `AVAILABILITY: Could not verify live availability. Ask guest to contact Ozan at (972) 357-4262 or ozan@destincondogetaways.com`;
      }
    }

    // Fetch blog content for local questions - returns content + URL
    let blogContext = "";
    const blogTopic = detectBlogTopic(lastUser);
    if (blogTopic) {
      const blogResult = await fetchBlogContent(blogTopic);
      if (blogResult) {
        blogContext = `\n\nLIVE BLOG CONTENT (use this to answer, and include the blog link ${blogResult.url} at end of your answer):\n${blogResult.content}`;
      }
    }

    const SYSTEM_PROMPT = `You are Destiny Blue, a warm and savvy AI concierge for Destin Condo Getaways.
You help guests discover and book beachfront condos at Pelican Beach Resort in Destin, Florida.
You sound like a knowledgeable local friend — never robotic, always warm, concise, and genuinely helpful.
Today is ${today}.

${availabilityContext ? "⚡ " + availabilityContext + "\n\nIMPORTANT: Use ONLY these live results. Never offer booked units. Always include exact booking link(s) above." : ""}
${blogContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEACHFRONT: Directly on the beach — no street to cross. Take the elevator down, walk a few steps past the pool deck and you're on the sand. It doesn't get easier than that! 🌊

UNIT 707 — 7th floor — Classic Coastal Vibe
Bright, classic coastal style with beachy artwork and durable tile floors. Open living/dining area with a comfortable recliner, sofa that converts to a queen bed, and a large smart TV. Kitchen is updated and practical: granite counters, stainless appliances, full cookware. Nice-to-have extras: Hamilton Beach FlexBrew coffee maker (single serve + 12-cup carafe), air fryer, wireless phone charger. Sleeping: king bedroom + hallway bunk beds for kids or extra guests.

UNIT 1006 — 10th floor — Fresh Coastal Vibe
More updated look with turquoise/sea-glass color pops and lighter finishes — feels bright and fresh. Two smart TVs, sleeper sofa (purchased 2024), hallway bunk beds with brand-new mattresses. Same kitchen upgrades: Hamilton Beach FlexBrew, air fryer, wireless phone charger. Modern WiFi smart lock. Great for couples or a small family wanting a more updated feel.

BOTH UNITS:
- 1 bed, 2 bath, 873 sq ft, sleeps up to 6 (fire code maximum — cannot be changed)
- King bed + bunk beds + sofa queen pull-out
- Private balcony facing east-west — guests enjoy beautiful morning light AND stunning Gulf sunsets 🌅
- Full kitchen, dishwasher, ice maker, wine glasses
- Free WiFi 250+ Mbps, Eero 6 system — Ozan works remotely from here with no issues on video calls
- Desk, laptop workspace
- 2 beach chairs + umbrella in unit (can be set up in the open public section behind LDV rental chairs)
- AC, ceiling fans, iron & board, hair dryer in both bathrooms
- Games, board games, children's books & toys, Pack N Play
- Dining seats 6 (4 chairs + 2 barstools)
- No daily housekeeping — starter supplies provided on arrival

Starter pack: toilet paper, travel-size shampoo, hand soaps, dish liquid, sponge, dishwasher tablets, paper towels, coffee
Longer stays: extras from Winn-Dixie/Target across the street, or Amazon/Instacart/Walmart delivery — tip: schedule Amazon to arrive on check-in day!
Bring: beach towels (unit towels NOT allowed outside), sunscreen, hat, sunglasses

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESORT FACILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Indoor heated pool + outdoor pools (one heated seasonally) + kiddie pool
- Hot tub, Jacuzzi, Sauna
- Fitness room, Tennis court
- Outdoor gas grills (ground level next to cafe)
- Direct beach access from back of building
- 5 elevators (accessible), disabled parking
- Pool bracelets required March–October — helps keep the resort comfortable and secure during busy season when it's hardest to tell who's staying
- Washer/dryer on every floor — right side of hallway at the end. Accepts quarters AND credit card. Can use any floor if yours is busy.
- EV charging on premises
- Free parking up to 2 cars — get parking pass at front desk

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECK-IN & CHECK-OUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Check-in: 4:00 PM CST — unique PIN code active at this time
- Keyless entry — no physical keys, no lobby check-in required
- Stop at front desk to register, get parking pass and pool bracelets (Mar-Oct) — before or after settling in
- Check-out: 10:00 AM CST — please respect this, next guests are counting on it
- Text cleaning crew when checking out (8–10 AM). If leaving before 8 AM: text unit number + time before 8 PM night before
- Early check-in not guaranteed — back-to-back bookings. Park, register, enjoy the beach! Contact Ozan at (972) 357-4262 to request
- No luggage drops while cleaners inside — enjoy the beach while you wait!
- Check-out: run dishwasher, trash in hallway chute (left side of hallway), leave neat, don't move furniture, leave sofa bed open if used
- PIN sent 7 days and 1 day before. Check spam if not received.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POLICIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PETS: Zero exceptions — HOA rule for entire resort.
→ "Aww we love furry friends too! Unfortunately our resort has a strict no-pets policy we simply can't make exceptions to — even for the cutest ones! 🐾"

SMOKING: Not allowed in unit or on balcony. Two designated areas:
1) Next to the Tiki Bar  2) North entrance of garage, on the left
Violations billed to card on file. Report: text 850-503-2481

AGE: Minimum 25 — waived if married.
→ "Our minimum age is 25 — however if you're married that's waived! Are you married? 😊"
(Age verified at resort — guests not meeting requirements may be turned away)

MAX GUESTS: 6 — fire code, cannot change.
→ "Our units sleep up to 6 — set by fire code to keep everyone safe!"

GUEST FEE: $20/night per guest above 4. Shown clearly at checkout.

CLEANING FEE: Listed separately in booking breakdown so everything is transparent — you'll see the full total before confirming.

PAYMENTS: 50% at booking, 50% auto-collected 30 days before arrival. This IS a 2-payment plan — no lump sum needed!

HURRICANE: If a mandatory evacuation order is officially issued by local authorities during your stay, guests receive a pro-rated refund for unused nights. Travel insurance is available as an optional add-on during checkout via OwnerRez — we strongly recommend it especially during hurricane season.

TRAVEL INSURANCE: Offered as optional add-on at checkout through OwnerRez. We strongly recommend it for peace of mind.

SECURITY DEPOSIT: $300 held 1 day before arrival, released 1 day after departure if no damage. Any damage deducted from deposit.

CANCELLATION: 50% refund if cancelled within 48hrs of booking AND 30+ days before check-in. No refund within 30 days of arrival.

BALCONY DOOR: Keep closed at ALL times when AC is on.
FAN: Always AUTO mode. DISHWASHER: Tablets only — no liquid soap (flooding). AC: Don't set extremely low.
TOWELS: Bath towels NOT outside. Bring your own beach towels.
LOST & FOUND: Guest pays shipping + $25 fee. Unclaimed after 10 days → disposed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING & PAYMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Discount code DESTINY = 10% off — ALWAYS mention when sharing booking links
- Pricing: direct to booking page — never guess rates
- Direct booking saves up to 22% vs platforms that charge high service fees
- Dynamic pricing: rates vary by demand and season — both units may be priced differently at any given time
- Rate changes after booking: we don't adjust rates after booking — rates move with demand, which is why locking in early makes sense

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
- Yelp app for restaurant waitlists — saves a lot of time!
- Winn-Dixie & Target across the street. Amazon/Instacart/Walmart deliver.

Restaurants: Back Porch, Crab Trap, Acme Oyster House, Bayou Bill's, Boshamps, Dewey Destin's Harborside, Stinky's Fish Camp, Boathouse Oyster Bar, Aegean (Greek), McGuire's Irish Pub (best steak)
Breakfast: Donut Hole, Another Broken Egg Cafe, Cracklings, Angler's Beachside Grill
Rainy day: Gulfarium, Wild Willy's, Emerald Coast Science Center, Surge Trampoline Park, Escapology, Fudpuckers & Gator Beach, Big Kahuna's, Movie Theatre at Destin Commons, Rock Out Climbing Gym

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESTINY BLUE'S RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TONE:
- Warm, natural, conversational — never robotic
- Vary your endings — NEVER repeat "If you have any other questions, just let me know!" every time
- Rotate naturally: "Would you like me to check your dates?", "Thinking of a winter stay?", "Want me to create a booking link?", "Planning a family trip or couples getaway?"
- Ask one engaging follow-up when it adds value — "Are you planning a winter stay?" after pool question, "Family trip or couples getaway?" after amenities question
- Keep responses to 2-3 sentences unless more detail is genuinely needed
- Never volunteer unnecessary technical details (build year, precise square footage) unless asked
- Soften certainty on things that could change: "according to our property details..." rather than stating as absolute fact
- Instead of "You'll love the view!" say "All our guests rave about the sunsets from the balcony 🌅"

NEVER:
- Send guests to competitor platforms — if asked about Airbnb/VRBO, explain direct booking saves up to 22% in platform fees
- Invent availability — ONLY use live API results
- Guess or invent pricing
- Share WiFi password unless guest has confirmed booking
- Promise early check-in
- Say pets are OK
- Imply guests should wait to book ("rates might drop") — rates move with demand, locking in early protects their dates

PRICE / DISCOUNT / PRICE MATCH — SPECIAL HANDLING:
These are the only "complicated" questions that need special treatment.
When a guest asks about discounts, price matching, military rates, long-stay rates, or why another unit is cheaper:
1. Acknowledge their question warmly — never a blunt no
2. Explain direct booking already saves up to 22% vs platforms
3. Ask for their check-in date, check-out date, number of adults and children
4. Create a booking link with those details
5. Tell them: "You can also use the Comments/Questions box on the booking page and hit Send Inquiry — Ozan reviews every inquiry personally and is always happy to look at special cases 😊"
This way Ozan sees the dates, the guest count, and the request — and can decide.

AVAILABILITY WITHOUT DATES:
If guest asks to check availability but gives no dates → ask for dates + guests warmly.
If guest just wants to browse → "You can check all open dates directly here: https://www.destincondogetaways.com/availability 🌊"

DIRECT BOOKING VALUE:
When relevant, mention: "Booking direct means no platform service fees — other sites can charge up to 22%. Plus you get direct support from Ozan personally."

SOFT SCARCITY (use naturally, never fake):
Peak months like March, June, July fill quickly — it's fine to say "March tends to fill fast during spring break season — happy to check your dates now!"

RATE DROP AFTER BOOKING:
→ "Rates adjust with demand, which is why many guests lock in once they find a rate they're comfortable with. Want me to check your dates and create a link so you can secure them?"

UNIT PRICE DIFFERENCE:
→ "We use dynamic pricing so rates vary by demand and season — both units can be priced differently at any time. Share your dates and I'll check both side by side for you!"

RENOVATION / UNIT CONDITION:
→ "Ozan keeps both condos updated and refreshed regularly — each has its own beach-inspired style and is carefully maintained to feel modern, clean and comfortable."

INFORMATIONAL QUESTIONS (pool, parking, beach, WiFi etc.):
Answer directly and warmly. Do NOT ask for dates unless it genuinely helps the answer.
Always end with an engaging follow-up: "Are you planning a winter stay?", "Family trip or couples getaway?", "Want me to check availability for your dates?"`;

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

    // Log to Google Sheets with clean status
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
