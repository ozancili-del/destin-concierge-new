// Destiny Blue v2 â€” deterministic business rules, state, parsing, URL builders,
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
  "labor day":         { arrival: "2026-09-04", departure: "2026-09-07", label: "Labor Day weekend (Sept 4â€“7, 2026)" },
  "labour day":        { arrival: "2026-09-04", departure: "2026-09-07", label: "Labor Day weekend (Sept 4â€“7, 2026)" },
  "memorial day":      { arrival: "2026-05-22", departure: "2026-05-25", label: "Memorial Day weekend (May 22â€“25, 2026)" },
  "fourth of july":    { arrival: "2026-07-03", departure: "2026-07-06", label: "4th of July weekend (July 3â€“6, 2026)" },
  "4th of july":       { arrival: "2026-07-03", departure: "2026-07-06", label: "4th of July weekend (July 3â€“6, 2026)" },
  "july 4th":          { arrival: "2026-07-03", departure: "2026-07-06", label: "4th of July weekend (July 3â€“6, 2026)" },
  "july fourth":       { arrival: "2026-07-03", departure: "2026-07-06", label: "4th of July weekend (July 3â€“6, 2026)" },
  "independence day":  { arrival: "2026-07-03", departure: "2026-07-06", label: "4th of July weekend (July 3â€“6, 2026)" },
  "thanksgiving":      { arrival: "2026-11-25", departure: "2026-11-29", label: "Thanksgiving weekend (Nov 25â€“29, 2026)" },
  "christmas":         { arrival: "2026-12-24", departure: "2026-12-27", label: "Christmas (Dec 24â€“27, 2026)" },
  "new year":          { arrival: "2026-12-31", departure: "2027-01-02", label: "New Year's (Dec 31â€“Jan 2, 2027)" },
  "new years":         { arrival: "2026-12-31", departure: "2027-01-02", label: "New Year's (Dec 31â€“Jan 2, 2027)" },
  "new year's":        { arrival: "2026-12-31", departure: "2027-01-02", label: "New Year's (Dec 31â€“Jan 2, 2027)" },
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
  const nextBooking = { ...current.booking, ...(src.booking || {}) };
  const bookingChanged = ["arrival", "departure", "adults", "children", "totalGuests", "preferredUnit"]
    .some(key => nextBooking[key] !== current.booking[key]);
  const nextFlight = { ...current.flight, ...(src.flight || {}) };
  const flightChanged = ["origin", "destination", "departureDate", "returnDate", "adults", "children", "infants"]
    .some(key => nextFlight[key] !== current.flight[key]);
  const retainedVerified = bookingChanged
    ? {
        ...current.verified,
        bookingUrls: [],
        activityUrls: [],
        flightUrls: [],
        activityQuery: null,
        flightQuery: null,
        availabilityCheckedAt: null,
        availabilityQuery: null,
        availabilityUnits: {},
      }
    : flightChanged
      ? { ...current.verified, flightUrls: [], flightQuery: null }
      : current.verified;
  return normalizeState({
    ...current,
    ...src,
    booking: nextBooking,
    flight: nextFlight,
    verified: {
      ...retainedVerified,
      ...(src.verified || {}),
      availabilityUnits: {
        ...retainedVerified.availabilityUnits,
        ...(src.verified?.availabilityUnits || {}),
      },
    },
    lead: { ...current.lead, ...(src.lead || {}) },
    existingGuest: { ...current.existingGuest, ...(src.existingGuest || {}) },
    ownerChat: { ...current.ownerChat, ...(src.ownerChat || {}) },
    flags: { ...current.flags, ...(src×}6öÚ$z{-®éÜj×6‚‡²6öFS¢'VçfW&–f–VEö&÷F…öf–Æ&ÆR"ÂFWF–Ã¢%F†R6Æ–ÒF†B&÷F‚Væ—G2&Rf–Æ&ÆR—2æ÷B7W÷'FVBâ"Ò“°¢Ð¢6öç7B&÷F„&öö¶VD6Æ–ÒÒö&÷F‚ƒó¦öb“òƒó¦÷W"“òƒó§Væ—G7Æ6öæF÷2’ƒó¦&WÆÆöö·Ç&VÖ–â’ƒó¦&öö¶VGÇVæf–Æ&ÆWÆæ÷Bf–Æ&ÆWÇF¶VçÆö67W–VGÇ6öÆB÷WB’ö’çFW7B‡FW‡B“°¢–b†&÷F„&öö¶VD6Æ–Òbb†f–Æ&–Æ—G“òæFFòçVæ—G3òæWfW'“òâ‡RÓâRæf–Æ&ÆRÓÓÒfÇ6R’’’°¢f–öÆF–öç2çW6‚‡²6öFS¢'VçfW&–f–VEö&÷F…÷Væf–Æ&ÆR"ÂFWF–Ã¢%F†R6Æ–ÒF†B&÷F‚Væ—G2&RVæf–Æ&ÆR—2æ÷B7W÷'FVBâ"Ò“°¢Ð ¢6öç7BfW&–f–VE&rÒ¥4ôâç7G&–æv–g’‡²FööÅ&W7VÇG2Â7FFTf7G3¢7FFSòçfW&–f–VCòæf7G2ÇÂµÒÂ&öö¶–æs¢7FFSòæ&öö¶–ærÂW6W#¢ÆFW7EW6W"Ò“°¢6öç7BfW&–f–VD6÷'W2Òæ÷&ÖÆ—¦VD6÷'W2‡fW&–f–VE&r“° ¢òòW†7BÖöæWF'’F÷FÇ2×W7B&Rw&÷VæFVB–â7W'&VçBFööÂFF÷"wVW7BFW‡Bà¢òòF†R&öö¶–ærvRÖ’6†÷rF÷FÇ2Â'WBF†RÖöFVÂÖ’æ÷BÖçVf7GW&RöæRà¢6öç7BÖöæW”6Æ–×2ÒFW‡BæÖF6‚‚òƒó¥ÂEÇ3õÆEµÆBÅÒ¢ƒó¥ÂåÆG³Ã'Ò“÷ÅÆ%U4EÇ3õÆEµÆBÅÒ¢ƒó¥ÂåÆG³Ã'Ò“ò’öv’’ÇÂµÓ°¢f÷"†6öç7B6Æ–ÒöbÖöæW”6Æ–×2’°¢6öç7B6ö×7BÒ6Æ–Òç&WÆ6R‚õÇ2²örÂ""’çFôÆ÷vW$66R‚“°¢6öç7B7W÷'FVBÒfW&–f–VE&rç&WÆ6R‚õÇ2²örÂ""’çFôÆ÷vW$66R‚’æ–æ6ÇVFW2†6ö×7B“°¢–b‚7W÷'FVB’f–öÆF–öç2çW6‚‡²6öFS¢'VçfW&–f–VE÷&–6R"ÂFWF–Ã¢6Æ–ÒÒ“°¢Ð¢6öç7Bv÷&DÖöæW•GFW&âÒõÆ"‚ƒó¢ƒó§¦W&÷ÆöæWÇGv÷ÇF‡&VWÆf÷W'Æf—fWÇ6—‡Ç6WfVçÆV–v‡GÆæ–æWÇFVçÆVÆWfVçÇGvVÇfWÇF†—'FVVçÆf÷W'FVVçÆf–gFVVçÇ6—‡FVVçÇ6WfVçFVVçÆV–v‡FVVçÆæ–æWFVVçÇGvVçG—ÇF†—'G—Æf÷'G—Æf–gG—Ç6—‡G—Ç6WfVçG—ÆV–v‡G—Ææ–æWG—Æ‡VæG&VGÇF†÷W6æGÆæB•²ÕÓò’²•Ç2²ƒó¦FöÆÆ'3÷Æ'V6·3ò•Æ"öv“°¢f÷"†6öç7BÖF6‚öbFW‡BæÖF6„ÆÂ‡v÷&DÖöæW•GFW&â’’°¢6öç7BfÇVRÒ'6TVævÆ—6„çVÖ&W%v÷&G2†ÖF6…³Ò“°¢–b‡fÇVRÓÒçVÆÂ’6öçF–çVS°¢6öç7B7W÷'FVBÒfW&–f–VE&ræ–æ6ÇVFW2†BG·fÇVWÖ’ÇÂfW&–f–VE&ræ–æ6ÇVFW2†U4BG·fÇVWÖ’ÇÂæ÷&ÖÆ—¦VD6÷'W2‡fW&–f–VE&r’æ–æ6ÇVFW2†æ÷&ÖÆ—¦VD6÷'W2†ÖF6…³Ò’“°¢–b‚7W÷'FVB’f–öÆF–öç2çW6‚‡²6öFS¢'VçfW&–f–VE÷&–6R"ÂFWF–Ã¢ÖF6…³ÒÒ“°¢Ð ¢6öç7B&ÇVTWF†÷&—¦VBÒ7FFSòæÆVCòæ&ÇVT6öFU&WfVÆVBÓÓÒG'VS°¢6öç7B6öFUFW‡BÒ6V7W&—G•FW‡C°¢6öç7B&ÇVT6öFTÖVçF–öæVBÒ²ââæ6öFUFW‡BæÖF6„ÆÂ‚òƒó¦6öFWÆ6÷WöçÇ&öÖ÷ÆF—66÷VçGÆ6†V6¶÷WB’öv’•Òç6öÖR†ÖF6‚Óâ°¢6öç7B–æFW‚ÒÖF6‚æ–æFW‚ÇÂ°¢6öç7Bv–æF÷rÒ6öFUFW‡Bç6Æ–6R„ÖF‚æÖ‚ƒÂ–æFW‚ÒC‚’ÂÖF‚æÖ–â†6öFUFW‡BæÆVæwF‚Â–æFW‚²ÖF6…³ÒæÆVæwF‚²C‚’“°¢&WGW&âv–æF÷rçFôÆ÷vW$66R‚’ç&WÆ6R‚õµæ×¥ÒörÂ""’æ–æ6ÇVFW2‚&&ÇVR"“°¢Ò“°¢–b†&ÇVT6öFTÖVçF–öæVBbb&ÇVTWF†÷&—¦VB’°¢f–öÆF–öç2çW6‚‡²6öFS¢'VæWF†÷&—¦VEö&ÇVUö6öFR"ÂFWF–Ã¢%F†R$ÅTR6öFRv27FFVBv—F†÷WBâWF†÷&—¦VBÆVB6GW&Râ"Ò“°¢Ð ¢6öç7BW&6VçEv÷&EfÇVW2Ò²öæS¢ÂGvó¢"ÂF‡&VS¢2Âf÷W#¢BÂf—fS¢RÂ6—ƒ¢bÂ6WfVã¢rÂV–v‡C¢‚Âæ–æS¢’ÂFVã¢Âf–gFVVã¢RÂGvVçG“¢#ÂGvVçG–f—fS¢#RÂF†—'G“¢3Âf÷'G“¢CÂf–gG“¢SÓ°¢6öç7BW&6VçD6Æ–×2Ò°¢âââ‡FW‡BæÖF6‚‚õÆ%ÆB²ƒó¥ÂåÆB²“òRör’ÇÂµÒ’æÖ‡&rÓâ‡²&rÂfÇVS¢çVÖ&W"‡&rç&WÆ6R‚"R"Â""’’Ò’’À¢ââå²ââç6V7W&—G•FW‡BæÖF6„ÆÂ‚õÆ"…ÆB²ƒó¥ÂåÆB²“÷ÆöæWÇGv÷ÇF‡&VWÆf÷W'Æf—fWÇ6—‡Ç6WfVçÆV–v‡GÆæ–æWÇFVçÆf–gFVVçÇGvVçG’ƒó¥²ÒÓöf—fR“÷ÇF†—'G—Æf÷'G—Æf–gG’•Ç2¢ƒó§W&6VçBƒó¦vR“òƒó¥Ç2·ö–çG3ò“õÆ'Ç7EÆ'ÂR’ƒòÇr’öv’•ÒæÖ†ÖF6‚Óâ°¢6öç7B¶W’ÒÖF6…³ÒçFôÆ÷vW$66R‚’ç&WÆ6R‚õ²ÒÒörÂ""“°¢&WGW&â²&s¢ÖF6…³ÒÂfÇVS¢çVÖ&W"æ—4f–æ—FR„çVÖ&W"†¶W’’’òçVÖ&W"†¶W’’¢W&6VçEv÷&EfÇVW5¶¶W•ÒÓ°¢Ò’À¢Ó°¢f÷"†6öç7B6Æ–ÒöbW&6VçD6Æ–×2’°¢6öç7B6æöæ–6ÂÒG¶6Æ–ÒçfÇVWÒV°¢6öç7B–åfW&–f–VDFFÒfW&–f–VE&ræ–æ6ÇVFW2†6Æ–Òç&r’ÇÂfW&–f–VE&ræ–æ6ÇVFW2†6æöæ–6Â“°¢6öç7B—57FF–4F—&V7DF—66÷VçBÒ6Æ–ÒçfÇVRÓÓÒ°¢6öç7B—4WF†÷&—¦VD&ÇVRÒ6Æ–ÒçfÇVRÓÓÒRbb&ÇVTWF†÷&—¦VC°¢–b‚–åfW&–f–VDFFbb—57FF–4F—&V7DF—66÷VçBbb—4WF†÷&—¦VD&ÇVR’°¢f–öÆF–öç2çW6‚‡²6öFS¢'VçfW&–f–VE÷W&6VçFvR"ÂFWF–Ã¢6Æ–Òç&rÒ“°¢Ð¢Ð ¢6öç7BFFU‡&6W2Ò°¢âââ‡FW‡BæÖF6‚‚õÆ"ƒó¦¦âƒó§V'’“÷ÆfV"ƒó§'V'’“÷ÆÖ"ƒó¦6‚“÷Æ"ƒó¦–Â“÷ÆÖ—Æ§Vâƒó¦R“÷Æ§VÂƒó§’“÷ÆVrƒó§W7B“÷Ç6Wƒó§Bƒó¦VÖ&W"“ò“÷Æö7Bƒó¦ö&W"“÷Ææ÷bƒó¦VÖ&W"“÷ÆFV2ƒó¦VÖ&W"“ò•Ç2µÆG³Ã'Òƒó§7GÆæGÇ&GÇF‚“òƒòÆB’ƒó¥Ç2¥²Þ(	5ÕÇ2¥ÆG³Ã'Òƒó§7GÆæGÇ&GÇF‚“òƒòÆB’“òƒó¢ÃõÇ2£#ÆG³'Ò“òöv’’ÇÂµÒ’À¢âââ‡FW‡BæÖF6‚‚õÆ%ÆG³Ã'Òƒó§7GÆæGÇ&GÇF‚“õÇ2²ƒó¦öeÇ2²“òƒó¦¦âƒó§V'’“÷ÆfV"ƒó§'V'’“÷ÆÖ"ƒó¦6‚“÷Æ"ƒó¦–Â“÷ÆÖ—Æ§Vâƒó¦R“÷Æ§VÂƒó§’“÷ÆVrƒó§W7B“÷Ç6Wƒó§Bƒó¦VÖ&W"“ò“÷Æö7Bƒó¦ö&W"“÷Ææ÷bƒó¦VÖ&W"“÷ÆFV2ƒó¦VÖ&W"“ò’ƒó¢ÃõÇ2£#ÆG³'Ò“òöv’’ÇÂµÒ’À¢Ó°¢6öç7BfW&–f–VD—6ôFFW2Ò²ââææWr6WB‡fW&–f–VE&ræÖF6‚‚õÆ##ÆG³'ÒÕÆG³'ÒÕÆG³'ÕÆ"ör’ÇÂµÒ•Ó°¢6öç7BÖöçF„çVÖ&W"Ò°¢¦ã¢#"Â¦çV'“¢#"ÂfV#¢#""ÂfV''V'“¢#""ÂÖ#¢#2"ÂÖ&6ƒ¢#2"À¢#¢#B"Â&–Ã¢#B"ÂÖ“¢#R"Â§Vã¢#b"Â§VæS¢#b"Â§VÃ¢#r"Â§VÇ“¢#r"À¢Vs¢#‚"ÂVwW7C¢#‚"Â6W¢#’"Â6WC¢#’"Â6WFVÖ&W#¢#’"Âö7C¢#"Âö7Fö&W#¢#"À¢æ÷c¢#"Âæ÷fVÖ&W#¢#"ÂFV3¢#""ÂFV6VÖ&W#¢#""À¢Ó°¢f÷"†6öç7B‡&6RöbFFU‡&6W2’°¢6öç7Bæ÷&ÖÆ—¦VBÒæ÷&ÖÆ—¦VD6÷'W2‡‡&6R’ç&WÆ6R‚òƒó§7GÆæGÇ&GÇF‚•Æ"örÂ""“°¢6öç7Bv÷&G2Òæ÷&ÖÆ—¦VBç7Æ—B‚""’æf–ÇFW"„&ööÆVâ“°¢ÆWB7W÷'FVBÒv÷&G2æWfW'’‡v÷&BÓâfW&–f–VD6÷'W2æ–æ6ÇVFW2‡v÷&B’“° ¢òòæGW&ÂÖÆæwVvRFFW2&öGV6VBg&öÒfW&–f–VB•4òFööÂFF&RÆÆ÷vVBà¢òòW†×ÆS¢FööÂ&WGW&ç2##bÓ‚Óbó##bÓ‚ÓæBF†RvVçB6—0¢òò$VwW7Bn(	3"âF†RöÆBv÷&BÖ6÷'W26†V6²&V¦V7FVBF†—2&V6W6RF†RFööÀ¢òòFFF–Bæ÷BÆ—FW&ÆÇ’6öçF–âF†Rv÷&B$VwW7B"à¢–b‚7W÷'FVB’°¢6öç7BÒÒ‡&6RçFôÆ÷vW$66R‚’æÖF6‚‚õâ†¦âƒó§V'’“÷ÆfV"ƒó§'V'’“÷ÆÖ"ƒó¦6‚“÷Æ"ƒó¦–Â“÷ÆÖ—Æ§Vâƒó¦R“÷Æ§VÂƒó§’“÷ÆVrƒó§W7B“÷Ç6Wƒó§Bƒó¦VÖ&W"“ò“÷Æö7Bƒó¦ö&W"“÷Ææ÷bƒó¦VÖ&W"“÷ÆFV2ƒó¦VÖ&W"“ò•Ç2²…ÆG³Ã'Ò’ƒó§7GÆæGÇ&GÇF‚“òƒó¥Ç2¥²Þ(	5ÕÇ2¢…ÆG³Ã'Ò’ƒó§7GÆæGÇ&GÇF‚“ò“òƒó¢ÃõÇ2¢ƒ#ÆG³'Ò’“òBö’“°¢–b†Ò’°¢6öç7BÖÒÒÖöçF„çVÖ&W%¶Õ³ÒçFôÆ÷vW$66R‚•Ó°¢6öç7BF—2Ò¶Õ³%ÒÂÕ³5ÕÒæf–ÇFW"„&ööÆVâ’æÖ†F’Óâ7G&–ær„çVÖ&W"†F’’’çE7F'Bƒ"Â#"’“°¢6öç7BW‡Æ–6—E–V"ÒÕ³EÒÇÂçVÆÃ°¢7W÷'FVBÒF—2æWfW'’†F’ÓâfW&–f–VD—6ôFFW2ç6öÖR†—6òÓâ°¢–b†W‡Æ–6—E–V"bb—6òç7F'G5v—F‚†G¶W‡Æ–6—E–V'ÒÖ’’&WGW&âfÇ6S°¢&WGW&â—6òæVæG5v—F‚†ÒG¶Ö×ÒÒG¶F—Ö“°¢Ò’“°¢ÒVÇ6R°¢6öç7BF×’Ò‡&6RçFôÆ÷vW$66R‚’æÖF6‚‚õâ…ÆG³Ã'Ò’ƒó§7GÆæGÇ&GÇF‚“õÇ2²ƒó¦öeÇ2²“ò†¦âƒó§V'’“÷ÆfV"ƒó§'V'’“÷ÆÖ"ƒó¦6‚“÷Æ"ƒó¦–Â“÷ÆÖ—Æ§Vâƒó¦R“÷Æ§VÂƒó§’“÷ÆVrƒó§W7B“÷Ç6Wƒó§Bƒó¦VÖ&W"“ò“÷Æö7Bƒó¦ö&W"“÷Ææ÷bƒó¦VÖ&W"“÷ÆFV2ƒó¦VÖ&W"“ò’ƒó¢ÃõÇ2¢ƒ#ÆG³'Ò’“òBö’“°¢–b†F×’’°¢6öç7BÖÒÒÖöçF„çVÖ&W%¶F×•³%ÒçFôÆ÷vW$66R‚•Ó°¢6öç7BF’Ò7G&–ær„çVÖ&W"†F×•³Ò’’çE7F'Bƒ"Â#"“°¢6öç7BW‡Æ–6—E–V"ÒF×•³5ÒÇÂçVÆÃ°¢7W÷'FVBÒfW&–f–VD—6ôFFW2ç6öÖR†—6òÓâ‚W‡Æ–6—E–V"ÇÂ—6òç7F'G5v—F‚†G¶W‡Æ–6—E–V'ÒÖ’’bb—6òæVæG5v—F‚†ÒG¶Ö×ÒÒG¶F—Ö’“°¢Ð¢Ð¢Ð¢–b‚7W÷'FVB’f–öÆF–öç2çW6‚‡²6öFS¢'VçfW&–f–VE÷7V6–f–5öFFR"ÂFWF–Ã¢‡&6RÒ“°¢Ð ¢–b‡7FFSòæfÆw3òç66Ô7&—6—2’°¢–b‚ÿ	ùˆ§Ï	øè—Ï	øÈ§Ï	ù˜ÇÏ	ùˆ—Æw&VBæWw7ÇW&fV7Bö’çFW7B‡FW‡B’’f–öÆF–öç2çW6‚‡²6öFS¢'66Õ÷FöæR"ÂFWF–Ã¢%G'W7BÖ7&—6—2&W7öç6R6öçF–ç26†VW&gVÂ6ÆW2ÆæwVvRâ"Ò“°¢–b‚FW‡Bæ–æ6ÇVFW2„õtäU%ô4ôåD5Bç†öæR’ÇÂFW‡Bæ–æ6ÇVFW2„õtäU%ô4ôåD5BæVÖ–Â’’f–öÆF–öç2çW6‚‡²6öFS¢'66Õö6öçF7EöÖ—76–ær"ÂFWF–Ã¢%G'W7BÖ7&—6—2&W7öç6R—2Ö—76–ær÷væW"6öçF7BFWF–Ç2â"Ò“°¢–b‚ö†÷rÖç—Æ6†V6²ãö–çÆ6†V6²ãö÷WGÆFFW7ÆGVÇG7Æ6†–ÆG&Vâö’çFW7B‡FW‡B’’f–öÆF–öç2çW6‚‡²6öFS¢'66Õö&öö¶–æu÷VW7F–öâ"ÂFWF–Ã¢%G'W7BÖ7&—6—2&W7öç6R6·2f÷"&öö¶–ærFWF–Ç2â"Ò“°¢Ð ¢–b‡7FFSòæfÆw3òæ&VG&ööÔÖ—6ÖF6‚bb7FFSòæ&öö¶–æsòæ&VG&öö×5&WVW7FVBãÒ"bbö&÷F‚ƒó¦öb“ö÷W"Væ—G2&RÖ&VG&öö×Æ&÷F‚Væ—G2&RÖ&VG&öö×ÆöæRÖ&VG&ööÒö’çFW7B‡FW‡B’’°¢f–öÆF–öç2çW6‚‡²6öFS¢&&VG&ööÕöF—66Æ÷7W&UöÖ—76–ær"ÂFWF–Ã¢$×VÇF’Ö&VG&ööÒ&WVW7Bv2æ÷B6ÆV&Ç’6÷'&V7FVBâ"Ò“°¢Ð ¢6öç7BÆW'D6Æ–ÒÒòƒó¦÷¦çÇF†R÷væW'ÇF†R†÷7GÆ÷væW'Æ†÷7B’ƒó¢ƒó¥²~(	•×7Â—7Â†7Âv2’ƒó¢&VVâ“÷Â†2Ç&VG’&VVçÂv2§W7B•Ç2²ƒó¦æ÷F–f–VGÆÆW'FVGÆ–æf÷&ÖVGÆ6öçF7FVGÇFöÆGÆÖFRv&WÆv&R—Âƒó¦—ÇvR’ƒó¥²~(	•×fWÂ†fR“õÇ2²ƒó¦æ÷F–f–VGÆÆW'FVGÆ–æf÷&ÖVGÆ6öçF7FVGÆÖW76vVGÇ–ævVGÇ&V6†VB÷WBF÷Ç&V6†VGÇ76VBƒó§F†—7Æ—B’ÆöærF÷ÆÆWB•Ç2²ƒó¦÷¦çÇF†R÷væW'ÇF†R†÷7GÆ÷væW'Æ†÷7B’ƒó¢¶æ÷r“÷Âƒó¦—ÇvR’ƒó¥²~(	•×fWÂ†fR“õÇ2²ƒó¦f÷'v&FVGÇ6VçB•Ç2²ƒó§F†—7Ç–÷W"ÖW76vWÇ–÷W"æ÷FWÇF†Ræ÷FR•Ç2·FõÇ2²ƒó¦÷¦çÇF†R÷væW'ÇF†R†÷7GÆ÷væW'Æ†÷7B—Âƒó¦—ÇvR’ƒó¥²~(	•×fWÂ†fR“õÇ2·6VçEÇ2²ƒó¦÷¦çÇF†R÷væW'ÇF†R†÷7GÆ÷væW'Æ†÷7B•Ç2²ƒó§F†—7Ç–÷W"ÖW76vWÇ–÷W"æ÷FWÇF†Ræ÷FR—Âƒó¦÷¦çÇF†R÷væW'ÇF†R†÷7GÆ÷væW'Æ†÷7B•Ç2¶¶æ÷w2&÷WB—Bƒó¢æ÷r“÷Âƒó¦÷¦çÇF†R÷væW'ÇF†R†÷7GÆ÷væW'Æ†÷7B•Ç2²ƒó¦†7Æv÷GÇ&V6V—fVB•Ç2²ƒó§–÷W"ÖW76vWÇ–÷W"æ÷FWÇF†—2—Âƒó§–÷W"ÖW76vWÇ–÷W"æ÷FR•Ç2¶—2v—F‚÷¦çÂƒó¦—ÇvR’ƒó¥²~(	•×fWÂ†fR“õÇ2²ƒó§6VçGÆFVÆ—fW&VB•Ç2²ƒó§F†WÆçÇ–÷W"“õÇ2¢ƒó§W&vVçEÇ2²“öÆW'Bƒó¢7V66W76gVÆÇ’“òö’çFW7B‡FW‡B“°¢6öç7BÆW'D6öæf—&ÖVBÒ&ööÆVâ‡7FFSòæfÆw3òæÆW'E6VçB’ÇÂ‡FööÅ&W7VÇG2ÇÂµÒ’ç6öÖR‡&W7VÇBÓà¢²&ÆW'B"Â'&VÆ’"Â&÷væW%ö6†B%Òæ–æ6ÇVFW2‡&W7VÇCòæ¶–æB’bb‡&W7VÇCòæFFòç6VçBÓÓÒG'VRÇÂ&W7VÇCòæö²ÓÓÒG'VRbb²'6VçB"Â&–çf—FVB"Â&Ç&VG•ö–çf—FVB"Â&Ç&VG•÷6VçB%Òæ–æ6ÇVFW2‡&W7VÇCòç7FGW2’¢“°¢–b†ÆW'D6Æ–ÒbbÆW'D6öæf—&ÖVB’°¢f–öÆF–öç2çW6‚‡²6öFS¢'VçfW&–f–VEöÆW'Eö6Æ–Ò"ÂFWF–Ã¢%F†R&WÇ’6—2÷¦âv2æ÷F–f–VBÂ'WBæò7V66W76gVÂFVÆ—fW'’—2&V6÷&FVBâ"Ò“°¢Ð ¢6öç7B6GW&T6Æ–ÒÒòƒó§–÷W%Ç2²“öVÖ–ÅÇ2²ƒó¦†2&VVçÇv7Æ—2•Ç2²ƒó¦6GW&VGÇ6fVGÆFFVGÇ&Vv—7FW&VB—Âƒó¦—ÇvR’ƒó¥²~(	•×fWÂ†fR“õÇ2²ƒó¦6GW&VGÇ6fVGÆFFVGÇ&Vv—7FW&VB•Ç2²ƒó§–÷W%Ç2²“öVÖ–Âö’çFW7B‡FW‡B“°¢6öç7B6GW&T6öæf—&ÖVBÒ7FFSòæÆVCòæ6GW&VDBÇÂ‡FööÅ&W7VÇG2ÇÂµÒ’ç6öÖR‡&W7VÇBÓà¢&W7VÇCòæ¶–æBÓÓÒ&ÆVB"bb&W7VÇCòæö²ÓÓÒG'VRbb&W7VÇCòç7FGW2ÓÓÒ&6GW&VB ¢“°¢–b†6GW&T6Æ–Òbb6GW&T6öæf—&ÖVB’°¢f–öÆF–öç2çW6‚‡²6öFS¢'VçfW&–f–VEöÆVEö6GW&R"ÂFWF–Ã¢%F†R&WÇ’6—2âVÖ–Âv26GW&VBÂ'WBæò7V66W76gVÂ6GW&R—2&V6÷&FVBâ"Ò“°¢Ð ¢6öç7B6öæ6W76–öä6Æ–ÒÒòƒó¢ƒó¦÷¦çÇF†R÷væW'ÇF†R†÷7GÆ÷væW'Æ†÷7GÆÖ–çFVææ6WÇF†RFV×ÇvWÆ’•Ç2²ƒó¦Ö—ÆÖ–v‡GÆ6÷VÆGÆ6çÇv–ÆÇÇv÷VÆGÇ6†÷VÆGÆ—2Æ–¶VÇ’F÷Æ6â&ö&&Ç’•Ç2²ƒó¦&R&ÆRFõÇ2²“òƒó¦öffW'Æv—fWÇ&÷f–FWÆ'&ævWÆ&÷fWÆWF†÷&—¦WÆ6öç6–FW'Æ—77VWÆw&çGÆÆöö²–çFõÇ2²ƒó¦öffW&–æwÆv—f–æwÇ&÷f–F–æwÆ&÷f–ær’—Âƒó§–÷WÇF†RwVW7B•Ç2²ƒó¦Ö—ÆÖ–v‡GÆ6÷VÆGÇv–ÆÇÇv÷VÆGÇ6†÷VÆB•Ç2²ƒó§&V6V—fWÆvWGÆ&RöffW&VGÆ&Rv—fVâ—Âƒó¦—ÇvR•Ç2²ƒó¦6çÆ6÷VÆGÇv–ÆÇÇv÷VÆB•Ç2¶Ö¶Rƒó§F†—7Æ—B’&–v‡Bv—F‚•Æ%µââõ×³ÃÕÆ"ƒó§&VgVæGÇ&V–Ö'W'6VÖVçGÆ6ö×Vç6F–öçÆF—66÷VçGÆ7&VF—GÇWw&FWÆg&VRæ–v‡GÆ6ö×Æ–ÖVçF'’æ–v‡GÆÆFR6†V6²Óö÷WGÇv—fVCòfVWÆfVRv—fW"’ö’çFW7B‡FW‡B“°¢6öç7B÷væW$&÷fVD6öæ6W76–öâÒ‡FööÅ&W7VÇG2ÇÂµÒ’ç6öÖR‡&W7VÇBÓâ°¢6öç7B&÷fVEFW‡BÒ7G&–ær‡&W7VÇCòæFFòæ&÷fVD6öæ6W76–öåFW‡BÇÂ""’çG&–Ò‚“°¢&WGW&â&W7VÇCòæFFòæ÷væW$&÷fVD6öæ6W76–öâÓÓÒG'VRbb&÷fVEFW‡BbbFW‡Bæ–æ6ÇVFW2†&÷fVEFW‡B“°¢Ò“°¢–b†6öæ6W76–öä6Æ–Òbb÷væW$&÷fVD6öæ6W76–öâ’°¢f–öÆF–öç2çW6‚‡²6öFS¢'VæWF†÷&—¦VEö6öæ6W76–öâ"ÂFWF–Ã¢%F†R&WÇ’–çG&öGV6VB÷"&VF–7FVB6öæ6W76–öâv—F†÷WBâW‡Æ–6—B÷væW"Ö&÷fVBFööÂ&W7VÇBâ"Ò“°¢Ð ¢6öç7BÆÆ÷vVE†öæTF–v—G2ÒæWr6WB‚“°¢6öç7B†öæUGFW&âÒòƒó¥Â³óµÇ2âÕÓò“òƒó¥ÂƒõÆG³7ÕÂ“õµÇ2âÕÓò•ÆG³7ÕµÇ2âÕÓõÆG³GÒös°¢6öç7Bæ÷&ÖÆ—¦U†öæRÒfÇVRÓâ°¢6öç7BF–v—G2Ò7G&–ær‡fÇVRÇÂ""’ç&WÆ6R‚õÄBörÂ""“°¢&WGW&âF–v—G2æÆVæwF‚ÓÓÒbbF–v—G2ç7F'G5v—F‚‚#"’òF–v—G2ç6Æ–6Rƒ’¢F–v—G3°¢Ó°¢f÷"†6öç7B6÷W&6Röb·fW&–f–VE&rÂÆFW7EW6W"ÂõtäU%ô4ôåD5Bç†öæUÒ’°¢f÷"†6öç7BÖF6‚öb7G&–ær‡6÷W&6RÇÂ""’æÖF6„ÆÂ‡†öæUGFW&â’’ÆÆ÷vVE†öæTF–v—G2æFB†æ÷&ÖÆ—¦U†öæR†ÖF6…³Ò’“°¢Ð¢f÷"†6öç7BÖF6‚öb6V7W&—G•FW‡BæÖF6„ÆÂ‡†öæUGFW&â’’°¢6öç7BF–v—G2Òæ÷&ÖÆ—¦U†öæR†ÖF6…³Ò“°¢–b‚ÆÆ÷vVE†öæTF–v—G2æ†2†F–v—G2’’f–öÆF–öç2çW6‚‡²6öFS¢'VçfW&–f–VE÷†öæR"ÂFWF–Ã¢ÖF6…³ÒÒ“°¢Ð ¢6öç7BÆÆ÷vVDVÖ–Ç2ÒæWr6WB…´õtäU%ô4ôåD5BæVÖ–ÂçFôÆ÷vW$66R‚•Ò“°¢6öç7BVÖ–ÅGFW&âÒõÆ%¶×¤Õ£Ó’åòRµÂÕÒ´¶×¤Õ£Ó’åÂÕÒµÂå¶×¤Õ¥×³"ÇÕÆ"ös°¢f÷"†6öç7B6÷W&6Röb·fW&–f–VE&rÂÆFW7EW6W%Ò’°¢f÷"†6öç7BÖF6‚öb7G&–ær‡6÷W&6RÇÂ""’æÖF6„ÆÂ†VÖ–ÅGFW&â’’ÆÆ÷vVDVÖ–Ç2æFB†ÖF6…³ÒçFôÆ÷vW$66R‚’“°¢Ð¢f÷"†6öç7BÖF6‚öb6V7W&—G•FW‡BæÖF6„ÆÂ†VÖ–ÅGFW&â’’°¢–b‚ÆÆ÷vVDVÖ–Ç2æ†2†ÖF6…³ÒçFôÆ÷vW$66R‚’’’f–öÆF–öç2çW6‚‡²6öFS¢'VçfW&–f–VEöVÖ–Â"ÂFWF–Ã¢ÖF6…³ÒÒ“°¢Ð ¢6öç7BWF†÷&—¦VDFö÷$6öFW2ÒæWr6WB‚“°¢f÷"†6öç7B&W7VÇBöbFööÅ&W7VÇG2ÇÂµÒ’°¢6öç7B6öFRÒ&W7VÇCòæFFòæFö÷$6öFRóò&W7VÇCòæFFòæ&öö¶–æsòæFö÷$6öFS°¢–b†6öFRÒçVÆÂ’WF†÷&—¦VDFö÷$6öFW2æFB…7G&–ær†6öFR’“°¢Ð¢6öç7BFö÷$6öFT6Æ–×2ÒµÓ°¢6öç7BFö÷%GFW&ç2Ò°¢òƒó¦Fö÷'ÆVçG'—Ç–â•Ç2¢ƒó¦6öFWÇ–â“õÇ2¢ƒó¦—7Ã¢“õÇ2¢…ÆBƒó¥µÇ2åõÂÒõÓõÆB—³2Ã—Ò’öv’À¢òƒó§W6WÆVçFW'ÇG—R•Ç2²…ÆBƒó¥µÇ2åõÂÒõÓõÆB—³2Ã—Ò•²2¥ÓõÇ2²ƒó¦GÆ–çF÷Æöâ•Ç2²ƒó§F†UÇ2²“òƒó¦Fö÷'ÆÆö6·Æ¶W—B’öv’À¢Ó°¢f÷"†6öç7BGFW&âöbFö÷%GFW&ç2’°¢f÷"†6öç7BÖF6‚öb6V7W&—G•FW‡BæÖF6„ÆÂ‡GFW&â’’Fö÷$6öFT6Æ–×2çW6‚†ÖF6…³Òç&WÆ6R‚õÄBörÂ""’“°¢Ð¢f÷"†6öç7B6öFRöbæWr6WB†Fö÷$6öFT6Æ–×2’’°¢–b‚WF†÷&—¦VDFö÷$6öFW2æ†2…7G&–ær†6öFR’’’°¢f–öÆF–öç2çW6‚‡²6öFS¢'VæWF†÷&—¦VEöFö÷%ö6öFR"ÂFWF–Ã¢$Fö÷"6öFRV&VBv—F†÷WB7W'&VçB×GW&âWF†÷&—¦F–öââ"Ò“°¢Ð¢Ð ¢&WGW&â²ö³¢f–öÆF–öç2æÆVæwF‚ÓÓÒÂf–öÆF–öç2ÂW&Ç2Ó°§Ð ¦W‡÷'BgVæ7F–öâ6fTfÆÆ&6²‡²7FFRÂÆFW7EW6W"Â&V6öâÒ'FV×÷&'•öW'&÷""Ò’°¢–b‡7FFSòæfÆw3òç66Ô7&—6—2ÇÂFWFV7E66Ô7&—6—2†ÆFW7EW6W"’’°¢&WGW&â’6ö×ÆWFVÇ’VæFW'7FæB–÷W"g'W7G&F–öâÂæBž(	–Ò6÷''’F†—2W‡W&–Væ6R†2&VVâ6öægW6–ærâF†—2—2&VÂÂ÷væW"Ö÷W&FVB&VçFÂ'W6–æW72âÆV6R6öçF7BF†R÷væW"÷¦âF—&V7FÇ’BG´õtäU%ô4ôåD5Bç†öæWÒ÷"G´õtäU%ô4ôåD5BæVÖ–ÇÒ(	B†Rv–ÆÂW'6öæÆÇ’6÷'BF†—2÷WBæ°¢Ð¢–b‡7FFSòæÖöFRÓÓÒ&VÖW&vVæ7’"ÇÂFWFV7DÆö6¶VD÷WB†ÆFW7EW6W"’’°¢6öç7B6VçBÒ7FFSòæfÆw3òæÆW'E6VçBÓÓÒG'VS°¢&WGW&â6Vç@¢òž(	—fR6VçB÷¦ââW&vVçBÆW'BâÆV6R6ÆÂ†–Òæ÷rBG´õtäU%ô4ôåD5Bç†öæWÒâ–bF†W&R—2â–ÖÖVF–FRF‡&VBFòç–öæ^(	—26fWG’Â6ÆÂ“æ ¢¢’6÷VÆFî(	—B6öæf—&ÒF†BâÆW'B&V6†VB÷¦ââÆV6R6ÆÂ†–Òæ÷rBG´õtäU%ô4ôåD5Bç†öæWÒâ–bF†W&R—2â–ÖÖVF–FRF‡&VBFòç–öæ^(	—26fWG’Â6ÆÂ“æ°¢Ð¢–b‡7FFSòæÖöFRÓÓÒ&Ö–çFVææ6R"ÇÂFWFV7DÖ–çFVææ6R†ÆFW7EW6W"’’°¢&WGW&â7FFSòæfÆw3òæÆW'E6VçBÓÓÒG'VP¢òž(	–Ò6÷''’–÷^(	—&RFVÆ–ærv—F‚F†Bâž(	—fRÆW'FVB÷¦â6ò†R6âföÆÆ÷rWF—&V7FÇ“²–÷R6âÇ6ò&V6‚†–ÒBG´õtäU%ô4ôåD5Bç†öæWÒæ ¢¢ž(	–Ò6÷''’–÷^(	—&RFVÆ–ærv—F‚F†Bâ’6÷VÆFî(	—B6öæf—&ÒâÆW'Bv2FVÆ—fW&VBÂ6òÆV6R6öçF7B÷¦âF—&V7FÇ’BG´õtäU%ô4ôåD5Bç†öæWÒæ°¢Ð¢–b‡&V6öâÓÓÒ'7EöFFW2"’°¢&WGW&â%F†÷6RFFW2†fRÇ&VG’76VBâÆV6R6VæBF†R–çFVæFVBgWGW&R6†V6²Ö–âæB6†V6²Ö÷WBFFW2ÂæBž(	–ÆÂ6†V6²F†VÒ&–v‡Bv’â#°¢Ð¢6öç7BÖ—76–ærÒ7FFSòæv—F–ærÇÂµÓ°¢–b†Ö—76–æræÆVæwF‚’°¢6öç7BÆ&VÇ2Ò²'&—fÃ¢&6†V6²Ö–âFFR"ÂFW'GW&S¢&6†V6²Ö÷WBFFR"ÂGVÇG3¢&çVÖ&W"öbGVÇG2"Â6†–ÆG&Vã¢&çVÖ&W"öb6†–ÆG&Vâ"Â÷&–v–åö6—G“¢&6—G’–÷R&RfÇ––ærg&öÒ"ÂVÖ–Ã¢&VÖ–ÂFG&W72"Âf—'7EöæÖS¢&f—'7BæÖR"Â&VÆ•öÖW76vS¢&ÖW76vR–÷RvçBÖRFò6VæB÷¦â"Ó°¢&WGW&â’vçBFòÖ¶R7W&R’vWBF†—2&–v‡Bâ6÷VÆB–÷R6VæBF†RG¶Ö—76–æræÖ‡‚ÓâÆ&VÇ5·…ÒÇÂ‚’æ¦ö–â‚"æB"—Óö°¢Ð¢&WGW&â’†—BFV×÷&'’6ærâÆV6RG'’öæ6RÖ÷&RÂ÷"6öçF7B÷¦âBG´õtäU%ô4ôåD5Bç†öæWÒæ°§Ð