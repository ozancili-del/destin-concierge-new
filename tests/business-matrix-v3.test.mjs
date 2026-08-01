import test from "node:test";
import assert from "node:assert/strict";
import {
  addIsoDays,
  applyStatePatch,
  buildBookingLink,
  buildFlightLink,
  buildTripShockLink,
  createDefaultState,
  detectLockedOut,
  detectMaintenance,
  detectOwnerChatRequest,
  diffNights,
  extractDates,
  extractEmail,
  extractOrigin,
  isValidEmail,
  isValidOriginIata,
  normalizeState,
  validateDateRange,
  validateParty,
} from "../lib/destiny-agent/business.js";

const NOW = new Date("2026-08-01T12:00:00-05:00");

const dateCases = [
  ["August fifth to tenth", "2026-08-05", "2026-08-10"],
  ["5-10 August", "2026-08-05", "2026-08-10"],
  ["8/5-8/10", "2026-08-05", "2026-08-10"],
  ["December 29 to January 3", "2026-12-29", "2027-01-03"],
  ["agosto 5 al 10", "2026-08-05", "2026-08-10"],
];

for (const [text, arrival, departure] of dateCases) {
  test(`normalizes dates: ${text}`, () => {
    assert.deepEqual(extractDates(text, NOW), { arrival, departure });
  });
}

for (const [adults, children, ok, twoUnits] of [
  [2, 0, true, false],
  [6, 0, true, false],
  [7, 0, true, true],
  [2, 6, true, true],
  [1, 6, false, undefined],
  [0, 2, false, undefined],
]) {
  test(`party matrix ${adults} adults/${children} children`, () => {
    const result = validateParty(adults, children);
    assert.equal(result.ok, ok);
    if (ok) assert.equal(result.needsTwoUnits, twoUnits);
  });
}

test("preserves unknown children separately from explicit zero", () => {
  const state = createDefaultState();
  assert.equal(state.booking.children, null);
  assert.equal(normalizeState({ booking: { children: 0 } }).booking.children, 0);
});

test("trip changes invalidate verified capabilities", () => {
  const state = normalizeState({
    booking: { arrival: "2026-08-05", departure: "2026-08-10", adults: 2, children: 0 },
    verified: { bookingUrls: ["https://example.test/book"], activityUrls: ["https://example.test/activity"], flightUrls: ["https://example.test/flight"] },
  });
  const changed = applyStatePatch(state, { booking: { departure: "2026-08-11" } });
  assert.deepEqual(changed.verified.bookingUrls, []);
  assert.deepEqual(changed.verified.activityUrls, []);
  assert.deepEqual(changed.verified.flightUrls, []);
});

test("date helpers preserve arrival/departure semantics", () => {
  assert.equal(addIsoDays("2026-08-10", 1), "2026-08-11");
  assert.equal(diffNights("2026-08-05", "2026-08-10"), 5);
  assert.equal(validateDateRange({ arrival: "2026-08-05", departure: "2026-08-10" }, NOW).ok, true);
  assert.equal(validateDateRange({ arrival: "2026-08-10", departure: "2026-08-05" }, NOW).ok, false);
});

test("URL builders emit only expected partner hosts", () => {
  assert.match(buildBookingLink("707", "2026-08-05", "2026-08-10", 2, 0), /^https:\/\/www\.destincondogetaways\.com\//);
  assert.match(buildTripShockLink("dolphin", { arrival: "2026-08-05" }), /^https:\/\/www\.tripshock\.com\//);
  assert.match(buildFlightLink("ord", "2026-08-05", "2026-08-10", 2, 0), /^https:\/\/www\.aviasales\.com\//);
});

for (const [input, expected] of [["ord", true], ["ORD", true], ["zzz", false], ["VPS", true]]) {
  test(`IATA validation: ${input}`, () => assert.equal(isValidOriginIata(input), expected));
}

test("extracts grounded airport and email values", () => {
  assert.equal(extractOrigin("Flying from ord to Destin"), "ORD");
  assert.equal(extractEmail("Email me at Guest@example.com please"), "Guest@example.com");
  assert.equal(isValidEmail("Guest@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
});

for (const [detector, positive, negative] of [
  [detectLockedOut, "The door code is not working and we are outside", "How do I get my code later?"],
  [detectMaintenance, "There is water leaking under the sink", "What restaurants are nearby?"],
  [detectOwnerChatRequest, "Can I speak to Ozan?", "What time is checkout?"],
]) {
  test(`detector ${detector.name}`, () => {
    assert.equal(detector(positive), true);
    assert.equal(detector(negative), false);
  });
}

