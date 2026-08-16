import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import styles from "../styles/AvailabilityPage.module.css";

const liveSite = "https://www.destincondogetaways.com";
const searchWidgetId = "984076d873324c5f987365778926c4df";
const calendarWidgetId = "91953f0c6e014ff585bffa8e87bad76e";

const condos = [
  { number: "707", label: "Classic Coastal · Seventh floor", href: "/condos/unit-707", image: "/hub-beaches.png", alt: "Gulf-front view from Pelican Beach Resort Unit 707" },
  { number: "1006", label: "Fresh Coastal · Tenth floor", href: "/condos/unit-1006", image: "/hub-beachcam.png", alt: "Gulf-front setting of Pelican Beach Resort Unit 1006" },
];

export default function AvailabilityPage() {
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
      <meta name="description" content="Check live availability for Gulf-front Pelican Beach Resort condos in Destin. Compare Units 707 and 1006, then review live pricing and book securely through OwnerRez." />
      <meta name="robots" content="noindex,nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={`${liveSite}/availability`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>

    <div className={styles.preview}>Preview page | Production and OwnerRez remain unchanged</div>
    <div className={styles.utility}><a href="/reviews">Guest Reviews</a><a href="/guest-guide#faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href={`${liveSite}/aboutus-574000712`}>Contact</a></div>
    <header className={styles.header}>
      <a className={styles.brand} href="/" aria-label="Destin Condo Getaways homepage"><span className={styles.mark}>DCG</span><span><strong>Destin Condo Getaways</strong><small>Pelican Beach Resort | Destin, Florida</small></span></a>
      <nav aria-label="Main navigation"><a href="/#condos">Condos</a><a href="/resort">The Resort</a><a href="/blog">Destin Guide</a><a href="/beach-cam">Beach Cam</a><a href="/why-book-direct">Why Book Direct</a></nav>
      <SiteButton href="#search" variant="primary" size="compact">Live availability</SiteButton>
    </header>

    <main>
      <section className={styles.hero}>
        <div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kicker}>Live Pelican Beach Resort availability</p><h1>Find the Gulf view that fits your dates.</h1><p>Search both owner-managed condos at once. OwnerRez supplies the current calendar, pricing and secure reservation flow.</p><div className={styles.trust}><span>✓ Live dates</span><span>✓ Exact condo</span><span>✓ Secure OwnerRez checkout</span></div></div>
        <div className={styles.heroImage}><Image src="/book-direct-banner-bg.jpg" alt="Pelican Beach Resort overlooking the Gulf of Mexico in Destin Florida" fill priority sizes="(max-width: 900px) 100vw, 48vw" /></div>
      </section>

      <section className={styles.searchSection} id="search">
        <div className={styles.sectionIntro}><p className={styles.kicker}>Start with your stay</p><h2>Check both condos in one search.</h2><p>Enter your arrival, departure and guest count below. The results come directly from the same OwnerRez system that manages each reservation.</p></div>
        <div className={styles.widgetShell}><div className="ownerrez-widget" data-widget-type="Availability/Property Search" data-widgetid={searchWidgetId}></div><noscript><a href={`${liveSite}/availability`}>Open the secure availability search</a></noscript></div>
        <p className={styles.discount}>Your current direct-booking discount is reflected in the OwnerRez booking flow. Review the complete price, fees, taxes and policies before reserving.</p>
      </section>

      <section className={styles.condos}>
        <div className={styles.sectionIntro}><p className={styles.kicker}>Know exactly where you will stay</p><h2>Compare the condos before checkout.</h2><p>Both are Gulf-front, one-bedroom, two-bath homes at Pelican Beach Resort. Each sleeps up to six people, including infants.</p></div>
        <div className={styles.condoGrid}>{condos.map((condo) => <article key={condo.number}><div className={styles.cardImage}><Image src={condo.image} alt={condo.alt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div><p>{condo.label}</p><h3>Pelican Beach Resort Unit {condo.number}</h3><ul><li>1 bedroom</li><li>2 bathrooms</li><li>Sleeps up to 6</li></ul><SiteButton href={condo.href} variant="secondary">Explore Unit {condo.number}</SiteButton></div></article>)}</div>
      </section>

      <section className={styles.calendarSection}>
        <div className={styles.sectionIntro}><p className={styles.kicker}>Calendar view</p><h2>See the broader availability pattern.</h2><p>Use the calendar to compare nearby dates. Select the exact stay in the search above before relying on availability or pricing.</p></div>
        <div className={styles.calendarShell}><div className="ownerrez-widget" data-widget-type="Ribbon Calendar" data-widgetid={calendarWidgetId}></div></div>
      </section>

      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Need help choosing?</p><h2>Ask about dates, layouts or the resort.</h2><p>Live Chat can help compare the condos. The secure OwnerRez page remains the final source for availability, totals and reservation terms.</p></div><SiteButton href="/concierge" variant="primary" size="large">Open Live Chat</SiteButton></section>
    </main>

    <SiteFooter />
    <Script src="https://app.ownerrez.com/widget.js" strategy="afterInteractive" />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
