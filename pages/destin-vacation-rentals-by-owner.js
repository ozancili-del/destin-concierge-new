import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import styles from "../styles/CondoCollection.module.css";

const liveSite = "https://www.destincondogetaways.com";
const pageUrl = `${liveSite}/destin-vacation-rentals-by-owner`;

const condos = [
  {
    number: "707",
    floor: "Seventh floor",
    style: "Classic Coastal",
    href: "/condos/unit-707",
    image: "/hub-beaches.webp",
    alt: "Gulf-front balcony and beach view from Pelican Beach Resort Unit 707 in Destin",
    description: "A warm coastal home with a direct Gulf view that feels close to the shoreline.",
  },
  {
    number: "1006",
    floor: "Tenth floor",
    style: "Fresh Coastal",
    href: "/condos/unit-1006",
    image: "/hub-beachcam.webp",
    alt: "Elevated Gulf of Mexico view from Pelican Beach Resort Unit 1006 in Destin",
    description: "A fresh coastal interior with a higher panoramic perspective over the Gulf.",
  },
];

const sharedFeatures = [
  ["873 sq ft", "One-bedroom condo layout"],
  ["Sleeps up to 6", "King bed, hallway bunks and queen sleeper sofa"],
  ["2 bathrooms", "Useful separation for couples and families"],
  ["Full kitchen", "Appliances, cookware and dining essentials"],
  ["Private balcony", "Direct, unobstructed Gulf-facing view"],
  ["Connected stay", "High-speed Wi-Fi, cable and two smart TVs"],
  ["Beachfront building", "Elevator-to-sand access with no road to cross"],
  ["Resort amenities", "Pools, hot tubs, fitness facilities and courts"],
];

const reviews = [
  { name: "Carly J.", text: "The home was modern, close to popular restaurants and excursions, and the ocean view was breathtaking. We had such a relaxing stay." },
  { name: "Steven O.", text: "The location was great and beach access was simple. Ozan's communication and local suggestions made our first Destin trip memorable." },
  { name: "Ariana B.", text: "The home was clean, comfortable and exactly as described. Ozan was responsive and helpful, and the location was perfect for exploring." },
];

const faqs = [
  { q: "Are these Destin vacation rentals truly beachfront?", a: "Yes. Units 707 and 1006 are in the Gulf-front Pelican building at Pelican Beach Resort. Guests take the elevator to beach level and reach the sand without crossing a road." },
  { q: "How many guests can each condo accommodate?", a: "Each condo accommodates a maximum of six people, including adults, children and infants. Both have one bedroom, two bathrooms, hallway bunks and a queen sleeper sofa." },
  { q: "What is the difference between Unit 707 and Unit 1006?", a: "The principal differences are floor level, interior style and viewing perspective. Unit 707 is on the seventh floor with Classic Coastal styling; Unit 1006 is on the tenth floor with Fresh Coastal styling. Both have direct Gulf-facing balconies and the same core layout." },
  { q: "Why book a Destin condo directly with the owner?", a: "Direct booking lets you choose the exact condo, communicate with the owner and avoid a separate marketplace guest service fee. Depending on the platform and reservation, that fee difference can be as much as 20%. The secure booking flow shows the complete current price and controlling policies before payment." },
  { q: "How do I check live availability and pricing?", a: "Enter your dates and guest count in the live availability form. The live reservation system supplies the current calendar, total pricing and secure checkout. Review all adults, children and infants before reserving." },
];

function vacationRentalSchema(condo) {
  return {
    "@type": "VacationRental",
    "@id": `${liveSite}${condo.href}#vacation-rental`,
    name: `Pelican Beach Resort Unit ${condo.number}`,
    url: `${liveSite}${condo.href}`,
    image: `${liveSite}${condo.image}`,
    description: `${condo.style} one-bedroom, two-bath Gulf-front vacation rental at Pelican Beach Resort in Destin, Florida. Sleeps up to six guests.`,
    additionalType: "Condo",
    numberOfBedrooms: 1,
    numberOfBathroomsTotal: 2,
    occupancy: { "@type": "QuantitativeValue", maxValue: 6 },
    floorSize: { "@type": "QuantitativeValue", value: 873, unitCode: "FTK" },
    address: { "@type": "PostalAddress", streetAddress: `1002 US-98, Unit ${condo.number}`, addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" },
    containedInPlace: { "@id": `${liveSite}/resort#place` },
  };
}

export default function CondoCollection() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${pageUrl}#webpage`, url: pageUrl, name: "Destin Vacation Rentals by Owner at Pelican Beach Resort", description: "Compare two owner-managed Gulf-front Destin vacation rentals at Pelican Beach Resort, check live availability and book securely.", isPartOf: { "@id": `${liveSite}/#website` }, about: { "@id": `${liveSite}/#business` }, mainEntity: { "@id": `${pageUrl}#condos` } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Destin Vacation Rentals by Owner", item: pageUrl }] },
      { "@type": "ItemList", "@id": `${pageUrl}#condos`, name: "Owner-managed condos at Pelican Beach Resort", numberOfItems: 2, itemListElement: condos.map((condo, index) => ({ "@type": "ListItem", position: index + 1, item: { "@id": `${liveSite}${condo.href}#vacation-rental` } })) },
      { "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) },
      ...condos.map(vacationRentalSchema),
    ],
  };

  return <div className={styles.page}>
    <Head>
      <title>Destin Vacation Rentals by Owner | Pelican Beach Resort</title>
      <meta name="description" content="Compare owner-managed Gulf-front Destin vacation rentals at Pelican Beach Resort. Explore Units 707 and 1006, check live availability and book securely." />
      <meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={pageUrl} />
      <meta property="og:title" content="Destin Vacation Rentals by Owner at Pelican Beach Resort" />
      <meta property="og:description" content="Compare two Gulf-front condos, see the exact homes and check live availability." />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={`${liveSite}/book-direct-banner-bg.webp`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>

    <div className={styles.preview}>Preview page | Production remains unchanged</div>
    <div className={styles.utility}><a href="/reviews">Guest Reviews</a><a href="#faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href="/about">Contact</a></div>
    <SiteHeader availabilityHref="#availability" />

    <main>
      <section className={styles.hero}>
        <div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kicker}>Owner-managed stays on the Gulf</p><h1>Destin vacation rentals by owner at Pelican Beach Resort</h1><p>Compare the Gulf-front vacation rentals offered here, see each home and check live availability in one secure search.</p><div className={styles.actions}><SiteButton href="#availability" variant="primary" size="large">Check live availability</SiteButton><SiteButton href="#compare" variant="secondary" size="large">Explore the condos</SiteButton></div><div className={styles.trust}><span>4.94 average rating</span><span>400+ stays</span><span>Secure checkout</span></div></div>
        <div className={styles.heroVisual}><Image src="/book-direct-banner-bg.webp" alt="Pelican Beach Resort and white-sand beach in Destin Florida" fill priority sizes="(max-width: 900px) 100vw, 50vw" /><div><strong>Exact condo.</strong><span>Direct Gulf view.</span></div></div>
      </section>

      <AvailabilitySearch className={styles.availability} />

      <section className={styles.intro}>
        <div><p className={styles.kicker}>A more useful way to choose</p><h2>Start with the home—not merely the destination.</h2></div>
        <div><p>Pelican Beach Resort condos are individually owned, so interiors, floor levels and viewing angles differ. These two homes share the same practical one-bedroom, two-bath layout, but each has its own style and Gulf perspective.</p><p>Both are in the main beachfront Pelican building at <strong>1002 US-98, Destin, Florida</strong>. There is no road between the building and the beach.</p></div>
      </section>

      <section className={styles.compare} id="compare">
        <div className={styles.sectionIntro}><p className={styles.kicker}>Compare the exact condos</p><h2>Same beachfront setting. Two distinct homes.</h2><p>Open either dedicated page for its complete photo gallery, room details, reviews, availability calendar and secure checkout.</p></div>
        <div className={styles.condoGrid}>{condos.map((condo) => <article key={condo.number}><div className={styles.cardImage}><Image src={condo.image} alt={condo.alt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div className={styles.cardBody}><p>{condo.floor} · {condo.style}</p><h3>Pelican Beach Resort Unit {condo.number}</h3><p className={styles.cardDescription}>{condo.description}</p><ul><li>1 bedroom · 2 bathrooms</li><li>873 square feet</li><li>Sleeps up to 6</li><li>Private Gulf-front balcony</li></ul><div className={styles.cardActions}><SiteButton href={condo.href} variant="secondary">Explore Unit {condo.number}</SiteButton><SiteButton href="#availability" variant="primary">Check dates</SiteButton></div></div></article>)}</div>
      </section>

      <section className={styles.features}><div className={styles.sectionIntro}><p className={styles.kicker}>What both condos include</p><h2>The practical details, collected in one place.</h2></div><div className={styles.featureGrid}>{sharedFeatures.map(([title, copy]) => <article key={title}><strong>{title}</strong><p>{copy}</p></article>)}</div></section>

      <section className={styles.direct}>
        <div className={styles.directImage}><Image src="/beaches-pelican-beachfront.jpg" alt="White-sand beachfront at Pelican Beach Resort in Destin" fill sizes="(max-width: 900px) 100vw, 46vw" /></div>
        <div className={styles.directCopy}><p className={styles.kicker}>Why guests book directly</p><h2>Known condo, secure checkout and direct communication.</h2><p>Large marketplaces can be useful for discovery, but direct booking keeps the reservation connected to the person who manages these homes. You receive secure online checkout and can review the complete price, policies and guest counts before paying.</p><ul><li>Choose the exact condo you want</li><li>Ask the owner questions before reserving</li><li>Avoid a separate marketplace guest service fee</li><li>Save up to 20% compared with some platform totals, depending on the stay and platform</li><li>Review current pricing and controlling terms before payment</li></ul><a href="/why-book-direct">Read the complete direct-booking guide →</a></div>
      </section>

      <section className={styles.resort}>
        <div><p className={styles.kicker}>Pelican Beach Resort</p><h2>Direct beach access plus the amenities families use.</h2><p>The Gulf is immediately behind the building. The resort also provides indoor and outdoor pools, hot tubs, fitness facilities, tennis and pickleball courts, grills, parking and seasonal food and beach services.</p><SiteButton href="/resort" variant="secondary">Explore the resort</SiteButton></div>
        <div className={styles.resortFacts}><article><strong>3 pools</strong><span>Including an indoor/outdoor option</span></article><article><strong>2 hot tubs</strong><span>Alongside pool and wellness facilities</span></article><article><strong>No road to cross</strong><span>Elevator-to-sand beachfront access</span></article><article><strong>Central Destin</strong><span>Near dining, HarborWalk and family activities</span></article></div>
      </section>

      <section className={styles.reviews}><div className={styles.sectionIntro}><p className={styles.kicker}>Guest experiences</p><h2>Personal hosting backed by hundreds of stays.</h2></div><div className={styles.reviewGrid}>{reviews.map((review) => <blockquote key={review.name}><div aria-label="Five out of five stars">★★★★★</div><p>“{review.text}”</p><footer><strong>{review.name}</strong><span>Verified guest feedback</span></footer></blockquote>)}</div><p className={styles.centerLink}><a href="/reviews">Read more guest reviews →</a></p></section>

      <section className={styles.faq} id="faq"><div className={styles.sectionIntro}><p className={styles.kicker}>Frequently asked questions</p><h2>Answers before you choose.</h2></div>{faqs.map((faq) => <details key={faq.q}><summary>{faq.q}</summary><p>{faq.a}</p></details>)}</section>

      <section className={styles.related}><div><p className={styles.kicker}>Keep planning</p><h2>Useful information around the stay.</h2></div><div className={styles.relatedGrid}><a href="/availability"><span>Availability</span><strong>Search current dates and prices</strong></a><a href="/resort"><span>Resort guide</span><strong>Beach, pools, location and amenities</strong></a><a href="/trip-planner"><span>Trip planner</span><strong>Create a personalized itinerary</strong></a><a href="/blog/destinweather"><span>Weather</span><strong>Conditions and seasonal guidance</strong></a><a href="/blog/best-restaurants-destin"><span>Dining</span><strong>Local restaurant guide</strong></a><a href="/beach-cam"><span>Beach cam</span><strong>See current Gulf views</strong></a></div></section>

      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Ready when you are</p><h2>Check both condos with one search.</h2><p>Enter the dates and correct total guest count, then review the exact home, complete price and policies before reserving.</p></div><SiteButton href="#availability" variant="primary" size="large">Live availability</SiteButton></section>
    </main>

    <SiteFooter />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
