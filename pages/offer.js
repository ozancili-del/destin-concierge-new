import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";

const CLEANING = 175;
const TAX_RATE = 0.13;
const ADMIN_RATE = 0.03;
const EXTRA_GUEST_FEE = 20;
const MONEY = n => "$" + Math.round(n).toLocaleString("en-US");

function calcFees(rate, nights, adults, children) {
  if (!rate || !nights || nights <= 0) return null;
  const rent = rate * nights;
  const extraGuests = Math.max(0, (adults + children) - 4);
  const extraFee = extraGuests * EXTRA_GUEST_FEE * nights;
  const rentAfter = rent + extraFee;
  const tax = Math.round((rentAfter + CLEANING) * TAX_RATE);
  const admin = Math.round((rentAfter + CLEANING + tax) * ADMIN_RATE);
  const total = rentAfter + CLEANING + tax + admin;
  return { rent, extraFee, extraGuests, tax, admin, total };
}

function getNights(ci, co) {
  if (!ci || !co) return 0;
  return Math.round((new Date(co) - new Date(ci)) / 86400000);
}

function OfferCalendar({ unit, year, month, arrival, departure, bookedDates, rates, onSelect, onNav }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function fmt(d) {
    return `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }

  return (
    <div className="cal-card">
      <div className="cal-head">
        <button className="cal-nav" onClick={() => onNav(-1)}>‹</button>
        <span className="cal-month-label">{MONTHS[month]} {year}</span>
        <button className="cal-nav" onClick={() => onNav(1)}>›</button>
      </div>
      <div className="cal-legend">
        <span><i className="legend-dot available-dot" />Open</span>
        <span><i className="legend-dot booked-dot" />Booked</span>
      </div>
      <div className="cal-grid">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} className="day-name">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const dateStr = fmt(d);
          const isPast = new Date(dateStr) < today;
          const isBooked = bookedDates.includes(dateStr);
          const isArrival = dateStr === arrival;
          const isDeparture = dateStr === departure;
          const isInRange = arrival && departure && dateStr > arrival && dateStr < departure;
          let cls = "day";
          if (isPast || isBooked) cls += isBooked ? " booked" : " past";
          else if (isArrival || isDeparture) cls += " selected";
          else if (isInRange) cls += " in-range";
          else cls += " available";
          const dayRate = !isPast && !isBooked && rates && rates[dateStr];
          return (
            <div key={dateStr} className={cls} onClick={() => !(isPast || isBooked) && onSelect(dateStr)}>
              <span className="day-num">{d}</span>
              {dayRate && <span className="day-rate">${dayRate}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OfferPage() {
  const [unit, setUnit] = useState("707");
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [bookedDates, setBookedDates] = useState([]);
  const [rates, setRates] = useState({});
  const [loadingDates, setLoadingDates] = useState(false);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [rate, setRate] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [guestWarn, setGuestWarn] = useState("");

  const totalGuests = adults + children + infants;
  const nights = getNights(arrival, departure);
  const fees = rate && nights > 0 ? calcFees(Number(rate), nights, adults, children) : null;

  useEffect(() => {
    function handleScroll() {
      const el = document.getElementById('offerFloating');
      if (el) el.classList.toggle('visible', window.scrollY > 300);
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setLoadingDates(true);
    fetch(`/api/availability?unit=${unit}`)
      .then(r => r.json())
      .then(d => { setBookedDates(d.booked || []); setRates(d.rates || {}); })
      .catch(() => setBookedDates([]))
      .finally(() => setLoadingDates(false));
    setArrival(""); setDeparture("");
  }, [unit]);

  function handleCalSelect(dateStr) {
    if (!arrival || (arrival && departure)) {
      setArrival(dateStr); setDeparture("");
    } else {
      if (dateStr > arrival) setDeparture(dateStr);
      else { setArrival(dateStr); setDeparture(""); }
    }
  }

  function handleNav(dir) {
    let m = calMonth + dir, y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setCalMonth(m); setCalYear(y);
  }

  function chgGuest(type, delta) {
    const newVal = type === "adults" ? Math.max(1, Math.min(4, adults + delta))
      : type === "children" ? Math.max(0, children + delta)
      : Math.max(0, infants + delta);
    const newTotal = (type === "adults" ? newVal : adults)
      + (type === "children" ? newVal : children)
      + (type === "infants" ? newVal : infants);
    if (newTotal > 6) { setGuestWarn("Maximum 6 guests reached."); return; }
    if (type === "adults" && newVal > 4) { setGuestWarn("Max 4 adults allowed."); return; }
    setGuestWarn("");
    if (type === "adults") setAdults(newVal);
    else if (type === "children") setChildren(newVal);
    else setInfants(newVal);
  }

  function fmtDate(str) {
    if (!str) return "";
    return new Date(str + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  async function handleSubmit() {
    if (!arrival || !departure || !rate || !name.trim() || !email.trim()) return;
    setStatus("sending");
    try {
      const context = `Make an Offer | Unit ${unit} | ${arrival} to ${departure} | ${nights} nights | ${adults} adults, ${children} children, ${infants} infants | Proposed rate: $${rate}/night | Est. total: ${fees ? MONEY(fees.total) : "N/A"}`;
      const res = await fetch("https://deals.destincondogetaways.com/api/rate-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message: "", context }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch { setStatus("error"); }
  }

  const canSubmit = arrival && departure && rate && name.trim() && email.trim() && status !== "sending";

  return (
    <>
      <Head>
        <title>Make an Offer on a Destin FL Beachfront Condo — Name Your Price | Pelican Beach Resort</title>
        <meta name="description" content="Propose your own nightly rate for a Gulf-front condo at Pelican Beach Resort, Destin FL. Unit 707 or Unit 1006 — sleeps 6, private balcony, beachfront. Submit your offer and we'll respond within hours. No OTA fees, owner direct." />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="keywords" content="make offer Destin FL condo, name your price vacation rental Destin, Pelican Beach Resort condo deal, flexible pricing Destin Florida, book direct condo Destin FL discount" />
        <link rel="canonical" href="https://offer.destincondogetaways.com/offer" />

        <meta property="og:title" content="Make an Offer — Destin Beachfront Condo, Pelican Beach Resort FL" />
        <meta property="og:description" content="Name your nightly rate for a Gulf-front condo in Destin, FL. Sleeps 6, private balcony, beachfront. Owner responds directly — no middleman, no OTA fees." />
        <meta property="og:image" content="https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-MediumOriginal" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="800" />
        <meta property="og:image:alt" content="Gulf-front beachfront condo at Pelican Beach Resort, Destin Florida" />
        <meta property="og:url" content="https://offer.destincondogetaways.com/offer" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Destin Condo Getaways" />
        <meta property="og:locale" content="en_US" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Make an Offer — Destin Beachfront Condo, Name Your Price" />
        <meta name="twitter:description" content="Propose your own nightly rate for a Gulf-front condo at Pelican Beach Resort, Destin FL. Owner direct, no OTA fees." />
        <meta name="twitter:image" content="https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-MediumOriginal" />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Make an Offer — Destin Beachfront Condo at Pelican Beach Resort",
          "description": "Propose your own nightly rate for a Gulf-front vacation rental condo at Pelican Beach Resort, Destin FL. Units 707 and 1006 sleep 6, private Gulf-view balcony, 2 bathrooms. Owner responds directly within hours.",
          "url": "https://offer.destincondogetaways.com/offer",
          "inLanguage": "en-US",
          "isPartOf": { "@type": "WebSite", "name": "Destin Condo Getaways", "url": "https://www.destincondogetaways.com" },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Destin Florida Vacation Rentals", "item": "https://www.destincondogetaways.com" },
              { "@type": "ListItem", "position": 2, "name": "Pelican Beach Resort Condos", "item": "https://www.destincondogetaways.com/properties" },
              { "@type": "ListItem", "position": 3, "name": "Make an Offer", "item": "https://offer.destincondogetaways.com/offer" }
            ]
          },
          "mainEntity": {
            "@type": "LodgingBusiness",
            "name": "Destin Condo Getaways — Pelican Beach Resort",
            "description": "Two Gulf-front beachfront condos at Pelican Beach Resort, Destin FL. Unit 707 (7th floor, Classic Coastal) and Unit 1006 (10th floor, Fresh Coastal). Sleeps 6, private Gulf-view balcony, 2 bathrooms, full kitchen. Book direct and save 10–20% vs Airbnb and VRBO.",
            "url": "https://www.destincondogetaways.com",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "1002 US-98 East",
              "addressLocality": "Destin",
              "addressRegion": "FL",
              "postalCode": "32541",
              "addressCountry": "US"
            },
            "geo": { "@type": "GeoCoordinates", "latitude": 30.3935, "longitude": -86.4958 },
            "priceRange": "$200–$600/night",
            "image": "https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-MediumOriginal",
            "aggregateRating": { "@type": "AggregateRating", "ratingValue": 5, "reviewCount": 400, "bestRating": 5 },
            "amenityFeature": [
              { "@type": "LocationFeatureSpecification", "name": "Beachfront", "value": true },
              { "@type": "LocationFeatureSpecification", "name": "Gulf View", "value": true },
              { "@type": "LocationFeatureSpecification", "name": "Private Balcony", "value": true },
              { "@type": "LocationFeatureSpecification", "name": "Full Kitchen", "value": true },
              { "@type": "LocationFeatureSpecification", "name": "Free Parking", "value": true },
              { "@type": "LocationFeatureSpecification", "name": "Free WiFi", "value": true },
              { "@type": "LocationFeatureSpecification", "name": "Pool", "value": true },
              { "@type": "LocationFeatureSpecification", "name": "Hot Tub", "value": true },
              { "@type": "LocationFeatureSpecification", "name": "Air Conditioning", "value": true }
            ]
          }
        })}} />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Can I negotiate the price on a Destin FL beachfront condo?",
              "acceptedAnswer": { "@type": "Answer", "text": "Yes. At Destin Condo Getaways you can propose your own nightly rate for Unit 707 or Unit 1006 at Pelican Beach Resort, Destin FL. Submit your offer with your dates and proposed rate, and the owner will respond directly within a few hours. If your offer is accepted you receive a booking link at your negotiated rate." }
            },
            {
              "@type": "Question",
              "name": "How does the Make an Offer feature work for Destin vacation rentals?",
              "acceptedAnswer": { "@type": "Answer", "text": "Select your unit, pick your dates on the live availability calendar, enter your proposed nightly rate, and see an instant fee breakdown including cleaning fee, tax, and admin fee so you know the full cost. Submit with your name and email and the owner reviews your offer typically within a few hours. This is not a binding booking — no charge until you confirm." }
            },
            {
              "@type": "Question",
              "name": "What is included in the total cost shown on the offer page?",
              "acceptedAnswer": { "@type": "Answer", "text": "The estimated total includes: your proposed nightly rate multiplied by the number of nights, a flat cleaning fee of $175, tourist and sales tax at 13%, and a 3% admin fee. This is the full amount you would pay if your offer is accepted — no hidden fees." }
            },
            {
              "@type": "Question",
              "name": "Which condos are available for offers at Pelican Beach Resort Destin?",
              "acceptedAnswer": { "@type": "Answer", "text": "Both Unit 707 (Classic Coastal, 7th floor) and Unit 1006 (Fresh Coastal, 10th floor) at Pelican Beach Resort, 1002 US-98 East, Destin FL 32541 are available for price offers. Both condos sleep up to 6 guests with a private Gulf-view balcony, 2 bathrooms, full kitchen, and direct beachfront access." }
            },
            {
              "@type": "Question",
              "name": "How quickly will I get a response to my condo offer in Destin?",
              "acceptedAnswer": { "@type": "Answer", "text": "The owner reviews all offers personally and typically responds within a few hours. You will receive a reply directly to your email with either an acceptance and booking link, or a counter-proposal. There is no automated rejection — every offer gets a personal response." }
            }
          ]
        })}} />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Name Your Price — Destin Beachfront Condo Rental",
          "description": "Flexible vacation rental pricing for beachfront condos at Pelican Beach Resort, Destin FL. Propose your own nightly rate — owner responds directly within hours.",
          "provider": {
            "@type": "Organization",
            "name": "Destin Condo Getaways",
            "url": "https://www.destincondogetaways.com"
          },
          "areaServed": {
            "@type": "City",
            "name": "Destin",
            "containedIn": { "@type": "State", "name": "Florida" }
          },
          "serviceType": "Vacation Rental",
          "offers": {
            "@type": "Offer",
            "availability": "https://schema.org/InStock",
            "priceCurrency": "USD",
            "description": "Flexible nightly rates — propose your own price for a Gulf-front condo at Pelican Beach Resort, Destin FL",
            "seller": { "@type": "Organization", "name": "Destin Condo Getaways" }
          }
        })}} />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800;900&family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-3SGXCQ4FTC" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3SGXCQ4FTC');` }} />

        {/* Review snippets — 10 real guest reviews */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Destin Condo Getaways — Pelican Beach Resort",
          "url": "https://www.destincondogetaways.com",
          "image": "https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-MediumOriginal",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "1002 US-98 East",
            "addressLocality": "Destin",
            "addressRegion": "FL",
            "postalCode": "32541",
            "addressCountry": "US"
          },
          "telephone": "+1-972-357-4262",
          "priceRange": "$110–$600/night",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "5.0",
            "reviewCount": "400",
            "bestRating": "5",
            "worstRating": "1"
          },
          "review": [
            {
              "@type": "Review",
              "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
              "author": { "@type": "Person", "name": "Lasheika W" },
              "datePublished": "2026-05-01",
              "reviewBody": "Exactly like the pictures. My son enjoyed his Mother/Son birthday weekend. Perfect beachfront condo at Pelican Beach Resort."
            },
            {
              "@type": "Review",
              "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
              "author": { "@type": "Person", "name": "Jacob A" },
              "datePublished": "2026-04-01",
              "reviewBody": "Beautiful condo! It actually felt bigger than it looked in the pictures. Ozan was the most responsive host that I have ever dealt with. 10/10 recommend! We will definitely be back!"
            },
            {
              "@type": "Review",
              "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
              "author": { "@type": "Person", "name": "Elsa J" },
              "datePublished": "2026-04-01",
              "reviewBody": "Excellent location and listing. The easy beach access made it secure for the kids. The host was extremely flexible and quick to respond. We had no concerns. I look forward to booking with this host again!"
            },
            {
              "@type": "Review",
              "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
              "author": { "@type": "Person", "name": "Ronna C" },
              "datePublished": "2026-01-01",
              "reviewBody": "Ozan was very helpful and responsive with any issue we had. I would recommend everyone to stay there. We had a great weekend. Thank you very much for your attention, help, and time."
            },
            {
              "@type": "Review",
              "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
              "author": { "@type": "Person", "name": "Carly J" },
              "datePublished": "2025-11-01",
              "reviewBody": "Ozan's rental was absolutely perfect! Modern appliances, close in proximity to popular restaurants and excursions, and the ocean view was breathtaking! My husband and I had such a relaxing stay, we will definitely be back!"
            },
            {
              "@type": "Review",
              "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
              "author": { "@type": "Person", "name": "Michelle A" },
              "datePublished": "2025-11-01",
              "reviewBody": "Just what the doctor ordered! A perfect location to recharge our batteries. The host was extremely communicative and very accommodating. We very much look forward to a return visit!"
            },
            {
              "@type": "Review",
              "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
              "author": { "@type": "Person", "name": "Justin F" },
              "datePublished": "2025-10-01",
              "reviewBody": "Amazing!! Answered calls and texts, very responsive. Great beachfront condo at Pelican Beach Resort Destin."
            },
            {
              "@type": "Review",
              "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
              "author": { "@type": "Person", "name": "Steven O" },
              "datePublished": "2025-09-01",
              "reviewBody": "Ozan's communication was invaluable. Location was great, access to beach was simple. Having a bar with food near the beach and pool access made it very easy to enjoy. Ozan's suggestions for restaurants and activities made our first trip to Destin a fun and memorable experience."
            },
            {
              "@type": "Review",
              "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
              "author": { "@type": "Person", "name": "Evan Q" },
              "datePublished": "2025-08-01",
              "reviewBody": "We had a great stay. Very short walk to the beach access. The resort was very nice and quiet. Overall excellent beachfront vacation rental in Destin FL."
            },
            {
              "@type": "Review",
              "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
              "author": { "@type": "Person", "name": "Kristy S" },
              "datePublished": "2025-12-01",
              "reviewBody": "We just wanted to get away and this place was perfect. We had a very nice time at Pelican Beach Resort in Destin FL."
            }
          ]
        })}} />

        {/* Event schema — every submitted offer is a potential booking event */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Event",
          "name": "Destin FL Beachfront Condo Stay — Make an Offer",
          "description": "Book a Gulf-front beachfront condo stay at Pelican Beach Resort, Destin FL at a price that works for you. Propose your own nightly rate for Unit 707 or Unit 1006 — sleeps 6, private balcony, direct beach access.",
          "startDate": new Date().toISOString().split('T')[0],
          "endDate": new Date(Date.now() + 365*86400000).toISOString().split('T')[0],
          "eventStatus": "https://schema.org/EventScheduled",
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "location": {
            "@type": "Place",
            "name": "Pelican Beach Resort",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "1002 US-98 East",
              "addressLocality": "Destin",
              "addressRegion": "FL",
              "postalCode": "32541",
              "addressCountry": "US"
            },
            "geo": { "@type": "GeoCoordinates", "latitude": 30.3935, "longitude": -86.4958 }
          },
          "organizer": {
            "@type": "Organization",
            "name": "Destin Condo Getaways",
            "url": "https://www.destincondogetaways.com"
          },
          "offers": {
            "@type": "Offer",
            "url": "https://offer.destincondogetaways.com/offer",
            "availability": "https://schema.org/InStock",
            "price": "0",
            "priceCurrency": "USD",
            "description": "Flexible nightly rate — propose your own price",
            "validFrom": new Date().toISOString().split('T')[0]
          },
          "image": "https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-MediumOriginal"
        })}} />

        {/* Speakable — marks content eligible for Google Assistant voice */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": [".offer-page h1", ".speakable-intro", ".speakable-faq"]
          },
          "url": "https://offer.destincondogetaways.com/offer"
        })}} />

      </Head>

      <div className="bg-wrap">
        <img src="/offer-bg.jpg" alt="" aria-hidden="true" />
        <div className="bg-overlay" />
      </div>

      <header className="deals-topbar">
        <a className="deals-brand" href="https://www.destincondogetaways.com">
          <b>DESTIN</b>
          <span>CONDO GETAWAYS</span>
        </a>
        <nav className="deals-nav">
          <a href="https://explore.destincondogetaways.com/destin-hub">Destin Hub</a>
          <a href="https://explore.destincondogetaways.com/destin-tripshock.html">Activities</a>
          <a href="https://www.destincondogetaways.com/properties">Condos</a>
          <a href="https://deals.destincondogetaways.com/beach-deals">Deals</a>
          <a href="https://explore.destincondogetaways.com/destin-car-rental.html">Flights & Cars</a>
          <a className="active" href="https://offer.destincondogetaways.com/offer" aria-current="page">Make an Offer</a>
        </nav>
        <a className="deals-book" href="https://www.destincondogetaways.com/properties" target="_blank" rel="noopener">🏖️ Book Your Stay</a>
      </header>
      <nav className="deals-mobile-nav" aria-label="Offer page mobile navigation">
        <a href="https://explore.destincondogetaways.com/destin-hub">Destin Hub</a>
        <a href="https://explore.destincondogetaways.com/destin-tripshock.html">Activities</a>
        <a href="https://www.destincondogetaways.com/properties">Condos</a>
        <a href="https://deals.destincondogetaways.com/beach-deals">Deals</a>
        <a href="https://explore.destincondogetaways.com/destin-car-rental.html">Flights & Cars</a>
        <a className="active" href="https://offer.destincondogetaways.com/offer" aria-current="page">Make an Offer</a>
      </nav>

      <main className="offer-page">
        <header className="page-header">
          <div className="page-header-inner">
            <div className="eyebrow">🏖️ Destin Condo Getaways — Pelican Beach Resort</div>
            <h1>
              <span className="line1">Book Direct.</span>
              <span className="line2">Your Terms.</span>
            </h1>
            <p className="page-header-copy speakable-intro">Propose your own nightly rate for a Gulf-front condo at Pelican Beach Resort. We review every offer personally and respond within a few hours. No OTA fees, no middlemen — direct from owner.</p>
            <div className="proof">
              <span>⭐ 400+ Five-Star Stays</span>
              <span>🏖️ 2 Beachfront Units</span>
              <span>💰 No OTA Fees</span>
            </div>
          </div>
        </header>

        <div className="amenities-grid" style={{marginBottom:28}}>
          <div className="amenity-item"><div className="amenity-icon">🧑‍🤝‍🧑</div><span className="amenity-text">Sleeps 6</span></div>
          <div className="amenity-item"><div className="amenity-icon">🛌</div><span className="amenity-text">King · Bunk · Queen sofa</span></div>
          <div className="amenity-item"><div className="amenity-icon">🚿</div><span className="amenity-text">2 Bathrooms</span></div>
          <div className="amenity-item"><div className="amenity-icon">🍳</div><span className="amenity-text">Full kitchen</span></div>
          <div className="amenity-item"><div className="amenity-icon">👕</div><span className="amenity-text">Laundromat</span></div>
          <div className="amenity-item"><div className="amenity-icon">📶</div><span className="amenity-text">High-speed WiFi</span></div>
          <div className="amenity-item"><div className="amenity-icon">📺</div><span className="amenity-text">2 Smart TVs</span></div>
          <div className="amenity-item"><div className="amenity-icon">💪</div><span className="amenity-text">Fitness · sauna · steam</span></div>
          <div className="amenity-item"><div className="amenity-icon">🏄</div><span className="amenity-text">Beachfront · No road</span></div>
          <div className="amenity-item"><div className="amenity-icon">🌅</div><span className="amenity-text">Oceanview balcony</span></div>
          <div className="amenity-item"><div className="amenity-icon">🏊</div><span className="amenity-text">3 outdoor · 1 indoor pool</span></div>
          <div className="amenity-item"><div className="amenity-icon">♨️</div><span className="amenity-text">2 hot tubs</span></div>
        </div>

        <div className="offer-shell">
          {/* LEFT — Calendar */}
          <aside className="availability-side">
            <div className="availability-copy">
              <div className="eyebrow">Beachfront availability</div>
              <h2>Start with the dates. Then make it yours.</h2>
              <p>Green = open. Red = booked. Click arrival then departure to select your window.</p>
            </div>
            <div>
              <div className="unit-toggle">
                <button className={unit === "707" ? "active" : ""} onClick={() => setUnit("707")}>Unit 707</button>
                <button className={unit === "1006" ? "active" : ""} onClick={() => setUnit("1006")}>Unit 1006</button>
              </div>
              {loadingDates ? (
                <div className="cal-loading">Loading availability…</div>
              ) : (
                <OfferCalendar unit={unit} year={calYear} month={calMonth} arrival={arrival} departure={departure} bookedDates={bookedDates} rates={rates} onSelect={handleCalSelect} onNav={handleNav} />
              )}
              {arrival && (
                <div className="date-display">
                  <span>{fmtDate(arrival)}</span>
                  <span className="date-arrow">→</span>
                  <span>{departure ? fmtDate(departure) : <em>select check-out</em>}</span>
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT — Form */}
          <section className="form-side">
            {status === "sent" ? (
              <div className="sent-state">
                <div className="sent-icon">🎉</div>
                <h2>Offer received!</h2>
                <p>We&apos;ll review your offer and reply to <strong>{email}</strong> within a few hours.</p>
                <button className="submit-btn" onClick={() => setStatus("idle")}>Make another offer</button>
              </div>
            ) : (
              <>
                <div className="form-header">
                  <div>
                    <div className="eyebrow">Offer details</div>
                    <h2>Your Stay</h2>
                  </div>
                  <div className="status-chip">Live estimate</div>
                </div>

                <div className="offer-form">
                  <div className="field">
                    <label>Unit</label>
                    <select value={unit} onChange={e => setUnit(e.target.value)}>
                      <option value="707">Unit 707 — Classic Coastal, 7th floor</option>
                      <option value="1006">Unit 1006 — Fresh Coastal, 10th floor</option>
                    </select>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label>Check-in</label>
                      <input type="text" readOnly value={arrival ? fmtDate(arrival) : ""} placeholder="Select on calendar" />
                    </div>
                    <div className="field">
                      <label>Check-out</label>
                      <input type="text" readOnly value={departure ? fmtDate(departure) : ""} placeholder="Select on calendar" />
                    </div>
                  </div>

                  <div className="counter-grid">
                    {[["Adults","Max 4",adults,"adults"],["Children","Ages 2–17",children,"children"],["Infants","Under 2",infants,"infants"]].map(([label,sub,val,type]) => (
                      <div key={type} className="counter">
                        <div className="counter-top">
                          <span className="counter-name">{label}</span>
                          <small>{sub}</small>
                        </div>
                        <div className="counter-ctrl">
                          <button type="button" onClick={() => chgGuest(type,-1)} disabled={val <= (type==="adults"?1:0)}>−</button>
                          <span className="count-val">{val}</span>
                          <button type="button" onClick={() => chgGuest(type,1)} disabled={totalGuests >= 6 || (type==="adults" && val >= 4)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {guestWarn && <div className="guest-warn">{guestWarn}</div>}

                  <div className="form-grid">
                    <div className="field">
                      <label>Proposed nightly rate ($)</label>
                      <input type="number" min="1" placeholder="e.g. 220" value={rate} onChange={e => setRate(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Total guests</label>
                      <input type="text" readOnly value={`${totalGuests} guest${totalGuests !== 1 ? "s" : ""}`} />
                    </div>
                  </div>

                  <div className="breakdown">
                    <h3>Offer Math</h3>
                    {fees ? (
                      <>
                        <div className="line-item"><span>Nightly × {nights} night{nights !== 1 ? "s" : ""}</span><strong>{MONEY(fees.rent)}</strong></div>
                        {fees.extraFee > 0 && <div className="line-item"><span>Extra guest fee ({fees.extraGuests} guest{fees.extraGuests > 1 ? "s" : ""} × ${EXTRA_GUEST_FEE}/night)</span><strong>{MONEY(fees.extraFee)}</strong></div>}
                        <div className="line-item"><span>Cleaning fee</span><strong>{MONEY(CLEANING)}</strong></div>
                        <div className="line-item"><span>Tax 13%</span><strong>{MONEY(fees.tax)}</strong></div>
                        <div className="line-item"><span>Admin 3%</span><strong>{MONEY(fees.admin)}</strong></div>
                        <div className="total-line"><span>Estimated total</span><strong>{MONEY(fees.total)}</strong></div>
                      </>
                    ) : (
                      <div className="breakdown-empty">Enter dates and a nightly rate to see your total</div>
                    )}
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label>Your name</label>
                      <input type="text" placeholder="First name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Email</label>
                      <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <button type="button" className={`submit-btn${!canSubmit ? " disabled" : ""}`} onClick={handleSubmit} disabled={!canSubmit}>
                    {status === "sending" ? "Sending…" : status === "error" ? "Retry →" : "Send My Offer →"}
                  </button>
                  <p className="fine-print">This is not a booking. We&apos;ll review and respond within a few hours. No charge until you confirm. An extra guest fee of $20/night applies for each guest beyond 4 (infants excluded). Final rates confirmed at checkout.</p>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <section style={{width:"min(1180px,calc(100% - 44px))",position:"relative",zIndex:1,margin:"0 auto",padding:"0 0 60px"}}>
        <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:40,display:"grid",gap:32}}>
          <div>
            <h2 style={{fontFamily:"var(--heading)",fontSize:"clamp(1.6rem,3vw,2.4rem)",color:"var(--white)",marginBottom:12,letterSpacing:".02em"}}>Why Make an Offer on a Destin Beachfront Condo?</h2>
            <p style={{color:"var(--muted)",fontSize:"1rem",lineHeight:1.7,maxWidth:720}}>Unlike booking platforms that lock in fixed prices, Destin Condo Getaways lets you propose the nightly rate that works for your budget. Whether you&apos;re booking last-minute, staying longer, or visiting in the off-season, there&apos;s often room for a conversation. Submit your offer with your proposed rate and we&apos;ll respond directly — no call centers, no bots, no waiting days for an answer.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20}}>
            {[
              ["🏖️","Gulf-front, no road to cross","Both units at Pelican Beach Resort sit directly on the Gulf of Mexico. Walk off the elevator and onto the sand."],
              ["💰","Skip the 14–20% OTA fees","Airbnb and VRBO add 14–20% service fees on top of every booking. Book direct and that money stays in your pocket."],
              ["🏠","Sleeps 6 — families welcome","King bed, bunk bed, queen sofa bed, and 2 full bathrooms. Perfect for families and groups up to 6 guests."],
              ["⚡","Owner responds within hours","Every offer gets a personal response from the owner — not an automated system. Fast, direct, human."],
            ].map(([icon,title,desc]) => (
              <div key={title} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.09)",borderRadius:16,padding:"20px 22px"}}>
                <div style={{fontSize:"1.5rem",marginBottom:8}}>{icon}</div>
                <div style={{fontFamily:"var(--heading)",fontSize:"1.1rem",fontWeight:700,color:"var(--white)",marginBottom:6,letterSpacing:".02em"}}>{title}</div>
                <div style={{color:"var(--muted)",fontSize:".88rem",lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>
          <div>
            <h2 style={{fontFamily:"var(--heading)",fontSize:"clamp(1.4rem,2.5vw,2rem)",color:"var(--white)",marginBottom:16,letterSpacing:".02em"}}>Frequently Asked Questions</h2>
            <div style={{display:"grid",gap:14}} className="speakable-faq">
              {[
                ["Can I negotiate the price on a Destin FL beachfront condo?","Yes. Submit your proposed nightly rate through the form above, select your dates, and the owner will review your offer personally and respond within a few hours."],
                ["Is there a minimum offer price?","There is no published minimum — the owner reviews each offer on its own merits based on the dates, season, and length of stay. Longer stays and off-season dates tend to have more flexibility."],
                ["What fees are included in the total shown?","The estimated total includes your proposed nightly rate × nights, a flat $175 cleaning fee, 13% tourist and sales tax, and a 3% admin fee. No hidden charges — what you see is what you pay if your offer is accepted."],
                ["How long does it take to get a response to my offer?","The owner responds personally — usually within a few hours during the day. You will receive an email with either an acceptance and booking link, or a direct counter-offer."],
                ["Which Destin condos are available for price offers?","Both Unit 707 (Classic Coastal, 7th floor) and Unit 1006 (Fresh Coastal, 10th floor) at Pelican Beach Resort, 1002 US-98 East, Destin FL 32541 accept offers. Both sleep up to 6 guests with direct Gulf-of-Mexico beachfront access."],
              ].map(([q,a]) => (
                <div key={q} style={{borderBottom:"1px solid rgba(255,255,255,.07)",paddingBottom:14}}>
                  <h3 style={{fontFamily:"var(--heading)",fontSize:"1rem",fontWeight:700,color:"var(--white)",marginBottom:5,letterSpacing:".02em"}}>{q}</h3>
                  <p style={{color:"var(--muted)",fontSize:".88rem",lineHeight:1.6,margin:0}}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="plan-trip">
          <div className="plan-trip-title">Plan Your Destin Trip</div>
          <div className="plan-trip-links">
            <a href="https://www.destincondogetaways.com/blog/best-beaches-destin" className="plan-trip-pill">🏖️ Best Beaches</a>
            <a href="https://www.destincondogetaways.com/blog/destinweather" className="plan-trip-pill">🌤️ Weather Guide</a>
            <a href="https://www.destincondogetaways.com/blog/destinairport" className="plan-trip-pill">✈️ Which Airport</a>
            <a href="https://www.destincondogetaways.com/blog/how-to-find-cheaper-flights-and-car-rentals" className="plan-trip-pill">🚗 Flights & Car Rentals</a>
            <a href="https://www.destincondogetaways.com/blog/destin-fireworks-2026" className="plan-trip-pill">🎆 Fireworks 2026</a>
            <a href="https://www.destincondogetaways.com/blog/destin-events-2026" className="plan-trip-pill">📅 Events 2026</a>
            <a href="https://deals.destincondogetaways.com/beach-deals" className="plan-trip-pill">🏷️ Price Drops</a>
            <a href="https://sunbirds.destincondogetaways.com/" className="plan-trip-pill">❄️ Snowbird Stays</a>
            <a href="https://explore.destincondogetaways.com/destin-tripshock.html" className="plan-trip-pill">🎟️ Activities & Tours</a>
          </div>
        </div>
      </section>

      <style jsx global>{`
        :root { --green:#39ff14; --teal:#00d4c8; --navy:#020b18; --card-bg:rgba(2,18,40,0.82); --card-border:rgba(0,212,200,0.35); --white:#ffffff; --gold:#ffd166; --red:#ff6b6b; --muted:#9fb2c8; --line:rgba(255,255,255,0.12); --heading:'Barlow Condensed',sans-serif; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family:'Outfit','Barlow',sans-serif; background:#04101d; color:#f7fbff; min-height:100vh; overflow-x:hidden; }
        .bg-wrap { position:fixed; inset:0; z-index:0; }
        .bg-wrap img { width:100%; height:100%; object-fit:cover; object-position:center 40%; filter:brightness(0.18) saturate(0.7); }
        .bg-overlay { position:absolute; inset:0; background:linear-gradient(to bottom,rgba(4,16,29,.55),rgba(4,16,29,.82)); }
        button, input, select { font: inherit; }

        .deals-topbar{width:min(1180px,calc(100% - 44px));margin:22px auto 24px;display:flex;align-items:center;justify-content:space-between;gap:18px;position:relative;z-index:3;color:white;}
        .deals-brand{line-height:1;text-decoration:none;display:flex;flex-direction:column;gap:2px;white-space:nowrap;}
        .deals-brand b{font-size:23px;letter-spacing:.12em;color:#47e2d0;font-weight:900;}
        .deals-brand span{font-size:11px;letter-spacing:.16em;color:rgba(255,255,255,.72);font-weight:800;}
        .deals-nav{display:flex;gap:28px;align-items:center;font-size:14px;font-weight:800;color:rgba(255,255,255,.86);}
        .deals-nav a{text-decoration:none;color:inherit;white-space:nowrap;position:relative;}
        .deals-nav a.active{color:#47e2d0;}
        .deals-nav a.active::after{content:"";position:absolute;left:0;right:0;bottom:-8px;height:2px;background:#47e2d0;box-shadow:0 0 14px rgba(71,226,208,.7);}
        .deals-book{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(243,170,52,.55);color:#ffd58a;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:900;background:rgba(243,170,52,.08);white-space:nowrap;}
        .deals-mobile-nav{display:none;position:relative;z-index:3;}

        .amenities-grid{border-radius:26px;background:rgba(5,22,36,.70);border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 70px rgba(0,0,0,.22);backdrop-filter:blur(14px);padding:22px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
        .amenity-item{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 10px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);text-align:center;}
        .amenity-icon{font-size:22px;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(71,226,208,.12);border:1px solid rgba(71,226,208,.28);}
        .amenity-text{font-size:12px;font-weight:700;color:rgba(255,255,255,.82);line-height:1.3;}

        .plan-trip{margin-top:48px;text-align:center;}
        .plan-trip-title{font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:16px;}
        .plan-trip-links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;}
        .plan-trip-pill{background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.12)!important;color:rgba(255,255,255,.82)!important;padding:8px 16px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;transition:.15s;}
        .plan-trip-pill:hover{background:rgba(71,226,208,.12)!important;border-color:rgba(71,226,208,.4)!important;color:#47e2d0!important;}

        @media(max-width:900px){.deals-topbar{display:none;}.deals-mobile-nav{display:flex;overflow-x:auto;gap:18px;padding:12px 16px 10px;border-bottom:1px solid rgba(255,255,255,.08);font-size:13px;font-weight:700;}.deals-mobile-nav a{text-decoration:none;color:rgba(255,255,255,.72);white-space:nowrap;}.deals-mobile-nav a.active{color:#47e2d0;}}
        @media(max-width:600px){.amenities-grid{grid-template-columns:repeat(2,1fr);}}

        .offer-page { max-width:1180px; width:min(1180px,calc(100% - 44px)); margin:0 auto; padding:0 0 60px; position:relative; z-index:1; }
        .page-header{
          min-height:480px;display:grid;align-items:center;
          border-radius:30px;overflow:hidden;position:relative;margin-bottom:26px;
          background:linear-gradient(90deg,rgba(4,16,29,.94),rgba(4,16,29,.55) 48%,rgba(4,16,29,.06)),
            url('/offer-bg.jpg') center/cover;
          border:1px solid rgba(255,255,255,.13);
          box-shadow:0 32px 90px rgba(0,0,0,.35);
          animation:fadeDown 0.6s ease both;
        }
        @keyframes fadeDown{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}
        .page-header-inner{padding:48px;max-width:700px;position:relative;z-index:2;}
        .eyebrow{display:inline-flex;align-items:center;gap:9px;padding:10px 16px;border-radius:999px;border:1px solid rgba(71,226,208,.55);background:rgba(71,226,208,.10);color:#84fff4;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:22px;}
        .page-header h1{font-family:'Outfit','Barlow Condensed',sans-serif;font-size:clamp(48px,6vw,82px);line-height:.95;letter-spacing:-2px;margin:0 0 20px;font-weight:900;}
        .page-header h1 .line1{color:#fff;display:block;}
        .page-header h1 .line2{display:block;background:linear-gradient(90deg,var(--teal),#7fffff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .page-header-copy{font-size:17px;line-height:1.55;color:rgba(255,255,255,.82);max-width:560px;margin-bottom:26px;}
        .proof{display:flex;flex-wrap:wrap;gap:22px;color:rgba(255,255,255,.84);font-weight:700;font-size:14px;}
        .proof span{display:flex;align-items:center;gap:8px;}

        .offer-shell { display: grid; grid-template-columns: minmax(320px,.94fr) minmax(380px,1.06fr); min-height: 720px; overflow: hidden; border: 1px solid var(--line); border-radius: 34px; background: linear-gradient(145deg,rgba(9,27,50,.98),rgba(4,16,30,.98)); box-shadow: 0 28px 90px rgba(0,0,0,.42); }

        .availability-side { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 28px; padding: 34px; background: linear-gradient(rgba(2,11,24,.34),rgba(2,11,24,.88)), url('/hub-bg-golden.jpg') center 40%/cover; }
        .availability-side::after { content:''; position:absolute; inset:0; background:radial-gradient(circle at top left,rgba(0,212,200,.24),transparent 44%); pointer-events:none; }
        .availability-copy, .cal-card, .unit-toggle, .date-display { position: relative; z-index: 1; }
        .availability-copy h2 { font-family: var(--heading); font-size: clamp(2.4rem,5vw,4rem); letter-spacing: .02em; line-height: .95; margin: 10px 0 12px; }
        .availability-copy p { color: #d2dfec; font-size: .95rem; }

        .unit-toggle { display: flex; gap: 8px; margin-bottom: 14px; }
        .unit-toggle button { flex: 1; padding: 8px 12px; border-radius: 20px; border: 1px solid var(--line); background: transparent; color: var(--muted); font-size: .85rem; font-weight: 700; cursor: pointer; transition: .15s; }
        .unit-toggle button.active { background: var(--teal); color: var(--navy); border-color: var(--teal); }

        .cal-loading { color: var(--muted); font-size: .9rem; text-align: center; padding: 20px 0; }
        .cal-card { padding: 16px; border: 1px solid rgba(255,255,255,.14); border-radius: 24px; background: rgba(2,11,24,.6); backdrop-filter: blur(14px); }
        .cal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .cal-month-label { font-family: var(--heading); font-size: 1.1rem; font-weight: 700; letter-spacing: .04em; }
        .cal-nav { background: transparent; border: 1px solid var(--line); color: var(--white); border-radius: 8px; width: 28px; height: 28px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
        .cal-nav:hover { border-color: var(--teal); color: var(--teal); }
        .cal-legend { display: flex; gap: 12px; font-size: .72rem; color: var(--muted); margin-bottom: 10px; }
        .legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
        .available-dot { background: var(--green); }
        .booked-dot { background: var(--red); }
        .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 5px; }
        .day-name { text-align: center; color: var(--muted); font-size: .68rem; font-weight: 900; text-transform: uppercase; padding-bottom: 3px; }
        .day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; border-radius: 10px; font-size: .8rem; font-weight: 700; cursor: pointer; transition: .12s; padding: 2px 0; }
        .day-num { font-size: .8rem; font-weight: 700; line-height: 1; }
        .day-rate { font-size: .6rem; font-weight: 600; opacity: .85; line-height: 1; }
        .day.available { background: rgba(94,227,139,.85); color: #0a2310; }
        .day.available:hover { background: var(--green); }
        .day.booked { background: rgba(255,107,107,.8); color: #2a0d10; cursor: not-allowed; text-decoration: line-through; }
        .day.past { background: rgba(255,255,255,.05); color: rgba(255,255,255,.2); cursor: not-allowed; }
        .day.selected { background: var(--gold) !important; color: var(--navy) !important; box-shadow: 0 0 0 3px rgba(255,209,102,.3); }
        .day.in-range { background: rgba(255,209,102,.2); color: var(--white); }
        .date-display { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: .9rem; color: var(--white); font-weight: 500; }
        .date-arrow { color: var(--teal); }
        .date-display em { color: var(--muted); font-style: normal; }

        .form-side { padding: 34px; background: linear-gradient(145deg,rgba(7,24,44,.96),rgba(3,13,25,.99)); }
        .form-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 22px; }
        .form-header h2 { font-family: var(--heading); font-size: clamp(2rem,4vw,3.2rem); letter-spacing: .02em; line-height: .95; }
        .status-chip { white-space: nowrap; color: var(--navy); background: var(--teal); border-radius: 999px; padding: 7px 12px; font-weight: 900; font-size: .76rem; }

        .offer-form { display: grid; gap: 16px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .field { display: grid; gap: 7px; }
        label { color: #c7d6e6; font-size: .76rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        input, select { width: 100%; color: var(--white); background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.13); border-radius: 16px; padding: 13px 15px; outline: none; transition: border-color .2s, box-shadow .2s; }
        input:focus, select:focus { border-color: rgba(0,212,200,.72); box-shadow: 0 0 0 4px rgba(0,212,200,.12); }
        input[readonly] { color: var(--gold); font-weight: 700; cursor: default; }
        select option { background: #061527; color: #fff; }

        .counter-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
        .counter { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); border-radius: 18px; padding: 12px; }
        .counter-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 9px; }
        .counter-name { color: #dce9f7; font-weight: 700; font-size: .88rem; }
        .counter small { color: var(--muted); font-size: .7rem; }
        .counter-ctrl { display: flex; align-items: center; justify-content: space-between; }
        .counter-ctrl button { width: 32px; height: 32px; border: 1px solid rgba(255,255,255,.16); border-radius: 50%; background: rgba(255,255,255,.08); color: var(--white); cursor: pointer; font-size: 16px; transition: .12s; }
        .counter-ctrl button:hover:not(:disabled) { border-color: var(--teal); color: var(--teal); }
        .counter-ctrl button:disabled { opacity: .2; cursor: not-allowed; }
        .count-val { font-size: 1.1rem; font-weight: 700; }
        .guest-warn { font-size: .82rem; color: var(--red); padding: 8px 12px; background: rgba(255,107,107,.1); border-radius: 10px; border: 1px solid rgba(255,107,107,.3); }

        .breakdown { padding: 18px; border: 1px solid rgba(255,255,255,.12); border-radius: 24px; background: linear-gradient(135deg,rgba(0,212,200,.1),transparent 48%),rgba(255,255,255,.04); }
        .breakdown h3 { font-family: var(--heading); font-size: 1.6rem; margin-bottom: 10px; }
        .line-item, .total-line { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 7px 0; color: #c9d9e8; border-bottom: 1px solid rgba(255,255,255,.07); }
        .line-item strong, .total-line strong { color: var(--white); white-space: nowrap; }
        .total-line { margin-top: 8px; padding-top: 12px; border-bottom: 0; font-size: 1.1rem; font-weight: 700; color: var(--white); }
        .total-line strong { color: var(--gold); font-size: 1.25rem; }
        .breakdown-empty { color: var(--muted); font-size: .9rem; text-align: center; padding: 8px 0; }

        .submit-btn { width: 100%; border: 0; border-radius: 18px; padding: 16px 18px; color: var(--navy); background: linear-gradient(135deg,var(--gold),#ffe39b); font-weight: 900; font-size: 1rem; letter-spacing: .04em; text-transform: uppercase; cursor: pointer; transition: transform .2s, box-shadow .2s; box-shadow: 0 12px 28px rgba(255,209,102,.18); }
        .submit-btn:hover:not(.disabled) { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(255,209,102,.26); }
        .submit-btn.disabled { opacity: .45; cursor: not-allowed; }
        .fine-print { color: var(--muted); font-size: .82rem; text-align: center; }

        .sent-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px; text-align: center; padding: 40px 20px; }
        .sent-icon { font-size: 48px; }
        .sent-state h2 { font-family: var(--heading); font-size: 3rem; }
        .sent-state p { color: var(--muted); max-width: 320px; }

        @media (max-width: 940px) {
          .offer-shell { grid-template-columns: 1fr; min-height: unset; border-radius: 28px; }
          .availability-side { padding: 24px; gap: 20px; }
          .form-side { padding: 24px; }
          .form-header { flex-direction: column; align-items: flex-start; gap: 10px; }
          .page-header { min-height:360px; border-radius:24px; }
          .page-header-inner { padding:26px 18px; }
        }
        @media (max-width: 620px) {
          .form-grid, .counter-grid { grid-template-columns: 1fr; }
          .page-header h1 { font-size:clamp(38px,10vw,60px); }
        }
        .floating-home-top{position:fixed;bottom:24px;right:16px;display:none;flex-direction:column;gap:8px;z-index:9999;}
        .floating-home-top a,.floating-home-top button{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;text-decoration:none;backdrop-filter:blur(8px);}
        .floating-home-top a{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:#fff;}
        .floating-home-top button{background:rgba(45,219,180,0.9);color:#000;border:none;box-shadow:0 4px 16px rgba(0,212,200,0.4);}
        .floating-home-top.visible{display:flex;}
      `}</style>
      <div id="offerFloating" className="floating-home-top">
        <a href="https://www.destincondogetaways.com" target="_blank" rel="noopener" aria-label="Home">🏠</a>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">↑</button>
      </div>
    </>
  );
}
