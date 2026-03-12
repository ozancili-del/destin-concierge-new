import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function App() {
  const [active, setActive] = useState('home');
  const [loaded, setLoaded] = useState({});

  // Register service worker for PWA install prompt
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  const tabs = [
    { id: 'home',    label: 'Home',      emoji: '🏠', url: 'https://www.destincondogetaways.com' },
    { id: 'blog',    label: 'Blog',      emoji: '📖', url: 'https://www.destincondogetaways.com/blog' },
    { id: 'destiny', label: 'Destiny',   emoji: '💬', url: 'https://www.destincondogetaways.com/ai-concierge-574036277' },
    { id: 'planner', label: 'Plan Trip', emoji: '🗺️', url: 'https://www.destincondogetaways.com/destin-vacation-itinerary-planner-574049367' },
    { id: 'resort',  label: 'Resort',    emoji: '🏖️', url: 'https://www.destincondogetaways.com/pelican-beach-resort-destin-574048693' },
  ];

  const loadingMessages = {
    home:    'Loading Destin Condo Getaways...',
    blog:    'Loading Destin Guide...',
    destiny: 'Waking up Destiny Blue...',
    planner: 'Loading Trip Planner...',
    resort:  'Loading Pelican Beach Resort...',
  };

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
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #0a3d62;
        }

        .app-shell {
          display: flex;
          flex-direction: column;
          height: 100dvh;
          min-height: 100vh;
        }

        .iframe-area {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #f7f9fb;
        }

        .iframe-wrap {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
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
          top: 0; left: 0; right: 0; bottom: 0;
          background: #f7f9fb;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 10;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #dde8f0;
          border-top-color: #0a3d62;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-screen p {
          color: #1a6a8a;
          font-size: 14px;
        }

        .bottom-nav {
          background: #ffffff;
          border-top: 1px solid #e0eaf2;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding-top: 8px;
          padding-bottom: 8px;
          padding-bottom: max(8px, env(safe-area-inset-bottom));
          flex-shrink: 0;
          z-index: 100;
        }

        .nav-btn {
          flex: 1;
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 6px 0;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }
        .nav-icon {
          font-size: 22px;
          line-height: 1;
          transition: transform 0.15s;
          display: block;
        }
        .nav-label {
          font-size: 10px;
          color: #aaaaaa;
          font-weight: 500;
          display: block;
        }
        .nav-btn.active .nav-label {
          color: #0a3d62;
          font-weight: 700;
        }
        .nav-btn.active .nav-icon {
          transform: scale(1.15);
        }
        .nav-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #0a3d62;
          opacity: 0;
          transition: opacity 0.15s;
          display: block;
        }
        .nav-btn.active .nav-dot {
          opacity: 1;
        }
      `}</style>

      <div className="app-shell">

        <div className="iframe-area">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={'iframe-wrap' + (active === tab.id ? ' active' : '')}
            >
              {!loaded[tab.id] && (
                <div className="loading-screen">
                  <div className="spinner"></div>
                  <p>{loadingMessages[tab.id]}</p>
                </div>
              )}
              <iframe
                src={tab.url}
                title={tab.label}
                onLoad={() => setLoaded(prev => ({ ...prev, [tab.id]: true }))}
                loading="lazy"
              />
            </div>
          ))}
        </div>

        <nav className="bottom-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={'nav-btn' + (active === tab.id ? ' active' : '')}
              onClick={() => setActive(tab.id)}
            >
              <span className="nav-icon">{tab.emoji}</span>
              <span className="nav-label">{tab.label}</span>
              <span className="nav-dot"></span>
            </button>
          ))}
        </nav>

      </div>
    </>
  );
}
