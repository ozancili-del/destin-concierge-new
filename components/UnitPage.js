import { useEffect, useState } from "react";
import Head from "next/head";
import Script from "next/script";
import SiteButton from "./SiteButton";
import SharedSiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import styles from "../styles/UnitPage.module.css";

const liveSite = "https://www.destincondogetaways.com";
const bookingWidgetId = "74e63543689f497287da04d5d23455b0";
const calendarWidgetId = "ffc8a5658e6f409baed4fe166fcaebca";
const amenityGroups = [
  ["Sleeping & family", ["King bedroom", "Hallway bunk beds", "Queen sleeper sofa", "Pack 'n Play/travel crib", "Children's books, toys and board games"]],
  ["Kitchen & dining", ["Full kitchen", "Refrigerator with ice maker", "Stove, oven and microwave", "Dishwasher", "Coffee maker, toaster, blender and kettle", "Cookware, dishes and wine glasses"]],
  ["Comfort & connectivity", ["High-speed Wi-Fi", "Central air and heat", "Smart TVs with cable", "Linens and towels", "Hair dryers", "Iron, ironing board and vacuum"]],
  ["Beach & resort", ["Direct beachfront access", "Indoor and outdoor pools", "Hot tubs, sauna and fitness center", "Tennis and outdoor grills", "Seasonal beach service and Tiki Bar", "Free parking and paid EV charging"]],
  ["Setting & views", ["Beachfront and oceanfront setting", "Private Gulf-view balcony", "Shared beach and resort access", "Beach, ocean, water and resort views", "No road to cross to the beach"]],
  ["Inside the condo", ["Two full bathrooms with showers; one also has a tub", "Dining table and laptop-friendly workspace", "Private entrance and smart-lock check-in", "Basic soaps, shampoo, conditioner and paper goods", "Extra pillows, blankets, hangers and clothing storage"]],
  ["Outdoor & recreation", ["Outdoor seating and dining areas", "Deck, patio and balcony access", "Tennis courts and outdoor grills", "Game room and resort fitness facilities", "Nearby boating, fishing, snorkeling and water sports"]],
  ["Safety & access", ["Smoke and carbon-monoxide detectors", "Fire extinguisher and first-aid kit", "Elevators and a disabled parking space", "High-temperature linen washing and surface disinfection", "Wheelchair inaccessible inside the condo"]],
];
const quickFacts = [
  ["↔", "873 sq ft"], ["♟", "Sleeps up to 6"], ["▰", "King, bunks & queen sofa"], ["◫", "2 bathrooms"],
  ["▣", "Full kitchen"], ["♨", "Laundry on every floor"], ["◉", "High-speed Wi-Fi"], ["◆", "Fitness, sauna & steam room"],
  ["☂", "Direct beachfront"], ["≈", "Private Gulf-view balcony"], ["♒", "Indoor & outdoor pools"], ["♨", "Hot tubs"],
];
const policies = [
  "Check-in is 4:00 PM Central and checkout is 10:00 AM Central.",
  "Maximum occupancy is six people, including infants.",
  "No smoking and no pets. The minimum rental age is 25 unless married.",
  "Beach tents and canopies are not allowed. Personal umbrellas must remain behind the rental-umbrella rows.",
  "A non-refundable 20% deposit plus processing fees is collected at booking; the remaining balance is due 30 days before arrival.",
  "Cancellations more than 30 days before arrival forfeit the deposit. Cancellations within 30 days are non-refundable.",
  "County-issued mandatory evacuations receive a prorated refund for paid, unused nights after the order begins. Travel insurance is strongly recommended.",
];

function photoDescription(unit, index) {
  if (unit.photoAlts[index]) return unit.photoAlts[index];
  const section = unit.photoSections.find((item) => index <= item.through)?.label || "Pelican Beach Resort amenity and Destin beachfront setting";
  return `${section} — photo ${index + 1} from Pelican Beach Resort Unit ${unit.number}`;
}

function SiteFooter() {
  return <SharedSiteFooter />;
}

export default function UnitPage({ unit }) {
  const [lightbox, setLightbox] = useState(null);
  const canonical = `${liveSite}/condos/unit-${unit.number}`;
  const photos = unit.schema.image;
  const virtualTourUrl = unit.number === "707"
    ? "https://kuula.co/share/collection/7Xtss?logo=0&info=0&fs=1&vr=1&sd=1&initload=0&autorotate=-0.47&autopalt=1&thumbs=1"
    : "https://kuula.co/share/collection/7XtwX?logo=0&info=0&fs=1&vr=1&sd=1&initload=0&autorotate=-0.47&autopalt=1&thumbs=1";
  const reviewSchema = unit.reviews.map((review) => ({ "@type": "Review", author: { "@type": "Person", name: review.name }, reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 }, reviewBody: review.text }));
  const imageSchema = photos.map((url, index) => ({ "@type": "ImageObject", contentUrl: url, url, caption: photoDescription(unit, index), name: photoDescription(unit, index) }));
  const rental = {
    ...unit.schema,
    "@id": `${canonical}#rental`,
    url: canonical,
    image: imageSchema,
    review: reviewSchema,
    address: {
      "@type": "PostalAddress",
      streetAddress: "1002 US-98",
      addressLocality: "Destin",
      addressRegion: "FL",
      postalCode: "32541",
      addressCountry: "US",
    },
    geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 },
  };
  const structuredData = { "@context": "https://schema.org", "@graph": [rental,
    { "@type": "WebPage", "@id": `${canonical}#webpage`, url: canonical, name: unit.title, description: rental.description, mainEntity: { "@id": `${canonical}#rental` } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Condos", item: `${liveSite}/#condos` }, { "@type": "ListItem", position: 3, name: `Unit ${unit.number}`, item: canonical }] },
  ] };

  useEffect(() => {
    if (lightbox === null) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowRight") setLightbox((value) => (value + 1) % photos.length);
      if (event.key === "ArrowLeft") setLightbox((value) => (value - 1 + photos.length) % photos.length);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [lightbox, photos.length]);

  return <div className={styles.page}>
    <Head><title>{unit.title}</title><meta name="description" content={unit.metaDescription || rental.description} /><meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"} /><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="canonical" href={canonical} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></Head>
    <div className={styles.preview}>Preview page | Live availability and secure checkout remain connected</div>
    <div className={styles.utility}><a href="/reviews">Guest Reviews</a><a href="/why-book-direct#direct-faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href="/about">Contact</a></div>
    <SiteHeader availabilityHref="#checkout" />
    <main>
      <section className={styles.propertyShowcase}>
        <div className={styles.propertyHeading}>
          <div className={styles.breadcrumbs}><a href="/">Home</a><span>/</span><a href="/destin-vacation-rentals-by-owner">Vacation rentals</a><span>/</span><span>Unit {unit.number}</span></div>
          <p className={styles.kicker}>{unit.floorLabel} · directly beachfront</p>
          <h1>Pelican Beach Resort Unit {unit.number}</h1>
          <div className={styles.headingBottom}><h2>{unit.style}</h2><div className={styles.actions}><SiteButton href="#checkout" variant="primary" size="large">See dates &amp; total</SiteButton></div></div>
        </div>
        <div className={styles.previewMosaic} id="photos" aria-label={`Photo preview for Pelican Beach Resort Unit ${unit.number}`}>
          {photos.slice(0, 5).map((src, index) => <button className={index === 0 ? styles.mosaicLead : styles.mosaicTile} key={src} type="button" onClick={() => setLightbox(index)} aria-label={`Enlarge ${photoDescription(unit, index)}`}><img src={src} alt={photoDescription(unit, index)} loading="eager" width="1200" height="800" />{index === 4 && <span>View all {photos.length} photos</span>}</button>)}
        </div>
        <div className={styles.propertyHighlights} aria-label={`Essential facts for Unit ${unit.number}`}><span><strong>873</strong> sq ft</span><span><strong>1</strong> bedroom</span><span><strong>2</strong> bathrooms</span><span><strong>Sleeps</strong> up to 6</span><span><strong>Gulf-view</strong> balcony</span></div>
      </section>
      <section className={styles.checkout} id="checkout"><div className={styles.checkoutCopy}><p className={styles.kicker}>Secure direct checkout</p><h2>Add dates and guests to see your complete total.</h2><p>The unit-specific checkout shows availability, the automatic direct-booking discount, fees, taxes and the controlling reservation terms before you confirm.</p><div className={styles.trustRow}><span>✓ Exact unit</span><span>✓ Secure checkout</span><span>✓ No discount code needed</span></div></div><div className={styles.widgetShell}><div className="ownerrez-widget" data-propertyid={unit.propertyId} data-widget-type="Booking/Inquiry" data-widgetid={bookingWidgetId}></div><noscript><a href={unit.ownerRezUrl}>Open the secure booking page for Unit {unit.number}</a></noscript></div></section>
      <section className={styles.intro}><div><p className={styles.kicker}>Your exact condo</p><h2>{unit.introTitle}</h2></div><div>{unit.intro.map((p) => <p key={p}>{p}</p>)}</div></section>
      <section className={styles.intro}><div><p className={styles.kicker}>Before reserving Unit {unit.number}</p><h2>Use the complete total and exact guest count.</h2></div><div><p>Enter the arrival date, departure date, adults and children in the unit-specific checkout. The displayed total is calculated for this condo and should be reviewed together with its charge details, cancellation policy and rental terms. A nightly rate shown elsewhere is not the complete reservation total.</p><p>Every traveler—including infants—counts toward the six-person occupancy limit. If the dates or party size change, update the fields and allow the checkout to recalculate before continuing. The reservation is not held until the secure booking process confirms it.</p><p>Check-in is 4:00 PM and checkout is 10:00 AM unless the written reservation information says otherwise. The secure guest instructions supplied for the booking control arrival access, parking and in-stay details; public page text is not a substitute for those private instructions.</p><p>Compare the gallery, sleeping layout, laundry arrangement and balcony perspective for this exact unit. Condos inside the same resort are individually owned and can differ, so the name of the building alone does not describe the home being reserved.</p><p>If a search began on the availability page, confirm that its dates and guest counts remain populated here. The checkout widget—not a locally calculated estimate—controls the current price and charge breakdown.</p></div></section>
      <section className={styles.quickFacts} aria-label={`Key features of Unit ${unit.number}`}>{quickFacts.map(([icon, label]) => <div key={label}><span aria-hidden="true">{icon}</span><strong>{label}</strong></div>)}</section>
      <section className={styles.details}><div className={styles.sectionHead}><p className={styles.kicker}>Inside Unit {unit.number}</p><h2>Everything needed for an easy beachfront stay.</h2></div><div className={styles.detailCopy}>{unit.fullDescription.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><div className={styles.featureGrid}>{amenityGroups.map(([title, items]) => <article key={title}><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></section>
      <section className={styles.virtualTour} id="virtual-tour"><div><p className={styles.kicker}>Interactive 360° walkthrough</p><h2>Step inside Unit {unit.number} before booking.</h2><p>Move through the living room, kitchen, sleeping areas and balcony of this exact condo. Use the photo mosaic above for the newest still images, and the tour to understand the layout and flow.</p><a href="/virtual-tours">Compare both virtual tours →</a></div><div className={styles.tourShell}><iframe src={virtualTourUrl} title={`Interactive 360-degree virtual tour of Pelican Beach Resort Unit ${unit.number}`} allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div></section>
      <section className={styles.view}><img src={photos[1]} alt={photoDescription(unit, 1)} loading="lazy" width="1400" height="900"/><div><p className={styles.kicker}>{unit.floorLabel}</p><h2>{unit.viewTitle}</h2><p>{unit.viewCopy}</p><SiteButton href="/beach-cam" variant="secondary">See the live beach cams</SiteButton></div></section>
      <section className={styles.reviews}><div className={styles.sectionHead}><p className={styles.kicker}>Guest experiences</p><h2>What guests say about Unit {unit.number}.</h2></div><div className={styles.reviewGrid}>{unit.reviews.map((review) => <blockquote key={review.name + review.stay}><div aria-label="Five out of five stars">★★★★★</div><p>“{review.text}”</p><footer><strong>{review.name}</strong><span>{review.stay}</span></footer></blockquote>)}</div><div className={styles.reviewLinks}><SiteButton href="/reviews" variant="secondary">Read all guest reviews</SiteButton>{unit.platformLinks.map((link) => <a href={link.href} key={link.name} target="_blank" rel="noopener noreferrer">View Unit {unit.number} on {link.name} ↗</a>)}</div></section>
      <section className={styles.policies} id="policies"><div className={styles.sectionHead}><p className={styles.kicker}>Important booking details</p><h2>Clear policies before checkout.</h2></div><ul>{policies.map((policy) => <li key={policy}>{policy}</li>)}<li>Florida registration number: {unit.registrationNumber}.</li></ul></section>
      <section className={styles.location}><div><p className={styles.kicker}>Directly beachfront</p><h2>Pelican Beach Resort, central Destin.</h2><p>1002 US Highway 98, Destin, Florida 32541. Walk from the elevator to the white sand without crossing a road.</p></div><iframe title="Map showing Pelican Beach Resort in Destin Florida" loading="lazy" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3441.8171146853974!2d-86.47457320000001!3d30.3845507!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x889145a1fdc5ea1d%3A0x27bea14ea937b3e9!2sDestin%20Getaways%20Condos%20at%20Pelican%20Beach%20Resort!5e0!3m2!1sen!2sus!4v1772737770702!5m2!1sen!2sus"></iframe></section>
      <nav className={styles.journey} aria-label="Continue planning this Destin stay"><div><p className={styles.kicker}>Continue with useful details</p><h2>Place this exact condo in the rest of your trip.</h2><p>Review the building and location, compare the other available home, then use the local guides only for the parts of the vacation you still need to plan.</p></div><div className={styles.journeyGrid}><a href="/destin-vacation-rentals-by-owner"><span>Vacation rentals</span><strong>Compare the available beachfront homes</strong></a><a href="/resort"><span>Resort &amp; location</span><strong>Beach access, pools and central Destin</strong></a><a href="/trip-planner"><span>Trip planner</span><strong>Build a day-by-day itinerary</strong></a><a href="/blog/destinweather"><span>Weather &amp; Gulf</span><strong>Plan around current conditions</strong></a></div></nav>
      <section className={styles.availability} id="availability"><div className={styles.sectionHead}><p className={styles.kicker}>Unit {unit.number} calendar</p><h2>Check the next available dates.</h2><p>This compact live calendar is specific to this condo. Return to the checkout above to enter guests and review the complete total.</p></div><div className={styles.calendarShell}><div className="ownerrez-widget" data-propertyid={unit.propertyId} data-widget-type="Multiple Month Calendar" data-widgetid={calendarWidgetId}></div><noscript><a href={`${unit.ownerRezUrl}#availability`}>Open the live availability calendar for Unit {unit.number}</a></noscript></div></section>
      <section className={styles.finalCta}><div><p>Ready to reserve Unit {unit.number}?</p><h2>Review dates, total and terms securely.</h2><small>The live calendar, current pricing and secure checkout are connected to this exact condo.</small></div><SiteButton href="#checkout" variant="primary" size="large">Go to secure checkout</SiteButton></section>
    </main>
    <SiteFooter />
    {lightbox !== null && <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={`Unit ${unit.number} photo gallery`}><button className={styles.close} onClick={() => setLightbox(null)} aria-label="Close photo gallery">×</button><button className={styles.previous} onClick={() => setLightbox((lightbox - 1 + photos.length) % photos.length)} aria-label="Previous photo">‹</button><figure><img src={photos[lightbox]} alt={photoDescription(unit, lightbox)} /><figcaption>{photoDescription(unit, lightbox)} <span>{lightbox + 1} / {photos.length}</span></figcaption></figure><button className={styles.next} onClick={() => setLightbox((lightbox + 1) % photos.length)} aria-label="Next photo">›</button></div>}
    <Script src="https://app.ownerrez.com/widget.js" strategy="afterInteractive" />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
