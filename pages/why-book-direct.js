import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import styles from "../styles/WhyDirect.module.css";

const liveSite = "https://www.destincondogetaways.com";

const reasons = [
  {
    number: "01",
    title: "The exact condo you selected",
    copy: "The photographs, floor, balcony view, layout, and furnishings belong to the unit you reserve. There is no rental-pool substitution.",
  },
  {
    number: "02",
    title: "Direct access to the owner",
    copy: "Ask detailed questions before arrival and reach the person who actually knows Units 707 and 1006—not a marketplace call center.",
  },
  {
    number: "03",
    title: "Transparent secure checkout",
    copy: "Current pricing, required fees, taxes, policies, and payment are presented through the existing secure OwnerRez booking flow.",
  },
  {
    number: "04",
    title: "More vacation, fewer platform fees",
    copy: "Direct booking avoids the separate guest service fee commonly added by large vacation-rental marketplaces.",
  },
];

const faqs = [
  {
    question: "Is direct booking secure?",
    answer: "Yes. Availability, pricing, agreements, and payment continue through our secure OwnerRez booking system.",
  },
  {
    question: "Will I stay in the condo shown?",
    answer: "Yes. You choose either Unit 707 or Unit 1006 and reserve that exact condo. We do not substitute another unit.",
  },
  {
    question: "Can I compare both condos before booking?",
    answer: "Yes. Search your dates once to see which units are available, then review each condo's photographs, layout, policies, and total price.",
  },
];

export default function WhyBookDirect() {
  return (
    <div className={styles.page}>
      <Head>
        <title>Why Book Direct | Destin Condo Getaways</title>
        <meta
          name="description"
          content="Book Pelican Beach Resort Units 707 and 1006 directly from the owner. Choose the exact condo, avoid marketplace service fees, and use secure OwnerRez checkout."
        />
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.preview}>Preview page | Production and OwnerRez remain unchanged</div>
      <div className={styles.utility}>
        <a href="/#condos">Condos</a>
        <a href="/#resort">The Resort</a>
        <a href={`${liveSite}/reviews`}>Reviews</a>
        <a href={`${liveSite}/destin-condo-guide-574047967`}>FAQ</a>
      </div>

      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="Destin Condo Getaways homepage">
          <span className={styles.mark}>DCG</span>
          <span><strong>Destin Condo Getaways</strong><small>Pelican Beach Resort | Destin, Florida</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="/#condos">Condos</a>
          <a href="/#resort">The Resort</a>
          <a href={`${liveSite}/blog`}>Destin Guide</a>
          <a href={`${liveSite}/destin-live-beach-cam-574002656`}>Beach Cam</a>
          <a href="#direct-faq">FAQ</a>
        </nav>
        <SiteButton href="#availability" variant="primary" size="compact">Check availability</SiteButton>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <a className={styles.breadcrumb} href="/">Home</a>
            <p className={styles.kicker}>Why book direct</p>
            <h1>Book the exact condo—with the owner behind it.</h1>
            <p className={styles.lead}>
              Direct booking should feel clearer, not riskier. See the real unit, compare
              current availability, understand the complete price, and reserve through
              the same secure OwnerRez system used to manage every stay.
            </p>
            <div className={styles.actions}>
              <SiteButton href="#availability" variant="primary" size="large">Check your dates</SiteButton>
              <SiteButton href="/#condos" variant="secondary" size="large">Compare the condos</SiteButton>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <Image
              src="/book-direct-banner-bg.jpg"
              alt="Pelican Beach Resort and the Gulf of Mexico in Destin"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 48vw"
            />
            <div className={styles.imageNote}><strong>Owner-managed</strong><span>Units 707 and 1006</span></div>
          </div>
        </section>

        <form className={styles.availability} id="availability" method="post" action={`${liveSite}/properties`}>
          <div><span>Check live availability</span><strong>Search both condos at once</strong></div>
          <input type="hidden" name="Page" value="1" />
          <input type="hidden" name="Sort" value="DailyRandom" />
          <label><span>Check in</span><input aria-label="Arrival date" name="ArrivalDate" type="date" required /></label>
          <label><span>Check out</span><input aria-label="Departure date" name="DepartureDate" type="date" required /></label>
          <label><span>Guests</span>
            <select aria-label="Guests" name="Guests" defaultValue="2">
              {[1,2,3,4,5,6].map((count) => <option value={count} key={count}>{count} {count === 1 ? "guest" : "guests"}</option>)}
            </select>
          </label>
          <SiteButton type="submit" variant="primary" size="standard">Search dates</SiteButton>
        </form>

        <section className={styles.promise}>
          <p className={styles.kicker}>What “book direct” means here</p>
          <h2>Less uncertainty between browsing and arrival.</h2>
          <div className={styles.reasonGrid}>
            {reasons.map((reason) => (
              <article key={reason.number}>
                <span>{reason.number}</span>
                <h3>{reason.title}</h3>
                <p>{reason.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.exact}>
          <div className={styles.exactImage}>
            <Image src="/hub-beachcam.png" alt="Gulf view at Pelican Beach Resort" fill sizes="(max-width: 900px) 100vw, 48vw" />
          </div>
          <div className={styles.exactCopy}>
            <p className={styles.kicker}>What you see is where you stay</p>
            <h2>No generic rental-pool promises.</h2>
            <p>
              Pelican Beach Resort contains individually owned condos. Quality, renovation,
              furnishings, floor level, and view can vary from unit to unit. Booking directly
              with us means choosing one known home—not merely reserving a unit category.
            </p>
            <ul>
              <li>Unit-specific photography and descriptions</li>
              <li>Known seventh- or tenth-floor Gulf view</li>
              <li>One-bedroom, two-bath layout for up to six guests</li>
              <li>Direct beachfront building with no road to cross</li>
            </ul>
            <a className={styles.textLink} href="/#condos">Compare Unit 707 and Unit 1006 →</a>
          </div>
        </section>

        <section className={styles.human}>
          <div>
            <p className={styles.kickerLight}>Owner-direct hospitality</p>
            <h2>Technology for convenience. A person when it matters.</h2>
          </div>
          <div>
            <p>
              Destiny Blue can help around the clock with availability and trip-planning
              questions. When a situation needs the owner, Ozan remains part of the stay.
              Empathy and useful information do not replace clear policies or invent promises.
            </p>
            <a href={`${liveSite}/aboutus-574000712`}>Meet your host →</a>
          </div>
        </section>

        <section className={styles.comparison}>
          <div className={styles.sectionIntro}>
            <p className={styles.kicker}>A straightforward comparison</p>
            <h2>Direct booking without the mystery.</h2>
          </div>
          <div className={styles.table} role="table" aria-label="Direct booking comparison">
            <div className={styles.tableHead} role="row"><strong role="columnheader">What matters</strong><strong role="columnheader">Direct with us</strong><strong role="columnheader">Large marketplace</strong></div>
            <div role="row"><span>Exact unit guaranteed</span><b>Yes</b><span>Varies by listing</span></div>
            <div role="row"><span>Owner communication</span><b>Direct</b><span>Often platform-mediated</span></div>
            <div role="row"><span>Guest platform service fee</span><b>No separate marketplace fee</b><span>Often added</span></div>
            <div role="row"><span>Secure online checkout</span><b>OwnerRez</b><span>Marketplace checkout</span></div>
          </div>
        </section>

        <section className={styles.faq} id="direct-faq">
          <div className={styles.sectionIntro}><p className={styles.kicker}>Questions before booking</p><h2>The important answers.</h2></div>
          <div className={styles.faqList}>
            {faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
          </div>
        </section>

        <section className={styles.finalCta}>
          <div><p className={styles.kickerLight}>Ready when you are</p><h2>Start with the dates. Decide without pressure.</h2><p>Search both condos and continue only after reviewing the complete booking details.</p></div>
          <div className={styles.actions}>
            <SiteButton href="#availability" variant="primary" size="large">Check availability</SiteButton>
            <SiteButton href="/" variant="light" size="large">Return home</SiteButton>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div><strong>Destin Condo Getaways</strong><p>Two beachfront condos. Thoughtful owner-direct hospitality.</p></div>
        <div><strong>Stay</strong><a href="/#condos">Our condos</a><a href="#availability">Availability</a><a href={`${liveSite}/reviews`}>Reviews</a></div>
        <div><strong>Learn</strong><a href="/#resort">The resort</a><a href={`${liveSite}/blog`}>Destin guides</a><a href={`${liveSite}/destin-condo-guide-574047967`}>FAQ & policies</a></div>
        <div><strong>Contact</strong><a href="tel:+19723574262">(972) 357-4262</a><a href="mailto:ozan@destincondogetaways.com">Email Ozan</a></div>
      </footer>

      <Script src="/destiny-loader.js" strategy="lazyOnload" />
    </div>
  );
}
