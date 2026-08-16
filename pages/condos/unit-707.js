import UnitPage from "../../components/UnitPage";
import schema from "../../data/unit-707-schema.json";

const unit = {
  number: 707, floorLabel: "Seventh floor", style: "Classic Coastal", schema,
  title: "Pelican Beach Resort Unit 707 | Gulf-Front Destin Condo",
  ownerRezUrl: "https://www.destincondogetaways.com/pelican-beach-resort-unit-707-orp5b47b5ax",
  introTitle: "A warm coastal home with the Gulf right outside.",
  intro: [
    "Unit 707 is an 873-square-foot, one-bedroom, two-bathroom condo with a direct, unobstructed Gulf view. The seventh-floor balcony is elevated above the beach activity while still feeling close to the water.",
    "The layout works for couples, families and small groups: a king bed in the bedroom, hallway bunks and a queen sleeper sofa accommodate up to six guests.",
  ],
  viewTitle: "Close enough to hear the waves, high enough to take in the coast.",
  viewCopy: "Morning coffee and westward sunsets happen against a wide Gulf backdrop. The balcony overlooks the same stretch of beach shown on the Pelican live camera.",
  photoAlts: ["living room with direct Gulf view", "private beachfront balcony", "emerald Gulf and white sand", "comfortable living room seating", "panoramic balcony view", "smart TV and Gulf view", "white-sand shoreline", "sunrise from the balcony", "coastal living and dining area"],
};
export default function Unit707() { return <UnitPage unit={unit} />; }
