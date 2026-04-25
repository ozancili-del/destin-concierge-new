import { useState, useEffect, useRef } from "react";
import Head from "next/head";

// ── Image pools per unit (OwnerRez CDN) ──────────────────────────────────────
const IMAGES = {
  "707": [
    "https://uc.orez.io/f/242b1d12dd544f7a9debe10583aca308",
    "https://uc.orez.io/i/abaefcc22f0749b49d73dc232abc5430-MediumOriginal",
    "https://uc.orez.io/i/4a4320ef00a54d15bccf6767418be83b-MediumOriginal",
    "https://uc.orez.io/i/3b9692e52bb241aa827c5297abdb0bce-MediumOriginal",
    "https://uc.orez.io/i/399beafa83584661899e9500cb390d6e-MediumOriginal",
    "https://uc.orez.io/i/6007c9a799d44643ae47934f3554808b-MediumOriginal",
    "https://uc.orez.io/f/44060a8a29ca4a998586d849184d288f",
    "https://uc.orez.io/f/e1e624f8d4c14ed2a8f3d05e169252e0",
    "https://uc.orez.io/i/5cd8d28c33e14711a68e723ec300ca2a-MediumOriginal",
    "https://uc.orez.io/i/7da337c1e9334be9a992ff9f666cd8b7-MediumOriginal",
  ],
  "1006": [
    "https://uc.orez.io/i/f20eceb9b43142b48e1f20ac457e7232-MediumOriginal",
    "https://uc.orez.io/f/e5af88bfe30c4243ba03fe79ee2f8229",
    "https://uc.orez.io/i/6108b609ed6046c8bd828f4b5ba19fda-MediumOriginal",
    "https://uc.orez.io/i/4e32883598f649e2869f5d4bb1e1d16f-MediumOriginal",
    "https://uc.orez.io/f/2e389c31f39b43ad97002f607e7c4aef",
    "https://uc.orez.io/f/79bdfd24ee36463396ae08a12e478975",
    "https://uc.orez.io/f/e5038191e8884d3b9c0cb1a40ba2766f",
    "https://uc.orez.io/f/17399809efc54824944e7af6bb55472e",
    "https://uc.orez.io/f/e604a649be3a4d07b58b6f5f07ca92c7",
    "https://uc.orez.io/i/a98c17bc10814f3aa27da0cdbbf81af4-MediumOriginal",
  ],
};

const UNIT_META = {
  "707":  { name: "Unit 707",  sub: "Classic Coastal · 7th Floor",  slug: "pelican-beach-resort-unit-707-orp5b47b5ax" },
  "1006": { name: "Unit 1006", sub: "Fresh Coastal · 10th Floor",   slug: "pelican-beach-resort-unit-1006-orp5b6450ex" },
};

// Fisher-Yates shuffle — keep index 0 fixed, shuffle the rest
function shuffledImages(unit) {
  const imgs = [...IMAGES[unit]];
  const rest = imgs.slice(1);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [imgs[0], ...rest];
}

// Build OwnerRez booking URL
function bookingUrl(unit, arrival, departure) {
  const base = `https://www.destincondogetaways.com/${UNIT_META[unit].slug}`;
  return `${base}?or_arrival=${arrival}&or_departure=${departure}&or_adults=2&or_children=0&or_guests=2`;
}

// Format date: "2026-05-05" → "May 5"
function fmtDate(d) {
  const [, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(day)}`;
}

// ── Carousel component ────────────────────────────────────────────────────────
function Carousel({ unit, index }) {
  const images = useRef(shuffledImages(unit));
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  function goTo(idx) {
    setCurrent((idx + images.current.length) % images.current.length);
  }

  function resetTimer() {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % images.current.length), 3500);
  }

  useEffect(() => {
    const delay = setTimeout(() => resetTimer(), index * 900);
    return () => { clearTimeout(delay); clearInterval(timerRef.current); };
  }, []);

  return (
    <div style={{ position: "relative", height: "200px", overflow: "hidden" }}>
      {/* Track */}
      <div style={{
        display: "flex",
        height: "100%",
        transform: `translateX(-${current * 100}%)`,
        transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
        willChange: "transform",
      }}>
        {images.current.map((src, i) => (
          <div key={i} style={{ minWidth: "100%", height: "100%", flexShrink: 0 }}>
            <img
              src={src}
              alt={i === 0 ? `${UNIT_META[unit].name} beachfront condo` : ""}
              loading={i === 0 ? "eager" : "lazy"}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", display: "block" }}
            />
          </div>
        ))}
      </div>

      {/* Overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, transparent 40%, rgba(2,18,40,0.65) 72%, rgba(2,18,40,0.95) 100%)",
        pointerEvents: "none", zIndex: 1,
      }} />

      {/* Dots */}
      <div style={{ position: "absolute", bottom: 14, right: 10, display: "flex", flexDirection: "column", gap: 4, zIndex: 2 }}>
        {images.current.map((_, i) => (
          <div
            key={i}
            onClick={e => { e.preventDefault(); goTo(i); resetTimer(); }}
            style={{
              width: 5, height: 5, borderRadius: "50%", cursor: "pointer",
              background: i === current ? "#00d4c8" : "rgba(255,255,255,0.3)",
              boxShadow: i === current ? "0 0 6px #00d4c8" : "none",
              transition: "background 0.3s, box-shadow 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Deal card ─────────────────────────────────────────────────────────────────
function DealCard({ deal, index }) {
  const meta = UNIT_META[deal.unit];
  const url  = bookingUrl(deal.unit, deal.arrival, deal.departure);
  const dateLabel = `${deal.arrivalFriendly} – ${deal.departureFriendly} · ${deal.nights} nights`;

  return (
    <div className="deal-card">
      {/* Carousel */}
      <div style={{ position: "relative" }}>
        <Carousel unit={deal.unit} index={index} />
        {/* Drop badge */}
        <div className="drop-badge">{deal.dropPct}%</div>
        {/* Unit overlay */}
        <div className="unit-overlay">
          <div className="unit-name">{meta.name}</div>
          <div className="unit-sub">{meta.sub}</div>
        </div>
      </div>

      {/* Body */}
      <div className="card-body">
        <div className="dates-row">
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
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

// ── Skeleton loader ───────────────────────────────────────────────────────────
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

// ── No deals state ────────────────────────────────────────────────────────────
function NoDeals() {
  return (
    <div className="no-deals">
      <div className="no-deals-icon">🏖️</div>
      <h2 className="no-deals-title">No Price Drops Right Now</h2>
      <p className="no-deals-text">
        Deals come and go quickly — check back soon, or browse live availability directly.<br/>
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BeachDeals() {
  const [deals, setDeals]   = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | empty | error

  useEffect(() => {
    fetch("/api/deals-page")
      .then(r => r.json())
      .then(data => {
        const list = data?.deals || [];
        setDeals(list);
        setStatus(list.length > 0 ? "ok" : "empty");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <>
      <Head>
        <title>Featured Beach Deals — Destin Condo Getaways</title>
        <meta name="description" content="Featured Destin beachfront condo price drops at Pelican Beach Resort. Check current availability for Unit 707 and Unit 1006 — direct booking savings, no OTA fees." />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      {/* Background */}
      <div className="bg-wrap">
        <img
          src="https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-MediumOriginal"
          alt=""
          aria-hidden="true"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", filter: "brightness(0.35) saturate(0.8)" }}
        />
        <div className="bg-overlay" />
      </div>

      <main className="page">

        {/* Header */}
        <header className="header">
          <div className="logo-wrap">
            <img src="/logo.png" alt="Destin Condo Getaways" />
          </div>
          <div className="live-badge">
            <span className="live-dot" />
            Featured Beach Deals
          </div>
          <h1>
            <span className="line1">Destin Beachfront</span>
            <span className="line2">Price Drops</span>
          </h1>
          <p className="subtitle">
            Featured open dates with recent pricing drops —{" "}
            <span>final rates confirmed at checkout.</span>
          </p>
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

        {/* States */}
        {status === "loading" && (
          <div className="deals-grid">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        )}

        {status === "ok" && (
          <div className="deals-grid">
            {deals.map((deal, i) => <DealCard key={`${deal.unit}-${deal.arrival}`} deal={deal} index={i} />)}
          </div>
        )}

        {(status === "empty" || status === "error") && <NoDeals />}

        {/* Bottom CTA */}
        {status === "ok" && (
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
        </div>

      </main>

      <style jsx global>{`
        :root {
          --green: #39ff14;
          --green-dark: #2bcc0f;
          --teal: #00d4c8;
          --navy: #020b18;
          --card-bg: rgba(2,18,40,0.82);
          --card-border: rgba(0,212,200,0.35);
          --white: #ffffff;
          --gold: #ffd166;
          --strike: #ff6b6b;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Barlow', sans-serif; background: var(--navy); color: var(--white); min-height: 100vh; overflow-x: hidden; }

        .bg-wrap { position: fixed; inset: 0; z-index: 0; }
        .bg-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(2,11,24,0.55) 0%, rgba(2,11,24,0.3) 40%, rgba(2,11,24,0.75) 100%); }

        .page { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; padding: 32px 20px 60px; }

        .header { text-align: center; margin-bottom: 32px; animation: fadeDown 0.6s ease both; }
        .logo-wrap { margin-bottom: 16px; }
        .logo-wrap img { height: 56px; filter: drop-shadow(0 0 12px rgba(0,212,200,0.5)); }
        .live-badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg,#0a3d6b,#0d5c8a); border: 1.5px solid var(--teal); border-radius: 30px; padding: 6px 18px; font-family: 'Barlow Condensed',sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--white); margin-bottom: 14px; box-shadow: 0 0 20px rgba(0,212,200,0.3); }
        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green); animation: pulse 1.5s ease-in-out infinite; display: inline-block; }
        h1 { font-family: 'Barlow Condensed',sans-serif; font-size: clamp(48px,8vw,80px); font-weight: 900; line-height: 0.95; text-transform: uppercase; letter-spacing: -1px; }
        .line1 { color: var(--white); display: block; }
        .line2 { display: block; background: linear-gradient(90deg,var(--teal),#7fffff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .subtitle { margin-top: 14px; font-size: 15px; color: rgba(255,255,255,0.72); max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.5; }
        .subtitle span { color: var(--gold); font-weight: 600; }

        .stats-bar { display: flex; justify-content: center; gap: 32px; margin: 24px 0 36px; animation: fadeUp 0.6s 0.2s ease both; }
        .stat { text-align: center; }
        .stat-num { font-family: 'Barlow Condensed',sans-serif; font-size: 28px; font-weight: 800; color: var(--teal); line-height: 1; }
        .stat-label { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
        .stat-divider { width: 1px; background: rgba(255,255,255,0.15); align-self: stretch; }
        .section-label { font-family: 'Barlow Condensed',sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.4); text-align: center; margin-bottom: 20px; }

        .deals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

        .deal-card { background: var(--card-bg); border: 1.5px solid var(--card-border); border-radius: 16px; overflow: hidden; backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0,0,0,0.5); transition: transform 0.2s ease, box-shadow 0.2s ease; animation: fadeUp 0.5s ease both; }
        .deal-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 24px rgba(0,212,200,0.15); border-color: rgba(0,212,200,0.6); }

        .drop-badge { position: absolute; top: 12px; right: 12px; background: var(--green); color: #000; font-family: 'Barlow Condensed',sans-serif; font-size: 22px; font-weight: 900; line-height: 1; padding: 6px 10px; border-radius: 10px; box-shadow: 0 0 16px rgba(57,255,20,0.6); z-index: 2; }
        .unit-overlay { position: absolute; bottom: 12px; left: 14px; z-index: 2; }
        .unit-name { font-family: 'Barlow Condensed',sans-serif; font-size: 20px; font-weight: 800; color: var(--white); text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 1px 6px rgba(0,0,0,0.8); }
        .unit-sub { font-size: 11px; color: var(--teal); font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-top: 1px; }

        .card-body { padding: 12px 16px 18px; }
        .dates-row { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; font-size: 13px; color: rgba(255,255,255,0.65); }
        .price-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .price-was { font-size: 16px; color: var(--strike); text-decoration: line-through; font-weight: 500; opacity: 0.8; }
        .price-arrow { color: rgba(255,255,255,0.4); font-size: 14px; }
        .price-now { font-family: 'Barlow Condensed',sans-serif; font-size: 30px; font-weight: 800; color: var(--white); line-height: 1; }
        .price-now sup { font-size: 14px; font-weight: 600; vertical-align: super; margin-right: 1px; }
        .price-night { font-size: 12px; color: rgba(255,255,255,0.45); margin-left: 2px; font-weight: 400; }
        .btn-book { display: block; width: 100%; padding: 12px; background: linear-gradient(135deg,#00c4b4,#00a89a); color: #fff; font-family: 'Barlow Condensed',sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; text-align: center; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,196,180,0.35); transition: background 0.2s, transform 0.15s; }
        .btn-book:hover { background: linear-gradient(135deg,#00d4c8,#00b8aa); transform: translateY(-1px); }

        .bottom-cta { margin-top: 36px; background: rgba(255,255,255,0.06); border: 1.5px solid rgba(0,212,200,0.3); border-radius: 18px; padding: 24px 32px; display: flex; align-items: center; justify-content: space-between; gap: 20px; backdrop-filter: blur(8px); animation: fadeUp 0.6s 0.4s ease both; }
        .bottom-cta-left { display: flex; align-items: center; gap: 16px; }
        .bottom-cta-left img { height: 48px; filter: drop-shadow(0 0 8px rgba(0,212,200,0.4)); }
        .bottom-cta-text strong { display: block; font-family: 'Barlow Condensed',sans-serif; font-size: 20px; font-weight: 800; text-transform: uppercase; }
        .bottom-cta-text span { font-size: 13px; color: rgba(255,255,255,0.55); }
        .btn-main { display: inline-flex; align-items: center; background: linear-gradient(135deg,var(--green),var(--green-dark)); color: #000; font-family: 'Barlow Condensed',sans-serif; font-size: 16px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; padding: 14px 28px; border-radius: 12px; white-space: nowrap; box-shadow: 0 4px 20px rgba(57,255,20,0.4); transition: transform 0.15s, box-shadow 0.2s; }
        .btn-main:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(57,255,20,0.55); }

        /* No deals */
        .no-deals { text-align: center; padding: 60px 20px; animation: fadeUp 0.5s ease both; }
        .no-deals-icon { font-size: 48px; margin-bottom: 16px; }
        .no-deals-title { font-family: 'Barlow Condensed',sans-serif; font-size: 32px; font-weight: 800; text-transform: uppercase; margin-bottom: 12px; color: var(--white); }
        .no-deals-text { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.6; max-width: 440px; margin: 0 auto 28px; }
        .no-deals-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn-inquiry { display: inline-flex; align-items: center; background: transparent; color: var(--teal); font-family: 'Barlow Condensed',sans-serif; font-size: 16px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; padding: 14px 28px; border-radius: 12px; border: 1.5px solid var(--teal); box-shadow: 0 0 16px rgba(0,212,200,0.2); transition: transform 0.15s, box-shadow 0.2s, background 0.2s; }
        .btn-inquiry:hover { background: rgba(0,212,200,0.1); transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,212,200,0.35); }

        /* Fine print */
        .fine-print { margin-top: 24px; display: flex; flex-direction: column; gap: 8px; padding: 16px 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
        .fine-print-row { display: flex; align-items: flex-start; gap: 8px; font-size: 11px; color: rgba(255,255,255,0.35); line-height: 1.5; }
        .fine-print-row svg { flex-shrink: 0; margin-top: 2px; opacity: 0.5; }

        /* Skeleton shimmer */
        @keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

        /* Mobile */
        @media (max-width: 600px) {
          .deals-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .stats-bar { gap: 20px; }
          .unit-name { font-size: 15px; }
          .unit-sub { font-size: 9px; }
          .dates-row { font-size: 11px; }
          .price-was { font-size: 13px; }
          .price-now { font-size: 22px; }
          .drop-badge { font-size: 17px; padding: 4px 8px; top: 8px; right: 8px; }
          .btn-book { font-size: 12px; padding: 10px; letter-spacing: 0.5px; }
          .bottom-cta { flex-direction: column; text-align: center; padding: 20px; }
        }

        @keyframes fadeDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(20px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse    { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.85); } }
      `}</style>
    </>
  );
}
