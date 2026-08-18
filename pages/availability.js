import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import styles from "../styles/AvailabilityPage.module.css";

const liveSite = "https://www.destincondogetaways.com";
const calendarWidgetId = "91953f0c6e014ff585bffa8e87bad76e";

const condos = [
  { number: "707", label: "Classic Coastal · Seventh floor", href: "/condos/unit-707", image: "/hub-beaches.webp", alt: "Gulf-front view from Pelican Beach Resort Unit 707" },
  { number: "1006", label: "Fresh Coastal · Tenth floor", href: "/condos/unit-1006", image: "/hub-beachcam.webp", alt: "Gulf-front setting of Pelican Beach Resort Unit 1006" },
];

function parseStayDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const [year, month, day] = value.split("-").map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day ? date : null;
}

function validateSearch({ arrival, departure, adults, children, totalGuests }) {
  const arrivalDate = parseStayDate(arrival);
  const departureDate = parseStayDate(departure);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!arrival || !departure) return "Choose both check-in and checkout dates.";
  if (!arrivalDate || !departureDate) return "Choose valid check-in and checkout dates.";
  if (arrivalDate < today) return "Check-in must be today or later.";
  if (departureDate <= arrivalDate) return "Checkout must be after check-in.";
  if (!Number.isInteger(adults) || adults < 1) return "Choose at least one adult.";
  if (!Number.isInteger(children) || children < 0) return "Choose a valid number of children and infants.";
  if (!Number.isInteger(totalGuests) || totalGuests !== adults + children) return "The guest count does not match the adults and children selected. Please search again.";
  if (totalGuests > 6) return "Each condo accommodates a maximum of six people, including infants.";
  return "";
}

export default function AvailabilityPage() {
  const router = useRouter();
  const arrival = typeof router.query.or_arrival === "string" ? router.query.or_arrival : "";
  const departure = typeof router.query.or_departure === "string" ? router.query.or_departure : "";
  const adults = Number.parseInt(router.query.or_adults, 10);
  const children = Number.parseInt(router.query.or_children, 10);
  const totalGuests = Number.parseInt(router.query.or_guests, 10);
  const hasSearchInputs = Boolean(arrival || departure || router.query.or_adults || router.query.or_children || router.query.or_guests);
  const validationError = hasSearchInputs ? validateSearch({ arrival, departure, adults, children, totalGuests }) : "";
  const hasValidSearch = hasSearchInputs && !validationError;
  const [liveResults, setLiveResults] = useState(null);
  const [resultsError, setResultsError] = useState("");
  const [showChangeSearch, setShowChangeSearch] = useState(false);

  useEffect(() => {
    if (!hasValidSearch) {
      setLiveResults(null);
      setResultsError("");
      return;
    }
    const controller = new AbortController();
    setLiveResults(null);
    setResultsError("");
    fetch(`/api/calendar?arrival=${encodeURIComponent(arrival)}&departure=${encodeURIComponent(departure)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Availability could not be checked");
        return response.json();
      })
      .then(setLiveResults)
      .catch((error) => {
        if (error.name !== "AbortError") setResultsError("Live availability could not be loaded. Please try the search again.");
      });
    return () => controller.abort();
  }, [arrival, departure, hasValidSearch]);

  const bookingQuery = new URLSearchParams({
    or_arrival: arrival,
    or_departure: departure,
    or_adults: String(Number.isFinite(adults) ? adults : 2),
    or_children: String(Number.isFinite(children) ? children : 0),
    or_guests: String(totalGuests),
  }).toString();
  const availableCondos = liveResults ? condos.filter((condo) => liveResults[`unit${condo.number}`]?.status === "available") : [];
  const unknownCondos = liveResults ? condos.filter((condo) => liveResults[`unit${condo.number}`]?.status === "unknown") : [];

  const displayDate = (value) => {
    if (!value) return "";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  };
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${liveSite}/availability#webpage`, url: `${liveSite}/availability`, name: "Destin Condo Availability at Pelican Beach Resort", description: "Check live availability for owner-managed Gulf-front condos at Pelican Beach Resort in Destin, Florida.", isPartOf: { "@id": `${liveSite}/#website` }, about: { "@id": `${liveSite}/#business` } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Availability", item: `${liveSite}/availability` }] },
    ],
  };

  return <div className={styles.page}>
    <Head>
      <title>Destin Condo Availability | Pelican Beach Resort</title>
      <meta name="description" content="Check live availability for Gulf-front Pelican Beach Resort condos in Destin. Compare exact condos, then review live pricing and book securely." />
      <meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={`${liveSite}/availability`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>

    <div className={styles.preview}>Preview page | Production remains unchanged</div>
    <div className={styles.utility}><a href="/reviews">Guest Reviews</a><a href="/guest-guide#faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href="/about">Contact</a></div>
    <SiteHeader availabilityHref="#search" />

    <main>
      <section className={styles.hero}>
        <div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kicker}>Live Pelican Beach Resort availability</p><h1>Find the Gulf view that fits your dates.</h1><p>Search current calendars, pricing and the secure reservation flow in one place.</p><div className={styles.trust}><span>✓ Live dates</span><span>✓ Exact condo</span><span>✓ Secure checkout</span></div></div>
        <div className={styles.heroImage}><Image src="/book-direct-banner-bg.webp" alt="Pelican Beach Resort overlooking the Gulf of Mexico in Destin Florida" fill priority sizes="(max-width: 900px) 100vw, 48vw" /></div>
      </section>

      <section className={styles.searchSection} id="search">
        <div className={styles.sectionIntro}><p className={styles.kicker}>{hasValidSearch ? "Live results" : "Start with your stay"}</p><h2>{hasValidSearch ? "Available condos for your dates." : "Check live availability in one search."}</h2><p>{hasValidSearch ? "Choose an available condo below to review its complete total and continue securely." : "Enter your arrival, departure and guest count below. Results come directly from the live reservation calendar."}</p></div>
        {hasValidSearch && <div className={styles.searchSummary} aria-label="Current availability search">
          <strong style={{ color: "#087789", fontSize: ".78rem", letterSpacing: ".08em", textTransform: "uppercase" }}>Your search</strong>
          <span>{displayDate(arrival)} – {displayDate(departure)}</span>
          <span>{Number.isFinite(adults) ? adults : totalGuests} {Number.isFinite(adults) && adults === 1 ? "adult" : "adults"}</span>
          <span>{Number.isFinite(children) ? children : 0} children/infants</span>
          <span>{totalGuests} total {totalGuests === 1 ? "guest" : "guests"}</span>
          <button type="button" onClick={() => setShowChangeSearch((current) => !current)}>{showChangeSearch ? "Keep these dates" : "Change dates"}</button>
        </div>}
        {(!hasValidSearch || showChangeSearch) && <AvailabilitySearch id="availability-form" initialArrival={arrival} initialDeparture={departure} initialAdults={Number.isFinite(adults) ? adults : 2} initialChildren={Number.isFinite(children) ? children : 0} />}
        {hasSearchInputs && validationError && <div className={styles.liveResults} aria-live="polite"><p className={styles.error}>{validationError}</p></div>}
        {hasValidSearch && <div className={styles.liveResults} aria-live="polite">
          {!liveResults && !resultsError && <p className={styles.loading}>Checking both live calendars…</p>}
          {resultsError && <p className={styles.error}>{resultsError}</p>}
          {liveResults && unknownCondos.length > 0 && <p className={styles.error}>One live calendar could not be verified. Only confirmed available results are shown; please retry before ruling out the other condo.</p>}
          {liveResults && availableCondos.length > 0 && <><div className={styles.resultsHeading}><p className={styles.kicker}>Available for your stay</p><h3>Choose a condo to see the complete total.</h3><p>Dates and guest counts will carry into the secure unit checkout.</p></div><div className={styles.resultGrid}>{availableCondos.map((condo) => <article key={condo.number}><div className={styles.resultImage}><Image src={condo.image} alt={condo.alt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div><p>{condo.label}</p><h4>Unit {condo.number}</h4><SiteButton href={`${condo.href}?${bookingQuery}#checkout`} variant="primary">See complete total</SiteButton></div></article>)}</div></>}
          {liveResults && availableCondos.length === 0 && unknownCondos.length === 0 && <div className={styles.resultsHeading}><p className={styles.kicker}>No exact match</p><h3>Neither condo is open for the full date range.</h3><p>Try nearby dates above or ask Live Chat to help find the closest available stay.</p><SiteButton href="/destin-ai-concierge" variant="secondary">Ask Live Chat</SiteButton></div>}
        </div>}
        <p className={styles.discount}>Availability is checked live here. The selected unit page shows the complete current total—including rent, fees and taxes—before you reserve.</p>
      </section>

      <section className={styles.condos}>
        <div className={styles.sectionIntro}><p className={styles.kicker}>Know exactly where you will stay</p><h2>Compare the condos before checkout.</h2><p>Both are Gulf-front, one-bedroom, two-bath homes at Pelican Beach Resort. Each sleeps up to six people, including infants.</p></div>
        <div className={styles.condoGrid}>{condos.map((condo) => <article key={condo.number}><div className={styles.cardImage}><Image src={condo.image} alt={condo.alt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div><p>{condo.label}</p><h3>Pelican Beach Resort Unit {condo.number}</h3><ul><li>1 bedroom</li><li>2 bathrooms</li><li>Sleeps up to 6</li></ul><SiteButton href={condo.href} variant="secondary">Explore Unit {condo.number}</SiteButton></div></article>)}</div>
      </section>

      <section className={styles.calendarSection}>
        <div className={styles.sectionIntro}><p className={styles.kicker}>Calendar view</p><h2>See the broader availability pattern.</h2><p>Use the calendar to compare nearby dates. Select the exact stay in the search above before relying on availability or pricing.</p></div>
        <div className={styles.calendarShell}><div className="ownerrez-widget" data-widget-type="Ribbon Calendar" data-widgetid={calendarWidgetId}></div></div>
      </section>

      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Need help choosing?</p><h2>Ask about dates, layouts or the resort.</h2><p>Live Chat can help compare the condos. Secure checkout remains the final source for availability, totals and reservation terms.</p></div><SiteButton href="/destin-ai-concierge" variant="primary" size="large">Open Live Chat</SiteButton></section>
    </main>

    <SiteFooter />
    <Script src="https://app.ownerrez.com/widget.js" strategy="afterInteractive" />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
