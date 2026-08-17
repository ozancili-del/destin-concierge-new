import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import styles from "../styles/WhyDirect.module.css";

const liveSite = "https://www.destincondogetaways.com";
const businessSchema = {
  "@type": "LodgingBusiness",
  "@id": `${liveSite}/#business`,
  name: "Destin Condo Getaways",
  alternateName: "Destin Getaways Condos @ Pelican Beach Resort",
  description: "Boutique owner-direct vacation-rental business at Pelican Beach Resort in Destin, Florida, with a 4.94-star rating across 400+ stays.",
  url: liveSite,
  image: [
    "/images/site/f20eceb9b43142b48e1f20ac457e7232.webp",
    "/images/site/242b1d12dd544f7a9debe10583aca308.webp",
    "/images/site/110ee87bd98842689ab14819674024f2.webp",
  ],
  logo: "/images/site/6d35eb37c5304c0f8b080ae8dbf5357a.webp",
  telephone: "+1-972-357-4262",
  email: "ozan@destincondogetaways.com",
  address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" },
  geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 },
  priceRange: "$$",
  amenityFeature: ["Beachfront Access","Ocean View Units","Private Balconies","Heated Pool","Indoor Pool","Hot Tub","Fitness Center","Free WiFi","Free Parking","Full Kitchens","Tennis Courts","EV Charging"].map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
  petsAllowed: false,
  smokingAllowed: false,
  checkinTime: "16:00",
  checkoutTime: "10:00",
  sameAs: ["https://www.facebook.com/DestinCondoGetaways"],
  starRating: { "@type": "Rating", ratingValue: 4.94, bestRating: 5 },
  paymentAccepted: "Credit Card, Debit Card",
  currenciesAccepted: "USD",
  openingHours: "Mo-Su 00:00-23:59",
  aggregateRating: { "@type": "AggregateRating", ratingValue: 4.94, reviewCount: 400, bestRating: 5, worstRating: 1 },
  review: [
    { "@type": "Review", datePublished: "2025-11-30", reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 }, author: { "@type": "Person", name: "Carly J." }, reviewBody: "Ozan's rental was absolutely perfect! Modern appliances, close in proximity to popular restaurants and excursions, and the ocean view was breathtaking! My husband and I had such a relaxing stay, we will definitely be back!" },
    { "@type": "Review", datePublished: "2025-09-07", reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 }, author: { "@type": "Person", name: "Steven O." }, reviewBody: "Ozan communication was invaluable. Location was great, access to beach was simple with pools is a huge plus. Having a bar with food near the beach and pool access made it very easy to enjoy. Ozan communication with restaurants, activities and helpful suggestions made our first trip to Destin a fun and memorable. Thanks for letting us stay at your beautiful property!" },
    { "@type": "Review", datePublished: "2025-04-22", reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 }, author: { "@type": "Person", name: "Ariana B." }, reviewBody: "My stay at Ozan's place was fantastic! The home was clean, comfortable, and exactly as described. Ozan was a great host—responsive and helpful throughout. The location was perfect for exploring the area. I'd definitely stay here again and highly recommend it to other guests!" },
  ],
};


const reasons = [
  { number: "01", title: "The exact condo you selected", copy: "The photographs, floor, balcony view, layout, and furnishings belong to the vacation rental you reserve. There is no rental-pool substitution." },
  { number: "02", title: "Direct access to the owner", copy: "Ask detailed questions before arrival and reach Ozan, the owner of Units 707 and 1006—not a marketplace call center managing hundreds of unrelated properties." },
  { number: "03", title: "Transparent secure checkout", copy: "Current pricing, required fees, taxes, policies, agreements and payment are presented through the secure booking flow." },
  { number: "04", title: "More vacation, fewer platform fees", copy: "Direct booking avoids the separate guest service fee commonly added by large vacation-rental marketplaces. The current direct-booking discount is reflected automatically during secure checkout." },
];

const faqs = [
  { question: "Is booking a Destin vacation rental directly secure?", answer: "Yes. Availability, pricing, agreements and payment continue through our secure booking system. Review the complete price and policies before submitting a reservation." },
  { question: "Will I stay in the condo shown?", answer: "Yes. You choose either Pelican Beach Resort Unit 707 or Unit 1006 and reserve that exact condo. We do not substitute another unit." },
  { question: "How many guests can each condo accommodate?", answer: "Each 873-square-foot, one-bedroom, two-bath condo sleeps up to six guests with a king bedroom, hallway bunks, and a queen sleeper sofa. Every adult, child, and infant counts toward the six-person maximum." },
  { question: "What is included with a direct stay?", answer: "Your stay includes direct beach access, resort pools and hot tubs, fitness facilities, tennis and pickleball, parking, a full kitchen, Wi-Fi, and the unit-specific amenities described on the secure booking page. Seasonal services may vary." },
  { question: "Can I compare both condos before booking?", answer: "Yes. Search your dates once to see which units are available, then review each condo's photographs, virtual tour, layout, policies, and complete price." },
  { question: "Do returning guests receive a discount?", answer: "Yes. Returning guests may receive 10% off a future direct stay by contacting Ozan. The returning-guest discount cannot be combined with another discount." },
  { question: "What are check-in, checkout, and the main house rules?", answer: "Check-in is 4:00 PM and checkout is 10:00 AM Central Time. The condos are non-smoking, do not allow pets, and have a maximum occupancy of six. The primary renter must be at least 25 unless married." },
];

export default function WhyBookDirect() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${liveSite}/why-book-direct#webpage`, name: "Why Book Direct at Pelican Beach Resort", description: "Why guests book owner-managed Pelican Beach Resort vacation rentals directly with Destin Condo Getaways.", isPartOf: { "@id": `${liveSite}/#website` }, about: { "@id": `${liveSite}/#business` } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Why Book Direct", item: `${liveSite}/why-book-direct` }] },
      { "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) },
      businessSchema,
    ],
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>Book a Pelican Beach Resort Vacation Rental Direct | Destin Condo Getaways</title>
        <meta name="description" content="Book owner-managed Pelican Beach Resort vacation rentals in Destin directly. Explore exact condos, avoid marketplace service fees and use secure checkout." />
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={`${liveSite}/why-book-direct`} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </Head>

      <div className={styles.preview}>Preview page | Production remains unchanged</div>
      <div className={styles.utility}><a href="/reviews">Guest Reviews</a><a href="#direct-faq">FAQ</a><a href="/guest-guide">Policies</a><a href="/about">Contact</a></div>
      <SiteHeader availabilityHref="#availability" />

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}><a className={styles.breadcrumb} href="/">Home</a><p className={styles.kicker}>Pelican Beach Resort vacation rentals by owner</p><h1>Book the exact condo—with the owner behind it.</h1><p className={styles.lead}>Direct booking should feel clearer, not riskier. Explore the known Gulf-front condos offered here, check current availability, understand the complete price and reserve through secure checkout.</p><div className={styles.actions}><SiteButton href="#availability" variant="primary" size="large">Check your dates</SiteButton><SiteButton href="/destin-vacation-rentals-by-owner" variant="secondary" size="large">Explore vacation rentals</SiteButton></div></div>
          <div className={styles.heroVisual}><Image src="/book-direct-banner-bg.webp" alt="Pelican Beach Resort and the Gulf of Mexico in Destin" fill priority sizes="(max-width: 900px) 100vw, 48vw" /><div className={styles.imageNote}><strong>Owner-managed</strong><span>Units 707 and 1006</span></div></div>
        </section>

        <AvailabilitySearch className={styles.availability} />

        <section className={styles.promise}><p className={styles.kicker}>What “book direct” means here</p><h2>Less uncertainty between browsing and arrival.</h2><p className={styles.introCopy}>When you book with Destin Condo Getaways, you deal directly with the owner of Pelican Beach Resort Units 707 and 1006. You can ask about the kitchen, sleeping arrangements, balcony, or anything else that matters to your family before committing.</p><div className={styles.reasonGrid}>{reasons.map((reason) => <article key={reason.number}><span>{reason.number}</span><h3>{reason.title}</h3><p>{reason.copy}</p></article>)}</div></section>

        <section className={styles.exact}><div className={styles.exactImage}><Image src="/hub-beachcam.webp" alt="Gulf view at Pelican Beach Resort" fill sizes="(max-width: 900px) 100vw, 48vw" /></div><div className={styles.exactCopy}><p className={styles.kicker}>What you see is where you stay</p><h2>No generic rental-pool promises.</h2><p>Pelican Beach Resort contains individually owned condos, so renovation, furnishings, floor level, and view can vary. Direct booking means choosing one known home—not merely reserving a unit category.</p><ul><li>Unit-specific photographs, descriptions, and virtual tours</li><li>Known seventh- or tenth-floor Gulf view</li><li>873 square feet with one bedroom and two bathrooms</li><li>King bedroom, hallway bunks, and queen sleeper sofa</li><li>Full kitchen, fast Wi-Fi, two smart TVs, and private Gulf-front balcony</li><li>Direct beachfront building with no road to cross</li></ul><a className={styles.textLink} href="/destin-vacation-rentals-by-owner">Compare the vacation rentals →</a></div></section>

        <section className={styles.contentSection}><div className={styles.sectionIntro}><p className={styles.kicker}>A family-friendly Destin stay</p><h2>The layout and location make beach days easier.</h2></div><div className={styles.split}><div><h3>Close to the Gulf—without giving up the view</h3><p>The seventh- and tenth-floor balconies are high enough for wide Gulf views while keeping the shoreline visually close. On calm mornings, guests may even spot dolphins offshore.</p><p>For families, direct beach access matters: take the elevator downstairs and walk to the sand without crossing traffic while carrying children, chairs, or beach gear.</p></div><div><h3>Practical space for up to six</h3><p>Each condo provides a full kitchen for easy breakfasts and lunches, two bathrooms, and flexible sleeping space. That can offer better value than paying for a much larger three-bedroom rental when the one-bedroom layout fits your group.</p><p><a className={styles.textLink} href="/virtual-tours">Walk through the virtual tours →</a></p></div></div></section>

        <section className={styles.included}><div className={styles.sectionIntro}><p className={styles.kicker}>Included around your stay</p><h2>Beachfront convenience plus resort amenities.</h2><p>These highlights are carried forward from the existing page. Seasonal operations and service details should always be confirmed for your dates.</p></div><div className={styles.checkGrid}>{["Private beach access—no road to cross","Three heated pools plus a kiddie pool","Two hot tubs","Fitness center, sauna, and steam room","Tennis and pickleball courts","Full kitchen in each condo","Complimentary chairs and umbrella stored in the unit","Seasonal beach chair service","Seasonal beachside tiki bar and café","Free parking and on-site EV chargers","Gas grills and outdoor seating","Laundry facilities on every floor","24/7 front desk and on-site security"].map((item) => <div key={item}>✓ <span>{item}</span></div>)}</div><p className={styles.centerLink}><a className={styles.textLink} href="/resort">Explore Pelican Beach Resort and its location →</a></p></section>

        <section className={styles.human}><div><p className={styles.kickerLight}>Owner-direct hospitality</p><h2>Technology for convenience. A person when it matters.</h2></div><div><p>Destiny Blue can help around the clock with availability and trip-planning questions. When a situation needs the owner, Ozan remains part of the stay. Empathy and useful information do not replace clear policies or invent promises.</p><a href="/about">Meet your host →</a></div></section>

        <section className={styles.comparison}><div className={styles.sectionIntro}><p className={styles.kicker}>A straightforward comparison</p><h2>Direct booking without the mystery.</h2><p>Large marketplaces are useful for discovery, but their separate guest service fees can add up to 20%, depending on the platform. Booking directly avoids that separate marketplace fee while preserving secure online checkout and showing the complete current price for your dates. High-demand periods such as spring break can fill early, so checking live availability sooner gives you a clearer view of the remaining options without inventing urgency.</p></div><div className={styles.table} role="table" aria-label="Direct booking comparison"><div className={styles.tableHead} role="row"><strong role="columnheader">What matters</strong><strong role="columnheader">Direct with us</strong><strong role="columnheader">Large marketplace</strong></div><div role="row"><span>Exact unit guaranteed</span><b>Yes</b><span>Depends on listing</span></div><div role="row"><span>Owner communication</span><b>Direct</b><span>Often platform-mediated</span></div><div role="row"><span>Guest platform service fee</span><b>No separate marketplace fee</b><span>Often added</span></div><div role="row"><span>Secure online checkout</span><b>Yes</b><span>Marketplace checkout</span></div><div role="row"><span>Direct-booking discount</span><b>Automatically reflected</b><span>Varies</span></div></div></section>

        <section className={styles.contentSection}><div className={styles.sectionIntro}><p className={styles.kicker}>Know before you reserve</p><h2>Clear basics, with the full terms shown at checkout.</h2></div><div className={styles.policyGrid}><article><h3>Arrival and occupancy</h3><p>Check-in is 4:00 PM and checkout is 10:00 AM Central Time. Maximum occupancy is six people per condo, including adults, children, and infants.</p></article><article><h3>Primary house rules</h3><p>No smoking and no pets. The minimum age to rent is 25 unless married. Beach tents and canopies are prohibited; personal umbrellas must remain behind rental-umbrella rows.</p></article><article><h3>Payments and cancellation</h3><p>A non-refundable 20% deposit plus processing fees is collected at booking, with the remaining balance due 30 days before arrival. Cancellations made more than 30 days before check-in forfeit the deposit; cancellations within 30 days receive no refund. A county-issued mandatory evacuation qualifies for a prorated refund of paid but unused nights after the order. A reservation previously rescheduled or modified as a courtesy is non-refundable if later cancelled. Review the controlling terms during secure checkout, and consider travel insurance.</p></article></div></section>

        <section className={styles.testimonials}><div className={styles.sectionIntro}><p className={styles.kicker}>Guest experiences</p><h2>Hosted personally. Remembered warmly.</h2><p>A 4.94 average rating across 400+ stays, with selected verified guest feedback carried forward from the existing page.</p></div><div className={styles.testimonialGrid}>{businessSchema.review.map((review) => <blockquote key={review.author.name}><div aria-label="Five out of five stars">★★★★★</div><p>“{review.reviewBody}”</p><footer><strong>{review.author.name}</strong><span>{review.datePublished}</span></footer></blockquote>)}</div><p className={styles.centerLink}><a className={styles.textLink} href="/reviews">Read more guest reviews →</a></p></section>

        <section className={styles.faq} id="direct-faq"><div className={styles.sectionIntro}><p className={styles.kicker}>Questions before booking</p><h2>The important answers.</h2></div><div className={styles.faqList}>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>

        <section className={styles.related}><div className={styles.sectionIntro}><p className={styles.kicker}>Continue planning</p><h2>Useful details for the whole Destin stay.</h2></div><div className={styles.relatedGrid}><a href="/resort"><span>Resort guide</span><strong>Pools, beach access and location</strong></a><a href="/reviews"><span>Guest reviews</span><strong>Read recent stay experiences</strong></a><a href="/beach-cam"><span>Live beach cam</span><strong>See the Gulf before you arrive</strong></a><a href="/blog/best-restaurants-destin"><span>Dining guide</span><strong>Plan seafood and family meals</strong></a><a href="/blog/destinweather"><span>Weather guide</span><strong>Know what each season brings</strong></a><a href="/trip-planner"><span>Trip planner</span><strong>Create a personalized itinerary</strong></a></div></section>

        <section className={styles.finalCta}><div><p className={styles.kickerLight}>Ready when you are</p><h2>Start with the dates. Decide without pressure.</h2><p>Search both condos and continue only after reviewing the complete price, policies, and booking details.</p></div><div className={styles.actions}><SiteButton href="#availability" variant="primary" size="large">Check availability</SiteButton><SiteButton href="/" variant="light" size="large">Return home</SiteButton></div></section>
      </main>

      <SiteFooter />
      <Script src="/destiny-loader.js" strategy="lazyOnload" />
    </div>
  );
}

