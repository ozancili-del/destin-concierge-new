import Head from "next/head";
import Script from "next/script";
import AvailabilitySearch from "./AvailabilitySearch";
import SiteButton from "./SiteButton";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { prepareMigratedArticleHtml } from "../lib/internal-links";
import blogLinkStrategy from "../data/blog-link-strategy.json";
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
  const slug = canonical ? canonical.replace(/\/$/, "").split("/").pop() : "";
  const nextStep = blogLinkStrategy[slug] || {
    eyebrow: "Continue planning",
    title: "Turn the guide into a practical Destin stay.",
    copy: "Use the trip planner for the details, then check live availability when your dates and group are ready.",
    primary: { label: "Build a Destin itinerary", href: "/trip-planner" },
    booking: { label: "Check live availability", href: "/availability" },
  };
  return <div className={styles.page}>
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      {canonical ? <link rel="canonical" href={canonical} /> : null}
      {stylesheet ? <link rel="stylesheet" href={stylesheet} /> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>

    <div className={styles.preview}>Preview article | The current live website remains unchanged</div>
    <div className={styles.utility}>
      <a href="/reviews">Guest Reviews</a>
      <a href="/guest-guide#faq">FAQ</a>
      <a href="/guest-guide#policies">Policies</a>
      <a href="/about">Contact</a>
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
      <AvailabilitySearch />
      {articleContent ? <article className={styles.article}>{articleContent}</article> : <article className={styles.article} dangerouslySetInnerHTML={{ __html: prepareMigratedArticleHtml(articleHtml) }} />}

      <section className={styles.related}>
        <div><p className={styles.kicker}>Continue planning</p><h2>More useful Destin guides.</h2></div>
        <div className={styles.relatedGrid}>{related.map((item) => <a href={item.href} key={item.href}><span>{item.label}</span><strong>{item.title}</strong></a>)}</div>
      </section>
      <section className={styles.finalCta}>
        <div><p className={styles.kickerLight}>{nextStep.eyebrow}</p><h2>{nextStep.title}</h2><p>{nextStep.copy}</p></div>
        <div className={styles.finalActions}><SiteButton href={nextStep.primary.href} variant="primary" size="large">{nextStep.primary.label}</SiteButton><SiteButton href={nextStep.booking.href} variant="light" size="large">{nextStep.booking.label}</SiteButton></div>
      </section>
    </main>

    <SiteFooter />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
