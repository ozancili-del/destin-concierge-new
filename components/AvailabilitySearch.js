import { useState } from "react";
import SiteButton from "./SiteButton";

export default function AvailabilitySearch({ className, id = "availability" }) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  function validateSearch(event) {
    const form = event.currentTarget;
    const arrival = form.elements.or_arrival;
    const departure = form.elements.or_departure;
    const childrenInput = form.elements.or_children;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arrivalDate = new Date(`${arrival.value}T00:00:00`);
    const departureDate = new Date(`${departure.value}T00:00:00`);

    arrival.setCustomValidity("");
    departure.setCustomValidity("");
    childrenInput.setCustomValidity("");

    if (arrivalDate < today) {
      event.preventDefault();
      arrival.setCustomValidity("Check-in must be today or later.");
      arrival.reportValidity();
      return;
    }
    if (departureDate <= arrivalDate) {
      event.preventDefault();
      departure.setCustomValidity("Check-out must be after check-in.");
      departure.reportValidity();
      return;
    }
    if (adults + children > 6) {
      event.preventDefault();
      childrenInput.setCustomValidity("The maximum occupancy is six people, including children and infants.");
      childrenInput.reportValidity();
    }
  }

  return (
    <form className={className} id={id} method="get" action="/book" onSubmit={validateSearch}>
      <div><span>Live availability</span></div>
      <label><span>Check in</span><input aria-label="Arrival date" name="or_arrival" type="date" required /></label>
      <label><span>Check out</span><input aria-label="Departure date" name="or_departure" type="date" required /></label>
      <label><span>Guests · maximum 6 total</span><select aria-label="Adults" name="or_adults" value={adults} onChange={(event) => setAdults(Number(event.target.value))}>{[1,2,3,4,5,6].map((count) => <option value={count} key={count}>{count} {count === 1 ? "adult" : "adults"}</option>)}</select><select aria-label="Children and infants" name="or_children" value={children} onChange={(event) => { setChildren(Number(event.target.value)); event.currentTarget.setCustomValidity(""); }}>{[0,1,2,3,4,5].map((count) => <option value={count} key={count}>{count} {count === 1 ? "child/infant" : "children/infants"}</option>)}</select></label>
      <input type="hidden" name="or_guests" value={adults + children} />
      <SiteButton type="submit" variant="primary" size="standard">Search dates</SiteButton>
    </form>
  );
}
