/**
 * fix-supermarket-coords.js
 * Geocodes each supermarket address and outputs corrected lat/lng
 * 
 * Run: GOOGLE_WEATHER_API_KEY=your_key node fix-supermarket-coords.js
 */

const API_KEY = process.env.GOOGLE_WEATHER_API_KEY;

if (!API_KEY) {
  console.error("❌ GOOGLE_WEATHER_API_KEY env var not found");
  console.error("Run as: GOOGLE_WEATHER_API_KEY=your_key node fix-supermarket-coords.js");
  process.exit(1);
}

const stores = [
  { name: "Winn-Dixie",                address: "981 US-98 E, Destin, FL 32541" },
  { name: "Destin Euro Market",         address: "743 Harbor Blvd Ste 6, Destin, FL 32541" },
  { name: "Destin Ice Seafood Market",  address: "1040 US-98 W, Destin, FL 32541" },
  { name: "Whole Foods Market",         address: "4402 Legendary Dr, Destin, FL 32541" },
  { name: "Publix Miramar Beach",       address: "771 Harbor Blvd Unit 100, Destin, FL 32541" },
  { name: "Publix Destin Commons",      address: "4425 Commons Dr E, Destin, FL 32541" },
  { name: "Walmart Supercenter",        address: "15017 Emerald Coast Pkwy, Destin, FL 32541" },
  { name: "Target",                     address: "853 Harbor Blvd, Destin, FL 32541" },
  { name: "The Fresh Market",           address: "4495 Commons Dr W, Destin, FL 32541" },
];

const delay = ms => new Promise(r => setTimeout(r, ms));

async function geocode(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" || !data.results[0]) {
    throw new Error(`Geocode failed for "${address}": ${data.status}`);
  }
  return data.results[0].geometry.location;
}

async function main() {
  console.log("🔍 Geocoding supermarket addresses...\n");

  const results = [];

  for (const store of stores) {
    try {
      const loc = await geocode(store.address);
      results.push({ ...store, lat: loc.lat, lon: loc.lng });
      console.log(`✅ ${store.name}`);
      console.log(`   lat: ${loc.lat}, lon: ${loc.lng}`);
    } catch (err) {
      console.error(`❌ ${store.name}: ${err.message}`);
    }
    await delay(200);
  }

  console.log("\n\n📋 CORRECTED PINS ARRAY — paste into supermarket-map.html:\n");
  console.log("// Replace the lat/lon values in your pins array:\n");

  results.forEach(r => {
    console.log(`  // ${r.name}`);
    console.log(`  lat: ${r.lat}, lon: ${r.lon},`);
    console.log();
  });

  console.log("\n✅ Done! Copy the corrected coordinates above into your supermarket-map.html pins array.");
}

main().catch(err => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
