// pages/api/thermostat.js
// Daily thermostat automation for Unit 707 and Unit 1006
// Triggered by Vercel cron at 12:00 UTC (6-7 AM Central)
// Checks OwnerRez reservations and sets Ecobee temps via Seam API

const OWNERREZ_USER  = "ozan@destincondogetaways.com";
const UNIT_707_ID    = "293722";
const UNIT_1006_ID   = "410894";

// ── Temp setpoints (°F) ──────────────────────────────────────────────────────
const SUMMER_MONTHS = [5, 6, 7, 8, 9]; // May–September (month is 1-indexed here)

const TEMP = {
  summer: {
    guests:   74, // check-in day — guests arriving at 4 PM
    cleaners: 76, // checkout day — cleaners working
    away:     82, // empty unit
  },
  winter: {
    guests:   72, // check-in day
    cleaners: 70, // checkout day
    away:     65, // empty unit
  },
};
// ────────────────────────────────────────────────────────────────────────────

// Get today's date string in Central Time (handles CST/CDT automatically)
function getTodayCT() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  // en-CA gives YYYY-MM-DD format
}

function isSummer(dateStr) {
  const month = new Date(dateStr + "T12:00:00").getMonth() + 1; // 1-12
  return SUMMER_MONTHS.includes(month);
}

// Fetch upcoming bookings for a property (next 30 days is enough)
async function fetchBookings(propertyId) {
  const apiKey = process.env.OWNERREZ_API_TOKEN;
  if (!apiKey) throw new Error("OWNERREZ_API_TOKEN not set");

  const today = new Date();
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);

  const since = today.toISOString().split("T")[0];
  const until = in30.toISOString().split("T")[0];

  const url = `https://api.ownerrez.com/v2/bookings?property_ids=${propertyId}&arrival=${since}&departure=${until}&limit=50`;

  const res = await fetch(url, {
    headers: {
      Authorization: "Basic " + Buffer.from(`${OWNERREZ_USER}:${apiKey}`).toString("base64"),
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error(`OwnerRez error ${res.status} for property ${propertyId}`);

  const data = await res.json();
  return (data.items || [])
    .filter(b => b.status === "active")
    .map(b => ({ arrival: b.arrival, departure: b.departure }));
}

// Determine what state the unit is in today
function getUnitState(bookings, todayCT) {
  const isCheckout = bookings.some(b => b.departure === todayCT);
  const isCheckin  = bookings.some(b => b.arrival   === todayCT);

  // Back-to-back: checkout and checkin same day — guests win
  if (isCheckin)  return "guests";
  if (isCheckout) return "cleaners";
  return "away";
}

// Set Ecobee temp via Seam API
async function setThermostat(deviceId, targetTempF, state, unit) {
  const seamKey = process.env.SEAM_API_KEY;
  if (!seamKey) throw new Error("SEAM_API_KEY not set");

  // Convert F to C for Seam (Seam uses Celsius)
  const tempC = (targetTempF - 32) * 5 / 9;

  // Determine if we're heating or cooling based on season
  const todayCT = getTodayCT();
  const summer = isSummer(todayCT);

  const body = {
    device_id: deviceId,
    hvac_mode_setting: summer ? "cool" : "heat",
    ...(summer
      ? { cooling_set_point_celsius: Math.round(tempC * 10) / 10 }
      : { heating_set_point_celsius: Math.round(tempC * 10) / 10 }
    ),
  };

  const res = await fetch("https://connect.getseam.com/thermostats/set_hvac_mode", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${seamKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Seam error for ${unit}: ${res.status} — ${err}`);
  }

  return await res.json();
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Allow manual trigger via GET for testing
  // Cron hits this endpoint automatically

  const todayCT = getTodayCT();
  const summer  = isSummer(todayCT);
  const temps   = summer ? TEMP.summer : TEMP.winter;
  const season  = summer ? "summer" : "winter";

  const results = [];
  const errors  = [];

  const units = [
    { name: "707",  propertyId: UNIT_707_ID,  deviceId: process.env.SEAM_DEVICE_707  },
    { name: "1006", propertyId: UNIT_1006_ID, deviceId: process.env.SEAM_DEVICE_1006 },
  ];

  for (const unit of units) {
    try {
      if (!unit.deviceId) throw new Error(`SEAM_DEVICE_${unit.name} env var not set`);

      const bookings = await fetchBookings(unit.propertyId);
      const state    = getUnitState(bookings, todayCT);
      const targetF  = temps[state];

      await setThermostat(unit.deviceId, targetF, state, unit.name);

      results.push({
        unit:    unit.name,
        state,
        targetF,
        season,
        todayCT,
      });

      console.log(`✅ Unit ${unit.name}: ${state} → ${targetF}°F (${season})`);

    } catch (err) {
      console.error(`❌ Unit ${unit.name}:`, err.message);
      errors.push({ unit: unit.name, error: err.message });
    }
  }

  return res.status(errors.length > 0 && results.length === 0 ? 500 : 200).json({
    date:    todayCT,
    season,
    results,
    errors,
  });
}
