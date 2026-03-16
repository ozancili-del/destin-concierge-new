/**
 * Destiny Blue — Restaurant Coordinates Lookup
 * Run once: node lookup-restaurant-coords.js
 * Output: restaurant-coords.json
 *
 * Setup: GOOGLE_WEATHER_API_KEY=your_key node lookup-restaurant-coords.js
 */

const { Client } = require("@googlemaps/google-maps-services-js");
const fs = require("fs");

const client = new Client({});
const API_KEY = process.env.GOOGLE_WEATHER_API_KEY;

if (!API_KEY) {
  console.error("❌ GOOGLE_WEATHER_API_KEY not set");
  process.exit(1);
}

// Anchor for bias — Pelican Beach Resort
const LOCATION = { lat: 30.3763, lng: -86.4958 };

// ─── Master restaurant list ───────────────────────────────────────────────────
const RESTAURANTS = [
  // SEAFOOD
  { id: 1,  name: "The Back Porch Seafood and Oyster House Destin FL" },
  { id: 2,  name: "Boshamps Seafood and Oyster House Destin FL" },
  { id: 3,  name: "Dewey Destin's Seafood Restaurant Destin FL" },
  { id: 4,  name: "AJ's Seafood and Oyster Bar Destin FL" },
  { id: 5,  name: "The Edge Seafood Restaurant SkyBar Destin FL" },
  { id: 6,  name: "Harbor Docks Destin FL" },
  { id: 7,  name: "Brotula's Seafood House Steamer Destin FL" },
  { id: 8,  name: "Louisiana Lagniappe Destin FL" },
  { id: 9,  name: "Boathouse Oyster Bar Destin FL" },
  { id: 10, name: "Camille's at Crystal Beach Destin FL" },
  { id: 11, name: "Crab Trap Destin FL" },
  { id: 12, name: "Pompano Joe's Miramar Beach FL" },
  { id: 13, name: "LuLu's Destin FL" },
  { id: 14, name: "Stinky's Fish Camp Santa Rosa Beach FL" },
  { id: 15, name: "Marina Cafe Destin FL" },
  // ITALIAN
  { id: 16, name: "Mimmo's Ristorante Italiano Destin FL" },
  { id: 17, name: "Nonna's Ristorante Destin FL" },
  { id: 18, name: "Pazzo Italiano Destin FL" },
  { id: 19, name: "Fat Clemenza's Destin FL" },
  // SUSHI / ASIAN
  { id: 20, name: "Osaka Japanese Hibachi Sushi Bar Destin FL" },
  { id: 21, name: "Sushimoto Miramar Beach FL" },
  { id: 22, name: "Jackacuda's Seafood Sushi Destin FL" },
  { id: 23, name: "Thai Delights Destin FL" },
  // AMERICAN / PUB
  { id: 24, name: "McGuire's Irish Pub Destin FL" },
  { id: 25, name: "Fudpucker's Beachside Bar Grill Destin FL" },
  { id: 26, name: "The Harbor Tavern Destin FL" },
  { id: 27, name: "Harry T's Lighthouse Destin FL" },
  // MEDITERRANEAN / OTHER
  { id: 28, name: "Red Onion Organic Restaurant Destin FL" },
  { id: 29, name: "Capriccio Cafe Miramar Beach FL" },
  // BREAKFAST / BRUNCH
  { id: 30, name: "Crackings Destin FL" },
  { id: 31, name: "Ruby Slipper Destin FL" },
  { id: 32, name: "Donut Hole Bakery Cafe Destin FL" },
  // UPSCALE
  { id: 33, name: "Beach Walk Cafe Henderson Park Inn Destin FL" },
  { id: 34, name: "Seagar's Prime Steaks Seafood Miramar Beach FL" },
];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function lookupPlace(restaurant) {
  const res = await client.textSearch({
    params: {
      query: restaurant.name,
      location: LOCATION,
      radius: 50000,
      key: API_KEY,
    },
  });

  const results = res.data.results;
  if (!results || results.length === 0) {
    console.log(`  ❌ NOT FOUND: ${restaurant.name}`);
    return { ...restaurant, found: false };
  }

  const place = results[0];
  const loc = place.geometry?.location;

  console.log(`  ✅ ${place.name} → ${loc?.lat}, ${loc?.lng} | ${place.formatted_address}`);

  return {
    id:       restaurant.id,
    name:     place.name,
    query:    restaurant.name,
    placeId:  place.place_id,
    lat:      loc?.lat,
    lng:      loc?.lng,
    address:  place.formatted_address,
    rating:   place.rating,
    reviews:  place.user_ratings_total,
    found:    true,
  };
}

async function main() {
  console.log("🔍 Looking up restaurant coordinates...\n");

  const results = [];
  for (const r of RESTAURANTS) {
    await delay(200);
    const result = await lookupPlace(r);
    results.push(result);
  }

  fs.writeFileSync("restaurant-coords.json", JSON.stringify(results, null, 2));

  const found   = results.filter((r) => r.found).length;
  const missing = results.filter((r) => !r.found).length;

  console.log(`
✅ Done!
   Found  : ${found}
   Missing: ${missing}

Output: restaurant-coords.json
Review the file — check any ❌ NOT FOUND entries and verify
the returned names match what you expected before building the map.
`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
