// pages/api/chat.js

// Use your booking URL from env; fallback to your site so it still works if env is missing.
const BOOK_URL =
  process.env.OWNERREZ_BOOK_URL || "https://www.destincondogetaways.com/book";

// ---------- date parsing helpers ----------
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

// Collect ISO dates in the order they appear
function collectDates(text = "") {
  const t = String(text);
  const hits = [];

  // YYYY-MM-DD
  for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const [_, y, mo, d] = m;
    hits.push({ iso: `${y}-${mo}-${d}`, idx: m.index });
  }

  // MM/DD/YY or MM/DD/YYYY
  for (const m of t.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g)) {
    let [_, mm, dd, yy] = m;
    yy = normalizeYear(yy);
    hits.push({
      iso: `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`,
      idx: m.index,
    });
  }

  // Month DD YYYY  (e.g., Oct 10 2025 or October 10, 2025)
  for (const m of t.matchAll(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{2,4})\b/g)) {
    let [_, mname, dd, yy] = m;
    const mo = MONTHS[mname.toLowerCase()];
    if (mo) {
      yy = normalizeYear(yy);
      hits.push({
        iso: `${yy}-${mo}-${String(dd).padStart(2, "0")}`,
        idx: m.index,
      });
    }
  }

  hits.sort((a, b) => a.idx - b.idx);
  return hits.map(h => h.iso);
}

function extractDatesAndGuests(text = "") {
  const dates = collectDates(text);

  let adults, children;

  const mAdults = text.match(/(\d+)\s*adults?/i);
  if (mAdults) adults = parseInt(mAdults[1], 10);

  const mKids = text.match(/(\d+)\s*(kids?|children?|child)/i);
  if (mKids) children = parseInt(mKids[1], 10);

  const mGuests = text.match(/(\d+)\s*guests?/i);
  if (mGuests && adults === undefined && children === undefined) {
    adults = parseInt(mGuests[1], 10);
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

function buildQuoteLinks({ start, end, adults, children }) {
  // Use two common param styles; one should prefill on OwnerRez
  const primary = `${BOOK_URL}?start=${start}&end=${end}&adults=${adults}&children=${children}`;
  const alt = `${BOOK_URL}?checkin=${start}&checkout=${end}&adults=${adults}&children=${children}`;
  return { primary, alt };
}

// ---------- FAQ fallback (kept simple) ----------
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
    return "Tell me your check-in/check-out dates and guest count and I’ll create a quote link.";
  return null;
}

// ---------- handler ----------
export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, bookUrl: BOOK_URL }); // simple health check
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [] } = req.body || {};
    const lastUser = [...messages].reverse().find(m => m.role === "user")?.content || "";

    // 0) If user sent usable dates/guests → return quote links immediately
    const parsed = extractDatesAndGuests(lastUser);
    if (parsed) {
      const { primary, alt } = buildQuoteLinks(parsed);
      const guestLine =
        `${parsed.adults} adult${parsed.adults > 1 ? "s" : ""}` +
        (parsed.children ? ` + ${parsed.children} child${parsed.children > 1 ? "ren" : ""}` : "");
      const reply =
        `Great — check-in **${parsed.start}**, check-out **${parsed.end}** for **${guestLine}**.\n\n` +
        `Here’s your **instant quote link**:\n${primary}\n\n` +
        `If it doesn’t prefill on your site, try this version:\n${alt}\n\n` +
        `You can adjust dates or guests on the booking page.`;
      return res.status(200).json({ reply });
    }

    // 1) FAQ answers
    const faq = faqReply(lastUser);
    if (faq) return res.status(200).json({ reply: faq });

    // 2) Generic prompt if nothing matched
    return res.status(200).json({
      reply:
        "Please share your **check-in / check-out** dates and **number of guests** (e.g., “2025-10-10 to 2025-10-15, 2 adults 1 child”), and I’ll send you a quote link."
    });
  } catch (err) {
    console.error("Chat API error:", err);
    // Always return JSON so the frontend never trips
    return res.status(200).json({
      reply: "I hit a temporary error. Please resend your dates and guest count."
    });
  }
}
