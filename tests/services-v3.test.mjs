import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync } from "node:crypto";
import { createServices } from "../lib/destiny-agent/services.js";
import { NOW } from "./test-helpers.mjs";

function response({ ok = true, status = ok ? 200 : 500, json = {}, text = "" } = {}) {
  return { ok, status, async json() { return json; }, async text() { return text; } };
}

function makeFetch(routes = []) {
  const calls = [];
  const fn = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    for (const route of routes) {
      if (typeof route.match === "string" ? String(url).includes(route.match) : route.match.test(String(url))) {
        return typeof route.reply === "function" ? route.reply(String(url), options, calls) : route.reply;
      }
    }
    throw new Error(`Unmocked URL: ${url}`);
  };
  fn.calls = calls;
  return fn;
}

const quiet = { log() {}, error() {} };

test("createServices requires fetch implementation", () => assert.throws(() => createServices({ fetchImpl: null }), /fetch implementation/i));

test("Discord alert fails closed when configuration is missing", async () => {
  const services = createServices({ fetchImpl: makeFetch(), env: {}, now: () => NOW, logger: quiet });
  assert.deepEqual(await services.sendEmergencyDiscord("help", "s1"), { sent: false, reason: "missing_configuration" });
});

test("Discord maintenance payload preserves three operational buttons", async () => {
  const fetchImpl = makeFetch([{ match: "discord.com/api", reply: response({ status: 200 }) }]);
  const services = createServices({ fetchImpl, env: { DISCORD_BOT_TOKEN: "t", DISCORD_CHANNEL_ID: "c" }, now: () => NOW, logger: quiet });
  const result = await services.sendEmergencyDiscord("AC broken", "s1", "Maintenance", "maintenance", ["AC broken"]);
  assert.equal(result.sent, true);
  const body = JSON.parse(fetchImpl.calls[0].options.body);
  assert.deepEqual(body.components[0].components.map(x => x.custom_id), ["maint_onsite_s1", "maint_ozan_s1", "maint_emergency_s1"]);
  assert.match(body.content, /Open issues this session/);
});

test("Discord alert returns HTTP failure instead of false success", async () => {
  const fetchImpl = makeFetch([{ match: "discord.com/api", reply: response({ ok: false, status: 503, text: "down" }) }]);
  const services = createServices({ fetchImpl, env: { DISCORD_BOT_TOKEN: "t", DISCORD_CHANNEL_ID: "c" }, now: () => NOW, logger: quiet });
  assert.deepEqual(await services.sendEmergencyDiscord("help", "s1"), { sent: false, reason: "http_503" });
});

test("owner chat invite builds internal signed-style URL only in Discord payload", async () => {
  const fetchImpl = makeFetch([{ match: "discord.com/api", reply: response({ status: 200 }) }]);
  const services = createServices({ fetchImpl, env: { DISCORD_BOT_TOKEN: "t", DISCORD_CHANNEL_ID: "c" }, now: () => NOW, logger: quiet });
  const result = await services.sendOwnerChatInvite({ sessionId: "abc", guestMessage: "talk", inviteToken: "token" });
  assert.equal(result.sent, true); assert.match(result.enterChatUrl, /ozan\?s=abc&t=token/);
  const body = JSON.parse(fetchImpl.calls[0].options.body); assert.equal(body.components[0].components[0].url, result.enterChatUrl);
});

test("owner chat invite stays on the current Vercel deployment", async () => {\n  const fetchImpl = makeFetch([{ match: "discord.com/api", reply: response({ status: 200 }) }]);\n  const services = createServices({\n    fetchImpl,\n    env: {\n      DISCORD_BOT_TOKEN: "bot",\n      DISCORD_CHANNEL_ID: "channel",\n      VERCEL_URL: "destin-concierge-preview.example.vercel.app",\n    },\n  });\n\n  const result = await services.sendOwnerChatInvite({ sessionId: "preview", guestMessage: "talk", inviteToken: "token" });\n\n  assert.equal(result.enterChatUrl, "https://destin-concierge-preview.example.vercel.app/ozan?s=preview&t=token");\n});\n\ntest("weather reports missing configuration without network", async () => {
  const fetchImpl = makeFetch(); const services = createServices({ fetchImpl, env: {}, now: () => NOW, logger: quiet });
  const r = await services.fetchDestinWeather(); assert.equal(r.status, "unavailable"); assert.equal(fetchImpl.calls.length, 0);
});

test("weather normalizes Google response into Fahrenheit facts", async () => {
  const fetchImpl = makeFetch([{ match: "weather.googleapis.com", reply: response({ json: { forecastDays: [{ displayDate:{year:2026,month:7,day:21}, maxTemperature:{degrees:89.4}, minTemperature:{degrees:75.6}, daytimeForecast:{precipitation:{probability:{percent:31}}, weatherCondition:{description:{text:"Partly cloudy"}}}, nighttimeForecast:{precipitation:{probability:{percent:44}}} }] } }) }]);
  const services = createServices({ fetchImpl, env: { GOOGLE_WEATHER_API_KEY: "k" }, now: () => NOW, logger: quiet });
  const r = await services.fetchDestinWeather(); assert.equal(r.status, "success"); assert.deepEqual(r.forecast[0], { date:"2026-07-21", hi:89, lo:76, rain:44, desc:"Partly cloudy" });
});

test("weather inherits the deployed legacy Google key when no dedicated key is set", async () => {
  const fetchImpl = makeFetch([{ match: "weather.googleapis.com", reply: response({ json: { forecastDays: [{ displayDate:{year:2026,month:8,day:3}, maxTemperature:{degrees:88}, minTemperature:{degrees:77}, daytimeForecast:{precipitation:{probability:{percent:60}}, weatherCondition:{description:{text:"Showers"}}} }] } }) }]);
  const services = createServices({ fetchImpl, env: { GOOGLE_MAPS_KEY: "legacy-weather-key" }, now: () => NOW, logger: quiet });
  const r = await services.fetchDestinWeather();
  assert.equal(r.status, "success");
  assert.match(fetchImpl.calls[0].url, /key=legacy-weather-key/);
  assert.deepEqual(r.forecast[0], { date:"2026-08-03", hi:88, lo:77, rain:60, desc:"Showers" });
});

test("weather accepts the legacy TV endpoint interval date fallback", async () => {
  const fetchImpl = makeFetch([{ match: "weather.googleapis.com", reply: response({ json: { forecastDays: [{ interval:{startTime:"2026-08-04T12:00:00Z"}, maxTemperature:{degrees:87}, minTemperature:{degrees:76}, daytimeForecast:{precipitation:{probability:{percent:25}}, weatherCondition:{description:{text:"Mostly sunny"}}} }] } }) }]);
  const services = createServices({ fetchImpl, env: { GOOGLE_WEATHER_API_KEY: "k" }, now: () => NOW, logger: quiet });
  const r = await services.fetchDestinWeather();
  assert.equal(r.status, "success");
  assert.deepEqual(r.forecast[0], { date:"2026-08-04", hi:87, lo:76, rain:25, desc:"Mostly sunny" });
});

test("weather HTTP failure is honest", async () => {
  const fetchImpl = makeFetch([{ match: "weather.googleapis.com", reply: response({ ok:false, status:429 }) }]);
  const services = createServices({ fetchImpl, env: { GOOGLE_WEATHER_API_KEY: "k" }, now: () => NOW, logger: quiet });
  const r = await services.fetchDestinWeather(); assert.equal(r.status, "unavailable"); assert.equal(r.reason, "http_429");
});

test("beach conditions combine official Destin flag, NWS Okaloosa surf product, and coastal alerts", async () => {
  const productText = `Surf Zone Forecast\nFLZ202-204-206-030800-\nEscambia Coastal-Santa Rosa Coastal-Okaloosa Coastal-\nIncluding the beaches of Fort Walton Beach, and Destin\n.TODAY...\nRip Current Risk*...........High.\nSurf Height.................3 to 5 feet.\nWater Temperature...........In the mid 80s.\nWeather.....................Mostly cloudy.\nWinds.......................Southwest winds around 20 mph.\n.TONIGHT...\nRip Current Risk*...........High.\n&&`;
  const fetchImpl = makeFetch([
    { match: "destinfire.gov", reply: response({ text: "<h3>Current Status: Water Closed to Public</h3>" }) },
    { match: "products/types/SRF/locations/MOB", reply: response({ json: { "@graph": [{ id: "surf-1", "@id": "https://api.weather.gov/products/surf-1", issuanceTime: "2026-08-02T08:03:00+00:00" }] } }) },
    { match: /api\.weather\.gov\/products\/surf-1$/, reply: response({ json: { productText } }) },
    { match: "alerts/active?zone=FLZ206", reply: response({ json: { features: [{ id: "https://api.weather.gov/alerts/rip-1", properties: { event: "Rip Current Statement", severity: "Moderate", urgency: "Expected", headline: "High Rip Current Risk", effective: "2026-08-02T08:00:00Z", expires: "2026-08-03T05:00:00Z" } }] } }) },
  ]);
  const services = createServices({ fetchImpl, env: {}, now: () => NOW, logger: quiet });
  const r = await services.fetchBeachConditions();
  assert.equal(r.status, "success");
  assert.equal(r.flag.value, "Water Closed to Public");
  assert.equal(r.surf.ripCurrentRisk, "High.");
  assert.equal(r.surf.surfHeight, "3 to 5 feet.");
  assert.equal(r.surf.waterTemperature, "In the mid 80s.");
  assert.equal(r.alerts.items[0].event, "Rip Current Statement");
});

test("beach conditions fail partially without converting missing sources into safe conditions", async () => {
  const fetchImpl = makeFetch([
    { match: "destinfire.gov", reply: response({ text: "page changed" }) },
    { match: "products/types/SRF/locations/MOB", reply: response({ ok: false, status: 503 }) },
    { match: "alerts/active?zone=FLZ206", reply: response({ json: { features: [] } }) },
  ]);
  const services = createServices({ fetchImpl, env: {}, now: () => NOW, logger: quiet });
  const r = await services.fetchBeachConditions();
  assert.equal(r.status, "partial");
  assert.equal(r.flag.status, "unavailable");
  assert.equal(r.surf.status, "unavailable");
  assert.equal(r.alerts.status, "success");
});

test("itinerary guide is code-owned and performs no fetch", async () => {
  const fetchImpl = makeFetch(); const services = createServices({ fetchImpl, env: {}, now: () => NOW, logger: quiet });
  const r = await services.fetchBlogContent("itinerary"); assert.equal(r.status, "success"); assert.equal(fetchImpl.calls.length, 0);
});

test("blog fetch strips scripts, styles, tags, and decodes basic entities", async () => {
  const fetchImpl = makeFetch([{ match: "best-restaurants-destin", reply: response({ text: "<script>bad()</script><style>x</style><h1>Food &amp; Fun</h1><p>A&nbsp;B</p>" }) }]);
  const services = createServices({ fetchImpl, env: {}, now: () => NOW, logger: quiet });
  const r = await services.fetchBlogContent("restaurants"); assert.equal(r.content, "Food & Fun A B"); assert.doesNotMatch(r.content, /bad|style|<h1>/);
});

test("invalid blog topic is rejected without fetch", async () => {
  const fetchImpl = makeFetch(); const services = createServices({ fetchImpl, env: {}, now: () => NOW, logger: quiet });
  const r = await services.fetchBlogContent("not-real"); assert.equal(r.status, "invalid_topic"); assert.equal(fetchImpl.calls.length, 0);
});

function bookingPayload(overrides = {}) {
  return {
    status: "confirmed", is_block: false, arrival: "2026-07-25", departure: "2026-07-30",
    guest:{first_name:"Sam",last_name:"Guest"}, property:{id:"293722",name:"Pelican 707"},
    door_codes:[{code:"4321"}], adults:2, children:0, ...overrides,
  };
}

test("guest booking requires OwnerRez configuration", async () => {
  const services = createServices({ fetchImpl: makeFetch(), env: {}, now: () => NOW, logger: quiet }); assert.equal(await services.fetchGuestBooking("B1"), null);
});

for (const override of [{status:"canceled"},{status:"cancelled"},{is_block:true}]) {
  test(`guest booking rejects ${JSON.stringify(override)}`, async () => {
    const fetchImpl=makeFetch([{match:"api.ownerrez.com/v2/bookings/B1",reply:response({json:bookingPayload(override)})}]);
    const services=createServices({fetchImpl,env:{OWNERREZ_API_TOKEN:"x"},now:()=>NOW,logger:quiet}); assert.equal(await services.fetchGuestBooking("B1"),null);
  });
}

test("guest booking releases door code within seven days", async () => {
  const fetchImpl=makeFetch([{match:"api.ownerrez.com/v2/bookings/B1",reply:response({json:bookingPayload()})}]);
  const services=createServices({fetchImpl,env:{OWNERREZ_API_TOKEN:"x"},now:()=>NOW,logger:quiet}); const b=await services.fetchGuestBooking("B1");
  assert.equal(b.unit,"707"); assert.equal(b.doorCode,"4321"); assert.equal(b.showDoorCode,true);
});

test("guest booking withholds door code more than seven days out", async () => {
  const fetchImpl=makeFetch([{match:"api.ownerrez.com/v2/bookings/B1",reply:response({json:bookingPayload({arrival:"2026-08-05",departure:"2026-08-10"})})}]);
  const services=createServices({fetchImpl,env:{OWNERREZ_API_TOKEN:"x"},now:()=>NOW,logger:quiet}); const b=await services.fetchGuestBooking("B1"); assert.equal(b.doorCode,null); assert.equal(b.showDoorCode,false);
});

test("guest booking withholds door code after checkout", async () => {
  const fetchImpl=makeFetch([{match:"api.ownerrez.com/v2/bookings/B1",reply:response({json:bookingPayload({arrival:"2026-07-10",departure:"2026-07-15"})})}]);
  const services=createServices({fetchImpl,env:{OWNERREZ_API_TOKEN:"x"},now:()=>NOW,logger:quiet}); const b=await services.fetchGuestBooking("B1"); assert.equal(b.isCheckedOut,true); assert.equal(b.doorCode,null);
});

test("guest booking rejects an unknown property instead of misclassifying it as 1006", async () => {
  const fetchImpl=makeFetch([{match:"api.ownerrez.com/v2/bookings/B1",reply:response({json:bookingPayload({property:{id:"999",name:"Mystery Unit"}})})}]);
  const services=createServices({fetchImpl,env:{OWNERREZ_API_TOKEN:"x"},now:()=>NOW,logger:quiet}); assert.equal(await services.fetchGuestBooking("B1"),null);
});

test("availability ignores canceled conflicts", async () => {
  const fetchImpl=makeFetch([{match:"api.ownerrez.com/v2/bookings?",reply:response({json:{items:[{status:"cancelled",arrival:"2026-08-05",departure:"2026-08-10"}]}})}]);
  const services=createServices({fetchImpl,env:{OWNERREZ_API_TOKEN:"x"},now:()=>NOW,logger:quiet}); assert.equal(await services.checkAvailability("293722","2026-08-05","2026-08-10",1),true);
});

test("availability detects date overlap but allows adjacent checkout/checkin", async () => {
  const fetchImpl=makeFetch([{match:"api.ownerrez.com/v2/bookings?",reply:response({json:{items:[{status:"confirmed",arrival:"2026-08-10",departure:"2026-08-15"}]}})}]);
  const services=createServices({fetchImpl,env:{OWNERREZ_API_TOKEN:"x"},now:()=>NOW,logger:quiet});
  assert.equal(await services.checkAvailability("293722","2026-08-05","2026-08-10",1),true);
  assert.equal(await services.checkAvailability("293722","2026-08-09","2026-08-11",1),false);
});

test("availability returns null without token", async () => {
  const services=createServices({fetchImpl:makeFetch(),env:{},now:()=>NOW,logger:quiet}); assert.equal(await services.checkAvailability("293722","2026-08-05","2026-08-10",1),null);
});

test("findOpenWindows bounds results to five open windows", async () => {
  const fetchImpl=makeFetch([{match:"api.ownerrez.com/v2/bookings?",reply:response({json:{items:[]}})}]);
  const services=createServices({fetchImpl,env:{OWNERREZ_API_TOKEN:"x"},now:()=>NOW,logger:quiet}); const r=await services.findOpenWindows({targetArrival:"2026-08-05",targetDeparture:"2026-08-10",flexibilityDays:10}); assert.equal(r.length,5);
});

test("Brevo accepts 201 and uses updateEnabled", async () => {
  const fetchImpl=makeFetch([{match:"api.brevo.com/v3/contacts",reply:(url,opt)=>{const body=JSON.parse(opt.body); assert.equal(body.updateEnabled,true); assert.deepEqual(body.listIds,[5]); return response({status:201});}}]);
  const services=createServices({fetchImpl,env:{BREVO_API_KEY:"x"},now:()=>NOW,logger:quiet}); assert.deepEqual(await services.addBrevoContact("a@b.com","Sam"),{captured:true});
});

test("Brevo reports non-success HTTP", async () => {
  const fetchImpl=makeFetch([{match:"api.brevo.com/v3/contacts",reply:response({ok:false,status:400,text:"bad"})}]);
  const services=createServices({fetchImpl,env:{BREVO_API_KEY:"x"},now:()=>NOW,logger:quiet}); const r=await services.addBrevoContact("a@b.com","Sam"); assert.equal(r.captured,false); assert.equal(r.reason,"http_400");
});

test("price drops filters invalid commercial data", async () => {
  const fetchImpl=makeFetch([{match:"api/price-drops",reply:response({json:{"707":{dropPct:12,windowDays:7,fromPrice:300,toPrice:264},"1006":{dropPct:99,windowDays:7,fromPrice:300,toPrice:100}}})}]);
  const services=createServices({fetchImpl,env:{},now:()=>NOW,logger:quiet}); const r=await services.fetchPriceDrops("2026-08-05","2026-08-10"); assert.equal(r.drops.length,1); assert.equal(r.drops[0].unit,"707");
});

test("beach deals reader parses active page data and returns closest reduced dates", async () => {
  const deals=[
    {unit:"707",arrival:"2026-08-08",departure:"2026-08-12",nights:4,dropPct:10,fromPrice:300,toPrice:270,totalSavings:120,purchased:false},
    {unit:"1006",arrival:"2026-09-01",departure:"2026-09-05",nights:4,dropPct:15,fromPrice:320,toPrice:272,totalSavings:192,purchased:false},
    {unit:"707",arrival:"2026-08-05",departure:"2026-08-10",nights:5,dropPct:20,fromPrice:350,toPrice:280,totalSavings:350,purchased:true},
  ];
  const html=`<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({props:{pageProps:{deals}}})}</script></html>`;
  const fetchImpl=makeFetch([{match:"deals.destincondogetaways.com/beach-deals",reply:response({text:html})}]);
  const services=createServices({fetchImpl,env:{},now:()=>NOW,logger:quiet});
  const r=await services.fetchBeachDeals({arrival:"2026-08-05",departure:"2026-08-10",limit:3});
  assert.equal(r.status,"success");
  assert.equal(r.matchType,"nearby");
  assert.equal(r.deals[0].arrival,"2026-08-08");
  assert.equal(r.deals.some(deal=>deal.purchased),false);
});

test("guest-link signature supports legacy mode when secret is absent", () => {
  const services=createServices({fetchImpl:makeFetch(),env:{},now:()=>NOW,logger:quiet}); assert.deepEqual(services.verifyGuestLinkSignature("B1",null),{ok:true,legacy:true});
});

test("guest-link signature validates HMAC and rejects tampering", () => {
  const secret="secret"; const sig=createHmac("sha256",secret).update("B1").digest("base64url");
  const services=createServices({fetchImpl:makeFetch(),env:{GUEST_LINK_SECRET:secret},now:()=>NOW,logger:quiet});
  assert.deepEqual(services.verifyGuestLinkSignature("B1",sig),{ok:true,legacy:false}); assert.equal(services.verifyGuestLinkSignature("B1","bad").ok,false);
});

test("Google Sheets token generation signs a JWT when configured", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem=privateKey.export({type:"pkcs8",format:"pem"});
  const fetchImpl=makeFetch([{match:"oauth2.googleapis.com/token",reply:(url,opt)=>{assert.match(opt.body,/assertion=/); return response({json:{access_token:"token"}});}}]);
  const services=createServices({fetchImpl,env:{GOOGLE_SERVICE_ACCOUNT_EMAIL:"svc@example.com",GOOGLE_PRIVATE_KEY:pem},now:()=>NOW,logger:quiet}); assert.equal(await services.getSheetsToken(1),"token");
});
