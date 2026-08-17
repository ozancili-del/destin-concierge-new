import Head from "next/head";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import styles from "../styles/GuestGuide.module.css";

const liveSite = "https://www.destincondogetaways.com";

const categories = [
  {
    id: "resort-location",
    label: "The resort & location",
    questions: [
      { q: "Are the condos truly beachfront with no road to cross?", a: "Yes. Pelican Beach Resort sits directly on the Gulf of Mexico. Guests take the elevator to beach level, pass the resort pools and walk onto the private beach without crossing a road or parking lot." },
      { q: "Where is Pelican Beach Resort in Destin?", a: "Pelican Beach Resort is at 1002 US-98, Destin, Florida 32541. HarborWalk Village is roughly five minutes away, Big Kahuna's Water Park is across US-98, and shopping, groceries and restaurants are nearby. Drive times vary with seasonal traffic." },
      { q: "Can guests see dolphins from the balcony?", a: "Guests do sometimes spot wild dolphins from the Gulf-facing balconies, especially in the morning, but sightings cannot be guaranteed." },
      { q: "How many pools are at Pelican Beach Resort?", a: "The resort has two outdoor pools and an indoor/outdoor pool, plus a kiddie pool and two hot tubs. Heating, hours and operating details can vary seasonally, so follow current resort information during your stay." },
      { q: "Does Pelican Beach Resort have EV charging?", a: "Yes. Two paid J1772 chargers are available in the covered roof-level parking area. Availability cannot be reserved in advance." }
    ]
  },
  {
    id: "condos",
    label: "Inside the condos",
    questions: [
      { q: "What is the difference between Unit 707 and Unit 1006?", a: "Both are one-bedroom, two-bath Gulf-front condos for up to six guests. Unit 707 is on the seventh floor and feels closer to the pools and beach. Unit 1006 is on the tenth floor and offers a higher panoramic Gulf view. Decor and individual features differ, so review each listing before choosing." },
      { q: "What sleeping arrangements are provided?", a: "Each condo has a king bed in the bedroom, hallway bunks and a sofa sleeper. Every person, including infants, counts toward the six-person maximum occupancy." },
      { q: "What is included in the condo?", a: "Both condos include a full kitchen, Wi-Fi, smart TVs with cable, heating and air conditioning, linens, towels and a furnished Gulf-facing balcony. Each unit also provides two beach chairs, an umbrella and a cooler. Shared laundry facilities are available on every floor and accept coin or card." },
      { q: "Are the condos pet friendly?", a: "No. Units 707 and 1006 are pet-free, and smoking is not permitted. Contact Ozan before booking if you need to discuss a legally required accommodation." },
      { q: "What happens if something needs maintenance during a stay?", a: "Report the issue promptly using the contact details in your arrival information. Destin Condo Getaways can coordinate with on-site maintenance and resort staff when needed. Emergencies should be reported immediately." }
    ]
  },
  {
    id: "planning",
    label: "Planning your stay",
    questions: [
      { q: "What should guests bring?", a: "The kitchens are equipped for everyday cooking, but bring any specialty ingredients, spices or preferred supplies you expect to use. Personal toiletries, sunscreen and beach items beyond the provided chairs, umbrella and cooler remain the guest's responsibility." },
      { q: "Where are the closest groceries and essentials?", a: "Target and other grocery or pharmacy options are close to Pelican Beach Resort. Exact store hours and traffic conditions can change, so check current directions before leaving." },
      { q: "Where can guests find nearby restaurants?", a: "Destin has seafood, casual dining and family options around the Harbor, along US-98 and near the resort. Use the restaurant guides linked on this page for current suggestions and verify hours or reservations directly with the restaurant." },
      { q: "Can guests see Destin fireworks from the balcony?", a: "Harbor-area fireworks are not reliably visible from the condo balconies because the launch area is outside the direct sightline. The Destin fireworks guide provides current schedules, maps and suggested viewing locations." },
      { q: "What is the best time of year to visit Destin?", a: "Summer offers the warmest Gulf water and busiest beach season. Spring and fall usually bring lighter crowds and mild weather, while winter is quieter and often more affordable. Weather and water conditions vary, so check closer to your trip." }
    ]
  },
  {
    id: "booking",
    label: "Booking & policies",
    questions: [
      { q: "Can booking direct save money?", a: "It can. Depending on the platform and stay, booking directly may save up to 20% by avoiding or reducing third-party platform fees. Compare the final totals because dates, fees and promotions can vary." },
      { q: "What are check-in and checkout times?", a: "Standard check-in is 4:00 PM and checkout is 10:00 AM. Early check-in or late checkout is available only when specifically confirmed; cleaning and same-day reservations may make it impossible." },
      { q: "What is the maximum occupancy?", a: "The maximum is six people per condo under the property's occupancy and fire-code rules. Adults, children and infants all count toward that total. Enter the correct final party size on the booking page." },
      { q: "What cancellation policy applies?", a: "The cancellation terms shown in the secure booking flow and signed rental agreement control the reservation. Review them before paying because the applicable terms can depend on the booking and timing." },
      { q: "Are parking and resort access included?", a: "Guest parking is available at the resort. Registration, wristband, parking-pass and access instructions are provided with the reservation and may be updated by the resort. Follow the current arrival instructions rather than relying on older screenshots or posts." }
    ]
  }
];

const allFaqs = categories.flatMap((category) => category.questions);

export default function GuestGuidePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": liveSite + "/guest-guide#webpage", name: "Pelican Beach Resort Guest Guide and FAQ", description: "Booking, resort, condo, arrival and stay-planning information for Destin Condo Getaways at Pelican Beach Resort." },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
        { "@type": "ListItem", position: 2, name: "Guest Guide", item: liveSite + "/guest-guide" }
      ]},
      { "@type": "FAQPage", mainEntity: allFaqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) },
      {
        "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways",
        alternateName: "Destin Getaways Condos at Pelican Beach Resort", url: liveSite,
        description: "Owner-direct beachfront vacation rentals at Pelican Beach Resort in Destin, Florida.",
        telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com",
        address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" },
        geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 },
        checkinTime: "16:00", checkoutTime: "10:00", petsAllowed: false, smokingAllowed: false,
        aggregateRating: { "@type": "AggregateRating", ratingValue: 4.94, reviewCount: 400, bestRating: 5, worstRating: 1 },
        sameAs: ["https://www.facebook.com/DestinCondoGetaways"]
      }
    ]
  };

  return <div className={styles.page}>
    <Head>
      <title>Pelican Beach Resort Guest Guide & FAQ | Destin</title>
      <meta name="description" content="Plan your Pelican Beach Resort stay with accurate answers about beachfront access, condo layouts, pools, check-in, occupancy, policies and direct booking." />
      <meta name="robots" content="noindex,nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>

    <div className={styles.preview}>Preview page | Production remains unchanged</div>
    <div className={styles.utility}><a href="/reviews">Guest Reviews</a><a href="#faq">FAQ</a><a href="#policies">Policies</a><a href="/about">Contact</a></div>
    <SiteHeader availabilityHref="#availability" />

    <main>
      <section className={styles.hero}>
        <img src="https://uc.orez.io/i/5cd8d28c33e14711a68e723ec300ca2a-Large" alt="White-sand beach and Gulf water at Pelican Beach Resort in Destin" />
        <div className={styles.heroShade}></div>
        <div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kickerLight}>Guest guide & FAQ</p><h1>Plan your Pelican Beach Resort stay with confidence.</h1><p>Clear answers about the resort, condo layouts, booking, arrival and the practical details guests ask most.</p></div>
      </section>

      <AvailabilitySearch className={styles.availability} />

      <section className={styles.quickFacts}>
        <article><span>Check-in</span><strong>4:00 PM</strong></article>
        <article><span>Checkout</span><strong>10:00 AM</strong></article>
        <article><span>Maximum</span><strong>6 guests</strong><small>Including infants</small></article>
        <article><span>Address</span><strong>1002 US-98</strong><small>Destin, FL 32541</small></article>
      </section>

      <section className={styles.intro}>
        <div><p className={styles.kicker}>Before you arrive</p><h2>Useful information without the fine-print maze.</h2></div>
        <div><p>This guide consolidates the most important guest questions and clarifies details that could be misunderstood. It supports planning, but your secure booking page, signed rental agreement and current arrival instructions control the reservation.</p><p>For live availability, use the form above. For an urgent issue during a stay, use the contact information supplied with your reservation.</p></div>
      </section>

      <section className={styles.guide} id="faq">
        <aside><p className={styles.kicker}>Jump to a section</p>{categories.map((category) => <a key={category.id} href={"#" + category.id}>{category.label}</a>)}</aside>
        <div className={styles.faqColumn}>{categories.map((category) => <section id={category.id} key={category.id} className={styles.category}><p className={styles.kicker}>{category.label}</p>{category.questions.map((faq) => <details key={faq.q}><summary>{faq.q}</summary><p>{faq.a}</p></details>)}</section>)}</div>
      </section>

      <section className={styles.policies} id="policies">
        <div className={styles.sectionHead}><p className={styles.kicker}>Important stay policies</p><h2>The short version before you book.</h2><p>The secure booking terms and rental agreement provide the complete controlling language.</p></div>
        <div className={styles.policyGrid}>
          <article><span>01</span><h3>Occupancy</h3><p>No more than six people per condo. Adults, children and infants all count.</p></article>
          <article><span>02</span><h3>Smoking & pets</h3><p>The condos are non-smoking and pet-free. Discuss legally required accommodations before booking.</p></article>
          <article><span>03</span><h3>Arrival & departure</h3><p>Check-in is 4:00 PM and checkout is 10:00 AM unless a different time is confirmed.</p></article>
          <article><span>04</span><h3>Resort rules</h3><p>Follow current wristband, parking, beach, pool and common-area instructions supplied for the stay.</p></article>
          <article><span>05</span><h3>Maintenance</h3><p>Report damage, disturbances or maintenance needs promptly so the right response can be coordinated.</p></article>
          <article><span>06</span><h3>Cancellation</h3><p>Review the cancellation terms shown during secure checkout and in the rental agreement before paying.</p></article>
        </div>
      </section>

      <section className={styles.related}>
        <div className={styles.sectionHead}><p className={styles.kicker}>Continue planning</p><h2>Useful pages for the rest of your trip.</h2></div>
        <div className={styles.relatedGrid}>
          <a href="/resort"><span>Resort guide</span><strong>Pools, beach, amenities and location</strong></a>
          <a href="/reviews"><span>Guest reviews</span><strong>Current direct-stay, Airbnb and Vrbo feedback</strong></a>
          <a href="/why-book-direct"><span>Book direct</span><strong>Understand pricing and owner-direct support</strong></a>
          <a href="/blog/best-restaurants-destin"><span>Restaurants</span><strong>Dining suggestions around Destin</strong></a>
          <a href="/blog/destin-fireworks-2026"><span>Fireworks</span><strong>Schedules, maps and viewing tips</strong></a>
          <a href="/trip-planner"><span>Trip planner</span><strong>Create a personalized day-by-day itinerary</strong></a>
        </div>
      </section>

      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Ready to look at dates?</p><h2>Check current availability.</h2></div><div className={styles.actions}><SiteButton href="#availability" variant="primary" size="large">Check availability</SiteButton><SiteButton href="/reviews" variant="light" size="large">Read guest reviews</SiteButton></div></section>
    </main>

    <SiteFooter />

    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
