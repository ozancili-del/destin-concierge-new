// pages/api/calendar.js
// Standalone calendar intelligence for Destiny Blue
// Tests: hit /api/calendar?unit=707&arrival=2026-03-10&departure=2026-03-17
// No impact on chat.js — delete this file to revert everything
import { allowSameOriginRequest, enforceJsonSize, enforceRateLimit, parseIsoDate } from '../../lib/public-api-security.js';

const OWNERREZ_USER = "ozan@destincondogetaways.com";
const UNIT_707_ID   = "293722";
const UNIT_1006_ID  = "410894";

// ─────────────────────────────────────────────────────────────────────────────
// Fetch active bookings that intersect the requested stay window.
// Returns array of { arrival, departure } for blocked periods
// ─────────────────────────────────────────────────────────────────────────────
async function fetchBookings(propertyId, requestedArrival, requestedDeparture) {
  try {
    const apiKey = process.env.OWNERREZ_API_TOKEN;
    if (!apiKey) throw new Error("OWNERREZ_API_TOKEN not set");

    const since = requestedArrival;
    const until = requestedDeparture;

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

  // Scan backwards from requested arrival to see if earlier start gives more nights
  // Cap to requested stay length and check ALL bookings (not just conflicts in range)
  let earlierArrival = null;
  const requestedNights = Math.round(requestedDays);
  const longestDepDate = new Date(longest.to);

  // Build full blocked days set from ALL bookings (not just conflicts in range)
  const allBlockedDays = new Set();
  for (const b of bookings) {
    const start = new Date(b.arrival);
    const end = new Date(b.departure);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      allBlockedDays.add(d.toISOString().split("T")[0]);
    }
  }

  // Scan back up to requestedNights days — stop at any blocked day
  for (let i = 1; i <= requestedNights; i++) {
    const candidate = new Date(reqArr);
    candidate.setDate(candidate.getDate() - i);
    const candidateStr = candidate.toISOString().split("T")[0];
    if (allBlockedDays.has(candidateStr)) break;
    const potentialDays = Math.round((longestDepDate - candidate) / 86400000);
    // Only suggest if it gets us closer to the requested nights
    if (potentialDays >= requestedNights) {
      earlierArrival = candidateStr;
      break; // Found exact match — stop
    }
    earlierArrival = candidateStr; // Best we can do so far
  }
  const earlierTotalDays = earlierArrival ? Math.round((longestDepDate - new Date(earlierArrival)) / 86400000) : null;

  return {
    status: "partial",
    longestWindow: longest,
    longestDays,
    requestedDays,
    allWindows: freeWindows,
    earlierArrival,
    earlierTotalDays: earlierArrival ? Math.round(earlierTotalDays) : null,
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
  if (!allowSameOriginRequest(req, res, { methods: ['GET', 'POST'] })) return;
  if (req.method === 'POST' && !enforceJsonSize(req, res, 4096)) return;
  if (!enforceRateLimit(req, res, { scope: 'calendar', limit: 40, windowMs: 10 * 60 * 1000 })) return;

  const { arrival, departure } = req.method === "POST" ? req.body : req.query;

  if (!arrival || !departure) {
    return res.status(400).json({ error: "arrival and departure required" });
  }

  const arrivalDate = parseIsoDate(arrival);
  const departureDate = parseIsoDate(departure);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!arrivalDate || !departureDate) {
    return res.status(400).json({ error: "arrival and departure must be valid YYYY-MM-DD dates" });
  }
  if (arrivalDate < today) {
    return res.status(400).json({ error: "arrival must be today or later" });
  }
  if (departureDate <= arrivalDate) {
    return res.status(400).json({ error: "departure must be after arrival" });
  }
  const requestedNights = Math.round((departureDate - arrivalDate) / 86400000);
  const maxFuture = new Date(); maxFuture.setUTCFullYear(maxFuture.getUTCFullYear() + 2);
  if (requestedNights > 31 || arrivalDate > maxFuture) {
    return res.status(400).json({ error: "date range is outside the supported window" });
  }

  // Fetch both units in parallel
  const [bookings707, bookings1006] = await Promise.all([
    fetchBookings(UNIT_707_ID, arrival, departure),
    fetchBookings(UNIT_1006_ID, arrival, departure),
  ]);

  const avail707  = analyzeAvailability(bookings707,  arrival, departure);
  const avail1006 = analyzeAvailability(bookings1006, arrival, departure);

  if (avail707.status === "unknown" && avail1006.status === "unknown") {
    return res.status(503).json({ error: "live availability could not be verified" });
  }

  const orphan707  = avail707.status  === "available" ? detectOrphanDay(bookings707,  departure) : null;
  const orphan1006 = avail1006.status === "available" ? detectOrphanDay(bookings1006, departure) : null;

  // ── Build recommendation ────────────────────────────────────────────────────
  let recommendation = null;

  const both707  = avail707.status  === "available";
  const both1006 = avail1006.status === "available";
  const part707  = avail707.status  === "partial";
  const part1006 = avail1006.status === "partial";
  const none707  = avail707.status  === "booked";
  const none1006 = avail1006.status === "booked";

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
  } else if (none707 && none1006) {
    recommendation = "NONE_AVAILABLE";
  } else {
    recommendation = "CHECK_INCOMPLETE";
  }

  return res.status(200).json({
    arrival,
    departure,
    unit707:  { ...avail707,  orphanDay: orphan707  },
    unit1006: { ...avail1006, orphanDay: orphan1006 },
    recommendation,
  });
}
