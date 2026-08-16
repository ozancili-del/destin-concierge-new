import Head from "next/head";
import Script from "next/script";
import AvailabilitySearch from "./AvailabilitySearch";
import SiteButton from "./SiteButton";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
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

    <SiteHeader availabilityHref="#availability" />

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

    <SiteFooter />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
