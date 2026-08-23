import UnitPage from "../../components/UnitPage";
import schema from "../../data/unit-707-schema.json";

const unit = {
  number: 707, floorLabel: "Seventh floor", style: "Classic Coastal", schema,
  title: "Pelican Beach Resort Unit 707 | Gulf-Front Destin Condo",
  metaDescription: "Pelican Beach Resort Unit 707 is a Gulf-front Destin condo with 1 bedroom, 2 bathrooms, a private balcony and space for up to 6 guests.",
  propertyId: "e987ace000304077ac42435e1eb19a35",
  registrationNumber: "CND5603848",
  ownerRezUrl: "/book?unit=707",
  introTitle: "A warm coastal home with the Gulf right outside.",
  intro: [
    "Unit 707 is an 873-square-foot, one-bedroom, two-bathroom condo with a direct, unobstructed Gulf view. The seventh-floor balcony is elevated above the beach activity while still feeling close to the water.",
    "The layout works for couples, families and small groups: a king bed in the bedroom, hallway bunks and a queen sleeper sofa accommodate up to six guests.",
  ],
  viewTitle: "Close enough to hear the waves, high enough to take in the coast.",
  viewCopy: "Morning coffee and westward sunsets happen against a wide Gulf backdrop. The balcony overlooks the same stretch of beach shown on the Pelican live camera.",
  photoAlts: [
    "Private seventh-floor balcony set for two above the Gulf at Unit 707",
    "Unit 707 living and dining room with floor-to-ceiling Gulf views",
    "Direct view of Destin's white-sand beach and emerald Gulf from Unit 707",
    "Unit 707 living room, dining table and balcony doors facing the Gulf",
    "Sunset over the Gulf and white-sand beach from the Unit 707 balcony",
    "Unit 707 living room seating, smart TV and direct Gulf view",
    "White-sand shoreline directly below Pelican Beach Resort Unit 707",
    "Early morning Gulf light seen from the private Unit 707 balcony",
    "Open living and dining area inside Pelican Beach Resort Unit 707",
  ],
  photoSections: [
    { through: 14, label: "Gulf-front living room, balcony and shoreline views" },
    { through: 24, label: "Full kitchen, dining area, bathrooms and hallway bunks" },
    { through: 34, label: "King bedroom, sleeping spaces and condo details" },
    { through: 60, label: "Pelican Beach Resort pools, beach access and amenities" },
    { through: 94, label: "Pelican Beach Resort grounds, lobby and shared guest amenities" },
  ],
  fullDescription: [
    "Welcome to Unit 707 — Classic Coastal, an 873-square-foot Gulf-front condo on the seventh floor of Pelican Beach Resort. The private balcony has a direct, unobstructed view of the Gulf of Mexico, with no streets or crosswalks between the resort and the beach.",
    "The one-bedroom, two-bath layout works for couples, families and small groups. A king bed, hallway bunks and queen sleeper sofa accommodate four to six guests. The living room and bedroom both have smart TVs with cable, and high-speed Wi-Fi is included.",
    "The full kitchen includes a refrigerator with ice maker, stove, oven, microwave, dishwasher, coffee maker, toaster, blender, kettle, cookware and complete kitchenware. The condo also provides linens, towels, hair dryers, an iron and ironing board, and a vacuum.",
    "Guests have access to indoor and outdoor pools, hot tubs, a fitness center, sauna, tennis courts, grills, free parking and paid EV chargers. Seasonal beach chairs and umbrellas can be rented directly from Pelican Beach Resort; advance reservations are recommended during busy periods.",
    "Destin Commons, Henderson Beach State Park, HarborWalk Village, Baytowne Wharf, Silver Sands, dolphin cruises, fishing and Crab Island departures are all within easy reach. Ozan is available by phone, text or email, and the resort has on-site maintenance for issues during the stay.",
  ],
  reviews: [
    { name: "Taylor M.", stay: "July 2026", text: "Great stay! Would absolutely stay at this location again!" },
    { name: "Victoria C.", stay: "June 2026", text: "We had an AMAZING time. I can't wait to return!" },
    { name: "Kristina T.", stay: "June 2026", text: "Ozan was highly responsive and professional. The condo was very clean, the bed was comfortable, and the beautiful view was exactly as shown in the pictures." },
  ],
  platformLinks: [
    { name: "Vrbo", href: "https://www.vrbo.com/2078502" },
    { name: "Airbnb", href: "https://www.airbnb.com/users/profile/about?context=host" },
  ],
};
export default function Unit707() { return <UnitPage unit={unit} />; }
