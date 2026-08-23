import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import styles from "../styles/BookPage.module.css";

const liveSite = "https://www.destincondogetaways.com";
const bookingWidgetId = "e2e94c6c1a244f0d8e49deac3f59ff69";

const reviews = [
  { name: "Carly J.", text: "The home was clean and comfortable, the ocean view was breathtaking, and the location was close to restaurants and excursions." },
  { name: "Kristina T.", text: "Ozan was highly responsive and professional. The condo was very clean and the beautiful view was exactly as shown." },
  { name: "Jacob A.", text: "Beautiful condo and the most responsive host I have ever dealt with. We will definitely be back." },
];

export function getServerSideProps({ query }) {
  const unit = query.unit === "707" || query.unit === "1006" ? query.unit : null;
  const destination = unit ? `/condos/unit-${unit}` : "/availability";
  const forwarded = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (key === "unit") continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === "string") forwarded.append(key, item);
    }
  }

  const suffix = forwarded.toString();
  return { redirect: { destination: `${destination}${suffix ? `?${suffix}` : ""}`, permanent: false } };
}

export default function BookPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${liveSite}/book#webpage`, url: `${liveSite}/book`, name: "Book a Pelican Beach Resort Condo Direct", description: "Select a Pelican Beach Resort condo, review live pricing and complete a secure direct reservation.", isPartOf: { "@id": `${liveSite}/#website` }, about: { "@id": `${liveSite}/#business` } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Book Direct", item: `${liveSite}/book` }] },
    ],
  };

  return <div className={styles.page}>
    <Head>
      <title>Book a Pelican Beach Resort Condo Direct | Destin</title>
      <meta name="description" content="Choose your Pelican Beach Resort condo, review live dates and the complete price, and reserve securely with the direct-booking discount automatically applied." />
      <meta name="robots" content="noindex,follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={`${liveSite}/book`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>

    {process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== "production" ? <div className={styles.preview}>Preview page | Production reservations remain unchanged</div> : null}
    <div className={styles.utility}><a href="/destin-condo-rental-reviews">Guest Reviews</a><a href="/guest-guide#faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href="/about">Contact</a></div>
    <SiteHeader availabilityHref="#checkout" />

    <main>
      <section className={styles.hero}>
        <div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kicker}>The final step to the Gulf</p><h1>Choose your condo. See the full total. Book securely.</h1><p>Select dates, guests and the exact condo below. The live booking system provides availability, pricing, fees, taxes, policies and secure checkout.</p><div className={styles.trust}><span>✓ 10% direct discount applied</span><span>✓ Exact condo shown</span><span>✓ Secure checkout</span></div></div>
        <div className={styles.heroImage}><Image src="/book-direct-banner-bg.webp" alt="Pelican Beach Resort and the Gulf of Mexico in Destin Florida" fill priority sizes="(max-width: 900px) 100vw, 48vw" /></div>
      </section>

      <section className={styles.checkout} id="checkout">
        <div className={styles.checkoutIntro}><p className={styles.kicker}>Book direct</p><h2>Build and review your reservation.</h2><p>No discount code is needed. Confirm the condo, dates, every guest—including infants—and the complete total before submitting the reservation.</p><p className={styles.backLink}>Still comparing dates? <a href="/availability">Open live availability first →</a></p></div>
        <div className={styles.widgetShell}><div className="ownerrez-widget" data-widget-type="Booking/Inquiry" data-widgetid={bookingWidgetId}></div><noscript><a href="/book">Open the secure booking form</a></noscript></div>
      </section>

      <section className={styles.choose}>
        <div className={styles.sectionHead}><p className={styles.kicker}>Know what you are reserving</p><h2>Compare the exact condos before paying.</h2><p>Both are one-bedroom, two-bath Gulf-front condos that sleep up to six people. Their floor, interior style and view perspective differ.</p></div>
        <div className={styles.cards}>
          <a href="/pelican-beach-resort-unit-707"><span>Seventh floor · Classic Coastal</span><strong>Explore Unit 707</strong><small>Photos, amenities, reviews and live calendar →</small></a>
          <a href="/pelican-beach-resort-unit-1006"><span>Tenth floor · Fresh Coastal</span><strong>Explore Unit 1006</strong><small>Photos, amenities, reviews and live calendar →</small></a>
        </div>
      </section>

      <section className={styles.reviews}>
        <div className={styles.sectionHead}><p className={styles.kicker}>Guest confidence</p><h2>Real stays. Direct owner support.</h2></div>
        <div className={styles.reviewGrid}>{reviews.map((review) => <blockquote key={review.name}><div aria-label="Five out of five stars">★★★★★</div><p>“{review.text}”</p><footer>{review.name}</footer></blockquote>)}</div>
        <SiteButton href="/destin-condo-rental-reviews" variant="secondary">Read guest reviews</SiteButton>
      </section>

      <section className={styles.details}>
        <div><p className={styles.kicker}>Before you confirm</p><h2>Clear terms, without surprises.</h2></div>
        <ul><li>Maximum occupancy is six people per condo, including infants.</li><li>Check-in is 4:00 PM Central; checkout is 10:00 AM Central.</li><li>No smoking and no pets. The minimum primary-renter age is 25 unless married.</li><li>A non-refundable 20% deposit plus processing fees is collected when booking; the remaining balance is due 30 days before arrival.</li><li>The secure checkout displays the controlling total and reservation terms before confirmation.</li></ul>
        <a href="/guest-guide#policies">Read the complete guest policies →</a>
      </section>

      <section className={styles.finalCta}><div><p>Questions before booking?</p><h2>Use Live Chat or contact Ozan.</h2><small>Ask about the condos, dates or booking terms before completing checkout.</small></div><SiteButton href="/destin-ai-concierge" variant="primary" size="large">Open Live Chat</SiteButton></section>
    </main>

    <SiteFooter />
    <Script src="https://app.ownerrez.com/widget.js" strategy="afterInteractive" />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
