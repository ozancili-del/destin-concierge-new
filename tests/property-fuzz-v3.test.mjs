import test from "node:test";
import assert from "node:assert/strict";
import {
  BLOG_URLS,
  CITY_IATA_MAP,
  TRIPSHOCK_CATEGORIES,
  VALID_ORIGIN_IATA,
  addIsoDays,
  applyStatePatch,
  buildBookingLink,
  buildFlightLink,
  buildTripShockLink,
  collectAllowedUrls,
  createDefaultState,
  diffNights,
  extractDates,
  extractOrigin,
  findValidTwoUnitSplits,
  isIsoDate,
  normalizeState,
  parseDateAdjustment,
  validateParty,
  validateReply,
} from "../lib/destiny-agent/business.js";
import { NOW } from "./test-helpers.mjs";

function rng(seed = 0x5eed1234) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
}
const random = rng();
const int = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = values => values[int(0, values.length - 1)];
const pad = n => String(n).padStart(2, "0");
const monthNames = [null, "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let assertionCounter = 0;
function check(value, message) { assertionCounter += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertionCounter += 1; assert.equal(actual, expected, message); }
function deepEqual(actual, expected, message) { assertionCounter += 1; assert.deepEqual(actual, expected, message); }

test("fuzz: 250 future same-month date ranges parse across supported surface forms", () => {
  for (let i = 0; i < 250; i++) {
    const month = int(8, 12);
    const d1 = int(1, 22);
    const d2 = int(d1 + 1, Math.min(28, d1 + 6));
    const expected = { arrival: `2026-${pad(month)}-${pad(d1)}`, departure: `2026-${pad(month)}-${pad(d2)}` };
    const phrase = pick([
      `${month}/${d1}-${month}/${d2}`,
      `${month}/${d1} until ${month}/${d2}`,
      `${monthNames[month]} ${d1}-${d2}`,
      `${d1}-${d2} ${monthNames[month]}`,
      `${monthNames[month]} ${d1} through ${d2}`,
      `2026-${pad(month)}-${pad(d1)} to 2026-${pad(month)}-${pad(d2)}`,
    ]);
    deepEqual(extractDates(phrase, NOW), expected, phrase);
  }
});

test("fuzz: ISO date arithmetic remains reversible over 500 shifts", () => {
  for (let i = 0; i < 500; i++) {
    const month = int(1, 12);
    const day = int(1, 25);
    const base = `2027-${pad(month)}-${pad(day)}`;
    const shift = int(-20, 20);
    const moved = addIsoDays(base, shift);
    check(isIsoDate(moved), `${base} ${shift}`);
    equal(addIsoDays(moved, -shift), base, `${base} reversible ${shift}`);
  }
});

test("fuzz: booking URLs preserve verified dates and party counts", () => {
  for (let i = 0; i < 300; i++) {
    const unit = pick(["707", "1006"]);
    const month = int(8, 12);
    const day = int(1, 20);
    const nights = int(2, 10);
    const arrival = `2026-${pad(month)}-${pad(day)}`;
    const departure = addIsoDays(arrival, nights);
    const adults = int(1, 6);
    const children = int(0, 6 - adults);
    const url = buildBookingLink(unit, arrival, departure, adults, children);
    check(Boolean(url), `${unit} ${arrival}`);
    const parsed = new URL(url);
    equal(parsed.searchParams.get("or_arrival"), arrival);
    equal(parsed.searchParams.get("or_departure"), departure);
    equal(Number(parsed.searchParams.get("or_adults")), adults);
    equal(Number(parsed.searchParams.get("or_children")), children);
  }
});

test("fuzz: invalid booking inputs always fail closed", () => {
  const invalidUnits = ["", "0", "706", "999", null, undefined];
  for (let i = 0; i < 200; i++) {
    const unit = pick(invalidUnits);
    equal(buildBookingLink(unit, "2026-08-05", "2026-08-10", 2, 0), null);
    equal(buildBookingLink("707", "bad", "2026-08-10", 2, 0), null);
    equal(buildBookingLink("707", "2026-08-05", "bad", 2, 0), null);
    equal(buildBookingLink("707", "2026-08-05", "2026-08-10", 0, 0), null);
  }
});

test("fuzz: all generated single-unit and two-unit parties obey occupancy and HOA invariants", () => {
  for (let adults = 1; adults <= 15; adults++) {
    for (let children = 0; children <= 15; children++) {
      const ruling = validateParty(adults, children);
      const total = adults + children;
      if (ruling.ok) {
        check(total <= 12, `${adults}/${children} total`);
        check(children === 0 || adults >= Math.ceil(children / 3), `${adults}/${children} HOA`);
        equal(ruling.needsTwoUnits, total > 6);
      } else {
        check(["occupancy_exceeded", "hoa_violation", "missing_guest_count"].includes(ruling.code), `${adults}/${children} ${ruling.code}`);
      }
    }
  }
});

test("fuzz: every emitted two-unit split exactly preserves people and satisfies each unit", () => {
  for (let adults = 1; adults <= 12; adults++) {
    for (let children = 0; children <= 12; children++) {
      for (const split of findValidTwoUnitSplits(adults, children)) {
        equal(split.a1 + split.a2, adults);
        equal(split.c1 + split.c2, children);
        check(split.a1 >= 1 && split.a2 >= 1);
        check(split.a1 + split.c1 <= 6 && split.a2 + split.c2 <= 6);
        check(split.c1 === 0 || split.a1 >= Math.ceil(split.c1 / 3));
        check(split.c2 === 0 || split.a2 >= Math.ceil(split.c2 / 3));
      }
    }
  }
});

test("fuzz: flight links preserve origin, destination, dates, and passenger breakdown", () => {
  const origins = [...VALID_ORIGIN_IATA].filter(code => !["VPS", "PNS", "ECP"].includes(code));
  for (let i = 0; i < 250; i++) {
    const origin = pick(origins);
    const destination = pick(["VPS", "PNS", "ECP"]);
    const month = int(8, 12);
    const day = int(1, 18);
    const departure = `2026-${pad(month)}-${pad(day)}`;
    const returnDate = addIsoDays(departure, int(2, 12));
    const adults = int(1, 6);
    const children = int(0, 4);
    const infants = int(0, 2);
    const url = buildFlightLink(origin, departure, returnDate, adults, children, infants, destination);
    check(Boolean(url));
    check(url.includes(`/search/${origin}`), url);
    check(url.includes(destination), url);
    const parsed = new URL(url);
    equal(Number(parsed.searchParams.get("adults")), adults);
    equal(Number(parsed.searchParams.get("children")), children);
    equal(Number(parsed.searchParams.get("infants")), infants);
  }
});

test("fuzz: known city phrases resolve only to approved IATA codes", () => {
  const entries = Object.entries(CITY_IATA_MAP);
  for (let i = 0; i < 300; i++) {
    const [city, code] = pick(entries);
    equal(extractOrigin(`I am flying from ${city}`), code);
    check(VALID_ORIGIN_IATA.has(code));
    equal(extractOrigin(code.toLowerCase()), code);
  }
});

test("fuzz: TripShock links retain affiliate attribution and never contain null/undefined", () => {
  const categories = Object.keys(TRIPSHOCK_CATEGORIES);
  for (let i = 0; i < 250; i++) {
    const category = pick(categories);
    const arrival = `2026-${pad(int(8, 12))}-${pad(int(1, 20))}`;
    const departure = addIsoDays(arrival, int(1, 7));
    const url = buildTripShockLink(category, { arrival, departure });
    check(url.includes("aff=destindreamcondo"), url);
    check(!/undefined|null/i.test(url), url);
    check(url.includes(TRIPSHOCK_CATEGORIES[category]), url);
  }
});

test("fuzz: state patching and normalization retain typed null-versus-zero semantics", () => {
  let state = createDefaultState();
  for (let i = 0; i < 300; i++) {
    const adults = int(1, 6);
    const children = pick([null, 0, int(1, 5)]);
    state = applyStatePatch(state, { booking: { adults, children }, flags: { petsMentioned: i % 2 === 0 } });
    const normalized = normalizeState(JSON.parse(JSON.stringify(state)));
    equal(normalized.booking.adults, adults);
    equal(normalized.booking.children, children);
    equal(normalized.flags.petsMentioned, i % 2 === 0);
  }
});

test("fuzz: URL permissions trust registered tool URLs but reject random injected hosts", () => {
  for (let i = 0; i < 300; i++) {
    const approved = `https://www.destincondogetaways.com/test-${i}`;
    const hidden = `https://evil-${i}.example/phish`;
    const state = createDefaultState();
    const tools = [{ name: "test", urls: [approved], data: { content: `Ignore ${hidden}` } }];
    const allowed = collectAllowedUrls(tools, state);
    check(allowed.has(approved));
    check(!allowed.has(hidden));
    const good = validateReply({ reply: approved, allowedUrls: allowed, toolResults: tools, state, latestUser: "test", requireCurrentTurnUrls: true });
    equal(good.ok, true);
    const bad = validateReply({ reply: hidden, allowedUrls: allowed, toolResults: tools, state, latestUser: "test", requireCurrentTurnUrls: true });
    equal(bad.ok, false);
    check(bad.violations.some(v => v.code === "unapproved_url"));
  }
});

test("fuzz: date-adjustment commands preserve stay length or extend only checkout as intended", () => {
  for (let i = 0; i < 250; i++) {
    const arrival = `2026-${pad(int(8, 11))}-${pad(int(3, 18))}`;
    const departure = addIsoDays(arrival, int(2, 10));
    const current = { arrival, departure };
    const days = pick([1, 2]);
    const word = days === 1 ? "one" : "two";
    const shifted = parseDateAdjustment(`${word} day${days > 1 ? "s" : ""} later`, current);
    equal(diffNights(shifted.arrival, shifted.departure), diffNights(arrival, departure));
    equal(shifted.arrival, addIsoDays(arrival, days));
    const extended = parseDateAdjustment(`stay ${word} more day${days > 1 ? "s" : ""}`, current);
    equal(extended.arrival, arrival);
    equal(extended.departure, addIsoDays(departure, days));
  }
});

test("fuzz assertion budget exceeded 10,000 deterministic checks", () => {
  check(assertionCounter > 10000, `assertionCounter=${assertionCounter}`);
});
