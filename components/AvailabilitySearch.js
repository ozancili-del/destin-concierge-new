import SiteButton from "./SiteButton";

const liveSite = "https://www.destincondogetaways.com";

export default function AvailabilitySearch({ className, id = "availability" }) {
  return (
    <form className={className} id={id} method="post" action={liveSite + "/properties"}>
      <div><span>Live availability</span></div>
      <input type="hidden" name="Page" value="1" />
      <input type="hidden" name="Sort" value="DailyRandom" />
      <label><span>Check in</span><input aria-label="Arrival date" name="ArrivalDate" type="date" required /></label>
      <label><span>Check out</span><input aria-label="Departure date" name="DepartureDate" type="date" required /></label>
      <label><span>Guests</span><select aria-label="Guests" name="Guests" defaultValue="2">{[1,2,3,4,5,6].map((count) => <option value={count} key={count}>{count} {count === 1 ? "guest" : "guests"}</option>)}</select></label>
      <SiteButton type="submit" variant="primary" size="standard">Search dates</SiteButton>
    </form>
  );
}
