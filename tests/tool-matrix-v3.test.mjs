import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingLink,
  createDefaultState,
  normalizeState,
} from "../lib/destiny-agent/business.js";
import { executeTool, mergeToolPatch } from "../lib/destiny-agent/orchestrator.js";
import { NOW, bookingArgs, context, makeMockServices } from "./test-helpers.mjs";

async function exec(name, args, latestUser, { state = createDefaultState(), services = makeMockServices(), overrides = {} } = {}) {
  return executeTool(name, args, context(state, latestUser, services, overrides));
}

test("remember_booking_details stores explicit values and preserves null children", async () => {
  const r = await exec("remember_booking_details", {
    date_text: "Aug 5-10", date_role: "range", arrival: null, departure: null,
    adults: 2, adults_evidence: "2 adults", children: null, children_evidence: null,
    total_guests: null, total_guests_evidence: null, preferred_unit: "707", bedrooms_requested: null, bedrooms_evidence: null,
  }, "Aug 5-10, 2 adults, prefer 707");
  const state = mergeToolPatch(createDefaultState(), r.statePatch);
  assert.equal(state.booking.arrival, "2026-08-05"); assert.equal(state.booking.adults, 2); assert.equal(state.booking.children, null); assert.ok(state.awaiting.includes("children"));
});

test("remember_booking_details rejects fabricated evidence", async () => {
  const r = await exec("remember_booking_details", {
    date_text: "Aug 5-10", date_role: "range", arrival: null, departure: null,
    adults: 6, adults_evidence: "6 adults", children: 0, children_evidence: "no kids",
    total_guests: null, total_guests_evidence: null, preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null,
  }, "Aug 5-10 for me and my wife");
  const state = mergeToolPatch(createDefaultState(), r.statePatch);
  assert.equal(state.booking.adults, null); assert.equal(state.booking.children, null);
});

test("remember_booking_details rejects past-trip counts but accepts current counts in another clause", async () => {
  const latest = "Last time there were 6 adults. This trip is 2 adults and no kids.";
  const r = await exec("remember_booking_details", {
    date_text: null, date_role: null, arrival: null, departure: null,
    adults: 2, adults_evidence: "2 adults", children: 0, children_evidence: "no kids",
    total_guests: null, total_guests_evidence: null, preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null,
  }, latest);
  const state = mergeToolPatch(createDefaultState(), r.statePatch);
  assert.equal(state.booking.adults, 2); assert.equal(state.booking.children, 0);
});

test("zero children requires explicit no-child evidence", async () => {
  const r = await exec("remember_booking_details", {
    date_text: null, date_role: null, arrival: null, departure: null,
    adults: 2, adults_evidence: "2 adults", children: 0, children_evidence: "children",
    total_guests: null, total_guests_evidence: null, preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null,
  }, "2 adults, children not discussed");
  const state = mergeToolPatch(createDefaultState(), r.statePatch);
  assert.equal(state.booking.children, null);
});

const availMatrices = [
  [{ "707": true, "1006": true }, "success", 2],
  [{ "707": true, "1006": false }, "success", 1],
  [{ "707": false, "1006": true }, "success", 1],
  [{ "707": false, "1006": false }, "unavailable", 0],
  [{ "707": null, "1006": null }, "partial_failure", 0],
  [{ "707": true, "1006": null }, "partial_failure", 0],
];
for (const [matrix, status, linkCount] of availMatrices) {
  test(`availability matrix ${JSON.stringify(matrix)}`, async () => {
    const services = makeMockServices({ async checkBothUnits(a,d) { services.calls.checkBothUnits.push({arrival:a,departure:d}); return matrix; } });
    const r = await exec("check_availability", bookingArgs({ preferredUnit: "707" }), "August 5-10, 2 adults, no kids, unit 707", { services });
    assert.equal(r.status, status); assert.equal(r.urls.length, linkCount);
    for (const u of r.data.units || []) assert.equal(Boolean(u.bookingUrl), status === "success" && u.available === true);
  });
}

test("availability with both booked returns verified partial calendar alternatives", async () => {
  const services = makeMockServices({
    async checkBothUnits() { return { "707": false, "1006": false }; },
    async fetchCalendarAlternatives() { return { unit707: { longestWindow: { from: "2026-08-05", to: "2026-08-08" } }, unit1006: { longestWindow: { from: "2026-08-07", to: "2026-08-10" } } }; },
  });
  const r = await exec("check_availability", bookingArgs(), "August 5-10, 2 adults, no kids", { services });
  assert.equal(r.status, "unavailable"); assert.equal(r.data.alternatives.length, 2); assert.equal(r.urls.length, 2);
});

test("availability ignores too-short partial window", async () => {
  const services = makeMockServices({
    async checkBothUnits() { return { "707": false, "1006": false }; },
    async fetchCalendarAlternatives() { return { unit707: { longestWindow: { from: "2026-08-05", to: "2026-08-06" } } }; },
  });
  const r = await exec("check_availability", bookingArgs(), "August 5-10, 2 adults, no kids", { services });
  assert.deepEqual(r.data.alternatives, []);
});

test("availability exposes verified price-drop facts without inventing totals", async () => {
  const services = makeMockServices({ async fetchPriceDrops() { return { status: "success", drops: [{ unit: "707", dropPct: 12, windowDays: 7, fromPrice: 300, toPrice: 264 }] }; } });
  const r = await exec("check_availability", bookingArgs(), "August 5-10, 2 adults, no kids", { services });
  assert.match(r.facts.join(" "), /12%/); assert.match(r.facts.join(" "), /\$300/);
});

test("availability yearless past dates roll forward", async () => {
  const services = makeMockServices();
  const r = await exec("check_availability", bookingArgs({ dateText: "June 5-10" }), "June 5-10, 2 adults, no kids", { services });
  assert.equal(r.data.query.arrival, "2027-06-05");
});

test("availability explicit past dates are rejected", async () => {
  const r = await exec("check_availability", bookingArgs({ dateText: "June 5-10, 2026" }), "June 5-10, 2026, 2 adults, no kids");
  assert.equal(r.ok, false); assert.equal(r.status, "past_dates");
});

test("adult-only availability uses zero children as the disclosed baseline", async () => {
  const services = makeMockServices();
  const r = await exec("check_availability", bookingArgs({ children: null, childrenEvidence: null }), "August 5-10, 2 adults", { services });
  assert.equal(r.status, "success"); assert.equal(services.calls.checkBothUnits.length, 1);
});

test("availability total-only party requires composition", async () => {
  const r = await exec("check_availability", bookingArgs({ adults: null, adultsEvidence: null, children: null, childrenEvidence: null, totalGuests: 8, totalGuestsEvidence: "8 people" }), "August 5-10, 8 people");
  assert.equal(r.status, "needs_party_composition"); assert.match(r.facts.join(" "), /exceeds the six-person limit/i);
});

test("availability rejects more than twelve total guests", async () => {
  const r = await exec("check_availability", bookingArgs({ adults: 7, adultsEvidence: "7 adults", children: 6, childrenEvidence: "6 children" }), "August 5-10, 7 adults and 6 children");
  assert.equal(r.status, "occupancy_exceeded");
});

test("availability rejects HOA adult-to-child violation", async () => {
  const r = await exec("check_availability", bookingArgs({ adults: 1, adultsEvidence: "1 adult", children: 4, childrenEvidence: "4 children" }), "August 5-10, 1 adult and 4 children");
  assert.equal(r.status, "hoa_violation");
});

test("availability returns no_valid_two_unit_split when aggregate party cannot be distributed", async () => {
  const r = await exec("check_availability", bookingArgs({ adults: 3, adultsEvidence: "3 adults", children: 8, childrenEvidence: "8 children" }), "August 5-10, 3 adults and 8 children");
  assert.equal(r.status, "no_valid_two_unit_split");
});

test("two-unit availability produces exactly two links only when both condos are open", async () => {
  const services = makeMockServices({ async checkBothUnits() { return { "707": true, "1006": true }; } });
  const r = await exec("check_availability", bookingArgs({ adults: 4, adultsEvidence: "4 adults", children: 4, childrenEvidence: "4 children" }), "August 5-10, 4 adults and 4 children", { services });
  assert.equal(r.status, "success"); assert.equal(r.urls.length, 2); assert.equal(r.data.needsTwoUnits, true);
});

test("two-unit availability fails closed if one condo is not confirmed", async () => {
  const services = makeMockServices({ async checkBothUnits() { return { "707": true, "1006": null }; } });
  const r = await exec("check_availability", bookingArgs({ adults: 4, adultsEvidence: "4 adults", children: 4, childrenEvidence: "4 children" }), "August 5-10, 4 adults and 4 children", { services });
  assert.equal(r.urls.length, 0); assert.equal(r.data.units.every(u => u.bookingUrl === null), true);
});

test("find_open_windows builds links only for confirmed windows", async () => {
  const services = makeMockServices({ async findOpenWindows(args) { services.calls.findOpenWindows.push(args); return [
    { arrival: "2026-08-06", departure: "2026-08-11", units: { "707": true, "1006": false } },
    { arrival: "2026-08-07", departure: "2026-08-12", units: { "707": null, "1006": true } },
  ]; } });
  const args = { target_date_text: "August 5-10", target_arrival: null, target_departure: null, flexibility_days: 3, adults: 2, adults_evidence: "2 adults", children: 0, children_evidence: "no kids", total_guests: null, total_guests_evidence: null };
  const r = await exec("find_open_windows", args, "August 5-10, 2 adults, no kids; flexible by 3 days", { services });
  assert.equal(r.status, "success"); assert.equal(r.urls.length, 2); assert.equal(r.data.options.length, 2);
});

test("find_open_windows two-unit option requires both condos", async () => {
  const services = makeMockServices({ async findOpenWindows() { return [
    { arrival: "2026-08-06", departure: "2026-08-11", units: { "707": true, "1006": false } },
    { arrival: "2026-08-07", departure: "2026-08-12", units: { "707": true, "1006": true } },
  ]; } });
  const args = { target_date_text: "August 5-10", target_arrival: null, target_departure: null, flexibility_days: 3, adults: 4, adults_evidence: "4 adults", children: 4, children_evidence: "4 children", total_guests: null, total_guests_evidence: null };
  const r = await exec("find_open_windows", args, "August 5-10, 4 adults, 4 children; flexible 3 days", { services });
  assert.equal(r.data.options.length, 1); assert.equal(r.urls.length, 2);
});

test("existing booking refuses absent server booking id", async () => {
  const services = makeMockServices(); const r = await exec("get_existing_booking", {}, "What is my door code?", { services });
  assert.equal(r.status, "not_authorized"); assert.equal(services.calls.fetchGuestBooking.length, 0);
});

test("existing booking refuses invalid signature", async () => {
  const services = makeMockServices({ verifyGuestLinkSignature() { return { ok: false, reason: "invalid_signature" }; } });
  const r = await exec("get_existing_booking", {}, "What is my door code?", { services, overrides: { guestBid: "B123", guestSig: "bad" } });
  assert.equal(r.status, "not_authorized"); assert.equal(services.calls.fetchGuestBooking.length, 0);
});

test("existing booking returns only service-verified booking", async () => {
  const booking = { bookingId: "B123", unit: "707", arrival: "2026-08-05", departure: "2026-08-10", adults: 2, children: 0, doorCode: "4321" };
  const services = makeMockServices({ async fetchGuestBooking(id) { services.calls.fetchGuestBooking.push(id); return booking; } });
  const r = await exec("get_existing_booking", {}, "What is my door code?", { services, overrides: { guestBid: "B123", guestSig: "ok" } });
  assert.equal(r.ok, true); assert.equal(r.data.doorCode, "4321"); assert.equal(r.statePatch.existingGuest.bookingId, "B123");
});

test("resend booking links requires current booking details instead of trusting stale verification", async () => {
  const state = createDefaultState(); state.verified.bookingUrls = [buildBookingLink("707","2026-08-05","2026-08-10",2,0)]; state.verified.availabilityCheckedAt = "2026-07-20T07:00:00-05:00"; state.verified.availabilityQuery = { arrival:"2026-08-05", departure:"2026-08-10", adults:2, children:0 };
  const r = await exec("build_booking_links", {}, "Send the links again", { state }); assert.equal(r.status, "missing_or_invalid_dates");
});

test("resend booking links never returns persisted URLs without current booking details", async () => {
  const state = createDefaultState(); const url = buildBookingLink("707","2026-08-05","2026-08-10",2,0);
  state.verified.bookingUrls = [url]; state.verified.availabilityCheckedAt = NOW.toISOString(); state.verified.availabilityQuery = { arrival:"2026-08-05", departure:"2026-08-10", adults:2, children:0 }; state.verified.availabilityUnits={"707":true,"1006":false};
  const r = await exec("build_booking_links", {}, "Send the links again", { state }); assert.deepEqual(r.urls, []); assert.equal(r.status, "missing_or_invalid_dates");
});

test("flight search asks for origin without guessing", async () => {
  const state = createDefaultState(); Object.assign(state.booking, { arrival:"2026-08-05", departure:"2026-08-10", adults:2, children:0 });
  const r = await exec("build_flight_search", { origin_text:"Londn", destination_iata:"VPS", infants:0 }, "I fly from Londn", { state });
  assert.equal(r.status, "needs_origin"); assert.deepEqual(r.urls, []);
});

test("flight search stores origin while asking for missing trip details", async () => {
  const r = await exec("build_flight_search", { origin_text:"Dallas", destination_iata:"VPS", infants:0 }, "I fly from Dallas");
  assert.equal(r.status, "needs_booking_details"); assert.equal(r.statePatch.flight.originIata, "DFW");
});

test("flight search accepts lowercase IATA and uses stored trip state", async () => {
  const state = createDefaultState(); Object.assign(state.booking, { arrival:"2026-08-05", departure:"2026-08-10", adults:2, children:0 });
  const r = await exec("build_flight_search", { origin_text:"dfw", destination_iata:"VPS", infants:1 }, "dfw", { state });
  assert.equal(r.status, "success"); assert.match(r.urls[0], /DFW0508VPS10083/);
});

test("flight search preserves a full numeric round-trip range from Agent Test Case T051", async () => {
  const latestUser = "Find me a flight from Denver, 07/07/2027-07/14/2027, 2 adults, 2 kids, 1 infant.";
  const r = await exec("build_flight_search", {
    origin_text: "Denver",
    destination_iata: "VPS",
    date_text: "07/07/2027-07/14/2027",
    departure_date: "2027-07-07",
    return_date: "2027-07-14",
    adults: 2,
    adults_evidence: "2 adults",
    children: 2,
    children_evidence: "2 kids",
    infants: 1,
  }, latestUser, { overrides: { messages: [{ role: "user", content: latestUser }] } });
  assert.equal(r.status, "success");
  assert.equal(r.data.departureDate, "2027-07-07");
  assert.equal(r.data.returnDate, "2027-07-14");
  assert.match(r.urls[0], /DEN0707VPS14075/);
  assert.match(r.urls[0], /marker=709191/);
});

test("weather tool propagates unavailable status honestly", async () => {
  const services = makeMockServices({ async fetchDestinWeather() { return { status:"unavailable", reason:"http_500", forecast:[] }; } });
  const r = await exec("get_destin_weather", {}, "What is the weather?", { services }); assert.equal(r.ok, false); assert.equal(r.status, "unavailable"); assert.deepEqual(r.facts, []);
});

test("beach conditions expose official flag and NWS surf facts without declaring safety", async () => {
  const r = await exec("get_beach_conditions", {}, "Are the Gulf water conditions safe today?");
  assert.equal(r.status, "success");
  assert.match(r.facts.join(" "), /Destin Fire current beach flag status: Medium Hazard/i);
  assert.match(r.facts.join(" "), /rip-current risk Moderate/i);
  assert.match(r.facts.join(" "), /Never describe the water as safe/i);
});

test("photo guide returns only code-owned URLs", async () => {
  const r = await exec("get_local_guide", { topic:"photos" }, "Show me photos"); assert.equal(r.urls.length, 4); assert.equal(r.urls.every(u => /^https:\/\/www\.destincondogetaways\.com/.test(u)), true);
});

test("local guide failure keeps known source URL but reports unavailable", async () => {
  const services = makeMockServices({ async fetchBlogContent(topic) { return { status:"unavailable", topic, content:null, url:`https://www.destincondogetaways.com/blog/${topic}` }; } });
  const r = await exec("get_local_guide", { topic:"restaurants" }, "Restaurants?", { services }); assert.equal(r.ok, false); assert.equal(r.urls.length, 1);
});

test("car guide uses positive actionable DiscoverCars guidance", async () => {
  const r = await exec("get_local_guide", { topic:"car" }, "I need a rental car");
  assert.equal(r.data.topic, "car");
  assert.match(r.facts.join(" "), /open the DiscoverCars link.*check current vehicles, prices, and availability/i);
  assert.doesNotMatch(r.facts.join(" "), /not prefilled|unverified/i);
});

test("activity tool uses a single date as a one-day window", async () => {
  const r = await exec("get_activity_options", { category:"dolphin", date_text:"August fifth", arrival:null, departure:null }, "Dolphin cruise August fifth");
  assert.deepEqual(r.data.dates, { arrival:"2026-08-05", departure:"2026-08-06" });
  assert.match(r.facts.join(" "), /open the link to check current prices, times, and availability/i);
});

test("activity holiday dates use the same disclosed lodging assumption", async () => {
  const r = await exec("get_activity_options", { category:"dolphin", date_text:"Christmas 2026", date_confidence:"contextual", holiday_name:"christmas", holiday_evidence:"Christmas 2026", start_date:null, end_date:null, arrival:null, departure:null }, "Dolphin cruise for Christmas 2026");
  assert.deepEqual(r.data.dates, { arrival:"2026-12-23", departure:"2026-12-27" });
});

test("maintenance alert reports accidental guest damage", async () => {
  const services = makeMockServices(); const r = await exec("create_maintenance_alert", { severity:"maintenance", summary:"broken glass" }, "I accidentally broke a glass", { services });
  assert.equal(r.status, "sent"); assert.equal(services.calls.sendEmergencyDiscord.length, 1);
});

test("maintenance alert reports external disturbance", async () => {
  const services = makeMockServices(); const r = await exec("create_maintenance_alert", { severity:"maintenance", summary:"drilling" }, "There is drilling next door", { services });
  assert.equal(r.status, "sent"); assert.equal(services.calls.sendEmergencyDiscord.length, 1);
});

test("lockout severity is upgraded to emergency by code", async () => {
  const services = makeMockServices(); const r = await exec("create_maintenance_alert", { severity:"maintenance", summary:"door" }, "I'm locked out and the code doesn't work", { services });
  assert.equal(r.data.severity, "emergency"); assert.equal(services.calls.sendEmergencyDiscord.length, 1);
});

test("repeated maintenance issue is reported again", async () => {
  const state = createDefaultState(); state.openIssues=[{type:"maintenance",description:"The AC is not cooling",status:"open"}];
  const services = makeMockServices(); const r = await exec("create_maintenance_alert", { severity:"maintenance", summary:"AC" }, "The AC is not cooling", { state, services });
  assert.equal(r.status, "sent"); assert.equal(services.calls.sendEmergencyDiscord.length, 1);
});

test("lead capture requires popup/banner eligibility", async () => {
  const services = makeMockServices(); const r = await exec("capture_lead", { email:"guest@example.com", first_name:"Sam" }, "guest@example.com", { services });
  assert.equal(r.status, "not_approved"); assert.equal(services.calls.addBrevoContact.length, 0);
});

test("lead capture requires exact email from latest message", async () => {
  const services = makeMockServices(); const r = await exec("capture_lead", { email:"other@example.com", first_name:"Sam" }, "guest@example.com", { services, overrides:{pageSource:"popup"} });
  assert.equal(r.status, "not_approved");
});

test("lead capture unlocks BLUE only after Brevo success", async () => {
  const services = makeMockServices(); const r = await exec("capture_lead", { email:"guest@example.com", first_name:"Sam" }, "My email is guest@example.com", { services, overrides:{pageSource:"popup"} });
  assert.equal(r.status, "captured"); assert.equal(r.statePatch.lead.blueCodeRevealed, true);
});

test("unit facts returns all requested fact categories", async () => {
  const topics=["units","terrace","bedrooms","laundry","amenities","resort","occupancy","pets","smoking","parking","beach_chairs","wifi","checkin","comparison"];
  const r = await exec("get_unit_facts", { topics }, "Tell me everything about the units"); assert.equal(r.data.facts.length, topics.length);
});

test("owner relay requires explicit request", async () => {
  const services=makeMockServices(); const r=await exec("relay_owner_message",{message_summary:"Need towels"},"We need towels",{services}); assert.equal(r.status,"not_explicitly_requested");
});

test("owner relay can enter pending-message state", async () => {
  const r=await exec("relay_owner_message",{message_summary:""},"Can you send Ozan a message?"); assert.equal(r.status,"needs_message"); assert.equal(r.statePatch.ownerChat.relayPending,true);
});

test("pending owner relay accepts next message", async () => {
  const state=createDefaultState(); state.ownerChat.relayPending=true; state.awaiting=["relay_message"];
  const services=makeMockServices(); const r=await exec("relay_owner_message",{message_summary:"Need extra towels"},"We need extra towels",{state,services}); assert.equal(r.status,"sent"); assert.equal(services.calls.sendEmergencyDiscord.length,1);
});

test("owner chat invite never exposes internal entry URL to model", async () => {
  const services=makeMockServices(); const r=await exec("request_owner_chat",{},"Can I speak to Ozan?",{services}); assert.equal(r.status,"invited"); assert.deepEqual(r.urls,[]); assert.equal("enterChatUrl" in r.data,false);
  const persisted = services.calls.writeSessState[0][1].ozanMessages;
  assert.equal(persisted.length,1);
  assert.deepEqual({ role: persisted[0].role, text: persisted[0].text }, { role:"guest", text:"Can I speak to Ozan?" });
});

test("explicit invite and join wording authorizes owner chat", async () => {
  for (const message of ["Invite Ozan into this live chat.", "Can the owner join this chat?"]) {
    const services=makeMockServices();
    const r=await exec("request_owner_chat",{},message,{services});
    assert.equal(r.status,"invited");
    assert.equal(services.calls.sendOwnerChatInvite.length,1);
  }
});

test("owner chat invite is deduplicated if already pending", async () => {
  const services=makeMockServices({async readSessState(){return {ozanActive:"PENDING",inviteToken:"abc"};}}); const r=await exec("request_owner_chat",{},"Talk to the owner",{services}); assert.equal(r.status,"already_invited"); assert.equal(services.calls.sendOwnerChatInvite.length,0);
});

test("business knowledge returns snippets and explicit URLs", async () => {
  const r=await exec("get_business_knowledge",{query:"Can I bring a dog?",topics:["policies"],limit:4},"Can I bring a dog?"); assert.equal(r.status,"success"); assert.match(r.facts.join(" "),/no-pets|Zero exceptions/i);
});

test("unknown tool fails safely", async () => { const r=await exec("made_up_tool",{},"hello"); assert.equal(r.status,"unknown_tool"); assert.equal(r.ok,false); });
