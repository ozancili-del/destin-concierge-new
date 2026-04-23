// pages/beach-deals.js
// Live deals page — fetches from /api/deals-page
// URL: destincondogetaways.com/deals (via Cloudflare Worker)

import { useState, useEffect } from 'react';
import Head from 'next/head';

const BOOK_BASE = {
  '707':  'https://www.destincondogetaways.com/unit-707-orp',
  '1006': 'https://www.destincondogetaways.com/unit-1006-orp',
};

function bookingUrl(unit, arrival, departure) {
  return `${BOOK_BASE[unit]}?startdate=${arrival}&enddate=${departure}`;
}

function formatUpdated(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function DealCard({ deal, featured }) {
  return (
    <a
      className={`card${featured ? ' featured' : ''}`}
      href={bookingUrl(deal.unit, deal.arrival, deal.departure)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {featured && <div className="ribbon">🔥 Biggest drop right now</div>}
      <div className="card-top">
        <div className="card-header">
          <div>
            <div className="unit-name">{deal.unitLabel}</div>
            <div className="unit-sub">{deal.unitSub}</div>
          </div>
          <div className={`badge ${deal.dropPct >= 20 ? 'hot' : 'good'}`}>
            ↓ {deal.dropPct}%
          </div>
        </div>
        <div className="dates-row">
          <div className="dates-tag">
            📅 {deal.arrivalFriendly} – {deal.departureFriendly}
          </div>
          <div className="nights">{deal.nights} nights</div>
        </div>
        <div className="pricing">
          <div className="was">${deal.fromPrice}</div>
          <div className="arrow">→</div>
          <div className="now">${deal.toPrice}<span>/night</span></div>
          <div className="savings">
            <div className="save-amt">Save ${deal.totalSavings}</div>
            <div className="save-label">total</div>
          </div>
        </div>
      </div>
      <div className="divider" />
      <div className="card-footer">
        <div className="disclaimer">10% direct discount applied · Before fees & Taxes</div>
        <span className="cta">Book this deal →</span>
      </div>
    </a>
  );
}

export default function BeachDeals() {
  const [deals, setDeals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [updatedAt, setUpdated] = useState('');
  const [error, setError]       = useState(false);

  useEffect(() => {
    fetch('/api/deals-page')
      .then(r => r.json())
      .then(data => {
        setDeals(data.deals || []);
        setUpdated(data.updatedAt || '');
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <>
      <Head>
        <title>Beach Deals — Destin Condo Getaways</title>
        <meta name="description" content="Direct booking deals on beachfront condos in Destin FL. Rates that dropped this week — not on Airbnb or VRBO." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --teal:#0d9488;--teal-d:#0f766e;--ocean:#0c4a6e;
          --bg:#f0f9ff;--dark:#0f172a;--mid:#475569;--light:#94a3b8;
          --green:#16a34a;--green-l:#22c55e;--red:#dc2626;
          --border:#e2e8f0;--card:#ffffff;
        }
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--dark);min-height:100vh;-webkit-font-smoothing:antialiased}

        /* HEADER */
        .hdr{background:#fff;border-bottom:1px solid var(--border);padding:0 20px;height:54px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
        .hdr-logo{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--ocean);text-decoration:none}
        .hdr-btn{background:var(--teal);color:#fff;font-size:13px;font-weight:600;padding:7px 14px;border-radius:8px;text-decoration:none}

        /* HERO */
        .hero{background:linear-gradient(135deg,var(--ocean) 0%,#1e3a5f 60%,#0d4f6b 100%);padding:36px 20px 44px;text-align:center;position:relative;overflow:hidden}
        .hero::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:28px;background:var(--bg);clip-path:ellipse(55% 100% at 50% 100%)}
        .hero-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:4px 12px;margin-bottom:14px}
        .live-dot{width:6px;height:6px;background:var(--green-l);border-radius:50%;animation:pulse 1.2s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}
        .hero-pill span{font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.8)}
        .hero h1{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:#fff;line-height:1.15;margin-bottom:10px}
        .hero h1 em{font-style:normal;color:#5eead4}
        .hero p{font-size:14px;color:rgba(255,255,255,0.65);max-width:300px;margin:0 auto;line-height:1.5}

        /* BODY */
        .body{padding:24px 16px 60px;max-width:500px;margin:0 auto}

        /* META */
        .meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
        .meta-count{font-size:13px;color:var(--mid)}
        .meta-count strong{color:var(--dark)}
        .meta-ts{font-size:10px;color:var(--light)}

        /* CARD */
        .card{background:var(--card);border-radius:16px;overflow:hidden;margin-bottom:12px;box-shadow:0 2px 12px rgba(15,23,42,0.06);border:1px solid var(--border);transition:transform .15s,box-shadow .15s;text-decoration:none;display:block;color:inherit}
        .card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(15,23,42,0.11)}
        .card.featured{border-color:var(--teal);box-shadow:0 2px 16px rgba(13,148,136,0.14)}
        .ribbon{background:var(--teal);padding:6px 16px;font-size:11px;font-weight:600;color:#fff;letter-spacing:0.3px}
        .card-top{padding:16px 16px 12px}
        .card-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px}
        .unit-name{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:var(--dark);margin-bottom:2px}
        .unit-sub{font-size:12px;color:var(--light)}
        .badge{border-radius:20px;padding:3px 9px;font-size:11px;font-weight:700;flex-shrink:0}
        .badge.hot{background:#fef2f2;border:1px solid #fecaca;color:var(--red)}
        .badge.good{background:#f0fdf4;border:1px solid #bbf7d0;color:var(--green)}
        .dates-row{display:flex;align-items:center;gap:8px;margin-bottom:12px}
        .dates-tag{display:flex;align-items:center;gap:5px;background:#f1f5f9;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:600;color:var(--dark)}
        .nights{font-size:11px;color:var(--light)}
        .pricing{display:flex;align-items:center;gap:10px}
        .was{font-size:13px;color:var(--light);text-decoration:line-through}
        .arrow{font-size:11px;color:var(--light)}
        .now{font-size:22px;font-weight:700;color:var(--dark);line-height:1}
        .now span{font-size:13px;font-weight:500;color:var(--mid)}
        .savings{margin-left:auto;text-align:right}
        .save-amt{font-size:14px;font-weight:700;color:var(--green)}
        .save-label{font-size:10px;color:var(--light)}
        .divider{height:1px;background:#f1f5f9;margin:0 16px}
        .card-footer{padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px}
        .disclaimer{font-size:11px;color:var(--light);line-height:1.3;flex:1}
        .cta{background:var(--teal);color:#fff;font-size:13px;font-weight:700;padding:10px 18px;border-radius:10px;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0;text-decoration:none;display:inline-block;transition:background .15s}
        .cta:hover{background:var(--teal-d)}

        /* DESTINY BOX */
        .destiny{background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;padding:18px;margin-top:8px;display:flex;align-items:center;gap:12px}
        .destiny-av{width:40px;height:40px;background:linear-gradient(135deg,var(--teal),var(--ocean));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .destiny-txt{flex:1}
        .destiny-txt strong{display:block;font-size:13px;color:#fff;margin-bottom:2px}
        .destiny-txt p{font-size:12px;color:#94a3b8;line-height:1.4}
        .destiny-btn{background:var(--teal);color:#fff;font-size:12px;font-weight:700;padding:8px 14px;border-radius:8px;text-decoration:none;white-space:nowrap;flex-shrink:0}

        /* EMPTY */
        .empty{text-align:center;padding:48px 20px;color:var(--light)}
        .empty-icon{font-size:40px;margin-bottom:14px}
        .empty h2{font-size:18px;color:var(--mid);margin-bottom:8px}
        .empty p{font-size:14px;line-height:1.5}

        /* LOADING */
        .loading{text-align:center;padding:60px 20px}
        .spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--teal);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 14px}
        @keyframes spin{to{transform:rotate(360deg)}}
        .loading p{font-size:14px;color:var(--light)}
      `}</style>

      <header className="hdr">
        <a href="https://www.destincondogetaways.com" className="hdr-logo">DestinCondoGetaways</a>
        <a href="https://www.destincondogetaways.com" className="hdr-btn">Book Direct</a>
      </header>

      <div className="hero">
        <div className="hero-pill">
          <div className="live-dot" />
          <span>Updated daily</span>
        </div>
        <h1>Direct booking<br /><em>beach deals</em></h1>
        <p>Rates that dropped this week. Only when you book direct — not on Airbnb or VRBO.</p>
      </div>

      <div className="body">

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <p>Finding today's best deals…</p>
          </div>
        )}

        {error && (
          <div className="empty">
            <div className="empty-icon">🌊</div>
            <h2>Couldn't load deals</h2>
            <p>Try refreshing. If it persists contact Ozan at (972) 357-4262.</p>
          </div>
        )}

        {!loading && !error && deals.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🌊</div>
            <h2>No deals right now</h2>
            <p>Prices update daily. Check back tomorrow or ask Destiny Blue to find the best rate for your dates.</p>
          </div>
        )}

        {!loading && !error && deals.length > 0 && (
          <>
            <div className="meta">
              <div className="meta-count"><strong>{deals.length} deal{deals.length !== 1 ? 's' : ''}</strong> available right now</div>
              {updatedAt && <div className="meta-ts">Updated {formatUpdated(updatedAt)}</div>}
            </div>

            {deals.map((deal, i) => (
              <DealCard key={`${deal.unit}-${deal.arrival}-${deal.nights}`} deal={deal} featured={i === 0} />
            ))}

            <div className="destiny">
              <div className="destiny-av">🌊</div>
              <div className="destiny-txt">
                <strong>Need different dates?</strong>
                <p>Ask Destiny Blue — she checks live availability and finds the best rate for you.</p>
              </div>
              <a href="https://www.destincondogetaways.com" className="destiny-btn">Ask →</a>
            </div>
          </>
        )}

      </div>
    </>
  );
}
