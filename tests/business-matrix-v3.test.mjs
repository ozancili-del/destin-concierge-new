import test from "node:test";
import assert from "node:assert/strict";
import {
  STATIC_URLS,
  UNITS,
  addIsoDays,
  applyStatePatch,
  buildBookingLink,
  buildFlightLink,
  buildTripShockLink,
  collectAllowedUrls,
  createDefaultState,
  detectAccidentalDamage,
  detectBedroomMismatch,
  detectEscalation,
  detectExcessGuests,
  detectExternalDisturbance,
  detectLockedOut,
  detectMaintenance,
  detectOwnerChatRequest,
  detectPets,
  detectResolutionMessage,
  detectScamCrisis,
  diffNights,
  extractDates,
  extractEmail,
  extractHolidayDates,
  extractOrigin,
  extractSingleDate,
  extractUrls,
  findValidTwoUnitSplits,
  inferLegacyState,
  isBookingUrl,
  isIsoDate,
  isValidEmail,
  isValidOriginIata,
  normalizeMonths,
  normalizeNullableInteger,
  normalizeState,
  parseDateAdjustment,
  parseDateText,
  todayIso,
  validateDateRange,
  validateParty,
  validateReply,
} from "../lib/destiny-agent/business.js";
import { NOW } from "./test-helpers.mjs";

const dateCases = [
  ["Aug 5-10", "2026-08-05", "2026-08-10"],
  ["August 5 through 10", "2026-08-05", "2026-08-10"],
  ["August fifth to tenth", "2026-08-05", "2026-08-10"],
  ["5-10 August", "2026-08-05", "2026-08-10"],
  ["5 to 10 August", "2026-08-05", "2026-08-10"],
  ["August 5 until August 10", "2026-08-05", "2026-08-10"],
  ["8/5-8/10", "2026-08-05", "2026-08-10"],
  ["8/5 until 8/10", "2026-08-05", "2026-08-10"],
  ["8.5 to 8.10", "2026-08-05", "2026-08-10"],
  ["2026-08-05 to 2026-08-10", "2026-08-05", "2026-08-10"],
  ["Dec 29 - Jan 3", "2026-12-29", "2027-01-03"],
  ["December 29, 2026 to January 3, 2027", "2026-12-29", "2027-01-03"],
  ["3-8/9 of June", "2026-06-03", "2026-06-09"],
  ["agust 5-10", "2026-08-05", "2026-08-10"],
  ["ocotber 2-7", "2026-10-02", "2026-10-07"],
  ["decmber 24-27", "2026-12-24", "2026-12-27"],
  ["5 agosto al 10 agosto", "2026-08-05", "2026-08-10"],
  ["5 août au 10 août", "2026-08-05", "2026-08-10"],
  ["5 Ağustos ile 10 Ağustos", "2026-08-05", "2026-08-10"],
  ["5 August bis 10 August", "2026-08-05", "2026-08-10"],
  ["5 agosto ate 10 agosto", "2026-08-05", "2026-08-10"],
  ["Thanksgiving", "2026-11-25", "2026-11-29"],
  ["Christmas", "2026-12-24", "2026-12-27"],
  ["New Year's", "2026-12-31", "2027-01-02"],
  ["Labor Day", "2026-09-04", "2026-09-07"],
  ["Memorial Day", "2026-05-22", "2026-05-25"],
];
for (const [phrase, arrival, departure] of dateCases) {
  test(`date parser: ${phrase}`, () => assert.deepEqual(extractDates(phrase, NOW), { arrival, departure }));
}

const invalidDateCases = [
  "August 32-35", "13/1-13/4", "February 30-March 2", "not sure yet", "August", "the fifth", "2026-02-30 to 2026-03-02",
];
for (const phrase of invalidDateCases) test(`date parser rejects: ${phrase}`, () => assert.equal(extractDates(phrase, NOW), null));

const singleDateCases = [
  ["August 5", "2026-08-05"], ["5 August", "2026-08-05"], ["8/5", "2026-08-05"], ["8.5", "2026-08-05"],
  ["August 5th, 2027", "2027-08-05"], ["5 agosto", "2026-08-05"], ["5 août", "2026-08-05"], ["5 Ağustos", "2026-08-05"],
  ["August fifth", "2026-08-05"], ["fifth of August", "2026-08-05"],
];
for (const [phrase, expected] of singleDateCases) test(`single date: ${phrase}`, () => assert.equal(extractSingleDate(phrase, NOW), expected));

const adjustmentCases = [
  ["one day later", { arrival: "2026-08-05", departure: "2026-08-10" }, { arrival: "2026-08-06", departure: "2026-08-11" }],
  ["two days earlier", { arrival: "2026-08-05", departure: "2026-08-10" }, { arrival: "2026-08-03", departure: "2026-08-08" }],
  ["check in one day earlier", { arrival: "2026-08-05", departure: "2026-08-10" }, { arrival: "2026-08-04", departure: "2026-08-10" }],
  ["check out two days later", { arrival: "2026-08-05", departure: "2026-08-10" }, { arrival: "2026-08-05", departure: "2026-08-12" }],
  ["arrive two days earlier and leave one day later", { arrival: "2026-08-05", departure: "2026-08-10" }, { arrival: "2026-08-03", departure: "2026-08-11" }],
  ["stay one more day", { arrival: "2026-08-05", departure: "2026-08-10" }, { arrival: "2026-08-05", departure: "2026-08-11" }],
];
for (const [phrase, current, expected] of adjustmentCases) test(`date adjustment: ${phrase}`, () => assert.deepEqual(parseDateAdjustment(phrase, current), expected));

test("parseDateText rolls a past yearless date to next year", () => {
  assert.deepEqual(parseDateText({ dateText: "June 5-10", currentDates: {}, now: NOW }), { arrival: "2027-06-05", departure: "2027-06-10" });
});
test("parseDateText preserves explicit past year for rejection", () => {
  assert.deepEqual(parseDateText({ dateText: "June 5-10, 2026", currentDates: {}, now: NOW }), { arrival: "2026-06-05", departure: "2026-06-10" });
});

const dateValidationCases = [
  [{ arrival: "2026-08-05", departure: "2026-08-10" }, true, null],
  [{ arrival: "2026-08-10", departure: "2026-08-05" }, false, "reversed_dates"],
  [{ arrival: "2026-08-05", departure: "2026-08-05" }, false, "reversed_dates"],
  [{ arrival: "2026-06-05", departure: "2026-06-10" }, false, "past_dates"],
  [{ arrival: "bad", departure: "2026-08-10" }, false, "missing_or_invalid_dates"],
  [null, false, "missing_or_invalid_dates"],
];
for (const [dates, ok, code] of dateValidationCases) test(`date validation ${JSON.stringify(dates)}`, () => {
  const result = validateDateRange(dates, NOW); assert.equal(result.ok, ok); if (code) assert.equal(result.code, code);
});

const partyCases = [
  [1, 0, true, false], [2, 0, true, false], [1, 3, true, false], [2, 4, true, false], [6, 0, true, false],
  [4, 4, true, true], [6, 6, true, true], [2, 5, true, true],
  [1, 4, false, "hoa_violation"], [1, 5, false, "hoa_violation"], [7, 6, false, "occupancy_exceeded"],
  [null, 0, false, "missing_guest_count"], [2, null, false, "missing_guest_count"], [0, 0, false, "missing_guest_count"],
];
for (const [adults, children, ok, detail] of partyCases) test(`party ${adults}/${children}`, () => {
  const result = validateParty(adults, children); assert.equal(result.ok, ok); if (ok) assert.equal(result.needsTwoUnits, detail); else assert.equal(result.code, detail);
});

for (const [adults, children] of [[4,4],[5,2],[6,6],[2,5],[3,6]]) {
  test(`two-unit split invariant ${adults}/${children}`, () => {
    const splits = findValidTwoUnitSplits(adults, children); assert.ok(splits.length > 0);
    for (const s of splits) {
      assert.equal(s.a1 + s.a2, adults); assert.equal(s.c1 + s.c2, children);
      assert.ok(s.a1 >= 1 && s.a2 >= 1); assert.ok(s.a1 + s.c1 <= 6 && s.a2 + s.c2 <= 6);
      assert.ok(s.c1 === 0 || s.a1 >= Math.ceil(s.c1 / 3)); assert.ok(s.c2 === 0 || s.a2 >= Math.ceil(s.c2 / 3));
    }
  });
}

test("split generator never emits an invalid split across the full party matrix", () => {
  for (let adults = 1; adults <= 12; adults++) for (let children = 0; children <= 12; children++) {
    const party = validateParty(adults, children);
    const splits = findValidTwoUnitSplits(adults, children);
    if (!party.ok || !party.needsTwoUnits) assert.equal(splits.length, 0, `${adults} adults/${children} children`);
    for (const split of splits) {
      assert.equal(split.a1 + split.a2, adults); assert.equal(split.c1 + split.c2, children);
      assert.ok(split.a1 + split.c1 <= 6 && split.a2 + split.c2 <= 6);
      assert.ok(split.c1 === 0 || split.a1 >= Math.ceil(split.c1 / 3));
      assert.ok(split.c2 === 0 || split.a2 >= Math.ceil(split.c2 / 3));
    }
  }
});
test("overall-valid party can still have no legal two-unit split", () => {
  const party = validateParty(3, 8); assert.equal(party.ok, true); assert.equal(party.needsTwoUnits, true);
  assert.deepEqual(findValidTwoUnitSplits(3, 8), []);
});

const originCases = [
  ["Dallas", "DFW"], ["DFW", "DFW"], ["Chicago", "ORD"], ["O'Hare", "ORD"], ["New York", "JFK"], ["JFK", "JFK"],
  ["Washington DC", "IAD"], ["Houston", "IAH"], ["San Francisco", "SFO"], ["Atlanta", "ATL"], ["Miami", "MIA"],
  ["London", null], ["XYZ", null], ["I fly from dfw", "DFW"],
];
for (const [phrase, expected] of originCases) test(`origin: ${phrase}`, () => assert.equal(extractOrigin(phrase), expected));

const bookingLink = buildBookingLink("707", "2026-08-05", "2026-08-10", 2, 0);
test("booking link contains exact verified parameters", () => {
  assert.match(bookingLink, /or_arrival=2026-08-05/); assert.match(bookingLink, /or_departure=2026-08-10/); assert.match(bookingLink, /or_adults=2/); assert.match(bookingLink, /or_children=0/);
});
for (const args of [
  ["999", "2026-08-05", "2026-08-10", 2, 0], ["707", "bad", "2026-08-10", 2, 0], ["707", "2026-08-05", "bad", 2, 0],
  ["707", "2026-08-05", "2026-08-10", 0, 0], ["707", "2026-08-05", "2026-08-10", 6, 1],
]) test(`booking link rejects ${JSON.stringify(args)}`, () => assert.equal(buildBookingLink(...args), null));

test("flight link supports destination and passenger breakdown", () => {
  const url = buildFlightLink("DFW", "2026-08-05", "2026-08-10", 2, 1, 1, "VPS");
  assert.match(url, /DFW0508VPS10084/); assert.match(url, /adults=2/); assert.match(url, /children=1/); assert.match(url, /infants=1/);
});
for (const args of [["XYZ","2026-08-05","2026-08-10",2,0,0,"VPS"],["DFW","bad","2026-08-10",2,0,0,"VPS"],["DFW","2026-08-05","2026-08-10",0,0,0,"VPS"]]) {
  test(`flight link rejects ${JSON.stringify(args)}`, () => assert.equal(buildFlightLink(...args), null));
}

test("TripShock dated link contains affiliate and dates", () => {
  const url = buildTripShockLink("dolphin", { arrival: "2026-08-05", departure: "2026-08-10" });
  assert.match(url, /dolphin-cruises-and-tours/); assert.match(url, /from=08%2F05%2F2026|from=08\/05\/2026/); assert.match(url, /aff=destindreamcondo/);
});
test("TripShock unknown category safely falls back to homepage", () => assert.match(buildTripShockLink("not-real", null), /^https:\/\/www\.tripshock\.com\/?\?/));

const detectorCases = [
  [detectScamCrisis, "This looks like a scam", true], [detectScamCrisis, "What is the pool temperature?", false],
  [detectEscalation, "I will sue and leave a one star review", true], [detectLockedOut, "I'm locked out and the pin is wrong", true],
  [detectMaintenance, "The AC is not cooling", true], [detectMaintenance, "Do you have AC?", false],
  [detectAccidentalDamage, "I accidentally broke a glass", true], [detectExternalDisturbance, "There is drilling next door", true],
  [detectBedroomMismatch, "I need a 3 bedroom condo", true], [detectPets, "Can I bring my emotional support dog?", true],
  [detectExcessGuests, "One child will sleep on the floor and won't count", true], [detectOwnerChatRequest, "Can I speak to Ozan?", true],
  [detectResolutionMessage, "all good, I found the code", true], [detectResolutionMessage, "still locked out", false],
];
for (const [fn, phrase, expected] of detectorCases) test(`detector ${fn.name}: ${phrase}`, () => assert.equal(fn(phrase), expected));

const emails = [["a@b.com", true],["ozan+test@example.co.uk", true],["a@b", false],["a b@example.com", false],["@example.com", false]];
for (const [email, expected] of emails) test(`email validation ${email}`, () => assert.equal(isValidEmail(email), expected));
test("extractEmail returns exact address", () => assert.equal(extractEmail("Please use Ozan.Test+1@example.com thanks"), "Ozan.Test+1@example.com"));

const normalized = normalizeState({ mode: "nonsense", booking: { adults: "2", children: "0", preferredUnit: 707 }, awaiting: ["children","children","bogus"], verified: { facts: ["a","a"] } });
test("normalizeState sanitizes nested values", () => {
  assert.equal(normalized.mode, "local_info"); assert.equal(normalized.booking.adults, 2); assert.equal(normalized.booking.children, 0); assert.equal(normalized.booking.preferredUnit, "707");
  assert.deepEqual(normalized.awaiting, ["children"]); assert.deepEqual(normalized.verified.facts, ["a"]);
});
test("applyStatePatch deeply merges state", () => {
  const patched = applyStatePatch(createDefaultState(), { booking: { adults: 2 }, flags: { petsMentioned: true } });
  assert.equal(patched.booking.adults, 2); assert.equal(patched.booking.children, null); assert.equal(patched.flags.petsMentioned, true);
});

test("legacy inference recovers dates, counts, origin, and known URLs", () => {
  const state = inferLegacyState([
    { role: "user", content: "Aug 5-10, 2 adults and no kids, flying from Dallas" },
    { role: "assistant", content: `${bookingLink} https://www.aviasales.com/search/DFW0508VPS10082?adults=2&children=0&infants=0&marker=709191` },
  ], NOW);
  assert.equal(state.booking.adults, 2); assert.equal(state.booking.children, 0); assert.equal(state.flight.originIata, "DFW"); assert.equal(state.verified.bookingUrls.length, 1); assert.equal(state.verified.flightUrls.length, 1);
});

test("collectAllowedUrls trusts explicit tool URL fields, not incidental data", () => {
  const approved = "https://approved.example/path";
  const hidden = "https://hidden.example/path";
  const allowed = collectAllowedUrls([{ urls: [approved], data: { url: hidden } }], createDefaultState());
  assert.equal(allowed.has(approved), true); assert.equal(allowed.has(hidden), false); assert.equal(allowed.has(STATIC_URLS.availability), true);
});

function validation(reply, toolResults = [], state = createDefaultState(), allowedExtra = []) {
  const allowed = collectAllowedUrls(toolResults, state);
  for (const url of allowedExtra) allowed.add(url);
  return validateReply({ reply, allowedUrls: allowed, toolResults, state, latestUser: "test", requireCurrentTurnUrls: true });
}

const validationRejects = [
  ["", "empty_reply"],
  ["Book here {url}", "placeholder"],
  ["[Book now](https://www.destincondogetaways.com/availability)", "markdown_link_not_permitted"],
  ["Use https://evil.example", "unapproved_url"],
  ["Here are your booking links", "booking_link_claim_without_permission"],
  ["Here is your pre-filled flight link", "flight_link_claim_without_permission"],
  ["The total is $999", "unverified_price"],
  ["You get 25% off", "unverified_percentage"],
  ["Your door code is 123456", "unauthorized_door_code"],
];
for (const [reply, code] of validationRejects) test(`reply guard rejects ${code}`, () => assert.ok(validation(reply).violations.some(v => v.code === code)));

const availResult = {
  name: "check_availability", kind: "booking", urls: [bookingLink], data: { units: [{ unit: "707", available: true }, { unit: "1006", available: false }] }, facts: [],
};
test("reply guard accepts supported availability and URL", () => assert.equal(validation(`Unit 707 is available. ${bookingLink}`, [availResult]).ok, true));
test("reply guard rejects false 1006 availability", () => assert.ok(validation("Unit 1006 is available.", [availResult]).violations.some(v => v.code === "unverified_availability_1006")));
test("reply guard rejects false 707 unavailability", () => assert.ok(validation("Unit 707 is booked.", [availResult]).violations.some(v => v.code === "unverified_unavailability_707")));
test("reply guard rejects false both-units claim", () => assert.ok(validation("Both units are available.", [availResult]).violations.some(v => v.code === "unverified_both_available")));

test("reply guard allows exact authorized money and dates from tool data", () => {
  const result = { name: "check_availability", kind: "booking", urls: [], data: { total: "$1,234.00", arrival: "2026-08-05", departure: "2026-08-10", units: [] }, facts: ["10% direct discount"] };
  const checked = validation("The verified total is $1,234.00 for August 5–10, with the 10% direct discount.", [result]);
  assert.equal(checked.ok, true, JSON.stringify(checked.violations));
});

test("reply guard enforces scam tone and contact details", () => {
  const state = createDefaultState(); state.flags.scamCrisis = true;
  const checked = validation("Great news 😊 Tell me your dates.", [], state);
  assert.ok(checked.violations.some(v => v.code === "scam_tone")); assert.ok(checked.violations.some(v => v.code === "scam_contact_missing")); assert.ok(checked.violations.some(v => v.code === "scam_booking_question"));
});
test("reply guard enforces one-bedroom disclosure", () => {
  const state = createDefaultState(); state.flags.bedroomMismatch = true; state.booking.bedroomsRequested = 3;
  assert.ok(validation("We sleep six guests.", [], state).violations.some(v => v.code === "bedroom_disclosure_missing"));
});
test("reply guard accepts an authorized alert claim", () => {
  const state = createDefaultState(); state.flags.alertSent = true;
  assert.equal(validation("I've alerted Ozan.", [], state).ok, true);
});

test("ISO and date arithmetic helpers cover leap year and invalid input", () => {
  assert.equal(isIsoDate("2028-02-29"), true); assert.equal(isIsoDate("2027-02-29"), false);
  assert.equal(addIsoDays("2026-12-31", 1), "2027-01-01"); assert.equal(diffNights("2026-08-05", "2026-08-10"), 5);
  assert.equal(todayIso(NOW), "2026-07-20"); assert.equal(normalizeNullableInteger("3", 1, 5), 3); assert.equal(normalizeNullableInteger("3.5", 1, 5), null);
});

test("holiday and month normalization helpers are multilingual", () => {
  assert.deepEqual(extractHolidayDates("Labor Day please"), { arrival: "2026-09-04", departure: "2026-09-07", label: "Labor Day weekend (Sept 4–7, 2026)" });
  assert.match(normalizeMonths("5 Ağustos ile 10 Ağustos"), /5 august to 10 august/i);
});

test("URL extraction strips terminal punctuation and recognizes booking URL", () => {
  const urls = extractUrls(`Go ${bookingLink}. Then https://example.com/test,`);
  assert.equal(urls[0], bookingLink); assert.equal(urls[1], "https://example.com/test"); assert.equal(isBookingUrl(bookingLink), true); assert.equal(isBookingUrl(UNITS["707"].bookingBase), false);
});

test("origin validation is case-insensitive", () => { assert.equal(isValidOriginIata("dfw"), true); assert.equal(isValidOriginIata("xyz"), false); });
