import Head from "next/head";
import Script from "next/script";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import styles from "../styles/GalleryMapFaq.module.css";
import mapStyles from "../styles/MapEnhancements.module.css";

const liveSite = "https://www.destincondogetaways.com";
const canonicalUrl = `${liveSite}/map`;
const businessId = `${liveSite}/#business`;
const resortExplorer =
  "https://www.mypelicanbeach.com/pelican-beach-resort-interactive-map";
const condoFinder =
  "https://www.mypelicanbeach.com/pelican-beach-resort-3d-condo-finder";
const directions =
  "https://www.google.com/maps/dir/?api=1&destination=Pelican%20Beach%20Resort%2C%201002%20US-98%2C%20Destin%2C%20FL%2032541";
const mapEmbed =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3441.8171146853974!2d-86.47457320000001!3d30.3845507!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x889145a1fdc5ea1d%3A0x27bea14ea937b3e9!2sDestin%20Getaways%20Condos%20at%20Pelican%20Beach%20Resort!5e0!3m2!1sen!2sus!4v1772737770702!5m2!1sen!2sus";

const seoTitle = "Pelican Beach Resort Map, Directions & Location";
const metaDescription =
  "Find Pelican Beach Resort at 1002 US-98 in Destin. See driving directions, parking, arrival steps, nearby places and independent interactive 3D maps.";

const quickFacts = [
  {
    label: "Exact address",
    title: "1002 US-98, Destin, FL 32541",
    copy: "Use the exact street address in live navigation before departure.",
  },
  {
    label: "Building",
    title: "Main Gulf-front tower",
    copy: "Units 707 and 1006 are in the resort's main beachfront condominium building.",
  },
  {
    label: "Beach access",
    title: "No road crossing",
    copy: "Guests descend to the Gulf side and continue through the property to the beach.",
  },
  {
    label: "Destin location",
    title: "Directly on US-98",
    copy: "Nearby distances below are approximate; seasonal traffic can change travel time materially.",
  },
];

const arrivalSteps = [
  {
    number: "1",
    title: "Check in with security",
    copy: "Approach from US-98 and begin with the property's security check-in. Have the reservation name and unit number available.",
  },
  {
    number: "2",
    title: "Use temporary arrival parking",
    copy: "Follow current signs to the temporary arrival area while unloading and completing the property-level arrival process.",
  },
  {
    number: "3",
    title: "Collect the parking hang tag",
    copy: "The parking hang tag is collected from reception or the front desk. Reservation-specific condo access instructions remain separate.",
  },
  {
    number: "4",
    title: "Move to permanent parking",
    copy: "After unloading and collecting the hang tag, move the vehicle to an approved permanent space and follow current signs.",
  },
];

const parkingRows = [
  {
    option: "Temporary arrival parking",
    use: "Unloading luggage and completing the initial arrival sequence",
    verify: "Current location, permitted duration and any active restrictions",
  },
  {
    option: "Open parking",
    use: "Normal permanent parking after the arrival process",
    verify: "Approved areas, hang-tag display and live space availability",
  },
  {
    option: "Covered garage",
    use: "A covered permanent-parking option when a suitable space is available",
    verify: "Clearance, signs, vehicle fit and any restricted areas",
  },
  {
    option: "Accessible parking",
    use: "Marked spaces for guests with the appropriate permit",
    verify: "Exact location, space availability and the complete route to the lobby and condo",
  },
  {
    option: "EV charging",
    use: "Two paid J1772 charging stations are available on the property",
    verify: "Operating status, payment method, charging etiquette and current availability",
  },
];

const nearbyPlaces = [
  {
    name: "Pelican Beach Resort beach access",
    proximity: "On property",
    copy: "The main building is Gulf-front, and guests reach the sand without crossing a public road.",
  },
  {
    name: "Big Kahuna's",
    proximity: "Across US-98",
    copy: "A nearby Destin landmark. Do not assume that crossing US-98 will suit every family, weather condition or mobility need.",
  },
  {
    name: "The Back Porch",
    proximity: "Approximately 1 mile",
    copy: "A nearby beachfront restaurant reference point. Check live directions and current operating information before leaving.",
  },
  {
    name: "HarborWalk Village",
    proximity: "Approximately 3 miles",
    copy: "A harbor district with dining, cruises, events and activities. Event traffic can materially affect the trip.",
  },
  {
    name: "Destin Commons",
    proximity: "Approximately 4 miles",
    copy: "A shopping, dining and entertainment district east of the resort. Use live navigation for the current route.",
  },
];

const faqs = [
  {
    question: "What is the address of Pelican Beach Resort?",
    answer:
      "Pelican Beach Resort is at 1002 US-98, Destin, FL 32541. Use that exact address in live navigation because traffic and road conditions can change.",
  },
  {
    question: "Is Pelican Beach Resort directly on the beach?",
    answer:
      "Yes. The main condominium building is directly Gulf-front, and Units 707 and 1006 are located in that building.",
  },
  {
    question: "Do guests cross a road to reach the beach?",
    answer:
      "No. Guests staying in the main Gulf-front building reach the beach through the resort property without crossing a public road.",
  },
  {
    question: "Where do guests get the parking hang tag?",
    answer:
      "Guests initially check in with security, use temporary arrival parking, and collect the parking hang tag from reception or the front desk before moving to permanent parking. Current signs and private arrival instructions take priority.",
  },
  {
    question: "Is there an interactive Pelican Beach Resort map?",
    answer:
      "Yes. MyPelicanBeach independently created a 3D Resort Explorer for entrances, parking, pools, amenities, boardwalk and Gulf orientation, plus a separate 3D Condo Finder for floors, unit positions and balconies.",
  },
  {
    question: "What is the difference between the 3D Resort Explorer and 3D Condo Finder?",
    answer:
      "The Resort Explorer helps visitors understand the property and arrival route. The Condo Finder helps compare floors, unit stacks, balcony positions and Gulf-facing direction inside the main building.",
  },
  {
    question: "Which airports serve Pelican Beach Resort?",
    answer:
      "Guests commonly compare Destin-Fort Walton Beach Airport (VPS) and Northwest Florida Beaches International Airport (ECP). Travel time varies with traffic, season and time of day.",
  },
  {
    question: "Where are Units 707 and 1006?",
    answer:
      "Both are in the main Gulf-front building. Unit 707 is on the seventh floor, and Unit 1006 is on the tenth floor. Each has a private Gulf-view balcony.",
  },
  {
    question: "Is Pelican Beach Resort near restaurants and attractions?",
    answer:
      "Yes. Big Kahuna's is across US-98, while The Back Porch, HarborWalk Village and Destin Commons are nearby reference points. Distances are approximate, and traffic can change travel times materially.",
  },
  {
    question: "Can guests stay at Pelican Beach Resort without a car?",
    answer:
      "A beach-focused stay may work without a car because the beach is directly accessible from the property. Off-property plans may require rideshare or a vehicle depending on the destination, weather, traffic and individual mobility.",
  },
];

export default function MapPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: seoTitle,
        description: metaDescription,
        about: { "@id": businessId },
        mainEntity: { "@id": `${canonicalUrl}#map` },
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
      },
      {
        "@type": "Map",
        "@id": `${canonicalUrl}#map`,
        url: canonicalUrl,
        name: "Pelican Beach Resort map and directions",
        description:
          "A location, directions, parking and arrival guide for Destin Condo Getaways at Pelican Beach Resort, with a Google map and independent 3D orientation tools.",
        about: { "@id": businessId },
      },
      {
        "@type": "LodgingBusiness",
        "@id": businessId,
        name: "Destin Condo Getaways",
        url: liveSite,
        description:
          "Owner-managed vacation rentals in Units 707 and 1006 within Pelican Beach Resort's main Gulf-front building in Destin, Florida.",
        address: {
          "@type": "PostalAddress",
          streetAddress: "1002 US-98",
          addressLocality: "Destin",
          addressRegion: "FL",
          postalCode: "32541",
          addressCountry: "US",
        },
        hasMap: canonicalUrl,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: liveSite,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Pelican Beach Resort Map and Directions",
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: faqs.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        })),
      },
    ],
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta
          name="robots"
          content={
            process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production"
              ? "index,follow"
              : "noindex,nofollow"
          }
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={canonicalUrl} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

      {process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== "production" ? (
        <div className={styles.preview}>
          Migration preview | Production remains unchanged
        </div>
      ) : null}

      <SiteHeader availabilityHref="#availability" />

      <main>
        <section className={styles.mapHero}>
          <div className={mapStyles.heroInner}>
            <a href="/">Home</a>
            <p className={styles.kickerLight}>Map, directions and location</p>
            <h1>Pelican Beach Resort map, directions and location guide</h1>
            <p className={mapStyles.heroAddress}>
              <strong>1002 US-98, Destin, FL 32541</strong>
            </p>
            <p>
              Find the main Gulf-front building, open live driving directions,
              understand parking and arrival, and explore the property with two
              independent interactive 3D tools.
            </p>
            <div className={mapStyles.heroActions}>
              <SiteButton href={directions} variant="primary" size="large">
                Open driving directions
              </SiteButton>
              <SiteButton
                href="#interactive-3d-tools"
                variant="light"
                size="large"
              >
                Explore the 3D maps
              </SiteButton>
            </div>
          </div>
        </section>

        <section className={mapStyles.quickFacts} aria-labelledby="location-facts">
          <div className={mapStyles.sectionInner}>
            <div className={mapStyles.sectionIntro}>
              <p className={mapStyles.eyebrow}>Quick location facts</p>
              <h2 id="location-facts">Know the address and building before you drive.</h2>
            </div>
            <div className={mapStyles.quickFactGrid}>
              {quickFacts.map((fact) => (
                <article className={mapStyles.quickFact} key={fact.label}>
                  <span className={mapStyles.factLabel}>{fact.label}</span>
                  <h3>{fact.title}</h3>
                  <p>{fact.copy}</p>
                </article>
              ))}
            </div>
            <p className={mapStyles.approxNote}>
              <strong>Approximate information:</strong> Nearby distances and
              route descriptions are planning references, not promised travel
              times. Use live navigation for the actual trip.
            </p>
          </div>
        </section>

        <div className={mapStyles.availabilityWrap}>
          <AvailabilitySearch />
        </div>

        <section
          className={`${mapStyles.section} ${mapStyles.sectionAlt}`}
          id="interactive-3d-tools"
          aria-labelledby="interactive-tools-heading"
        >
          <div className={mapStyles.sectionInner}>
            <div className={mapStyles.sectionIntro}>
              <p className={mapStyles.eyebrow}>Visual orientation</p>
              <h2 id="interactive-tools-heading">
                Go beyond a flat Pelican Beach Resort map.
              </h2>
              <p>
                The street map gets you to 1002 US-98. These two independent
                MyPelicanBeach tools help you understand the property and the
                main building before arrival.
              </p>
            </div>

            <div className={mapStyles.toolGrid}>
              <a
                className={mapStyles.toolCard}
                href={resortExplorer}
                aria-label="Open the Pelican Beach Resort 3D Explorer"
              >
                <span className={mapStyles.toolMeta}>
                  Arrival · parking · pools · beach
                </span>
                <h3>Pelican Beach Resort 3D Explorer</h3>
                <p>
                  Follow the US-98 approach and see the relationship among
                  security, entrances, lobbies, temporary arrival parking,
                  permanent parking, pools, amenities, boardwalk, beach and Gulf.
                </p>
                <ul className={mapStyles.toolList}>
                  <li>Rotate and zoom the property</li>
                  <li>Follow the arrival sequence</li>
                  <li>Open mapped locations and resort photographs</li>
                </ul>
                <strong className={mapStyles.toolLink}>
                  Explore the resort in 3D →
                </strong>
              </a>

              <a
                className={`${mapStyles.toolCard} ${mapStyles.toolCardAlt}`}
                href={condoFinder}
                aria-label="Open the Pelican Beach Resort 3D Condo Finder"
              >
                <span className={mapStyles.toolMeta}>
                  Floors · stacks · balconies · orientation
                </span>
                <h3>Pelican Beach Resort 3D Condo Finder</h3>
                <p>
                  Compare floors, unit stacks and positions, balcony locations,
                  condo orientation and Gulf-facing direction inside the main
                  beachfront building.
                </p>
                <ul className={mapStyles.toolList}>
                  <li>Filter by condo type and floor range</li>
                  <li>Compare unit positions within the tower</li>
                  <li>Understand balcony and Gulf-facing orientation</li>
                </ul>
                <strong className={mapStyles.toolLink}>
                  Find condo locations in 3D →
                </strong>
              </a>
            </div>

            <div className={mapStyles.toolDisclaimer}>
              <strong>Independent orientation tools:</strong> MyPelicanBeach
              created both experiences independently. They are not official
              resort maps, surveys, accessibility certifications or promises of
              an exact balcony view. Current signs, reservation instructions and
              exact-unit photographs control.
            </div>
          </div>
        </section>

        <section
          className={mapStyles.section}
          id="property-map"
          aria-labelledby="property-map-heading"
        >
          <div className={`${mapStyles.sectionInner} ${mapStyles.mapGrid}`}>
            <div className={mapStyles.mapFrame}>
              <iframe
                title="Google map showing Pelican Beach Resort at 1002 US-98 in Destin, Florida"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                src={mapEmbed}
              />
            </div>

            <div className={mapStyles.mapCopy}>
              <p className={mapStyles.eyebrow}>Google map and property orientation</p>
              <h2 id="property-map-heading">
                US-98 is the arrival side; the Gulf is the beach side.
              </h2>
              <p>
                The address-facing side of the property is where guests approach
                from US-98, complete the initial security process and reach the
                main entrance and parking areas. The opposite side of the main
                building opens toward the resort&apos;s pools, boardwalk, beach and
                Gulf.
              </p>
              <div className={mapStyles.orientationFlow} aria-label="Property orientation">
                <span>US-98</span>
                <span>Security and arrival</span>
                <span>Main Gulf-front building</span>
                <span>Pools and boardwalk</span>
                <span>Beach and Gulf</span>
              </div>
              <p>
                The resort has five elevators. That fact alone does not
                guarantee that the complete parking-to-condo or condo-to-beach
                route will meet every mobility need, so guests should verify the
                current elevator status and any temporary detour.
              </p>
              <p>
                For fuller property details, read the
                {" "}
                <a className={mapStyles.textLink} href="/pelican-beach-resort-destin">
                  Pelican Beach Resort guide
                </a>
                .
              </p>

              <div className={mapStyles.unitGrid}>
                <a
                  className={mapStyles.unitCard}
                  href="/pelican-beach-resort-unit-707"
                >
                  <span className={mapStyles.unitMeta}>Seventh floor</span>
                  <h3>Pelican Beach Resort Unit 707</h3>
                  <p>Private Gulf-view balcony in the main Gulf-front building.</p>
                  <strong>View Unit 707 →</strong>
                </a>
                <a
                  className={mapStyles.unitCard}
                  href="/pelican-beach-resort-unit-1006"
                >
                  <span className={mapStyles.unitMeta}>Tenth floor</span>
                  <h3>Pelican Beach Resort Unit 1006</h3>
                  <p>Private Gulf-view balcony in the main Gulf-front building.</p>
                  <strong>View Unit 1006 →</strong>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          className={`${mapStyles.section} ${mapStyles.sectionAlt}`}
          id="arrival-parking"
          aria-labelledby="arrival-heading"
        >
          <div className={mapStyles.sectionInner}>
            <div className={mapStyles.sectionIntro}>
              <p className={mapStyles.eyebrow}>Arrival and parking</p>
              <h2 id="arrival-heading">Use the verified arrival sequence.</h2>
              <p>
                The property-level sequence is straightforward. Condo entry,
                access codes and other reservation details remain private and
                must come from the current guest instructions.
              </p>
            </div>

            <div className={mapStyles.stepsGrid}>
              {arrivalSteps.map((step) => (
                <article className={mapStyles.stepCard} key={step.number}>
                  <span className={mapStyles.stepNumber}>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>

            <div className={mapStyles.notice}>
              <strong>Current instructions control:</strong> Guests may bring up
              to two cars. Current signs and the private arrival instructions
              take priority over this general overview, particularly if parking,
              construction or access procedures change.
            </div>

            <div className={mapStyles.tableWrap}>
              <table className={mapStyles.dataTable}>
                <caption>Parking choices and what to confirm</caption>
                <thead>
                  <tr>
                    <th scope="col">Parking option</th>
                    <th scope="col">Practical use</th>
                    <th scope="col">Confirm before relying on it</th>
                  </tr>
                </thead>
                <tbody>
                  {parkingRows.map((row) => (
                    <tr key={row.option}>
                      <th scope="row">{row.option}</th>
                      <td>{row.use}</td>
                      <td>{row.verify}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section
          className={mapStyles.section}
          id="directions-airports"
          aria-labelledby="directions-heading"
        >
          <div className={mapStyles.sectionInner}>
            <div className={mapStyles.sectionIntro}>
              <p className={mapStyles.eyebrow}>Getting to the resort</p>
              <h2 id="directions-heading">
                Use live directions rather than a fixed travel-time promise.
              </h2>
              <p>
                Traffic, construction, event demand, season and time of day can
                materially change the trip to Pelican Beach Resort. Open live
                directions shortly before departure and leave extra time when
                arriving during a busy period.
              </p>
            </div>

            <div className={mapStyles.airportGrid}>
              <article className={mapStyles.airportCard}>
                <span className={mapStyles.factLabel}>VPS</span>
                <h3>Destin-Fort Walton Beach Airport</h3>
                <p>
                  Use the airport&apos;s current ground-transportation information and
                  live navigation for the trip to 1002 US-98. Do not rely on an
                  old mileage or drive-time estimate.
                </p>
              </article>
              <article className={mapStyles.airportCard}>
                <span className={mapStyles.factLabel}>ECP</span>
                <h3>Northwest Florida Beaches International Airport</h3>
                <p>
                  ECP is another airport guests may compare. The practical choice
                  depends on flights, transportation, traffic and the full travel
                  day—not distance alone.
                </p>
              </article>
            </div>

            <div className={mapStyles.driverNote}>
              <h3>Approaching through Destin</h3>
              <p>
                Pelican Beach Resort is directly on US-98. Use current navigation
                and watch for the resort entrance as you approach. This page does
                not provide turn-by-turn instructions because lane conditions,
                construction and traffic patterns can change.
              </p>
              <a className={mapStyles.textLink} href="/blog/destinairport">
                Compare airport and ground-transportation options →
              </a>
            </div>
          </div>
        </section>

        <section
          className={`${mapStyles.section} ${mapStyles.sectionAlt}`}
          id="nearby"
          aria-labelledby="nearby-heading"
        >
          <div className={mapStyles.sectionInner}>
            <div className={mapStyles.sectionIntro}>
              <p className={mapStyles.eyebrow}>What is nearby</p>
              <h2 id="nearby-heading">Useful reference points from Pelican Beach Resort.</h2>
              <p>
                These are approximate location references, not guaranteed travel
                times. Check live traffic and current business information before
                leaving the resort.
              </p>
            </div>

            <div className={mapStyles.nearbyGrid}>
              {nearbyPlaces.map((place) => (
                <article className={mapStyles.nearbyCard} key={place.name}>
                  <span className={mapStyles.distanceBadge}>{place.proximity}</span>
                  <h3>{place.name}</h3>
                  <p>{place.copy}</p>
                </article>
              ))}
            </div>

            <div className={mapStyles.linkRow}>
              <a href="/blog/best-restaurants-destin-local-guide">
                Explore the local restaurant guide →
              </a>
              <a href="/blog/best-beaches-destin">
                Compare Destin-area beaches →
              </a>
            </div>
          </div>
        </section>

        <section
          className={mapStyles.section}
          id="walkability"
          aria-labelledby="walkability-heading"
        >
          <div className={mapStyles.sectionInner}>
            <div className={mapStyles.walkabilityGrid}>
              <div>
                <p className={mapStyles.eyebrow}>Walkability and transportation</p>
                <h2 id="walkability-heading">
                  The beach is direct; off-property routes require judgment.
                </h2>
                <p>
                  Beach access is the clear walking advantage: guests in the main
                  Gulf-front building reach the beach through the resort without
                  crossing a public road.
                </p>
                <p>
                  That does not make all of Destin comfortably walkable. A place
                  can look close on a map while the actual route involves US-98,
                  traffic, heat, rain, darkness, interrupted sidewalks or a
                  difficult return trip.
                </p>
                <p>
                  Choose walking, rideshare or driving according to the specific
                  destination, current weather, traffic, what the group is
                  carrying and each guest&apos;s mobility. This page does not provide
                  an accessibility guarantee.
                </p>
              </div>
              <aside className={mapStyles.callout}>
                <h3>Before walking off property</h3>
                <ul>
                  <li>Inspect the complete route, not only the distance.</li>
                  <li>Check crossings, sidewalks and construction.</li>
                  <li>Consider heat, rain and the return after dark.</li>
                  <li>Account for children, strollers and mobility needs.</li>
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <section
          className={`${mapStyles.section} ${mapStyles.sectionAlt}`}
          id="faq"
          aria-labelledby="faq-heading"
        >
          <div className={mapStyles.sectionInner}>
            <div className={mapStyles.sectionIntro}>
              <p className={mapStyles.eyebrow}>Frequently asked questions</p>
              <h2 id="faq-heading">Pelican Beach Resort map and location questions.</h2>
            </div>

            <div className={mapStyles.faqGrid}>
              {faqs.map((faq) => (
                <article className={mapStyles.faqItem} key={faq.question}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={mapStyles.finalSection}>
          <div className={mapStyles.finalInner}>
            <div>
              <p className={styles.kickerLight}>After you understand the location</p>
              <h2>Compare the two Gulf-view condos and check your dates.</h2>
              <p>
                Destin Condo Getaways offers owner-managed stays in Units 707
                and 1006 in the main Gulf-front building; it does not manage the
                entire resort.
              </p>
            </div>
            <div className={mapStyles.finalActions}>
              <SiteButton href="/availability" variant="primary" size="large">
                View live availability
              </SiteButton>
              <SiteButton
                href="/pelican-beach-resort-unit-707"
                variant="light"
                size="standard"
              >
                Explore Unit 707
              </SiteButton>
              <SiteButton
                href="/pelican-beach-resort-unit-1006"
                variant="light"
                size="standard"
              >
                Explore Unit 1006
              </SiteButton>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <Script src="/destiny-loader.js" strategy="lazyOnload" />
    </div>
  );
}
