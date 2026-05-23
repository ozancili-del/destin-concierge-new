import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
    const STAY_NIGHTS = [2, 3, 4, 5];
    const WINDOWS     = [7, 14, 21, 30];
    const MIN_DROP    = 3;
    const MAX_DEALS   = 50;

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
      .select("unit_id, date, price, demand_desc, captured_date")
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
      byUnit[row.unit_id][row.captured_date][row.date] = { price: row.price, demand_desc: row.demand_desc };
    }

    // Use the most recent captured_date actually in the data
    // Fixes 8PM disappearing deals — todayStr is UTC which drifts ahead of Central time
    const allCapturedDates = new Set();
    for (const unit of Object.keys(byUnit)) {
      for (const cd of Object.keys(byUnit[unit])) allCapturedDates.add(cd);
    }
    const latestCaptured = [...allCapturedDates].sort().pop() || todayStr;

    // Fetch ALL historical prices for future dates — no captured_date filter
    // This ensures maxPrice reflects the true highest price ever seen
    const { data: allSnapshots } = await supabase
      .from('price_snapshots')
      .select('unit_id, date, price')
      .in('date', allDates)
      .limit(10000);

    // Build maxPrice from ALL historical data
    const maxPrice = {};
    for (const row of (allSnapshots || [])) {
      const key = `${row.unit_id}::${row.date}`;
      if (!maxPrice[key] || row.price > maxPrice[key]) maxPrice[key] = row.price;
    }

    const candidates = [];

    for (const unit of ["707", "1006"]) {
      const unitData = byUnit[unit];
      if (!unitData?.[latestCaptured]) continue;

      for (let i = 1; i <= SCAN_DAYS; i++) {
        const arrival    = addDays(today, i);
        const arrivalStr = fmt(arrival);

        for (const nights of STAY_NIGHTS) {
          const departure    = addDays(arrival, nights);
          const departureStr = fmt(departure);

          const windowDates = [];
          for (let j = 0; j < nights; j++) windowDates.push(fmt(addDays(arrival, j)));

          const rows = windowDates.map(d => unitData[latestCaptured]?.[d]);
          const purchased = rows.some(r => String(r?.demand_desc || '').trim().toLowerCase() === 'unavailable');
          const todayPrices = rows.map(r => r?.price).filter(v => v != null);
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
            purchased,
          });
        }
      }
    }

    // Split active vs purchased — active deals get priority, purchased are social proof
    const activeCandidates    = candidates.filter(d => !d.purchased);
    const purchasedCandidates = candidates.filter(d =>  d.purchased);

    activeCandidates.sort((a, b) => b.dropPct - a.dropPct || b.totalSavings - a.totalSavings);
    purchasedCandidates.sort((a, b) => b.dropPct - a.dropPct || b.totalSavings - a.totalSavings);

    function pickNonOverlapping(pool, cap) {
      const result = [];
      const usedRanges = { "707": [], "1006": [] };
      for (const deal of pool) {
        const used     = usedRanges[deal.unit];
        const overlaps = used.some(r => deal.arrival < r.departure && deal.departure > r.arrival);
        if (!overlaps) {
          result.push(deal);
          usedRanges[deal.unit].push({ arrival: deal.arrival, departure: deal.departure });
        }
        if (result.length >= cap) break;
      }
      return result;
    }

    const activeDeals    = pickNonOverlapping(activeCandidates, MAX_DEALS);
    const purchasedDeals = pickNonOverlapping(purchasedCandidates, 10);

    // Interleave purchased every 3rd slot for urgency
    const interleaved = [];
    let pi = 0;
    for (let i = 0; i < activeDeals.length; i++) {
      interleaved.push(activeDeals[i]);
      if ((i + 1) % 3 === 0 && pi < purchasedDeals.length) {
        interleaved.push(purchasedDeals[pi++]);
      }
    }
    // Append any remaining purchased at end
    while (pi < purchasedDeals.length) interleaved.push(purchasedDeals[pi++]);

    return { props: { deals: interleaved }, revalidate: 600 };

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
        "additionalType": "https://schema.org/LodgingBusiness",
        "amenityFeature": [
          { "@type": "LocationFeatureSpecification", "name": "Beachfront", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Gulf View", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Free Parking", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Private Balcony", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Full Kitchen", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Pool", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Hot Tub", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Air Conditioning", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "Free WiFi", "value": true },
          { "@type": "LocationFeatureSpecification", "name": "EV Charger", "value": true }
        ],
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": 4.94,
          "reviewCount": 400,
          "bestRating": 5,
          "worstRating": 1
        },
        "review": [{
          "@type": "Review",
          "reviewRating": {"@type":"Rating","ratingValue":5,"bestRating":5},
          "author": {"@type":"Person","name":"Verified Guest"},
          "reviewBody": "Absolutely stunning beachfront condo at Pelican Beach Resort. Woke up to dolphins every morning from the balcony. Best vacation rental we have ever stayed in. Will be back every year.",
          "datePublished": "2026-04-01"
        }],
        "containsPlace": {
          "@type": "Accommodation",
          "additionalType": "https://schema.org/EntirePlace",
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
          "availability": deal.purchased ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
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
      { "@type": "ListItem", "position": 1, "name": "Destin Florida Vacation Rentals", "item": "https://www.destincondogetaways.com" },
      { "@type": "ListItem", "position": 2, "name": "Pelican Beach Resort Condos", "item": "https://www.destincondogetaways.com/pelican-beach-resort-destin-574048693" },
      { "@type": "ListItem", "position": 3, "name": "Destin Beachfront Condo Rentals", "item": "https://www.destincondogetaways.com/properties" },
      { "@type": "ListItem", "position": 4, "name": "Destin Condo Price Drops — Book Direct & Save", "item": "https://deals.destincondogetaways.com/beach-deals" }
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

// ── Deal purchased stamp ─────────────────────────────────────────────────────
function DealPurchasedStamp() {
  return (
    <div className="deal-purchased-wrap" aria-label="Deal purchased">
      <div className="deal-purchased-stamp">
        <span>DEAL PURCHASED</span>
      </div>
    </div>
  );
}

// ── Deal card ─────────────────────────────────────────────────────────────────
function MiniCal({ year, month, arrival, departure, bookedDates, onSelect }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function fmt(d) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  return (
    <div className="mini-cal">
      <div className="mini-cal-head">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="mini-cal-dow">{d}</div>)}
      </div>
      <div className="mini-cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const dateStr = fmt(d);
          const isPast = new Date(dateStr) < today;
          const isBooked = bookedDates.includes(dateStr);
          const isArrival = dateStr === arrival;
          const isDeparture = dateStr === departure;
          const isInRange = arrival && departure && dateStr > arrival && dateStr < departure;
          const disabled = isPast || isBooked;
          let cls = 'mini-cal-day';
          if (disabled) cls += ' cal-disabled';
          else if (isArrival || isDeparture) cls += ' cal-selected';
          else if (isInRange) cls += ' cal-inrange';
          return (
            <div key={dateStr} className={cls} onClick={() => !disabled && onSelect(dateStr)}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DealCard({ deal, index, initialViews = 0, openCardId, setOpenCardId }) {
  const meta      = UNIT_META[deal.unit];
  const url       = bookingUrl(deal.unit, deal.arrival, deal.departure);
  const dateLabel = `${deal.arrivalFriendly} – ${deal.departureFriendly} · ${deal.nights} nights`;
  const daysLeft  = (() => { const d = new Date(deal.arrival + 'T12:00:00'); const today = new Date(); today.setHours(12,0,0,0); return Math.ceil((d - today) / 86400000); })();
  const isHot     = !deal.purchased && daysLeft <= 14;
  const showTag   = !deal.purchased && daysLeft <= 7;
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [views, setViews]     = useState(initialViews);
  const cardId = `${deal.unit}-${deal.arrival}`;
  const showMsg = openCardId === cardId;
  const [bookedDates, setBookedDates] = useState(null);
  const [msgArrival, setMsgArrival]   = useState(deal.arrival);
  const [msgDeparture, setMsgDeparture] = useState(deal.departure);
  const [msgName, setMsgName]     = useState('');
  const [msgEmail, setMsgEmail]   = useState('');
  const [msgNote, setMsgNote]     = useState('');
  const [msgStatus, setMsgStatus] = useState('idle'); // idle | sending | sent | error
  const [calMonth, setCalMonth]   = useState(() => { const d = new Date(deal.arrival + 'T12:00:00'); return { year: d.getFullYear(), month: d.getMonth() }; });

  // Sync when parent fetches live counts
  useEffect(() => { setViews(initialViews); }, [initialViews]);

  async function openMsgOverlay() {
    setOpenCardId(cardId);
    setMsgStatus('idle');
    if (!bookedDates) {
      const res = await fetch(`/api/availability?unit=${deal.unit}`).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      setBookedDates(data?.booked || []);
    }
  }

  function closeMsgOverlay() { setOpenCardId(null); setMsgStatus('idle'); }

  async function sendMessage() {
    if (!msgName.trim() || !msgEmail.trim() || !msgArrival || !msgDeparture) return;
    setMsgStatus('sending');
    try {
      const context = `Unit ${deal.unit} | ${msgArrival} to ${msgDeparture}`;
      const res = await fetch('/api/rate-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: msgName, email: msgEmail, message: msgNote, context }),
      });
      setMsgStatus(res.ok ? 'sent' : 'error');
    } catch { setMsgStatus('error'); }
  }

  function isBooked(dateStr) { return bookedDates && bookedDates.includes(dateStr); }
  function fmtDate(str) { return str ? new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''; }

  const hasCounted = useRef(false);
  function trackView() {
    if (hasCounted.current) return;
    hasCounted.current = true;
    fetch('/api/deal-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit: deal.unit, arrival: deal.arrival, departure: deal.departure }),
    })
      .then(r => r.json())
      .then(d => { if (d.views) setViews(d.views); })
      .catch(() => {});
  }

  function trackAction() {
    // Always +1 for secure/share regardless of hasCounted
    fetch('/api/deal-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit: deal.unit, arrival: deal.arrival, departure: deal.departure }),
    })
      .then(r => r.json())
      .then(d => { if (d.views) setViews(d.views); })
      .catch(() => {});
  }

  function handleCardClick() {
    // Mobile only — tap on card counts as view
    if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
      trackView();
    }
  }

  function handleShare() {
    const shareUrl = `https://deals.destincondogetaways.com/beach-deals#${cardId}`;
    const shareText = `Hey, check out this deal at Pelican Beach Resort Destin: ${shareUrl}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `Pelican Beach Resort Deal — ${meta.name}`,
        text: `Hey, check out this deal at Pelican Beach Resort Destin:`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      id={cardId}
      className="deal-card"
      onMouseEnter={() => { setHovered(true); trackView(); }}
      onMouseLeave={() => setHovered(false)}
      onClick={handleCardClick}
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
          {views > 0 && (
            <div className="views-badge-wrap">
              <div className="views-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="#aa0000"/></svg>
                <span className="views-label">Views</span>
                <span className="views-count">{views}</span>
              </div>
              {isHot && (
                <div className="hot-pill">
                  <svg width="12" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C8 6 6 9 8 13c-2-1-3-3-3-5C3 13 4 18 8 20c-1-1-1-2-1-3 2 2 4 3 5 5 1-2 0-4-1-5 3 1 5 4 4 7 4-3 5-8 3-12 1 1 2 3 1 5 2-2 3-6 1-9z"/></svg>
                  <span className="hot-label">HOT DEAL</span>
                </div>
              )}
            </div>
          )}
          {showTag && (
            <div className="sbux-tag-img" aria-label="$25 Starbucks Gift Card included">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 200" style={{width:'100%',height:'100%',overflow:'visible'}}>
                {/* Rope */}
                <path d="M60 0 C55 8 52 14 54 22" stroke="#c8a06e" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
                <path d="M60 0 C65 8 68 14 66 22" stroke="#c8a06e" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
                <path d="M54 22 C50 30 50 38 54 42" stroke="#b8904e" strokeWidth="3" fill="none" strokeLinecap="round"/>
                <path d="M66 22 C70 30 70 38 66 42" stroke="#b8904e" strokeWidth="3" fill="none" strokeLinecap="round"/>
                {/* Tag body */}
                <path d="M10 55 L10 185 Q10 195 20 195 L100 195 Q110 195 110 185 L110 55 L80 30 Q70 22 60 22 Q50 22 40 30 Z" fill="#e8512a"/>
                {/* Hole */}
                <circle cx="60" cy="44" r="7" fill="#07192e"/>
                <circle cx="60" cy="44" r="5" fill="#e8512a" opacity="0.3"/>
                {/* Inner cream card */}
                <rect x="18" y="62" width="84" height="118" rx="6" fill="#fdf3e3"/>
                {/* Inner border */}
                <rect x="22" y="66" width="76" height="110" rx="4" fill="none" stroke="#e8512a" strokeWidth="1.2" strokeDasharray="0"/>
                {/* Coffee cup */}
                <g transform="translate(60,88)">
                  <rect x="-13" y="-14" width="26" height="22" rx="3" fill="none" stroke="#3d1f00" strokeWidth="1.8"/>
                  <rect x="-13" y="-14" width="26" height="6" rx="2" fill="#3d1f00"/>
                  <circle cx="0" cy="4" r="5" fill="#1a6b3a"/>
                  <path d="M-4 -22 Q-2 -26 0 -22" stroke="#3d1f00" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M2 -24 Q4 -28 6 -24" stroke="#3d1f00" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </g>
                {/* $10 */}
                <text x="60" y="130" textAnchor="middle" fill="#e8512a" fontFamily="'Barlow Condensed',Arial,sans-serif" fontSize="34" fontWeight="900">$25</text>
                {/* Starbucks Gift Card */}
                <text x="60" y="152" textAnchor="middle" fill="#3d1f00" fontFamily="Arial,sans-serif" fontSize="12" fontWeight="700">Starbucks</text>
                <text x="60" y="168" textAnchor="middle" fill="#3d1f00" fontFamily="Arial,sans-serif" fontSize="12" fontWeight="700">Gift Card</text>
              </svg>
            </div>
          )}

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
        <div className="btn-row">
          {deal.purchased ? (
            <DealPurchasedStamp />
          ) : (
            <a className="btn-book" href={url} onClick={trackAction}>Secure This Deal  →</a>
          )}
          <button className="btn-share" onClick={() => { openMsgOverlay(); trackAction(); }} title="Send Inquiry about this deal">
            <span className="share-label">Send Inquiry</span>
            <div className="share-icon-circle">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
          </button>
        </div>
      </div>

      {showMsg && (
        <div className="msg-overlay" onClick={(e) => { if (e.target.classList.contains('msg-overlay')) closeMsgOverlay(); }}>
          <div className="msg-box">
            <div className="msg-box-header">
              <div className="msg-box-title">Send Inquiry &mdash; Unit {deal.unit}</div>
              <button className="msg-close" onClick={closeMsgOverlay} aria-label="Close">&#x2715;</button>
            </div>
            {msgStatus === 'sent' ? (
              <div className="msg-sent">
                <div style={{fontSize:32,marginBottom:8}}>&#127881;</div>
                <strong>Message sent!</strong>
                <p>Ozan will reply directly to your email &mdash; usually within the hour.</p>
                <button className="msg-btn-send" onClick={closeMsgOverlay}>Close</button>
              </div>
            ) : (
              <>
                <div className="msg-cal-label">Select your dates &mdash; <span style={{color:'#888',fontWeight:400}}>greyed = booked</span></div>
                <div className="msg-cal-nav">
                  <button className="msg-cal-arrow" onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>&#8249;</button>
                  <span className="msg-cal-month">{new Date(calMonth.year, calMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  <button className="msg-cal-arrow" onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>&#8250;</button>
                </div>
                <MiniCal
                  year={calMonth.year}
                  month={calMonth.month}
                  arrival={msgArrival}
                  departure={msgDeparture}
                  bookedDates={bookedDates || []}
                  onSelect={(date) => {
                    if (!msgArrival || (msgArrival && msgDeparture)) {
                      setMsgArrival(date); setMsgDeparture('');
                    } else {
                      if (date > msgArrival) setMsgDeparture(date);
                      else { setMsgArrival(date); setMsgDeparture(''); }
                    }
                  }}
                />
                <div className="msg-dates-display">
                  <span className="msg-date-chip">{msgArrival ? fmtDate(msgArrival) : 'Check-in'}</span>
                  <span style={{color:'#aaa',margin:'0 6px'}}>&#8594;</span>
                  <span className="msg-date-chip">{msgDeparture ? fmtDate(msgDeparture) : 'Check-out'}</span>
                </div>
                <div className="msg-fields">
                  <div className="msg-field-row">
                    <input className="msg-input" type="text" placeholder="Your name" value={msgName} onChange={e => setMsgName(e.target.value)} />
                    <input className="msg-input" type="email" placeholder="Your email" value={msgEmail} onChange={e => setMsgEmail(e.target.value)} />
                  </div>
                  <textarea className="msg-textarea" placeholder="What can we do to make your stay extra special?" value={msgNote} onChange={e => setMsgNote(e.target.value)} />
                </div>
                <div className="msg-footer">
                  <span className="msg-footer-note">Ozan replies directly &mdash; usually within the hour</span>
                  <button className="msg-btn-send" disabled={!msgName.trim() || !msgEmail.trim() || !msgArrival || !msgDeparture || msgStatus === 'sending'} onClick={sendMessage}>
                    {msgStatus === 'sending' ? 'Sending…' : msgStatus === 'error' ? 'Retry →' : 'Send →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
        If you have specific dates in mind, send an inquiry — the host may be able to work something out.
      </p>
      <div className="no-deals-btns">
        <a className="btn-main" href="https://www.destincondogetaways.com/availability">Check Availability</a>
        <a className="btn-inquiry" href="mailto:ozan@destincondogetaways.com?subject=Inquiry%20for%20specific%20dates&body=Hi%20Ozan%2C%20I%20am%20interested%20in%20booking%20for%20the%20following%20dates%3A%0A%0AUnit%3A%0AArrival%3A%0ADeparture%3A%0AGuests%3A%0A%0AThank%20you!">
          Send Inquiry
        </a>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const AIRPORTS = [
  {iata:"ATL",city:"Atlanta",state:"GA",name:"Hartsfield-Jackson Atlanta Intl"},
  {iata:"LAX",city:"Los Angeles",state:"CA",name:"Los Angeles Intl"},
  {iata:"DFW",city:"Dallas",state:"TX",name:"Dallas/Fort Worth Intl"},
  {iata:"DEN",city:"Denver",state:"CO",name:"Denver Intl"},
  {iata:"ORD",city:"Chicago",state:"IL",name:"O'Hare Intl"},
  {iata:"JFK",city:"New York",state:"NY",name:"John F. Kennedy Intl"},
  {iata:"MCO",city:"Orlando",state:"FL",name:"Orlando Intl"},
  {iata:"LAS",city:"Las Vegas",state:"NV",name:"Harry Reid Intl"},
  {iata:"CLT",city:"Charlotte",state:"NC",name:"Charlotte Douglas Intl"},
  {iata:"MIA",city:"Miami",state:"FL",name:"Miami Intl"},
  {iata:"SEA",city:"Seattle",state:"WA",name:"Seattle-Tacoma Intl"},
  {iata:"PHX",city:"Phoenix",state:"AZ",name:"Phoenix Sky Harbor Intl"},
  {iata:"EWR",city:"Newark",state:"NJ",name:"Newark Liberty Intl"},
  {iata:"SFO",city:"San Francisco",state:"CA",name:"San Francisco Intl"},
  {iata:"IAH",city:"Houston",state:"TX",name:"George Bush Intercontinental"},
  {iata:"BOS",city:"Boston",state:"MA",name:"Logan Intl"},
  {iata:"MSP",city:"Minneapolis",state:"MN",name:"Minneapolis-St. Paul Intl"},
  {iata:"FLL",city:"Fort Lauderdale",state:"FL",name:"Fort Lauderdale-Hollywood Intl"},
  {iata:"DTW",city:"Detroit",state:"MI",name:"Detroit Metropolitan Wayne County"},
  {iata:"PHL",city:"Philadelphia",state:"PA",name:"Philadelphia Intl"},
  {iata:"LGA",city:"New York",state:"NY",name:"LaGuardia"},
  {iata:"IAD",city:"Washington",state:"DC",name:"Dulles Intl"},
  {iata:"DCA",city:"Washington",state:"DC",name:"Ronald Reagan Washington National"},
  {iata:"MDW",city:"Chicago",state:"IL",name:"Midway Intl"},
  {iata:"DAL",city:"Dallas",state:"TX",name:"Love Field"},
  {iata:"BNA",city:"Nashville",state:"TN",name:"Nashville Intl"},
  {iata:"AUS",city:"Austin",state:"TX",name:"Austin-Bergstrom Intl"},
  {iata:"SLC",city:"Salt Lake City",state:"UT",name:"Salt Lake City Intl"},
  {iata:"SAN",city:"San Diego",state:"CA",name:"San Diego Intl"},
  {iata:"HOU",city:"Houston",state:"TX",name:"William P. Hobby"},
  {iata:"PDX",city:"Portland",state:"OR",name:"Portland Intl"},
  {iata:"BWI",city:"Baltimore",state:"MD",name:"Baltimore/Washington Intl"},
  {iata:"STL",city:"St. Louis",state:"MO",name:"St. Louis Lambert Intl"},
  {iata:"MCI",city:"Kansas City",state:"MO",name:"Kansas City Intl"},
  {iata:"RDU",city:"Raleigh",state:"NC",name:"Raleigh-Durham Intl"},
  {iata:"TPA",city:"Tampa",state:"FL",name:"Tampa Intl"},
  {iata:"IND",city:"Indianapolis",state:"IN",name:"Indianapolis Intl"},
  {iata:"CVG",city:"Cincinnati",state:"OH",name:"Cincinnati/Northern Kentucky Intl"},
  {iata:"CMH",city:"Columbus",state:"OH",name:"John Glenn Columbus Intl"},
  {iata:"CLE",city:"Cleveland",state:"OH",name:"Cleveland Hopkins Intl"},
  {iata:"PIT",city:"Pittsburgh",state:"PA",name:"Pittsburgh Intl"},
  {iata:"MSY",city:"New Orleans",state:"LA",name:"Louis Armstrong New Orleans Intl"},
  {iata:"MEM",city:"Memphis",state:"TN",name:"Memphis Intl"},
  {iata:"JAX",city:"Jacksonville",state:"FL",name:"Jacksonville Intl"},
  {iata:"SAT",city:"San Antonio",state:"TX",name:"San Antonio Intl"},
  {iata:"OKC",city:"Oklahoma City",state:"OK",name:"Will Rogers World"},
  {iata:"TUL",city:"Tulsa",state:"OK",name:"Tulsa Intl"},
  {iata:"BHM",city:"Birmingham",state:"AL",name:"Birmingham-Shuttlesworth Intl"},
  {iata:"LIT",city:"Little Rock",state:"AR",name:"Bill and Hillary Clinton National"},
  {iata:"BTR",city:"Baton Rouge",state:"LA",name:"Baton Rouge Metropolitan"},
  {iata:"LEX",city:"Lexington",state:"KY",name:"Blue Grass"},
  {iata:"TYS",city:"Knoxville",state:"TN",name:"McGhee Tyson"},
  {iata:"RIC",city:"Richmond",state:"VA",name:"Richmond Intl"},
  {iata:"SDF",city:"Louisville",state:"KY",name:"Louisville Muhammad Ali Intl"},
  {iata:"OMA",city:"Omaha",state:"NE",name:"Eppley Airfield"},
  {iata:"MKE",city:"Milwaukee",state:"WI",name:"Milwaukee Mitchell Intl"},
  {iata:"ABQ",city:"Albuquerque",state:"NM",name:"Albuquerque Intl Sunport"},
  {iata:"SMF",city:"Sacramento",state:"CA",name:"Sacramento Intl"},
  {iata:"BDL",city:"Hartford",state:"CT",name:"Bradley Intl"},
  {iata:"GRR",city:"Grand Rapids",state:"MI",name:"Gerald R. Ford Intl"},
  {iata:"DSM",city:"Des Moines",state:"IA",name:"Des Moines Intl"},
  {iata:"OGG",city:"Maui",state:"HI",name:"Kahului"},
  {iata:"HNL",city:"Honolulu",state:"HI",name:"Daniel K. Inouye Intl"},
  {iata:"ANC",city:"Anchorage",state:"AK",name:"Ted Stevens Anchorage Intl"},
];

function FlightSearch() {
  const [originQ, setOriginQ] = useState("");
  const [originIata, setOriginIata] = useState(null);
  const [originSug, setOriginSug] = useState([]);
  const [showOriginSug, setShowOriginSug] = useState(false);

  const [destQ, setDestQ] = useState("VPS · Destin FL");
  const [destIata, setDestIata] = useState("VPS");
  const [destSug, setDestSug] = useState([]);
  const [showDestSug, setShowDestSug] = useState(false);

  const [depDate, setDepDate] = useState("");
  const [retDate, setRetDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabin, setCabin] = useState("");
  const depRef = useRef(null);
  const retRef = useRef(null);
  const destFieldRef = useRef(null);
  const originFieldRef = useRef(null);

  const DEST_DEFAULTS = [
    {iata:"VPS",city:"Destin",state:"FL",name:"Destin-Fort Walton Beach"},
    {iata:"PNS",city:"Pensacola",state:"FL",name:"Pensacola Intl"},
    {iata:"ECP",city:"Panama City",state:"FL",name:"Northwest Florida Beaches Intl"},
  ];

  function filterAirports(val) {
    if (val.length < 2) return [];
    const q = val.toLowerCase();
    return AIRPORTS.filter(a =>
      a.iata.toLowerCase().startsWith(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.state.toLowerCase().startsWith(q)
    ).slice(0, 6);
  }

  function handleOriginQ(val) {
    setOriginQ(val); setOriginIata(null);
    const m = filterAirports(val);
    setOriginSug(m); setShowOriginSug(m.length > 0);
  }

  function pickOrigin(a) {
    setOriginQ(`${a.city}, ${a.state} (${a.iata})`); setOriginIata(a.iata);
    setOriginSug([]); setShowOriginSug(false);
  }

  function handleDestQ(val) {
    setDestQ(val); setDestIata(null);
    if (val.length < 2) { setDestSug(DEST_DEFAULTS); setShowDestSug(true); return; }
    const m = [...DEST_DEFAULTS.filter(a => a.city.toLowerCase().includes(val.toLowerCase()) || a.iata.toLowerCase().startsWith(val.toLowerCase())),
               ...filterAirports(val).filter(a => !["VPS","PNS","ECP"].includes(a.iata))].slice(0, 6);
    setDestSug(m); setShowDestSug(m.length > 0);
  }

  function pickDest(a) {
    setDestQ(`${a.iata} · ${a.city}`); setDestIata(a.iata);
    setDestSug([]); setShowDestSug(false);
  }

  function chg(type, delta) {
    if (type === "adults") setAdults(v => Math.max(1, v + delta));
    if (type === "children") setChildren(v => Math.max(0, v + delta));
    if (type === "infants") setInfants(v => Math.max(0, v + delta));
  }

  function buildLink() {
    if (!originIata || !destIata || !depDate || !retDate) return null;
    const d = new Date(depDate), r = new Date(retDate);
    const dd = String(d.getUTCDate()).padStart(2,"0"), dm = String(d.getUTCMonth()+1).padStart(2,"0");
    const rd = String(r.getUTCDate()).padStart(2,"0"), rm = String(r.getUTCMonth()+1).padStart(2,"0");
    const total = adults + children + infants;
    return `https://www.aviasales.com/search/${originIata}${dd}${dm}${destIata}${rd}${rm}${cabin}${total}?adults=${adults}&children=${children}&infants=${infants}&marker=709191`;
  }

  const cabins = [{ code: "", label: "Economy" }, { code: "w", label: "Comfort+" }, { code: "c", label: "Business" }, { code: "f", label: "First" }];
  const link = buildLink();

  return (
    <div className="flight-widget">
      <div className="fw-header">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        <span>Search Flights</span>
        <span className="fw-header-sub">Any destination · All airlines · Best prices</span>
      </div>

      <div className="fw-cabin-bar">
        {cabins.map(c => (
          <button key={c.code} className={`fw-cabin-pill${cabin === c.code ? " active" : ""}`} onClick={() => setCabin(c.code)}>{c.label}</button>
        ))}
      </div>

      <div className="fw-fields-row">
        <div className="fw-field" style={{position:"relative"}} ref={originFieldRef}>
          <div className="fw-label">Flying from</div>
          <input className="fw-input" placeholder="City or airport code" value={originQ}
            onChange={e => handleOriginQ(e.target.value)}
            onFocus={() => originSug.length > 0 && setShowOriginSug(true)}
            onBlur={() => setTimeout(() => setShowOriginSug(false), 150)}
            autoComplete="off" />
          {showOriginSug && originFieldRef.current && typeof document !== "undefined" && createPortal(
            <div style={{
              position:"fixed",
              top: originFieldRef.current.getBoundingClientRect().bottom + 4,
              left: originFieldRef.current.getBoundingClientRect().left,
              width: originFieldRef.current.getBoundingClientRect().width,
              background:"#0d1f35",
              border:"0.5px solid rgba(0,212,200,.3)",
              borderRadius:10,
              zIndex:99999,
              boxShadow:"0 8px 32px rgba(0,0,0,.8)",
              overflow:"hidden"
            }}>
              {originSug.map(a => (
                <div key={a.iata} className="fw-sug-item" onMouseDown={() => pickOrigin(a)}>
                  <span className="fw-sug-iata">{a.iata}</span>
                  <span className="fw-sug-city">{a.city}, {a.state} — {a.name}</span>
                </div>
              ))}
            </div>,
            document.body
          )}
        </div>

        <div className="fw-field" style={{position:"relative"}} ref={destFieldRef}>
          <div className="fw-label">Flying to</div>
          <input className="fw-input" placeholder="City or airport code" value={destQ}
            onChange={e => handleDestQ(e.target.value)}
            onFocus={() => { setDestSug(destQ.length < 2 ? DEST_DEFAULTS : filterAirports(destQ).slice(0,6)); setShowDestSug(true); }}
            onBlur={() => setTimeout(() => setShowDestSug(false), 150)}
            autoComplete="off" />
          {showDestSug && destFieldRef.current && typeof document !== "undefined" && createPortal(
            <div className="fw-suggestions-portal" style={{
              position:"fixed",
              top: destFieldRef.current.getBoundingClientRect().bottom + 4,
              left: destFieldRef.current.getBoundingClientRect().left,
              width: destFieldRef.current.getBoundingClientRect().width,
              background:"#0d1f35",
              border:"0.5px solid rgba(0,212,200,.3)",
              borderRadius:10,
              zIndex:99999,
              boxShadow:"0 8px 32px rgba(0,0,0,.8)",
              overflow:"hidden"
            }}>
              {destSug.map(a => (
                <div key={a.iata} className="fw-sug-item" onMouseDown={() => pickDest(a)}>
                  <span className="fw-sug-iata">{a.iata}</span>
                  <span className="fw-sug-city">{a.city}, {a.state} — {a.name}</span>
                </div>
              ))}
            </div>,
            document.body
          )}
        </div>
      </div>

      <div className="fw-fields-row">
        <div className="fw-field fw-date-field" onClick={() => depRef.current && depRef.current.showPicker && depRef.current.showPicker()}>
          <div className="fw-label">Depart</div>
          <div className="fw-date-display">{depDate ? new Date(depDate+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "Select date"}</div>
          <input ref={depRef} type="date" className="fw-date-hidden" value={depDate} onChange={e => setDepDate(e.target.value)} />
        </div>
        <div className="fw-field fw-date-field" onClick={() => retRef.current && retRef.current.showPicker && retRef.current.showPicker()}>
          <div className="fw-label">Return</div>
          <div className="fw-date-display">{retDate ? new Date(retDate+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "Select date"}</div>
          <input ref={retRef} type="date" className="fw-date-hidden" value={retDate} onChange={e => setRetDate(e.target.value)} />
        </div>
      </div>

      <div className="fw-pax-row">
        {[["Adults","12+",adults,"adults"],["Children","2–11",children,"children"],["Infants","<2 lap",infants,"infants"]].map(([label,sub,val,type]) => (
          <div key={type} className="fw-pax-box">
            <div className="fw-pax-label">{label}</div>
            <div className="fw-pax-sub">{sub}</div>
            <div className="fw-pax-ctrl">
              <button className="fw-ctrl-btn" onClick={() => chg(type,-1)} disabled={val <= (type==="adults"?1:0)}>−</button>
              <span className="fw-pax-num">{val}</span>
              <button className="fw-ctrl-btn" onClick={() => chg(type,1)}>+</button>
            </div>
          </div>
        ))}
      </div>

      <a className={`fw-search-btn${!link ? " disabled" : ""}`} href={link || "#"} target="_blank" rel="noopener noreferrer" onClick={e => { if (!link) e.preventDefault(); }}>
        Search Flights →
      </a>
      <div className="fw-powered">All airlines · Powered by Aviasales · Best prices guaranteed</div>
    </div>
  );
}

export default function BeachDeals({ deals }) {
  const schemas    = buildSchema(deals);
  const hasDeals   = deals && deals.length > 0;
  const [visible, setVisible] = useState(10);
  const [viewCounts, setViewCounts] = useState({});
  const [openCardId, setOpenCardId] = useState(null);


  useEffect(() => {
    function handleScroll() {
      const el = document.getElementById('floatingHomeTop');
      if (el) el.classList.toggle('visible', window.scrollY > 300);
    }
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch live 72h view counts on every page load — always fresh, never stale
  useEffect(() => {
    fetch("/api/deal-views-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deals: deals.map(d => ({ unit: d.unit, arrival: d.arrival, departure: d.departure }))
      }),
    })
      .then(r => r.json())
      .then(data => { if (data.viewCounts) setViewCounts(data.viewCounts); })
      .catch(() => {});
  }, []);

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
        {/* GTM — fires Clarity only. GA4 fires direct below (GTM has no GA4 tag inside it) */}
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PQSF8S6D');` }} />
        {/* Direct GA4 — same pattern as destin-hub.html */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-3SGXCQ4FTC" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3SGXCQ4FTC');` }} />
        {schemas.map((schema, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        ))}
      </Head>

      {/* Background */}
      <div className="bg-wrap">
        <img src="https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-MediumOriginal" alt="" aria-hidden="true" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", filter: "brightness(0.35) saturate(0.8)" }} />
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
            <a className="active" href="https://deals.destincondogetaways.com/beach-deals">Deals</a>
            <a href="https://explore.destincondogetaways.com/destin-car-rental.html">Flights & Cars</a>
            <a href="https://destin-concierge-new.vercel.app/destin-itinerary-planner.html">Plan Your Trip</a>
          </nav>
          <a className="deals-book" href="https://www.destincondogetaways.com/properties" target="_blank" rel="noopener">🏖️ Book Your Stay</a>
        </header>

        <nav className="deals-mobile-nav" aria-label="Beach deals mobile navigation">
          <a href="https://explore.destincondogetaways.com/destin-hub">Destin Hub</a>
          <a href="https://explore.destincondogetaways.com/destin-tripshock.html">Activities</a>
          <a href="https://www.destincondogetaways.com/properties">Condos</a>
          <a className="active" href="https://deals.destincondogetaways.com/beach-deals">Deals</a>
          <a href="https://explore.destincondogetaways.com/destin-car-rental.html">Flights & Cars</a>
          <a href="https://destin-concierge-new.vercel.app/destin-itinerary-planner.html">Plan Your Trip</a>
        </nav>

      <main className="page">

        {/* Hero */}
        <header className="hero">
          <div className="hero-inner">
            <div className="eyebrow"><span className="live-dot" /> Featured Beach Deals</div>
            <h1>Destin Beachfront <span>Price Drops</span></h1>
            <p className="hero-copy">Featured open dates with recent pricing drops at Pelican Beach Resort — final rates confirmed at checkout.</p>

            <div className="hero-actions">
              <a className="hero-btn hero-btn-gold" href="#current-drops">🏷️ View Current Drops</a>
              <a className="hero-btn hero-btn-teal" href="https://www.destincondogetaways.com/availability" target="_blank" rel="noopener">🏖️ Check Availability</a>
              <a className="hero-btn hero-btn-blue" href="#alerts">📬 Price Drop Alerts</a>
              <a className="hero-btn hero-btn-glass" href="https://explore.destincondogetaways.com/destin-hub">🌊 Destin Hub</a>
            </div>

            <div className="proof">
              <span>⭐ 400+ Five-Star Stays</span>
              <span>🏢 2 Beachfront Units</span>
              <span>💸 10% Direct Booking Savings</span>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat"><div className="stat-num">400+</div><div className="stat-label">Five-Star Stays</div></div>
          <div className="stat-divider" />
          <div className="stat"><div className="stat-num">2</div><div className="stat-label">Beachfront Units</div></div>
          <div className="stat-divider" />
          <div className="stat"><div className="stat-num">10%</div><div className="stat-label">Direct Booking Savings</div></div>
        </div>

        {/* Amenities grid */}
        <div className="amenities-grid">
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


        {/* ── FLIGHT SEARCH WIDGET ─────────────────────────────────────── */}
        <FlightSearch />

        <div id="current-drops" className="section-label">Current Featured Drops</div>

        {/* SEO intro — visible text for Google */}
        <div className="seo-intro">
          <p>These are real-time price drops on our two <strong>beachfront condos at Pelican Beach Resort, Destin FL</strong> — Unit 707 (7th floor, Classic Coastal) and Unit 1006 (10th floor, Fresh Coastal). Both <strong>Pelican Beach Resort condos</strong> sleep up to 6 guests with 1 bedroom, 2 bathrooms, a private Gulf-view balcony, and full kitchen. Minutes from Destin HarborWalk Village, Big Kahuna&apos;s Water Park, and Henderson Beach State Park. When you book direct through <a href="https://www.destincondogetaways.com" style={{color:"var(--teal)"}}>destincondogetaways.com</a>, you skip the 14–20% platform fees charged by Airbnb and VRBO. Prices are tracked daily — drops are calculated against the highest recently recorded rate for each date window.</p>
        </div>

        {/* Deals or no deals */}
        {hasDeals ? (
          <>
            <div className="deals-grid">
              {deals.slice(0, visible).map((deal, i) => <DealCard key={`${deal.unit}-${deal.arrival}`} deal={deal} index={i} initialViews={viewCounts[`${deal.unit}::${deal.arrival}::${deal.departure}`] || 0} openCardId={openCardId} setOpenCardId={setOpenCardId} />)}
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
        {hasDeals && <div id="alerts" className="alerts-anchor"><EmailCapture /></div>}

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

        {/* Amenities grid */}

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


        <div id="floatingHomeTop" className="floating-home-top">
          <a href="https://www.destincondogetaways.com" target="_blank" rel="noopener" aria-label="Home">🏠</a>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">↑</button>
        </div>

      </main>

      <style jsx global>{`
        :root { --green:#39ff14; --green-dark:#2bcc0f; --teal:#00d4c8; --navy:#020b18; --card-bg:rgba(2,18,40,0.82); --card-border:rgba(0,212,200,0.35); --white:#ffffff; --gold:#ffd166; --strike:#ff6b6b; }

        :root { --hub-teal:#47e2d0; --hub-gold:#f3aa34; --hub-blue:#67bfff; --hub-card:rgba(5,22,36,.84); --hub-line:rgba(255,255,255,.12); }
        body { font-family:'Outfit','Barlow',sans-serif; background:#04101d; color:#f7fbff; }
        .bg-wrap img { filter:brightness(0.48) saturate(0.95) contrast(1.04) !important; object-position:center 42% !important; }
        .bg-overlay {
          background:
            radial-gradient(circle at 50% 18%,rgba(71,226,208,.10),transparent 36%),
            linear-gradient(180deg,rgba(3,12,22,.32),rgba(3,12,22,.82) 58%,rgba(3,12,22,.96)),
            linear-gradient(90deg,rgba(3,12,22,.76) 0%,rgba(3,12,22,.18) 30%,rgba(3,12,22,.18) 70%,rgba(3,12,22,.76) 100%) !important;
        }

        .deals-topbar{
          width:min(1180px,calc(100% - 44px));
          margin:22px auto 24px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          position:relative;
          z-index:3;
          color:white;
        }
        .deals-brand{
          line-height:1;text-decoration:none;display:flex;flex-direction:column;gap:2px;white-space:nowrap;
        }
        .deals-brand b{font-size:23px;letter-spacing:.12em;color:#47e2d0;font-weight:900;}
        .deals-brand span{font-size:11px;letter-spacing:.16em;color:rgba(255,255,255,.72);font-weight:800;}
        .deals-nav{display:flex;gap:28px;align-items:center;font-size:14px;font-weight:800;color:rgba(255,255,255,.86);}
        .deals-nav a{text-decoration:none;color:inherit;white-space:nowrap;position:relative;}
        .deals-nav a.active{color:#47e2d0;}
        .deals-nav a.active::after{content:"";position:absolute;left:0;right:0;bottom:-8px;height:2px;background:#47e2d0;box-shadow:0 0 14px rgba(71,226,208,.7);}
        .deals-book{
          display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(243,170,52,.55);
          color:#ffd58a;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:900;
          background:rgba(243,170,52,.08);white-space:nowrap;
        }
        .deals-mobile-nav{
          display:none;
          position:relative;
          z-index:3;
        }
        .alerts-anchor{
          scroll-margin-top:28px;
        }

        .page { max-width:1180px; width:min(1180px,calc(100% - 44px)); padding:0 0 60px; }
        .hero{
          min-height:590px;display:grid;align-items:center;
          border-radius:30px;overflow:hidden;position:relative;margin-bottom:26px;
          background:
            linear-gradient(90deg,rgba(4,16,29,.94),rgba(4,16,29,.55) 48%,rgba(4,16,29,.06)),
            url('https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-MediumOriginal') center/cover;
          border:1px solid rgba(255,255,255,.13);
          box-shadow:0 32px 90px rgba(0,0,0,.35);
          text-align:left;
          animation:fadeDown 0.6s ease both;
        }
        .hero-inner{padding:48px;max-width:730px;position:relative;z-index:2;}
        .eyebrow{
          display:inline-flex;align-items:center;gap:9px;padding:10px 16px;border-radius:999px;
          border:1px solid rgba(71,226,208,.55);background:rgba(71,226,208,.10);
          color:#84fff4;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:22px;
        }
        .hero h1{
          font-family:'Outfit','Barlow Condensed',sans-serif;
          font-size:clamp(48px,6vw,82px);line-height:.95;letter-spacing:-3px;margin:0 0 20px;font-weight:900;text-transform:none;
        }
        .hero h1 span{color:#47e2d0;display:inline;background:none;-webkit-text-fill-color:initial;}
        .hero-copy{font-size:18px;line-height:1.55;color:rgba(255,255,255,.82);max-width:660px;margin-bottom:26px;}
        .hero-actions{display:grid;grid-template-columns:repeat(2,minmax(0,240px));gap:14px;margin-bottom:28px;}
        .hero-btn{
          display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:16px;padding:16px 18px;
          text-decoration:none;font-weight:900;border:1px solid rgba(255,255,255,.12);transition:.18s ease;cursor:pointer;
          font-family:'Outfit',sans-serif;font-size:16px;text-align:center;
        }
        .hero-btn:hover{transform:translateY(-2px);filter:brightness(1.06);}
        .hero-btn-gold{background:linear-gradient(135deg,#e89a20,#ffc04b);color:#161006;border:none;}
        .hero-btn-teal{background:linear-gradient(135deg,#159d97,#5de8d9);color:#061018;border:none;}
        .hero-btn-blue{background:rgba(35,112,196,.24);border-color:rgba(94,178,255,.35);color:#99d2ff;}
        .hero-btn-glass{background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.20);color:white;}
        .proof{display:flex;flex-wrap:wrap;gap:22px;color:rgba(255,255,255,.84);font-weight:700;font-size:14px;}
        .proof span{display:flex;align-items:center;gap:8px;}

        .stats-bar{
          border-radius:26px;background:rgba(5,22,36,.84);border:1px solid rgba(255,255,255,.12);
          box-shadow:0 24px 70px rgba(0,0,0,.28);backdrop-filter:blur(14px);
          padding:22px 28px;margin:0 0 24px;
        }
        .stat-num{font-family:'Outfit',sans-serif;color:#47e2d0;}
        .amenities-grid{
          border-radius:26px;background:rgba(5,22,36,.70);border:1px solid rgba(255,255,255,.12);
          box-shadow:0 24px 70px rgba(0,0,0,.22);backdrop-filter:blur(14px);
          padding:22px;margin-bottom:28px;
        }
        .amenity-icon{background:rgba(71,226,208,.12);border:1px solid rgba(71,226,208,.28);}
        .section-label{
          text-align:left;
          padding:4px 0 14px;
          font-family:'Outfit',sans-serif;
          color:#72fff5;
          font-size:13px;
          letter-spacing:3.2px;
        }
        .seo-intro,.email-capture,.bottom-cta,.seo-faq,.seo-about,.plan-trip,.fine-print{
          border-radius:24px !important;
          background:rgba(5,22,36,.82) !important;
          border:1px solid rgba(255,255,255,.12) !important;
          box-shadow:0 24px 70px rgba(0,0,0,.22) !important;
          backdrop-filter:blur(14px) !important;
        }
        .seo-intro p,.fine-print-row,.seo-faq p,.seo-about p,.host-info p{color:rgba(255,255,255,.70) !important;}
        .seo-faq-title,.seo-about h2,.plan-trip-title,.seo-faq-item h3,.host-info strong{color:#fff !important;}
        .plan-trip-pill{background:rgba(255,255,255,.08) !important;border:1px solid rgba(255,255,255,.12) !important;color:rgba(255,255,255,.82) !important;}
        .deals-grid{grid-template-columns:repeat(3,1fr);gap:16px;}
        .deal-card{border-radius:18px;background:rgba(5,19,33,.92);border:1px solid rgba(255,255,255,.12);}
        .deal-card .card-photo-wrap{border-radius:18px 18px 0 0;}
        .card-body{padding:16px !important;}
        .btn-load-more,.btn-main,.email-btn{
          font-family:'Outfit',sans-serif !important;
          background:linear-gradient(135deg,#e89a20,#ffc04b) !important;
          color:#161006 !important;
          border:none !important;
          font-weight:900 !important;
          border-radius:16px !important;
        }
        .btn-book{
          font-family:'Outfit',sans-serif !important;
          background:linear-gradient(135deg,#159d97,#5de8d9) !important;
          color:#061018 !important;
          border-radius:14px !important;
          font-weight:900 !important;
        }
        .logo-wrap{display:none;}

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
        .amenities-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:32px; }
        .amenity-item { display:flex; align-items:center; gap:10px; }
        .amenity-icon { width:34px; height:34px; border-radius:8px; background:rgba(0,212,200,0.12); border:1px solid rgba(0,212,200,0.25); display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
        .amenity-text { font-size:12px; color:rgba(255,255,255,0.65); line-height:1.3; }
        @media (max-width:600px) { .amenities-grid { grid-template-columns:repeat(2,1fr); } }
        .section-label { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:rgba(255,255,255,0.4); text-align:center; margin-bottom:20px; }
        .deals-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; overflow:visible; }
        .deal-card { background:var(--card-bg); border:1.5px solid var(--card-border); border-radius:16px; backdrop-filter:blur(12px); box-shadow:0 8px 32px rgba(0,0,0,0.5); transition:transform 0.25s ease,box-shadow 0.25s ease,border-color 0.25s ease; animation:fadeUp 0.5s ease both; position:relative; }
        .deal-card .card-photo-wrap { overflow:hidden; border-radius:16px 16px 0 0; }
        .deal-card:hover { transform:translateY(-12px) scale(1.06) !important; box-shadow:0 32px 80px rgba(0,0,0,0.9),0 0 48px rgba(0,212,200,0.5) !important; border-color:rgba(0,212,200,1) !important; z-index:10 !important; }
        .deal-card:target { border-color:rgba(0,212,200,1) !important; scroll-margin-top:80px; animation:highlight-pulse 2s ease-out; }
        @keyframes highlight-pulse { 0%{box-shadow:0 0 0 0 rgba(0,212,200,0.6)} 70%{box-shadow:0 0 0 20px rgba(0,212,200,0)} 100%{box-shadow:0 0 0 0 rgba(0,212,200,0)} }
        .btn-row { display:flex; gap:8px; }
        .btn-book { flex:1; display:block; padding:12px; background:linear-gradient(135deg,#00c4b4,#00a89a); color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; text-align:center; text-decoration:none; border-radius:10px; box-shadow:0 4px 16px rgba(0,196,180,0.35); transition:background 0.2s,transform 0.15s; }
        .deal-purchased-wrap { flex:1; min-height:54px; display:flex; align-items:center; justify-content:center; transform:rotate(-4deg); pointer-events:none; padding:2px 0; }
        .deal-purchased-stamp { position:relative; width:100%; min-height:54px; display:flex; align-items:center; justify-content:center; color:#e01818; border:4px solid #e01818; border-radius:7px; font-family:'Barlow Condensed','Arial Narrow',Impact,sans-serif; font-size:clamp(24px,4.8vw,40px); font-weight:900; letter-spacing:0.075em; line-height:0.88; text-transform:uppercase; text-align:center; background:radial-gradient(circle at 12% 18%,rgba(224,24,24,0.22) 0 1px,transparent 2px),radial-gradient(circle at 38% 72%,rgba(224,24,24,0.18) 0 1px,transparent 2px),radial-gradient(circle at 78% 34%,rgba(224,24,24,0.18) 0 1px,transparent 2px),radial-gradient(circle at 88% 82%,rgba(224,24,24,0.12) 0 1px,transparent 2px),repeating-linear-gradient(-12deg,rgba(224,24,24,0.05) 0 2px,transparent 3px 8px); box-shadow:inset 0 0 0 2px rgba(224,24,24,0.45),0 8px 18px rgba(0,0,0,0.28); opacity:0.96; text-shadow:1px 1px 0 rgba(255,255,255,0.08),-1px -1px 0 rgba(0,0,0,0.10); overflow:hidden; }
        .deal-purchased-stamp::before { content:''; position:absolute; inset:6px; border:2px solid rgba(224,24,24,0.72); border-radius:3px; pointer-events:none; }
        .deal-purchased-stamp::after { content:''; position:absolute; inset:-22%; background:radial-gradient(circle at 10% 20%,transparent 0 3px,rgba(255,255,255,0.18) 4px 5px,transparent 6px),radial-gradient(circle at 28% 68%,transparent 0 2px,rgba(255,255,255,0.18) 3px 4px,transparent 5px),radial-gradient(circle at 62% 38%,transparent 0 3px,rgba(255,255,255,0.16) 4px 5px,transparent 6px),radial-gradient(circle at 88% 74%,transparent 0 2px,rgba(255,255,255,0.16) 3px 4px,transparent 5px),repeating-linear-gradient(100deg,transparent 0 7px,rgba(255,255,255,0.22) 8px 10px,transparent 11px 18px); mix-blend-mode:screen; opacity:0.55; pointer-events:none; }
        .deal-purchased-stamp span { position:relative; z-index:2; display:block; }
        .btn-book:hover { background:linear-gradient(135deg,#00d4c8,#00b8aa); transform:translateY(-1px); }
        .btn-share { display:inline-flex; align-items:center; gap:0; background:rgba(0,212,200,0.1); border:1.5px solid rgba(0,212,200,0.5); border-radius:30px; padding:0 0 0 14px; cursor:pointer; height:42px; overflow:hidden; transition:background 0.2s; flex-shrink:0; }
        .btn-share:hover { background:rgba(0,212,200,0.2); }
        .share-label { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--teal); padding-right:10px; }
        .share-icon-circle { width:40px; height:40px; border-radius:50%; background:rgba(0,212,200,0.2); border-left:1.5px solid rgba(0,212,200,0.4); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .btn-share svg { stroke:var(--teal); }

        .msg-overlay { position:fixed; inset:0; background:rgba(2,11,24,.85); z-index:999; display:flex; align-items:center; justify-content:center; padding:16px; }
        .msg-box { background:#fff; border-radius:16px; width:100%; max-width:420px; max-height:90vh; overflow-y:auto; padding:20px; box-sizing:border-box; }
        .msg-box-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .msg-box-title { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:800; color:#020b18; letter-spacing:.04em; text-transform:uppercase; }
        .msg-close { background:#f0f2f5; border:none; border-radius:50%; width:28px; height:28px; font-size:14px; cursor:pointer; color:#555; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .msg-cal-label { font-size:11px; font-weight:700; color:#020b18; margin-bottom:8px; }
        .msg-cal-nav { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .msg-cal-arrow { background:none; border:1px solid #dde2ea; border-radius:6px; width:28px; height:28px; font-size:16px; cursor:pointer; color:#020b18; display:flex; align-items:center; justify-content:center; }
        .msg-cal-month { font-size:13px; font-weight:700; color:#020b18; }
        .mini-cal { margin-bottom:10px; }
        .mini-cal-head { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:4px; }
        .mini-cal-dow { font-size:10px; font-weight:700; color:#888; text-align:center; padding:2px 0; }
        .mini-cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
        .mini-cal-day { font-size:12px; text-align:center; padding:6px 2px; border-radius:6px; cursor:pointer; color:#0a5c3a; background:#d4f5e2; font-weight:600; transition:background .12s; }
        .mini-cal-day:hover:not(.cal-disabled) { background:#a8ecc4; }
        .cal-disabled { background:#f0f0f0 !important; color:#bbb !important; cursor:not-allowed; text-decoration:line-through; font-weight:400; }
        .cal-selected { background:#00d4c8 !important; color:#020b18 !important; font-weight:700; }
        .cal-inrange { background:#b2f0ea !important; color:#0a5c3a !important; }
        .msg-dates-display { display:flex; align-items:center; margin-bottom:12px; font-size:12px; color:#020b18; }
        .msg-date-chip { background:#e8faf9; color:#0a7c78; font-weight:700; padding:4px 10px; border-radius:20px; }
        .msg-fields { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; }
        .msg-field-row { display:flex; gap:8px; }
        .msg-input { background:#f5f7fa; border:1px solid #dde2ea; border-radius:8px; color:#020b18; font-size:12px; padding:8px 10px; flex:1; min-width:0; box-sizing:border-box; }
        .msg-textarea { background:#f5f7fa; border:1px solid #dde2ea; border-radius:8px; color:#555; font-size:12px; padding:8px 10px; width:100%; box-sizing:border-box; height:54px; resize:none; }
        .msg-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
        .msg-footer-note { font-size:10px; color:#888; }
        .msg-btn-send { background:#00d4c8; color:#020b18; font-size:12px; font-weight:800; padding:9px 20px; border-radius:20px; border:none; cursor:pointer; letter-spacing:.03em; }
        .msg-btn-send:disabled { opacity:.45; cursor:not-allowed; }
        .msg-sent { text-align:center; padding:20px 0; color:#020b18; }
        .msg-sent p { font-size:13px; color:#555; margin:6px 0 16px; }
        @media (max-width:600px) {
          .btn-row { flex-direction:column; gap:8px; }
          .btn-share { width:100%; height:42px; justify-content:space-between; border-radius:30px; padding:0 0 0 16px; }
          .share-icon-circle { display:flex; }
        }
        .views-badge-wrap { position:absolute; top:12px; left:12px; z-index:2; display:flex; flex-direction:row; align-items:center; gap:6px; }
        .views-badge { display:flex; align-items:center; gap:6px; background:#cc0000; border-radius:4px; padding:5px 10px; box-shadow:0 2px 8px rgba(0,0,0,0.4); }
        .views-label { font-family:Arial,sans-serif; font-size:12px; font-weight:700; color:white; letter-spacing:0.5px; }
        .views-count { font-family:Arial,sans-serif; font-size:14px; font-weight:900; color:white; background:#aa0000; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; }
        .hot-pill { display:flex; align-items:center; gap:4px; background:#ff5500; border-radius:4px; padding:5px 10px; box-shadow:0 2px 12px rgba(255,85,0,0.7),0 0 18px rgba(255,85,0,0.4); }
        .hot-label { font-family:Arial,sans-serif; font-size:12px; font-weight:900; color:white; letter-spacing:1px; }
        .sbux-tag-img { position:absolute; bottom:8px; right:15px; z-index:3; width:clamp(60px,20%,90px); pointer-events:none; filter:drop-shadow(0 6px 14px rgba(0,0,0,0.6)); }

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
        .bottom-cta { margin-top:36px; background:rgba(255,255,255,0.06); border:1.5px solid rgba(0,212,200,0.3); border-radius:18px; padding:24px 32px; display:flex; align-items:center; justify-content:space-between; gap:20px; backdrop-filter:blur(8px); animation:fadeUp 0.6s 0.4s ease both; }
        .bottom-cta-left { display:flex; align-items:center; gap:16px; }
        .bottom-cta-left img { height:48px; filter:drop-shadow(0 0 8px rgba(0,212,200,0.4)); }
        .bottom-cta-text strong { display:block; font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:800; text-transform:uppercase; }
        .bottom-cta-text span { font-size:13px; color:rgba(255,255,255,0.55); }
        .btn-main { display:inline-flex; align-items:center; background:linear-gradient(135deg,var(--green),var(--green-dark)); color:#000; font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:800; letter-spacing:1px; text-transform:uppercase; text-decoration:none; padding:14px 28px; border-radius:12px; white-space:nowrap; box-shadow:0 4px 20px rgba(57,255,20,0.4); transition:transform 0.15s,box-shadow 0.2s; }
        .btn-main:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(57,255,20,0.55); }
        .btn-load-more { background: transparent; border: 1.5px solid var(--teal); color: var(--teal); font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:12px 36px; border-radius:10px; cursor:pointer; transition:background 0.2s,transform 0.15s; }
        .btn-load-more:hover { background:rgba(0,212,200,0.1); transform:translateY(-1px); }

        .flight-widget { background:rgba(2,11,24,.95); border:1px solid rgba(0,212,200,.35); border-radius:14px; padding:20px; margin-bottom:28px; }
        .fw-header { display:flex; align-items:center; gap:10px; font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:900; color:#fff; letter-spacing:.04em; margin-bottom:16px; flex-wrap:wrap; }
        .fw-header-sub { font-size:12px; font-weight:400; color:rgba(255,255,255,.4); letter-spacing:.02em; margin-left:4px; }
        .fw-cabin-bar { display:flex; gap:6px; margin-bottom:14px; }
        .fw-cabin-pill { flex:1; text-align:center; padding:8px 0; border-radius:30px; border:0.5px solid rgba(255,255,255,.15); color:rgba(255,255,255,.45); font-size:12px; font-weight:700; cursor:pointer; letter-spacing:.04em; background:transparent; transition:all .15s; }
        .fw-cabin-pill:hover { border-color:rgba(0,212,200,.4); color:rgba(255,255,255,.75); }
        .fw-cabin-pill.active { background:var(--teal); color:#020b18; border-color:var(--teal); }
        .fw-fields-row { display:grid; grid-template-columns:1.3fr 1fr; gap:10px; margin-bottom:10px; position:relative; overflow:visible; }
        .fw-field { background:rgba(255,255,255,.06); border:0.5px solid rgba(255,255,255,.12); border-radius:10px; padding:11px 14px; position:relative; overflow:visible; }
        .fw-label { font-size:10px; color:rgba(255,255,255,.4); font-weight:700; letter-spacing:.07em; text-transform:uppercase; margin-bottom:4px; }
        .fw-input { background:transparent; border:none; color:#fff; font-size:14px; font-weight:700; width:100%; outline:none; font-family:'Barlow Condensed',sans-serif; }
        .fw-input::placeholder { color:rgba(255,255,255,.3); font-weight:400; }
        .fw-select { background:transparent; border:none; color:var(--teal); font-size:14px; font-weight:700; width:100%; outline:none; font-family:'Barlow Condensed',sans-serif; cursor:pointer; }
        .fw-select option { background:#0a1e35; color:#fff; }
        .fw-suggestions { position:absolute; top:calc(100% + 4px); left:0; min-width:100%; background:#0d1f35; border:0.5px solid rgba(0,212,200,.3); border-radius:10px; z-index:99999; overflow:visible; box-shadow:0 8px 32px rgba(0,0,0,.8); }
        .fw-sug-item { display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:pointer; border-bottom:0.5px solid rgba(255,255,255,.06); }
        .fw-sug-item:last-child { border-bottom:none; }
        .fw-sug-item:hover { background:rgba(0,212,200,.08); }
        .fw-sug-iata { font-size:13px; font-weight:900; color:var(--teal); min-width:36px; font-family:'Barlow Condensed',sans-serif; }
        .fw-sug-city { font-size:12px; color:rgba(255,255,255,.65); }
        .fw-pax-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:14px; position:relative; z-index:1; }
        .fw-pax-box { background:rgba(255,255,255,.06); border:0.5px solid rgba(255,255,255,.12); border-radius:10px; padding:11px 14px; }
        .fw-pax-label { font-size:11px; color:#fff; font-weight:700; letter-spacing:.03em; }
        .fw-pax-sub { font-size:10px; color:rgba(255,255,255,.3); margin-bottom:8px; }
        .fw-pax-ctrl { display:flex; align-items:center; justify-content:space-between; }
        .fw-ctrl-btn { width:26px; height:26px; border-radius:50%; border:0.5px solid rgba(255,255,255,.25); background:transparent; color:#fff; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; }
        .fw-ctrl-btn:hover:not(:disabled) { border-color:var(--teal); color:var(--teal); }
        .fw-ctrl-btn:disabled { opacity:.2; cursor:not-allowed; }
        .fw-pax-num { font-size:20px; font-weight:900; color:#fff; font-family:'Barlow Condensed',sans-serif; }
        .fw-search-btn { display:block; background:var(--teal); color:#020b18; font-size:15px; font-weight:900; padding:15px; border-radius:10px; width:100%; text-align:center; cursor:pointer; letter-spacing:.04em; text-decoration:none; font-family:'Barlow Condensed',sans-serif; box-sizing:border-box; }
        .fw-search-btn.disabled { opacity:.45; cursor:not-allowed; }
        .fw-search-btn:hover:not(.disabled) { background:#00bfb4; }
        .fw-date-field { cursor:pointer; }
        .fw-date-display { font-size:14px; font-weight:700; color:#fff; font-family:'Barlow Condensed',sans-serif; }
        .fw-date-field:hover .fw-date-display { color:var(--teal); }
        .fw-date-hidden { position:absolute; opacity:0; width:0; height:0; pointer-events:none; }
        .fw-powered { font-size:10px; color:rgba(255,255,255,.2); text-align:center; margin-top:8px; letter-spacing:.04em; }
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
          .deal-purchased-wrap { width:100%; min-height:44px; }
          .deal-purchased-stamp { min-height:44px; font-size:clamp(14px,5vw,20px); letter-spacing:0.05em; white-space:nowrap; }
          .sbux-tag-img { width:clamp(55px,13%,75px); bottom:30px; right:6px; }
          .views-badge-wrap { flex-direction:column; align-items:flex-start; gap:5px; }
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

        @media(max-width:900px){
          .deals-topbar{display:none;}
          .deals-mobile-nav{
            width:100%;
            max-width:480px;
            margin:0 auto 12px;
            padding:10px 10px;
            display:flex;
            gap:8px;
            overflow-x:auto;
            -webkit-overflow-scrolling:touch;
            background:rgba(4,16,29,.76);
            border:1px solid rgba(255,255,255,.10);
            border-radius:16px;
            backdrop-filter:blur(12px);
            scrollbar-width:none;
          }
          .deals-mobile-nav::-webkit-scrollbar{display:none;}
          .deals-mobile-nav a{
            flex:0 0 auto;
            color:rgba(255,255,255,.84);
            text-decoration:none;
            font-size:13px;
            font-weight:900;
            padding:9px 12px;
            border-radius:999px;
            background:rgba(255,255,255,.06);
            border:1px solid rgba(255,255,255,.10);
            white-space:nowrap;
          }
          .deals-mobile-nav a.active{
            color:#061018;
            background:#47e2d0;
            border-color:transparent;
          }
          .page{width:100%;max-width:480px;padding:0 10px 44px;}
          .hero{
            min-height:560px;border-radius:24px;margin-bottom:18px;background:
              linear-gradient(180deg,rgba(4,16,29,.45),rgba(4,16,29,.94)),
              url('https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-MediumOriginal') center/cover;
          }
          .hero-inner{padding:26px 18px;}
          .hero h1{font-size:48px;letter-spacing:-2px;}
          .hero-copy{font-size:15px;}
          .hero-actions{grid-template-columns:1fr 1fr;gap:10px;}
          .hero-btn{font-size:13px;padding:13px 10px;border-radius:14px;}
          .proof{font-size:12px;gap:12px;}
          .stats-bar{margin:0 6px 18px;padding:18px;}
          .amenities-grid{margin-left:6px;margin-right:6px;padding:16px;}
          .deals-grid{grid-template-columns:1fr 1fr;gap:12px;}
          .section-label{padding-left:6px;}
        }
        @media(max-width:600px){
          .deals-grid{grid-template-columns:1fr;}
        }
        @media(max-width:420px){
          .hero h1{font-size:42px;}
          .hero-actions{grid-template-columns:1fr;}
        }


        .floating-home-top{
          position:fixed;
          bottom:24px;
          right:16px;
          display:none;
          flex-direction:column;
          gap:8px;
          z-index:999;
        }
        .floating-home-top a,
        .floating-home-top button{
          width:44px;
          height:44px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:18px;
          cursor:pointer;
          text-decoration:none;
          backdrop-filter:blur(8px);
        }
        .floating-home-top a{
          background:rgba(255,255,255,0.15);
          border:1px solid rgba(255,255,255,0.25);
          color:#fff;
        }
        .floating-home-top button{
          background:rgba(45,219,180,0.9);
          color:#000;
          border:none;
          box-shadow:0 4px 16px rgba(0,212,200,0.4);
        }
        .floating-home-top.visible{display:flex;}

      `}</style>
    </>
  );
}
