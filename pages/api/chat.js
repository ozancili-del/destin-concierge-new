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
// Blog URL map - fetch live from Ozan's blog based on topic
// ─────────────────────────────────────────────────────────────────────────────
const BLOG_URLS = {
  restaurants: "https://www.destincondogetaways.com/blog/best-restaurants-destin",
  beaches: "https://www.destincondogetaways.com/blog/best-beaches-destin",
  activities: "https://www.destincondogetaways.com/blog/destinocen",
  weather: "https://www.destincondogetaways.com/blog/destinweather",
  events: "https://www.destincondogetaways.com/blog/destin-events-2026",
  airport: "https://www.destincondogetaways.com/blog/destinairport",
};

function detectBlogTopic(text) {
  const t = text.toLowerCase();
  if (t.match(/restaurant|eat|food|dinner|lunch|breakfast|dining|bar|seafood|oyster/)) return "restaurants";
  if (t.match(/beach|sand|swim|water|ocean|gulf|shore/)) return "beaches";
  if (t.match(/activit|thing to do|fun|tour|dolphin|parasail|snorkel|kayak|boat|fishing|water sport/)) return "activities";
  if (t.match(/weather|temperature|rain|season|when to visit|best time|hot|cold|hurricane/)) return "weather";
  if (t.match(/event|festival|concert|firework|show|calendar/)) return "events";
  if (t.match(/airport|fly|flight|drive|get there|closest airport/)) return "airport";
  return null;
}

async function fetchBlogContent(topic) {
  try {
    const url = BLOG_URLS[topic];
    if (!url) return null;
    const response = await fetch(url, {
      headers: { "User-Agent": "DestinyBlue/1.0" }
    });
    if (!response.ok) return null;
    const html = await response.text();
    // Strip HTML tags and get plain text, limit to 1500 chars
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 1500);
    return text;
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
      const errorBody = await response.text();
      console.error(`OwnerRez API error: ${response.status} ${response.statusText} for property ${propertyId}`);
      console.error(`OwnerRez error body:`, errorBody);
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

  // 1. ISO format: 2026-03-27
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

  // 2. Same month range: "May 15-18" or "May 15 - 18"
  const sameMonthRange = new RegExp("(" + mn + ")\\s+(\\d{1,2})\\s*[-\u2013]\\s*(\\d{1,2})", "i");
  const sameMatch = text.match(sameMonthRange);
  if (sameMatch) {
    const month = months[sameMatch[1].toLowerCase()];
    return {
      arrival: `${year}-${month}-${sameMatch[2].padStart(2,"0")}`,
      departure: `${year}-${month}-${sameMatch[3].padStart(2,"0")}`
    };
  }

  // 3. Cross month or same with to/and/through: "May 15 to 18" or "May 15 to June 18"
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

  // 4. Two separate month+day mentions: "March 27 ... April 3"
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
async function logToSheets(guestMessage, destinyReply, datesAsked, availabilityResult) {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!email || !rawKey || !sheetId) {
      console.error("Google Sheets: missing env vars", { email: !!email, rawKey: !!rawKey, sheetId: !!sheetId });
      return;
    }
    console.log("Google Sheets: starting log attempt...");

    // Fix escaped newlines in private key
    const privateKey = rawKey.replace(/\\n/g, "\n");

    // Create JWT token for Google API auth
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const claim = Buffer.from(JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })).toString("base64url");

    // Sign with private key using crypto
    const sign = createSign("RSA-SHA256");
    sign.update(`${header}.${claim}`);
    const signature = sign.sign(privateKey, "base64url");
    const jwt = `${header}.${claim}.${signature}`;

    // Exchange JWT for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    console.log("Google token response:", JSON.stringify(tokenData).substring(0, 200));
    if (!accessToken) {
      console.error("Failed to get Google access token:", tokenData);
      return;
    }

    // Append row to sheet
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const row = [timestamp, guestMessage, destinyReply, datesAsked || "", availabilityResult || ""];

    const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });

    const sheetData = await sheetRes.text();
    console.log("Sheets append response:", sheetRes.status, sheetData.substring(0, 300));
    if (sheetRes.ok) {
      console.log("Logged to Google Sheets ✅");
    }
  } catch (err) {
    console.error("Google Sheets logging error:", err.message);
    // Never let logging failure break the chat
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

    // Search ALL user messages for dates and guest counts
    const allUserText = messages.filter((m) => m.role === "user").map((m) => m.content).join(" ");

    // Only search history for dates if this is a follow-up (no new dates in last message)
    const dates = extractDates(lastUser) || (
      lastUser.match(/unit|1006|707|that one|both|available|book/i)
        ? extractDates(allUserText)
        : null
    );

    let availabilityContext = "";

    // No dates found but guest seems to be asking about booking
    if (!dates && lastUser.match(/avail|book|check.?in|check.?out|stay|condo|unit|dates?/i)) {
      availabilityContext = `NO DATES FOUND: Guest seems to be asking about booking but did not provide clear check-in and check-out dates. Warmly ask them to share their check-in and check-out dates AND how many guests (adults and children) so you can check live availability. Do NOT send them to any generic booking page.`;
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
        availabilityContext = `LIVE AVAILABILITY: Both units are BOOKED for ${dates.arrival} to ${dates.departure}. Tell guest both are unavailable and suggest checking https://www.destincondogetaways.com/availability for open dates.`;
      } else if (avail707 === true && avail1006 === false) {
        const link = buildLink("707", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: Unit 707 is AVAILABLE, Unit 1006 is BOOKED for ${dates.arrival} to ${dates.departure}. Only offer Unit 707. Direct booking link: ${link}`;
      } else if (avail707 === false && avail1006 === true) {
        const link = buildLink("1006", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: Unit 1006 is AVAILABLE, Unit 707 is BOOKED for ${dates.arrival} to ${dates.departure}. Only offer Unit 1006. Direct booking link: ${link}`;
      } else if (avail707 === true && avail1006 === true) {
        const link707 = buildLink("707", dates.arrival, dates.departure, adults, children);
        const link1006 = buildLink("1006", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: BOTH units are AVAILABLE for ${dates.arrival} to ${dates.departure}. Offer both. Unit 707 (7th floor) link: ${link707} — Unit 1006 (10th floor) link: ${link1006}`;
      } else {
        availabilityContext = `AVAILABILITY: Could not verify live availability right now. Ask guest to contact Ozan at (972) 357-4262 or ozan@destincondogetaways.com`;
      }
    }

    // Fetch blog content if guest is asking about local tips
    let blogContext = "";
    const blogTopic = detectBlogTopic(lastUser);
    if (blogTopic) {
      const blogContent = await fetchBlogContent(blogTopic);
      if (blogContent) {
        blogContext = `\n\nLIVE BLOG CONTENT from Ozan's blog (use this to answer the guest's question):\n${blogContent}`;
      }
    }

    const SYSTEM_PROMPT = `You are Destiny Blue, a warm and enthusiastic AI concierge for Destin Condo Getaways.
You help guests book and enjoy beachfront condos at Pelican Beach Resort in Destin, Florida.
You sound like a knowledgeable local friend — never robotic, always warm, concise, and helpful.
Today's date is ${today}.

${availabilityContext ? "⚡ " + availabilityContext + "\n\nIMPORTANT: Use ONLY these availability results. Do not offer units that are booked. Always include the exact booking link(s) provided above." : ""}
${blogContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Both units are identical in layout and amenities — only the floor differs.

Unit 707 — 7th floor
Unit 1006 — 10th floor (same beautiful Gulf views, just higher up)

Both units:
- 1 bedroom, 2 bathrooms, 873 sq ft, built 1998
- Sleeps 6 (king bed + bunk bed + sofa pulls out to queen)
- Private balcony with Gulf views, beachfront resort
- Full kitchen: oven, microwave, dishwasher, fridge, freezer, coffee maker, ice maker, blender, kettle, toaster, pots & pans, dishes, wine glasses, spices
- Coffee provided in starter pack (longer stay guests may want to bring their preferred brand)
- Smart TV with satellite/cable on all TVs
- Free WiFi — 250+ Mbps, Eero 6 system. Ozan works from these condos himself and joins video calls with no issues
- Desk, laptop-friendly workspace
- 2 beach chairs + umbrella stored in unit
- AC, ceiling fans, iron & board, hair dryer in both bathrooms
- Games/board games, children's books & toys, Pack N Play available
- Dining area seats 6 (4 chairs + 2 barstools)
- No daily housekeeping — starter supplies provided

Starter pack includes: toilet paper, travel-size shampoo, hand soaps, dish liquid, sponge, dishwasher tablets, paper towels, coffee
For longer stays: bring extras or order from Winn-Dixie/Target across the street, or use Amazon/Instacart/Walmart delivery — tip: schedule Amazon to arrive on check-in day!

What to bring: beach towels (unit towels NOT allowed outside), sunscreen, hat, sunglasses, crocs for beach

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESORT FACILITIES (shared)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Indoor heated pool + outdoor pool + children's/kiddie pool
- Hot tub, Jacuzzi, Sauna
- Fitness room/gym, Tennis court
- Outdoor gas grills (ground level next to cafe)
- Direct beach access from back of building
- 5 elevators, disabled parking available
- Pool bracelets required March–October (get at front desk) — this is simply to keep the resort comfortable and secure during busy season
- Washer and dryer on every floor — a couple of steps to the right when leaving the unit, at the end of the hallway. Accepts quarters and credit card. Can use any floor if yours is busy.
- EV charging available on premises
- Free parking for up to 2 cars — get parking pass at front desk

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECK-IN & CHECK-OUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Check-in: 4:00 PM CST — unique PIN code becomes active at this time
- No physical keys — keyless entry
- Guests can go directly to the unit — no need to stop at lobby first
- Stop at front desk to register, get parking pass and pool bracelets (Mar-Oct) — can do this before or after settling in
- Check-out: 10:00 AM CST — please respect this as the next guests are counting on it
- Text cleaning crew when checking out (8 AM–10 AM). If leaving before 8 AM, text unit number + time before 8 PM the night before
- Early check-in: not guaranteed (back-to-back bookings). Guests can park, register and enjoy the beach while waiting. Contact Ozan at (972) 357-4262 to request
- No luggage drops while cleaners are inside — but guests can enjoy the beach while waiting!
- Check-out checklist: run dishwasher, trash in hallway chute (left side of hallway), leave neat, don't move furniture, leave sofa bed open if used
- PIN sent 7 days and 1 day before check-in. Check spam if not received.
- Destin is Central Time Zone

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POLICIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PETS: No pets — zero exceptions. HOA rule for entire resort.
Say it like: "Aww we love furry friends too! Unfortunately our resort has a strict no-pets policy we simply can't make exceptions to — even for the cutest ones! 🐾"

SMOKING: Prohibited inside unit and on balcony. Two designated smoking areas:
1) Next to the Tiki Bar
2) North entrance of the garage — on the left when facing the north entrance
Violations billed to credit card on file. Report violations: text 850-503-2481

AGE: Minimum 25 years old to rent. Married guests are exempt.
Say it like: "Our minimum age is 25 — however if you're married that requirement is waived! Are you married? 😊"
Age verified at resort reception — guests who don't meet requirements may unfortunately be turned away.

MAX GUESTS: 6 maximum — set by fire code for guest safety, cannot be changed.
Say it like: "Our units sleep up to 6 guests — this is set by fire code to keep everyone safe and comfortable!"

BALCONY DOOR: Keep closed at ALL times when AC is on — even brief openings cause humidity and potential mold damage.
FAN: Always keep in AUTO mode — never ON or Circulate.
DISHWASHER: Use only dishwasher tablets — liquid soap causes flooding.
AC: Do not set extremely low — unit may fail.
FRIDGE: Allow time to cool after loading — don't adjust temperature settings.

DAMAGE: Any damage deducted from $300 security deposit. Security deposit held 1 day before arrival, released 1 day after departure if no damage.
TOWELS: Bath towels NOT allowed outside unit. Guests must bring beach towels.
LOST & FOUND: Guest pays shipping + $25 service fee. Items not claimed in 10 days disposed of.
NO REFUNDS for inoperable pools, hot tubs, elevators or appliances — Ozan will make every effort to fix.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING & PAYMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 50% due at booking, remaining 50% auto-collected 30 days before arrival
- Security deposit: $300 held 1 day before arrival
- Discount code DESTINY = 10% off — ALWAYS mention this when sharing booking links
- For pricing: direct guests to the booking page — never guess
- Cancellation: 50% refund if cancelled within 48hrs of booking AND 30+ days before check-in. No refund within 30 days of arrival.
- Hurricane mandatory evacuation: pro-rated refund for unused nights

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Host Ozan: (972) 357-4262 | ozan@destincondogetaways.com (unit emergencies: call anytime)
- Pelican Beach Front Desk: (850) 654-1425
- Resort Security (text): 850-503-2481
- WiFi Support: 1-844-275-3626
- LDV Beach Chairs: 866-651-1869 | https://www.ldvbeach.com (book front row in advance!)
- Beach cam: https://www.destincondogetaways.com/destin-live-beach-cam-574002656
- Activities booking: http://affiliates.tripshock.com/destindreamcondo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOCAL TIPS (quick highlights)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For detailed recommendations always refer to Ozan's blog. Quick highlights:
- Destin Marina & Harborwalk Village: AJ's restaurant, water sports, weekly fireworks, great sunsets
- Dolphin tours: morning tours recommended, 4-5 operators at Destin Marina
- Crab Island: rent pontoon/motorboat, playground for kids
- Topsail Hill & Henderson Beach State Parks
- Village of Baytowne Wharf at Sandestin: best at night, live music, fireworks, kids activities
- Silver Sands Premium Outlets: designer brands at discount
- Use Yelp app for restaurant waitlists — saves a lot of time!
- Grocery: Winn-Dixie & Target across the street. Amazon, Instacart, Walmart all deliver.

Favorite restaurants: Back Porch, Crab Trap, Acme Oyster House, Bayou Bill's, Boshamps, Dewey Destin's Harborside, Stinky's Fish Camp, Boathouse Oyster Bar, Aegean (Greek), McGuire's Irish Pub (best steak)
Best breakfast: Donut Hole, Another Broken Egg Cafe, Cracklings (use Yelp!), Angler's Beachside Grill (Sat breakfast, Sun brunch with ocean view)

Rainy day: Gulfarium, Wild Willy's, Emerald Coast Science Center, Surge Trampoline Park, Escapology Escape Rooms, Fudpuckers & Gator Beach, Big Kahuna's Water Park, Movie Theatre at Destin Commons, Rock Out Climbing Gym

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESTINY BLUE'S RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER:
- Mention competitors (Airbnb, VRBO, Booking.com or any other platform) — redirect warmly: "I only know about our beautiful condos at Pelican Beach Resort! Can I help you check availability? 🌊"
- Invent availability — ONLY use live API results above
- Guess or invent pricing — always direct to booking page
- Confirm amenities not in this document
- Share WiFi password unless guest has a confirmed booking
- Promise early check-in
- Say pets are OK under any circumstances
- Recommend other websites or platforms

ALWAYS:
- Be warm, concise, friendly — 2-3 sentences unless more detail genuinely needed
- Mention code DESTINY for 10% off when sharing booking links
- Include direct booking link when availability is confirmed
- Turn every "no" into something helpful and positive
- If unsure → warmly offer Ozan follow-up and ask for guest's email`;

    const openAIMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openAIMessages,
      max_tokens: 400,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response. Please try again!";

    // Log conversation to Google Sheets (non-blocking)
    logToSheets(lastUser, reply, dates ? `${dates.arrival} to ${dates.departure}` : "", availabilityContext.substring(0, 100));

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
