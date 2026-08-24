import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import styles from "../styles/AvailabilityPage.module.css";

const liveSite = "https://www.destincondogetaways.com";
const condos = {
  "707": { label: "Classic Coastal · Seventh floor", href: "/pelican-beach-resort-unit-707", image: "/hub-beaches.webp", alt: "Gulf-front balcony view from Pelican Beach Resort Unit 707" },
  "1006": { label: "Fresh Coastal · Tenth floor", href: "/pelican-beach-resort-unit-1006", image: "/hub-beachcam.webp", alt: "Panoramic Gulf view from Pelican Beach Resort Unit 1006" },
};
const money = value => Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
function presentCharge(description = "Charge", nights = 0) {
  const normalized = description.toLowerCase();
  if (normalized.includes("destiny blue") || normalized.includes("discount")) return { label: "Direct-booking discount", detail: "Automatic savings on rent", discount: true };
  if (normalized.includes("cleaning")) return { label: "Cleaning fee", detail: "Per stay" };
  if (normalized.includes("management")) return { label: "Management fee", detail: nights ? `$25 × ${nights} nights` : "Per night" };
  if (normalized.includes("administrative")) return { label: "Administrative fee", detail: "Reservation processing" };
  if (normalized.includes("tax")) return { label: "Taxes", detail: "Sales and tourist taxes" };
  if (normalized.includes("rent")) return { label: "Nightly rent", detail: nights ? `${nights} nights` : "Stay subtotal" };
  return { label: description, detail: "" };
}
const nightsBetween = (arrival, departure) => arrival && departure ? Math.round((new Date(`${departure}T12:00:00`) - new Date(`${arrival}T12:00:00`)) / 86400000) : 0;
function monthOffset(year, month, amount) { const date = new Date(year, month + amount, 1); return { year: date.getFullYear(), month: date.getMonth() }; }

export default function AvailabilityPage() {
  const router = useRouter();
  const today = new Date();
  const [unit, setUnit] = useState(router.query.unit === "1006" ? "1006" : "707");
  const [arrival, setArrival] = useState(/^\d{4}-\d{2}-\d{2}$/.test(router.query.or_arrival || "") ? router.query.or_arrival : "");
  const [departure, setDeparture] = useState(/^\d{4}-\d{2}-\d{2}$/.test(router.query.or_departure || "") ? router.query.or_departure : "");
  const [adults, setAdults] = useState(Math.max(1, Math.min(6, Number.parseInt(router.query.or_adults, 10) || Number.parseInt(router.query.or_guests, 10) || 2)));
  const [children, setChildren] = useState(Math.max(0, Math.min(5, Number.parseInt(router.query.or_children, 10) || 0)));
  const [infants, setInfants] = useState(0);
  const [calendar, setCalendar] = useState({ booked: [], covered: [], rates: {}, minStays: {} });
  const [calendarStatus, setCalendarStatus] = useState("loading");
  const [calendarError, setCalendarError] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("idle");
  const [quoteError, setQuoteError] = useState("");
  const [visibleYear, setVisibleYear] = useState(today.getFullYear());
  const [visibleMonth, setVisibleMonth] = useState(today.getMonth());
  const totalGuests = adults + children + infants;
  const nights = nightsBetween(arrival, departure);
  const availableMonths = useMemo(() => [...new Set(calendar.covered.map(date => date.slice(0, 7)))].sort(), [calendar.covered]);
  const currentMonthKey = `${visibleYear}-${String(visibleMonth + 1).padStart(2, "0")}`;
  const secondMonth = monthOffset(visibleYear, visibleMonth, 1);
  const condo = condos[unit];

  useEffect(() => {
    if (!router.isReady) return;
    const queryAdults = Number.parseInt(router.query.or_adults, 10);
    const queryChildren = Number.parseInt(router.query.or_children, 10);
    const queryGuests = Number.parseInt(router.query.or_guests, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(router.query.or_arrival || "")) setArrival(router.query.or_arrival);
    if (/^\d{4}-\d{2}-\d{2}$/.test(router.query.or_departure || "")) setDeparture(router.query.or_departure);
    if (router.query.unit === "707" || router.query.unit === "1006") setUnit(router.query.unit);
    if (Number.isFinite(queryAdults)) setAdults(Math.max(1, Math.min(6, queryAdults)));
    else if (Number.isFinite(queryGuests)) setAdults(Math.max(1, Math.min(6, queryGuests)));
    if (Number.isFinite(queryChildren)) setChildren(Math.max(0, Math.min(5, queryChildren)));
  }, [router.isReady, router.query.unit, router.query.or_arrival, router.query.or_departure, router.query.or_adults, router.query.or_children, router.query.or_guests]);

  useEffect(() => {
    const controller = new AbortController();
    setCalendarStatus("loading"); setCalendarError(""); setSelectionError(""); setQuote(null); setQuoteStatus("idle");
    fetch(`/api/availability?unit=${unit}`, { signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok || data.status !== "ok") throw new Error(data.error || "Calendar unavailable"); return data; })
      .then(data => {
        const covered = [...(data.covered || [])].sort();
        setCalendar({ booked: data.booked || [], covered, rates: data.rates || {}, minStays: data.minStays || {} });
        setCalendarStatus("ready");
        if (covered.length && !covered.some(date => date.startsWith(currentMonthKey))) { const [year, month] = covered[0].split("-").map(Number); setVisibleYear(year); setVisibleMonth(month - 1); }
      })
      .catch(error => { if (error.name !== "AbortError") { setCalendarStatus("error"); setCalendarError("Live dates are refreshing. Please try again shortly or continue to the secure condo page."); } });
    return () => controller.abort();
  }, [unit]);

  useEffect(() => {
    setQuote(null); setQuoteError("");
    if (!arrival || !departure || nights < 1 || totalGuests < 1 || totalGuests > 6) { setQuoteStatus("idle"); return undefined; }
    const controller = new AbortController(); setQuoteStatus("loading");
    const timer = window.setTimeout(() => {
      fetch("/api/ownerrez-quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unit, arrival, departure, adults, children, infants }), signal: controller.signal })
        .then(async response => { const data = await response.json(); if (!response.ok || data.source !== "ownerrez-test-quote") throw new Error(data.error || "Quote unavailable"); return data; })
        .then(data => { setQuote(data); setQuoteStatus("ready"); })
        .catch(error => { if (error.name !== "AbortError") { setQuoteStatus("error"); setQuoteError("The live total could not be verified for this stay. Adjust the dates or review the secure condo checkout."); } });
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [unit, arrival, departure, adults, children, infants, nights, totalGuests]);

  function selectDate(date) {
    setSelectionError("");
    if (!arrival || departure || date <= arrival) { setArrival(date); setDeparture(""); return; }
    const blocked = calendar.booked.some(bookedDate => bookedDate >= arrival && bookedDate < date);
    let cursor = new Date(`${arrival}T12:00:00`); const end = new Date(`${date}T12:00:00`); let uncovered = false;
    while (cursor < end) { if (!calendar.covered.includes(cursor.toISOString().slice(0, 10))) { uncovered = true; break; } cursor.setDate(cursor.getDate() + 1); }
    const minimum = Math.max(1, Number(calendar.minStays[arrival]) || 1);
    if (blocked || uncovered) { setSelectionError(blocked ? "That stay crosses a booked night. Choose an earlier checkout date." : "Every night in that stay could not be confirmed. Choose another range."); return; }
    if (nightsBetween(arrival, date) < minimum) { setSelectionError(`A ${minimum}-night minimum applies to that check-in date. Choose a later checkout date.`); return; }
    setDeparture(date);
  }
  function navigateMonths(amount) { const next = monthOffset(visibleYear, visibleMonth, amount); setVisibleYear(next.year); setVisibleMonth(next.month); }
  function changeUnit(nextUnit) { setUnit(nextUnit); setArrival(""); setDeparture(""); }

  const firstMonth = availableMonths[0] || "";
  const lastMonth = availableMonths[availableMonths.length - 1] || "";
  const canGoPrevious = currentMonthKey > firstMonth;
  const canGoNext = currentMonthKey < lastMonth;
  const bookingQuery = new URLSearchParams({ or_arrival: arrival, or_departure: departure, or_adults: String(adults), or_children: String(children + infants), or_guests: String(totalGuests) }).toString();
  const checkoutHref = `${condo.href}?${bookingQuery}#checkout`;
  const calendarProps = { arrival, departure, bookedDates: calendar.booked, coveredDates: calendar.covered, rates: calendar.rates, availableMonths, onSelect: selectDate, onNav: navigateMonths, onJump: (year, month) => { setVisibleYear(year); setVisibleMonth(month); }, canGoPrevious, canGoNext };
  const structuredData = { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", "@id": `${liveSite}/availability#webpage`, url: `${liveSite}/availability`, name: "Destin Condo Availability at Pelican Beach Resort", description: "Check live availability and exact direct-booking totals for Gulf-front condos at Pelican Beach Resort in Destin, Florida.", isPartOf: { "@id": `${liveSite}/#website` }, about: { "@id": `${liveSite}/#business` } }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Availability", item: `${liveSite}/availability` }] }] };

  return <div className={styles.page}>
    <Head><title>Destin Condo Availability | Pelican Beach Resort</title><meta name="description" content="Check live dates and exact direct-booking totals for Gulf-front Pelican Beach Resort condos in Destin, including rent, discounts, fees and taxes." /><meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"} /><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="canonical" href={`${liveSite}/availability`} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></Head>
    {process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== "production" ? <div className={styles.preview}>Preview page | Production remains unchanged</div> : null}
    <div className={styles.utility}><a href="/destin-condo-rental-reviews">Guest Reviews</a><a href="/guest-guide#faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href="/about">Contact</a></div><SiteHeader availabilityHref="#live-calendar" />
    <main>
      <section className={styles.hero}><div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kicker}>Live Pelican Beach Resort availability</p><h1>Choose your condo. See the complete total.</h1><p>Pick a condo, select open dates and enter every guest. The exact direct-booking total comes from the live reservation system before you continue to secure checkout.</p><div className={styles.trust}><span>✓ Live dates</span><span>✓ Exact fees &amp; taxes</span><span>✓ No reservation created</span></div></div><div className={styles.heroImage}><Image src="/book-direct-banner-bg.webp" alt="Pelican Beach Resort overlooking the Gulf of Mexico in Destin Florida" fill priority sizes="(max-width: 900px) 100vw, 48vw" /></div></section>
      <section className={styles.bookingWorkspace} id="live-calendar">
        <div className={styles.sectionIntro}><p className={styles.kicker}>Live availability and exact pricing</p><h2>Build your stay in three steps.</h2><p>The calendar displays the established website nightly rate after the automatic direct-booking discount and management fee. The quote below is the authoritative complete total.</p></div>
        <div className={styles.step}><div className={styles.stepLabel}><span>Step 1</span><div><strong>Choose the exact condo</strong><small>You always know which home you are booking.</small></div></div><div className={styles.unitTabs} role="group" aria-label="Choose condo">{Object.entries(condos).map(([number, data]) => <button type="button" key={number} className={unit === number ? styles.unitActive : ""} aria-pressed={unit === number} onClick={() => changeUnit(number)}><strong>Unit {number}</strong><span>{data.label}</span></button>)}</div></div>
        <div className={styles.step}><div className={styles.stepLabel}><span>Step 2</span><div><strong>Select check-in and checkout</strong><small>Choose arrival first, then departure. Click the month title to jump.</small></div></div>{calendarStatus === "loading" ? <div className={styles.calendarMessage}>Loading Unit {unit} live dates…</div> : null}{calendarError ? <div className={styles.error}>{calendarError}</div> : null}{calendarStatus === "ready" ? <div className={styles.twoCalendars}><AvailabilityCalendar year={visibleYear} month={visibleMonth} {...calendarProps} /><div className={styles.desktopSecondCalendar}><AvailabilityCalendar year={secondMonth.year} month={secondMonth.month} {...calendarProps} /></div></div> : null}{selectionError ? <p className={styles.selectionError} role="alert">{selectionError}</p> : null}<div className={styles.staySummary}><strong>{arrival || "Choose check-in"}</strong><span>→</span><strong>{departure || "Choose checkout"}</strong>{nights ? <em>{nights} night{nights === 1 ? "" : "s"}</em> : null}</div></div>
        <div className={styles.step}><div className={styles.stepLabel}><span>Step 3</span><div><strong>Add every guest</strong><small>Maximum six people, including infants.</small></div></div><div className={styles.guestGrid}><label>Adults<select value={adults} onChange={event => setAdults(Number(event.target.value))}>{[1,2,3,4,5,6].map(value => <option key={value}>{value}</option>)}</select></label><label>Children<select value={children} onChange={event => setChildren(Number(event.target.value))}>{[0,1,2,3,4,5].map(value => <option key={value}>{value}</option>)}</select></label><label>Infants<select value={infants} onChange={event => setInfants(Number(event.target.value))}>{[0,1,2,3,4,5].map(value => <option key={value}>{value}</option>)}</select></label></div>{totalGuests > 6 ? <p className={styles.selectionError} role="alert">Maximum occupancy is six guests, including infants.</p> : null}</div>
        <section className={styles.quotePanel} aria-live="polite"><div className={styles.quoteCondo}><Image src={condo.image} alt={condo.alt} width={260} height={180} /><div><p>{condo.label}</p><h2>Unit {unit}</h2><span>{arrival && departure ? `${arrival} → ${departure} · ${nights} nights · ${totalGuests} guests` : "Choose dates to see the exact complete total."}</span></div></div><div className={styles.quoteDetails}>{quoteStatus === "idle" ? <p className={styles.quotePrompt}>Your exact total will appear here after dates and guests are complete.</p> : null}{quoteStatus === "loading" ? <p className={styles.quotePrompt}>Checking availability, rules, discounts, fees and taxes…</p> : null}{quoteStatus === "error" ? <><p className={styles.selectionError}>{quoteError}</p>{arrival && departure ? <SiteButton href={checkoutHref} variant="secondary">Review secure checkout</SiteButton> : null}</> : null}{quoteStatus === "ready" && quote ? <><p className={styles.quoteVerified}>✓ Live price verified</p><div className={styles.chargeList}>{quote.charges.map((charge, index) => { const display = presentCharge(charge.description, nights); return <div className={`${styles.chargeRow} ${display.discount ? styles.discountRow : ""}`} key={`${charge.description}-${index}`}><span><strong>{display.label}</strong>{display.detail ? <small>{display.detail}</small> : null}</span><b>{charge.amount < 0 ? `−${money(Math.abs(charge.amount))}` : money(charge.amount)}</b></div>; })}</div><div className={styles.quoteTotal}><span>Complete total</span><strong>{money(quote.total)}</strong></div><SiteButton href={checkoutHref} variant="primary" size="large">Continue to secure booking</SiteButton><small className={styles.quoteFinePrint}>No reservation or hold has been created. The secure booking page preserves this condo, dates and guest count for your final review.</small></> : null}</div></section>
      </section>
      <section className={styles.condos}><div className={styles.sectionIntro}><p className={styles.kicker}>Compare before you decide</p><h2>Explore both Gulf-front condos.</h2><p>Review every photo, room detail, amenity and guest review before choosing dates.</p></div><div className={styles.condoGrid}>{Object.entries(condos).map(([number, data]) => <article key={number}><div className={styles.cardImage}><Image src={data.image} alt={data.alt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div><p>{data.label}</p><h3>Pelican Beach Resort Unit {number}</h3><ul><li>1 bedroom</li><li>2 bathrooms</li><li>Sleeps up to 6</li></ul><SiteButton href={data.href} variant="secondary">Explore Unit {number}</SiteButton></div></article>)}</div></section>
    </main><SiteFooter /><Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
