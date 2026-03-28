/**
 * fix-supermarket-coords-v2.js
 * Uses Google Places API text search (not geocoding) to find accurate
 * coordinates AND verified addresses for each store.
 *
 * Run: GOOGLE_WEATHER_API_KEY=your_key node fix-supermarket-coords-v2.js
 */

const API_KEY = process.env.GOOGLE_WEATHER_API_KEY;

if (!API_KEY) {
  console.error("❌ GOOGLE_WEATHER_API_KEY env var not found");
  console.error("Run as: GOOGLE_WEATHER_API_KEY=your_key node fix-supermarket-coords-v2.js");
  process.exit(1);
}

const stores = [
  "Winn-Dixie Destin FL US-98",
  "Destin Euro Market Destin FL",
  "Destin Ice Seafood Market Destin FL",
  "Whole Foods Market Destin FL",
  "Publix Harbor Blvd Destin FL",
  "Publix Commons Drive Destin FL",
  "Walmart Supercenter Destin FL Emerald Coast Pkwy",
  "Target Harbor Blvd Destin FL",
  "The Fresh Market Destin FL",
];

const delay = ms => new Promise(r => setTimeout(r, ms));

async function findPlace(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" || !data.results[0]) {
    throw new Error(`Place not found for "${query}": ${data.status}`);
  }
  const place = data.results[0];
  return {
    name: place.name,
    address: place.formatted_address,
    lat: place.geometry.location.lat,
    lon: place.geometry.location.lng,
    placeId: place.place_id,
    rating: place.rating || null,
  };
}

async function main() {
  console.log("🔍 Finding supermarkets via Google Places text search...\n");

  const results = [];

  for (const query of stores) {
    try {
      const place = await findPlace(query);
      results.push({ query, ...place });
      console.log(`✅ ${place.name}`);
      console.log(`   Address: ${place.address}`);
      console.log(`   lat: ${place.lat}, lon: ${place.lon}`);
      console.log(`   Rating: ${place.rating || "N/A"}`);
      console.log();
    } catch (err) {
      console.error(`❌ ${query}: ${err.message}\n`);
    }
    await delay(300);
  }

  console.log("\n📋 CORRECTED PINS ARRAY — paste into supermarket-map.html:\n");

  results.forEach(r => {
    console.log(`  // ${r.name} — ${r.address}`);
    console.log(`  lat: ${r.lat}, lon: ${r.lon},`);
    console.log();
  });

  console.log("\n📋 KNOWLEDGE BASE UPDATE:\n");
  results.forEach(r => {
    console.log(`  { name: "${r.name}", address: "${r.address}", lat: ${r.lat}, lng: ${r.lon} }`);
  });

  console.log("\n✅ Done!");
}

main().catch(err => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
