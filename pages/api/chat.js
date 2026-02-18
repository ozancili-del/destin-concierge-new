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
// Check availability for a property via OwnerRez API
// ─────────────────────────────────────────────────────────────────────────────
async function checkAvailability(propertyId, arrival, departure) {
  try {
    const token = process.env.OWNERREZ_API_TOKEN;
    const credentials = Buffer.from(`${OWNERREZ_USER}:${token}`).toString("base64");
    const url = `https://api.ownerreservations.com/v2/properties/${propertyId}/availability?start_date=${arrival}&end_date=${departure}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const hasBlocked = data?.items?.some((d) => d.available === false);
    return !hasBlocked;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract dates from message
// ─────────────────────────────────────────────────────────────────────────────
function extractDates(text) {
  const isoPattern = /(\d{4}-\d{2}-\d{2})/g;
  const matches = text.match(isoPattern);
  if (matches && matches.length >= 2) {
    return { arrival: matches[0], departure: matches[1] };
  }

  // Try month name patterns like "March 27" and "April 3"
  const months = { january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12 };
  const monthPattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/gi;
  const dateMatches = [...text.matchAll(monthPattern)];
  if (dateMatches.length >= 2) {
    const year = new Date().getFullYear();
    const toISO = (m) => {
      const month = String(months[m[1].toLowerCase()]).padStart(2, "0");
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

    // Check if message contains dates - if so, do live availability check
    let availabilityContext = "";
    const dates = extractDates(lastUser);

    if (dates) {
      const [avail707, avail1006] = await Promise.all([
        checkAvailability(UNIT_707_ID, dates.arrival, dates.departure),
        checkAvailability(UNIT_1006_ID, dates.arrival, dates.departure),
      ]);

      // Extract guest counts
      const adultsMatch = lastUser.match(/(\d+)\s*adult/i);
      const childrenMatch = lastUser.match(/(\d+)\s*(kid|child)/i);
      const adults = adultsMatch ? adultsMatch[1] : "2";
      const children = childrenMatch ? childrenMatch[1] : "0";

      if (avail707 === false && avail1006 === false) {
        availabilityContext = `AVAILABILITY CHECK RESULT: Both units are UNAVAILABLE for ${dates.arrival} to ${dates.departure}. Tell the guest both units are booked for those dates and suggest they check nearby dates or the availability calendar at https://www.destincondogetaways.com/availability`;
      } else if (avail707 === true && avail1006 === false) {
        const link = buildLink("707", dates.arrival, dates.departure, adults, children);
        availabilityContext = `AVAILABILITY CHECK RESULT: Unit 707 is AVAILABLE, Unit 1006 is NOT available for ${dates.arrival} to ${dates.departure}. Only offer Unit 707. Booking link: ${link} — remind them to use code DESTINY for 10% off.`;
      } else if (avail707 === false && avail1006 === true) {
        const link = buildLink("1006", dates.arrival, dates.departure, adults, children);
        availabilityContext = `AVAILABILITY CHECK RESULT: Unit 1006 is AVAILABLE, Unit 707 is NOT available for ${dates.arrival} to ${dates.departure}. Only offer Unit 1006. Booking link: ${link} — remind them to use code DESTINY for 10% off.`;
      } else if (avail707 === true && avail1006 === true) {
        const link707 = buildLink("707", dates.arrival, dates.departure, adults, children);
        const link1006 = buildLink("1006", dates.arrival, dates.departure, adults, children);
        availabilityContext = `AVAILABILITY CHECK RESULT: BOTH units are AVAILABLE for ${dates.arrival} to ${dates.departure}. Offer both options. Unit 707 (7th floor) link: ${link707} — Unit 1006 (10th floor, better views) link: ${link1006} — remind them to use code DESTINY for 10% off.`;
      } else {
        // API call failed - still helpful
        availabilityContext = `AVAILABILITY CHECK: Could not verify live availability. Direct guest to check https://www.destincondogetaways.com/availability for real-time availability.`;
      }
    }

    const SYSTEM_PROMPT = `You are Destiny Blue, a friendly and enthusiastic AI concierge for Destin Condo Getaways.
You help guests book beachfront condos at Pelican Beach Resort in Destin, Florida.
You are warm, helpful, and love Destin. Keep responses concise and friendly.
Today's date is ${today}.

${availabilityContext ? availabilityContext + "\n\nIMPORTANT: Use the availability results above to answer the guest. Do not make up availability." : ""}

PROPERTIES:
Unit 707 (7th floor): 1 bedroom, 2 bathrooms, sleeps up to 6, Gulf views, beachfront
Unit 1006 (10th floor): 1 bedroom, 2 bathrooms, sleeps up to 6, higher floor = better views, beachfront

BOTH UNITS INCLUDE:
- Full kitchen, private balcony with Gulf views, free Wi-Fi, free parking
- Indoor + outdoor pools, hot tubs, gym, beachfront access, washer/dryer

BOOKING INFO:
- Use discount code DESTINY for 10% off
- 50% deposit at booking, 50% before arrival
- Check-in: 4:00 PM | Check-out: 11:00 AM
- Early/late subject to availability

POLICIES:
- Small pets allowed with prior approval + cleaning fee
- No smoking | Max 6 guests per unit

CONTACT: (972) 357-4262 | ozan@destincondogetaways.com

INSTRUCTIONS:
- Never make up availability - always use the availability check results above
- Never make up pricing - direct to booking page for current rates
- Be concise - 2-3 sentences max unless more detail is needed
- If you don't know something, offer to have Ozan follow up and ask for their email`;

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
    console.error("Destiny Blue API error:", err);
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
