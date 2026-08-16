import UnitPage from "../../components/UnitPage";
import schema from "../../data/unit-1006-schema.json";

const unit = {
  number: 1006, floorLabel: "Tenth floor", style: "Fresh Coastal", schema,
  title: "Pelican Beach Resort Unit 1006 | Panoramic Gulf-Front Condo",
  propertyId: "ad9a3b0b0a8145eb88573dd9c0e1ccb8",
  ownerRezUrl: "https://www.destincondogetaways.com/pelican-beach-resort-unit-1006-orp5b6450ex",
  introTitle: "A bright coastal condo with a higher panoramic view.",
  intro: [
    "Unit 1006 is an 873-square-foot, one-bedroom, two-bathroom condo on the tenth floor of Pelican Beach Resort. Its private balcony opens to an uninterrupted Gulf horizon and a broad view along the Emerald Coast.",
    "The light, modern interior includes a king bedroom, hallway bunks and a queen sleeper sofa, comfortably accommodating up to six guests.",
  ],
  viewTitle: "A higher horizon and a balcony that feels suspended above the Gulf.",
  viewCopy: "The tenth-floor perspective makes the water and sky feel especially expansive. Sunrise, changing water color and evening light are visible without leaving the condo.",
  photoAlts: ["living room and panoramic Gulf view", "private tenth-floor balcony view", "white-sand beach below", "wide Gulf horizon", "bright coastal living room", "Gulf view from the condo entrance", "coastal sitting area", "full kitchen", "kitchen with ocean view"],
  photoSections: [
    { through: 12, label: "Panoramic tenth-floor Gulf views, balcony and living room" },
    { through: 24, label: "Full kitchen, king bedroom, bathrooms and hallway bunks" },
    { through: 50, label: "Pelican Beach Resort pools, beach access, Tiki Bar and amenities" },
  ],
  fullDescription: [
    "Welcome to Unit 1006 — Fresh Coastal, an 873-square-foot Gulf-front condo on the tenth floor of Pelican Beach Resort. Its private balcony opens to a broad, unobstructed view of the emerald Gulf and sugar-white Destin beach, with no road to cross.",
    "The one-bedroom, two-bath layout sleeps four to six guests with a king bedroom, hallway bunks and queen sleeper sofa. The bright living space is arranged around the Gulf view, with smart TVs, cable and high-speed Wi-Fi for quieter evenings.",
    "The full kitchen includes a refrigerator with ice maker, stove, oven, microwave, dishwasher, coffee maker, toaster, blender, kettle, cookware and complete kitchenware. Linens, towels, hair dryers, an iron and ironing board, and a vacuum are provided.",
    "Guests have access to indoor and outdoor pools, hot tubs, a fitness center, sauna, tennis courts, grills, free parking and paid EV chargers. Seasonal beach chairs and umbrellas can be reserved through Pelican Beach Resort, with advance booking recommended during peak dates.",
    "The central Destin location is convenient to HarborWalk Village, Henderson Beach State Park, Destin Commons, Baytowne Wharf, Silver Sands, dolphin cruises, fishing and Crab Island departures. Ozan is available by phone, text or email, with on-site resort maintenance available when needed.",
  ],
  reviews: [
    { name: "Jacob A.", stay: "April 2026", text: "Beautiful condo! It felt even bigger than it looked in the pictures. Ozan was the most responsive host I have ever dealt with. 10/10 recommend—we will definitely be back!" },
    { name: "Carly J.", stay: "November 2025", text: "Ozan's rental was absolutely perfect. Modern appliances, close to popular restaurants and excursions, and the ocean view was breathtaking." },
    { name: "Ronna C.", stay: "January 2026", text: "Ozan was very helpful and responsive. We had a great weekend and would recommend staying here." },
  ],
  platformLinks: [
    { name: "Vrbo", href: "https://www.vrbo.com/3799283" },
    { name: "Airbnb", href: "https://www.airbnb.com/users/profile/about?context=host" },
  ],
};
export default function Unit1006() { return <UnitPage unit={unit} />; }
