import Head from "next/head";
import Script from "next/script";
import AvailabilitySearch from "./AvailabilitySearch";
import SiteButton from "./SiteButton";
import styles from "../styles/UnitPage.module.css";

const liveSite = "https://www.destincondogetaways.com";
const amenityGroups = [
  ["Sleep", "King bedroom, hallway bunks and a queen sleeper sofa"],
  ["Cook", "Full kitchen with refrigerator, oven, microwave and dishwasher"],
  ["Connect", "High-speed Wi-Fi, smart TVs and cable service"],
  ["Swim", "Direct beach access, three pools, a kiddie pool and two hot tubs"],
  ["Recharge", "Fitness center, sauna, steam room and private Gulf balcony"],
  ["Arrive", "Free parking, elevators and paid J1772 EV charging"],
];
const policies = [
  "Check-in is 4:00 PM Central and checkout is 10:00 AM Central.",
  "Maximum occupancy is six people, including infants.",
  "No smoking and no pets. The minimum rental age is 25 unless married.",
  "A non-refundable 20% deposit plus processing fees is collected at booking; the remaining balance is due 30 days before arrival.",
  "Cancellations more than 30 days before arrival forfeit the deposit. Cancellations within 30 days are non-refundable.",
  "County-issued mandatory evacuations receive a prorated refund for paid, unused nights after the order begins. Travel insurance is strongly recommended.",
];

export default function UnitPage({ unit }) {
  const canonical = `${liveSite}/condos/unit-${unit.number}`;
  const rental = { ...unit.schema, "@id": `${canonical}#rental`, url: canonical, image: unit.schema.image };
  const structuredData = { "@context": "https://schema.org", "@graph": [
    rental,
    { "@type": "WebPage", "@id": `${canonical}#webpage`, url: canonical, name: unit.title, description: rental.description, mainEntity: { "@id": `${canonical}#rental` } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Condos", item: `${liveSite}/#condos` },
      { "@type": "ListItem", position: 3, name: `Unit ${unit.number}`, item: canonical },
    ] },
  ] };
  const gallery = unit.schema.image.slice(0, 9);

  return <div className={styles.page}>
    <Head>
      <title>{unit.title}</title>
      <meta name="description" content={rental.description} />
      <meta name="robots" content="noindex,nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>
    <div className={styles.preview}>Preview page | Secure booking remains powered by OwnerRez</div>
    <div className={styles.utility}><a href="/reviews">Guest Reviews</a><a href="/guest-guide#faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href="mailto:ozan@destincondogetaways.com">Contact</a></div>
    <header className={styles.header}>
      <a className={styles.brand} href="/"><span>DCG</span><strong>Destin Condo Getaways<small>Pelican Beach Resort | Destin, Florida</small></strong></a>
      <nav><a href="/#condos">Condos</a><a href="/resort">The Resort</a><a href="/blog">Destin Guide</a><a href="/beach-cam">Beach Cam</a><a href="/why-book-direct">Why Book Direct</a></nav>
      <SiteButton href="#availability" variant="primary" size="compact">Live availability</SiteButton>
    </header>
    <main>
      <section className={styles.hero}>
        <img src={gallery[0]} alt={`${unit.style} living space and Gulf view in Unit ${unit.number}`} width="1800" height="1200" />
        <div className={styles.shade}></div>
        <div className={styles.heroCopy}><a href="/">Home</a><span>/</span><a href="/#condos">Condos</a><p>{unit.floorLabel} · 1 bedroom · 2 bathrooms · sleeps up to 6</p><h1>Pelican Beach Resort Unit {unit.number}</h1><h2>{unit.style}</h2><div className={styles.actions}><SiteButton href="#availability" variant="primary" size="large">Check your dates</SiteButton><SiteButton href={unit.ownerRezUrl} variant="light" size="large">Secure booking page</SiteButton></div></div>
      </section>
      <AvailabilitySearch className={styles.availability} />
      <section className={styles.intro}><div><p className={styles.kicker}>Your exact condo</p><h2>{unit.introTitle}</h2></div><div>{unit.intro.map((p) => <p key={p}>{p}</p>)}</div></section>
      <section className={styles.gallery} aria-label={`Photo gallery for Unit ${unit.number}`}>{gallery.map((src, index) => <img key={src} src={src} alt={`${unit.style} Unit ${unit.number} ${unit.photoAlts[index] || "condo and resort view"}`} loading={index < 3 ? "eager" : "lazy"} width="1200" height="800" />)}</section>
      <section className={styles.features}><div className={styles.sectionHead}><p className={styles.kicker}>What is included</p><h2>Comfort inside, full resort access outside.</h2></div><div className={styles.featureGrid}>{amenityGroups.map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
      <section className={styles.view}><img src={gallery[1]} alt={`Private Gulf-view balcony at Unit ${unit.number}`} loading="lazy" width="1400" height="900"/><div><p className={styles.kicker}>{unit.floorLabel}</p><h2>{unit.viewTitle}</h2><p>{unit.viewCopy}</p><SiteButton href="/beach-cam" variant="secondary">See the live beach cams</SiteButton></div></section>
      <section className={styles.policies} id="policies"><div className={styles.sectionHead}><p className={styles.kicker}>Important booking details</p><h2>Clear policies before checkout.</h2></div><ul>{policies.map((policy) => <li key={policy}>{policy}</li>)}</ul></section>
      <section className={styles.location}><div><p className={styles.kicker}>Directly beachfront</p><h2>Pelican Beach Resort, central Destin.</h2><p>1002 US Highway 98, Destin, Florida 32541. Walk from the elevator to the white sand without crossing a road.</p></div><iframe title="Map showing Pelican Beach Resort in Destin Florida" loading="lazy" src="https://www.google.com/maps/embed?pb=!1m7!1m2!1m1!1d2256.99444007874!3m3!1m2!1s0!2zMzAuMzg0NDQ4MTEsLTg2LjQ3NDY2NzA1"></iframe></section>
      <section className={styles.finalCta}><div><p>Ready to check Unit {unit.number}?</p><h2>Start with live availability.</h2><small>The final rate, guest count and reservation are reviewed on the secure OwnerRez booking page.</small></div><div className={styles.actions}><SiteButton href="#availability" variant="primary" size="large">Live availability</SiteButton><SiteButton href={unit.ownerRezUrl} variant="light" size="large">Open secure booking</SiteButton></div></section>
    </main>
    <footer className={styles.footer}><div><strong>Destin Condo Getaways</strong><p>Thoughtful owner-direct hospitality at Pelican Beach Resort.</p><a href="tel:+19723574262">(972) 357-4262</a><a href="mailto:ozan@destincondogetaways.com">ozan@destincondogetaways.com</a></div><div><strong>Stay</strong><a href="/condos/unit-707">Unit 707</a><a href="/condos/unit-1006">Unit 1006</a><a href="#availability">Availability</a><a href="/reviews">Reviews</a></div><div><strong>Plan</strong><a href="/resort">The Resort</a><a href="/beach-cam">Beach Cam</a><a href="/blog">Destin Guides</a><a href="/guest-guide">Guest Guide</a></div><div><strong>Booking</strong><a href="/why-book-direct">Why book direct</a><a href="#policies">Policies</a><a href={unit.ownerRezUrl}>Secure OwnerRez page</a></div></footer>
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
