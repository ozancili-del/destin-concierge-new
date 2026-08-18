import Head from "next/head";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import styles from "../styles/Reviews.module.css";

const liveSite = "https://www.destincondogetaways.com";

const featuredReviews = [
  { name: "Taylor M.", unit: "Unit 707", stay: "July 2026", text: "Great stay! Would absolutely stay at this location again!" },
  { name: "Victoria C.", unit: "Unit 707", stay: "June 2026", text: "We had an AMAZING time. I can't wait to return!" },
  { name: "Kristina T.", unit: "Unit 707", stay: "June 2026", text: "Ozan was highly responsive and professional. The condo was very clean, the bed was comfortable, and the beautiful view was exactly as shown in the pictures." },
  { name: "Jacob A.", unit: "Unit 1006", stay: "April 2026", text: "Beautiful condo! It felt even bigger than it looked in the pictures. Ozan was the most responsive host I have ever dealt with. 10/10 recommend—we will definitely be back!" },
  { name: "Carly J.", unit: "Unit 1006", stay: "November 2025", text: "Ozan's rental was absolutely perfect. Modern appliances, close to popular restaurants and excursions, and the ocean view was breathtaking." },
  { name: "Ronna C.", unit: "Unit 1006", stay: "January 2026", text: "Ozan was very helpful and responsive. We had a great weekend and would recommend staying here." }
];

const platformCards = [
  { name: "Airbnb", label: "View our Airbnb host profile", href: "https://www.airbnb.com/users/profile/about?context=host", image: "/images/site/b004f9895bc24136805cc94e514f4039-large.webp", alt: "Gulf-front view from Destin Condo Getaways at Pelican Beach Resort" },
  { name: "Vrbo", label: "Read reviews for Unit 707", href: "https://www.vrbo.com/2078502", image: "/images/site/0f604abce3284748ba8d2150b7646863-large.webp", alt: "Unit 707 Gulf-view balcony at Pelican Beach Resort" },
  { name: "Vrbo", label: "Read reviews for Unit 1006", href: "https://www.vrbo.com/3799283", image: "/images/site/79fb2b20887c4f44b58c710a59420a30-large.webp", alt: "Unit 1006 panoramic Gulf view at Pelican Beach Resort" }
];

export default function ReviewsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": liveSite + "/reviews#webpage", name: "Guest Reviews for Destin Condo Getaways", description: "Real guest reviews for owner-managed beachfront condos at Pelican Beach Resort in Destin, Florida." },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
        { "@type": "ListItem", position: 2, name: "Guest Reviews", item: liveSite + "/reviews" }
      ]},
      {
        "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways",
        url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com",
        address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" },
        geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 },
        aggregateRating: { "@type": "AggregateRating", ratingValue: 4.93, reviewCount: 173, bestRating: 5, worstRating: 1 },
        review: featuredReviews.map((review) => ({
          "@type": "Review", author: { "@type": "Person", name: review.name },
          reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
          reviewBody: review.text
        }))
      }
    ]
  };

  return <div className={styles.page}>
    <Head>
      <title>Guest Reviews | Destin Beachfront Condo Rentals</title>
      <meta name="description" content="Read real guest reviews for Destin Condo Getaways at Pelican Beach Resort and visit our Airbnb and Vrbo pages." />
      <meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={`${liveSite}/reviews`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>

    <div className={styles.preview}>Preview page | Production remains unchanged</div>
    <div className={styles.utility}><a href="/reviews">Guest Reviews</a><a href="/resort#faq">FAQ</a><a href="/guest-guide">Policies</a><a href="/about">Contact</a></div>
    <SiteHeader availabilityHref="#availability" />

    <main>
      <section className={styles.hero}>
        <img src="/images/site/44060a8a29ca4a998586d849184d288f-large.webp" alt="Pelican Beach Resort and emerald Gulf water in Destin, Florida" />
        <div className={styles.heroShade}></div>
        <div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kicker}>Real guest experiences</p><h1>Guest reviews from Pelican Beach Resort</h1><p>Read what guests say about the condos, the beachfront location and their experience booking directly with Ozan.</p></div>
      </section>

      <AvailabilitySearch />

      <section className={styles.score}>
        <div><strong>4.93</strong><span aria-label="Five stars">★★★★★</span><p>Based on 173 direct-stay reviews</p></div>
        <div><p className={styles.kicker}>Verified stays</p><h2>Feedback from guests who stayed with us.</h2><p>The live review feed below can be sorted by condo, rating or most recent stay.</p></div>
      </section>

      <section className={styles.featured}>
        <div className={styles.sectionHead}><p className={styles.kicker}>Recent guest feedback</p><h2>A few highlights from recent stays.</h2></div>
        <div className={styles.reviewGrid}>{featuredReviews.map((review) => <blockquote key={review.name + review.stay}><div aria-label="Five out of five stars">★★★★★</div><p>“{review.text}”</p><footer><strong>{review.name}</strong><span>{review.unit} · {review.stay}</span></footer></blockquote>)}</div>
      </section>

      <section className={styles.platforms}>
        <div className={styles.sectionHead}><p className={styles.kicker}>Reviews across booking platforms</p><h2>Prefer Airbnb or Vrbo? Visit the original listings.</h2><p>These links take you to the external platform pages. Availability and pricing shown there may differ from direct booking.</p></div>
        <div className={styles.platformGrid}>{platformCards.map((card) => <a key={card.label} href={card.href} target="_blank" rel="noopener noreferrer"><img src={card.image} alt={card.alt} /><div><span>{card.name}</span><strong>{card.label}</strong><small>Opens on {card.name}</small></div></a>)}</div>
      </section>

      <section className={styles.liveReviews}>
        <div className={styles.sectionHead}><p className={styles.kicker}>Live guest review feed</p><h2>Browse all current guest reviews.</h2><p>New approved direct-stay reviews appear here automatically.</p></div>
        <div className={styles.widgetShell}><div className="ownerrez-widget" data-widget-type="Reviews" data-widgetid="ca0b8a26d6ba48fea90da4a9051de6ea"></div></div>
      </section>

      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Ready to choose your dates?</p><h2>See current availability.</h2></div><div className={styles.actions}><SiteButton href="#availability" variant="primary" size="large">Check availability</SiteButton><SiteButton href="/why-book-direct" variant="light" size="large">Why book direct</SiteButton></div></section>
    </main>

    <SiteFooter />

    <Script src="https://app.ownerrez.com/widget.js" strategy="afterInteractive" />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
