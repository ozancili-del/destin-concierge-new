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
  return normalizeState({
    ...current,
    ...src,
    booking: { ...current.booking, ...(src.booking || {}) },
    flight: { ...current.flight, ...(src.flight || {}) },
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
    const connectorMap = { hasta:"until", al:"to", au:"to", a:"to", ile:"to", ate:"until", de:"", del:"", do:"to", bis:"to" };
    out = out.replace(/\p{L}+/gu, token => connectorMap[wordKey(token)] ?? token).replace(/\s+/g, " ").trim();
  }
  const corrections = [
    [/\b(decmber|decemer|decmeber|decembre|dcember|decmebr)\b/gi, "december"],
    [/\b(novmber|noveber|novemebr|novmeber|novembr|nvember)\b/gi, "november"],
    [/\b(septemebr|septmber|sepember|septeber|spetember|setpember)\b/gi, "september"],
    [/\b(feburary|febuary|februray|februaray|febrary|febraury)\b/gi, "february"],
    [/\b(januray|januaray|janury|janaury)\b/gi, "january"],
    [/\b(ocotber|octobr|ocober|octobar)\b/gi, "october"],
    [/\b(augest|augst|agust|auguts)\b/gi, "august"],
    [/\b(jully|jule|juli)\b/gi, "july"],
    [/\b(marh|mrach|mach)\b/gi, "march"],
    [/\b(apirl|aprl|aprli)\b/gi, "april"],
    [/\buntl\b/gi, "until"],
    [/\bunitl\b/gi, "until"],
    [/\bunil\b/gi, "until"],
    [/\btill\b/gi, "until"],
    [/\bthru\b/gi, "through"],
    [/\btrhough\b/gi, "through"],
  ];
  for (const [pattern, correct] of corrections) out = out.replace(pattern, correct);
  return out;
}

const MONTHS = Object.freeze({
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
  jan:"01",feb:"02",mar:"03",apr:"04",jun:"06",jul:"07",aug:"08",
  sept:"09",sep:"09",oct:"10",nov:"11",dec:"12",
});
const MONTH_PATTERN = Object.keys(MONTHS).join("|");

function normalizeDayWords(text) {
  const values = {
    "thirty-first": 31, "thirty first": 31,
    "thirtieth": 30,
    "twenty-ninth": 29, "twenty ninth": 29,
    "twenty-eighth": 28, "twenty eighth": 28,
    "twenty-seventh": 27, "twenty seventh": 27,
    "twenty-sixth": 26, "twenty sixth": 26,
    "twenty-fifth": 25, "twenty fifth": 25,
    "twenty-fourth": 24, "twenty fourth": 24,
    "twenty-third": 23, "twenty third": 23,
    "twenty-second": 22, "twenty second": 22,
    "twenty-first": 21, "twenty first": 21,
    "twentieth": 20,
    "nineteenth": 19, "eighteenth": 18, "seventeenth": 17, "sixteenth": 16,
    "fifteenth": 15, "fourteenth": 14, "thirteenth": 13, "twelfth": 12,
    "eleventh": 11, "tenth": 10, "ninth": 9, "eighth": 8, "seventh": 7,
    "sixth": 6, "fifth": 5, "fourth": 4, "third": 3, "second": 2, "first": 1,
  };
  let out = String(text || "");
  for (const key of Object.keys(values).sort((a, b) => b.length - a.length)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[-\\s]");
    out = out.replace(new RegExp(`\\b${escaped}\\b`, "gi"), String(values[key]));
  }
  return out;
}

function resolvedYear(text, now) {
  const yearMatch = String(text || "").match(/\b(202[0-9]|203\d)\b/);
  return yearMatch ? Number(yearMatch[1]) : now.getFullYear();
}

function yearForSecondMonth(year, month1, month2) {
  return Number(month2) < Number(month1) ? year + 1 : year;
}

function makeRange(year, month1, day1, month2, day2) {
  const depYear = yearForSecondMonth(year, month1, month2);
  const result = {
    arrival: `${year}-${month1}-${String(day1).padStart(2, "0")}`,
    departure: `${depYear}-${month2}-${String(day2).padStart(2, "0")}`,
  };
  return isIsoDate(result.arrival) && isIsoDate(result.departure) ? result : null;
}

// Deterministic date-range parser. The model decides when date parsing is needed;
// this function remains the source of the normalized calendar values.
export function extractDates(input, now = new Date()) {
  let text = String(input || "").replace(/([a-zA-Z])[.,!?;:]+(\s|$)/g, "$1$2");
  text = normalizeDayWords(text);
  const year = resolvedYear(text, now);
  const t = normalizeMonths(text.toLowerCase());

  const holiday = extractHolidayDates(t);
  if (holiday) return { arrival: holiday.arrival, departure: holiday.departure };

  const explicitCrossYear = t.match(new RegExp(`(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(202\\d|203\\d))?\\s*(?:to|through|until|[-–])\\s*(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(202\\d|203\\d))?`, "i"));
  if (explicitCrossYear) {
    const m1 = MONTHS[explicitCrossYear[1].toLowerCase()];
    const m2 = MONTHS[explicitCrossYear[4].toLowerCase()];
    const y1 = explicitCrossYear[3] ? Number(explicitCrossYear[3]) : year;
    const y2 = explicitCrossYear[6] ? Number(explicitCrossYear[6]) : yearForSecondMonth(y1, m1, m2);
    const result = {
      arrival: `${y1}-${m1}-${explicitCrossYear[2].padStart(2, "0")}`,
      departure: `${y2}-${m2}-${explicitCrossYear[5].padStart(2, "0")}`,
    };
    if (isIsoDate(result.arrival) && isIsoDate(result.departure)) return result;
  }

  const slashAltMonthMatch = t.match(/(\d{1,2})-(\d{1,2})\/(\d{1,2})\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i);
  if (slashAltMonthMatch) {
    const m = MONTHS[slashAltMonthMatch[4].toLowerCase()];
    return makeRange(year, m, slashAltMonthMatch[1], m, slashAltMonthMatch[3]);
  }

  const isoMatches = text.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (isoMatches?.length >= 2 && isIsoDate(isoMatches[0]) && isIsoDate(isoMatches[1])) {
    return { arrival: isoMatches[0], departure: isoMatches[1] };
  }

  const numericPatterns = [
    /(\d{1,2})-(\d{1,2})\s*(?:to|until|through|thru)\s*(\d{1,2})-(\d{1,2})/i,
    // Accept mixed separators commonly typed on mobile, e.g. "7/26 -7-31".
    /(\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})[\/-](\d{1,2})/,
    /(\d{1,2})\/(\d{1,2})\s*(?:to|until|through|thru)\s*(\d{1,2})\/(\d{1,2})/i,
    /(\d{1,2})\.(\d{1,2})\s*(?:to|until|through|thru|[-–])\s*(\d{1,2})\.(\d{1,2})/i,
  ];
  for (const pattern of numericPatterns) {
    const m = t.match(pattern);
    if (m) return makeRange(year, m[1].padStart(2, "0"), m[2], m[3].padStart(2, "0"), m[4]);
  }

  const sameMonthRange = new RegExp(`(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*[-–]\\s*(\\d{1,2})(?:st|nd|rd|th)?(?!\\s*(?:adult|child|kid|guest|person|people|ppl|pax|infant|baby|toddler))`, "i");
  const sameMatch = t.match(sameMonthRange);
  if (sameMatch) {
    const month = MONTHS[sameMatch[1].toLowerCase()];
    return makeRange(year, month, sameMatch[2], month, sameMatch[3]);
  }

  const dayRangeBeforeMonth = t.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i);
  if (dayRangeBeforeMonth) {
    const month = MONTHS[dayRangeBeforeMonth[3].toLowerCase()];
    return makeRange(year, month, dayRangeBeforeMonth[1], month, dayRangeBeforeMonth[2]);
  }

  const monthThenDayRange = t.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*(\d{1,2})(?:st|nd|rd|th)?(?!\s*(?:adult|child|kid|guest|person|people|ppl|pax|infant|baby|toddler))/i);
  if (monthThenDayRange) {
    const month = MONTHS[monthThenDayRange[1].toLowerCase()];
    return makeRange(year, month, monthThenDayRange[2], month, monthThenDayRange[3]);
  }

  const crossPattern = new RegExp(`(${MONTH_PATTERN})\\s*(\\d{1,2})(?:(?:\\s+(?:to|and|through|until|till|untl|thru)\\s+|\\s*[-–]\\s*)(?:(${MONTH_PATTERN})\\s*)?(\\d{1,2}))(?!\\s*(?:adult|child|kid|guest|person|people|ppl|pax|infant|baby|toddler))`, "i");
  const crossMatch = t.match(crossPattern);
  if (crossMatch) {
    const m1 = MONTHS[crossMatch[1].toLowerCase()];
    const m2 = crossMatch[3] ? MONTHS[crossMatch[3].toLowerCase()] : m1;
    return makeRange(year, m1, crossMatch[2], m2, crossMatch[4]);
  }

  const monthDayPattern = new RegExp(`(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)(?!\\s*(?:adult|child|kid|guest|person|people|infant|baby|toddler))`, "gi");
  const monthDayMatches = [...t.matchAll(monthDayPattern)];
  if (monthDayMatches.length >= 2) {
    const m1 = MONTHS[monthDayMatches[0][1].toLowerCase()];
    const m2 = MONTHS[monthDayMatches[1][1].toLowerCase()];
    return makeRange(year, m1, monthDayMatches[0][2], m2, monthDayMatches[1][2]);
  }

  const dayMonthRaw = [...t.matchAll(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)/gi)];
  const dayMonthMatches = dayMonthRaw.filter(match => {
    const after = t.slice(match.index + match[0].length, match.index + match[0].length + 24);
    if (/^\s*[-–,]?\s*(to|until|through|thru)\b/i.test(after)) return true;
    if (/^\s*[-–]\s*\d/i.test(after)) return true;
    return !/^\s*\d*\s*(adult|kid|child|children|guest|person|people|ppl|pax|infant|baby|toddler)/i.test(after);
  });
  if (dayMonthMatches.length >= 2) {
    const m1 = MONTHS[dayMonthMatches[0][2].toLowerCase()];
    const m2 = MONTHS[dayMonthMatches[1][2].toLowerCase()];
    return makeRange(year, m1, dayMonthMatches[0][1], m2, dayMonthMatches[1][1]);
  }

  const dayMonthDay = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?!\s*(?:adult|kid|child|children|guest|person|people|ppl|pax|infant|baby|toddler|pet|dog|cat|bird|animal))(?=\s+\S)/i);
  if (dayMonthDay) {
    const month = MONTHS[dayMonthDay[2].toLowerCase()];
    return makeRange(year, month, dayMonthDay[1], month, dayMonthDay[3]);
  }

  const singleDayMonthToDay = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s*(?:to|until|through|and|-)\s*(\d{1,2})/i);
  if (singleDayMonthToDay) {
    const month = MONTHS[singleDayMonthToDay[2].toLowerCase()];
    return makeRange(year, month, singleDayMonthToDay[1], month, singleDayMonthToDay[3]);
  }

  const numToNumMonth = t.match(/(\d{1,2})\s*(?:to|until|through|thru|till)\s*(\d{1,2})\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)/i);
  if (numToNumMonth) {
    const month = MONTHS[numToNumMonth[3].toLowerCase()];
    return makeRange(year, month, numToNumMonth[1], month, numToNumMonth[2]);
  }

  return null;
}

export function extractSingleDate(input, now = new Date()) {
  const text = normalizeMonths(normalizeDayWords(String(input || "")).toLowerCase());
  const year = resolvedYear(text, now);
  const m1 = text.match(new RegExp(`(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)`, "i"));
  if (m1) {
    const value = `${year}-${MONTHS[m1[1].toLowerCase()]}-${m1[2].padStart(2, "0")}`;
    return isIsoDate(value) ? value : null;
  }
  const m2 = text.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)\\s+(?:of\\s+)?(${MONTH_PATTERN})`, "i"));
  if (m2) {
    const value = `${year}-${MONTHS[m2[2].toLowerCase()]}-${m2[1].padStart(2, "0")}`;
    return isIsoDate(value) ? value : null;
  }
  const m3 = text.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (m3) {
    const value = `${year}-${m3[1].padStart(2,"0")}-${m3[2].padStart(2,"0")}`;
    return isIsoDate(value) ? value : null;
  }
  const m4 = text.match(/\b(\d{1,2})\.(\d{1,2})\b/);
  if (m4) {
    const value = `${year}-${m4[1].padStart(2,"0")}-${m4[2].padStart(2,"0")}`;
    return isIsoDate(value) ? value : null;
  }
  return null;
}

export function detectDateAdjustment(text) {
  return /(\b(one|1|two|2)\s+day[s]?\s+(earlier|later|sooner|before|after)\b|\bcheck[\s-]?(?:in|out)\s+(?:one|1|two|2)\s+day[s]?\s+(?:earlier|later|sooner|before|after)\b|\bstay\s+(?:one|1|two|2)\s+(?:more|extra|fewer|less)\s+day[s]?\b|\barrive\s+(?:one|1|two|2)\s+day[s]?\s+(?:earlier|sooner|before)\b|\bleave\s+(?:one|1|two|2)\s+day[s]?\s+(?:later|after)\b)/i.test(String(text || ""));
}

export function detectVagueWeek(text) {
  return /\b(first|last|middle|mid|early|late)\s+(week|part)\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(String(text || ""));
}

export function parseDateAdjustment(text, currentDates) {
  if (!currentDates?.arrival || !currentDates?.departure) return null;
  const t = String(text || "").toLowerCase();
  const extractDays = clause => {
    const values = { ten:10, nine:9, eight:8, seven:7, six:6, five:5, four:4, three:3, two:2, one:1 };
    for (const [word, value] of Object.entries(values)) if (new RegExp(`\\b(?:${word}|${value})\\b`).test(clause)) return value;
    return 1;
  };
  let { arrival, departure } = currentDates;
  const clauses = t.split(/\band\b|,/);
  let checkinHandled = false;
  let checkoutHandled = false;
  for (const clause of clauses) {
    const isCheckout = /check[\s-]?out|leave|depart|departure/.test(clause);
    const isCheckin  = /check[\s-]?in|arrive|arrival/.test(clause);
    const isLater    = /later|after|more|extra/.test(clause);
    const isEarlier  = /earlier|sooner|before|fewer|less/.test(clause);
    if (!/one|two|three|four|five|six|seven|eight|nine|ten|\d/.test(clause)) continue;
    const days = extractDays(clause);
    if (isCheckout && !checkoutHandled) {
      departure = addIsoDays(departure, isLater ? days : -days);
      checkoutHandled = true;
    } else if (isCheckin && !checkinHandled) {
      arrival = addIsoDays(arrival, isEarlier ? -days : days);
      checkinHandled = true;
    }
  }
  if (!checkinHandled && !checkoutHandled) {
    const days = extractDays(t);
    // "Stay one more/extra day" changes checkout only. A generic "one day
    // later/earlier" shifts the whole stay, which preserves the original length.
    if (/\bstay\b/.test(t) && /more|extra|fewer|less/.test(t)) {
      departure = addIsoDays(departure, /more|extra/.test(t) ? days : -days);
    } else {
      const shift = /later|after|more|extra/.test(t) ? days : /earlier|sooner|before|fewer|less/.test(t) ? -days : 0;
      if (shift) {
        arrival = addIsoDays(arrival, shift);
        departure = addIsoDays(departure, shift);
      }
    }
  }
  return arrival && departure ? { arrival, departure } : null;
}

export function parseDateText({ dateText, arrival, departure, currentDates, now = new Date() }) {
  let dates = null;
  if (dateText) {
    if (detectDateAdjustment(dateText) && currentDates?.arrival && currentDates?.departure) {
      dates = parseDateAdjustment(dateText, currentDates);
    }
    dates ||= extractDates(dateText, now);
  }
  if (!dates && isIsoDate(arrival) && isIsoDate(departure)) dates = { arrival, departure };
  if (!dates && currentDates?.arrival && currentDates?.departure) dates = { ...currentDates };
  // In a booking tool, a month/day range without an explicit year refers to the
  // next occurrence when the current-year occurrence has already passed.
  if (dates && dateText && !/\b20\d{2}\b/.test(String(dateText)) && dates.arrival < todayIso(now)) {
    dates = {
      arrival: dates.arrival.replace(/^\d{4}/, String(Number(dates.arrival.slice(0, 4)) + 1)),
      departure: dates.departure.replace(/^\d{4}/, String(Number(dates.departure.slice(0, 4)) + 1)),
    };
  }
  return dates;
}

export function validateDateRange(dates, now = new Date()) {
  if (!dates || !isIsoDate(dates.arrival) || !isIsoDate(dates.departure)) {
    return { ok: false, code: "missing_or_invalid_dates", message: "A valid check-in and check-out date are required." };
  }
  const nights = diffNights(dates.arrival, dates.departure);
  if (!Number.isInteger(nights) || nights <= 0) {
    return { ok: false, code: "reversed_dates", message: "Check-out must be after check-in." };
  }
  if (dates.arrival < todayIso(now)) {
    return { ok: false, code: "past_dates", message: "The check-in date is in the past." };
  }
  return { ok: true, nights };
}

export function validateParty(adults, children, { allowTwoUnits = true } = {}) {
  const a = normalizeNullableInteger(adults, 1, MAX_TWO_UNIT_OCCUPANCY);
  const c = normalizeNullableInteger(children, 0, MAX_TWO_UNIT_OCCUPANCY);
  if (a === null || c === null) {
    return { ok: false, code: "missing_guest_count", adults: a, children: c, missing: [a === null ? "adults" : null, c === null ? "children" : null].filter(Boolean) };
  }
  const total = a + c;
  const max = allowTwoUnits ? MAX_TWO_UNIT_OCCUPANCY : MAX_OCCUPANCY;
  if (total > max) return { ok: false, code: "occupancy_exceeded", adults: a, children: c, total, max };
  const requiredAdults = c > 0 ? Math.ceil(c / 3) : 0;
  if (a < requiredAdults) return { ok: false, code: "hoa_violation", adults: a, children: c, total, requiredAdults };
  return { ok: true, adults: a, children: c, total, requiredAdults, needsTwoUnits: total > MAX_OCCUPANCY || (a === 1 && c === 5) };
}

export function findValidTwoUnitSplits(adults, children) {
  const party = validateParty(adults, children, { allowTwoUnits: true });
  if (!party.ok || party.total <= MAX_OCCUPANCY) return [];
  const splits = [];
  for (let a1 = 1; a1 <= party.adults - 1; a1++) {
    const a2 = party.adults - a1;
    for (let c1 = 0; c1 <= party.children; c1++) {
      const c2 = party.children - c1;
      const valid1 = a1 + c1 <= MAX_OCCUPANCY && (c1 === 0 || a1 >= Math.ceil(c1 / 3));
      const valid2 = a2 + c2 <= MAX_OCCUPANCY && (c2 === 0 || a2 >= Math.ceil(c2 / 3));
      if (valid1 && valid2) {
        splits.push({ a1, c1, a2, c2, balance: Math.abs((a1 + c1) - (a2 + c2)) });
      }
    }
  }
  return splits.sort((x, y) => x.balance - y.balance || Math.abs(x.c1 - x.c2) - Math.abs(y.c1 - y.c2));
}

export function extractOrigin(text) {
  const input = String(text || "");
  const lower = input.toLowerCase();
  const cityKeys = Object.keys(CITY_IATA_MAP).sort((a, b) => b.length - a.length);
  for (const city of cityKeys) {
    const safe = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${safe}\\b`, "i").test(lower)) return CITY_IATA_MAP[city];
  }
  const codes = input.match(/\b([A-Za-z]{3})\b/g) || [];
  for (const rawCode of codes) {
    const code = rawCode.toUpperCase();
    if (VALID_ORIGIN_IATA.has(code)) return code;
  }
  return null;
}

export function isValidOriginIata(value) {
  return typeof value === "string" && VALID_ORIGIN_IATA.has(value.toUpperCase());
}

export function buildFlightLink(origin, departure, returnDate, adults = 1, children = 0, infants = 0, destination = "VPS") {
  if (!isValidOriginIata(origin) || !isIsoDate(departure) || !isIsoDate(returnDate)) return null;
  const dest = ["VPS", "PNS", "ECP"].includes(String(destination).toUpperCase()) ? String(destination).toUpperCase() : "VPS";
  const a = normalizeNullableInteger(adults, 1, 12);
  const c = normalizeNullableInteger(children, 0, 12);
  const i = normalizeNullableInteger(infants, 0, 12);
  if (a === null || c === null || i === null) return null;
  const dep = new Date(`${departure}T12:00:00Z`);
  const ret = new Date(`${returnDate}T12:00:00Z`);
  const dd = String(dep.getUTCDate()).padStart(2, "0");
  const dm = String(dep.getUTCMonth() + 1).padStart(2, "0");
  const rd = String(ret.getUTCDate()).padStart(2, "0");
  const rm = String(ret.getUTCMonth() + 1).padStart(2, "0");
  const pax = a + c + i;
  const base = `${TRIPSHOCK_BASE.replace("tripshock.com", "aviasales.com")}/search/${origin.toUpperCase()}${dd}${dm}${dest}${rd}${rm}${pax}`;
  return `${base}?adults=${a}&children=${c}&infants=${i}&marker=709191`;
}

export function buildBookingLink(unit, arrival, departure, adults, children) {
  const config = UNITS[String(unit)];
  const a = normalizeNullableInteger(adults, 1, MAX_OCCUPANCY);
  const c = normalizeNullableInteger(children, 0, MAX_OCCUPANCY);
  if (!config || !isIsoDate(arrival) || !isIsoDate(departure) || a === null || c === null || a + c > MAX_OCCUPANCY) return null;
  const params = new URLSearchParams({
    or_arrival: arrival,
    or_departure: departure,
    or_adults: String(a),
    or_children: String(c),
    or_guests: String(a + c),
  });
  return `${config.bookingBase}?${params.toString()}`;
}

export function buildTripShockLink(category, dates) {
  const slug = TRIPSHOCK_CATEGORIES[String(category || "").toLowerCase()];
  if (!slug) return `${TRIPSHOCK_BASE}/?${TRIPSHOCK_AFF}`;
  let arrival = dates?.arrival;
  let departure = dates?.departure;
  if (arrival && !departure) departure = addIsoDays(arrival, 1);
  if (isIsoDate(arrival) && isIsoDate(departure)) {
    const fmt = iso => {
      const [y, m, d] = iso.split("-");
      return `${m}/${d}/${y}`;
    };
    return `${TRIPSHOCK_BASE}/destination/fl/destin/things-to-do/${slug}/?from=${fmt(arrival)}&to=${fmt(departure)}&${TRIPSHOCK_AFF}`;
  }
  return `${TRIPSHOCK_BASE}/destination/fl/destin/things-to-do/${slug}/?${TRIPSHOCK_AFF}`;
}

export function detectScamCrisis(text) {
  return /\bscam\b|\bscammer\b|\bfraud\b|\bfraudulent\b|rip.?off|\bphishing\b|\bfake site\b|\bfake website\b|reporting (you|this)/i.test(String(text || ""));
}

export function detectEscalation(text) {
  return /dying|passed away|funeral|death|asthma|medical|emergency|storm|hurricane|power outage|displaced|sick child|hospital|review|1.star|one star|sue|lawyer|legal|lawsuit|going to post|tell everyone|already checked in|friends just arrived|sleeping in car|floor|waiver|sign anything|please don't turn|breaking point|at my limit|\bscam\b|\bscammer\b|\bfraud\b|\bfraudulent\b|rip.?off|\bphishing\b|\bfake site\b|\bfake website\b|reporting (you|this)/i.test(String(text || ""));
}

export function detectLockedOut(text) {
  return /can't get in|cant get in|locked out|pin.*not work|pin.*wrong|wrong.*pin|code.*not work|code.*wrong|wrong.*code|won't open|wont open|door.*won't|door.*not open|can't enter|cant enter|stuck outside|standing outside|waiting outside|deleted.*email|lost.*code|forgot.*code.*can't|cant.*get.*in|can't find.*code|cant find.*code|can't find.*pin|cant find.*pin|can't find.*door|cant find.*door|where.*door code|where.*pin code|don't have.*code|dont have.*code|no.*door code|missing.*code|need.*door code|need.*pin|what.*door code|what.*pin/i.test(String(text || ""));
}

export function detectMaintenance(text) {
  return /broken|not working|isn't working|won't work|doesn't work|not cooling|not heating|no hot water|no water|no power|no electricity|power out|power outage|lights out|power went out|electricity out|lost power|loud.*heat|heat.*loud|noise.*heat|heating.*noise|loud.*AC|AC.*loud|loud.*unit|leaking|leak|flooded|flooding|clogged|backed up|toilet.*over|won't flush|wont flush|smell|smells|mold|\bbug\b|\bbugs\b|\broach\b|\bants\b|\bant\b(?!ic|ique|hem|i)|\bmouse\b|\bmice\b|AC.*off|AC.*broken|heat.*off|heat.*broken|TV.*broken|TV.*not|dishwasher|washing machine|dryer.*broken|microwave.*broken|fridge.*broken|freezer.*broken|oven.*broken|stove.*broken|Wi-?Fi.*down|wifi.*not|internet.*down|cable.*out|remote.*missing|remote.*broken|blind.*broken|door.*broken|lock.*broken|key.*stuck|window.*broken|light.*out|lights.*out|bulb.*out|outlet.*not|socket.*not|fan.*broken|fan.*not|noise.*unit|loud.*noise|banging|dripping|running water|water pressure|no pressure/i.test(String(text || ""));
}

export function detectAccidentalDamage(text) {
  return /broke.*(?:plate|glass|cup|dish|mug|bowl|mirror|vase|frame|window|lamp)|(?:plate|glass|cup|dish|mug|bowl|mirror|vase|frame|lamp).*broke|cracked.*(?:plate|glass|cup|dish|mirror)|(?:plate|glass|cup|dish|mirror).*cracked|accidentally.*broke|accidentally.*broken|broke.*by.*accident|dropped.*(?:plate|glass|cup|dish|mug|bowl)|(?:spilled|stained).*(?:carpet|couch|sofa|mattress|furniture)/i.test(String(text || ""));
}

export function detectExternalDisturbance(text) {
  return /jackhammer|jack hammer|jack-hammer|construction.*noise|remodel.*noise|renovation.*noise|noise.*construction|noise.*remodel|noise.*neighbor|neighbor.*noise|hammering|drilling|sawing|loud.*next door|next door.*loud|noise.*above|noise.*below|floor.*above|floor.*below|someone.*above|someone.*below|music.*beach|beach.*music|loud.*outside|outside.*noise|smell.*outside|outside.*smell|smoke.*hallway|hallway.*smoke|weed|marijuana|cigarette.*smell|smoke.*smell|garbage.*smell|smell.*garbage|trash.*smell|fireworks|loud.*party.*outside|outside.*party/i.test(String(text || ""));
}

export function detectBedroomMismatch(text) {
  return /\b2\s*(?:bed(?:room)?s?|bdr(?:m)?s?|br)\b|\btwo\s*bed(?:room)?s?\b|\b3\s*(?:bed(?:room)?s?|bdr(?:m)?s?|br)\b|\bthree\s*bed(?:room)?s?\b|\b4\s*(?:bed(?:room)?s?|bdr(?:m)?s?|br)\b|\bfour\s*bed(?:room)?s?\b/i.test(String(text || ""));
}

export function detectPets(text) {
  return /\d+\s*pets?|\bwith.*pets?\b|\bdogs?\b|\bcats?\b|\bpuppies\b|\bkittens?\b|\bbirds?\b|\bparrots?\b|\brabbits?\b|\bhamsters?\b|\bferrets?\b|\bfish\b|\bsnakes?\b|\bturtles?\b|\banimals?\b|bring.*(?:my|our|the)\s+\w+.*(?:pet|dog|cat|bird|animal)|pet.*friendly|emotional support animal|\besa\b|\bservice animal\b/i.test(String(text || ""));
}

export function detectExcessGuests(text) {
  return /7 (people|guests|of us)|8 (people|guests|of us)|9 (people|guests|of us)|ten people|seven people|eight people|won't count|doesn't count|don't count|sleeping in car|sleep on floor|won't use|won't need/i.test(String(text || ""));
}

export function detectOwnerChatRequest(text) {
  return /@ozan|talk (?:to|with) ozan|speak (?:to|with) ozan|chat with ozan|connect me.*ozan|owner.*chat|human.*chat|real person|talk (?:to|with) the owner|speak (?:to|with) the owner/i.test(String(text || ""));
}

export function detectResolutionMessage(text) {
  return /got it|i'm in|i am in|i'm inside|sorted|never mind|found it|found the code|figured it out|all good|thanks got|got in|in now|no worries|forget it/i.test(String(text || ""));
}

export function extractIssueDescription(text) {
  const t = String(text || "").trim();
  if (/^(do you|did you|have you|any word|any update|any news|ok let me|let me know|hanging|still waiting|heard back|when will|when is he|is he coming|will he|can you check|anything yet|any response|got it|thanks|ok|sure|alright|sounds good)/i.test(t)) return null;
  if (t.length < 8) return null;
  return t.replace(/[^\p{L}\p{N}\s,.'!?-]/gu, "").trim().substring(0, 90).trim();
}

export function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(value.trim());
}

export function extractEmail(text) {
  const match = String(text || "").match(/\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/);
  return match ? match[0] : null;
}

export function inferLegacyState(messages, now = new Date()) {
  let state = createDefaultState();
  const safeMessages = Array.isArray(messages) ? messages : [];
  const userText = safeMessages.filter(m => m?.role === "user").map(m => String(m.content || "")).join(" ");
  const assistantText = safeMessages.filter(m => m?.role === "assistant").map(m => String(m.content || "")).join(" ");
  const dates = extractDates(userText, now);
  if (dates) state.booking = { ...state.booking, ...dates, dateSource: "legacy_history" };

  // Migration only: recover explicit, conventional counts without assigning defaults.
  const adultMatches = [...userText.matchAll(/\b(\d+)\s*(?:adults?|grown[- ]?ups?|people|guests?)\b/gi)];
  const childMatches = [...userText.matchAll(/\b(\d+)\s*(?:kids?|children|child|infants?|babies|toddlers?|teens?)\b/gi)];
  const noKids = /\b(no|zero)\s+(?:kids?|children)|kid[- ]?free|without children/i.test(userText);
  if (adultMatches.length) state.booking.adults = Number(adultMatches.at(-1)[1]);
  if (childMatches.length) state.booking.children = Number(childMatches.at(-1)[1]);
  else if (noKids) state.booking.children = 0;

  const urls = extractUrls(assistantText);
  state.verified.bookingUrls = urls.filter(isBookingUrl);
  state.verified.flightUrls = urls.filter(url => /aviasales\.com\/search\//i.test(url));
  state.verified.activityUrls = urls.filter(url => /tripshock\.com/i.test(url));
  state.verified.blogUrls = urls.filter(url => /destincondogetaways\.com\/blog\//i.test(url));
  const origin = extractOrigin(userText);
  if (origin) state.flight.originIata = origin;
  return normalizeState(state);
}

export function extractUrls(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s<>"')\]]+/g) || [];
  return matches.map(url => url.replace(/[.,!?;:]+$/, ""));
}

export function isBookingUrl(url) {
  return /^https:\/\/(?:www\.)?destincondogetaways\.com\/pelican-beach-resort-unit-(?:707-orp5b47b5ax|1006-orp5b6450ex)\?/.test(String(url || ""));
}

export function collectAllowedUrls(toolResults, state, { includeStateVerified = false } = {}) {
  const allowed = new Set([
    STATIC_URLS.availability,
    STATIC_URLS.virtualTour,
    STATIC_URLS.reviews,
    STATIC_URLS.liveBeachCam,
    STATIC_URLS.weatherLive,
    STATIC_URLS.tripPlanner,
    UNITS["707"].bookingBase,
    UNITS["1006"].bookingBase,
  ]);
  for (const result of toolResults || []) {
    // Permission-based URL policy: only a tool's explicit `urls` field grants
    // permission. URLs embedded incidentally in prose/data are never trusted.
    for (const url of result?.urls || []) if (typeof url === "string") allowed.add(url);
  }
  if (includeStateVerified) {
    for (const key of ["bookingUrls", "activityUrls", "blogUrls", "flightUrls"]) {
      for (const url of state?.verified?.[key] || []) allowed.add(url);
    }
  }
  return allowed;
}

function normalizedCorpus(value) {
  return String(value || "").toLowerCase().replace(/[\s,–—-]+/g, " ").trim();
}

function normalizedSecurityText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    // Small security-focused confusable map for the protected BLUE promo token.
    .replace(/[ΒВᏴ]/g, "B")
    .replace(/[ᏞԼ]/g, "L")
    .replace(/[ՍՍ]/g, "U")
    .replace(/[ΕЕᎬ]/g, "E");
}

function parseEnglishNumberWords(raw) {
  const units = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19 };
  const tens = { twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
  let total = 0;
  let current = 0;
  let saw = false;
  for (const token of String(raw || "").toLowerCase().replace(/-/g, " ").split(/\s+/)) {
    if (token in units) { current += units[token]; saw = true; continue; }
    if (token in tens) { current += tens[token]; saw = true; continue; }
    if (token === "hundred" && current > 0) { current *= 100; saw = true; continue; }
    if (token === "thousand" && current > 0) { total += current * 1000; current = 0; saw = true; continue; }
    if (token === "and") continue;
    return null;
  }
  return saw ? total + current : null;
}

export function validateReply({ reply, allowedUrls, toolResults = [], state, latestUser = "", requireCurrentTurnUrls = true }) {
  const text = String(reply || "").trim();
  const securityText = normalizedSecurityText(text);
  const violations = [];
  if (!text) violations.push({ code: "empty_reply", detail: "The reply is empty." });
  if (/\{url\w*\}|\[(?:link|activity|booking url|flight url)[^\]]*\]/i.test(text)) {
    violations.push({ code: "placeholder", detail: "Placeholder token present." });
  }
  if (/\[[^\]]+\]\(https?:\/\/[^)]+\)/i.test(text)) {
    violations.push({ code: "markdown_link_not_permitted", detail: "Return approved URLs as plain text so the frontend handles them consistently." });
  }
  if (/<a\b[^>]*\bhref\s*=/i.test(text)) {
    violations.push({ code: "html_link_not_permitted", detail: "HTML links are not permitted in guest replies." });
  }

  const urls = extractUrls(text);
  for (const url of urls) {
    if (!allowedUrls.has(url)) violations.push({ code: "unapproved_url", detail: url });
  }

  // Catch bare or spoofed domains that may be auto-linked by clients even when
  // the model omitted a scheme. Email domains are excluded deliberately.
  const domainPattern = /\b(?:www\.)?[a-z0-9](?:[a-z0-9-]{0,62}\.)+[a-z]{2,63}(?:\/[^\s<>"']*)?/gi;
  for (const match of text.matchAll(domainPattern)) {
    const index = match.index || 0;
    if (index > 0 && text[index - 1] === "@") continue;
    const raw = match[0].replace(/[.,!?;:]+$/, "");
    const prefix = text.slice(Math.max(0, index - 8), index).toLowerCase();
    if (/https?:\/\/$/.test(prefix)) continue;
    violations.push({ code: "bare_domain_not_permitted", detail: raw });
  }

  const currentBookingUrls = new Set(toolResults.flatMap(r => r?.kind === "booking" ? (r.urls || []) : []));
  const currentFlightUrls = new Set(toolResults.flatMap(r => r?.kind === "flight" ? (r.urls || []) : []));
  const claimsBookingLink = /here (?:are|is) (?:your|the) (?:booking )?links?|booking links?:|direct booking link|links? below|send (?:you )?the links?/i.test(text);
  const claimsFlightLink = /flight(?: search)? link|search flights|pre-?filled flight/i.test(text);
  if (claimsBookingLink && requireCurrentTurnUrls && currentBookingUrls.size === 0 && !urls.some(isBookingUrl)) {
    violations.push({ code: "booking_link_claim_without_permission", detail: "Reply claims a booking link but none was produced this turn." });
  }
  if (claimsFlightLink && requireCurrentTurnUrls && currentFlightUrls.size === 0 && !urls.some(url => /aviasales\.com\/search\//i.test(url))) {
    violations.push({ code: "flight_link_claim_without_permission", detail: "Reply claims a flight link but none was produced this turn." });
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

  const alertClaim = /(?:ozan|the owner|the host|owner|host)(?:(?:['’]s| is| has| was)(?: been)?| has already been| was just)\s+(?:notified|alerted|informed|contacted|told|made aware|aware)|(?:i|we)(?:['’]ve| have)?\s+(?:notified|alerted|informed|contacted|messaged|pinged|reached out to|reached|passed (?:this|it) along to|let)\s+(?:ozan|the owner|the host|owner|host)(?: know)?|(?:i|we)(?:['’]ve| have)?\s+(?:forwarded|sent)\s+(?:this|your message|your note|the note)\s+to\s+(?:ozan|the owner|the host|owner|host)|(?:i|we)(?:['’]ve| have)?\s+sent\s+(?:ozan|the owner|the host|owner|host)\s+(?:this|your message|your note|the note)|(?:ozan|the owner|the host|owner|host)\s+knows about it(?: now)?|(?:ozan|the owner|the host|owner|host)\s+(?:has|got|received)\s+(?:your message|your note|this)|(?:your message|your note)\s+is with ozan/i.test(text);
  const alertConfirmed = Boolean(state?.flags?.alertSent) || (toolResults || []).some(result =>
    ["alert", "relay", "owner_chat"].includes(result?.kind) && (result?.data?.sent === true || result?.ok === true && ["sent", "invited", "already_invited", "already_sent"].includes(result?.status))
  );
  if (alertClaim && !alertConfirmed) {
    violations.push({ code: "unverified_alert_claim", detail: "The reply says Ozan was notified, but no successful delivery is recorded." });
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
