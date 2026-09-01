import { UNITS } from "./business.js";

export const SPECIALIST_FACTS = Object.freeze({
  units: [
    { unit: "707", floor: 7, name: "Classic Coastal", style: UNITS["707"].style },
    { unit: "1006", floor: 10, name: "Fresh Coastal", style: UNITS["1006"].style },
  ],
  terrace: "The Terrace is a different building and is not beachfront. Units 707 and 1006 are in the main Pelican Beach Resort building, directly on the beach.",
  bedrooms: "Both units are one-bedroom, two-bath condos with a king bed, hallway bunks, and a queen sofa bed.",
  laundry: "Neither unit has an in-unit washer/dryer. Coin-operated laundry is on every floor and accepts quarters and credit cards.",
  amenities: "Both units have identical amenities: full kitchen, dishwasher, ice maker, FlexBrew coffee maker, air fryer, smart TVs, Wi-Fi smart lock, fast Wi-Fi, workspace, Pack N Play, and two beach chairs plus umbrella.",
  resort: "The resort has an indoor heated swim-out pool, two outdoor pools, kiddie pool, two hot tubs, sauna, steam room, fitness center, tennis, pickleball, grills, café, seasonal Tiki Bar, and 24/7 front desk/security.",
  occupancy: "Maximum occupancy is six per unit and twelve across both; HOA requires at least one adult per three children.",
  pets: "Current business policy is a strict no-pets rule, including emotional-support animals.",
  smoking: "Both units are strictly nonsmoking, including balconies.",
  parking: "Free parking is available for up to two cars; guests collect a parking pass at the front desk. Two paid J1772 chargers are on site.",
  beach_chairs: "Two chairs and an umbrella are included. HOA requires private setups behind the LDV beach-service area.",
  wifi: "Free Wi-Fi is 250+ Mbps through Eero 6 and is suitable for video calls.",
  checkin: "Normal check-in is 4:00 PM and checkout is 10:00 AM unless an authorized booking says otherwise.",
  comparison: "Both units are equal in overall value. The factual differences are floor level and décor style; Unit 1006 has a higher vantage point.",
});

export function getUnitFacts(topics = []) {
  return [...new Set(topics)]
    .filter(topic => Object.prototype.hasOwnProperty.call(SPECIALIST_FACTS, topic))
    .map(topic => ({ topic, value: SPECIALIST_FACTS[topic] }));
}

export function condoComparisonReply() {
  return [
    "Both condos have the same one-bedroom, two-bath layout, sleep up to six, and include the same core amenities.",
    `**Unit 707 — Classic Coastal:** 7th floor; ${UNITS["707"].style}.`,
    `**Unit 1006 — Fresh Coastal:** 10th floor; ${UNITS["1006"].style}, with a higher vantage point.`,
    "Neither is positioned as better overall—the practical choice is lower versus higher floor and your preferred décor.",
    `Unit 707: ${UNITS["707"].bookingBase}`,
    `Unit 1006: ${UNITS["1006"].bookingBase}`,
  ].join("\n\n");
}
