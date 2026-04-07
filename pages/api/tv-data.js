// pages/api/tv-data.js
// Serves live data for TV dashboard: guest info, weather, NOAA beach conditions
// Called by tv-707.html and tv-1006.html on load and on refresh schedule

const OWNERREZ_USER = "ozan@destincondogetaways.com";
const UNIT_707_PROPERTY_ID = "293722";
const UNIT_1006_PROPERTY_ID = "410894";

const DESTIN_LAT = 30.3935;
const DESTIN_LNG = -86.4958;

// NOAA station closest to Destin for tides (Pensacola)
const NOAA_STATION = "8729840";

function todayCT() {
  // Returns YYYY-MM-DD in Central Time
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function nowCTHour() {
  return parseInt(new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour: "numeric", hour12: false }));
}

async function fetchCurrentBooking(propertyId) {
  try {
    const token = process.env.OWNERREZ_API_TOKEN;
    const credentials = Buffer.from(`${OWNERREZ_USER}:${token}`).toString("base64");
    const today = todayCT();
    // Get bookings that include today
    const sinceUtcDate = new Date(today + "T00:00:00-05:00"); sinceUtcDate.setDate(sinceUtcDate.getDate() - 1); const sinceUtc = sinceUtcDate.toISOString();
    const url = `https://api.ownerrez.com/v2/bookings?property_ids=${propertyId}&since_utc=${sinceUtc}&status=active`;
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const bookings = data.items || data.bookings || [];
    // Find booking where today is between arrival and departure
    const hourCT = parseInt(new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour: "numeric", hour12: false }));
    const active = bookings.find(b => {
      const arr = b.arrival || b.check_in;
      const dep = b.departure || b.check_out;
      // Show arriving guest from noon onwards, show checked-in guests all day
      if (arr === today) return hourCT >= 12; // arriving today — only show from noon
      return arr < today && dep > today; // already checked in
    });
    if (!active) return null;
    return {
      guestFirstName: active.guest?.first_name || "Guest",
      arrival: active.arrival || active.check_in,
      departure: active.departure || active.check_out,
      nights: Math.ceil((new Date(active.departure) - new Date(active.arrival)) / (1000 * 60 * 60 * 24)),
    };
  } catch (e) {
    console.error("fetchCurrentBooking error:", e.message);
    return null;
  }
}

async function fetchWeather() {
  try {
    const apiKey = process.env.GOOGLE_WEATHER_API_KEY;
    if (!apiKey) return null;
    const url = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${apiKey}&location.latitude=${DESTIN_LAT}&location.longitude=${DESTIN_LNG}&days=5&languageCode=en-US&unitsSystem=IMPERIAL`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const days = data.forecastDays || [];
    return days.map(day => ({
      date: day.interval?.startTime?.split("T")[0],
      high: Math.round(day.maxTemperature?.degrees || 0),
      low: Math.round(day.minTemperature?.degrees || 0),
      desc: day.daytimeForecast?.weatherCondition?.description?.text || "Mixed",
      condition: day.daytimeForecast?.weatherCondition?.type || "CLOUDY",
    }));
  } catch (e) {
    console.error("fetchWeather error:", e.message);
    return null;
  }
}

async function fetchNOAA() {
  try {
    const today = todayCT();
    // Water temperature
    const waterUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${NOAA_STATION}&product=water_temperature&datum=MLLW&time_zone=lst_ldt&units=english&application=destincondogetaways&format=json`;
    // Tides
    const tidesUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${today.replace(/-/g,"")}&range=24&station=${NOAA_STATION}&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=hilo&units=english&application=destincondogetaways&format=json`;
    // Wind
    const windUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${NOAA_STATION}&product=wind&time_zone=lst_ldt&units=english&application=destincondogetaways&format=json`;

    const [waterRes, tidesRes, windRes] = await Promise.all([
      fetch(waterUrl), fetch(tidesUrl), fetch(windUrl)
    ]);

    const waterData = waterRes.ok ? await waterRes.json() : null;
    const tidesData = tidesRes.ok ? await tidesRes.json() : null;
    const windData = windRes.ok ? await windRes.json() : null;

    const waterTemp = waterData?.data?.[0]?.v ? Math.round(parseFloat(waterData.data[0].v)) : null;

    const tides = tidesData?.predictions?.map(t => ({
      time: t.t,
      type: t.type === "H" ? "High" : "Low",
      height: parseFloat(t.v).toFixed(1)
    })) || [];

    const wind = windData?.data?.[0] ? {
      speed: Math.round(parseFloat(windData.data[0].s)),
      dir: windData.data[0].dr
    } : null;

    // Sunset via sunrise-sunset.org (free, no key)
    const sunUrl = `https://api.sunrise-sunset.org/json?lat=${DESTIN_LAT}&lng=${DESTIN_LNG}&date=${today}&formatted=0`;
    const sunRes = await fetch(sunUrl);
    const sunData = sunRes.ok ? await sunRes.json() : null;
    let sunset = null;
    if (sunData?.results?.sunset) {
      sunset = new Date(sunData.results.sunset).toLocaleTimeString("en-US", {
        timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", hour12: true
      });
    }

    return { waterTemp, tides, wind, sunset };
  } catch (e) {
    console.error("fetchNOAA error:", e.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { unit } = req.query;
  const propertyId = unit === "1006" ? UNIT_1006_PROPERTY_ID : UNIT_707_PROPERTY_ID;

  // Set CORS for TV page on Vercel
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  try {
    const [booking, weather, noaa] = await Promise.all([
      fetchCurrentBooking(propertyId),
      fetchWeather(),
      fetchNOAA()
    ]);

    const today = todayCT();
    const isCheckoutEve = booking?.departure
      ? new Date(booking.departure) - new Date(today) === 86400000
      : false;

    const hourCT = nowCTHour();
    const timeSlot = hourCT < 12 ? "morning" : hourCT < 17 ? "afternoon" : "evening";

    return res.status(200).json({
      unit: unit || "707",
      today,
      timeSlot,
      booking,
      isCheckoutEve,
      weather,
      noaa,
      generatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("tv-data handler error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
