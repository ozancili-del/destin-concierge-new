import Head from 'next/head';
import { useState, useEffect } from 'react';

const HERO_IMG = "https://uc.orez.io/i/0f604abce3284748ba8d2150b7646863-MediumOriginal";
const UNIT_707_IMG = "https://uc.orez.io/f/242b1d12dd544f7a9debe10583aca308";
const UNIT_1006_IMG = "https://uc.orez.io/i/f20eceb9b43142b48e1f20ac457e7232-MediumOriginal";

export default function App() {
  const [active, setActive] = useState('home');
  const [blogReady, setBlogReady] = useState(false);
  const [destinyReady, setDestinyReady] = useState(false);
  const [plannerReady, setPlannerReady] = useState(false);
  const [resortReady, setResortReady] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  const tabs = [
    { id: 'home',    label: 'Home',    emoji: '🏠' },
    { id: 'blog',    label: 'Blog',    emoji: '📖' },
    { id: 'destiny', label: 'Destiny', emoji: '💬' },
    { id: 'planner', label: 'Plan',    emoji: '🗺️' },
    { id: 'resort',  label: 'Resort',  emoji: '🏖️' },
  ];

  const tiles = [
    { emoji: '🔥', label: 'Live Deals',     sub: 'Find your condo',    url: 'https://deals.destincondogetaways.com/beach-deals', bg: '#fff0f0' },
    { emoji: '✈️', label: 'Flights & Cars', sub: 'Compare travel',     url: 'https://explore.destincondogetaways.com/destin-car-rental.html', bg: '#f0f7ff' },
    { emoji: '🎟️', label: 'Activities',     sub: 'Book the fun',       url: 'https://explore.destincondogetaways.com/destin-tripshock.html', bg: '#fff5f0' },
    { emoji: '🌊', label: 'Destin Hub',     sub: 'Your local guide',   url: 'https://explore.destincondogetaways.com/destin-hub', bg: '#f0fff8' },
  ];

  return (
    <>
      <Head>
        <title>Destin Condo Getaways</title>
        <meta name="description" content="Your Destin vacation companion — local guide, AI concierge, live deals and trip planner." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0a3d62" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Destin Getaways" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #0a3d62; }

        .app-shell { display: flex; flex-direction: column; height: 100dvh; height: 100vh; }

        /* TOP BAR */
        .top-bar {
          background: #0a3d62;
          padding: max(env(safe-area-inset-top), 12px) 16px 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .top-bar img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }
        .top-bar-text h1 { color: #fff; font-size: 14px; font-weight: 600; line-height: 1.2; }
        .top-bar-text p { color: rgba(255,255,255,0.5); font-size: 11px; }

        /* CONTENT AREA */
        .content-area { flex: 1; position: relative; overflow: hidden; background: #f0f4f8; }
        .tab-panel { position: absolute; inset: 0; display: none; overflow-y: auto; }
        .tab-panel.active { display: block; }

        /* HOME PANEL */
        .home-panel { background: #f0f4f8; min-height: 100%; }

        /* HERO */
        .hero {
          position: relative;
          height: 200px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .hero-img {
          position: absolute;
          inset: 0;
          background-image: url('${HERO_IMG}');
          background-size: cover;
          background-position: center 40%;
          filter: brightness(0.55);
        }
        .hero-content { position: relative; z-index: 1; padding: 0 16px 16px; }
        .hero-content h2 {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          color: white;
          line-height: 1.15;
          margin-bottom: 2px;
        }
        .hero-content p { color: rgba(255,255,255,0.75); font-size: 13px; }

        /* SEARCH BAR */
        .search-wrap { padding: 12px 14px; background: #fff; margin: 0 14px; border-radius: 14px; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); position: relative; z-index: 2; margin-top: -20px; }
        .search-wrap span { color: #aaa; font-size: 13px; flex: 1; }
        .search-icon { width: 28px; height: 28px; border-radius: 50%; background: #0a3d62; display: flex; align-items: center; justify-content: center; }
        .search-icon svg { width: 13px; height: 13px; stroke: white; fill: none; stroke-width: 2; stroke-linecap: round; }

        /* TILES */
        .tiles-wrap { padding: 14px 14px 0; display: flex; gap: 8px; }
        .tile {
          flex: 1;
          background: white;
          border-radius: 14px;
          padding: 10px 6px 10px;
          border: 0.5px solid #e0eaf2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.15s;
          cursor: pointer;
        }
        .tile:active { transform: scale(0.94); }
        .tile-icon { font-size: 22px; line-height: 1; }
        .tile-label { font-size: 10px; font-weight: 600; color: #0a3d62; text-align: center; line-height: 1.2; }
        .tile-sub { font-size: 9px; color: #999; text-align: center; line-height: 1.2; }

        /* SECTION HEADER */
        .section-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 14px 8px; }
        .section-header h3 { font-size: 14px; font-weight: 600; color: #0a3d62; }
        .section-header a { font-size: 11px; color: #1a7a8a; text-decoration: none; }

        /* PROPERTY CARDS */
        .properties-row { display: flex; gap: 10px; padding: 0 14px; overflow: hidden; }
        .prop-card {
          flex: 1;
          background: white;
          border-radius: 14px;
          border: 0.5px solid #e0eaf2;
          overflow: hidden;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
        }
        .prop-img { width: 100%; height: 90px; object-fit: cover; display: block; }
        .prop-info { padding: 8px 10px 10px; }
        .prop-unit { font-size: 10px; font-weight: 600; color: #0a3d62; letter-spacing: 0.05em; text-transform: uppercase; }
        .prop-name { font-size: 12px; font-weight: 500; color: #1a1a2e; margin-top: 1px; }
        .prop-detail { font-size: 10px; color: #999; margin-top: 2px; }
        .prop-badge { display: inline-block; margin-top: 6px; background: #e8f7f4; color: #0a8a6a; font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 20px; }

        /* TRUST BAR */
        .trust-bar { margin: 14px 14px 20px; background: white; border-radius: 14px; border: 0.5px solid #e0eaf2; padding: 10px 8px; display: flex; justify-content: space-around; }
        .trust-item { text-align: center; }
        .trust-icon { font-size: 16px; line-height: 1; margin-bottom: 3px; }
        .trust-label { font-size: 9px; color: #888; font-weight: 500; }

        /* IFRAME PANELS */
        .iframe-wrap { width: 100%; height: 100%; position: relative; }
        .iframe-wrap iframe { width: 100%; height: 100%; border: none; display: block; }
        .loading-screen { position: absolute; inset: 0; background: #f0f4f8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; z-index: 10; }
        .loading-screen.hidden { display: none; }
        .spinner { width: 32px; height: 32px; border: 2.5px solid #dde8f0; border-top-color: #0a3d62; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-screen p { color: #1a6a8a; font-size: 13px; font-family: 'DM Sans', sans-serif; }

        /* BOTTOM NAV */
        .bottom-nav {
          background: #fff;
          border-top: 0.5px solid #e0eaf2;
          display: flex;
          justify-content: space-around;
          padding: 8px 0;
          padding-bottom: max(env(safe-area-inset-bottom, 16px), 16px);
          flex-shrink: 0;
          min-height: 70px;
        }
        .nav-btn { flex: 1; background: none; border: none; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 4px 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .nav-icon { font-size: 20px; line-height: 1; }
        .nav-label { font-size: 10px; color: #bbb; font-weight: 500; font-family: 'DM Sans', sans-serif; }
        .nav-btn.active .nav-label { color: #0a3d62; font-weight: 600; }
        .nav-btn.active .nav-icon { transform: scale(1.1); }
        .nav-dot { width: 4px; height: 4px; border-radius: 50%; background: #0a3d62; opacity: 0; }
        .nav-btn.active .nav-dot { opacity: 1; }
      `}</style>

      <div className="app-shell">

        {/* TOP BAR */}
        <div className="top-bar">
          <img src="/logo.png" alt="Destin Condo Getaways" />
          <div className="top-bar-text">
            <h1>Destin Condo Getaways</h1>
            <p>Pelican Beach Resort · Units 707 & 1006</p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="content-area">

          {/* HOME */}
          <div className={`tab-panel ${active === 'home' ? 'active' : ''}`}>
            <div className="home-panel">

              {/* Hero */}
              <div className="hero">
                <div className="hero-img" />
                <div className="hero-content">
                  <h2>All things Destin.</h2>
                  <p>All in one place.</p>
                </div>
              </div>

              {/* Search bar */}
              <div className="search-wrap">
                <span>Where to next?</span>
                <div className="search-icon">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
              </div>

              {/* 4 tiles */}
              <div className="tiles-wrap">
                {tiles.map(tile => (
                  <a key={tile.label} className="tile" href={tile.url} target="_blank" rel="noreferrer">
                    <span className="tile-icon">{tile.emoji}</span>
                    <span className="tile-label">{tile.label}</span>
                    <span className="tile-sub">{tile.sub}</span>
                  </a>
                ))}
              </div>

              {/* Featured properties */}
              <div className="section-header">
                <h3>Featured Properties</h3>
                <a href="https://www.destincondogetaways.com/availability" target="_blank" rel="noreferrer">View all →</a>
              </div>
              <div className="properties-row">
                <a className="prop-card" href="https://www.destincondogetaways.com/pelican-beach-resort-unit-707-orp5b47b5ax" target="_blank" rel="noreferrer">
                  <img className="prop-img" src={UNIT_707_IMG} alt="Unit 707" />
                  <div className="prop-info">
                    <div className="prop-unit">Unit 707</div>
                    <div className="prop-name">Classic Coastal</div>
                    <div className="prop-detail">7th floor · Gulf view</div>
                    <div className="prop-badge">Book Direct & Save</div>
                  </div>
                </a>
                <a className="prop-card" href="https://www.destincondogetaways.com/pelican-beach-resort-unit-1006-orp5b6450ex" target="_blank" rel="noreferrer">
                  <img className="prop-img" src={UNIT_1006_IMG} alt="Unit 1006" />
                  <div className="prop-info">
                    <div className="prop-unit">Unit 1006</div>
                    <div className="prop-name">Fresh Coastal</div>
                    <div className="prop-detail">10th floor · Gulf view</div>
                    <div className="prop-badge">Book Direct & Save</div>
                  </div>
                </a>
              </div>

              {/* Trust bar */}
              <div className="trust-bar">
                <div className="trust-item"><div className="trust-icon">⭐</div><div className="trust-label">5★ Reviews</div></div>
                <div className="trust-item"><div className="trust-icon">🏖️</div><div className="trust-label">Beachfront</div></div>
                <div className="trust-item"><div className="trust-icon">💬</div><div className="trust-label">AI Concierge</div></div>
                <div className="trust-item"><div className="trust-icon">🔒</div><div className="trust-label">Book Direct</div></div>
              </div>

            </div>
          </div>

          {/* BLOG */}
          <div className={`tab-panel ${active === 'blog' ? 'active' : ''}`}>
            <div className="iframe-wrap">
              {!blogReady && <div className="loading-screen"><div className="spinner"/><p>Loading Destin Guide...</p></div>}
              <iframe src="https://www.destincondogetaways.com/blog" title="Blog" onLoad={() => setBlogReady(true)} loading="lazy" />
            </div>
          </div>

          {/* DESTINY */}
          <div className={`tab-panel ${active === 'destiny' ? 'active' : ''}`}>
            <div className="iframe-wrap">
              {!destinyReady && <div className="loading-screen"><div className="spinner"/><p>Waking up Destiny Blue...</p></div>}
              <iframe src="https://www.destincondogetaways.com/ai-concierge-574036277" title="Destiny Blue" onLoad={() => setDestinyReady(true)} loading="lazy" />
            </div>
          </div>

          {/* PLANNER */}
          <div className={`tab-panel ${active === 'planner' ? 'active' : ''}`}>
            <div className="iframe-wrap">
              {!plannerReady && <div className="loading-screen"><div className="spinner"/><p>Loading Trip Planner...</p></div>}
              <iframe src="https://www.destincondogetaways.com/destin-vacation-itinerary-planner-574049367" title="Trip Planner" onLoad={() => setPlannerReady(true)} loading="lazy" />
            </div>
          </div>

          {/* RESORT */}
          <div className={`tab-panel ${active === 'resort' ? 'active' : ''}`}>
            <div className="iframe-wrap">
              {!resortReady && <div className="loading-screen"><div className="spinner"/><p>Loading Pelican Beach Resort...</p></div>}
              <iframe src="https://www.destincondogetaways.com/pelican-beach-resort-destin-574048693" title="Pelican Beach Resort" onLoad={() => setResortReady(true)} loading="lazy" />
            </div>
          </div>

        </div>

        {/* BOTTOM NAV */}
        <nav className="bottom-nav">
          {tabs.map(tab => (
            <button key={tab.id} className={`nav-btn ${active === tab.id ? 'active' : ''}`} onClick={() => setActive(tab.id)}>
              <span className="nav-icon">{tab.emoji}</span>
              <span className="nav-label">{tab.label}</span>
              <span className="nav-dot" />
            </button>
          ))}
        </nav>

      </div>
    </>
  );
}
