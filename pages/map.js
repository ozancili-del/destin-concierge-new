import Head from "next/head";
import Script from "next/script";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import styles from "../styles/GalleryMapFaq.module.css";

const liveSite = "https://www.destincondogetaways.com";
const directions = "https://www.google.com/maps/dir/?api=1&destination=Pelican%20Beach%20Resort%2C%201002%20US-98%2C%20Destin%2C%20FL%2032541";
const mapEmbed = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3441.8171146853974!2d-86.47457320000001!3d30.3845507!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x889145a1fdc5ea1d%3A0x27bea14ea937b3e9!2sDestin%20Getaways%20Condos%20at%20Pelican%20Beach%20Resort!5e0!3m2!1sen!2sus!4v1772737770702!5m2!1sen!2sus";
const nearby = [
  ["The beach", "Directly downstairs", "No road to cross from the main resort building."],
  ["Big Kahuna's", "Across US-98", "Seasonal water park and family attraction."],
  ["The Back Porch", "About 1 mile", "Popular beachfront seafood restaurant."],
  ["HarborWalk Village", "About 3 miles", "Dining, cruises, events and harbor activities."],
  ["Destin Commons", "About 4 miles", "Shopping, dining and entertainment."],
  ["VPS Airport", "About 17 miles", "Destin–Fort Walton Beach Airport; drive time varies."],
];

export default function MapPage() {
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "Map", "@id": `${liveSite}/map#map`, url: `${liveSite}/map`, name: "Pelican Beach Resort Map and Directions", about: { "@id": `${liveSite}/#business` } },
    { "@type": "LodgingBusiness", "@id": `${liveSite}/#business`, name: "Destin Condo Getaways", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 }, hasMap: directions },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Map & Directions", item: `${liveSite}/map` }] },
  ] };

  return <div className={styles.page}>
    <Head><title>Pelican Beach Resort Map & Directions | Destin</title><meta name="description" content="Find Pelican Beach Resort at 1002 US-98 in Destin, Florida. View the map, get driving directions and see nearby beaches, dining, attractions and airports."/><meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"}/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="canonical" href={`${liveSite}/map`}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}/></Head>
    <div className={styles.preview}>Migration preview | Production remains unchanged</div><SiteHeader/>
    <main>
      <section className={styles.mapHero}><div><a href="/">Home</a><p className={styles.kickerLight}>Map &amp; directions</p><h1>Beachfront in the heart of Destin.</h1><p>Pelican Beach Resort is at 1002 US-98, with direct Gulf access and central-Destin attractions nearby.</p><SiteButton href={directions} variant="primary" size="large">Open driving directions</SiteButton></div></section>
      <AvailabilitySearch />
      <section className={styles.mapSection}><div className={styles.mapCopy}><p className={styles.kicker}>Pelican Beach Resort</p><h2>1002 US-98, Destin, FL 32541</h2><p>Our vacation rentals are in the resort&apos;s main Gulf-front building. Guests can take the elevator to beach level and walk directly onto the sand without crossing a road.</p><div><a href="/condos/unit-707"><strong>Unit 707</strong><span>Seventh-floor Gulf view →</span></a><a href="/condos/unit-1006"><strong>Unit 1006</strong><span>Tenth-floor panoramic view →</span></a></div></div><iframe title="Google Map showing Pelican Beach Resort in Destin Florida" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={mapEmbed}/></section>
      <section className={styles.nearby}><div className={styles.sectionHead}><p className={styles.kicker}>Around the resort</p><h2>Useful reference points.</h2><p>Distances are approximate. Seasonal traffic can materially change drive times.</p></div><div>{nearby.map(([name, distance, copy]) => <article key={name}><span>{distance}</span><h3>{name}</h3><p>{copy}</p></article>)}</div></section>
      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Stay directly on the Gulf</p><h2>Check your dates at Pelican Beach Resort.</h2></div><SiteButton href="#availability" variant="primary" size="large">Live availability</SiteButton></section>
    </main><SiteFooter/><Script src="/destiny-loader.js" strategy="lazyOnload"/>
  </div>;
}
