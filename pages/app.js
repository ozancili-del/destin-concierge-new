import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function App() {
  const [active, setActive] = useState('home');
  const [homeReady, setHomeReady] = useState(false);
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
    { id: 'home',    label: 'Home',      emoji: '🏠' },
    { id: 'blog',    label: 'Blog',      emoji: '📖' },
    { id: 'destiny', label: 'Destiny',   emoji: '💬' },
    { id: 'planner', label: 'Plan Trip', emoji: '🗺️' },
    { id: 'resort',  label: 'Resort',    emoji: '🏖️' },
  ];

  return (
    <>
      <Head>
        <title>Destin Condo Getaways</title>
        <meta name="description" content="Your Destin vacation companion — local guide, AI concierge, and trip planner." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0a3d62" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Destin Getaways" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a3d62; }

        .app-shell {
          display: flex;
          flex-direction: column;
          height: 100dvh;
          height: 100vh;
        }

        .top-bar {
          background: #0a3d62;
          padding: env(safe-area-inset-top, 12px) 20px 10px;
          padding-top: max(env(safe-area-inset-top), 12px);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .top-bar img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }
        .top-bar-text h1 {
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.2;
        }
        .top-bar-text p {
          color: rgba(255,255,255,0.55);
          font-size: 11px;
        }

        .iframe-area {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #f7f9fb;
        }

        .iframe-wrap {
          position: absolute;
          inset: 0;
          display: none;
        }
        .iframe-wrap.active {
          display: block;
        }
        .iframe-wrap iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        .loading-screen {
          position: absolute;
          inset: 0;
          background: #f7f9fb;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 10;
        }
        .loading-screen.hidden { display: none; }
        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #dde8f0;
          border-top-color: #0a3d62;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-screen p {
          color: #1a6a8a;
          font-size: 13px;
        }

        .bottom-nav {
          background: #fff;
          border-top: 0.5px solid #e0eaf2;
          display: flex;
          justify-content: space-around;
          padding: 10px 0;
          padding-bottom: max(env(safe-area-inset-bottom, 20px), 20px);
          flex-shrink: 0;
          min-height: 80px;
        }
        .nav-btn {
          flex: 1;
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 4px 0;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .nav-btn .nav-icon { font-size: 22px; line-height: 1; }
        .nav-btn .nav-label {
          font-size: 10px;
          color: #aaa;
          font-weight: 500;
        }
        .nav-btn.active .nav-label { color: #0a3d62; font-weight: 600; }
        .nav-btn.active .nav-icon { transform: scale(1.1); }
        .nav-btn .nav-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #0a3d62;
          opacity: 0;
        }
        .nav-btn.active .nav-dot { opacity: 1; }
      `}</style>

      <div className="app-shell">
        {/* Top bar */}
        <div className="top-bar">
          <img src="/logo.png" alt="Destin Condo Getaways logo" />
          <div className="top-bar-text">
            <h1>Destin Condo Getaways</h1>
            <p>Pelican Beach Resort · Units 707 & 1006</p>
          </div>
        </div>

        {/* iframe area */}
        <div className="iframe-area">

          {/* HOME */}
          <div className={`iframe-wrap ${active === 'home' ? 'active' : ''}`}>
            {!homeReady && (
              <div className="loading-screen">
                <div className="spinner" />
                <p>Loading Destin Condo Getaways...</p>
              </div>
            )}
            <iframe
              src="https://www.destincondogetaways.com"
              title="Home"
              onLoad={() => setHomeReady(true)}
              loading="lazy"
            />
          </div>

          {/* BLOG */}
          <div className={`iframe-wrap ${active === 'blog' ? 'active' : ''}`}>
            {!blogReady && (
              <div className="loading-screen">
                <div className="spinner" />
                <p>Loading Destin Guide...</p>
              </div>
            )}
            <iframe
              src="https://www.destincondogetaways.com/blog"
              title="Destin Blog"
              onLoad={() => setBlogReady(true)}
              loading="lazy"
            />
          </div>

          {/* DESTINY */}
          <div className={`iframe-wrap ${active === 'destiny' ? 'active' : ''}`}>
            {!destinyReady && (
              <div className="loading-screen">
                <div className="spinner" />
                <p>Waking up Destiny Blue...</p>
              </div>
            )}
            <iframe
              src="https://www.destincondogetaways.com/ai-concierge-574036277"
              title="Destiny Blue AI Concierge"
              onLoad={() => setDestinyReady(true)}
              loading="lazy"
            />
          </div>

          {/* TRIP PLANNER */}
          <div className={`iframe-wrap ${active === 'planner' ? 'active' : ''}`}>
            {!plannerReady && (
              <div className="loading-screen">
                <div className="spinner" />
                <p>Loading Trip Planner...</p>
              </div>
            )}
            <iframe
              src="https://www.destincondogetaways.com/destin-vacation-itinerary-planner-574049367"
              title="Destin Trip Planner"
              onLoad={() => setPlannerReady(true)}
              loading="lazy"
            />
          </div>

          {/* RESORT */}
          <div className={`iframe-wrap ${active === 'resort' ? 'active' : ''}`}>
            {!resortReady && (
              <div className="loading-screen">
                <div className="spinner" />
                <p>Loading Pelican Beach Resort...</p>
              </div>
            )}
            <iframe
              src="https://www.destincondogetaways.com/pelican-beach-resort-destin-574048693"
              title="Pelican Beach Resort"
              onLoad={() => setResortReady(true)}
              loading="lazy"
            />
          </div>

        </div>

        {/* Bottom nav */}
        <nav className="bottom-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-btn ${active === tab.id ? 'active' : ''}`}
              onClick={() => setActive(tab.id)}
            >
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
