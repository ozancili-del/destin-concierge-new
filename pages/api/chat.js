// pages/api/chat.js

// ─────────────────────────────────────────────────────────────────────────────
// Config (override via Vercel env vars)
// ─────────────────────────────────────────────────────────────────────────────
const BOOK_URL =
  process.env.OWNERREZ_BOOK_URL || "https://www.destincondogetaways.com/book";

// IMPORTANT: Set this to your Unit 1006 Property ID (ORP12345 or just 12345)
const PROPERTY_ID = (process.env.OWNERREZ_PROPERTY_ID || "ORPXXXXXX").trim();

// ─────────────────────────────────────────────────────────────────────────────
// Date & guest parsing
// ─────────────────────────────────────────────────────────────────────────────
function normalizeYear(yy) {
  if (!yy) return null;
  if (yy.length === 4) return yy;
  const n = parseInt(yy, 10);
  return (n < 70 ? "20" : "19") + yy; // 00–69 -> 2000s, 70–99 -> 1900s
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

// Collect ISO (YYYY-MM-DD) dates in the order they appear
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
    hits.push({
      iso: `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`,
      i: m.index,
    });
  }

  // Month DD YYYY  (Oct 10 2025, October 10, 2025)
  for (const m of t.matchAll(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{2,4})\b/g)) {
    let [, mname, dd, yy] = m;
    const mo = MONTHS[mname.toLowerCase()];
    if (mo) {
      yy = normalizeYear(yy);
      hits.push({
        iso: `${yy}-${mo}-${String(dd).padStart(2, "0")}`,
        i: m.index,
      });
    }
  }

  hits.sort((a, b) => a.i - b.i);
  return hits.map(h => h.iso);
}

function extract(text = "") {
  const dates = collectDates(text);

  // Guests
  let adults, children;

  const adultsMatch = text.match(/(\d+)\s*adult(s)?/i);
  if (adultsMatch) adults = parseInt(adultsMatch[1], 10);

  const kidsMatch = text.match(/(\d+)\s*(kid|kids|child|children)/i);
  if (kidsMatch) children = parseInt(kidsMatch[1], 10);

  const guestsMatch = text.match(/(\d+)\s*guest(s)?/i);
  if (guestsMatch && adults === undefined && children === undefined) {
    adults = parseInt(guestsMatch[1], 10);
    children = 0;
  }

  // “adults only / no kids / no children” -> children = 0
  if (/adults?\s*only|no\s*(kid|kids|child|children)/i.test(text)) {
    children = 0;
  }

  if (adults === undefined) adults = 2;
  if (children === undefined) children = 0;

  if (dates.length >= 2) {
    const start = dates[0];
    const end = dates[1];
    return { start, end, adults, children };
  }
  return null;
}

function toUS(iso) { // YYYY-MM-DD -> MM/DD/YYYY
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build link with official OwnerRez params + common alternates
// ─────────────────────────────────────────────────────────────────────────────
function buildOwnerRezLink({ start, end, adults, children }) {
  const base = (BOOK_URL || "").replace(/\/$/, "");
  const usStart = toUS(start);
  const usEnd = toUS(end);

  const rawId = PROPERTY_ID;                 // e.g., ORP12345 or 12345
  const numericId = String(rawId).replace(/^ORP/i, ""); // 12345 (for alternates)

  const qs = new URLSearchParams();

  // Official hosted params (preferred)
  qs.set("or_arrival", start);               // ISO YYYY-MM-DD
  qs.set("or_departure", end);               // ISO YYYY-MM-DD
  qs.set("or_adults", String(adults));
  qs.set("or_children", String(children));   // always include
  qs.set("or_propertyId", rawId);

  // Common alternates some templates/widgets accept (harmless if ignored)
  qs.set("arrival", usStart);
  qs.set("departure", usEnd);
  qs.set("checkin", usStart);
  qs.set("checkout", usEnd);
  qs.set("startdate", usStart);
  qs.set("enddate", usEnd);
  qs.set("start", start);                    // ISO
  qs.set("end", end);                        // ISO
  qs.set("sd", start);                       // ISO
  qs.set("ed", end);                         // ISO
  qs.set("propertyId", numericId);

  return `${base}?${qs.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple FAQ fallback (no OpenAI)
// ─────────────────────────────────────────────────────────────────────────────
function norm(s = "") { return s.toLowerCase().replace(/[\s\-_]/g, ""); }
function faqReply(t = "") {
  const n = norm(t);
  if (n.includes("wifi"))     return "Yes—fast Wi-Fi is included. Details are in your arrival email.";
  if (n.includes("parking"))  return "Free on-site parking (one spot per unit).";
  if (n.includes("checkin"))  return "Check-in is 4pm. Early check-in may be possible—tell me your dates.";
  if (n.includes("checkout")) return "Check-out is 11am. Late check-out is subject to availability.";
  if (n.includes("pets"))     return "Small, well-behaved pets with prior approval and a cleaning fee.";
  if (n.includes("book") || n.includes("availability") || n.includes("reserve"))
    return "Tell me your unit, dates, and guests, and I’ll create a booking link.";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// API handler
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      bookUrl: BOOK_URL,
      propertyId: PROPERTY_ID,
    });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [] } = req.body || {};
    const lastUser = [...messages].reverse().find(m => m.role === "user")?.content || "";

    const parsed = extract(lastUser);
    if (parsed) {
      const link = buildOwnerRezLink(parsed);
      const guestLine =
        `${parsed.adults} adult${parsed.adults > 1 ? "s" : ""}` +
        (parsed.children ? ` + ${parsed.children} child${parsed.children > 1 ? "ren" : ""}` : "");
      const reply =
        `Great — Pelican beach resort unit 1006 for **${guestLine}**, ` +
        `check-in **${parsed.start}**, check-out **${parsed.end}**.\n\n` +
        `Here’s your booking link:\n${link}\n\n` +
        `You can adjust details on the booking page.`;
      return res.status(200).json({ reply });
    }

    const faq = faqReply(lastUser);
    if (faq) return res.status(200).json({ reply: faq });

    return res.status(200).json({
      reply:
        "Please share **unit** (e.g., “Unit 1006”), **check-in / check-out** dates, and **guests** (e.g., “2 adults 1 child”). I’ll send your booking link.",
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return res.status(200).json({
      reply: "I hit a temporary error. Please resend your unit, dates, and guest count.",
    });
  }
}
