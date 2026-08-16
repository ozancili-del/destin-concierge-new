import SiteButton from "./SiteButton";

export default function AvailabilitySearch({ className, id = "availability" }) {
  return (
    <form className={className} id={id} method="get" action="/book">
      <div><span>Live availability</span></div>
      <label><span>Check in</span><input aria-label="Arrival date" name="or_arrival" type="date" required /></label>
      <label><span>Check out</span><input aria-label="Departure date" name="or_departure" type="date" required /></label>
      <label><span>Guests</span><select aria-label="Guests" name="or_guests" defaultValue="2">{[1,2,3,4,5,6].map((count) => <option value={count} key={count}>{count} {count === 1 ? "guest" : "guests"}</option>)}</select></label>
      <SiteButton type="submit" variant="primary" size="standard">Search dates</SiteButton>
    </form>
  );
}
