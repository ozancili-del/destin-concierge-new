import Head from "next/head";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import styles from "../styles/Resort.module.css";

const liveSite = "https://www.destincondogetaways.com";
const resortAddress = { "@type": "PostalAddress", streetAddress: "1002 US Highway 98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" };
const geo = { "@type": "GeoCoordinates", latitude: 30.3845507, longitude: -86.4745732 };

const amenities = [
  ["Beachfront", "Private beach access with no road to cross"],
  ["Pools", "Three heated pools, a kiddie pool and two hot tubs"],
  ["Wellness", "Fitness center, sauna and steam room"],
  ["Courts", "Complimentary tennis and pickleball courts"],
  ["Convenience", "Seasonal café, Tiki Bar and beach-chair service"],
  ["Parking", "Covered and uncovered parking plus two paid J1772 EV chargers"],
  ["Practical", "Gas grills, outdoor seating and laundry on every floor"],
  ["Support", "24/7 front desk and on-site security"],
];

const faqs = [
  { q: "Is Pelican Beach Resort truly beachfront in Destin?", a: "Yes. The Pelican building at 1002 US-98 sits directly on the Gulf of Mexico. Guests take the elevator to beach level and walk to the sand without crossing a road or parking lot. Units 707 and 1006 are both in this beachfront building; the separate Terrace building faces US-98." },
  { q: "How many pools does Pelican Beach Resort have?", a: "The resort has three pools: two outdoor pools and an indoor/outdoor pool that supports year-round swimming. There is also a kiddie pool and two hot tubs. Heating and operating details can vary seasonally." },
  { q: "How many floors does Pelican Beach Resort have?", a: "The beachfront building has 20 floors, with no labeled 13th floor, and 339 individually owned condos. The resort was built in 1996 and completed substantial renovations in 2022–23." },
  { q: "Does Pelican Beach Resort have EV chargers?", a: "Yes. Two paid J1772 EV chargers are available to resort guests in the covered roof-level parking area." },
  { q: "How far is Pelican Beach Resort from the airport?", a: "Destin–Fort Walton Beach Airport (VPS) is about 17 miles away, commonly around a 30-minute drive. Pensacola International Airport (PNS) is about 50 miles away and commonly around a 90-minute drive, depending on traffic." },
  { q: "How do I book a condo at Pelican Beach Resort directly?", a: "Search your dates on this page, choose the exact available condo, then review the complete price and policies through secure checkout. The current direct-booking discount is automatically reflected there." },
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
    "@type": "VacationRental", "@id": `${liveSite}/${slug}#unit`, name: `Pelican Beach Resort Unit ${number} – ${style} Beachfront Condo`,
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
    image: ["/images/site/b004f9895bc24136805cc94e514f4039-large.webp","/images/site/44060a8a29ca4a998586d849184d288f-large.webp","/images/site/5cd8d28c33e14711a68e723ec300ca2a-large.webp"],
    logo: "/images/site/6d35eb37c5304c0f8b080ae8dbf5357a.webp", address: resortAddress, geo, priceRange: "$$", currenciesAccepted: "USD", paymentAccepted: "Credit Card, Debit Card", checkinTime: "16:00", checkoutTime: "10:00", petsAllowed: false, smokingAllowed: false,
    amenityFeature: amenities.map(([name]) => ({ "@type": "LocationFeatureSpecification", name, value: true })), sameAs: ["https://www.facebook.com/DestinCondoGetaways"],
    aggregateRating: { "@type": "AggregateRating", ratingValue: 4.94, reviewCount: 400, bestRating: 5, worstRating: 1 },
    review: reviews.map((r) => ({ "@type": "Review", datePublished: r.date, reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 }, author: { "@type": "Person", name: r.name }, reviewBody: r.body })),
  };
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": `${liveSite}/pelican-beach-resort-destin#webpage`, name: "Pelican Beach Resort in Destin, Florida", description: "A complete guide to Pelican Beach Resort's beachfront location, pools, amenities and owner-direct condo rentals.", about: { "@id": `${liveSite}/#business` } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Pelican Beach Resort", item: `${liveSite}/pelican-beach-resort-destin` }] },
    { "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }, business,
    unitSchema(707, 7, "Classic Coastal", "/images/site/0f604abce3284748ba8d2150b7646863-large.webp", "pelican-beach-resort-unit-707"),
    unitSchema(1006, 10, "Fresh Coastal", "/images/site/79fb2b20887c4f44b58c710a59420a30-large.webp", "pelican-beach-resort-unit-1006"),
  ] };

  return <div className={styles.page}>
    <Head>
      <title>Pelican Beach Resort Destin FL | Beach, Pools & Condo Rentals</title>
      <meta name="description" content="Explore Pelican Beach Resort in Destin: Gulf-front beach access, three pools, hot tubs, resort amenities, location details and vacation rentals." />
      <meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={`${liveSite}/pelican-beach-resort-destin`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>
    {process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== "production" ? <div className={styles.preview}>Preview page | Production remains unchanged</div> : null}
    <div className={styles.utility}><a href="/destin-condo-rental-reviews">Guest Reviews</a><a href="#faq">FAQ</a><a href="/guest-guide">Policies</a><a href="/about">Contact</a></div>
    <SiteHeader availabilityHref="#availability" />

    <main>
      <section className={styles.hero}><img src="/images/site/b004f9895bc24136805cc94e514f4039-large.webp" alt="Pelican Beach Resort beachfront and Gulf of Mexico in Destin, Florida" /><div className={styles.heroShade}></div><div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kicker}>The complete resort guide</p><h1>Pelican Beach Resort in Destin, Florida</h1><p>Step off the elevator and onto the beach—no road to cross. Explore the pools, location, amenities and Gulf-front vacation rentals before choosing your stay.</p><div className={styles.actions}><SiteButton href="#availability" variant="primary" size="large">Check your dates</SiteButton><SiteButton href="#condos" variant="light" size="large">Explore the condos</SiteButton></div></div></section>

      <AvailabilitySearch />

      <section className={styles.intro}><div><p className={styles.kicker}>Why this location stands out</p><h2>Beachfront means beachfront here.</h2></div><div><p>Pelican Beach Resort sits at <strong>1002 US Highway 98, Destin, FL 32541</strong>, directly on the Gulf of Mexico. The Pelican building is the beachfront building: take the elevator to ground level and walk to the white quartz sand without crossing traffic.</p><p>The separate Terrace at Pelican building faces US-98 and is not beachfront. Units 707 and 1006 are both in the Pelican building, with private Gulf-facing balconies.</p></div></section>

      <section className={styles.visualSplit}><img src="/images/site/5cd8d28c33e14711a68e723ec300ca2a-large.webp" alt="Private white-sand beach at Pelican Beach Resort in Destin" /><div><p className={styles.kicker}>The private beach</p><h2>White quartz sand, Gulf water and no road between.</h2><p>The shoreline is classic Emerald Coast: bright white quartz sand that remains cooler than darker sand and turquoise water that often surprises first-time visitors.</p><p>Seasonal beach service is operated by La Dolce Vita, generally March through October. Both condos also provide complimentary chairs and an umbrella that guests may set up behind the rental rows. The seasonal Tiki Bar serves drinks and food near the beach seating area.</p></div></section>

      <section className={styles.pools}><div><p className={styles.kicker}>Three pools</p><h2>Room for beach days and cooler-weather swims.</h2><p>Pelican Beach Resort offers two outdoor pools plus an indoor/outdoor pool, along with a kiddie pool and two hot tubs. The indoor/outdoor option helps make the resort useful beyond peak summer.</p><p>Pool heating, service hours and seasonal operations can change; confirm current details for your travel dates.</p></div><img src="/images/site/8f59759bd89a4eddbcc4c854df147c2f-large.webp" alt="Heated pools at Pelican Beach Resort in Destin, Florida" /></section>

      <section className={styles.amenities}><div className={styles.sectionHead}><p className={styles.kicker}>What is included</p><h2>Resort amenities in one clear view.</h2></div><div className={styles.amenityGrid}>{amenities.map(([title,copy])=><article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

      <section className={styles.intro}><div><p className={styles.kicker}>Arrival and resort logistics</p><h2>Know the practical details before travel day.</h2></div><div><p>Standard check-in is 4:00 PM and checkout is 10:00 AM. The secure guest instructions supplied for the reservation control access details, parking registration and any current arrival procedures. Do not rely on an old screenshot, a public webpage or a code shared from a previous stay.</p><p>Parking is available in covered and uncovered resort areas, and the property has paid J1772 electric-vehicle chargers. Space, charging availability and resort procedures can change. Guests bringing more than one vehicle, an oversized vehicle or accessibility equipment should confirm the current rules before arrival.</p><p>Unit 707 uses the laundry room on the same floor. Unit 1006 has a washer and dryer inside the condo. Both include a full kitchen, Wi-Fi and smart televisions, but guests should compare each exact unit page for the current amenity list, photographs and sleeping setup.</p></div></section>

      <section className={styles.mapSection}><div><p className={styles.kicker}>Explore before arrival</p><h2>See where everything is located.</h2><p>Open the interactive resort map to inspect pools, hot tubs, parking, EV charging, the seasonal Tiki Bar and other useful arrival landmarks.</p><p>For a rotatable, independently created view of the property, open MyPelicanBeach&apos;s <a href="https://www.mypelicanbeach.com/pelican-beach-resort-interactive-map">interactive 3D resort explorer</a> or its <a href="https://www.mypelicanbeach.com/pelican-beach-resort-3d-condo-finder">3D condo finder</a>.</p></div><iframe title="Interactive map of Pelican Beach Resort amenities" src="/pelican-beach-interactive.html" loading="lazy"></iframe></section>

      <section className={styles.location}><div><p className={styles.kicker}>Central Destin location</p><h2>Minutes from the places guests ask about most.</h2><p>HarborWalk Village is roughly five minutes away, Big Kahuna's Water Park is across US-98, Crab Island is reached through local boat operators, and Destin Commons is about ten minutes by car. Target, Walgreens and several restaurants are close to the resort.</p><p>This central stretch of Destin works well for guests who want a beachfront base without giving up practical access to groceries, dining, the harbor, family attractions and the airports serving the Emerald Coast. Seasonal traffic can materially change drive times, so use live directions on travel days.</p></div><div className={styles.travelGrid}><article><span>VPS airport</span><strong>17 miles</strong><p>Commonly around 30 minutes, depending on traffic.</p></article><article><span>PNS airport</span><strong>50 miles</strong><p>Commonly around 90 minutes, depending on traffic.</p></article><article><span>HarborWalk</span><strong>About 5 min</strong><p>Dining, marina activities and seasonal events.</p></article><article><span>Destin Commons</span><strong>About 10 min</strong><p>Shopping, dining and entertainment.</p></article></div></section>

      <section className={styles.intro}><div><p className={styles.kicker}>Before choosing a rental</p><h2>Compare the exact condo—not only the resort name.</h2></div><div><p>Pelican Beach Resort condos are individually owned, so interiors, floor level, balcony perspective, sleeping arrangements and included beach gear can differ even when the building amenities are the same. Review the photos and description for the exact unit you will reserve rather than assuming every listing has the same finish or view.</p><p>For a useful price comparison, enter the same arrival date, departure date, adults and children for each available condo. The secure checkout then shows the complete current total, including rent, applicable discounts, fees and taxes, together with the reservation policies. A nightly headline without those details is not a reliable final comparison.</p><p>Both featured rentals are one-bedroom, two-bath Gulf-front condos with a king bedroom, hallway bunks and a queen sleeper sofa. Every person—including infants—counts toward the six-person maximum. If your group or dates change, run a fresh availability search so the displayed unit and total remain accurate.</p></div></section>

      <section className={styles.condos} id="condos"><div className={styles.sectionHead}><p className={styles.kicker}>Gulf-front vacation rentals</p><h2>Choose the exact view and style you prefer.</h2><p>Each one-bedroom, two-bath condo sleeps up to six, with a full kitchen, high-speed Wi-Fi, smart TVs, a private balcony and beach gear.</p></div><div className={styles.condoGrid}><article><img src="/images/site/0f604abce3284748ba8d2150b7646863-large.webp" alt="Unit 707 Gulf-view balcony at Pelican Beach Resort" /><div><span>Seventh floor</span><h3>Unit 707</h3><p>Classic coastal style with a Gulf-front balcony and sunset views.</p><SiteButton href="/pelican-beach-resort-unit-707" variant="secondary">Explore Unit 707</SiteButton></div></article><article><img src="/images/site/79fb2b20887c4f44b58c710a59420a30-large.webp" alt="Unit 1006 panoramic Gulf view at Pelican Beach Resort" /><div><span>Tenth floor</span><h3>Unit 1006</h3><p>Fresh coastal style with a higher panoramic view over the Gulf.</p><SiteButton href="/pelican-beach-resort-unit-1006" variant="secondary">Explore Unit 1006</SiteButton></div></article></div></section>

      <section className={styles.visualSplit}><img src="/images/site/44060a8a29ca4a998586d849184d288f-large.webp" alt="Emerald Coast shoreline beside Pelican Beach Resort in Destin Florida" /><div><p className={styles.kicker}>A practical Emerald Coast base</p><h2>Stay on the Gulf and build the rest of Destin around it.</h2><p>Guests often choose this part of Destin because the beach can remain the default plan while the harbor, restaurants, shopping and family attractions stay within a short drive. That matters on a mixed-weather trip: a morning at the Gulf can become lunch, an indoor stop or a harbor evening without relocating to another part of the coast.</p><p>Summer brings the warmest water and the largest crowds. Spring and fall can offer milder weather, while winter appeals to longer-stay visitors who value the Gulf view and central location more than daily swimming. Conditions, beach flags, water temperature and event schedules change, so use the linked live guides instead of treating a seasonal description as a forecast.</p><p>For planning beyond the resort, review the <a href="/blog/destinweather">Destin weather and Gulf guide</a>, browse the <a href="/blog/best-restaurants-destin">local restaurant guide</a>, or create a <a href="/destin-vacation-itinerary-planner">personalized day-by-day itinerary</a>.</p></div></section>

      <section className={styles.intro}><div><p className={styles.kicker}>Who the resort fits best</p><h2>A strong choice when the beach should stay central.</h2></div><div><p>Families often value the direct beach access, multiple pool options, bunk sleeping space and central location. Couples may prioritize the private balcony, Gulf view and proximity to dining. Longer-stay winter guests tend to care more about the full kitchen, indoor/outdoor pool, fitness facilities and practical access to groceries and services.</p><p>The resort may be a weaker fit for a group that needs more than six people under one roof, requires a pet-friendly rental, or expects a detached private home. The featured condos are non-smoking, do not allow pets and each have a maximum occupancy of six. A larger group may need separate units and should confirm that arrangement before booking.</p><p>Accessibility needs are personal and specific. Elevators serve the beachfront building, but a guest who needs exact doorway widths, shower configuration, mobility equipment clearance or another accommodation should ask about the exact condo and resort route rather than relying on a general “accessible” label.</p></div></section>

      <section className={styles.intro}><div><p className={styles.kicker}>Planning by season</p><h2>The same beachfront address feels different through the year.</h2></div><div><p>Spring can combine comfortable beach weather with cooler Gulf temperatures, and school-break weeks can still be busy. Summer is the most predictable period for warm water and full seasonal activity schedules, but it also brings heat, afternoon storms, traffic and the strongest demand. Build extra travel time into arrival day and avoid assuming a brief rain chance means an entire day will be lost.</p><p>Fall often retains warm water after air temperatures begin to ease. Event schedules, tropical-weather monitoring and operator hours matter more than a generic monthly average. Winter is quieter and well suited to balcony views, longer stays and flexible sightseeing, but some seasonal services reduce hours and Gulf swimming conditions vary.</p><p>Beach flags, surf risk, lightning, marine forecasts and tour operations answer different safety questions. Check the source that applies to the activity you are actually considering. A calm-looking balcony view is not a substitute for local beach flags, and a beach flag does not confirm that a boat tour is operating.</p></div></section>

      <section className={styles.intro}><div><p className={styles.kicker}>Direct-booking sequence</p><h2>Dates first, exact unit second, complete terms before payment.</h2></div><div><p>Begin with live availability using the full party size. Open an available condo, inspect its complete photo gallery and amenities, then review the unit-specific checkout. The final decision should be based on the exact home and its complete current total—not on a generic resort description.</p><p>A direct reservation can avoid marketplace service fees that vary by platform, but the controlling amount is the total displayed in secure checkout. No discount code is required for the published direct-booking adjustment. Questions can be asked before checkout; a question or inquiry does not itself hold dates.</p></div></section>

      <section className={styles.reviews}><div className={styles.sectionHead}><p className={styles.kicker}>Guest experiences</p><h2>4.94 average rating across 400+ stays.</h2></div><div className={styles.reviewGrid}>{reviews.map(r=><blockquote key={r.name}><div aria-label="Five out of five stars">★★★★★</div><p>“{r.body}”</p><footer><strong>{r.name}</strong><span>{r.date}</span></footer></blockquote>)}</div></section>

      <section className={styles.faq} id="faq"><div className={styles.sectionHead}><p className={styles.kicker}>Frequently asked questions</p><h2>Plan with the important details in hand.</h2></div>{faqs.map(f=><details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</section>

      <section className={styles.related}><div><p className={styles.kicker}>Continue planning</p><h2>From the resort to the rest of Destin.</h2></div><div className={styles.relatedGrid}><a href="/why-book-direct"><span>Book direct</span><strong>Exact-unit assurance and secure checkout</strong></a><a href="/beach-cam"><span>Beach cam</span><strong>See current Gulf views</strong></a><a href="/blog/best-restaurants-destin"><span>Dining</span><strong>Restaurants near the resort</strong></a><a href="/blog/destinweather"><span>Weather</span><strong>What each season brings</strong></a><a href="/map"><span>Destin map</span><strong>Explore the surrounding area</strong></a><a href="/destin-vacation-itinerary-planner"><span>Trip planner</span><strong>Create a day-by-day itinerary</strong></a></div></section>

      <section className={styles.finalCta}><div><p>Ready to find your beachfront stay?</p><h2>Start with your dates.</h2></div><div className={styles.actions}><SiteButton href="#availability" variant="primary" size="large">Check availability</SiteButton><SiteButton href="/why-book-direct" variant="light" size="large">Why book direct</SiteButton></div></section>
    </main>

    <SiteFooter />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}

