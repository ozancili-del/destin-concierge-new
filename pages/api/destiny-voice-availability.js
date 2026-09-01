import { buildBookingLink, validateDateRange, validateParty } from "../../lib/destiny-agent/business.js";
import { createServices } from "../../lib/destiny-agent/services.js";
import { allowSameOriginRequest, enforceJsonSize, enforceRateLimit } from "../../lib/public-api-security.js";

const services = createServices();

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
  if (!enforceJsonSize(req, res, 10_000)) return;
  if (!enforceRateLimit(req, res, { scope: "destiny-voice-availability", limit: 20, windowMs: 10 * 60 * 1000 })) return;

  const arrival = String(req.body?.arrival || "");
  const departure = String(req.body?.departure || "");
  const adults = Number(req.body?.adults);
  const children = Number(req.body?.children);
  const dateCheck = validateDateRange({ arrival, departure }, new Date());
  const party = validateParty(adults, children, { allowTwoUnits: false });

  if (!dateCheck.ok || !party.ok) {
    return res.status(400).json({
      error: "I need valid check-in and check-out dates plus the number of adults and children before I can check live availability.",
      code: dateCheck.ok ? party.code : dateCheck.code,
    });
  }

  try {
    const availability = await services.checkBothUnits(arrival, departure);
    const complete = ["707", "1006"].every(unit => typeof availability[unit] === "boolean");
    if (!complete) {
      return res.status(503).json({ error: "OwnerRez did not return a complete live result. Please try the availability check again." });
    }

    const units = ["707", "1006"].map(unit => ({
      unit,
      available: availability[unit],
      bookingUrl: availability[unit] ? buildBookingLink(unit, arrival, departure, adults, children) : null,
    }));
    const open = units.filter(unit => unit.available);
    const status = open.length
      ? `${open.map(unit => `Unit ${unit.unit}`).join(" and ")} ${open.length === 1 ? "is" : "are"} available.`
      : "Both Unit 707 and Unit 1006 are booked for those dates.";
    const links = open.map(unit => `Unit ${unit.unit}: ${unit.bookingUrl}`).join("\n");
    const reply = `Live OwnerRez availability for ${arrival} through ${departure}, ${adults} ${adults === 1 ? "adult" : "adults"} and ${children} ${children === 1 ? "child" : "children"}: ${status}${links ? `\n\n${links}` : ""}`;

    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json({ reply, units, query: { arrival, departure, adults, children }, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[DESTINY VOICE AVAILABILITY]", error?.message || "unknown error");
    return res.status(503).json({ error: "Live availability is temporarily unavailable. Please try again." });
  }
}
