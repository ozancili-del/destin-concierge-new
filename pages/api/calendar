// pages/api/calendar.js
// Standalone calendar intelligence for Destiny Blue
// Tests: hit /api/calendar?unit=707&arrival=2026-03-10&departure=2026-03-17
// No impact on chat.js — delete this file to revert everything

const OWNERREZ_USER = "destindreamcondo@gmail.com";
const UNIT_707_ID   = "293722";
const UNIT_1006_ID  = "410894";

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all active bookings for a property for next 6 months
// Returns array of { arrival, departure } for blocked periods
// ─────────────────────────────────────────────────────────────────────────────
async function fetchBookings(propertyId) {
  try {
    const apiKey = process.env.OWNERREZ_API_KEY;
    if (!apiKey) throw new Error("OWNERREZ_API_KEY not set");

    const today = new Date();
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);

    const since = today.toISOString().split("T")[0];
    const until = sixMonths.toISOString().split("T")[0];

    const url = `https://api.ownerrez.com/v2/bookings?property_ids=${propertyId}&arrival=${since}&departure=${until}&limit=100`;

    const res = await fetch(url, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${OWNERREZ_USER}:${apiKey}`).toString("base64"),
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error(`OwnerRez error for ${propertyId}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const items = data.items || [];

    // Return only active bookings and blocks — not cancelled
    return items
      .filter(b => b.status === "active")
      .map(b => ({ arrival: b.arrival, departure: b.departure }));

  } catch (err) {
    console.error(`fetchBookings error for ${propertyId}:`, err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Given a list of bookings and a date range, find available windows
// Returns: { fullyAvailable, availableFrom, availableTo, partialDays }
// ─────────────────────────────────────────────────────────────────────────────
function analyzeAvailability(bookings, requestedArrival, requestedDeparture) {
  if (!bookings) return { status: "unknown" };

  const reqArr = new Date(requestedArrival);
  const reqDep = new Date(requestedDeparture);

  // Check if any booking overlaps with requested range
  const conflicts = bookings.filter(b => {
    const bArr = new Date(b.arrival);
    const bDep = new Date(b.departure);
    // Overlap: booking starts before request ends AND booking ends after request starts
    return bArr < reqDep && bDep > reqArr;
  });

  if (conflicts.length === 0) {
    return { status: "available" };
  }

  // Find the largest free window within the requested range
  // Build a list of all blocked days
  const blockedDays = new Set();
  for (const b of conflicts) {
    const start = new Date(b.arrival);
    const end = new Date(b.departure);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      blockedDays.add(d.toISOString().split("T")[0]);
    }
  }

  // Find free windows within the requested range
  const freeWindows = [];
  let windowStart = null;

  for (let d = new Date(reqArr); d < reqDep; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().split("T")[0];
    if (!blockedDays.has(dayStr)) {
      if (!windowStart) windowStart = dayStr;
    } else {
      if (windowStart) {
        freeWindows.push({ from: windowStart, to: dayStr });
        windowStart = null;
      }
    }
  }
  if (windowStart) {
    freeWindows.push({ from: windowStart, to: requestedDeparture });
  }

  if (freeWindows.length === 0) {
    return { status: "booked" };
  }

  // Find the longest free window
  const longest = freeWindows.reduce((a, b) => {
    const aDays = (new Date(a.to) - new Date(a.from)) / 86400000;
    const bDays = (new Date(b.to) - new Date(b.from)) / 86400000;
    return aDays >= bDays ? a : b;
  });

  const longestDays = (new Date(longest.to) - new Date(longest.from)) / 86400000;
  const requestedDays = (reqDep - reqArr) / 86400000;

  return {
    status: "partial",
    longestWindow: longest,
    longestDays,
    requestedDays,
    allWindows: freeWindows,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Check if extending departure by 1 day fills an orphan gap
// Returns the next booking arrival date if a 1-day gap exists, else null
// ─────────────────────────────────────────────────────────────────────────────
function detectOrphanDay(bookings, requestedDeparture) {
  if (!bookings) return null;

  const dep = new Date(requestedDeparture);
  const dayAfter = new Date(dep);
  dayAfter.setDate(dayAfter.getDate() + 1);
  const dayAfterStr = dayAfter.toISOString().split("T")[0];

  // Check if there's a booking starting exactly 1 day after requested departure
  const nextBooking = bookings.find(b => b.arrival === dayAfterStr);
  if (nextBooking) {
    return { gapDate: requestedDeparture, nextCheckIn: nextBooking.arrival };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const { arrival, departure } = req.method === "POST" ? req.body : req.query;

  if (!arrival || !departure) {
    return res.status(400).json({ error: "arrival and departure required" });
  }

  // Fetch both units in parallel
  const [bookings707, bookings1006] = await Promise.all([
    fetchBookings(UNIT_707_ID),
    fetchBookings(UNIT_1006_ID),
  ]);

  const avail707  = analyzeAvailability(bookings707,  arrival, departure);
  const avail1006 = analyzeAvailability(bookings1006, arrival, departure);

  const orphan707  = avail707.status  === "available" ? detectOrphanDay(bookings707,  departure) : null;
  const orphan1006 = avail1006.status === "available" ? detectOrphanDay(bookings1006, departure) : null;

  // ── Build recommendation ────────────────────────────────────────────────────
  let recommendation = null;

  const both707  = avail707.status  === "available";
  const both1006 = avail1006.status === "available";
  const part707  = avail707.status  === "partial";
  const part1006 = avail1006.status === "partial";
  const none707  = avail707.status  === "booked" || avail707.status === "unknown";
  const none1006 = avail1006.status === "booked" || avail1006.status === "unknown";

  if (both707 && both1006) {
    recommendation = "BOTH_AVAILABLE";
  } else if (both707 && !both1006) {
    recommendation = "ONLY_707_FULL";
  } else if (both1006 && !both707) {
    recommendation = "ONLY_1006_FULL";
  } else if (part707 && part1006) {
    recommendation = "BOTH_PARTIAL";
  } else if (part707 && none1006) {
    recommendation = "ONLY_707_PARTIAL";
  } else if (part1006 && none707) {
    recommendation = "ONLY_1006_PARTIAL";
  } else {
    recommendation = "NONE_AVAILABLE";
  }

  return res.status(200).json({
    arrival,
    departure,
    unit707:  { ...avail707,  orphanDay: orphan707  },
    unit1006: { ...avail1006, orphanDay: orphan1006 },
    recommendation,
  });
}
