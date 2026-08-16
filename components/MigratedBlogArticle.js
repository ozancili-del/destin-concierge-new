import Head from "next/head";
import Script from "next/script";
import AvailabilitySearch from "./AvailabilitySearch";
import SiteButton from "./SiteButton";
import styles from "../styles/Article.module.css";

const liveSite = "https://www.destincondogetaways.com";

export default function MigratedBlogArticle({
  pageTitle,
  description,
  structuredData,
  heroImage,
  heroAlt,
  kicker,
  title,
  intro,
  articleHtml,
  articleContent,
  canonical,
  related = [],
  stylesheet,
}) {
  return <div className={styles.page}>
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="noindex,nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      {canonical ? <link rel="canonical" href={canonical} /> : null}
      {stylesheet ? <link rel="stylesheet" href={stylesheet} /> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>

    <div className={styles.preview}>Preview article | Production and OwnerRez remain unchanged</div>
    <div className={styles.utility}>
      <a href="/reviews">Guest Reviews</a>
      <a href="/guest-guide#faq">FAQ</a>
      <a href="/guest-guide#policies">Policies</a>
      <a href={liveSite + "/aboutus-574000712"}>Contact</a>
    </div>

    <header className={styles.header}>
      <a className={styles.brand} href="/" aria-label="Destin Condo Getaways homepage">
        <span className={styles.mark}>DCG</span>
        <span><strong>Destin Condo Getaways</strong><small>Pelican Beach Resort | Destin, Florida</small></span>
      </a>
      <nav aria-label="Main navigation">
        <a href="/#condos">Condos</a><a href="/resort">The Resort</a><a href="/blog">Destin Guide</a>
        <a href="/beach-cam">Beach Cam</a>
        <a href="https://deals.destincondogetaways.com/beach-deals">Deals</a><a href="/guest-guide#faq">FAQ</a>
      </nav>
      <SiteButton href="#availability" variant="primary" size="compact">Check availability</SiteButton>
    </header>

    <main>
      <section className={styles.hero}>
        <img src={heroImage} alt={heroAlt} width="1600" height="900" />
        <div className={styles.heroShade}></div>
        <div className={styles.heroCopy}>
          <a href="/blog">Destin Guide</a><p className={styles.kickerLight}>{kicker}</p><h1>{title}</h1><p>{intro}</p>
        </div>
      </section>
      <AvailabilitySearch className={styles.availability} />
      {articleContent ? <article className={styles.article}>{articleContent}</article> : <article className={styles.article} dangerouslySetInnerHTML={{ __html: articleHtml }} />}

      <section className={styles.related}>
        <div><p className={styles.kicker}>Continue planning</p><h2>More useful Destin guides.</h2></div>
        <div className={styles.relatedGrid}>{related.map((item) => <a href={item.href} key={item.href}><span>{item.label}</span><strong>{item.title}</strong></a>)}</div>
      </section>
      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Planning your stay?</p><h2>Check live availability.</h2></div><SiteButton href="#availability" variant="primary" size="large">Check availability</SiteButton></section>
    </main>

    <footer className={styles.footer}>
      <div className={styles.footerBrand}><strong>Destin Condo Getaways</strong><p>Thoughtful owner-direct hospitality at Pelican Beach Resort.</p><a href="tel:+19723574262">(972) 357-4262</a><a href="mailto:ozan@destincondogetaways.com">ozan@destincondogetaways.com</a><address>1002 US-98<br />Destin, FL 32541</address></div>
      <div><strong>Stay</strong><a href={liveSite + "/pelican-beach-resort-unit-707-orp5b47b5ax"}>Unit 707</a><a href={liveSite + "/pelican-beach-resort-unit-1006-orp5b6450ex"}>Unit 1006</a><a href="#availability">Availability</a><a href="/reviews">Reviews</a><a href="/why-book-direct">Book direct</a></div>
      <div><strong>Plan</strong><a href="/blog/how-to-find-cheaper-flights-and-car-rentals">Flights</a><a href={liveSite + "/blog/destincar"}>Car rentals</a><a href="https://explore.destincondogetaways.com/destin-tripshock.html">Activities</a><a href={liveSite + "/destin-vacation-itinerary-planner-574049367"}>Itinerary planner</a></div>
      <div><strong>Destin Guides</strong><a href="/blog">All guides</a><a href={liveSite + "/blog/destinweather"}>Weather</a><a href={liveSite + "/blog/best-beaches-destin"}>Beaches</a><a href={liveSite + "/blog/best-restaurants-destin"}>Restaurants</a><a href={liveSite + "/blog/destin-events-2026"}>Events</a></div>
      <div><strong>Guest Information</strong><a href="/guest-guide#policies">Policies</a><a href="/guest-guide#faq">FAQ</a><a href={liveSite + "/aboutus-574000712"}>Contact</a><a href={liveSite + "/privacy-574035022"}>Privacy</a><a href="/beach-cam">Live beach cam</a></div>
    </footer>
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
