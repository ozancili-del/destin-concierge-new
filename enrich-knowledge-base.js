/**
 * Destiny Blue — Knowledge Base Enrichment Script
 * Run once: node enrich-knowledge-base.js
 * Output: knowledgeBase.js — commit to repo, import in chat.js
 *
 * Setup:
 *   npm install @googlemaps/google-maps-services-js
 *   GOOGLE_WEATHER_API_KEY=your_key node enrich-knowledge-base.js
 */

const { Client } = require("@googlemaps/google-maps-services-js");
const fs = require("fs");

const client = new Client({});
const API_KEY = process.env.GOOGLE_WEATHER_API_KEY;

if (!API_KEY) {
  console.error("❌ GOOGLE_WEATHER_API_KEY env var not found");
  process.exit(1);
}

// ─── Anchor ───────────────────────────────────────────────────────────────────
const RESORT = { lat: 30.3763, lng: -86.4958 };
const RESORT_ADDRESS = "1002 US-98, Destin FL 32541";

// ─── Radius constants ─────────────────────────────────────────────────────────
const RADIUS_DEFAULT     = 32187; // 20 miles in meters
const RADIUS_STATE_PARKS = 48280; // 30 miles in meters

// ─── Haversine distance (miles) ──────────────────────────────────────────────
function calcDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

// ─── Slug generator ───────────────────────────────────────────────────────────
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Area classifier (derived from coordinates) ───────────────────────────────
// Destin/Emerald Coast runs east-west along US-98 / 30A
//   destin_harbor  : lng > -86.50  (HarborWalk, downtown Destin)
//   miramar_beach  : -86.58 to -86.50
//   sandestin      : -86.65 to -86.58 (Baytowne, Sandestin resort)
//   30a            : lng < -86.65, lat < 30.38 (scenic 30A corridor)
//   fort_walton    : lng < -86.65, lat >= 30.38
//   inland         : lat > 30.52
function classifyArea(lat, lng) {
  if (!lat || !lng) return "destin_area";
  if (lat > 30.52)  return "inland";
  if (lng > -86.50) return "destin_harbor";
  if (lng > -86.58) return "miramar_beach";
  if (lng > -86.65) return "sandestin";
  if (lat < 30.38)  return "30a";
  return "fort_walton_beach";
}

// ─── Price level mapper ───────────────────────────────────────────────────────
const PRICE_MAP = { 0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };

// ─── Delay to stay under rate limits ─────────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Fetch full place details ─────────────────────────────────────────────────
async function getDetails(place_id) {
  const res = await client.placeDetails({
    params: {
      place_id,
      fields: [
        "place_id",
        "name",
        "formatted_address",
        "formatted_phone_number",
        "website",
        "opening_hours",
        "price_level",
        "rating",
        "user_ratings_total",
        "geometry",
        "types",
        "editorial_summary",
      ],
      key: API_KEY,
    },
  });
  return res.data.result;
}

// ─── Search helpers ───────────────────────────────────────────────────────────
async function nearbySearch(keyword, type, radius = RADIUS_DEFAULT) {
  const res = await client.placesNearby({
    params: { location: RESORT, radius, keyword, type, key: API_KEY },
  });
  return res.data.results || [];
}

// With location context appended (general searches)
async function textSearch(query, radius = RADIUS_DEFAULT) {
  const res = await client.textSearch({
    params: {
      query: `${query} near Pelican Beach Resort Destin FL`,
      location: RESORT,
      radius,
      key: API_KEY,
    },
  });
  return res.data.results || [];
}

// Without location suffix (for named places like specific state parks)
async function textSearchRaw(query, radius = RADIUS_DEFAULT) {
  const res = await client.textSearch({
    params: { query, location: RESORT, radius, key: API_KEY },
  });
  return res.data.results || [];
}

// ─── Build a clean, locked-schema place record ────────────────────────────────
function buildRecord(details, category) {
  const loc  = details.geometry?.location;
  const dist = loc ? calcDistanceMiles(RESORT.lat, RESORT.lng, loc.lat, loc.lng) : null;
  const area = loc ? classifyArea(loc.lat, loc.lng) : "destin_area";

  return {
    // ── Identity ──────────────────────────────────────────────────────────────
    placeId:       details.place_id || null,
    slug:          toSlug(details.name),
    name:          details.name,
    category,
    area,

    // ── Contact & location ────────────────────────────────────────────────────
    address:       details.formatted_address || null,
    phone:         details.formatted_phone_number || null,
    website:       details.website || null,
    coordinates:   loc || null,
    distanceMiles: dist,

    // ── Google data (do not manually edit) ───────────────────────────────────
    rating:        details.rating || null,
    ratingCount:   details.user_ratings_total || null,
    priceLevel:    PRICE_MAP[details.price_level] ?? null,
    hours:         details.opening_hours?.weekday_text || null,
    types:         details.types || [],
    placeSummary:  details.editorial_summary?.overview || null,

    // ── Manual annotation — ONLY fields you fill in ───────────────────────────
    bestFor:       null,  // array  e.g. ["boat_watching", "oysters", "live_music"]
    honestOpinion: null,  // string e.g. "More about the vibe than the food quality"
    insiderTip:    null,  // string e.g. "Charter boats return 3-5pm — grab a deck table"
    indoorFriendly: null, // boolean — true if works on cold/rainy day (activities only)
    parking:       category === "state_park"
                     ? "Florida State Parks: $4/vehicle (up to 8 people). $2 pedestrian/bicycle. Annual pass available ($60)."
                     : null, // string e.g. "Free lot on Harbor Blvd, fills by noon in summer"

    // ── Content hooks — fill when ready ──────────────────────────────────────
    blogLink:      null,
    tripShockSlug: null,
  };
}

// ─── Process a batch of search results into records ───────────────────────────
async function processBatch(results, category) {
  const minRating = category === "restaurant" ? 4.0 : 0;
  const filtered  = minRating
    ? results.filter((p) => !p.rating || p.rating >= minRating)
    : results;

  const processed = [];
  for (const place of filtered.slice(0, 20)) {
    await delay(200);
    try {
      const details = await getDetails(place.place_id);
      const record  = buildRecord(details, category);
      processed.push(record);
      console.log(`  ✅ ${record.name} (${record.distanceMiles}mi) [${record.area}]`);
    } catch (err) {
      console.warn(`  ⚠️  ${place.name}: ${err.message}`);
    }
  }
  // Nearest first
  return processed.sort((a, b) => (a.distanceMiles || 99) - (b.distanceMiles || 99));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Destiny Blue — Knowledge Base Enrichment\n");

  const kb = {
    meta: {
      generatedAt:      new Date().toISOString(),
      anchor:           RESORT_ADDRESS,
      anchorCoords:     RESORT,
      radiusDefault:    "20 miles",
      radiusStateParks: "30 miles",
      note:             "Auto-generated. Only manually fill: bestFor, honestOpinion, insiderTip.",
    },
    restaurants:  [],
    activities:   [],
    attractions:  [],
    beaches:      [],
    supermarkets: [],
    stateParks:   [],
    localTips:    [], // hand-authored — never from Places API
  };

  // ── Restaurants (20mi, 4+ stars) ───────────────────────────────────────────
  console.log("🍽️  Restaurants (20mi, 4+ stars)...");
  const restRaw = [];
  for (const q of [
    "best seafood restaurants Destin FL",
    "best restaurants Miramar Beach FL",
    "best restaurants Fort Walton Beach FL",
    "best restaurants 30A Santa Rosa Beach FL",
  ]) {
    restRaw.push(...await textSearch(q));
    await delay(300);
  }
  const seenRest = new Set();
  kb.restaurants = await processBatch(
    restRaw.filter((p) => {
      if (seenRest.has(p.place_id)) return false;
      seenRest.add(p.place_id);
      return p.rating >= 4.0;
    }),
    "restaurant"
  );
  await delay(500);

  // ── Activities ─────────────────────────────────────────────────────────────
  console.log("\n🎯 Activities...");
  const actRaw = [];
  for (const q of [
    // Outdoor / water
    "water park Destin FL",
    "charter fishing Destin FL",
    "dolphin tour Destin FL",
    "parasailing Destin FL",
    "snorkeling tour Destin FL",
    "mini golf Destin FL",
    "jet ski rental Destin FL",
    "kayak rental Destin FL",
    // Indoor / rainy day
    "indoor activities Destin FL",
    "trampoline park Fort Walton Beach FL",
    "escape room Destin FL",
    "arcade Destin FL",
    "bowling Destin FL",
    "science museum Fort Walton Beach FL",
    "aquarium Destin FL",
    "indoor climbing gym Destin FL",
  ]) {
    actRaw.push(...(await textSearch(q)).slice(0, 4));
    await delay(300);
  }
  const seenAct = new Set();
  kb.activities = await processBatch(
    actRaw.filter((p) => {
      if (seenAct.has(p.place_id)) return false;
      seenAct.add(p.place_id);
      return true;
    }),
    "activity"
  );
  await delay(500);

  // ── Attractions ────────────────────────────────────────────────────────────
  console.log("\n🏛️  Attractions...");
  const attrRaw = [];
  for (const q of [
    "tourist attractions Destin FL",
    "HarborWalk Village Destin FL",
    "Baytowne Wharf Sandestin FL",
    "Crab Island Destin FL",
  ]) {
    attrRaw.push(...await textSearch(q));
    await delay(300);
  }
  const seenAttr = new Set();
  kb.attractions = await processBatch(
    attrRaw.filter((p) => {
      if (seenAttr.has(p.place_id)) return false;
      seenAttr.add(p.place_id);
      return true;
    }),
    "attraction"
  );
  await delay(500);

  // ── Beaches ────────────────────────────────────────────────────────────────
  console.log("\n🏖️  Beaches...");
  const beachRaw = [];
  for (const q of [
    "public beach Destin FL",
    "beach access Fort Walton Beach FL",
    "beach 30A Santa Rosa Beach FL",
  ]) {
    beachRaw.push(...await textSearch(q));
    await delay(300);
  }
  const seenBeach = new Set();
  kb.beaches = await processBatch(
    beachRaw.filter((p) => {
      if (seenBeach.has(p.place_id)) return false;
      seenBeach.add(p.place_id);
      return true;
    }),
    "beach"
  );
  await delay(500);

  // ── Supermarkets ───────────────────────────────────────────────────────────
  console.log("\n🛒 Supermarkets...");
  kb.supermarkets = await processBatch(
    await nearbySearch("grocery supermarket", "grocery_or_supermarket"),
    "supermarket"
  );
  await delay(500);

  // ── State Parks (30mi, named + broad sweep) ────────────────────────────────
  console.log("\n🌲 State Parks (30mi)...");
  const parkRaw = [];
  for (const q of [
    "Henderson Beach State Park Destin FL",
    "Topsail Hill Preserve State Park Santa Rosa Beach FL",
    "Grayton Beach State Park FL",
    "Camp Helen State Park Panama City Beach FL",
    "Fred Gannon Rocky Bayou State Park Niceville FL",
  ]) {
    const r = await textSearchRaw(q, RADIUS_STATE_PARKS);
    if (r.length > 0) parkRaw.push(r[0]);
    await delay(300);
  }
  // Broad sweep to catch anything missed
  const seenParks = new Set(parkRaw.map((p) => p.place_id));
  for (const p of await textSearch("Florida state park", RADIUS_STATE_PARKS)) {
    if (!seenParks.has(p.place_id)) {
      parkRaw.push(p);
      seenParks.add(p.place_id);
    }
  }
  kb.stateParks = await processBatch(parkRaw, "state_park");

  // ── Write output ───────────────────────────────────────────────────────────
  console.log("\n📝 Writing knowledgeBase.js...");

  fs.writeFileSync(
    "knowledgeBase.js",
`/**
 * Destiny Blue — Static Knowledge Base
 * Generated: ${new Date().toISOString()}
 * Anchor: ${RESORT_ADDRESS}
 *
 * DO NOT edit Google fields (rating, hours, address, coordinates etc.)
 * ONLY fill in: bestFor (array), honestOpinion (string), insiderTip (string)
 * TO REFRESH next year: re-run enrich-knowledge-base.js, paste annotations back in
 */

const knowledgeBase = ${JSON.stringify(kb, null, 2)};

module.exports = knowledgeBase;
`
  );

  const total =
    kb.restaurants.length + kb.activities.length + kb.attractions.length +
    kb.beaches.length + kb.supermarkets.length + kb.stateParks.length;

  console.log(`
✅ Done!
   Restaurants : ${kb.restaurants.length}
   Activities  : ${kb.activities.length}
   Attractions : ${kb.attractions.length}
   Beaches     : ${kb.beaches.length}
   Supermarkets: ${kb.supermarkets.length}
   State Parks : ${kb.stateParks.length}
   ───────────────────────────
   Total       : ${total} places

knowledgeBase.js is ready.
Open it, search for "bestFor": null — fill in top 15-20 restaurants + key spots.
Everything else can stay null. Destiny Blue falls back to placeSummary.
`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
