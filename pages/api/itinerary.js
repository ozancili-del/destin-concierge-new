import { allowSameOriginRequest, cleanText, enforceJsonSize, enforceRateLimit, isBotTrapFilled, parseIsoDate, signPayload } from "../../lib/public-api-security.js";

const CUISINE = new Set(["Seafood", "Brunch", "Italian", "Sushi", "Burgers & Casual", "Fine Dining", "Mexican"]);
const INTERESTS = new Set(["Water Sports", "Fishing", "Shopping", "Nightlife", "Nature & Outdoors", "History & Culture", "Spa & Wellness"]);
const PACES = new Set(["Relaxed & Easy", "Mix of Both", "Packed & Adventurous"]);
const BEACH_POOL = new Set(["Beach", "Pool", "Both"]);

function choices(value, allowed, max = 8) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => cleanText(item, 40)).filter(item => allowed.has(item)))].slice(0, max);
}

function validateItinerary(value, expectedDays) {
  if (!value || !Array.isArray(value.days) || value.days.length !== expectedDays) return null;
  const days = value.days.map((day, index) => {
    if (!day || !Array.isArray(day.blocks) || day.blocks.length !== 4) return null;
    const blocks = day.blocks.map(block => ({
      time: cleanText(block?.time, 20), emoji: cleanText(block?.emoji, 8), place: cleanText(block?.place, 100),
      description: cleanText(block?.description, 160), tip: cleanText(block?.tip, 160), backup: cleanText(block?.backup, 160),
      link_url: cleanText(block?.link_url, 500), link_label: cleanText(block?.link_label, 80), tripshock: block?.tripshock === true,
      lat: Number(block?.lat), lng: Number(block?.lng),
    }));
    if (blocks.some(block => !block.time || !block.place || !block.description || !Number.isFinite(block.lat) || !Number.isFinite(block.lng))) return null;
    return { day_number: index + 1, title: cleanText(day.title, 100), weather: cleanText(day.weather, 180), blocks };
  });
  if (days.some(day => !day)) return null;
  return { summary: cleanText(value.summary, 600, { multiline: true }), days };
}

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
  if (!enforceJsonSize(req, res, 12_000)) return;
  if (!enforceRateLimit(req, res, { scope: "itinerary", limit: 4, windowMs: 3600000 })) return;
  if (isBotTrapFilled(req.body)) return res.status(400).json({ error: "Invalid submission" });

  const arrival = cleanText(req.body?.arrival, 10), departure = cleanText(req.body?.departure, 10);
  const arrivalDate = parseIsoDate(arrival), departureDate = parseIsoDate(departure);
  const adults = Number(req.body?.adults), kids = Number(req.body?.kids || 0);
  if (!arrivalDate || !departureDate || departureDate <= arrivalDate || !Number.isInteger(adults) || adults < 1 || adults > 6 || !Number.isInteger(kids) || kids < 0 || kids > 5 || adults + kids > 6) return res.status(400).json({ error: "Please check dates and guest counts" });
  const numDays = Math.round((departureDate - arrivalDate) / 86400000);
  const maxFuture = new Date(); maxFuture.setUTCFullYear(maxFuture.getUTCFullYear() + 2);
  if (numDays < 1 || numDays > 14 || arrivalDate > maxFuture) return res.status(400).json({ error: "Trip length or dates are outside the supported range" });

  const cuisine = choices(req.body?.cuisine, CUISINE), interests = choices(req.body?.interests, INTERESTS);
  const requestedBeachPool = cleanText(req.body?.beachPool, 30), requestedPace = cleanText(req.body?.pace, 20);
  const beachPool = BEACH_POOL.has(requestedBeachPool) ? requestedBeachPool : "Both";
  const pace = PACES.has(requestedPace) ? requestedPace : "Mix of Both";
  const formSnapshot = { arrival, departure, adults, kids, cuisine, beachPool, pace, interests, numDays, arrFmt: cleanText(req.body?.arrFmt, 40) || arrival, depFmt: cleanText(req.body?.depFmt, 40) || departure };
  const apiKey = process.env.OPENAI_API_KEY, signingSecret = process.env.ITINERARY_SIGNING_SECRET;
  if (!apiKey || !signingSecret) return res.status(503).json({ error: "Itinerary service is temporarily unavailable" });

  const systemPrompt = `You are Destiny Blue, the AI concierge for Destin Condo Getaways at Pelican Beach Resort. Return ONLY valid JSON. Use real Destin-area venues and current information; never invent. Do not recommend accommodations. Each day must have exactly four blocks: MORNING, LUNCH, AFTERNOON, DINNER. Keep descriptions, tips and backups concise. For bookable activities set tripshock true and link_url to https://www.tripshock.com/?aff=destindreamcondo. Return {"summary":"...","days":[{"day_number":1,"title":"...","weather":"...","blocks":[{"time":"MORNING","emoji":"","place":"...","description":"...","tip":"...","backup":"...","link_url":"...","link_label":"...","tripshock":false,"lat":30.393,"lng":-86.496}]}]}.`;
  const userPrompt = `Create a ${numDays}-day itinerary for ${arrival} through ${departure}. Guests: ${adults} adults and ${kids} children. Cuisine: ${cuisine.join(", ") || "open"}. Beach/pool preference: ${beachPool}. Pace: ${pace}. Interests: ${interests.join(", ") || "general Destin experiences"}. Verify time-sensitive events for these dates.`;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "gpt-4o-search-preview", web_search_options: {}, max_tokens: Math.min(9000, 1200 + numDays * 500), messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }) });
    if (!response.ok) { console.error("[ITINERARY] provider status", response.status); return res.status(502).json({ error: "The itinerary service could not complete this request" }); }
    const providerData = await response.json();
    const raw = providerData?.choices?.[0]?.message?.content?.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const itinerary = validateItinerary(JSON.parse(raw), numDays);
    if (!itinerary) return res.status(502).json({ error: "The itinerary response could not be validated" });
    const signed = { itinerary, formSnapshot };
    return res.status(200).json({ ...signed, deliveryToken: signPayload(signed, signingSecret) });
  } catch (error) {
    console.error("[ITINERARY] request failed", error?.name || "Error");
    return res.status(502).json({ error: "The itinerary service could not complete this request" });
  }
}
