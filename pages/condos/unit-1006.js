import UnitPage from "../../components/UnitPage";
import schema from "../../data/unit-1006-schema.json";

const unit = {
  number: 1006, floorLabel: "Tenth floor", style: "Fresh Coastal", schema,
  title: "Pelican Beach Resort Unit 1006 | Panoramic Gulf-Front Condo",
  ownerRezUrl: "https://www.destincondogetaways.com/pelican-beach-resort-unit-1006-orp5b6450ex",
  introTitle: "A bright coastal condo with a higher panoramic view.",
  intro: [
    "Unit 1006 is an 873-square-foot, one-bedroom, two-bathroom condo on the tenth floor of Pelican Beach Resort. Its private balcony opens to an uninterrupted Gulf horizon and a broad view along the Emerald Coast.",
    "The light, modern interior includes a king bedroom, hallway bunks and a queen sleeper sofa, comfortably accommodating up to six guests.",
  ],
  viewTitle: "A higher horizon and a balcony that feels suspended above the Gulf.",
  viewCopy: "The tenth-floor perspective makes the water and sky feel especially expansive. Sunrise, changing water color and evening light are visible without leaving the condo.",
  photoAlts: ["living room and panoramic Gulf view", "private tenth-floor balcony view", "white-sand beach below", "wide Gulf horizon", "bright coastal living room", "Gulf view from the condo entrance", "coastal sitting area", "full kitchen", "kitchen with ocean view"],
};
export default function Unit1006() { return <UnitPage unit={unit} />; }
