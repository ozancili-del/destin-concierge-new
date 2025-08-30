// pages/api/chat.js

// ─────────────────────────────────────────────────────────────────────────────
// Config (env overrides allowed)
// ─────────────────────────────────────────────────────────────────────────────
const BOOK_URL =
  process.env.OWNERREZ_BOOK_URL ||
  "https://www.destincondogetaways.com/book";

const PROPERTY_PARAM =
  process.env.OWNERREZ_PROPERTY_PARAM || "property";

// IMPORTANT: this must match the visible text in your Property dropdown
const DEFAULT_PROPERTY =
  process.env.OWNERREZ_DEFAULT_PROPERTY || "Pelican beach resort unit 1006";

// Map anything a guest might type → the exact label your form expects
const PROPERTIES = {
  "pelican beach resort unit 1006": "Pelican beach resort unit 1006",
  "unit 1006": "Pelican beach resort unit 1006",
  "1006": "Pelican beach resort unit 1006",
};

// ─────────────────────────────────────────────────────────────────────────────
// Parsers
// ─────────────────────────────────────────────────────────────────────────────
function normalizeYear(yy) {
  if (!yy) return null;
  if (yy.length === 4) return yy;
  const n = parseInt(yy, 10);
  return (n < 70 ? "20" : "19") + yy; // 00–69 => 2000s, 70–99 => 1900s
}

const MONTHS = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

// Return ISO dates in order of appearance
function collectDates(text = "") {
  const t = String(text);
  const hits = [];

  // YYYY-MM-DD
  for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const [, y, mo, d] = m;
    hits.push({ iso: `${y}-${mo}-${d}`, i: m.index });
  }

  // MM/DD/YY or MM/DD/YYYY
  for (const m of t.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g)) {
    let [, mm, dd, yy] = m;
    yy = normalizeYear(yy);
    hits.push({ iso: `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`, i: m.index });
  }

  // Month DD YYYY (Oct 10 2025 / October 10, 2025)
  for (const m of t.matchAll(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{2,4})\b/g)) {
    let [, mname, dd, yy] = m;
    const mo = MONTHS[mname.toLowerCase()];
    if (mo) {
      yy = normalizeYear(yy);
      hits.push({ iso: `${yy}-${mo}-${String(dd).padStart(2, "0")}`, i: m.index });
    }
  }

  hits.sort((a, b) => a.i - b.i);
  return hits.map(h => h.iso);
}

function extractProperty(text = "") {
  const t = text.toLowerCase();

  // direct phrase matches
  for (const k of Object.keys(PROPERTIES)) {
    if (t.includes(k)) return PROPERTIES[k];
  }

  // "unit 1234" numeric pattern
  const m = t.match(/unit\s*(\d{3,5})/);
  if (m && PROPERTIES[m[1]]) return PROPERTIES[m[1]];

  return null;
}

function extractDatesGuestsProperty(text = "") {
  const dates = collectDates(text);

  // guests
  let adults, children;
  const mAdults = text.match(/(\d+)\s*adult(s)?/i);
  if (mAdults) adults = parseInt(mAdults[1], 10);

  const mKids = text.match(/(\d+)\s*(kid|kids|child|children)/i);
  if (mKids) children = parseInt(mKids[1], 10);

  const mGuests = text.match(/(\d+)\s*guest(s)?/i);
  if (mGuests && adults === undefined && children === undefined) {
    adults = parseInt(mGuests[1], 10);
    children = 0;
  }

  if (adults === undefined) adults = 2;
  if (children === undefined) children = 0;

  const propertyValue = extractProperty(text) || DEFAULT_PROPERTY;

  if (dates.length >= 2) {
    return { start: dates[0], end: dates[1], adults, children, propertyValue };
  }
  return null;
}

function fmtUS(iso) { // YYYY-MM-DD -> MM/DD/YYYY
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

// Build ONE link in the format your page expects
function buildQuoteLink({ start, end, adults, children, propertyValue }) {
  const params = new URLSearchParams();
  params.set("arrival", fmtUS(start));
  params.set("departure", fmtUS(end));
  params.set("adults", String(adults));
  params.set("children", String(children));
  params.set(PROPERTY_PARAM, propertyValue); // e.g., property=Pelican beach resort unit 1006 OR propertyId=12345

  const base = (BOOK_URL || "").replace(/\/$/, "");
  return `${base}?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple FAQ fallback (no AI)
// ─────────────────────────────────────────────────────────────────────────────
function norm(s = "") { return s.toLowerCase().replace(/[\s\-_]/g, ""); }
function faqReply(userText = "") {
  const n = norm(userText);
  if (n.includes("wifi") || n.includes("internet"))
    return "Yes—fast Wi-Fi is included. The network name and password are in your arrival email.";
  if (n.includes("parking"))
    return "We have free on-site parking. One spot per unit; overflow street parking is available.";
  if (n.includes("checkin") || n.includes("earlycheckin"))
    return "Check-in is 4pm. Early check-in may be possible—tell me your dates and I’ll check.";
  if (n.includes("checkout") || n.includes("latecheckout"))
    return "Check-out is 11am. Late check-out is subject to availability.";
  if (n.includes("pets"))
    return "We welcome small, well-behaved pets with prior approval and a cleaning fee.";
  if (n.includes("book") || n.includes("availability") || n.includes("reserve"))
    return "Share your unit, check-in/check-out dates, and guests, and I’ll create a quote link.";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// API handler
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === "GET") {
    // quick health/config check
    return res.status(200).json({
      ok: true,
      bookUrl: BOOK_URL,
      propertyParam: PROPERTY_PARAM,
      defaultProperty: DEFAULT_PROPERTY,
    });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [] } = req.body || {};
    const lastUser = [...messages].reverse().find(m => m.role === "user")?.content || "";

    // 1) Dates/Guests/Property → single quote link
    const parsed = extractDatesGuestsProperty(lastUser);
    if (parsed) {
      const link = buildQuoteLink(parsed);
      const guestLine =
        `${parsed.adults} adult${parsed.adults > 1 ? "s" : ""}` +
        (parsed.children ? ` + ${parsed.children} child${parsed.children > 1 ? "ren" : ""}` : "");
      const reply =
        `Great — **${parsed.propertyValue}** for **${guestLine}**, ` +
        `check-in **${parsed.start}**, check-out **${parsed.end}**.\n\n` +
        `Here’s your **instant quote**:\n${link}\n\n` +
        `You can adjust details on the booking page.`;
      return res.status(200).json({ reply });
    }

    // 2) FAQs
    const faq = faqReply(lastUser);
    if (faq) return res.status(200).json({ reply: faq });

    // 3) Prompt for the right info
    return res.status(200).json({
      reply:
        "Please share **unit** (e.g., “Unit 1006”), **check-in / check-out** dates, and **guests** (e.g., “2 adults 1 child”). I’ll send a quote link.",
    });
  } catch (err) {
    console.error("Chat API error:", err);
    // Always return JSON so the UI never breaks
    return res.status(200).json({
      reply: "I hit a temporary error. Please resend your unit, dates, and guest count.",
    });
  }
}
