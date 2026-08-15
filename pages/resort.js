import Head from "next/head";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import AvailabilitySearch from "../components/AvailabilitySearch";
import styles from "../styles/Resort.module.css";

const liveSite = "https://www.destincondogetaways.com";
const resortAddress = { "@type": "PostalAddress", streetAddress: "1002 US Highway 98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" };
const geo = { "@type": "GeoCoordinates", latitude: 30.39347, longitude: -86.49583 };

const amenities = [
  ["Beachfront", "Private beach access with no road to cross"],
  ["Pools", "Three heated pools, a kiddie pool and two hot tubs"],
  ["Wellness", "Fitness center, sauna and steam room"],
  ["Courts", "Complimentary tennis and pickleball courts"],
  ["Convenience", "Seasonal cafÃ©, Tiki Bar and beach-chair service"],
  ["Parking", "Covered and uncovered parking plus two paid J1772 EV chargers"],
  ["Practical", "Gas grills, outdoor seating and laundry on every floor"],
  ["Support", "24/7 front desk and on-site security"],
];

const faqs = [
  { q: "Is Pelican Beach Resort truly beachfront in Destin?", a: "Yes. The Pelican building at 1002 US-98 sits directly on the Gulf of Mexico. Guests take the elevator to beach level and walk to the sand without crossing a road or parking lot. Units 707 and 1006 are both in this beachfront building; the separate Terrace building faces US-98." },
  { q: "How many pools does Pelican Beach Resort have?", a: "The resort has three pools: two outdoor pools and an indoor/outdoor pool that supports year-round swimming. There is also a kiddie pool and two hot tubs. Heating and operating details can vary seasonally." },
  { q: "How many floors does Pelican Beach Resort have?", a: "The beachfront building has 20 floors, with no labeled 13th floor, and 339 individually owned condos. The resort was built in 1996 and completed substantial renovations in 2022â€“23." },
  { q: "Does Pelican Beach Resort have EV chargers?", a: "Yes. Two paid J1772 EV chargers are available to resort guests in the covered roof-level parking area." },
  { q: "How far is Pelican Beach Resort from the airport?", a: "Destinâ€“Fort Walton Beach Airport (VPS) is about 17 miles away, commonly around a 30-minute drive. Pensacola International Airport (PNS) is about 50 miles away and commonly around a 90-minute drive, depending on traffic." },
  { q: "How do I book a condo at Pelican Beach Resort directly?", a: "Search your dates on this page to check Unit 707 and Unit 1006, then review the exact condo, complete price and policies through secure OwnerRez checkout. The current 10% direct-booking discount is automatically reflected there." },
];

const reviews = [
  { name: "Carly J.", date: "2025-11-30", body: "Ozan's rental was absolutely perfect! Modern appliances, close in proximity to popular restaurants and excursions, and the ocean view was breathtaking! My husband and I had such a relaxing stay, we will definitely be back!" },
  { name: "Steven O.", date: "2025-09-07", body: "Ozan communication was invaluable. Location was great, access to beach was simple with pools a huge plus. Ozan's restaurant, activity and local suggestions made our first trip to Destin fun and memorable." },
  { name: "Ariana B.", date: "2025-04-22", body: "My stay at Ozan's place was fantastic! The home was clean, comfortable, and exactly as described. Ozan was responsive and helpful throughout, and the location was perfect for exploring the area." },
];

function accommodation(floor) {
  return {
    "@type": "Accommodation", additionalType: "EntirePlace", floorLevel: String(floor), numberOfRooms: 1, numberOfBedrooms: 1, numberOfBathroomsTotal: 2, floorSize: { "@type": "QuantitativeValue", value: 873, unitCode: "FTK" },
    occupancy: { "@type": "QuantitativeValue", value: 6 },
    bed: [{ "@type": "BedDetails", numberOfBeds: 1, typeOfBed: "King" }, { "@type": "BedDetails", numberOfBeds: 2, typeOfBed: "Bunk" }, { "@type": "BedDetails", numberOfBeds: 1, typeOfBed: "Sofa Bed" }],
    amenityFeature: ["beachAccess","balcony","ac","kitchen","wifi","parking","pool","hotTub","gym","childFriendly","washerDryer"].map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
  };
}

function unitSchema(number, floor, style, image, slug) {
  return {
    "@type": "VacationRental", "@id": `${liveSite}/${slug}#unit`, name: `Pelican Beach Resort Unit ${number} â€“ ${style} Beachfront Condo`,
    description: `Beachfront one-bedroom, two-bathroom condo on the ${floor === 7 ? "seventh" : "tenth"} floor of Pelican Beach Resort in Destin, Florida. Gulf views and sleeping space for up to six guests.`,
    identifier: `destin-condo-getaways-unit-${number}`, additionalType: "Condo", url: `${liveSite}/${slug}`, image: [image], telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com",
    address: { ...resortAddress, streetAddress: `1002 US Highway 98, Unit ${number}` }, geo, checkinTime: "16:00", checkoutTime: "10:00", petsAllowed: false, smokingAllowed: false,
    containedInPlace: { "@id": `${liveSite}/#business` }, containsPlace: accommodation(floor),
  };
}

export default function Resort() {
  const business = {
    "@type": "LodgingBusiness", "@id": `${liveSite}/#business`, name: "Destin Condo Getaways at Pelican Beach Resort", alternateName: "Destin Getaways Condos @ Pelican Beach Resort",
    description: "Owner-direct beachfront vacation-rental condos at Pelican Beach Resort in Destin, Florida.", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com",
    image: ["https://uc.orez.io/i/b004f9895bc24136805cc94e514f4039-Large","https://uc.orez.io/i/44060a8a29ca4a998586d849184d288f-Large","https://uc.orez.io/i/5cd8d28c33e14711a68e723ec300ca2a-Large"],
    logo: "https://uc.orez.io/f/6d35eb37c5304c0f8b080ae8dbf5357a", address: resortAddress, geo, priceRange: "$$", currenciesAccepted: "USD", paymentAccepted: "Credit Card, Debit Card", checkinTime: "16:00", checkoutTime: "10:00", petsAllowed: false, smokingAllowed: false,
    amenityFeature: amenities.map(([name]) => ({ "@type": "LocationFeatureSpecification", name, value: true })), sameAs: ["https://www.facebook.com/DestinCondo"], numberOfRooms: 2,
    aggregateRating: { "@type": "AggregateRating", ratingValue: 4.94, reviewCount: 400, bestRating: 5, worstRating: 1 },
    review: reviews.map((r) => ({ "@type": "Review", datePublished: r.date, reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 }, author: { "@type": "Person", name: r.name }, reviewBody: r.body })),
  };
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": `${liveSite}/resort#webpage`, name: "Pelican Beach Resort in Destin, Florida", description: "A complete guide to Pelican Beach Resort's beachfront location, pools, amenities and owner-direct condo rentals.", about: { "@id": `${liveSite}/#business` } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Pelican Beach Resort", item: `${liveSite}/resort` }] },
    { "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }, business,
    unitSchema(707, 7, "Classic Coastal", "https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-Large", "pelican-beach-resort-unit-707-orp5b47b5ax"),
    unitSchema(1006, 10, "Fresh Coastal", "https://uc.orez.io/i/79fb2b20887c4f44b58c710a59420a30-Large", "pelican-beach-resort-unit-1006-orp5b6450ex"),
  ] };

  return <div className={styles.page}>
    <Head>
      <title>Pelican Beach Resort Destin FL | Beach, Pools & Condo Rentals</title>
      <meta name="description" content="Explore Pelican Beach Resort in Destin: direct beach access, three pools, hot tubs, amenities, location, and owner-direct Units 707 and 1006." />
      <meta name="robots" content="noindex,nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>
    <div className={styles.preview}>Preview page | Production and OwnerRez remain unchanged</div>
    <div className={styles.utility}><a href={`${liveSite}/reviews`}>Guest Reviews</a><a href="#faq">FAQ</a><a href={`${liveSite}/destin-condo-guide-574047967`}>Policies</a><a href={`${liveSite}/aboutus-574000712`}>Contact</a></div>
    <header className={styles.header}><a className={styles.brand} href="/" aria-label="Destin Condo Getaways homepage"><span className={styles.mark}>DCG</span><span><strong>Destin Condo Getaways</strong><small>Pelican Beach Resort | Destin, Florida</small></span></a><nav aria-label="Main navigation"><a href="/#condos">Condos</a><a href="/resort">The Resort</a><a href={`${liveSite}/blog`}>Destin Guide</a><a href={`${liveSite}/destin-live-beach-cam-574002656`}>Beach Cam</a><a href="https://deals.destincondogetaways.com/beach-deals">Deals</a><a href="#faq">FAQ</a></nav><SiteButton href="#availability" variant="primary" size="compact">Check availability</SiteButton></header>

    <main>
      <section className={styles.hero}><img src="https://uc.orez.io/i/b004f9895bc24136805cc94e514f4039-Large" alt="Pelican Beach Resort beachfront and Gulf of Mexico in Destin, Florida" /><div className={styles.heroShade}></div><div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kicker}>The complete resort guide</p><h1>Pelican Beach Resort in Destin, Florida</h1><p>Step off the elevator and onto the beachâ€”no road to cross. Explore the pools, location, amenities and two owner-managed Gulf-front condos before choosing your stay.</p><div className={styles.actions}><SiteButton href="#availability" variant="primary" size="large">Check your dates</SiteButton><SiteButton href="#condos" variant="light" size="large">Compare the condos</SiteButton></div></div></section>

      <AvailabilitySearch className={styles.availability} />

      <section className={styles.intro}><div><p className={styles.kicker}>Why this location stands out</p><h2>Beachfront means beachfront here.</h2></div><div><p>Pelican Beach Resort sits at <strong>1002 US Highway 98, Destin, FL 32541</strong>, directly on the Gulf of Mexico. The Pelican building is the beachfront building: take the elevator to ground level and walk to the white quartz sand without crossing traffic.</p><p>The separate Terrace at Pelican building faces US-98 and is not beachfront. Units 707 and 1006 are both in the Pelican building, with private Gulf-facing balconies.</p></div></section>

      <section className={styles.visualSplit}><img src="https://uc.orez.io/i/5cd8d28c33e14711a68e723ec300ca2a-Large" alt="Private white-sand beach at Pelican Beach Resort in Destin" /><div><p className={styles.kicker}>The private beach</p><h2>White quartz sand, Gulf water and no road between.</h2><p>The shoreline is classic Emerald Coast: bright white quartz sand that remains cooler than darker sand and turquoise water that often surprises first-time visitors.</p><p>Seasonal beach service is operated by La Dolce Vita, generally March through October. Both condos also provide complimentary chairs and an umbrella that guests may set up behind the rental rows. The seasonal Tiki Bar serves drinks and food near the beach seating area.</p></div></section>

      <section className={styles.pools}><div><p className={styles.kicker}>Three pools</p><h2>Room for beach days and cooler-weather swims.</h2><p>Pelican Beach Resort offers two outdoor pools plus an indoor/outdoor pool, along with a kiddie pool and two hot tubs. The indoor/outdoor option helps make the resort useful beyond peak summer.</p><p>Pool heating, service hours and seasonal operations can change; confirm current details for your travel dates.</p></div><img src="https://uc.orez.io/i/8f59759bd89a4eddbcc4c854df147c2f-Large" alt="Heated pools at Pelican Beach Resort in Destin, Florida" /></section>

      <section className={styles.amenities}><div className={styles.sectionHead}><p className={styles.kicker}>What is included</p><h2>Resort amenities in one clear view.</h2></div><div className={styles.amenityGrid}>{amenities.map(([title,copy])=><article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

      <section className={styles.mapSection}><div><p className={styles.kicker}>Explore before arrival</p><h2>See where everything is located.</h2><p>Open the interactive resort map to inspect pools, hot tubs, parking, EV charging, the seasonal Tiki Bar and other useful arrival landmarks.</p></div><iframe title="Interactive map of Pelican Beach Resort amenities" src="/pelican-beach-interactive.html" loading="lazy"></iframe></section>

      <section className={styles.location}><div><p className={styles.kicker}>Central Destin location</p><h2>Minutes from the places guests ask about most.</h2><p>HarborWalk Village is roughly five minutes away, Big Kahuna's Water Park is across US-98, Crab Island is about ten minutes by boat, and Destin Commons is about ten minutes by car. Target and Walgreens are approximately one mile away, with several restaurants on the same block.</p></div><div className={styles.travelGrid}><article><span>VPS airport</span><strong>17 miles</strong><p>Commonly around 30 minutes, depending on traffic.</p></article><article><span>PNS airport</span><strong>50 miles</strong><p>Commonly around 90 minutes, depending on traffic.</p></article><article><span>HarborWalk</span><strong>About 5 min</strong><p>Dining, marina activities and seasonal events.</p></article><article><span>Destin Commons</span><strong>About 10 min</strong><p>Shopping, dining and entertainment.</p></article></div></section>

      <section className={styles.condos} id="condos"><div className={styles.sectionHead}><p className={styles.kicker}>Two owner-managed condos</p><h2>Choose the exact view and style you prefer.</h2><p>Both are one-bedroom, two-bath condos sleeping up to six, with full kitchens, high-speed Wi-Fi, smart TVs, private balconies and beach gear.</p></div><div className={styles.condoGrid}><article><img src="https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-Large" alt="Unit 707 Gulf-view balcony at Pelican Beach Resort" /><div><span>Seventh floor</span><h3>Unit 707</h3><p>Classic coastal style with a Gulf-front balcony and sunset views.</p><SiteButton href={`${liveSite}/pelican-beach-resort-unit-707-orp5b47b5ax`} variant="secondary">Explore Unit 707</SiteButton></div></article><article><img src="https://uc.orez.io/i/79fb2b20887c4f44b58c710a59420a30-Large" alt="Unit 1006 panoramic Gulf view at Pelican Beach Resort" /><div><span>Tenth floor</span><h3>Unit 1006</h3><p>Fresh coastal style with a higher panoramic view over the Gulf.</p><SiteButton href={`${liveSite}/pelican-beach-resort-unit-1006-orp5b6450ex`} variant="secondary">Explore Unit 1006</SiteButton></div></article></div></section>

      <section className={styles.reviews}><div className={styles.sectionHead}><p className={styles.kicker}>Guest experiences</p><h2>4.94 average rating across 400+ stays.</h2></div><div className={styles.reviewGrid}>{reviews.map(r=><blockquote key={r.name}><div aria-label="Five out of five stars">â˜…â˜…â˜…â˜…â˜…</div><p>â€œ{r.body}â€</p><footer><strong>{r.name}</strong><span>{r.date}</span></footer></blockquote>)}</div></section>

      <section className={styles.faq} id="faq"><div className={styles.sectionHead}><p className={styles.kicker}>Frequently asked questions</p><h2>Plan with the important details in hand.</h2></div>{faqs.map(f=><details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</section>

      <section className={styles.related}><div><p className={styles.kicker}>Continue planning</p><h2>From the resort to the rest of Destin.</h2></div><div className={styles.relatedGrid}><a href="/why-book-direct"><span>Book direct</span><strong>Exact-unit assurance and secure checkout</strong></a><a href={`${liveSite}/destin-live-beach-cam-574002656`}><span>Beach cam</span><strong>See current Gulf views</strong></a><a href={`${liveSite}/blog/best-restaurants-destin`}><span>Dining</span><strong>Restaurants near the resort</strong></a><a href={`${liveSite}/blog/destinweather`}><span>Weather</span><strong>What each season brings</strong></a><a href={`${liveSite}/map`}><span>Destin map</span><strong>Explore the surrounding area</strong></a><a href={`${liveSite}/destin-vacation-itinerary-planner-574049367`}><span>Trip planner</span><strong>Create a day-by-day itinerary</strong></a></div></section>

      <section className={styles.finalCta}><div><p>Ready to compare the two condos?</p><h2>Start with your dates.</h2></div><div className={styles.actions}><SiteButton href="#availability" variant="primary" size="large">Check availability</SiteButton><SiteButton href="/why-book-direct" variant="light" size="large">Why book direct</SiteButton></div></section>
    </main>

    <footer className={styles.footer}><div className={styles.footerBrand}><strong>Destin Condo Getaways</strong><p>Thoughtful owner-direct hospitality at Pelican Beach Resort.</p><a href="tel:+19723574262">(972) 357-4262</a><a href="mailto:ozan@destincondogetaways.com">ozan@destincondogetaways.com</a><address>1002 US-98<br/>Destin, FL 32541</address></div><div><strong>Stay</strong><a href={`${liveSite}/pelican-beach-resort-unit-707-orp5b47b5ax`}>Unit 707</a><a href={`${liveSite}/pelican-beach-resort-unit-1006-orp5b6450ex`}>Unit 1006</a><a href="#availability">Availability</a><a href={`${liveSite}/reviews`}>Reviews</a><a href="/why-book-direct">Book direct</a></div><div><strong>Plan</strong><a href={`${liveSite}/blog/how-to-find-cheaper-flights-and-car-rentals`}>Flights</a><a href={`${liveSite}/blog/destincar`}>Car rentals</a><a href="https://explore.destincondogetaways.com/destin-tripshock.html">Activities</a><a href={`${liveSite}/destin-vacation-itinerary-planner-574049367`}>Itinerary planner</a><a href={`${liveSite}/map`}>Destin map</a></div><div><strong>Destin Guides</strong><a href={`${liveSite}/blog/destinweather`}>Weather</a><a href={`${liveSite}/blog/best-beaches-destin`}>Beaches</a><a href={`${liveSite}/blog/best-restaurants-destin`}>Restaurants</a><a href={`${liveSite}/blog/destin-events-2026`}>Events</a><a href={`${liveSite}/blog/destin-fireworks-2026`}>Fireworks</a></div><div><strong>Guest Information</strong><a href={`${liveSite}/destin-condo-guide-574047967`}>Policies</a><a href="#faq">FAQ</a><a href={`${liveSite}/aboutus-574000712`}>Contact</a><a href={`${liveSite}/privacy-574035022`}>Privacy</a><a href={`${liveSite}/destin-live-beach-cam-574002656`}>Live beach cam</a></div></footer>
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}

