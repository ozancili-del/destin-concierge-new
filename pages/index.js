import Head from "next/head";
import Script from "next/script";
import styles from "../styles/HomePreview.module.css";

const site = "https://www.destincondogetaways.com";

const condos = [
  {
    unit: "707",
    eyebrow: "Classic Coastal",
    image: "/hub-beachcam.png",
    description: "A relaxed seventh-floor retreat with direct Gulf views, a private balcony, and the beach just downstairs.",
    href: `${site}/pelican-beach-resort-unit-707-orp5b47b5ax`,
  },
  {
    unit: "1006",
    eyebrow: "Fresh Coastal",
    image: "/book-direct-banner-bg.jpg",
    description: "A bright tenth-floor escape with panoramic emerald-water views and sunset skies from your private balcony.",
    href: `${site}/pelican-beach-resort-unit-1006-orp5b6450ex`,
  },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>Destin Condo Getaways | Beachfront Condos at Pelican Beach Resort</title>
        <meta name="description" content="Book two owner-managed beachfront condos at Pelican Beach Resort in Destin, Florida. Direct Gulf views, no road to cross, and local trip planning with Destiny Blue." />
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.previewBar}>Private homepage concept | booking still handled by the current secure website</div>

      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="Destin Condo Getaways home">
          <span className={styles.mark}>DCG</span>
          <span><strong>Destin Condo Getaways</strong><small>Pelican Beach Resort | Destin, Florida</small></span>
        </a>
        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#condos">Condos</a><a href="#resort">The Resort</a><a href={`${site}/blog`}>Local Guide</a><a href="https://deals.destincondogetaways.com/beach-deals">Deals</a>
        </nav>
        <a className={styles.bookButton} href={`${site}/book`}>Book direct</a>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <p className={styles.kicker}>4.94 star rating | 400+ stays | 1,000+ guests</p>
            <h1>Your beachfront Destin stay starts here.</h1>
            <p className={styles.heroCopy}>Two owner-managed Gulf-front condos at Pelican Beach Resort. No road to cross - just elevator, sand, and emerald water.</p>
          </div>
          <form className={styles.search} method="post" action={`${site}/properties`}>
            <input type="hidden" name="Page" value="1" />
            <input type="hidden" name="Sort" value="DailyRandom" />
            <label><span>Check in</span><input aria-label="Arrival date" name="ArrivalDate" type="date" required /></label>
            <label><span>Check out</span><input aria-label="Departure date" name="DepartureDate" type="date" required /></label>
            <label><span>Guests</span><select aria-label="Guests" name="Guests" defaultValue="2"><option value="1">1 guest</option><option value="2">2 guests</option><option value="3">3 guests</option><option value="4">4 guests</option><option value="5">5 guests</option><option value="6">6 guests</option></select></label>
            <button type="submit">Check availability</button>
          </form>
        </section>

        <section className={styles.trustStrip} aria-label="Stay highlights">
          <div><strong>Right on the sand</strong><span>No street to cross</span></div>
          <div><strong>Book owner-direct</strong><span>Clear, secure checkout</span></div>
          <div><strong>Resort amenities</strong><span>Pools, hot tubs & fitness</span></div>
          <div><strong>Help when you need it</strong><span>Destiny Blue, 24/7</span></div>
        </section>

        <section className={styles.section} id="condos">
          <div className={styles.sectionIntro}><p className={styles.kickerDark}>Choose your Gulf view</p><h2>Two condos. One unforgettable shoreline.</h2><p>Both are one-bedroom, two-bath beachfront homes with full kitchens, private balconies, and room for up to six guests.</p></div>
          <div className={styles.cards}>
            {condos.map((condo) => <article className={styles.card} key={condo.unit}>
              <div className={styles.cardImage} style={{ backgroundImage: `url(${condo.image})` }}><span>Unit {condo.unit}</span></div>
              <div className={styles.cardBody}><p>{condo.eyebrow}</p><h3>Pelican Beach Resort Unit {condo.unit}</h3><ul><li>1 bedroom</li><li>2 bathrooms</li><li>Sleeps up to 6</li></ul><p className={styles.cardCopy}>{condo.description}</p><a href={condo.href}>Explore Unit {condo.unit} <span>-&gt;</span></a></div>
            </article>)}
          </div>
        </section>

        <section className={styles.resort} id="resort">
          <div className={styles.resortImage} />
          <div className={styles.resortCopy}><p className={styles.kickerDark}>Pelican Beach Resort</p><h2>Everything you came to Destin for, right downstairs.</h2><p>Start with coffee on your Gulf-view balcony, take the elevator to the white sand, then cool off in one of three pools. HarborWalk, seafood favorites, and family attractions are minutes away.</p><div className={styles.amenities}><span>3 pools</span><span>2 hot tubs</span><span>Beachside tiki bar</span><span>Tennis & pickleball</span><span>Fitness center</span><span>Free parking</span></div><a className={styles.textLink} href={`${site}/pelican-beach-resort-destin-574048693`}>See the resort -&gt;</a></div>
        </section>

        <section className={styles.explore}>
          <p className={styles.kickerDark}>More than a place to sleep</p><h2>Plan the whole getaway.</h2>
          <div className={styles.exploreGrid}>
            <a href="https://deals.destincondogetaways.com/beach-deals"><span>Live price drops</span><strong>Find a beach deal</strong></a>
            <a href={`${site}/destin-vacation-itinerary-planner-574049367`}><span>Built around your family</span><strong>Create an itinerary</strong></a>
            <a href="https://explore.destincondogetaways.com/destin-hub"><span>Local knowledge</span><strong>Explore Destin</strong></a>
          </div>
        </section>

        <section className={styles.cta}><div><p className={styles.kicker}>Ready when you are</p><h2>Let's find your dates.</h2><p>Check both condos together and continue through the existing secure OwnerRez booking process.</p></div><a href="#top">Check availability</a></section>
      </main>

      <footer className={styles.footer}><div><strong>Destin Condo Getaways</strong><p>Two beachfront condos. Thoughtful owner-direct hospitality.</p></div><div><a href={`${site}/reviews`}>Reviews</a><a href={`${site}/blog`}>Blog</a><a href={`${site}/privacy-574035022`}>Privacy</a></div><div><a href="tel:+19723574262">(972) 357-4262</a><a href="mailto:ozan@destincondogetaways.com">ozan@destincondogetaways.com</a></div></footer>

      <Script src="/destiny-head.js" strategy="afterInteractive" />
    </>
  );
}
