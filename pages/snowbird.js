import { useState, useEffect } from "react";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";

const CANONICAL = "https://sunbirds.destincondogetaways.com";

const UNIT_META = {
  "707":  { name: "Unit 707",  sub: "Classic Coastal · 7th Floor",  slug: "pelican-beach-resort-unit-707-orp5b47b5ax",  fullName: "Pelican Beach Resort Unit 707 — Classic Coastal" },
  "1006": { name: "Unit 1006", sub: "Fresh Coastal · 10th Floor",   slug: "pelican-beach-resort-unit-1006-orp5b6450ex", fullName: "Pelican Beach Resort Unit 1006 — Fresh Coastal" },
};

function bookingUrl(unit, arrival, departure, adults, children) {
  const base  = `https://www.destincondogetaways.com/${UNIT_META[unit].slug}`;
  const total = adults + children;
  return `${base}?or_arrival=${arrival}&or_departure=${departure}&or_adults=${adults}&or_children=${children}&or_guests=${total}`;
}

function fmt(d)        { return d.toISOString().split("T")[0]; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function pad(n)        { return String(n).padStart(2, "0"); }
function friendly(iso) { return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function friendlyFull(iso) { return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }

function isSnowbirdDiscount(year, month, nights) {
  if (nights < 28) return false;
  return (year === 2026 && (month === 11 || month === 12)) || (year === 2027 && (month === 1 || month === 2));
}

function getDiscountPct(unit, year, month, nights) {
  if (!isSnowbirdDiscount(year, month, nights)) return 0.125;
  return unit === "707" ? 0.50 : 0.40;
}

function calcFees(nightlyAvg, nights, year, month, adults, children, unit) {
  const adjustedAvg = Math.round((nightlyAvg * 0.875) + 25);
  const rent      = adjustedAvg * nights;
  const discPct   = getDiscountPct(unit, year, month, nights);
  const discount  = Math.round(rent * discPct);
  const extraG    = Math.max(0, (adults + children) - 4);
  const extraFee  = extraG * 20 * nights;
  const rentAfter = rent - discount + extraFee;
  const cleaning  = 175;
  const tax       = Math.round((rentAfter + cleaning) * 0.13);
  const admin     = Math.round((rentAfter + cleaning + tax) * 0.03);
  const total     = rentAfter + cleaning + tax + admin;
  return { rent, adjustedAvg, discPct, discount, extraFee, rentAfter, cleaning, tax, admin, total };
}

function buildSchema() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Snowbird Rentals Destin FL — Monthly Winter Condo Stays at Pelican Beach Resort",
    "description": "Find monthly winter rental rates for beachfront condos in Destin, Florida. Pelican Beach Resort Unit 707 and Unit 1006 — snowbird stays Nov–Feb with up to 50% off rent when booked direct.",
    "url": CANONICAL,
    "isPartOf": { "@type": "WebSite", "name": "Destin Condo Getaways", "url": "https://www.destincondogetaways.com" },
    "about": { "@type": "Place", "name": "Destin, Florida", "address": { "@type": "PostalAddress", "addressLocality": "Destin", "addressRegion": "FL", "addressCountry": "US" } }
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Destin Florida Vacation Rentals", "item": "https://www.destincondogetaways.com" },
      { "@type": "ListItem", "position": 2, "name": "Pelican Beach Resort Condos", "item": "https://www.destincondogetaways.com/pelican-beach-resort-destin-574048693" },
      { "@type": "ListItem", "position": 3, "name": "Snowbird Rentals Destin FL — Monthly Winter Stays", "item": CANONICAL }
    ]
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "What is the snowbird discount at Pelican Beach Resort?", "acceptedAnswer": { "@type": "Answer", "text": "Guests who book 28 or more nights directly through destincondogetaways.com for stays arriving November 1, 2026 through February 28, 2027 receive 50% off rent automatically. No promo code needed." } },
      { "@type": "Question", "name": "What is the minimum stay for snowbird rates?", "acceptedAnswer": { "@type": "Answer", "text": "The snowbird discount requires a minimum of 28 nights. Full month stays (check-in on the 1st, check-out on the 1st of the following month) automatically qualify." } },
      { "@type": "Question", "name": "Which months qualify for the snowbird discount?", "acceptedAnswer": { "@type": "Answer", "text": "Arrivals from November 1, 2026 through February 28, 2027 qualify for the 50% off rent snowbird discount when booked direct for 28+ nights." } },
      { "@type": "Question", "name": "Where are the snowbird condos located?", "acceptedAnswer": { "@type": "Answer", "text": "Both units are at Pelican Beach Resort, 1002 US-98 East, Destin FL 32541 — directly on the Gulf of Mexico. No road to cross. Step off the elevator straight onto the beach." } },
      { "@type": "Question", "name": "What is included in a monthly snowbird stay?", "acceptedAnswer": { "@type": "Answer", "text": "Full kitchen, high-speed WiFi, 2 Smart TVs, private Gulf-view balcony, 2 bathrooms, beach chairs, umbrella and cooler on arrival. Resort amenities include 3 pools (1 indoor heated), 2 hot tubs, fitness center, tennis and pickleball courts, sauna, steam room, and beachside Tiki bar." } },
      { "@type": "Question", "name": "How do I book a monthly snowbird stay?", "acceptedAnswer": { "@type": "Answer", "text": "Use the rate finder above to select your month and number of nights, then click the booking link to complete your reservation directly at destincondogetaways.com. The 50% discount is applied automatically at checkout for qualifying stays." } }
    ]
  };

  const lodging = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": "Destin Condo Getaways — Pelican Beach Resort",
    "description": "Beachfront snowbird condo rentals at Pelican Beach Resort, Destin FL. Monthly winter rates with up to 50% off rent for stays of 28+ nights booked direct.",
    "url": "https://www.destincondogetaways.com",
    "telephone": "+19723574262",
    "address": { "@type": "PostalAddress", "streetAddress": "1002 US-98 East", "addressLocality": "Destin", "addressRegion": "FL", "postalCode": "32541", "addressCountry": "US" },
    "geo": { "@type": "GeoCoordinates", "latitude": 30.3865467, "longitude": -86.4733424 },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": 4.94, "reviewCount": 400, "bestRating": 5, "worstRating": 1 },
    "priceRange": "$$",
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "Beachfront", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Gulf View", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Full Kitchen", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Free Parking", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Pool", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Hot Tub", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Free WiFi", "value": true }
    ]
  };

  return [itemList, breadcrumb, faq, lodging];
}

// ── ISR — runs at build time + revalidates every 10 mins ─────────────────────
export async function getStaticProps() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
      process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
    );

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const startDate = fmt(addDays(today, 1));
    const endDate   = fmt(addDays(today, 365));

    // First get the latest captured_date
    const { data: latestRow } = await supabase
      .from("price_snapshots")
      .select("captured_date")
      .order("captured_date", { ascending: false })
      .limit(1)
      .single();

    const latestCaptured = latestRow?.captured_date || fmt(today);

    const { data: snapshots, error } = await supabase
      .from("price_snapshots")
      .select("unit_id, date, price, demand_desc, captured_date")
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("captured_date", latestCaptured)
      .limit(20000);

    if (error || !snapshots?.length) return { props: { dayData: {} }, revalidate: 600 };

    const dayData = { "707": {}, "1006": {} };
    for (const row of snapshots) {
      if (dayData[row.unit_id] !== undefined) {
        dayData[row.unit_id][row.date] = { price: row.price, demand_desc: row.demand_desc };
      }
    }

    return { props: { dayData }, revalidate: 600 };
  } catch (e) {
    console.error("[snowbird getStaticProps]", e.message);
    return { props: { dayData: {} }, revalidate: 600 };
  }
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ result, adults, children, year, month, nights, isSnowbird }) {
  const [expanded, setExpanded] = useState(true);
  const fees = calcFees(result.avg, nights, year, month, adults, children, result.unit);
  const url  = bookingUrl(result.unit, result.arrival, result.departure, adults, children);
  const meta = UNIT_META[result.unit];
  const isDisc = isSnowbirdDiscount(year, month, nights);
  const discPct = getDiscountPct(result.unit, year, month, nights);
  const discLabel = isDisc ? `❄️ Snowbird discount (${Math.round(discPct * 100)}%)` : "Direct booking discount (12.5%)";

  return (
    <div style={{ background: "rgba(2,18,40,.9)", border: `2px solid ${isDisc ? "#47e2d0" : "rgba(71,226,208,.35)"}`, borderRadius: 20, overflow: "hidden", marginBottom: 12 }}>
      <div
        style={{ background: "rgba(71,226,208,.1)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#47e2d0" }}>
            {isDisc ? "❄️ Snowbird rate" : "Best rate"}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginLeft: 10 }}>{meta.sub}</span>
        </div>
        {isDisc && <span style={{ background: "#47e2d0", color: "#020b18", fontSize: 10, fontWeight: 900, padding: "3px 10px", borderRadius: 6 }}>{Math.round(discPct * 100)}% OFF</span>}
      </div>
      {expanded && (
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#f7fbff", margin: 0 }}>{meta.name} — {isSnowbird ? "Full month" : `${nights} nights`}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.45)", margin: "3px 0 0" }}>{friendly(result.arrival)} – {friendly(result.departure)} · {adults + children} guest{(adults + children) > 1 ? "s" : ""}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 26, fontWeight: 900, color: "#ffd166", margin: 0, lineHeight: 1 }}>${fees.adjustedAvg}</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,.4)", margin: "2px 0 0" }}>/night avg</p>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 12 }}>
            {[
              [`Rent (${nights} × $${fees.adjustedAvg})`, `$${fees.rent}`, false],
              [discLabel, `-$${fees.discount}`, true],
              ...(fees.extraFee > 0 ? [[`Extra guest fee`, `$${fees.extraFee}`, false]] : []),
              ["Cleaning fee", `$${fees.cleaning}`, false],
              ["Tax (13%)", `$${fees.tax}`, false],
              ["Admin (3%)", `$${fees.admin}`, false],
            ].map(([label, val, isGreen], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{label}</span>
                <span style={{ fontSize: 12, color: isGreen ? "#47e2d0" : "#f7fbff" }}>{val}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.1)", marginTop: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f7fbff" }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#ffd166" }}>${fees.total}</span>
            </div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener"
            style={{ display: "block", width: "100%", marginTop: 14, padding: 14, textAlign: "center", background: isDisc ? "#47e2d0" : "#ffd166", color: "#020b18", fontSize: 14, fontWeight: 900, borderRadius: 12, textDecoration: "none", letterSpacing: ".03em" }}
          >
            Book direct — save on fees →
          </a>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,.3)", textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
            Rates are estimates — final total confirmed at checkout.{" "}
            <a href="https://www.destincondogetaways.com/-pelican-beach-resort-condo-rental-574046950" target="_blank" rel="noopener" style={{ color: "rgba(255,255,255,.3)" }}>Booking terms apply.</a>
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Snowbird({ dayData }) {
  const schemas = buildSchema();

  const now         = new Date();
  const curYear     = now.getFullYear();
  const curMonth    = now.getMonth() + 1;

  const [year,       setYear]       = useState(curYear);
  const [month,      setMonth]      = useState(null);
  const [nights,     setNights]     = useState(null);
  const [isSnowbird, setIsSnowbird] = useState(false);
  const [adults,     setAdults]     = useState(2);
  const [children,   setChildren]   = useState(0);
  const [results,    setResults]    = useState(null);
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec"];
  const NIGHTS_OPTIONS = [7, 14, 21];

  function isPastMonth(m) {
    return year < curYear || (year === curYear && m < curMonth);
  }

  function handleSnowbird() {
    setIsSnowbird(true);
    setNights(month ? new Date(year, month, 0).getDate() : 30);
  }

  function handleNights(n) {
    setIsSnowbird(false);
    setNights(n);
  }

  function handleMonth(m) {
    if (isPastMonth(m)) return;
    setMonth(m);
    if (isSnowbird) setNights(new Date(year, m, 0).getDate());
  }

  function findRates() {
    setError(null);
    setResults(null);
    if (!month) { setError("Please select a month."); return; }
    if (!nights) { setError("Please select how long you are staying."); return; }
    if (adults + children > 6) { setError("Max 6 guests per unit due to fire code."); return; }

    setLoading(true);

    const found = [];
    try {
    const yr  = year;
    const mo  = pad(month);
    const lastDay = new Date(yr, month, 0).getDate();


    for (const unit of ["707", "1006"]) {
      const unitData = dayData?.[unit] || {};

      // Build day list for this month
      const monthDays = [];
      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${yr}-${mo}-${pad(d)}`;
        const info = unitData[dateStr];
        if (!info) continue;
        const isBlocked = info.demand_desc && (info.demand_desc.toLowerCase().includes("unavailable") || info.demand_desc.toLowerCase().includes("booked") || info.demand_desc.toLowerCase().includes("reserved"));
        monthDays.push({ date: dateStr, price: info.price, blocked: isBlocked });
      }

      if (monthDays.length === 0) {
            continue;
      }
  
      if (isSnowbird) {
        const arrival   = `${yr}-${mo}-01`;
        const nextMonth = month === 12 ? `${yr + 1}-01-01` : `${yr}-${pad(month + 1)}-01`;
        const hasBlock  = monthDays.some(d => d.blocked);
        if (hasBlock) continue;
        const avg = Math.round(monthDays.reduce((s, d) => s + d.price, 0) / monthDays.length);
        if (avg <= 0) continue;
        found.push({ unit, avg, arrival, departure: nextMonth, nights: lastDay });
      } else {
            let bestWindow = null;
        for (let i = 0; i <= monthDays.length - nights; i++) {
          const winSlice = monthDays.slice(i, i + nights);
          if (winSlice.length < nights) continue;
          if (winSlice.some(d => d.blocked)) continue;
          const avg = Math.round(winSlice.reduce((s, d) => s + d.price, 0) / winSlice.length);
          if (avg <= 0) continue;
          if (!bestWindow || avg < bestWindow.avg) {
            const dep = i + nights >= lastDay
              ? (month === 12 ? `${yr + 1}-01-01` : `${yr}-${pad(month + 1)}-01`)
              : `${yr}-${mo}-${pad(i + nights + 1)}`;
            bestWindow = { unit, avg, arrival: winSlice[0].date, departure: dep, nights };
          }
        }
        if (bestWindow) found.push(bestWindow);
      }
    }

    } catch(e) {
      console.error('[snowbird findRates]', e);
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);

    if (found.length === 0) {
      setError("No availability found for this selection. Try a different month or fewer nights.");
      return;
    }

    found.sort((a, b) => a.avg - b.avg);
    setResults(found);
  }

  const isDisc = month && nights ? isSnowbirdDiscount(year, month, nights) : false;

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <title>Snowbird Rentals Destin FL — Monthly Winter Condo Stays at Pelican Beach Resort</title>
        <meta name="description" content="Find monthly snowbird rental rates for beachfront condos in Destin, Florida. Pelican Beach Resort Unit 707 and Unit 1006 — winter stays Nov–Feb with up to 50% off rent booked direct. No platform fees." />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Snowbird Rentals Destin FL — Monthly Winter Condo Stays" />
        <meta property="og:description" content="Monthly winter rental rates for beachfront condos in Destin FL. Up to 50% off rent for snowbird stays Nov–Feb. Book direct at Pelican Beach Resort." />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://sunbirds.destincondogetaways.com-hero.jpg" />
        <link rel="canonical" href={CANONICAL} />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PQSF8S6D');` }} />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-3SGXCQ4FTC" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3SGXCQ4FTC');` }} />
        {schemas.map((s, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />)}
      </Head>

      {/* Background — helicopter aerial */}
      <div className="bg-wrap">
        <img src="/snowbird-hero.jpg" alt="Aerial view of Pelican Beach Resort Destin Florida" aria-hidden="true" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", filter: "brightness(0.32) saturate(0.9)" }} />
        <div className="bg-overlay" />
      </div>

      {/* Top nav */}
      <header className="deals-topbar">
        <a className="deals-brand" href="https://www.destincondogetaways.com">
          <b>DESTIN</b><span>CONDO GETAWAYS</span>
        </a>
        <nav className="deals-nav">
          <a href="https://explore.destincondogetaways.com/destin-hub">Destin Hub</a>
          <a href="https://explore.destincondogetaways.com/destin-tripshock.html">Activities</a>
          <a href="https://www.destincondogetaways.com/properties">Condos</a>
          <a href="https://deals.destincondogetaways.com/beach-deals">Deals</a>
          <a className="active" href={CANONICAL}>Snowbird</a>
          <a href="https://explore.destincondogetaways.com/destin-car-rental.html">Flights & Cars</a>
        </nav>
        <a className="deals-book" href="https://www.destincondogetaways.com/properties" target="_blank" rel="noopener">🏖️ Book Your Stay</a>
      </header>

      <nav className="deals-mobile-nav">
        <a href="https://explore.destincondogetaways.com/destin-hub">Destin Hub</a>
        <a href="https://explore.destincondogetaways.com/destin-tripshock.html">Activities</a>
        <a href="https://www.destincondogetaways.com/properties">Condos</a>
        <a href="https://deals.destincondogetaways.com/beach-deals">Deals</a>
        <a className="active" href={CANONICAL}>❄️ Snowbird</a>
        <a href="https://explore.destincondogetaways.com/destin-car-rental.html">Flights & Cars</a>
      </nav>

      <main className="page">

        {/* Hero */}
        <header className="hero">
          <div className="hero-inner">
            <div className="eyebrow"><span className="live-dot" /> Pelican Beach Resort · Destin FL</div>
            <h1>Escape winter.<br/><span>Stay a month.</span></h1>
            <p className="hero-copy">Direct beachfront rates · No platform fees · Up to 50% off rent for monthly winter stays</p>
            <div className="hero-actions">
              <a className="hero-btn hero-btn-teal" href="#finder">❄️ Find My Rate</a>
              <a className="hero-btn hero-btn-gold" href="https://www.destincondogetaways.com/properties" target="_blank" rel="noopener">🏖️ View Condos</a>
              <a className="hero-btn hero-btn-glass" href="https://explore.destincondogetaways.com/destin-hub">🌊 Destin Hub</a>
            </div>
            <div className="proof">
              <span>⭐ 400+ Five-Star Stays</span>
              <span>❄️ Up to 50% Off Monthly</span>
              <span>🏖️ Beachfront · No Road</span>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat"><div className="stat-num" style={{fontSize:18}}>Up to 50% off</div><div className="stat-label">Monthly rent</div></div>
          <div className="stat-divider" />
          <div className="stat"><div className="stat-num">28+</div><div className="stat-label">Night minimum</div></div>
          <div className="stat-divider" />
          <div className="stat"><div className="stat-num">Nov–Feb</div><div className="stat-label">Snowbird season</div></div>
        </div>

        {/* SEO intro */}
        <div className="seo-intro">
          <p>These are direct <strong>snowbird rental rates</strong> for our two <strong>beachfront condos at Pelican Beach Resort, Destin FL</strong> — Unit 707 (7th floor, Classic Coastal) and Unit 1006 (10th floor, Fresh Coastal). Both units sleep up to 6 guests with a private Gulf-view balcony, full kitchen, and 2 bathrooms. For stays of 28 nights or more arriving between November 1 and February 28, guests receive <strong>up to 50% off rent automatically</strong> when booked direct through <a href="https://www.destincondogetaways.com" style={{ color: "var(--teal)" }}>destincondogetaways.com</a>. No promo code needed. No platform fees.</p>
        </div>

        {/* Rate finder */}
        <div id="finder" className="section-label">Find Your Winter Rate</div>

        {/* Month selector */}
        <div className="finder-card">
          <div className="finder-section-label">Which year?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
            {[curYear, curYear + 1].map(yr => (
              <button key={yr} onClick={() => { setYear(yr); setMonth(null); }} className={`year-btn${year === yr ? " active" : ""}`}>{yr}</button>
            ))}
          </div>
          <div className="finder-section-label">Which month?</div>
          <div className="month-grid">
            {MONTHS.map((m, i) => {
              const mNum = i + 1;
              const past = isPastMonth(mNum);
              const isSnowbirdMonth = (year === 2026 && (mNum === 11 || mNum === 12)) || (year === 2027 && (mNum === 1 || mNum === 2));
              return (
                <button
                  key={mNum}
                  onClick={() => handleMonth(mNum)}
                  disabled={past}
                  className={`month-pill${month === mNum ? " active" : ""}${past ? " past" : ""}${isSnowbirdMonth && !past ? " snowbird-month" : ""}`}
                >
                  {m}
                  {isSnowbirdMonth && !past && <span className="snow-badge">50%</span>}
                </button>
              );
            })}
          </div>
        </div>

        <p style={{ fontSize: 11, color: "rgba(255,255,255,.35)", margin: "-8px 0 12px", paddingLeft: 4 }}>* Discount varies by unit — up to 50% off. Final discount shown after selecting your dates.</p>

        {/* Nights selector */}
        <div className="finder-card">
          <div className="finder-section-label">How long would you like to stay?</div>
          <div className="nights-grid">
            <button onClick={() => handleNights(7)} className={`night-btn${!isSnowbird && nights === 7 ? " active" : ""}`}>
              <span className="night-num">7</span>
              <span className="night-label">nights</span>
              <span className="night-desc">Short escape</span>
            </button>
            <button onClick={() => handleNights(14)} className={`night-btn${!isSnowbird && nights === 14 ? " active" : ""}`}>
              <span className="night-num">14</span>
              <span className="night-label">nights</span>
              <span className="night-desc">Relax & unwind</span>
            </button>
            <button onClick={() => handleNights(21)} className={`night-btn${!isSnowbird && nights === 21 ? " active" : ""}`}>
              <span className="night-num">21</span>
              <span className="night-label">nights</span>
              <span className="night-desc">Settle in</span>
            </button>
            <button onClick={handleSnowbird} className={`night-btn snowbird-btn${isSnowbird ? " active" : ""}`}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 24, lineHeight: 1 }}>❄️</span>
                <span className="night-num" style={{ fontSize: 18 }}>Full Month</span>
                <span className="night-badge">BEST VALUE · UP TO 50% OFF RENT</span>
                <span className="night-label" style={{ color: "rgba(71,226,208,.7)" }}>Check-in 1st → Check-out 1st</span>
                <span className="night-label" style={{ color: "rgba(71,226,208,.5)" }}>Available Nov–Feb</span>
              </div>
            </button>
          </div>
        </div>

        {/* Guests */}
        <div className="finder-card">
          <div className="finder-section-label">How many guests?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[["Adults", adults, setAdults], ["Children", children, setChildren]].map(([label, val, setter]) => (
              <div key={label}>
                <div className="guest-sub-label">{label}</div>
                <div className="guest-grid">
                  {[0,1,2,3,4,5,6].filter(n => label === "Adults" ? n >= 1 : n >= 0).map(n => (
                    <button key={n} onClick={() => setter(n)} className={`guest-btn${val === n ? " active" : ""}`}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 10 }}>Max 6 guests per unit · fire code</p>
          {adults + children > 6 && <p style={{ fontSize: 12, color: "#ff6b6b", marginTop: 8 }}>⚠️ Total guests exceeds 6. Please adjust.</p>}
        </div>

        <button onClick={findRates} className="find-btn" disabled={loading}>
          {loading ? "Checking rates..." : "Find best rate →"}
        </button>

        {error && <div className="error-msg">{error}</div>}

        {results && results.length > 0 && (
          <div>
            <div className="section-label" style={{ marginTop: 24 }}>
              {isSnowbird ? "❄️ Full month rate" : `Best ${nights}-night window in ${MONTHS[(month || 1) - 1]} ${year}`}
            </div>
            {results.map((r, i) => (
              <ResultCard key={`${r.unit}-${r.arrival}`} result={r} adults={adults} children={children} year={year} month={month} nights={r.nights || nights} isSnowbird={isSnowbird} />
            ))}
          </div>
        )}

        {/* Snowbird vs Sunbird image */}
        <div style={{ marginTop: 32, marginBottom: 32 }}>
          <div className="section-label">Same bird. Better season.</div>
          <img
            src="/snowbird-vs-sunbird.jpg"
            alt="Snowbird vs Sunbird — Escape winter and live your best life in Destin Florida"
            style={{ width: "100%", borderRadius: 16, display: "block" }}
          />
        </div>

        {/* Amenities */}
        <div className="amenities-grid">
          <div className="amenity-item"><div className="amenity-icon">🏖️</div><span className="amenity-text">Beachfront · No road</span></div>
          <div className="amenity-item"><div className="amenity-icon">🌅</div><span className="amenity-text">Gulf-view balcony</span></div>
          <div className="amenity-item"><div className="amenity-icon">🍳</div><span className="amenity-text">Full kitchen</span></div>
          <div className="amenity-item"><div className="amenity-icon">📶</div><span className="amenity-text">High-speed WiFi</span></div>
          <div className="amenity-item"><div className="amenity-icon">🏊</div><span className="amenity-text">3 outdoor · 1 indoor pool</span></div>
          <div className="amenity-item"><div className="amenity-icon">♨️</div><span className="amenity-text">2 hot tubs</span></div>
          <div className="amenity-item"><div className="amenity-icon">💪</div><span className="amenity-text">Fitness · sauna · steam</span></div>
          <div className="amenity-item"><div className="amenity-icon">🎾</div><span className="amenity-text">Tennis & pickleball</span></div>
          <div className="amenity-item"><div className="amenity-icon">🚗</div><span className="amenity-text">Free parking · EV chargers</span></div>
          <div className="amenity-item"><div className="amenity-icon">🐬</div><span className="amenity-text">Dolphins from balcony</span></div>
          <div className="amenity-item"><div className="amenity-icon">🌊</div><span className="amenity-text">Emerald Gulf water</span></div>
          <div className="amenity-item"><div className="amenity-icon">🍹</div><span className="amenity-text">Beachside Tiki bar</span></div>
        </div>

        {/* FAQ */}
        <div className="seo-faq">
          <h2 className="seo-faq-title">Snowbird Rentals Destin FL — FAQ</h2>
          <div className="seo-faq-item"><h3>What is the snowbird discount?</h3><p>Guests who book 28+ nights direct through destincondogetaways.com for stays arriving November 1 through February 28 receive 50% off rent automatically. No promo code needed.</p></div>
          <div className="seo-faq-item"><h3>What months qualify?</h3><p>Arrivals November 1, 2026 through February 28, 2027 with 28 or more nights qualify for the 50% off rent snowbird discount when booked direct.</p></div>
          <div className="seo-faq-item"><h3>What is included?</h3><p>Full kitchen, high-speed WiFi, private balcony with Gulf views, 2 bathrooms, Smart TVs, beach chairs, umbrella and cooler on arrival. Resort amenities include pools, hot tubs, fitness center, sauna, steam room, tennis, pickleball and beachside Tiki bar.</p></div>
          <div className="seo-faq-item"><h3>Where are the condos?</h3><p>Both units are at Pelican Beach Resort, 1002 US-98 East, Destin FL 32541 — directly on the Gulf of Mexico. No road to cross — step off the elevator straight onto the beach.</p></div>
          <div className="seo-faq-item"><h3>How do I book?</h3><p>Use the rate finder above, select your month and nights, then click the booking link to complete your reservation directly at destincondogetaways.com. The 50% discount is applied automatically at checkout for qualifying stays.</p></div>
        </div>

        {/* About */}
        <div className="seo-about">
          <h2>Monthly Snowbird Rentals in Destin FL — Book Direct & Save</h2>
          <p>Destin Condo Getaways offers two fully renovated <strong>beachfront condos at Pelican Beach Resort</strong> on the Emerald Coast of Florida — perfect for snowbirds looking to escape winter with a <strong>monthly rental in Destin, Florida</strong>. With over 400 five-star stays and 1,000+ guests hosted, we are one of the highest-rated direct-booking vacation rentals on Florida's Gulf Coast.</p>
          <p>Pelican Beach Resort sits at the heart of Destin's Emerald Coast at 1002 US Highway 98 — minutes from Destin HarborWalk Village, world-class seafood restaurants, Henderson Beach State Park, and the best fishing in Florida. The resort features three pools including an indoor heated pool open year-round, two hot tubs, a fitness center, sauna, steam room, tennis and pickleball courts, and a beachside Tiki bar.</p>
          <p>For <strong>snowbird winter rentals in Destin FL</strong>, guests booking 28 or more nights between November and February receive 50% off rent automatically when booking direct — no platform fees, no middlemen, direct with the owner.</p>
          <div className="host-profile">
            <div className="host-avatar">OC</div>
            <div className="host-info">
              <strong>Ozan Cili — Owner & Host</strong>
              <p>I have been hosting guests at Pelican Beach Resort for several years and personally manage both units. I respond directly to all inquiries. Have questions? <a href="https://www.destincondogetaways.com/ai-concierge-574036277" style={{ color: "var(--teal)" }}>Destiny Blue</a>, our AI concierge, is available 24/7.</p>
            </div>
          </div>
        </div>

        {/* Plan your trip links */}
        <div className="plan-trip">
          <div className="plan-trip-title">Plan Your Destin Winter Escape</div>
          <div className="plan-trip-links">
            <a href="https://www.destincondogetaways.com/blog/best-beaches-destin" className="plan-trip-pill">🏖️ Best Beaches</a>
            <a href="https://www.destincondogetaways.com/blog/destinweather" className="plan-trip-pill">🌤️ Winter Weather</a>
            <a href="https://www.destincondogetaways.com/blog/destinairport" className="plan-trip-pill">✈️ Which Airport</a>
            <a href="https://explore.destincondogetaways.com/destin-car-rental.html" className="plan-trip-pill">🚗 Car Rentals</a>
            <a href="https://deals.destincondogetaways.com/beach-deals" className="plan-trip-pill">🏷️ Price Drops</a>
            <a href="https://explore.destincondogetaways.com/destin-tripshock.html" className="plan-trip-pill">🎯 Activities</a>
          </div>
        </div>

        {/* Fine print */}
        <div className="fine-print">
          <div className="fine-print-row">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Rates shown before fees & taxes. Availability and pricing can change. Final total confirmed at checkout.
          </div>
          <div className="fine-print-row">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Up to 50% off rent applies for 28+ night stays arriving Nov 1, 2026 – Feb 28, 2027, booked direct via destincondogetaways.com · Check-in 4 PM / Check-out 10 AM · No smoking · No pets · Min. age 25
          </div>
          <div className="fine-print-row">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            20% non-refundable deposit due upon booking. Balance due 30 days before check-in. Cancellations within 30 days are non-refundable. Travel insurance offered at checkout.
          </div>
        </div>

        <div id="floatingHomeTop" className="floating-home-top">
          <a href="https://www.destincondogetaways.com" target="_blank" rel="noopener" aria-label="Home">🏠</a>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">↑</button>
        </div>

      </main>

      <style jsx global>{`
        :root { --green:#39ff14; --teal:#00d4c8; --navy:#020b18; --card-bg:rgba(2,18,40,0.82); --card-border:rgba(0,212,200,0.35); --white:#ffffff; --gold:#ffd166; }
        body { font-family:'Barlow',sans-serif; background:#04101d; color:#f7fbff; }

        .bg-wrap { position:fixed; inset:0; z-index:0; pointer-events:none; }
        .bg-wrap img { width:100%; height:100%; object-fit:cover; object-position:center 35%; filter:brightness(0.32) saturate(0.9); }
        .bg-overlay {
          position:absolute; inset:0;
          background:
            radial-gradient(circle at 50% 18%,rgba(71,226,208,.08),transparent 36%),
            linear-gradient(180deg,rgba(3,12,22,.3),rgba(3,12,22,.82) 58%,rgba(3,12,22,.96)),
            linear-gradient(90deg,rgba(3,12,22,.76) 0%,rgba(3,12,22,.18) 30%,rgba(3,12,22,.18) 70%,rgba(3,12,22,.76) 100%);
        }

        .deals-topbar { width:min(1180px,calc(100% - 44px)); margin:22px auto 24px; display:flex; align-items:center; justify-content:space-between; gap:18px; position:relative; z-index:3; color:white; }
        .deals-brand { line-height:1; text-decoration:none; display:flex; flex-direction:column; gap:2px; white-space:nowrap; }
        .deals-brand b { font-size:23px; letter-spacing:.12em; color:#47e2d0; font-weight:900; }
        .deals-brand span { font-size:11px; letter-spacing:.16em; color:rgba(255,255,255,.72); font-weight:800; }
        .deals-nav { display:flex; gap:24px; align-items:center; font-size:14px; font-weight:800; color:rgba(255,255,255,.86); }
        .deals-nav a { text-decoration:none; color:inherit; white-space:nowrap; position:relative; }
        .deals-nav a.active { color:#47e2d0; }
        .deals-nav a.active::after { content:""; position:absolute; left:0; right:0; bottom:-8px; height:2px; background:#47e2d0; }
        .deals-book { display:inline-flex; align-items:center; gap:8px; border:1px solid rgba(243,170,52,.55); color:#ffd58a; text-decoration:none; border-radius:12px; padding:12px 18px; font-weight:900; background:rgba(243,170,52,.08); white-space:nowrap; }
        .deals-mobile-nav { display:none; position:relative; z-index:3; overflow-x:auto; padding:0 16px 12px; gap:10px; }
        .deals-mobile-nav a { white-space:nowrap; font-size:13px; font-weight:700; color:rgba(255,255,255,.7); text-decoration:none; padding:6px 14px; border-radius:20px; border:1px solid rgba(255,255,255,.15); flex-shrink:0; }
        .deals-mobile-nav a.active { color:#47e2d0; border-color:rgba(71,226,208,.4); background:rgba(71,226,208,.08); }

        .page { max-width:860px; margin:0 auto; padding:0 22px 60px; position:relative; z-index:1; }

        .hero { margin-bottom:28px; }
        .hero-inner { max-width:680px; }
        .eyebrow { font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:#47e2d0; font-weight:800; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
        .live-dot { width:7px; height:7px; border-radius:50%; background:#47e2d0; display:inline-block; }
        .hero h1 { font-family:'Barlow Condensed',sans-serif; font-size:clamp(48px,8vw,80px); font-weight:900; line-height:1; margin-bottom:16px; letter-spacing:-.01em; }
        .hero h1 span { color:#ffd166; }
        .hero-copy { font-size:16px; color:rgba(255,255,255,.65); margin-bottom:22px; max-width:520px; line-height:1.6; }
        .hero-actions { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:22px; }
        .hero-btn { padding:12px 20px; border-radius:12px; font-size:14px; font-weight:800; text-decoration:none; white-space:nowrap; border:1px solid transparent; }
        .hero-btn-teal { background:rgba(71,226,208,.18); color:#47e2d0; border-color:rgba(71,226,208,.45); }
        .hero-btn-gold { background:rgba(255,209,102,.15); color:#ffd166; border-color:rgba(255,209,102,.4); }
        .hero-btn-glass { background:rgba(255,255,255,.08); color:rgba(255,255,255,.8); border-color:rgba(255,255,255,.2); }
        .proof { display:flex; flex-wrap:wrap; gap:16px; font-size:13px; color:rgba(255,255,255,.55); font-weight:600; }

        .stats-bar { display:flex; align-items:center; background:rgba(2,18,40,.7); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:16px 24px; margin-bottom:24px; }
        .stat { flex:1; text-align:center; }
        .stat-num { font-family:'Barlow Condensed',sans-serif; font-size:28px; font-weight:900; color:#ffd166; line-height:1; }
        .stat-label { font-size:11px; color:rgba(255,255,255,.5); margin-top:3px; font-weight:600; letter-spacing:.04em; }
        .stat-divider { width:1px; height:36px; background:rgba(255,255,255,.1); }

        .seo-intro { background:rgba(2,18,40,.6); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:18px 20px; margin-bottom:28px; font-size:14px; color:rgba(255,255,255,.65); line-height:1.7; }
        .seo-intro strong { color:rgba(255,255,255,.9); }

        .section-label { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:rgba(255,255,255,.45); font-weight:800; margin-bottom:14px; }

        .finder-card { background:rgba(2,18,40,.82); border:1px solid rgba(71,226,208,.2); border-radius:20px; padding:20px; margin-bottom:14px; }
        .finder-section-label { font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.4); font-weight:700; margin-bottom:12px; }

        .year-btn { padding:12px; font-size:14px; font-weight:800; border-radius:12px; border:1px solid rgba(255,255,255,.15); background:transparent; color:rgba(255,255,255,.5); cursor:pointer; font-family:'Barlow',sans-serif; }
        .year-btn.active { background:rgba(71,226,208,.15); border-color:rgba(71,226,208,.5); color:#47e2d0; }

        .month-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
        .month-pill { padding:13px 6px; font-size:13px; font-weight:700; border-radius:10px; border:1px solid rgba(255,255,255,.15); background:transparent; color:rgba(255,255,255,.6); cursor:pointer; font-family:'Barlow',sans-serif; position:relative; }
        .month-pill.active { background:rgba(71,226,208,.15); border-color:#47e2d0; color:#47e2d0; }
        .month-pill.past { opacity:.25; cursor:not-allowed; }
        .month-pill.snowbird-month { border-color:#39ff14; color:#39ff14; }
        .month-pill.snowbird-month.active { background:rgba(57,255,20,.15); border-color:#39ff14; color:#39ff14; }
        .month-pill .snow-badge { position:absolute; top:-8px; right:2px; background:#39ff14; color:#020b18; font-size:8px; font-weight:900; padding:1px 6px; border-radius:6px; letter-spacing:.04em; }

        .nights-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .night-btn { border:1px solid rgba(255,255,255,.15); border-radius:14px; padding:18px 8px; cursor:pointer; text-align:center; background:transparent; display:flex; flex-direction:column; align-items:center; gap:4px; font-family:'Barlow',sans-serif; width:100%; }
        .night-btn.active { background:rgba(71,226,208,.15); border-color:#47e2d0; }
        .night-num { font-size:28px; font-weight:900; color:#f7fbff; line-height:1; }
        .night-label { font-size:11px; color:rgba(255,255,255,.4); }
        .night-desc { font-size:11px; color:rgba(255,255,255,.5); font-weight:600; margin-top:2px; }
        .night-btn.active .night-num { color:#47e2d0; }
        .night-btn.active .night-desc { color:rgba(71,226,208,.8); }
        .snowbird-btn { grid-column:span 3; border-color:rgba(71,226,208,.35); background:rgba(71,226,208,.06); padding:22px; animation:snowpulse 2s ease-in-out infinite; }
        .snowbird-btn.active { background:rgba(71,226,208,.2); border-color:#47e2d0; animation:none; }
        .night-badge { background:rgba(71,226,208,.2); border:1px solid rgba(71,226,208,.4); color:#47e2d0; font-size:10px; font-weight:900; padding:3px 12px; border-radius:10px; letter-spacing:.08em; }
        @keyframes snowpulse { 0%,100%{box-shadow:0 0 0 0 rgba(71,226,208,.3);}50%{box-shadow:0 0 0 8px rgba(71,226,208,0);} }

        .guest-sub-label { font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,.4); font-weight:700; margin-bottom:8px; }
        .guest-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
        .guest-btn { padding:13px 4px; font-size:15px; font-weight:800; border-radius:10px; border:1px solid rgba(255,255,255,.15); background:transparent; color:rgba(255,255,255,.5); cursor:pointer; font-family:'Barlow',sans-serif; }
        .guest-btn.active { background:rgba(71,226,208,.15); border-color:rgba(71,226,208,.5); color:#47e2d0; }

        .find-btn { width:100%; padding:18px; background:#47e2d0; color:#020b18; font-size:16px; font-weight:900; border:none; border-radius:14px; cursor:pointer; font-family:'Barlow Condensed',sans-serif; letter-spacing:.06em; margin-bottom:8px; }
        .find-btn:disabled { background:rgba(71,226,208,.4); cursor:not-allowed; }

        .error-msg { background:rgba(255,107,107,.1); border:1px solid rgba(255,107,107,.3); border-radius:12px; padding:12px 16px; font-size:13px; color:#ff6b6b; margin-top:8px; }

        .amenities-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:10px; margin-bottom:28px; }
        .amenity-item { display:flex; align-items:center; gap:10px; background:rgba(2,18,40,.6); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:12px 14px; }
        .amenity-icon { font-size:18px; flex-shrink:0; }
        .amenity-text { font-size:12px; color:rgba(255,255,255,.7); font-weight:600; }

        .seo-faq { margin-bottom:28px; }
        .seo-faq-title { font-family:'Barlow Condensed',sans-serif; font-size:24px; font-weight:800; color:#f7fbff; margin-bottom:16px; }
        .seo-faq-item { border-bottom:1px solid rgba(255,255,255,.08); padding:14px 0; }
        .seo-faq-item h3 { font-size:15px; font-weight:700; color:#47e2d0; margin-bottom:6px; }
        .seo-faq-item p { font-size:13px; color:rgba(255,255,255,.6); line-height:1.6; }

        .seo-about { background:rgba(2,18,40,.6); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:22px; margin-bottom:28px; }
        .seo-about h2 { font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:800; color:#f7fbff; margin-bottom:14px; }
        .seo-about p { font-size:13px; color:rgba(255,255,255,.6); line-height:1.7; margin-bottom:12px; }
        .seo-about strong { color:rgba(255,255,255,.9); }
        .host-profile { display:flex; align-items:flex-start; gap:14px; margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,.08); }
        .host-avatar { width:44px; height:44px; border-radius:50%; background:rgba(71,226,208,.2); border:1px solid rgba(71,226,208,.4); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:#47e2d0; flex-shrink:0; }
        .host-info strong { font-size:13px; color:#f7fbff; display:block; margin-bottom:4px; }
        .host-info p { font-size:12px; color:rgba(255,255,255,.5); line-height:1.6; margin:0; }

        .plan-trip { margin-bottom:28px; }
        .plan-trip-title { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:rgba(255,255,255,.45); font-weight:800; margin-bottom:12px; }
        .plan-trip-links { display:flex; flex-wrap:wrap; gap:8px; }
        .plan-trip-pill { background:rgba(2,18,40,.7); border:1px solid rgba(255,255,255,.12); border-radius:20px; padding:8px 14px; font-size:12px; color:rgba(255,255,255,.7); text-decoration:none; font-weight:600; }
        .plan-trip-pill:hover { border-color:rgba(71,226,208,.4); color:#47e2d0; }

        .fine-print { font-size:11px; color:rgba(255,255,255,.3); line-height:1.6; margin-bottom:28px; }
        .fine-print-row { display:flex; gap:8px; margin-bottom:8px; align-items:flex-start; }
        .fine-print-row svg { flex-shrink:0; margin-top:2px; }

        .floating-home-top { position:fixed; bottom:24px; right:24px; display:none; flex-direction:column; gap:8px; z-index:999; }
        .floating-home-top.visible { display:flex; }
        .floating-home-top a, .floating-home-top button { width:44px; height:44px; border-radius:50%; background:rgba(2,18,40,.9); border:1px solid rgba(71,226,208,.35); display:flex; align-items:center; justify-content:center; color:#47e2d0; font-size:16px; text-decoration:none; cursor:pointer; font-family:'Barlow',sans-serif; }

        @media(max-width:768px) {
          .deals-topbar { display:none; }
          .deals-mobile-nav { display:flex; }
          .nights-grid { grid-template-columns:repeat(3,1fr); }
          .snowbird-btn { grid-column:span 3; }
          .amenities-grid { grid-template-columns:repeat(2,1fr); }
          .stats-bar { padding:14px 16px; }
          .stat-num { font-size:22px; }
        }
      `}</style>
    </>
  );
}
