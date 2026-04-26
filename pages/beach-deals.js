import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";

// ── ISR — runs at build time + revalidates every 10 mins ─────────────────────
export async function getStaticProps() {
  try {
    // Supabase client inside getStaticProps — never leaks to client bundle
    const supabase = createClient(
      process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
      process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
    );

    const SCAN_DAYS   = 180;
    const STAY_NIGHTS = [3, 4, 5];
    const WINDOWS     = [7, 14, 30];
    const MIN_DROP    = 5;
    const MAX_DEALS   = 20;

    function fmt(d) { return d.toISOString().split("T")[0]; }
    function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
    function friendly(str) {
      return new Date(str + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = fmt(today);

    const allDates = [];
    for (let i = 1; i <= SCAN_DAYS + 5; i++) allDates.push(fmt(addDays(today, i)));

    const capturedDates = [todayStr, ...WINDOWS.map(w => fmt(addDays(today, -w)))];

    const { data: snapshots, error } = await supabase
      .from("price_snapshots")
      .select("unit_id, date, price, captured_date")
      .in("date", allDates)
      .in("captured_date", capturedDates)
      .limit(5000);

    if (error || !snapshots?.length) {
      return { props: { deals: [] }, revalidate: 600 };
    }

    // Organise: byUnit[unit][captured_date][date] = price
    const byUnit = {};
    for (const row of snapshots) {
      if (!byUnit[row.unit_id]) byUnit[row.unit_id] = {};
      if (!byUnit[row.unit_id][row.captured_date]) byUnit[row.unit_id][row.captured_date] = {};
      byUnit[row.unit_id][row.captured_date][row.date] = row.price;
    }

    // Max price ever seen per unit per date (across ALL captured_dates)
    const maxPrice = {};
    for (const row of snapshots) {
      const key = `${row.unit_id}::${row.date}`;
      if (!maxPrice[key] || row.price > maxPrice[key]) maxPrice[key] = row.price;
    }

    const candidates = [];

    for (const unit of ["707", "1006"]) {
      const unitData = byUnit[unit];
      if (!unitData?.[todayStr]) continue;

      for (let i = 1; i <= SCAN_DAYS; i++) {
        const arrival    = addDays(today, i);
        const arrivalStr = fmt(arrival);

        for (const nights of STAY_NIGHTS) {
          const departure    = addDays(arrival, nights);
          const departureStr = fmt(departure);

          const windowDates = [];
          for (let j = 0; j < nights; j++) windowDates.push(fmt(addDays(arrival, j)));

          const todayPrices = windowDates.map(d => unitData[todayStr]?.[d]).filter(v => v != null);
          if (todayPrices.length < nights) continue;

          const avgToday = todayPrices.reduce((s, v) => s + v, 0) / todayPrices.length;

          // Use MAX historical price as baseline
          const maxPrices = windowDates.map(d => maxPrice[`${unit}::${d}`]).filter(v => v != null);
          if (maxPrices.length < nights) continue;

          const avgMax  = maxPrices.reduce((s, v) => s + v, 0) / maxPrices.length;
          const dropPct = ((avgMax - avgToday) / avgMax) * 100;

          if (dropPct < MIN_DROP || dropPct > 60 || avgMax <= avgToday) continue;

          candidates.push({
            unit,
            arrival:           arrivalStr,
            departure:         departureStr,
            arrivalFriendly:   friendly(arrivalStr),
            departureFriendly: friendly(departureStr),
            nights,
            dropPct:    Math.round(dropPct),
            fromPrice:  Math.round(avgMax),
            toPrice:    Math.round(avgToday),
            totalSavings: Math.round((avgMax - avgToday) * nights),
          });
        }
      }
    }

    candidates.sort((a, b) => b.dropPct - a.dropPct || b.totalSavings - a.totalSavings);

    const finalDeals = [];
    const usedRanges = { "707": [], "1006": [] };
    for (const deal of candidates) {
      const used     = usedRanges[deal.unit];
      const overlaps = used.some(r => deal.arrival < r.departure && deal.departure > r.arrival);
      if (!overlaps) {
        finalDeals.push(deal);
        usedRanges[deal.unit].push({ arrival: deal.arrival, departure: deal.departure });
      }
      if (finalDeals.length >= MAX_DEALS) break;
    }

    return { props: { deals: finalDeals }, revalidate: 600 };

  } catch (err) {
    console.error("[BEACH-DEALS ISR]", err.message);
    return { props: { deals: [] }, revalidate: 60 };
  }
}

// ── Static data ───────────────────────────────────────────────────────────────
const IMAGES = {
  "707": [
    { src: "https://uc.orez.io/f/242b1d12dd544f7a9debe10583aca308", alt: "Pelican Beach Resort Unit 707 beachfront balcony view in Destin Florida" },
    { src: "https://uc.orez.io/i/abaefcc22f0749b49d73dc232abc5430-MediumOriginal", alt: "Unit 707 Classic Coastal living room with Gulf views at Pelican Beach Resort Destin" },
    { src: "https://uc.orez.io/i/4a4320ef00a54d15bccf6767418be83b-MediumOriginal", alt: "Destin beachfront condo bedroom Unit 707 Pelican Beach Resort" },
    { src: "https://uc.orez.io/i/3b9692e52bb241aa827c5297abdb0bce-MediumOriginal", alt: "Unit 707 kitchen and dining area at Pelican Beach Resort Destin FL" },
    { src: "https://uc.orez.io/i/399beafa83584661899e9500cb390d6e-MediumOriginal", alt: "Emerald Gulf of Mexico view from Unit 707 balcony Pelican Beach Resort" },
    { src: "https://uc.orez.io/i/6007c9a799d44643ae47934f3554808b-MediumOriginal", alt: "Unit 707 bathroom at Pelican Beach Resort Destin Florida" },
    { src: "https://uc.orez.io/f/44060a8a29ca4a998586d849184d288f", alt: "Pelican Beach Resort pool and beach access from Unit 707 Destin FL" },
    { src: "https://uc.orez.io/f/e1e624f8d4c14ed2a8f3d05e169252e0", alt: "Unit 707 Classic Coastal condo interior Pelican Beach Resort Destin" },
    { src: "https://uc.orez.io/i/5cd8d28c33e14711a68e723ec300ca2a-MediumOriginal", alt: "Sunset Gulf view from Unit 707 7th floor Pelican Beach Resort Destin" },
    { src: "https://uc.orez.io/i/7da337c1e9334be9a992ff9f666cd8b7-MediumOriginal", alt: "Direct beach access from Pelican Beach Resort Unit 707 Destin Florida" },
  ],
  "1006": [
    { src: "https://uc.orez.io/i/f20eceb9b43142b48e1f20ac457e7232-MediumOriginal", alt: "Pelican Beach Resort Unit 1006 panoramic Gulf view from 10th floor Destin Florida" },
    { src: "https://uc.orez.io/f/e5af88bfe30c4243ba03fe79ee2f8229", alt: "Unit 1006 Fresh Coastal living room with Gulf of Mexico view Pelican Beach Resort" },
    { src: "https://uc.orez.io/i/6108b609ed6046c8bd828f4b5ba19fda-MediumOriginal", alt: "Destin beachfront condo bedroom Unit 1006 Pelican Beach Resort FL" },
    { src: "https://uc.orez.io/i/4e32883598f649e2869f5d4bb1e1d16f-MediumOriginal", alt: "Unit 1006 kitchen and dining at Pelican Beach Resort Destin Florida" },
    { src: "https://uc.orez.io/f/2e389c31f39b43ad97002f607e7c4aef", alt: "Emerald Coast view from Unit 1006 private balcony Pelican Beach Resort" },
    { src: "https://uc.orez.io/f/79bdfd24ee36463396ae08a12e478975", alt: "Unit 1006 bathroom at Pelican Beach Resort Destin FL" },
    { src: "https://uc.orez.io/f/e5038191e8884d3b9c0cb1a40ba2766f", alt: "Pelican Beach Resort pool and beachfront from Unit 1006 Destin" },
    { src: "https://uc.orez.io/f/17399809efc54824944e7af6bb55472e", alt: "Unit 1006 Fresh Coastal condo interior 10th floor Pelican Beach Resort Destin" },
    { src: "https://uc.orez.io/f/e604a649be3a4d07b58b6f5f07ca92c7", alt: "Gulf sunset panoramic view Unit 1006 Pelican Beach Resort Destin Florida" },
    { src: "https://uc.orez.io/i/a98c17bc10814f3aa27da0cdbbf81af4-MediumOriginal", alt: "Direct beachfront access Pelican Beach Resort Unit 1006 Destin FL" },
  ],
};

const UNIT_META = {
  "707":  { name: "Unit 707",  sub: "Classic Coastal · 7th Floor",  slug: "pelican-beach-resort-unit-707-orp5b47b5ax",  fullName: "Pelican Beach Resort Unit 707 — Classic Coastal" },
  "1006": { name: "Unit 1006", sub: "Fresh Coastal · 10th Floor",   slug: "pelican-beach-resort-unit-1006-orp5b6450ex", fullName: "Pelican Beach Resort Unit 1006 — Fresh Coastal" },
};

function shuffledImages(unit) {
  const imgs = [...IMAGES[unit]];
  const rest = imgs.slice(1);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [imgs[0], ...rest];
}

function bookingUrl(unit, arrival, departure) {
  const base = `https://www.destincondogetaways.com/${UNIT_META[unit].slug}`;
  return `${base}?or_arrival=${arrival}&or_departure=${departure}&or_adults=2&or_children=0&or_guests=2`;
}

// ── JSON-LD schema builder ────────────────────────────────────────────────────
function buildSchema(deals) {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Featured Destin Beachfront Price Drops",
    "description": "Current vacation rental price drops at Pelican Beach Resort, Destin FL. Direct booking savings on Unit 707 and Unit 1006.",
    "url": "https://deals.destincondogetaways.com/beach-deals",
    "numberOfItems": deals.length,
    "itemListElement": deals.map((deal, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "VacationRental",
        "name": UNIT_META[deal.unit].fullName,
        "identifier": `pelican-beach-resort-unit-${deal.unit}`,
        "telephone": "+19723574262",
        "priceRange": "$200 - $600",
        "description": `Beachfront vacation rental at Pelican Beach Resort, Destin FL. ${UNIT_META[deal.unit].fullName}. Sleeps 6. Direct booking savings available.`,
        "url": bookingUrl(deal.unit, deal.arrival, deal.departure),
        "image": IMAGES[deal.unit].map(img => img.src),
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 30.3865467,
          "longitude": -86.4733424
        },
        "containsPlace": {
          "@type": "Accommodation",
          "name": UNIT_META[deal.unit].fullName,
          "numberOfRooms": 2,
          "numberOfBedrooms": 1,
          "numberOfBathroomsTotal": 2,
          "floorLevel": deal.unit === "707" ? "7" : "10",
          "occupancy": {
            "@type": "QuantitativeValue",
            "value": 6,
            "minValue": 1,
            "maxValue": 6
          },
          "bed": [
            { "@type": "BedDetails", "typeOfBed": "King", "numberOfBeds": 1 },
            { "@type": "BedDetails", "typeOfBed": "Sofa Bed", "numberOfBeds": 1 },
            { "@type": "BedDetails", "typeOfBed": "Bunk Bed", "numberOfBeds": 1 }
          ],
          "amenityFeature": [
            { "@type": "LocationFeatureSpecification", "name": "Free Parking", "value": true },
            { "@type": "LocationFeatureSpecification", "name": "Beachfront", "value": true },
            { "@type": "LocationFeatureSpecification", "name": "Gulf View", "value": true },
            { "@type": "LocationFeatureSpecification", "name": "EV Charger", "value": true }
          ]
        },
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "1002 US-98 East",
          "addressLocality": "Destin",
          "addressRegion": "FL",
          "postalCode": "32541",
          "addressCountry": "US"
        },
        "offers": {
          "@type": "Offer",
          "price": deal.toPrice,
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "validFrom": deal.arrival,
          "validThrough": deal.departure,
          "description": `${deal.dropPct}% off — ${deal.arrivalFriendly} to ${deal.departureFriendly}, ${deal.nights} nights at $${deal.toPrice}/night (was $${deal.fromPrice})`,
          "url": bookingUrl(deal.unit, deal.arrival, deal.departure),
        }
      }
    }))
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.destincondogetaways.com" },
      { "@type": "ListItem", "position": 2, "name": "Beach Deals", "item": "https://deals.destincondogetaways.com/beach-deals" }
    ]
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How are the price drops calculated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Price drop percentages are calculated against the highest recently recorded price for those dates in our pricing system. Final rates confirmed at checkout."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need a promo code to get the discount?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No promo code needed. A 10% direct booking discount is automatically applied when you book through destincondogetaways.com. Use code BLUE for an additional 5% off."
        }
      },
      {
        "@type": "Question",
        "name": "What is the cancellation policy?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A 20% non-refundable deposit is due upon booking. The remaining balance is due 30 days before check-in. Cancellations within 30 days of check-in are non-refundable. Travel insurance is offered at checkout."
        }
      },
      {
        "@type": "Question",
        "name": "Where are the condos located?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Both Unit 707 and Unit 1006 are located at Pelican Beach Resort, 1002 US-98 East, Destin, FL 32541 — directly on the Gulf of Mexico with beachfront access."
        }
      },
      {
        "@type": "Question",
        "name": "What are the check-in and check-out times?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Check-in is at 4:00 PM and check-out is at 10:00 AM (CST). Free parking is included. Paid EV chargers are available on property."
        }
      },
      {
        "@type": "Question",
        "name": "How often do these deals update?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Deals are refreshed automatically every 10 minutes based on live pricing data from our system. Prices reflect the most recent rates available at the time of your visit."
        }
      },
      {
        "@type": "Question",
        "name": "Are these direct booking prices?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. All prices shown are direct booking rates at destincondogetaways.com, which include a 10% direct booking discount automatically applied. You save the OTA service fees that platforms like Airbnb or VRBO would charge."
        }
      }
    ]
  };

  return [itemList, breadcrumb, faq];
}

// ── Carousel ──────────────────────────────────────────────────────────────────
function Carousel({ unit, index }) {
  const images   = useRef(shuffledImages(unit));
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  function goTo(idx) { setCurrent((idx + images.current.length) % images.current.length); }
  function resetTimer() {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % images.current.length), 3500);
  }
  useEffect(() => {
    const delay = setTimeout(() => resetTimer(), index * 900);
    return () => { clearTimeout(delay); clearInterval(timerRef.current); };
  }, []);

  return (
    <div style={{ position: "relative", height: "200px" }}>
      {/* Fade carousel — all images stacked, only current is visible */}
      {images.current.map((img, i) => (
        <div key={i} style={{
          position: "absolute", inset: 0,
          opacity: i === current ? 1 : 0,
          transition: "opacity 0.8s ease",
          zIndex: i === current ? 1 : 0,
        }}>
          <img
            src={img.src}
            alt={img.alt}
            loading={i === 0 ? "eager" : "lazy"}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", display: "block" }}
          />
        </div>
      ))}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(2,18,40,0.65) 72%, rgba(2,18,40,0.95) 100%)", pointerEvents: "none", zIndex: 3 }} />
      <div style={{ position: "absolute", bottom: 14, right: 10, display: "flex", flexDirection: "column", gap: 4, zIndex: 4 }}>
        {images.current.map((_, i) => (
          <div key={i} onClick={e => { e.preventDefault(); goTo(i); resetTimer(); }} style={{ width: 5, height: 5, borderRadius: "50%", cursor: "pointer", background: i === current ? "#00d4c8" : "rgba(255,255,255,0.3)", boxShadow: i === current ? "0 0 6px #00d4c8" : "none", transition: "background 0.3s, box-shadow 0.3s" }} />
        ))}
      </div>
    </div>
  );
}

// ── Deal card ─────────────────────────────────────────────────────────────────
function DealCard({ deal, index }) {
  const meta      = UNIT_META[deal.unit];
  const url       = bookingUrl(deal.unit, deal.arrival, deal.departure);
  const dateLabel = `${deal.arrivalFriendly} – ${deal.departureFriendly} · ${deal.nights} nights`;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="deal-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: hovered ? "translateY(-8px) scale(1.04)" : "translateY(0) scale(1)",
        boxShadow: hovered ? "0 24px 60px rgba(0,0,0,0.8), 0 0 36px rgba(0,212,200,0.35)" : "0 8px 32px rgba(0,0,0,0.5)",
        borderColor: hovered ? "rgba(0,212,200,0.9)" : "rgba(0,212,200,0.35)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
        zIndex: hovered ? 10 : 1,
      }}
    >
      <div className="card-photo-wrap">
        <div style={{ position: "relative" }}>
          <Carousel unit={deal.unit} index={index} />
          <div className="drop-badge">{deal.dropPct}%</div>
          <div className="unit-overlay">
            <div className="unit-name">{meta.name}</div>
            <div className="unit-sub">{meta.sub}</div>
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="dates-row">
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {dateLabel}
        </div>
        <div className="price-row">
          <span className="price-was">${deal.fromPrice}</span>
          <span className="price-arrow">→</span>
          <span className="price-now"><sup>$</sup>{deal.toPrice}<span className="price-night">/night</span></span>
        </div>
        <a className="btn-book" href={url}>Check Live Price →</a>
      </div>
    </div>
  );
}

// ── Email capture ─────────────────────────────────────────────────────────────
function EmailCapture() {
  const [email, setEmail]   = useState('');
  const [status, setStatus] = useState('idle');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/deals-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch { setStatus('error'); }
  }

  if (status === 'success') return (
    <div className="email-capture">
      <div className="email-capture-success">
        <span style={{fontSize:28}}>🎉</span>
        <div>
          <strong>You&apos;re on the list!</strong>
          <p>We&apos;ll notify you when prices drop at Pelican Beach Resort.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="email-capture">
      <div className="email-capture-inner">
        <div className="email-capture-text">
          <div className="email-capture-eyebrow">📬 Free Price Drop Alerts</div>
          <strong>Be the first to know when prices drop.</strong>
          <p>We&apos;ll email you when Unit 707 or 1006 drops in price. No spam, unsubscribe anytime.</p>
        </div>
        <form className="email-capture-form" onSubmit={handleSubmit}>
          <input type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} className="email-input" required />
          <button type="submit" className="email-btn" disabled={status === 'loading'}>
            {status === 'loading' ? 'Subscribing...' : 'Notify Me →'}
          </button>
        </form>
        {status === 'error' && <p style={{color:'var(--strike)',fontSize:12,marginTop:8}}>Something went wrong — please try again.</p>}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="deal-card" style={{ overflow: "hidden" }}>
      <div style={{ height: 200, background: "rgba(255,255,255,0.05)", animation: "shimmer 1.5s infinite" }} />
      <div className="card-body">
        <div style={{ height: 12, width: "60%", background: "rgba(255,255,255,0.07)", borderRadius: 6, marginBottom: 12 }} />
        <div style={{ height: 28, width: "80%", background: "rgba(255,255,255,0.07)", borderRadius: 6, marginBottom: 16 }} />
        <div style={{ height: 40, background: "rgba(255,255,255,0.07)", borderRadius: 10 }} />
      </div>
    </div>
  );
}

// ── No deals ──────────────────────────────────────────────────────────────────
function NoDeals() {
  return (
    <div className="no-deals">
      <div className="no-deals-icon">🏖️</div>
      <h2 className="no-deals-title">No Price Drops Right Now</h2>
      <p className="no-deals-text">
        Deals come and go quickly — check back soon, or browse live availability directly.<br />
        If you have specific dates in mind, reach out to Ozan. He may be able to work something out.
      </p>
      <div className="no-deals-btns">
        <a className="btn-main" href="https://www.destincondogetaways.com">Check Availability</a>
        <a className="btn-inquiry" href="mailto:ozan@destincondogetaways.com?subject=Inquiry%20for%20specific%20dates&body=Hi%20Ozan%2C%20I%20am%20interested%20in%20booking%20for%20the%20following%20dates%3A%0A%0AUnit%3A%0AArrival%3A%0ADeparture%3A%0AGuests%3A%0A%0AThank%20you!">
          Message Ozan
        </a>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BeachDeals({ deals }) {
  const schemas    = buildSchema(deals);
  const hasDeals   = deals && deals.length > 0;
  const [visible, setVisible] = useState(10);

  return (
    <>
      <Head>
        <title>Pelican Beach Resort Condos — Destin Beach Florida Price Drops</title>
        <meta name="description" content="Live price drops on beachfront condos at Pelican Beach Resort, Destin Beach Florida. Book Unit 707 or Unit 1006 direct — no OTA fees, instant confirmation, owner direct." />
        <meta property="og:title" content="Featured Beach Deals — Destin Condo Getaways" />
        <meta property="og:description" content="Beachfront condo price drops in Destin, FL. Book direct and save up to 10% instantly." />
        <meta property="og:image" content={IMAGES["707"][0].src} />
        <meta property="og:url" content="https://deals.destincondogetaways.com/beach-deals" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://deals.destincondogetaways.com/beach-deals" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet" />
        <meta name="msvalidate.01" content="179AF5BF43378717C4812675F6233C2B" />
        {/* GTM only — GA4 fired via GTM, no direct gtag to avoid double counting */}
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PQSF8S6D');` }} />
        {schemas.map((schema, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        ))}
      </Head>

      {/* Background */}
      <div className="bg-wrap">
        <img src="https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-MediumOriginal" alt="" aria-hidden="true" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", filter: "brightness(0.35) saturate(0.8)" }} />
        <div className="bg-overlay" />
      </div>

      <main className="page">

        {/* Header */}
        <header className="header">
          <div className="logo-wrap"><img src="/logo.png" alt="Destin Condo Getaways" /></div>
          <div className="live-badge"><span className="live-dot" />Featured Beach Deals</div>
          <h1><span className="line1">Destin Beachfront</span><span className="line2">Price Drops</span></h1>
          <p className="subtitle">Featured open dates with recent pricing drops — <span>final rates confirmed at checkout.</span></p>
        </header>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat"><div className="stat-num">400+</div><div className="stat-label">Five-Star Stays</div></div>
          <div className="stat-divider" />
          <div className="stat"><div className="stat-num">2</div><div className="stat-label">Beachfront Units</div></div>
          <div className="stat-divider" />
          <div className="stat"><div className="stat-num">10%</div><div className="stat-label">Direct Booking Savings</div></div>
        </div>

        <div className="section-label">Current Featured Drops</div>

        {/* SEO intro — visible text for Google */}
        <div className="seo-intro">
          <p>These are real-time price drops on our two <strong>beachfront condos at Pelican Beach Resort, Destin FL</strong> — Unit 707 (7th floor, Classic Coastal) and Unit 1006 (10th floor, Fresh Coastal). Both <strong>Pelican Beach Resort condos</strong> sleep up to 6 guests with 1 bedroom, 2 bathrooms, a private Gulf-view balcony, and full kitchen. Minutes from Destin HarborWalk Village, Big Kahuna&apos;s Water Park, and Henderson Beach State Park. When you book direct through <a href="https://www.destincondogetaways.com" style={{color:"var(--teal)"}}>destincondogetaways.com</a>, you skip the 14–20% platform fees charged by Airbnb and VRBO. Prices are tracked daily — drops are calculated against the highest recently recorded rate for each date window.</p>
        </div>

        {/* Deals or no deals */}
        {hasDeals ? (
          <>
            <div className="deals-grid">
              {deals.slice(0, visible).map((deal, i) => <DealCard key={`${deal.unit}-${deal.arrival}`} deal={deal} index={i} />)}
            </div>
            {visible < deals.length && (
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <button
                  onClick={() => setVisible(v => v + 10)}
                  className="btn-load-more"
                >
                  Show More Deals ↓
                </button>
              </div>
            )}
          </>
        ) : (
          <NoDeals />
        )}

        {/* Email capture */}
        {hasDeals && <EmailCapture />}

        {/* Bottom CTA */}
        {hasDeals && (
          <div className="bottom-cta">
            <div className="bottom-cta-left">
              <img src="/logo.png" alt="Destin Condo Getaways" />
              <div className="bottom-cta-text">
                <strong>Don&apos;t See Your Dates?</strong>
                <span>These aren&apos;t the only deals — check live availability for all open dates</span>
              </div>
            </div>
            <a className="btn-main" href="https://www.destincondogetaways.com">destincondogetaways.com</a>
          </div>
        )}

        {/* Fine print */}
        <div className="fine-print">
          <div className="fine-print-row">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Rates shown before fees &amp; taxes. Availability and pricing can change. Booking links default to 2 adults — guests are responsible for updating guest count at checkout. Adding persons after booking may be subject to fees.
          </div>
          <div className="fine-print-row">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Check-in 4 PM / Check-out 10 AM (CST) &nbsp;·&nbsp; Free parking &nbsp;·&nbsp; Paid EV chargers &nbsp;·&nbsp; No smoking &nbsp;·&nbsp; No pets &nbsp;·&nbsp; Min. age 25 (waived if married)
          </div>
          <div className="fine-print-row">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            20% non-refundable deposit due upon booking. Balance due 30 days before check-in. Cancellations within 30 days of check-in are non-refundable. Travel insurance offered at checkout.
          </div>
          <div className="fine-print-row">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Price drop percentages are calculated against the highest recently recorded price for those dates in our pricing system. Final rates confirmed at checkout.
          </div>
        </div>

        {/* Visible FAQ for SEO */}
        <div className="seo-faq">
          <h2 className="seo-faq-title">Frequently Asked Questions</h2>
          <div className="seo-faq-item"><h3>How are price drops calculated?</h3><p>Drop percentages are calculated against the highest recently recorded price for those dates in our pricing system. Prices update daily based on live market data.</p></div>
          <div className="seo-faq-item"><h3>Do I need a promo code to get the discount?</h3><p>No promo code needed. A 10% direct booking discount is automatically applied when you book through destincondogetaways.com. Use code BLUE for an additional 5% off.</p></div>
          <div className="seo-faq-item"><h3>Are these direct booking prices?</h3><p>Yes — all prices are direct booking rates with no OTA platform fees. Guests who book direct save $200–$400 compared to booking the same unit through Airbnb or VRBO.</p></div>
          <div className="seo-faq-item"><h3>Where are the condos located?</h3><p>Both Unit 707 and Unit 1006 are at Pelican Beach Resort, 1002 US-98 East, Destin FL 32541 — directly on the Gulf of Mexico. The resort features three pools, hot tubs, a beachside Tiki bar, tennis courts, and free parking with EV chargers.</p></div>
          <div className="seo-faq-item"><h3>What is the cancellation policy?</h3><p>A 20% non-refundable deposit is due upon booking. Balance due 30 days before check-in. Cancellations within 30 days of check-in are non-refundable. Travel insurance offered at checkout.</p></div>
          <div className="seo-faq-item"><h3>How often do deals update?</h3><p>Deals refresh every 10 minutes based on live pricing data, scanning the next 180 days across 3, 4, and 5-night stay windows.</p></div>
        </div>

        {/* About section */}
        <div className="seo-about">
          <h2>Pelican Beach Resort Condos in Destin, FL — Book Direct &amp; Save</h2>
          <p>Destin Condo Getaways offers two fully renovated <strong>beachfront condos at Pelican Beach Resort</strong> on the Emerald Coast of Florida. With over 400 five-star stays and 1,000+ guests hosted, we are one of the highest-rated direct-booking <strong>Destin beach Florida</strong> vacation rentals. Unit 707 on the 7th floor offers an intimate beach feel with unobstructed Gulf views, while Unit 1006 on the 10th floor provides panoramic views of the emerald green Gulf of Mexico. Both <strong>Pelican Beach Resort condos</strong> feature a private balcony, full kitchen, Smart TV, high-speed WiFi, and two beach chairs, umbrella and cooler waiting on arrival.</p>
          <p>Pelican Beach Resort sits at 1002 US Highway 98, <strong>Destin Beach Florida</strong> 32541 — steps from the sugar-white sand beaches the Emerald Coast is famous for. The resort offers three pools including an indoor heated pool open year-round, two hot tubs, a fitness center, tennis and pickleball courts, and a beachside Tiki bar. No road to cross — just take the elevator straight to the beach.</p>
          <p>Minutes from Destin HarborWalk Village, Big Kahuna&apos;s Water Park, and the best seafood restaurants on the Gulf Coast. Henderson Beach State Park is a short drive away. The location puts you at the center of everything Destin has to offer while keeping you steps from the private beach.</p>
          <div className="host-profile">
            <div className="host-avatar">OC</div>
            <div className="host-info">
              <strong>Ozan Cili — Owner &amp; Host</strong>
              <p>I have been hosting guests at Pelican Beach Resort for several years and personally manage both units. I respond directly to all inquiries — no call centers, no middlemen. My goal is simple: give every guest the best possible Destin experience at the best direct price. Have questions before you book? <a href="https://www.destincondogetaways.com/ai-concierge-574036277" style={{color:"var(--teal)"}}>Destiny Blue</a>, our AI concierge, is available 24/7 on every page.</p>
            </div>
          </div>
        </div>

        {/* Plan Your Trip links */}
        <div className="plan-trip">
          <div className="plan-trip-title">Plan Your Destin Trip</div>
          <div className="plan-trip-links">
            <a href="https://www.destincondogetaways.com/blog/best-beaches-destin" className="plan-trip-pill">🏖️ Best Beaches</a>
            <a href="https://www.destincondogetaways.com/blog/destinweather" className="plan-trip-pill">🌤️ Weather Guide</a>
            <a href="https://www.destincondogetaways.com/blog/destinairport" className="plan-trip-pill">✈️ Which Airport</a>
            <a href="https://www.destincondogetaways.com/blog/how-to-find-cheaper-flights-and-car-rentals" className="plan-trip-pill">🚗 Flights & Car Rentals</a>
            <a href="https://www.destincondogetaways.com/blog/destin-fireworks-2026" className="plan-trip-pill">🎆 Fireworks 2026</a>
            <a href="https://www.destincondogetaways.com/blog/destin-events-2026" className="plan-trip-pill">📅 Events 2026</a>
          </div>
        </div>

      </main>

      <style jsx global>{`
        :root { --green:#39ff14; --green-dark:#2bcc0f; --teal:#00d4c8; --navy:#020b18; --card-bg:rgba(2,18,40,0.82); --card-border:rgba(0,212,200,0.35); --white:#ffffff; --gold:#ffd166; --strike:#ff6b6b; }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Barlow',sans-serif; background:var(--navy); color:var(--white); min-height:100vh; overflow-x:hidden; }
        .bg-wrap { position:fixed; inset:0; z-index:0; }
        .bg-overlay { position:absolute; inset:0; background:linear-gradient(to bottom,rgba(2,11,24,0.55) 0%,rgba(2,11,24,0.3) 40%,rgba(2,11,24,0.75) 100%); }
        .page { position:relative; z-index:1; max-width:960px; margin:0 auto; padding:32px 20px 60px; overflow:visible; }
        .header { text-align:center; margin-bottom:32px; animation:fadeDown 0.6s ease both; }
        .logo-wrap { margin-bottom:16px; }
        .logo-wrap img { height:56px; filter:drop-shadow(0 0 12px rgba(0,212,200,0.5)); }
        .live-badge { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,#0a3d6b,#0d5c8a); border:1.5px solid var(--teal); border-radius:30px; padding:6px 18px; font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--white); margin-bottom:14px; box-shadow:0 0 20px rgba(0,212,200,0.3); }
        .live-dot { width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 8px var(--green); animation:pulse 1.5s ease-in-out infinite; display:inline-block; }
        h1 { font-family:'Barlow Condensed',sans-serif; font-size:clamp(48px,8vw,80px); font-weight:900; line-height:0.95; text-transform:uppercase; letter-spacing:-1px; }
        .line1 { color:var(--white); display:block; }
        .line2 { display:block; background:linear-gradient(90deg,var(--teal),#7fffff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .subtitle { margin-top:14px; font-size:15px; color:rgba(255,255,255,0.72); max-width:480px; margin-left:auto; margin-right:auto; line-height:1.5; }
        .subtitle span { color:var(--gold); font-weight:600; }
        .stats-bar { display:flex; justify-content:center; gap:32px; margin:24px 0 36px; animation:fadeUp 0.6s 0.2s ease both; }
        .stat { text-align:center; }
        .stat-num { font-family:'Barlow Condensed',sans-serif; font-size:28px; font-weight:800; color:var(--teal); line-height:1; }
        .stat-label { font-size:11px; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
        .stat-divider { width:1px; background:rgba(255,255,255,0.15); align-self:stretch; }
        .section-label { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:rgba(255,255,255,0.4); text-align:center; margin-bottom:20px; }
        .deals-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; overflow:visible; }
        .deal-card { background:var(--card-bg); border:1.5px solid var(--card-border); border-radius:16px; backdrop-filter:blur(12px); box-shadow:0 8px 32px rgba(0,0,0,0.5); transition:transform 0.25s ease,box-shadow 0.25s ease,border-color 0.25s ease; animation:fadeUp 0.5s ease both; position:relative; }
        .deal-card .card-photo-wrap { overflow:hidden; border-radius:16px 16px 0 0; }
        .deal-card:hover { transform:translateY(-12px) scale(1.06) !important; box-shadow:0 32px 80px rgba(0,0,0,0.9),0 0 48px rgba(0,212,200,0.5) !important; border-color:rgba(0,212,200,1) !important; z-index:10 !important; }
        .drop-badge { position:absolute; top:12px; right:12px; background:var(--green); color:#000; font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:900; line-height:1; padding:6px 10px; border-radius:10px; box-shadow:0 0 16px rgba(57,255,20,0.6); z-index:2; }
        .unit-overlay { position:absolute; bottom:12px; left:14px; z-index:2; }
        .unit-name { font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:800; color:var(--white); text-transform:uppercase; letter-spacing:0.5px; text-shadow:0 1px 6px rgba(0,0,0,0.8); }
        .unit-sub { font-size:11px; color:var(--teal); font-weight:600; letter-spacing:1px; text-transform:uppercase; margin-top:1px; }
        .card-body { padding:12px 16px 18px; }
        .dates-row { display:flex; align-items:center; gap:6px; margin-bottom:12px; font-size:13px; color:rgba(255,255,255,0.65); }
        .price-row { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .price-was { font-size:16px; color:var(--strike); text-decoration:line-through; font-weight:500; opacity:0.8; }
        .price-arrow { color:rgba(255,255,255,0.4); font-size:14px; }
        .price-now { font-family:'Barlow Condensed',sans-serif; font-size:30px; font-weight:800; color:var(--white); line-height:1; }
        .price-now sup { font-size:14px; font-weight:600; vertical-align:super; margin-right:1px; }
        .price-night { font-size:12px; color:rgba(255,255,255,0.45); margin-left:2px; font-weight:400; }
        .btn-book { display:block; width:100%; padding:12px; background:linear-gradient(135deg,#00c4b4,#00a89a); color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; text-align:center; text-decoration:none; border-radius:10px; box-shadow:0 4px 16px rgba(0,196,180,0.35); transition:background 0.2s,transform 0.15s; }
        .btn-book:hover { background:linear-gradient(135deg,#00d4c8,#00b8aa); transform:translateY(-1px); }
        .bottom-cta { margin-top:36px; background:rgba(255,255,255,0.06); border:1.5px solid rgba(0,212,200,0.3); border-radius:18px; padding:24px 32px; display:flex; align-items:center; justify-content:space-between; gap:20px; backdrop-filter:blur(8px); animation:fadeUp 0.6s 0.4s ease both; }
        .bottom-cta-left { display:flex; align-items:center; gap:16px; }
        .bottom-cta-left img { height:48px; filter:drop-shadow(0 0 8px rgba(0,212,200,0.4)); }
        .bottom-cta-text strong { display:block; font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:800; text-transform:uppercase; }
        .bottom-cta-text span { font-size:13px; color:rgba(255,255,255,0.55); }
        .btn-main { display:inline-flex; align-items:center; background:linear-gradient(135deg,var(--green),var(--green-dark)); color:#000; font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:800; letter-spacing:1px; text-transform:uppercase; text-decoration:none; padding:14px 28px; border-radius:12px; white-space:nowrap; box-shadow:0 4px 20px rgba(57,255,20,0.4); transition:transform 0.15s,box-shadow 0.2s; }
        .btn-main:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(57,255,20,0.55); }
        .btn-load-more { background: transparent; border: 1.5px solid var(--teal); color: var(--teal); font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:12px 36px; border-radius:10px; cursor:pointer; transition:background 0.2s,transform 0.15s; }
        .btn-load-more:hover { background:rgba(0,212,200,0.1); transform:translateY(-1px); }
        .seo-intro { margin-bottom:24px; padding:16px 20px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; font-size:14px; color:rgba(255,255,255,0.55); line-height:1.7; }
        .seo-intro strong { color:rgba(255,255,255,0.8); }
        .seo-faq { margin-top:48px; border-top:1px solid rgba(255,255,255,0.08); padding-top:36px; }
        .seo-faq-title { font-family:'Barlow Condensed',sans-serif; font-size:28px; font-weight:800; text-transform:uppercase; color:var(--white); margin-bottom:24px; }
        .seo-faq-item { margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.06); }
        .seo-faq-item:last-child { border-bottom:none; }
        .seo-faq-item h3 { font-size:15px; font-weight:600; color:var(--teal); margin-bottom:8px; }
        .seo-faq-item p { font-size:14px; color:rgba(255,255,255,0.55); line-height:1.7; }
        .seo-about { margin-top:48px; padding:28px 24px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; }
        .seo-about h2 { font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:800; text-transform:uppercase; color:var(--white); margin-bottom:16px; line-height:1.2; }
        .seo-about p { font-size:14px; color:rgba(255,255,255,0.55); line-height:1.7; margin-bottom:12px; }
        .seo-about p:last-child { margin-bottom:0; }
        .host-profile { display:flex; align-items:flex-start; gap:16px; margin-top:20px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.08); }
        .host-avatar { width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,var(--teal),#0a6e60); display:flex; align-items:center; justify-content:center; font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:800; color:#fff; flex-shrink:0; }
        .host-info strong { display:block; font-size:14px; font-weight:700; color:rgba(255,255,255,0.85); margin-bottom:6px; }
        .host-info p { font-size:13px; color:rgba(255,255,255,0.5); line-height:1.6; margin:0; }
        .no-deals { text-align:center; padding:60px 20px; animation:fadeUp 0.5s ease both; }
        .no-deals-icon { font-size:48px; margin-bottom:16px; }
        .no-deals-title { font-family:'Barlow Condensed',sans-serif; font-size:32px; font-weight:800; text-transform:uppercase; margin-bottom:12px; color:var(--white); }
        .no-deals-text { font-size:15px; color:rgba(255,255,255,0.6); line-height:1.6; max-width:440px; margin:0 auto 28px; }
        .no-deals-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .btn-inquiry { display:inline-flex; align-items:center; background:transparent; color:var(--teal); font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:800; letter-spacing:1px; text-transform:uppercase; text-decoration:none; padding:14px 28px; border-radius:12px; border:1.5px solid var(--teal); transition:transform 0.15s,box-shadow 0.2s,background 0.2s; }
        .btn-inquiry:hover { background:rgba(0,212,200,0.1); transform:translateY(-2px); }
        .fine-print { margin-top:24px; display:flex; flex-direction:column; gap:8px; padding:16px 20px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; }
        .fine-print-row { display:flex; align-items:flex-start; gap:8px; font-size:11px; color:rgba(255,255,255,0.35); line-height:1.5; }
        .fine-print-row svg { flex-shrink:0; margin-top:2px; opacity:0.5; }
        @keyframes shimmer { 0%,100%{opacity:0.5}50%{opacity:1} }
        @media (max-width:600px) {
          .deals-grid { grid-template-columns:1fr 1fr; gap:10px; }
          .stats-bar { gap:20px; }
          .unit-name { font-size:15px; }
          .unit-sub { font-size:9px; }
          .dates-row { font-size:11px; }
          .price-was { font-size:13px; }
          .price-now { font-size:22px; }
          .drop-badge { font-size:17px; padding:4px 8px; top:8px; right:8px; }
          .btn-book { font-size:12px; padding:10px; letter-spacing:0.5px; }
          .bottom-cta { flex-direction:column; text-align:center; padding:20px; }
        }
        .plan-trip { margin-top:48px; text-align:center; }
        .plan-trip-title { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:rgba(255,255,255,0.35); margin-bottom:16px; }
        .plan-trip-links { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; }
        .plan-trip-pill { display:inline-block; padding:8px 16px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:30px; font-size:13px; color:rgba(255,255,255,0.55); text-decoration:none; transition:background 0.2s,border-color 0.2s,color 0.2s; }
        .plan-trip-pill:hover { background:rgba(0,212,200,0.1); border-color:rgba(0,212,200,0.4); color:var(--teal); }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse    { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)} }
        .email-capture { margin-top:32px; background:linear-gradient(135deg,rgba(0,212,200,0.08),rgba(0,212,200,0.03)); border:1.5px solid rgba(0,212,200,0.3); border-radius:18px; padding:28px 32px; animation:fadeUp 0.6s 0.3s ease both; }
        .email-capture-inner { display:flex; align-items:center; justify-content:space-between; gap:24px; flex-wrap:wrap; }
        .email-capture-eyebrow { font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--teal); margin-bottom:6px; }
        .email-capture-text strong { display:block; font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:800; text-transform:uppercase; color:var(--white); margin-bottom:4px; }
        .email-capture-text p { font-size:13px; color:rgba(255,255,255,0.5); line-height:1.5; margin:0; }
        .email-capture-form { display:flex; gap:10px; flex-wrap:wrap; }
        .email-input { background:rgba(255,255,255,0.07); border:1.5px solid rgba(255,255,255,0.15); border-radius:10px; padding:12px 16px; font-size:14px; color:var(--white); outline:none; min-width:240px; transition:border-color 0.2s; }
        .email-input::placeholder { color:rgba(255,255,255,0.35); }
        .email-input:focus { border-color:var(--teal); }
        .email-btn { background:linear-gradient(135deg,#ff8c00,#e8341a); color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:12px 24px; border-radius:10px; border:none; cursor:pointer; white-space:nowrap; box-shadow:0 4px 20px rgba(255,140,0,0.5); transition:transform 0.15s,box-shadow 0.2s; }
        .email-btn:hover { transform:translateY(-1px); box-shadow:0 6px 28px rgba(255,140,0,0.7); }
        .email-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .email-capture-success { display:flex; align-items:center; gap:16px; }
        .email-capture-success strong { display:block; font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:800; text-transform:uppercase; color:var(--white); }
        .email-capture-success p { font-size:13px; color:rgba(255,255,255,0.55); margin:4px 0 0; }
        @media (max-width:600px) { .email-capture{padding:20px 16px;} .email-input{min-width:100%;} .email-capture-form{width:100%;} .email-btn{width:100%;} }
      `}</style>
    </>
  );
}
