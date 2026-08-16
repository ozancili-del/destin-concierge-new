import { useState } from "react";
import SiteButton from "./SiteButton";

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function tomorrowAfter(value) {
  if (!value) return formatDate(new Date());
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return formatDate(date);
}

export default function AvailabilitySearch({ className, id = "availability" }) {
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  return (
    <form className={className} id={id} method="get" action="/availability">
      <div><span>Live availability</span></div>
      <label><span>Check in</span><input aria-label="Arrival date" name="or_arrival" type="date" min={formatDate(new Date())} value={arrival} onChange={(event) => { setArrival(event.target.value); if (departure && departure <= event.target.value) setDeparture(""); }} required /></label>
      <label><span>Check out</span><input aria-label="Departure date" name="or_departure" type="date" min={tomorrowAfter(arrival)} value={departure} onChange={(event) => setDeparture(event.target.value)} required /></label>
      <label><span>Guests · maximum 6 total</span><select aria-label="Adults" name="or_adults" value={adults} onChange={(event) => { const nextAdults = Number(event.target.value); setAdults(nextAdults); setChildren((current) => Math.min(current, 6 - nextAdults)); }}>{[1,2,3,4,5,6].map((count) => <option value={count} key={count}>{count} {count === 1 ? "adult" : "adults"}</option>)}</select><select aria-label="Children and infants" name="or_children" value={children} onChange={(event) => setChildren(Number(event.target.value))}>{Array.from({ length: 7 - adults }, (_, count) => <option value={count} key={count}>{count} {count === 1 ? "child/infant" : "children/infants"}</option>)}</select></label>
      <input type="hidden" name="or_guests" value={adults + children} />
      <SiteButton type="submit" variant="primary" size="standard">Search dates</SiteButton>
    </form>
  );
}
