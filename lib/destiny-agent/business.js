// Destiny Blue v2 — deterministic business rules, state, parsing, URL builders,
// and output validation. No network calls belong in this module.

export const OWNER_CONTACT = Object.freeze({
  name: "Ozan",
  phone: "(972) 357-4262",
  email: "ozan@destincondogetaways.com",
});

export const MAX_OCCUPANCY = 6;
export const MAX_TWO_UNIT_OCCUPANCY = 12;
export const STATE_VERSION = 2;
export const STATE_COLUMN = "H";

export const UNITS = Object.freeze({
  "707": Object.freeze({
    unit: "707",
    name: "Classic Coastal",
    propertyId: "293722",
    floor: 7,
    bookingBase: "https://www.destincondogetaways.com/pelican-beach-resort-unit-707-orp5b47b5ax",
    style: "bright, classic coastal style with warm beach-inspired decor",
  }),
  "1006": Object.freeze({
    unit: "1006",
    name: "Fresh Coastal",
    propertyId: "410894",
    floor: 10,
    bookingBase: "https://www.destincondogetaways.com/pelican-beach-resort-unit-1006-orp5b6450ex",
    style: "fresh coastal style with turquoise and sea-glass accents",
  }),
});

export const STATIC_URLS = Object.freeze({
  availability: "https://www.destincondogetaways.com/availability",
  virtualTour: "https://www.destincondogetaways.com/virtual-tour",
  reviews: "https://www.destincondogetaways.com/reviews",
  liveBeachCam: "https://www.destincondogetaways.com/destin-live-beach-cam-574002656",
  weatherLive: "https://www.destincondogetaways.com/blog/destinweather",
  tripPlanner: "https://www.destincondogetaways.com/destin-vacation-itinerary-planner-574049367",
});

export const BLOG_URLS = Object.freeze({
  restaurants:  "https://www.destincondogetaways.com/blog/best-restaurants-destin",
  restaurants2: "https://www.destincondogetaways.com/blog/best-restaurants-destin-local-guide",
  beaches:      "https://www.destincondogetaways.com/blog/best-beaches-destin",
  activities:   "https://www.destincondogetaways.com/blog/destinocen",
  weather:      "https://www.destincondogetaways.com/blog/destinweather",
  events:       "https://www.destincondogetaways.com/blog/destin-events-2026",
  airport:      "https://www.destincondogetaways.com/blog/destinairport",
  romance:      "https://www.destincondogetaways.com/blog/destinromance",
  car:          "https://www.destincondogetaways.com/blog/destincar",
  spa:          "https://www.destincondogetaways.com/blog/destinspa",
  nightlife:    "https://www.destincondogetaways.com/blog/destin-live-music-2026",
  essentials:   "https://www.destincondogetaways.com/blog/destinessentials",
  kids:         "https://www.destincondogetaways.com/blog/destinkids",
  supermarkets: "https://www.destincondogetaways.com/blog/destinsupermarkets",
  history:      "https://www.destincondogetaways.com/blog/destindiversehistory",
  explore:      "https://www.destincondogetaways.com/blog/destinexplore",
  fireworks:    "https://www.destincondogetaways.com/blog/destin-fireworks-2026",
  besttime:     "https://www.destincondogetaways.com/blog/best-time-to-visit-destin-florida",
  itinerary:    STATIC_URLS.tripPlanner,
});

export const CAR_RENTAL_URLS = Object.freeze({
  booking: "https://www.discovercars.com/?a_aid=ocili994989",
  guide: BLOG_URLS.car,
});

export const TRIPSHOCK_BASE = "https://www.tripshock.com";
export const TRIPSHOCK_AFF = "aff=destindreamcondo";
export const TRIPSHOCK_CATEGORIES = Object.freeze({
  dolphin:      "dolphin-cruises-and-tours",
  fishing:      "fishing-charters",
  jetski:       "jet-ski-rentals-tours",
  waverunner:   "jet-ski-rentals-tours",
  pontoon:      "boat-rentals",
  boat:         "boat-rentals",
  parasail:     "parasailing",
  crabisland:   "crab-island-tours-and-activities",
  snorkel:      "snorkeling-tours",
  sunset:       "sunset-cruises-tours",
  pirate:       "pirate-cruises",
  kayak:        "canoe-kayak-paddleboard-rentals",
  paddleboard:  "canoe-kayak-paddleboard-rentals",
  fireworks:    "fireworks-cruises",
  tiki:         "tiki-boats",
  banana:       "banana-boat-rides",
  photographer: "beach-photographers",
  boattour:     "boat-tours",
});

export const LOCAL_GUIDE_TOPICS = Object.freeze([
  "restaurants", "restaurants2", "beaches", "activities", "weather", "events",
  "airport", "romance", "car", "spa", "nightlife", "essentials", "kids",
  "supermarkets", "history", "explore", "fireworks", "besttime", "itinerary",
  "photos",
]);

export const HOLIDAY_DATES = Object.freeze({
  "labor day":         { arrival: "2026-09-04", departure: "2026-09-07", label: "Labor Day weekend (Sept 4–7, 2026)" },
  "labour day":        { arrival: "2026-09-04", departure: "2026-09-07", label: "Labor Day weekend (Sept 4–7, 2026)" },
  "memorial day":      { arrival: "2026-05-22", departure: "2026-05-25", label: "Memorial Day weekend (May 22–25, 2026)" },
  "fourth of july":    { arrival: "2026-07-03", departure: "2026-07-06", label: "4th of July weekend (July 3–6, 2026)" },
  "4th of july":       { arrival: "2026-07-03", departure: "2026-07-06", label: "4th of July weekend (July 3–6, 2026)" },
  "july 4th":          { arrival: "2026-07-03", departure: "2026-07-06", label: "4th of July weekend (July 3–6, 2026)" },
  "july fourth":       { arrival: "2026-07-03", departure: "2026-07-06", label: "4th of July weekend (July 3–6, 2026)" },
  "independence day":  { arrival: "2026-07-03", departure: "2026-07-06", label: "4th of July weekend (July 3–6, 2026)" },
  "thanksgiving":      { arrival: "2026-11-25", departure: "2026-11-29", label: "Thanksgiving weekend (Nov 25–29, 2026)" },
  "christmas":         { arrival: "2026-12-24", departure: "2026-12-27", label: "Christmas (Dec 24–27, 2026)" },
  "new year":          { arrival: "2026-12-31", departure: "2027-01-02", label: "New Year's (Dec 31–Jan 2, 2027)" },
  "new years":         { arrival: "2026-12-31", departure: "2027-01-02", label: "New Year's (Dec 31–Jan 2, 2027)" },
  "new year's":        { arrival: "2026-12-31", departure: "2027-01-02", label: "New Year's (Dec 31–Jan 2, 2027)" },
});

function isoUtc(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day, 12)).toISOString().slice(0, 10);
}

function nthWeekdayOfMonth(year, monthIndex, weekday, occurrence) {
  const first = new Date(Date.UTC(year, monthIndex, 1, 12));
  return 1 + ((7 + weekday - first.getUTCDay()) % 7) + (occurrence - 1) * 7;
}

function lastWeekdayOfMonth(year, monthIndex, weekday) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0, 12));
  return last.getUTCDate() - ((7 + last.getUTCDay() - weekday) % 7);
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return isoUtc(year, month - 1, day);
}

export const SUPPORTED_HOLIDAYS = Object.freeze([
  "christmas", "new_years", "thanksgiving", "memorial_day", "labor_day", "easter", "independence_day",
]);

export function resolveHolidayStay(holiday, now = new Date()) {
  if (!SUPPORTED_HOLIDAYS.includes(holiday)) return null;
  const today = todayIso(now);
  const occurrence = year => {
    if (holiday === "christmas") return isoUtc(year, 11, 25);
    if (holiday === "new_years") return isoUtc(year, 0, 1);
    if (holiday === "thanksgiving") return isoUtc(year, 10, nthWeekdayOfMonth(year, 10, 4, 4));
    if (holiday === "memorial_day") return isoUtc(year, 4, lastWeekdayOfMonth(year, 4, 1));
    if (holiday === "labor_day") return isoUtc(year, 8, nthWeekdayOfMonth(year, 8, 1, 1));
    if (holiday === "easter") return easterSunday(year);
    return isoUtc(year, 6, 4);
  };
  let year = Number(today.slice(0, 4));
  let holidayDate = occurrence(year);
  if (holidayDate < today) holidayDate = occurrence(++year);
  return {
    holiday,
    holidayDate,
    arrival: addIsoDays(holidayDate, -2),
    departure: addIsoDays(holidayDate, 2),
    nights: 4,
  };
}

export const CITY_IATA_MAP = Object.freeze({
  chicago:"ORD", "o'hare":"ORD", ohare:"ORD", midway:"MDW", "chicago midway":"MDW",
  "new york":"JFK", nyc:"JFK", "new york city":"JFK", jfk:"JFK", laguardia:"LGA", "la guardia":"LGA", newark:"EWR",
  washington:"IAD", "washington dc":"IAD", "washington d.c.":"IAD", dulles:"IAD", reagan:"DCA", "national airport":"DCA", baltimore:"BWI",
  houston:"IAH", "george bush":"IAH", hobby:"HOU",
  dallas:"DFW", "dallas fort worth":"DFW", "fort worth":"DFW", "love field":"DAL",
  "san francisco":"SFO", "bay area":"SFO", oakland:"OAK", "san jose":"SJC",
  denver:"DEN", atlanta:"ATL", nashville:"BNA", "los angeles":"LAX", la:"LAX",
  miami:"MIA", "fort lauderdale":"FLL", orlando:"MCO", charlotte:"CLT", boston:"BOS",
  seattle:"SEA", phoenix:"PHX", philadelphia:"PHL", detroit:"DTW", minneapolis:"MSP",
  "st paul":"MSP", cleveland:"CLE", cincinnati:"CVG", columbus:"CMH", indianapolis:"IND",
  memphis:"MEM", "kansas city":"MCI", "st louis":"STL", "saint louis":"STL",
  pittsburgh:"PIT", raleigh:"RDU", "raleigh durham":"RDU", durham:"RDU",
  tampa:"TPA", jacksonville:"JAX", austin:"AUS", "san antonio":"SAT",
  "oklahoma city":"OKC", tulsa:"TUL", "new orleans":"MSY", birmingham:"BHM",
  richmond:"RIC", lexington:"LEX", knoxville:"TYS", "baton rouge":"BTR", "little rock":"LIT",
  "salt lake city":"SLC", "salt lake":"SLC", portland:"PDX", "san diego":"SAN",
  sacramento:"SMF", milwaukee:"MKE", buffalo:"BUF", albany:"ALB", hartford:"BDL",
  providence:"PVD", rochester:"ROC", syracuse:"SYR", omaha:"OMA", "des moines":"DSM",
  wichita:"ICT", boise:"BOI", spokane:"GEG", reno:"RNO", tucson:"TUS", albuquerque:"ABQ",
  "el paso":"ELP", "colorado springs":"COS", "grand rapids":"GRR", "fort wayne":"FWA",
  madison:"MSN", "green bay":"GRB", dayton:"DAY", toledo:"TOL", louisville:"SDF",
  greenville:"GSP", columbia:"CAE", savannah:"SAV", charleston:"CHS", augusta:"AGS",
  huntsville:"HSV", montgomery:"MGM", mobile:"MOB", pensacola:"PNS", tallahassee:"TLH",
  gainesville:"GNV", "west palm beach":"PBI", "palm beach":"PBI", sarasota:"SRQ",
  "fort myers":"RSW", norfolk:"ORF", greensboro:"GSO", asheville:"AVL",
  chattanooga:"CHA", "little rock arkansas":"LIT", shreveport:"SHV", jackson:"JAN",
  "sioux falls":"FSD", fargo:"FAR", billings:"BIL", anchorage:"ANC", honolulu:"HNL",
  toronto:"YYZ", montreal:"YUL", vancouver:"YVR", calgary:"YYC", ottawa:"YOW",
});

export const VALID_ORIGIN_IATA = new Set([
  ...Object.values(CITY_IATA_MAP),
  "DAL","HOU","MDW","LGA","EWR","DCA","BWI","OAK","SJC","BUR","LGB","SNA","ONT",
  "IAD","JFK","ORD","SFO","IAH","DFW","SLC","PDX","SAN","SMF","MKE","BUF","MSY",
  "MCO","TPA","FLL","PBI","RSW","SRQ","JAX","VPS","ECP","PNS","BHM","HSV","MOB",
]);

export const MULTI_AIRPORT_MAIN = Object.freeze({
  ORD: "Chicago O'Hare",
  JFK: "New York JFK",
  IAD: "Washington Dulles",
  IAH: "Houston Bush",
  DFW: "Dallas/Fort Worth",
  SFO: "San Francisco",
});

export function createDefaultState() {
  return {
    version: STATE_VERSION,
    mode: "local_info",
    booking: {
      arrival: null,
      departure: null,
      adults: null,
      children: null,
      totalGuests: null,
      preferredUnit: null,
      bedroomsRequested: null,
      dateSource: null,
    },
    awaiting: [],
    flight: {
      originIata: null,
      destinationIata: "VPS",
      departureDate: null,
      returnDate: null,
      adults: null,
      children: null,
      infants: 0,
      dateSource: null,
    },
    verified: {
      bookingUrls: [],
      activityUrls: [],
      blogUrls: [],
      flightUrls: [],
      activityQuery: null,
      flightQuery: null,
      availabilityCheckedAt: null,
      availabilityQuery: null,
      availabilityUnits: { "707": null, "1006": null },
      facts: [],
    },
    openIssues: [],
    lead: {
      firstName: null,
      email: null,
      capturedAt: null,
      blueCodeRevealed: false,
    },
    existingGuest: {
      authorized: false,
      bookingId: null,
      booking: null,
    },
    ownerChat: {
      active: false,
      pending: false,
      invitedAt: null,
      relayPending: false,
    },
    flags: {
      scamCrisis: false,
      bedroomMismatch: false,
      petsMentioned: false,
      externalDisturbance: false,
      accidentalDamage: false,
      alertSent: false,
    },
    meta: {
      language: "en",
      pageSource: null,
      lastIntent: "INFO",
      updatedAt: null,
    },
  };
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function normalizeState(input) {
  const base = createDefaultState();
  const src = input && typeof input === "object" ? input : {};
  const out = {
    ...base,
    ...clone(src),
    booking: { ...base.booking, ...(src.booking || {}) },
    flight: { ...base.flight, ...(src.flight || {}) },
    verified: {
      ...base.verified,
      ...(src.verified || {}),
      availabilityUnits: {
        ...base.verified.availabilityUnits,
        ...(src.verified?.availabilityUnits || {}),
      },
    },
    lead: { ...base.lead, ...(src.lead || {}) },
    existingGuest: { ...base.existingGuest, ...(src.existingGuest || {}) },
    ownerChat: { ...base.ownerChat, ...(src.ownerChat || {}) },
    flags: { ...base.flags, ...(src.flags || {}) },
    meta: { ...base.meta, ...(src.meta || {}) },
  };

  out.version = STATE_VERSION;
  out.mode = ["booking", "existing_guest", "local_info", "maintenance", "emergency"].includes(out.mode)
    ? out.mode
    : "local_info";
  out.awaiting = Array.isArray(out.awaiting)
    ? [...new Set(out.awaiting.filter(v => ["arrival","departure","adults","children","origin_city","hoa_confirmation","email","first_name","relay_message"].includes(v)))]
    : [];
  out.openIssues = Array.isArray(out.openIssues) ? out.openIssues.slice(-20) : [];
  for (const key of ["bookingUrls", "activityUrls", "blogUrls", "flightUrls", "facts"]) {
    out.verified[key] = Array.isArray(out.verified[key]) ? [...new Set(out.verified[key])].slice(-50) : [];
  }
  out.booking.adults = normalizeNullableInteger(out.booking.adults, 1, MAX_TWO_UNIT_OCCUPANCY);
  out.booking.children = normalizeNullableInteger(out.booking.children, 0, MAX_TWO_UNIT_OCCUPANCY);
  out.booking.totalGuests = normalizeNullableInteger(out.booking.totalGuests, 1, 50);
  out.booking.preferredUnit = ["707", "1006"].includes(String(out.booking.preferredUnit))
    ? String(out.booking.preferredUnit)
    : null;
  out.booking.bedroomsRequested = normalizeNullableInteger(out.booking.bedroomsRequested, 1, 20);
  out.flight.originIata = isValidOriginIata(out.flight.originIata) ? String(out.flight.originIata).toUpperCase() : null;
  out.flight.destinationIata = ["VPS", "PNS", "ECP"].includes(String(out.flight.destinationIata).toUpperCase())
    ? String(out.flight.destinationIata).toUpperCase()
    : "VPS";
  out.flight.departureDate = isIsoDate(out.flight.departureDate) ? out.flight.departureDate : null;
  out.flight.returnDate = isIsoDate(out.flight.returnDate) ? out.flight.returnDate : null;
  out.flight.adults = normalizeNullableInteger(out.flight.adults, 1, 12);
  out.flight.children = normalizeNullableInteger(out.flight.children, 0, 12);
  out.flight.infants = normalizeNullableInteger(out.flight.infants, 0, 12) ?? 0;
  out.flight.dateSource = typeof out.flight.dateSource === "string" ? out.flight.dateSource : null;
  return out;
}

export function applyStatePatch(state, patch) {
  const current = normalizeState(state);
  const src = patch && typeof patch === "object" ? patch : {};
  const nextBooking = { ...current.booking, ...(src.booking || {}) };
  const nextFlight = { ...current.flight, ...(src.flight || {}) };
  return normalizeState({
    ...current,
    ...src,
    booking: nextBooking,
    flight: nextFlight,
    verified: {
      ...current.verified,
      ...(src.verified || {}),
      availabilityUnits: {
        ...current.verified.availabilityUnits,
        ...(src.verified?.availabilityUnits || {}),
      },
    },
    lead: { ...current.lead, ...(src.lead || {}) },
    existingGuest: { ...current.existingGuest, ...(src.existingGuest || {}) },
    ownerChat: { ...current.ownerChat, ...(src.ownerChat || {}) },
    flags: { ...current.flags, ...(src.flags || {}) },
    meta: { ...current.meta, ...(src.meta || {}) },
    openIssues: src.openIssues ? src.openIssues : current.openIssues,
    awaiting: src.awaiting ? src.awaiting : current.awaiting,
  });
}

export function normalizeNullableInteger(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

export function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addIsoDays(dateStr, days) {
  if (!isIsoDate(dateStr) || !Number.isInteger(days)) return null;
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffNights(arrival, departure) {
  if (!isIsoDate(arrival) || !isIsoDate(departure)) return null;
  return Math.round((new Date(`${departure}T12:00:00Z`) - new Date(`${arrival}T12:00:00Z`)) / 86400000);
}

export function todayIso(now = new Date(), timeZone = "America/Chicago") {
  return now.toLocaleDateString("en-CA", { timeZone });
}

export function extractHolidayDates(text) {
  const t = String(text || "").toLowerCase();
  for (const [key, val] of Object.entries(HOLIDAY_DATES)) {
    if (t.includes(key)) return { ...val };
  }
  return null;
}

export function normalizeMonths(text) {
  const foreignMonths = {
    // Spanish / Portuguese
    enero:"january", janeiro:"january", febrero:"february", fevereiro:"february",
    marzo:"march", marco:"march", abril:"april", mayo:"may", maio:"may", junio:"june", junho:"june",
    julio:"july", julho:"july", agosto:"august", septiembre:"september", setembro:"september",
    octubre:"october", outubro:"october", noviembre:"november", novembro:"november",
    diciembre:"december", dezembro:"december",
    // French
    janvier:"january", fevrier:"february", mars:"march", avril:"april", mai:"may", juin:"june",
    juillet:"july", aout:"august", septembre:"september", octobre:"october", novembre:"november", decembre:"december",
    // Turkish
    ocak:"january", subat:"february", mart:"march", nisan:"april", mayis:"may", haziran:"june",
    temmuz:"july", agustos:"august", eylul:"september", ekim:"october", kasim:"november", aralik:"december",
    // German
    januar:"january", februar:"february", marz:"march", april:"april", juni:"june", juli:"july",
    oktober:"october", dezember:"december",
  };
  const wordKey = value => value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ü/g, "u");
  let foreignConverted = false;
  let out = String(text || "").normalize("NFKC").replace(/\p{L}+/gu, token => {
    const replacement = foreignMonths[wordKey(token)];
    if (replacement) foreignConverted = true;
    return replacement || token;
  });
  if (foreignConverted) {
    const conn…9136 tokens truncated… }

  const latestRemember = [...toolResults].reverse().find(result => result?.name === "remember_booking_details");
  const claimsDetailsSaved = /\b(?:i|we)(?:['’]ve|\s+have)?\s+(?:saved|stored|recorded|noted)\b[^.!?\n]{0,100}\b(?:dates?|party|details?|adults?|children|kids?|guests?)\b/i.test(text);
  if (latestRemember && latestRemember.status !== "success" && claimsDetailsSaved) {
    violations.push({ code: "unverified_details_saved", detail: "The booking-details tool did not confirm that ambiguous details were stored." });
  }

  const itineraryResult = toolResults.some(result => result?.name === "get_local_guide" && result?.data?.topic === "itinerary");
  const offersCompetingItinerary = /\b(?:i(?:['’]ll|\s+can|\s+could|\s+will)|we(?:['’]ll|\s+can|\s+could|\s+will))\b[^.!?\n]{0,140}\b(?:build|create|draft|sketch|suggest|put together)\b[^.!?\n]{0,100}\b(?:itinerar(?:y|ies)|day-by-day|schedule|sample (?:plan|highlights?|ideas?)|highlights?|ideas?)\b/i.test(text);
  if (itineraryResult && offersCompetingItinerary) {
    violations.push({ code: "itinerary_must_use_dedicated_planner", detail: "Present the dedicated planner without offering to build a competing itinerary or sample in chat." });
  }

  const photographerResult = toolResults.some(result => result?.name === "get_activity_options" && result?.data?.category === "photographer");
  const claimsPhotographerService = /\b(?:i(?:['’]ll|\s+can|\s+could|\s+will)|we(?:['’]ll|\s+can|\s+could|\s+will))\b[^.!?\n]{0,120}\b(?:book|contact|call|price|confirm|check|arrange|pull)\b[^.!?\n]{0,100}\b(?:photographer|photo session|options?|availability|pricing|rates?|contact (?:info|information|details?))\b/i.test(text);
  if (photographerResult && (claimsPhotographerService || /\bvetted\b[^.!?\n]{0,80}\b(?:photographer|provider|options?|link)\b/i.test(text))) {
    violations.push({ code: "photographer_browsing_only", detail: "The TripShock photographer URL is browsing-only; do not claim vetting or offer contact, pricing, availability checks, arrangements, or booking." });
  }

  const availability = toolResults.findLast?.(r => r?.name === "check_availability") || [...toolResults].reverse().find(r => r?.name === "check_availability");
  const claimsUnitAvailable = (unit) => {
    const patterns = [
      new RegExp(String.raw`(?:unit\s*)?${unit}\s+(?:is\s+)?(?:available|open|free|vacant|bookable)(?:\s+for\s+(?:those|your|the)\s+dates)?`, "i"),
      new RegExp(String.raw`(?:unit\s*)?${unit}\s+(?:works|can\s+(?:host|accommodate|take|be\s+booked)|has\s+(?:space|availability|(?:an\s+)?openings?)|is\s+yours|is\s+good\s+to\s+go)(?:\s+for\s+(?:your|the)\s+(?:stay|dates|group))?`, "i"),
      new RegExp(String.raw`we\s+(?:can\s+(?:host|place)\s+you\s+in|have\s+(?:availability|space|an\s+opening)\s+in)\s+(?:unit\s*)?${unit}`, "i"),
      new RegExp(String.raw`we\s+(?:have|show)\s+(?:unit\s*)?${unit}\s+(?:available|open|free)`, "i"),
      new RegExp(String.raw`you\s+can\s+(?:reserve|book)\s+(?:unit\s*)?${unit}`, "i"),
      new RegExp(String.raw`there\s+is\s+(?:space|room|an\s+opening)\s+in\s+(?:unit\s*)?${unit}`, "i"),
    ];
    return patterns.some(pattern => pattern.test(text));
  };
  if (claimsUnitAvailable("707") && availability?.data?.units?.find(u => u.unit === "707")?.available !== true) {
    violations.push({ code: "unverified_availability_707", detail: "Unit 707 availability claim is not supported." });
  }
  if (claimsUnitAvailable("1006") && availability?.data?.units?.find(u => u.unit === "1006")?.available !== true) {
    violations.push({ code: "unverified_availability_1006", detail: "Unit 1006 availability claim is not supported." });
  }
  if (/unit\s*707\s+(?:is|looks|remains|has been)\s+(?:booked|unavailable|not available|taken|occupied|sold out)/i.test(text) && availability?.data?.units?.find(u => u.unit === "707")?.available !== false) {
    violations.push({ code: "unverified_unavailability_707", detail: "Unit 707 unavailability claim is not supported." });
  }
  if (/unit\s*1006\s+(?:is|looks|remains|has been)\s+(?:booked|unavailable|not available|taken|occupied|sold out)/i.test(text) && availability?.data?.units?.find(u => u.unit === "1006")?.available !== false) {
    violations.push({ code: "unverified_unavailability_1006", detail: "Unit 1006 unavailability claim is not supported." });
  }
  const bothAvailableClaim = /both (?:of )?(?:our )?(?:units|condos) (?:(?:are|look|remain) (?:available|open|free|vacant|bookable)|work(?: for those dates)?|can host(?: you| your group)?|have (?:space|openings?))/i.test(text)
    || /either (?:unit|condo) (?:is (?:available|open|free)|can (?:take|host|accommodate) you)/i.test(text);
  if (bothAvailableClaim && !(availability?.data?.units?.every?.(u => u.available === true))) {
    violations.push({ code: "unverified_both_available", detail: "The claim that both units are available is not supported." });
  }
  const bothBookedClaim = /both (?:of )?(?:our )?(?:units|condos) (?:are|look|remain) (?:booked|unavailable|not available|taken|occupied|sold out)/i.test(text);
  if (bothBookedClaim && !(availability?.data?.units?.every?.(u => u.available === false))) {
    violations.push({ code: "unverified_both_unavailable", detail: "The claim that both units are unavailable is not supported." });
  }

  const verifiedRaw = JSON.stringify({ toolResults, stateFacts: state?.verified?.facts || [], booking: state?.booking, user: latestUser });
  const verifiedCorpus = normalizedCorpus(verifiedRaw);

  // Exact monetary totals must be grounded in current tool data or guest text.
  // The booking page may show totals, but the model may not manufacture one.
  const moneyClaims = text.match(/(?:\$\s?\d[\d,]*(?:\.\d{1,2})?|\bUSD\s?\d[\d,]*(?:\.\d{1,2})?)/gi) || [];
  for (const claim of moneyClaims) {
    const compact = claim.replace(/\s+/g, "").toLowerCase();
    const supported = verifiedRaw.replace(/\s+/g, "").toLowerCase().includes(compact);
    if (!supported) violations.push({ code: "unverified_price", detail: claim });
  }
  const wordMoneyPattern = /\b((?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|and)[ -]?)+)\s+(?:dollars?|bucks?)\b/gi;
  for (const match of text.matchAll(wordMoneyPattern)) {
    const value = parseEnglishNumberWords(match[1]);
    if (value == null) continue;
    const supported = verifiedRaw.includes(`$${value}`) || verifiedRaw.includes(`USD ${value}`) || normalizedCorpus(verifiedRaw).includes(normalizedCorpus(match[0]));
    if (!supported) violations.push({ code: "unverified_price", detail: match[0] });
  }

  const blueAuthorized = state?.lead?.blueCodeRevealed === true;
  const codeText = securityText;
  const blueCodeMentioned = [...codeText.matchAll(/(?:code|coupon|promo|discount|checkout)/gi)].some(match => {
    const index = match.index || 0;
    const window = codeText.slice(Math.max(0, index - 48), Math.min(codeText.length, index + match[0].length + 48));
    return window.toLowerCase().replace(/[^a-z]/g, "").includes("blue");
  });
  if (blueCodeMentioned && !blueAuthorized) {
    violations.push({ code: "unauthorized_blue_code", detail: "The BLUE code was stated without an authorized lead capture." });
  }

  const percentWordValues = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, twentyfive: 25, thirty: 30, forty: 40, fifty: 50 };
  const percentClaims = [
    ...(text.match(/\b\d+(?:\.\d+)?%/g) || []).map(raw => ({ raw, value: Number(raw.replace("%", "")) })),
    ...[...securityText.matchAll(/\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty(?:[- ]?five)?|thirty|forty|fifty)\s*(?:percent(?:age)?(?:\s+points?)?\b|pct\b|%)(?!\w)/gi)].map(match => {
      const key = match[1].toLowerCase().replace(/[- ]/g, "");
      return { raw: match[0], value: Number.isFinite(Number(key)) ? Number(key) : percentWordValues[key] };
    }),
  ];
  for (const claim of percentClaims) {
    const canonical = `${claim.value}%`;
    const inVerifiedData = verifiedRaw.includes(claim.raw) || verifiedRaw.includes(canonical);
    const isStaticDirectDiscount = claim.value === 10;
    const isAuthorizedBlue = claim.value === 5 && blueAuthorized;
    if (!inVerifiedData && !isStaticDirectDiscount && !isAuthorizedBlue) {
      violations.push({ code: "unverified_percentage", detail: claim.raw });
    }
  }

  const datePhrases = [
    ...(text.match(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?!\d)(?:\s*[-–]\s*\d{1,2}(?:st|nd|rd|th)?(?!\d))?(?:,?\s*20\d{2})?/gi) || []),
    ...(text.match(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:,?\s*20\d{2})?/gi) || []),
  ];
  const verifiedIsoDates = [...new Set(verifiedRaw.match(/\b20\d{2}-\d{2}-\d{2}\b/g) || [])];
  const monthNumber = {
    jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
    apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
    aug: "08", august: "08", sep: "09", sept: "09", september: "09", oct: "10", october: "10",
    nov: "11", november: "11", dec: "12", december: "12",
  };
  for (const phrase of datePhrases) {
    const normalized = normalizedCorpus(phrase).replace(/(?:st|nd|rd|th)\b/g, "");
    const words = normalized.split(" ").filter(Boolean);
    let supported = words.every(word => verifiedCorpus.includes(word));

    // Natural-language dates produced from verified ISO tool data are allowed.
    // Example: a tool returns 2026-08-06/2026-08-11 and the agent says
    // "August 6–11". The old word-corpus check rejected this because the tool
    // data did not literally contain the word "August".
    if (!supported) {
      const m = phrase.toLowerCase().match(/^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[-–]\s*(\d{1,2})(?:st|nd|rd|th)?)?(?:,?\s*(20\d{2}))?$/i);
      if (m) {
        const mm = monthNumber[m[1].toLowerCase()];
        const days = [m[2], m[3]].filter(Boolean).map(day => String(Number(day)).padStart(2, "0"));
        const explicitYear = m[4] || null;
        supported = days.every(day => verifiedIsoDates.some(iso => {
          if (explicitYear && !iso.startsWith(`${explicitYear}-`)) return false;
          return iso.endsWith(`-${mm}-${day}`);
        }));
      } else {
        const dmy = phrase.toLowerCase().match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:,?\s*(20\d{2}))?$/i);
        if (dmy) {
          const mm = monthNumber[dmy[2].toLowerCase()];
          const day = String(Number(dmy[1])).padStart(2, "0");
          const explicitYear = dmy[3] || null;
          supported = verifiedIsoDates.some(iso => (!explicitYear || iso.startsWith(`${explicitYear}-`)) && iso.endsWith(`-${mm}-${day}`));
        }
      }
    }
    if (!supported) violations.push({ code: "unverified_specific_date", detail: phrase });
  }

  if (state?.flags?.scamCrisis) {
    if (/😊|🎉|🌊|🙌|😉|great news|perfect/i.test(text)) violations.push({ code: "scam_tone", detail: "Trust-crisis response contains cheerful sales language." });
    if (!text.includes(OWNER_CONTACT.phone) || !text.includes(OWNER_CONTACT.email)) violations.push({ code: "scam_contact_missing", detail: "Trust-crisis response is missing owner contact details." });
    if (/how many|check.?in|check.?out|dates|adults|children/i.test(text)) violations.push({ code: "scam_booking_question", detail: "Trust-crisis response asks for booking details." });
  }

  if (state?.flags?.bedroomMismatch && state?.booking?.bedroomsRequested >= 2 && !/both (?:of )?our units are 1-bedroom|both units are 1-bedroom|one-bedroom/i.test(text)) {
    violations.push({ code: "bedroom_disclosure_missing", detail: "A multi-bedroom request was not clearly corrected." });
  }

  const alertClaim = /(?:ozan|the owner|the host|owner|host)(?:(?:['’]s| is| has| was)(?: been)?| has already been| was just)\s+(?:notified|alerted|informed|contacted|told|made aware|aware)|(?:i|we)(?:['’]ve| have)?\s+(?:notified|alerted|informed|contacted|messaged|pinged|reached out to|reached|passed (?:this|it) along to|let)\s+(?:ozan|the owner|the host|owner|host)(?: know)?|(?:i|we)(?:['’]ve| have)?\s+(?:forwarded|sent)\s+(?:this|your message|your note|the note)\s+to\s+(?:ozan|the owner|the host|owner|host)|(?:i|we)(?:['’]ve| have)?\s+sent\s+(?:ozan|the owner|the host|owner|host)\s+(?:this|your message|your note|the note)|(?:ozan|the owner|the host|owner|host)\s+knows about it(?: now)?|(?:ozan|the owner|the host|owner|host)\s+(?:has|got|received)\s+(?:your message|your note|this)|(?:your message|your note)\s+is with ozan|(?:i|we)(?:['’]ve| have)?\s+(?:sent|delivered)\s+(?:the|an|your)?\s*(?:urgent\s+)?alert(?: successfully)?/i.test(text);
  const alertConfirmed = Boolean(state?.flags?.alertSent) || (toolResults || []).some(result =>
    ["alert", "relay", "owner_chat"].includes(result?.kind) && (result?.data?.sent === true || result?.ok === true && ["sent", "invited", "already_invited", "already_sent"].includes(result?.status))
  );
  if (alertClaim && !alertConfirmed) {
    violations.push({ code: "unverified_alert_claim", detail: "The reply says Ozan was notified, but no successful delivery is recorded." });
  }

  const captureClaim = /(?:your\s+)?email\s+(?:has been|was|is)\s+(?:captured|saved|added|registered)|(?:i|we)(?:['’]ve| have)?\s+(?:captured|saved|added|registered)\s+(?:your\s+)?email/i.test(text);
  const captureConfirmed = state?.lead?.capturedAt || (toolResults || []).some(result =>
    result?.kind === "lead" && result?.ok === true && result?.status === "captured"
  );
  if (captureClaim && !captureConfirmed) {
    violations.push({ code: "unverified_lead_capture", detail: "The reply says an email was captured, but no successful capture is recorded." });
  }

  const concessionClaim = /(?:(?:ozan|the owner|the host|owner|host|maintenance|the team|we|i)\s+(?:may|might|could|can|will|would|should|is likely to|can probably)\s+(?:be able to\s+)?(?:offer|give|provide|arrange|approve|authorize|consider|issue|grant|look into\s+(?:offering|giving|providing|approving))|(?:you|the guest)\s+(?:may|might|could|will|would|should)\s+(?:receive|get|be offered|be given)|(?:i|we)\s+(?:can|could|will|would)\s+make (?:this|it) right with)\b[^.!?]{0,100}\b(?:refund|reimbursement|compensation|discount|credit|upgrade|free night|complimentary night|late check-?out|waived? fee|fee waiver)/i.test(text);
  const ownerApprovedConcession = (toolResults || []).some(result => {
    const approvedText = String(result?.data?.approvedConcessionText || "").trim();
    return result?.data?.ownerApprovedConcession === true && approvedText && text.includes(approvedText);
  });
  if (concessionClaim && !ownerApprovedConcession) {
    violations.push({ code: "unauthorized_concession", detail: "The reply introduced or predicted a concession without an explicit owner-approved tool result." });
  }

  const allowedPhoneDigits = new Set();
  const phonePattern = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g;
  const normalizePhone = value => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  };
  for (const source of [verifiedRaw, latestUser, OWNER_CONTACT.phone]) {
    for (const match of String(source || "").matchAll(phonePattern)) allowedPhoneDigits.add(normalizePhone(match[0]));
  }
  for (const match of securityText.matchAll(phonePattern)) {
    const digits = normalizePhone(match[0]);
    if (!allowedPhoneDigits.has(digits)) violations.push({ code: "unverified_phone", detail: match[0] });
  }

  const allowedEmails = new Set([OWNER_CONTACT.email.toLowerCase()]);
  const emailPattern = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;
  for (const source of [verifiedRaw, latestUser]) {
    for (const match of String(source || "").matchAll(emailPattern)) allowedEmails.add(match[0].toLowerCase());
  }
  for (const match of securityText.matchAll(emailPattern)) {
    if (!allowedEmails.has(match[0].toLowerCase())) violations.push({ code: "unverified_email", detail: match[0] });
  }

  const authorizedDoorCodes = new Set();
  for (const result of toolResults || []) {
    const code = result?.data?.doorCode ?? result?.data?.booking?.doorCode;
    if (code != null) authorizedDoorCodes.add(String(code));
  }
  const doorCodeClaims = [];
  const doorPatterns = [
    /(?:door|entry|pin)\s*(?:code|pin)?\s*(?:is|:)?\s*(\d(?:[\s._\-/]?\d){3,9})/gi,
    /(?:use|enter|type)\s+(\d(?:[\s._\-/]?\d){3,9})[#*]?\s+(?:at|into|on)\s+(?:the\s+)?(?:door|lock|keypad)/gi,
  ];
  for (const pattern of doorPatterns) {
    for (const match of securityText.matchAll(pattern)) doorCodeClaims.push(match[1].replace(/\D/g, ""));
  }
  for (const code of new Set(doorCodeClaims)) {
    if (!authorizedDoorCodes.has(String(code))) {
      violations.push({ code: "unauthorized_door_code", detail: "A door code appeared without current-turn authorization." });
    }
  }

  return { ok: violations.length === 0, violations, urls };
}

export function safeFallback({ state, latestUser, reason = "temporary_error" }) {
  if (state?.flags?.scamCrisis || detectScamCrisis(latestUser)) {
    return `I completely understand your frustration, and I’m sorry this experience has been confusing. This is a real, owner-operated rental business. Please contact the owner Ozan directly at ${OWNER_CONTACT.phone} or ${OWNER_CONTACT.email} — he will personally sort this out.`;
  }
  if (state?.mode === "emergency" || detectLockedOut(latestUser)) {
    const sent = state?.flags?.alertSent === true;
    return sent
      ? `I’ve sent Ozan an urgent alert. Please call him now at ${OWNER_CONTACT.phone}. If there is an immediate threat to anyone’s safety, call 911.`
      : `I couldn’t confirm that an alert reached Ozan. Please call him now at ${OWNER_CONTACT.phone}. If there is an immediate threat to anyone’s safety, call 911.`;
  }
  if (state?.mode === "maintenance" || detectMaintenance(latestUser)) {
    return state?.flags?.alertSent === true
      ? `I’m sorry you’re dealing with that. I’ve alerted Ozan so he can follow up directly; you can also reach him at ${OWNER_CONTACT.phone}.`
      : `I’m sorry you’re dealing with that. I couldn’t confirm an alert was delivered, so please contact Ozan directly at ${OWNER_CONTACT.phone}.`;
  }
  if (reason === "past_dates") {
    return "Those dates have already passed. Please send the intended future check-in and check-out dates, and I’ll check them right away.";
  }
  const missing = state?.awaiting || [];
  if (missing.length) {
    const labels = { arrival: "check-in date", departure: "check-out date", adults: "number of adults", children: "number of children", origin_city: "city you are flying from", email: "email address", first_name: "first name", relay_message: "message you want me to send Ozan" };
    return `I want to make sure I get this right. Could you send the ${missing.map(x => labels[x] || x).join(" and ")}?`;
  }
  return `I hit a temporary snag. Please try once more, or contact Ozan at ${OWNER_CONTACT.phone}.`;
}
