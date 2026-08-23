import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import styles from "../styles/VirtualToursPage.module.css";

const liveSite = "https://www.destincondogetaways.com";
const tours = [
  { unit: "707", floor: "Seventh-floor Gulf-front condo", href: "/pelican-beach-resort-unit-707", embed: "https://kuula.co/share/collection/7Xtss?logo=0&info=0&fs=1&vr=1&sd=1&initload=0&autorotate=-0.47&autopalt=1&thumbs=1" },
  { unit: "1006", floor: "Tenth-floor Gulf-front condo", href: "/pelican-beach-resort-unit-1006", embed: "https://kuula.co/share/collection/7XtwX?logo=0&info=0&fs=1&vr=1&sd=1&initload=0&autorotate=-0.47&autopalt=1&thumbs=1" },
];

export default function VirtualToursPage() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": `${liveSite}/pelican-beach-resort-condo-virtual-tours#webpage`, url: `${liveSite}/pelican-beach-resort-condo-virtual-tours`, name: "Pelican Beach Resort Condo Virtual Tours", description: "Walk through interactive 360-degree tours of owner-managed Pelican Beach Resort condos in Destin, Florida.", isPartOf: { "@id": `${liveSite}/#website` }, about: { "@id": `${liveSite}/#business` } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Virtual Tours", item: `${liveSite}/pelican-beach-resort-condo-virtual-tours` }] },
    { "@type": "ItemList", name: "Pelican Beach Resort condo virtual tours", numberOfItems: 2, itemListElement: tours.map((tour, index) => ({ "@type": "ListItem", position: index + 1, item: { "@type": "MediaObject", name: `Pelican Beach Resort Unit ${tour.unit} 360-degree virtual tour`, contentUrl: tour.embed, embedUrl: tour.embed, about: { "@id": `${liveSite}${tour.href}#vacation-rental` } } })) },
  ] };

  return <div className={styles.page}>
    <Head>
      <title>Pelican Beach Resort Virtual Tours | Destin Condos</title>
      <meta name="description" content="Explore interactive 360-degree virtual tours of Pelican Beach Resort Units 707 and 1006 in Destin, Florida before checking dates or booking direct." />
      <meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"} /><meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={`${liveSite}/pelican-beach-resort-condo-virtual-tours`} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>
    {process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== "production" ? <div className={styles.preview}>Preview page | Production remains unchanged</div> : null}
    <div className={styles.utility}><a href="/destin-condo-rental-reviews">Guest Reviews</a><a href="/guest-guide#faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href="/about">Contact</a></div>
    <SiteHeader availabilityHref="#availability" />
    <main>
      <section className={styles.hero}>
        <div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kicker}>Interactive 360° walkthroughs</p><h1>Step inside before you choose.</h1><p>Tour the living room, bedroom, hallway and balcony areas of each exact Pelican Beach Resort condo. Move through every scene, look in any direction and compare the two homes before checking your dates.</p><div className={styles.trust}><span>✓ Exact condos</span><span>✓ Full-screen viewing</span><span>✓ Desktop, mobile and VR</span></div></div>
        <div className={styles.heroImage}><Image src="/book-direct-banner-bg.webp" alt="Pelican Beach Resort and the Gulf of Mexico in Destin Florida" fill priority sizes="(max-width: 900px) 100vw, 48vw" /></div>
      </section>
      <AvailabilitySearch id="availability" />
      <section className={styles.tours}>
        <div className={styles.sectionIntro}><p className={styles.kicker}>Choose a condo to explore</p><h2>Two Gulf-front homes. Two complete walkthroughs.</h2><p>Select a room from the thumbnail strip, drag to look around, or use the full-screen control for the most immersive view.</p></div>
        {tours.map((tour) => <article className={styles.tourCard} id={`unit-${tour.unit}`} key={tour.unit}>
          <div className={styles.tourHeading}><div><p className={styles.kicker}>{tour.floor}</p><h2>Pelican Beach Resort Unit {tour.unit}</h2><p>One bedroom, two bathrooms, a full kitchen, flexible sleeping space for up to six guests, and a private Gulf-front balcony.</p></div><SiteButton href={tour.href} variant="secondary">Photos &amp; details</SiteButton></div>
          <div className={styles.embedShell}><iframe src={tour.embed} title={`Interactive 360-degree virtual tour of Pelican Beach Resort Unit ${tour.unit}`} allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>
          <div className={styles.tourFooter}><span>Tour photography by Tim Kramer Photography</span><a href={tour.embed} target="_blank" rel="noopener noreferrer">Open Unit {tour.unit} tour in a new window →</a></div>
        </article>)}
      </section>
      <section className={styles.context}>
        <div className={styles.contextImage}><Image src="/hub-resort.png" alt="Pelican Beach Resort beachfront setting in Destin" fill sizes="(max-width: 900px) 100vw, 44vw" /></div>
        <div><p className={styles.kicker}>What the tour helps you compare</p><h2>See the layout—not merely a room category.</h2><p>Pelican Beach Resort condos are individually owned, so finishes, furnishings, floor level and views can differ. These tours show the two specific homes offered by Destin Condo Getaways.</p><ul><li>Living room, kitchen and sleeping layout</li><li>Private balcony orientation and Gulf view</li><li>Bedroom, bunks and two-bathroom arrangement</li><li>The actual décor and flow of each condo</li></ul><p>For current amenities and presentation, pair the virtual tour with the complete photo gallery on each unit page.</p><div className={styles.actions}><SiteButton href="/destin-vacation-rentals-by-owner" variant="secondary">Compare the condos</SiteButton><SiteButton href="/destin-condo-rental-reviews" variant="outline">Read guest reviews</SiteButton></div></div>
      </section>
      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Ready to make it real?</p><h2>Check your dates and review the complete stay.</h2><p>The secure booking flow provides live availability, pricing, fees, taxes and reservation terms for the exact condo you select.</p></div><SiteButton href="/availability" variant="primary" size="large">Live availability</SiteButton></section>
    </main>
    <SiteFooter /><Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
