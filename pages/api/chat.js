// --- replace your toISO() + extractDatesAndGuests() with these ---

// normalize two-digit years (00–69 -> 2000s, 70–99 -> 1900s)
function normalizeYear(yy) {
  if (yy.length === 4) return yy;
  const n = parseInt(yy, 10);
  return (n < 70 ? "20" : "19") + yy;
}

// Collect dates in the order they appear and return ISO strings
function collectDates(text = "") {
  const t = String(text);
  const found = [];

  // YYYY-MM-DD
  for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const [_, y, mo, d] = m;
    found.push({ iso: `${y}-${mo}-${d}`, idx: m.index });
  }

  // MM/DD/YY or MM/DD/YYYY
  for (const m of t.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g)) {
    let [_, mm, dd, yy] = m;
    yy = normalizeYear(yy);
    found.push({
      iso: `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`,
      idx: m.index
    });
  }

  // Keep in appearance order
  found.sort((a, b) => a.idx - b.idx);
  return found.map((d) => d.iso);
}

function extractDatesAndGuests(text = "") {
  const dates = collectDates(text);

  // guests
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
    // Debug: see what we parsed in Vercel Logs
    console.log("Parsed booking:", { start, end, adults, children, text });
    return { start, end, adults, children };
  }
  return null;
}
