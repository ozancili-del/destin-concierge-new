// pages/api/chat.js
// Destiny Blue - Real AI Concierge powered by OpenAI + OwnerRez live availability

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OWNERREZ_USER = "destindreamcondo@gmail.com";
const UNIT_707_ID = "293722";
const UNIT_1006_ID = "410894";

// ─────────────────────────────────────────────────────────────────────────────
// Check availability via OwnerRez v1 API
// ─────────────────────────────────────────────────────────────────────────────
async function checkAvailability(propertyId, arrival, departure) {
  try {
    const token = process.env.OWNERREZ_API_TOKEN;
    const credentials = Buffer.from(`${OWNERREZ_USER}:${token}`).toString("base64");

    // v1 listings availability endpoint - pass comma-separated IDs
    const url = `https://api.ownerrez.com/v1/listings/availability?ids=${propertyId}&startdate=${arrival}&enddate=${departure}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`OwnerRez API error: ${response.status} ${response.statusText} for property ${propertyId}`);
      return null;
    }

    const data = await response.json();
    console.log(`OwnerRez availability for ${propertyId}:`, JSON.stringify(data).substring(0, 300));

    // The API returns availability data - check if any dates are blocked
    // Look for the property in the response
    const listing = data?.listings?.find(l => String(l.id) === String(propertyId)) || data;

    // If availability string exists, check for 'N' (not available) in the range
    if (listing?.availability) {
      return !listing.availability.includes("N");
    }

    // Alternative: check items array
    if (data?.items) {
      const hasBlocked = data.items.some(d => d.available === false || d.availability === "N");
      return !hasBlocked;
    }

    // If we got a 200 response but can't parse, assume available
    return true;
  } catch (err) {
    console.error("OwnerRez fetch error:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract dates from message
// ─────────────────────────────────────────────────────────────────────────────
function extractDates(text) {
  const isoPattern = /(\d{4}-\d{2}-\d{2})/g;
  const isoMatches = text.match(isoPattern);
  if (isoMatches && isoMatches.length >= 2) {
    return { arrival: isoMatches[0], departure: isoMatches[1] };
  }

  const months = {
    january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
    july:"07",august:"08",september:"09",october:"10",november:"11",december:"12"
  };
  const monthPattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/gi;
  const dateMatches = [...text.matchAll(monthPattern)];
  if (dateMatches.length >= 2) {
    const year = new Date().getFullYear();
    const toISO = (m) => {
      const month = months[m[1].toLowerCase()];
      const day = String(m[2]).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    return { arrival: toISO(dateMatches[0]), departure: toISO(dateMatches[1]) };
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
  return `${base}?or_arrival=${arrival}&or_departure=${departure}&or_adults=${adults}&or_children=${children}`;
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

    let availabilityContext = "";
    const dates = extractDates(lastUser);

    if (dates) {
      const [avail707, avail1006] = await Promise.all([
        checkAvailability(UNIT_707_ID, dates.arrival, dates.departure),
        checkAvailability(UNIT_1006_ID, dates.arrival, dates.departure),
      ]);

      const adultsMatch = lastUser.match(/(\d+)\s*adult/i);
      const childrenMatch = lastUser.match(/(\d+)\s*(kid|child)/i);
      const adults = adultsMatch ? adultsMatch[1] : "2";
      const children = childrenMatch ? childrenMatch[1] : "0";

      if (avail707 === false && avail1006 === false) {
        availabilityContext = `LIVE AVAILABILITY: Both units are BOOKED for ${dates.arrival} to ${dates.departure}. Tell guest both are unavailable and suggest checking https://www.destincondogetaways.com/availability for open dates.`;
      } else if (avail707 === true && avail1006 === false) {
        const link = buildLink("707", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: Unit 707 is AVAILABLE, Unit 1006 is BOOKED for ${dates.arrival} to ${dates.departure}. Only offer Unit 707. Link: ${link}`;
      } else if (avail707 === false && avail1006 === true) {
        const link = buildLink("1006", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: Unit 1006 is AVAILABLE, Unit 707 is BOOKED for ${dates.arrival} to ${dates.departure}. Only offer Unit 1006. Link: ${link}`;
      } else if (avail707 === true && avail1006 === true) {
        const link707 = buildLink("707", dates.arrival, dates.departure, adults, children);
        const link1006 = buildLink("1006", dates.arrival, dates.departure, adults, children);
        availabilityContext = `LIVE AVAILABILITY: BOTH units are AVAILABLE for ${dates.arrival} to ${dates.departure}. Offer both. Unit 707 (7th floor): ${link707} — Unit 1006 (10th floor, best views): ${link1006}`;
      } else {
        availabilityContext = `AVAILABILITY: Could not verify live availability right now. Direct guest to https://www.destincondogetaways.com/availability`;
      }
    }

    const SYSTEM_PROMPT = `You are Destiny Blue, a friendly and enthusiastic AI concierge for Destin Condo Getaways.
You help guests book beachfront condos at Pelican Beach Resort in Destin, Florida.
You are warm, helpful, and love Destin. Keep responses concise and friendly.
Today's date is ${today}.

${availabilityContext ? "⚡ " + availabilityContext + "\n\nIMPORTANT: Use ONLY these availability results. Do not offer units that are booked." : ""}

PROPERTIES:
- Unit 707 (7th floor): 1 bed, 2 bath, sleeps 6, Gulf views, beachfront
- Unit 1006 (10th floor): 1 bed, 2 bath, sleeps 6, higher floor = better views, beachfront

BOTH UNITS: Full kitchen, private balcony, free Wi-Fi, free parking, pools (indoor+outdoor), hot tubs, gym, washer/dryer

BOOKING: Code DESTINY = 10% off | 50% deposit now, 50% before arrival | Check-in 4pm | Check-out 11am

POLICIES: Small pets OK with approval + fee | No smoking | Max 6 guests

CONTACT: (972) 357-4262 | ozan@destincondogetaways.com

RULES:
- Never make up availability - only use the live check results above
- Never make up pricing - direct to booking page for rates
- If you don't know something, offer to have Ozan follow up and ask for email
- Be concise - 2-3 sentences unless more detail needed
- Always mention code DESTINY for 10% off when sharing booking links`;

    const openAIMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openAIMessages,
      max_tokens: 350,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response. Please try again!";

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
