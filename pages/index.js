import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import styles from "../styles/HomePreview.module.css";

const site = "https://www.destincondogetaways.com";

const condos = [
  {
    unit: "707",
    eyebrow: "Classic Coastal",
    image: "/hub-beachcam.png",
    description:
      "A relaxed seventh-floor retreat with direct Gulf views, a private balcony, and the beach just downstairs.",
    href: `${site}/pelican-beach-resort-unit-707-orp5b47b5ax`,
  },
  {
    unit: "1006",
    eyebrow: "Fresh Coastal",
    image: "/book-direct-banner-bg.jpg",
    description:
      "A bright tenth-floor escape with panoramic emerald-water views and sunset skies from your private balcony.",
    href: `${site}/pelican-beach-resort-unit-1006-orp5b6450ex`,
  },
];

const faqs = [
  {
    question: "Why should I book directly?",
    answer:
      "Booking directly gives you the current OwnerRez rate and availability, secure checkout, and direct support from the owner without an additional marketplace service fee.",
  },
  {
    question: "How close are the condos to the beach?",
    answer:
      "Both condos are inside Pelican Beach Resort's main beachfront building. Take the elevator downstairs and walk directly to the sand—there is no road to cross.",
  },
  {
    question: "How many guests can each condo accommodate?",
    answer:
      "Each one-bedroom, two-bath condo accommodates up to six people. Every adult, child, and infant counts toward the six-person maximum.",
  },
  {
    question: "Where do I see live pricing and availability?",
    answer:
      "Enter your dates and guest count in the availability search. OwnerRez will show the current available condo, rate, fees, taxes, policies, and secure checkout.",
  },
];

export default function Home() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <div className={styles.page}>
        <Head>
          <title>Destin Condo Getaways | Beachfront Condos at Pelican Beach Resort</title>
          <meta
            name="description"
            content="Book two owner-managed beachfront condos at Pelican Beach Resort in Destin, Florida. Direct Gulf views, live availability, local guides, and secure direct booking."
          />
          <meta name="robots" content="noindex,nofollow" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          />
        </Head>

        <div className={styles.previewBar}>
          Private homepage concept | production and OwnerRez remain unchanged
        </div>

        <div className={styles.utilityBar}>
          <a href={`${site}/reviews`}>Guest Reviews</a>
          <a href={`${site}/destin-condo-guide-574047967`}>FAQ</a>
          <a href={`${site}/destin-condo-guide-574047967`}>Policies</a>
          <a href={`${site}/aboutus-574000712`}>Contact</a>
        </div>

        <header className={styles.header}>
          <a className={styles.brand} href="#top" aria-label="Destin Condo Getaways home">
            <span className={styles.mark}>DCG</span>
            <span>
              <strong>Destin Condo Getaways</strong>
              <small>Pelican Beach Resort | Destin, Florida</small>
            </span>
          </a>
          <nav className={styles.nav} aria-label="Main navigation">
            <a href="#condos">Condos</a>
            <a href="#resort">The Resort</a>
            <a href={`${site}/blog`}>Destin Guide</a>
            <a href={`${site}/destin-live-beach-cam-574002656`}>Beach Cam</a>
            <a href="https://deals.destincondogetaways.com/beach-deals">Deals</a>
            <a href="#live-chat">Live Chat</a>
          </nav>
          <a className={styles.bookButton} href="#availability">
            Check availability
          </a>
        </header>

        <main id="top">
          <section className={styles.hero}>
            <Image
              className={styles.heroImage}
              src="/book-direct-banner-bg.jpg"
              alt="Pelican Beach Resort beside the emerald Gulf waters in Destin"
              fill
              priority
              sizes="100vw"
            />
            <div className={styles.heroShade} />
            <div className={styles.heroContent}>
              <p className={styles.kicker}>4.94 star rating | 400+ stays | 1,000+ guests</p>
              <h1>Your beachfront Destin stay starts here.</h1>
              <p className={styles.heroCopy}>
                Two owner-managed Gulf-front condos at Pelican Beach Resort. No road to
                cross—just elevator, sand, and emerald water.
              </p>
            </div>
            <form
              className={styles.search}
              id="availability"
              method="post"
              action={`${site}/properties`}
            >
              <input type="hidden" name="Page" value="1" />
              <input type="hidden" name="Sort" value="DailyRandom" />
              <label>
                <span>Check in</span>
                <input aria-label="Arrival date" name="ArrivalDate" type="date" required />
              </label>
              <label>
                <span>Check out</span>
                <input aria-label="Departure date" name="DepartureDate" type="date" required />
              </label>
              <label>
                <span>Guests</span>
                <select aria-label="Guests" name="Guests" defaultValue="2">
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <option value={count} key={count}>
                      {count} {count === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Check availability</button>
            </form>
          </section>

          <section className={styles.trustStrip} aria-label="Stay highlights">
            <div><strong>Right on the sand</strong><span>No street to cross</span></div>
            <div><strong>Book owner-direct</strong><span>Secure OwnerRez checkout</span></div>
            <div><strong>Resort amenities</strong><span>Pools, hot tubs & fitness</span></div>
            <div><strong>Help when needed</strong><span>Owner support plus live chat</span></div>
          </section>

          <section className={styles.section} id="condos">
            <div className={styles.sectionIntro}>
              <p className={styles.kickerDark}>Choose your Gulf view</p>
              <h2>Two condos. One unforgettable shoreline.</h2>
              <p>
                Both are one-bedroom, two-bath beachfront homes with full kitchens,
                private balconies, and room for up to six guests.
              </p>
            </div>
            <div className={styles.cards}>
              {condos.map((condo) => (
                <article className={styles.card} key={condo.unit}>
                  <div className={styles.cardImage}>
                    <Image
                      src={condo.image}
                      alt={`Gulf-view setting for Pelican Beach Resort Unit ${condo.unit}`}
                      fill
                      sizes="(max-width: 900px) 100vw, 50vw"
                    />
                    <span>Unit {condo.unit}</span>
                  </div>
                  <div className={styles.cardBody}>
                    <p>{condo.eyebrow}</p>
                    <h3>Pelican Beach Resort Unit {condo.unit}</h3>
                    <ul>
                      <li>1 bedroom</li><li>2 bathrooms</li><li>Sleeps up to 6</li>
                    </ul>
                    <p className={styles.cardCopy}>{condo.description}</p>
                    <a href={condo.href}>Explore Unit {condo.unit} <span>-&gt;</span></a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.direct}>
            <div className={styles.reviewPanel}>
              <p className={styles.kickerDark}>Guest Reviews</p>
              <div className={styles.stars} aria-label="Five out of five stars">★★★★★</div>
              <h2>Hosted personally. Remembered warmly.</h2>
              <p>
                Guests consistently mention the Gulf views, cleanliness, easy beach access,
                and responsive owner support.
              </p>
              <a className={styles.textLink} href={`${site}/reviews`}>Read guest reviews -&gt;</a>
            </div>
            <div className={styles.directPanel}>
              <p className={styles.kickerDark}>Why book direct</p>
              <h2>A simpler way to stay.</h2>
              <div className={styles.reasonGrid}>
                <div><strong>No marketplace service fee</strong><span>Book through our direct secure flow.</span></div>
                <div><strong>Personal local support</strong><span>Reach the owner when the situation needs a person.</span></div>
                <div><strong>The exact condo</strong><span>See the real unit, view, amenities, and policies.</span></div>
                <div><strong>OwnerRez checkout</strong><span>Live pricing, availability, and payment remain secure.</span></div>
              </div>
              <a className={styles.textLink} href={`${site}/-pelican-beach-resort-condo-rental-574046950`}>Why book direct -&gt;</a>
            </div>
          </section>

          <section className={styles.resort} id="resort">
            <div className={styles.resortImage}>
              <Image
                src="/destin-aerial.jpg"
                alt="Aerial view of Destin's coastline and emerald Gulf water"
                fill
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            </div>
            <div className={styles.resortCopy}>
              <p className={styles.kickerDark}>Pelican Beach Resort</p>
              <h2>Everything you came to Destin for, right downstairs.</h2>
              <p>
                Start with coffee on your Gulf-view balcony, take the elevator to the white
                sand, then cool off in one of three pools. HarborWalk, seafood favorites,
                and family attractions are minutes away.
              </p>
              <div className={styles.amenities}>
                <span>3 pools</span><span>2 hot tubs</span><span>Beachside tiki bar</span>
                <span>Tennis & pickleball</span><span>Fitness center</span><span>Free parking</span>
              </div>
              <a className={styles.textLink} href={`${site}/pelican-beach-resort-destin-574048693`}>
                See the resort -&gt;
              </a>
            </div>
          </section>

          <section className={styles.webcam}>
            <div className={styles.webcamVisual}>
              <Image
                src="/hub-beachcam.png"
                alt="Preview of the live beach view from Destin"
                fill
                sizes="(max-width: 900px) 100vw, 62vw"
              />
              <span>Live Beach Cam</span>
            </div>
            <div className={styles.webcamCopy}>
              <p className={styles.kicker}>See Destin now</p>
              <h2>Check the beach before you pack.</h2>
              <p>Watch the Gulf, shoreline, and current beach scene from Pelican Beach Resort.</p>
              <a href={`${site}/destin-live-beach-cam-574002656`}>Open the live beach cam</a>
            </div>
          </section>

          <section className={styles.explore}>
            <div className={styles.sectionIntro}>
              <p className={styles.kickerDark}>Plan the whole getaway</p>
              <h2>Everything around your stay.</h2>
              <p>
                Useful planning tools and local guides stay easy to find without crowding
                the primary navigation.
              </p>
            </div>
            <div className={styles.exploreGrid}>
              <a href="https://deals.destincondogetaways.com/beach-deals"><span>Current price reductions</span><strong>Beach deals</strong></a>
              <a href={`${site}/destin-vacation-itinerary-planner-574049367`}><span>Built around your family</span><strong>Itinerary planner</strong></a>
              <a href="https://explore.destincondogetaways.com/destin-hub"><span>Weather, food & activities</span><strong>Destin guide</strong></a>
              <a href={`${site}/blog/how-to-find-cheaper-flights-and-car-rentals`}><span>Airports and route planning</span><strong>Flights</strong></a>
              <a href={`${site}/blog/destincar`}><span>VPS and Destin transportation</span><strong>Car rentals</strong></a>
              <a href={`${site}/map`}><span>Know what is nearby</span><strong>Destin map</strong></a>
            </div>
          </section>

          <section className={styles.faqSection}>
            <div className={styles.sectionIntro}>
              <p className={styles.kickerDark}>Frequently asked questions</p>
              <h2>Know before you go.</h2>
            </div>
            <div className={styles.faqList}>
              {faqs.map((faq) => (
                <details key={faq.question}>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
            <a className={styles.textLink} href={`${site}/destin-condo-guide-574047967`}>See all FAQs and policies -&gt;</a>
          </section>

          <section className={styles.liveChat} id="live-chat">
            <div>
              <p className={styles.kickerDark}>Live Chat</p>
              <h2>Questions while you plan?</h2>
              <p>
                Open Live Chat for availability, Destin planning, activities, weather, and
                guest support. Inside the conversation, Destiny Blue is clearly identified
                as our AI vacation concierge.
              </p>
            </div>
            <span>Use the chat bubble in the corner</span>
          </section>

          <section className={styles.cta}>
            <div>
              <p className={styles.kicker}>Ready when you are</p>
              <h2>Let&apos;s find your dates.</h2>
              <p>
                Check both condos together and continue through the existing secure
                OwnerRez booking process.
              </p>
            </div>
            <a href="#availability">Check availability</a>
          </section>
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            <strong>Destin Condo Getaways</strong>
            <p>Two beachfront condos. Thoughtful owner-direct hospitality.</p>
            <a href="tel:+19723574262">(972) 357-4262</a>
            <a href="mailto:ozan@destincondogetaways.com">ozan@destincondogetaways.com</a>
          </div>
          <div><strong>Stay</strong><a href={condos[0].href}>Unit 707</a><a href={condos[1].href}>Unit 1006</a><a href={`${site}/availability`}>Availability</a><a href={`${site}/reviews`}>Reviews</a><a href={`${site}/book`}>Book direct</a></div>
          <div><strong>Plan</strong><a href={`${site}/blog/how-to-find-cheaper-flights-and-car-rentals`}>Flights</a><a href={`${site}/blog/destincar`}>Car rentals</a><a href="https://explore.destincondogetaways.com/destin-tripshock.html">Activities</a><a href={`${site}/destin-vacation-itinerary-planner-574049367`}>Itinerary planner</a><a href={`${site}/map`}>Destin map</a></div>
          <div><strong>Destin Guides</strong><a href={`${site}/blog/destinweather`}>Weather</a><a href={`${site}/blog/best-beaches-destin`}>Beaches</a><a href={`${site}/blog/best-restaurants-destin`}>Restaurants</a><a href={`${site}/blog/destin-events-2026`}>Events</a><a href={`${site}/blog/destin-fireworks-2026`}>Fireworks</a></div>
          <div><strong>Guest Information</strong><a href={`${site}/destin-condo-guide-574047967`}>Policies</a><a href={`${site}/destin-condo-guide-574047967`}>FAQ</a><a href={`${site}/aboutus-574000712`}>Contact</a><a href={`${site}/privacy-574035022`}>Privacy</a><a href={`${site}/destin-live-beach-cam-574002656`}>Live beach cam</a></div>
        </footer>
      </div>
      <Script src="/destiny-head.js" strategy="lazyOnload" />
    </>
  );
}
