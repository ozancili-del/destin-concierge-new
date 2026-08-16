import { useEffect, useState } from "react";
import Head from "next/head";
import Script from "next/script";
import SiteButton from "./SiteButton";
import SharedSiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import styles from "../styles/UnitPage.module.css";

const liveSite = "https://www.destincondogetaways.com";
const bookingWidgetId = "c1aad72d7c4a420fb1fcc8f1fc7aecc4";
const calendarWidgetId = "851adbcbc00b45d784c00ac5ce972d29";
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
  const reviewSchema = unit.reviews.map((review) => ({ "@type": "Review", author: { "@type": "Person", name: review.name }, reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 }, reviewBody: review.text }));
  const imageSchema = photos.map((url, index) => ({ "@type": "ImageObject", contentUrl: url, url, caption: photoDescription(unit, index), name: photoDescription(unit, index) }));
  const rental = { ...unit.schema, "@id": `${canonical}#rental`, url: canonical, image: imageSchema, review: reviewSchema };
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
    <Head><title>{unit.title}</title><meta name="description" content={rental.description} /><meta name="robots" content="noindex,nofollow" /><meta name="viewport" content="width=device-width, initial-scale=1" /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></Head>
    <div className={styles.preview}>Preview page | Secure checkout remains powered by OwnerRez</div>
    <div className={styles.utility}><a href="/reviews">Guest Reviews</a><a href="/why-book-direct#direct-faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href="/about">Contact</a></div>
    <SiteHeader availabilityHref="#checkout" />
    <main>
      <section className={styles.hero}><img src={photos[0]} alt={photoDescription(unit, 0)} width="1800" height="1200" /><div className={styles.shade}></div><div className={styles.heroCopy}><a href="/">Home</a><span>/</span><a href="/#condos">Condos</a><p>{unit.floorLabel} · 1 bedroom · 2 bathrooms · sleeps 4–6</p><h1>Pelican Beach Resort Unit {unit.number}</h1><h2>{unit.style}</h2><div className={styles.actions}><SiteButton href="#checkout" variant="primary" size="large">See dates &amp; total</SiteButton><SiteButton href="#photos" variant="light" size="large">View all {photos.length} photos</SiteButton></div></div></section>
      <section className={styles.checkout} id="checkout"><div className={styles.checkoutCopy}><p className={styles.kicker}>Secure direct checkout</p><h2>Add dates and guests to see your complete total.</h2><p>The unit-specific OwnerRez checkout shows availability, the automatic direct-booking discount, fees, taxes and the controlling reservation terms before you confirm.</p><div className={styles.trustRow}><span>✓ Exact unit</span><span>✓ Secure checkout</span><span>✓ No discount code needed</span></div></div><div className={styles.widgetShell}><div className="ownerrez-widget" data-propertyid={unit.propertyId} data-widget-type="Booking/Inquiry" data-widgetid={bookingWidgetId}></div><noscript><a href={unit.ownerRezUrl}>Open the secure booking page for Unit {unit.number}</a></noscript></div></section>
      <section className={styles.availability} id="availability"><div className={styles.sectionHead}><p className={styles.kicker}>Unit {unit.number} calendar</p><h2>See available and unavailable dates.</h2><p>This live multi-month calendar comes directly from OwnerRez for this exact condo. Use the checkout above to confirm your dates, guest count and complete total.</p></div><div className={styles.calendarShell}><div className="ownerrez-widget" data-propertyid={unit.propertyId} data-widget-type="Multiple Month Calendar" data-widgetid={calendarWidgetId}></div><noscript><a href={`${unit.ownerRezUrl}#availability`}>Open the live availability calendar for Unit {unit.number}</a></noscript></div></section>
      <section className={styles.intro}><div><p className={styles.kicker}>Your exact condo</p><h2>{unit.introTitle}</h2></div><div>{unit.intro.map((p) => <p key={p}>{p}</p>)}</div></section>
      <section className={styles.gallerySection} id="photos"><div className={styles.sectionHead}><p className={styles.kicker}>Complete photo gallery</p><h2>See every room, view and resort amenity.</h2><p>Every photo from the OwnerRez property listing is included. Select any image to enlarge it and use the arrow keys or controls to continue.</p></div><div className={styles.gallery}>{photos.slice(0, 12).map((src, index) => <button key={src} type="button" onClick={() => setLightbox(index)} aria-label={`Enlarge ${photoDescription(unit, index)}`}><img src={src} alt={photoDescription(unit, index)} loading={index < 3 ? "eager" : "lazy"} width="1200" height="800" /></button>)}</div><button className={styles.allPhotos} type="button" onClick={() => setLightbox(0)}>View all {photos.length} photos</button></section>
      <section className={styles.quickFacts} aria-label={`Key features of Unit ${unit.number}`}>{quickFacts.map(([icon, label]) => <div key={label}><span aria-hidden="true">{icon}</span><strong>{label}</strong></div>)}</section>
      <section className={styles.details}><div className={styles.sectionHead}><p className={styles.kicker}>Inside Unit {unit.number}</p><h2>Everything needed for an easy beachfront stay.</h2></div><div className={styles.detailCopy}>{unit.fullDescription.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><div className={styles.featureGrid}>{amenityGroups.map(([title, items]) => <article key={title}><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></section>
      <section className={styles.view}><img src={photos[1]} alt={photoDescription(unit, 1)} loading="lazy" width="1400" height="900"/><div><p className={styles.kicker}>{unit.floorLabel}</p><h2>{unit.viewTitle}</h2><p>{unit.viewCopy}</p><SiteButton href="/beach-cam" variant="secondary">See the live beach cams</SiteButton></div></section>
      <section className={styles.reviews}><div className={styles.sectionHead}><p className={styles.kicker}>Guest experiences</p><h2>What guests say about Unit {unit.number}.</h2></div><div className={styles.reviewGrid}>{unit.reviews.map((review) => <blockquote key={review.name + review.stay}><div aria-label="Five out of five stars">★★★★★</div><p>“{review.text}”</p><footer><strong>{review.name}</strong><span>{review.stay}</span></footer></blockquote>)}</div><div className={styles.reviewLinks}><SiteButton href="/reviews" variant="secondary">Read all guest reviews</SiteButton>{unit.platformLinks.map((link) => <a href={link.href} key={link.name} target="_blank" rel="noopener noreferrer">View Unit {unit.number} on {link.name} ↗</a>)}</div></section>
      <section className={styles.policies} id="policies"><div className={styles.sectionHead}><p className={styles.kicker}>Important booking details</p><h2>Clear policies before checkout.</h2></div><ul>{policies.map((policy) => <li key={policy}>{policy}</li>)}<li>Florida registration number: {unit.registrationNumber}.</li></ul></section>
      <section className={styles.location}><div><p className={styles.kicker}>Directly beachfront</p><h2>Pelican Beach Resort, central Destin.</h2><p>1002 US Highway 98, Destin, Florida 32541. Walk from the elevator to the white sand without crossing a road.</p></div><iframe title="Map showing Pelican Beach Resort in Destin Florida" loading="lazy" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3441.8171146853974!2d-86.47457320000001!3d30.3845507!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x889145a1fdc5ea1d%3A0x27bea14ea937b3e9!2sDestin%20Getaways%20Condos%20at%20Pelican%20Beach%20Resort!5e0!3m2!1sen!2sus!4v1772737770702!5m2!1sen!2sus"></iframe></section>
      <section className={styles.finalCta}><div><p>Ready to reserve Unit {unit.number}?</p><h2>Review dates, total and terms securely.</h2><small>OwnerRez handles the live calendar, pricing and checkout for this exact condo.</small></div><SiteButton href="#checkout" variant="primary" size="large">Go to secure checkout</SiteButton></section>
    </main>
    <SiteFooter />
    {lightbox !== null && <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={`Unit ${unit.number} photo gallery`}><button className={styles.close} onClick={() => setLightbox(null)} aria-label="Close photo gallery">×</button><button className={styles.previous} onClick={() => setLightbox((lightbox - 1 + photos.length) % photos.length)} aria-label="Previous photo">‹</button><figure><img src={photos[lightbox]} alt={photoDescription(unit, lightbox)} /><figcaption>{photoDescription(unit, lightbox)} <span>{lightbox + 1} / {photos.length}</span></figcaption></figure><button className={styles.next} onClick={() => setLightbox((lightbox + 1) % photos.length)} aria-label="Next photo">›</button></div>}
    <Script src="https://app.ownerrez.com/widget.js" strategy="afterInteractive" />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
