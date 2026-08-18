import { useState } from "react";
import SiteButton from "./SiteButton";
import styles from "../styles/AvailabilitySearch.module.css";

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function tomorrowAfter(value) {
  if (!value) return formatDate(new Date());
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return formatDate(date);
}

export default function AvailabilitySearch({ id = "availability", initialArrival = "", initialDeparture = "", initialAdults = 2, initialChildren = 0 }) {
  const safeInitialAdults = Math.min(6, Math.max(1, Number(initialAdults) || 2));
  const safeInitialChildren = Math.min(6 - safeInitialAdults, Math.max(0, Number(initialChildren) || 0));
  const [arrival, setArrival] = useState(initialArrival);
  const [departure, setDeparture] = useState(initialDeparture);
  const [adults, setAdults] = useState(safeInitialAdults);
  const [children, setChildren] = useState(safeInitialChildren);

  return (
    <form className={styles.availability} id={id} method="get" action="/availability">
      <div><span>Live availability</span></div>
      <label><span>Check in</span><input aria-label="Arrival date" name="or_arrival" type="date" min={formatDate(new Date())} value={arrival} onChange={(event) => { setArrival(event.target.value); if (departure && departure <= event.target.value) setDeparture(""); }} required /></label>
      <label><span>Check out</span><input aria-label="Departure date" name="or_departure" type="date" min={tomorrowAfter(arrival)} value={departure} onChange={(event) => setDeparture(event.target.value)} required /></label>
      <label><span>Guests · maximum 6 total</span><select aria-label="Adults" name="or_adults" value={adults} onChange={(event) => { const nextAdults = Number(event.target.value); setAdults(nextAdults); setChildren((current) => Math.min(current, 6 - nextAdults)); }}>{[1,2,3,4,5,6].map((count) => <option value={count} key={count}>{count} {count === 1 ? "adult" : "adults"}</option>)}</select><select aria-label="Children and infants" name="or_children" value={children} onChange={(event) => setChildren(Number(event.target.value))}>{Array.from({ length: 7 - adults }, (_, count) => <option value={count} key={count}>{count} {count === 1 ? "child/infant" : "children/infants"}</option>)}</select></label>
      <input type="hidden" name="or_guests" value={adults + children} />
      <SiteButton type="submit" variant="primary" size="standard">Search dates</SiteButton>
    </form>
  );
}
