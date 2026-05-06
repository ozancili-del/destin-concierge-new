import Head from 'next/head';

const CANONICAL = 'https://explore.destincondogetaways.com/destin-hub';

export default function DestinHub() {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <title>Destin Florida Local Guide 2026: Beaches, Seafood, Events &amp; Vacation Tips</title>
        <meta name="description" content="Your complete Destin Florida guide — beaches, seafood, live music, fireworks, events, airports, car rental and AI concierge." />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Destin Florida Local Guide 2026: Beaches, Seafood, Events & Vacation Tips" />
        <meta property="og:description" content="Your complete Destin Florida guide — beaches, seafood, live music, fireworks, events, airports, car rental and AI concierge." />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://explore.destincondogetaways.com/hub-hero.png" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PQSF8S6D');` }} />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-3SGXCQ4FTC" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3SGXCQ4FTC');` }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context":"https://schema.org","@type":"WebPage",
          "name":"Destin Florida Local Guide 2026: Beaches, Seafood, Events & Vacation Tips",
          "description":"The complete Destin Florida travel guide for 2026. Best beaches, restaurants, airports, weather, fireworks, events, car rentals and live price drops on beachfront condos at Pelican Beach Resort.",
          "url": CANONICAL,
          "isPartOf":{"@type":"WebSite","name":"Destin Condo Getaways","url":"https://www.destincondogetaways.com"},
          "about":{"@type":"Place","name":"Destin, Florida","address":{"@type":"PostalAddress","addressLocality":"Destin","addressRegion":"FL","addressCountry":"US"}}
        })}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context":"https://schema.org","@type":"BreadcrumbList",
          "itemListElement":[
            {"@type":"ListItem","position":1,"name":"Home","item":"https://www.destincondogetaways.com"},
            {"@type":"ListItem","position":2,"name":"Destin Guide","item": CANONICAL}
          ]
        })}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context":"https://schema.org","@type":"TouristDestination",
          "name":"Destin, Florida",
          "description":"Destin is a coastal city on the Emerald Coast of Florida, known for its emerald green Gulf of Mexico waters, sugar-white quartz sand beaches, world-class fishing, and beachfront vacation rentals including Pelican Beach Resort.",
          "url": CANONICAL,
          "touristType":["Beach vacation","Family travel","Fishing","Watersports"],
          "geo":{"@type":"GeoCoordinates","latitude":30.3865467,"longitude":-86.4733424},
          "address":{"@type":"PostalAddress","addressLocality":"Destin","addressRegion":"FL","addressCountry":"US"},
          "includesAttraction":[
            {"@type":"TouristAttraction","name":"Pelican Beach Resort","address":{"@type":"PostalAddress","streetAddress":"1002 US-98 East","addressLocality":"Destin","addressRegion":"FL"}},
            {"@type":"TouristAttraction","name":"Henderson Beach State Park"},
            {"@type":"TouristAttraction","name":"HarborWalk Village"},
            {"@type":"TouristAttraction","name":"Crab Island"}
          ]
        })}} />
        <style>{`
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#040d1a;color:#fff;font-family:'Outfit',sans-serif;-webkit-font-smoothing:antialiased;}
.page-wrap{max-width:480px;margin:0 auto;background:transparent;min-height:100vh;position:relative;z-index:0;}
body::before{content:'';position:fixed;inset:0;background-image:url('https://uc.orez.io/f/d6016c9e0a064e528087ef01caa56955');background-size:cover;background-position:center 40%;filter:brightness(0.18) saturate(0.85);z-index:-1;}

/* HERO */
.hero{position:relative;min-height:400px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;background-image:url('/hub-hero.png');background-size:cover;background-position:center top;}
.hero::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(4,13,26,0.05) 0%,rgba(4,13,26,0.34) 45%,rgba(4,13,26,0.95) 100%);z-index:1;}
.hero-bg{display:none;}
.hero-content{position:relative;z-index:3;padding:0 18px 30px;}
.hero-badge{display:inline-block;background:rgba(0,196,180,0.18);border:1px solid rgba(0,196,180,0.52);color:#58fff3;font-size:10px;font-weight:800;letter-spacing:2.2px;padding:6px 15px;border-radius:22px;margin-bottom:14px;text-transform:uppercase;box-shadow:0 0 24px rgba(0,196,180,0.12);}
.hero h1{font-size:clamp(30px,7vw,44px);font-weight:900;line-height:1.08;margin-bottom:8px;}
.hero h1 span{color:#00c4b4;}
.hero-sub{font-size:14px;color:rgba(255,255,255,0.76);margin-bottom:24px;max-width:340px;line-height:1.62;}
.hero-sub strong{color:#00c4b4;font-weight:700;}
.hero-btns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:382px;overflow:visible;padding-bottom:0;align-items:stretch;}
.hbtn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:12px 14px;border-radius:14px;font-size:12.5px;font-weight:800;letter-spacing:0.25px;text-decoration:none;cursor:pointer;border:none;font-family:'Outfit',sans-serif;transition:transform 0.15s,filter 0.15s,box-shadow 0.15s;white-space:nowrap;box-shadow:0 10px 24px rgba(0,0,0,0.18);min-width:0;}
.hbtn:hover{transform:translateY(-2px);filter:brightness(1.1);}
.hbtn-gold{background:linear-gradient(135deg,#d9901f,#ffb83d);color:#000;}
.hbtn-teal{background:linear-gradient(135deg,#0b958c,#3fe6d8);color:#001310;}
.hbtn-blue{background:rgba(0,100,200,0.30);color:#72c2ff;border:1px solid rgba(90,180,255,0.34);}

@media(max-width:370px){
  .hero-btns{grid-template-columns:1fr;max-width:260px;}
  .hbtn{padding:11px 13px;}
}

/* FEATURED */
.featured{margin:20px 16px 18px;border-radius:20px;overflow:hidden;border:1px solid rgba(245,166,35,0.38);background:#0d1520;box-shadow:0 18px 45px rgba(0,0,0,0.28);}
.feat-img-wrap{position:relative;height:165px;overflow:hidden;}
.feat-img-wrap img{width:100%;height:100%;object-fit:cover;object-position:center;}
.feat-overlay{position:absolute;inset:0;background:linear-gradient(to right,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.2) 55%,transparent 100%);display:flex;flex-direction:column;justify-content:center;padding:18px 20px;}
.feat-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(245,166,35,0.92);color:#000;font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;margin-bottom:8px;width:fit-content;text-transform:uppercase;letter-spacing:0.5px;}
.feat-title{font-size:24px;font-weight:900;color:#fff;margin-bottom:5px;text-shadow:0 2px 12px rgba(0,0,0,0.45);}
.feat-sub{font-size:12px;color:rgba(255,255,255,0.78);}
.feat-pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}
.feat-pill{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.8);font-size:10px;font-weight:600;padding:4px 9px;border-radius:20px;}
.feat-foot{padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.feat-foot-txt{font-size:12.5px;color:rgba(255,255,255,0.62);line-height:1.4;}
.feat-cta{background:linear-gradient(135deg,#d9901f,#ffb83d);color:#000;border:none;font-family:'Outfit',sans-serif;font-size:13px;font-weight:900;padding:12px 20px;border-radius:12px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:transform 0.15s,filter .15s;box-shadow:0 10px 24px rgba(245,166,35,0.26);}
.feat-cta:hover{transform:scale(1.04);}

/* SECTION LABEL */
.sec-lbl{font-size:10.5px;font-weight:800;letter-spacing:2.3px;text-transform:uppercase;color:rgba(255,255,255,0.52);padding:24px 18px 14px;}

/* CARD GRID */
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:0 16px;}
.card{background:#071628;border:1px solid rgba(255,255,255,0.09);border-radius:18px;overflow:hidden;cursor:pointer;transition:transform 0.2s,border-color 0.2s,box-shadow .2s;text-decoration:none;display:block;box-shadow:0 10px 24px rgba(0,0,0,0.20);}
.card:hover{transform:translateY(-4px);border-color:rgba(0,196,180,0.5);box-shadow:0 16px 36px rgba(0,196,180,0.12);}
.card:active{transform:scale(0.97);}
.card-img{width:100%;height:90px;object-fit:cover;object-position:center;display:block;background:#0a1e30;}
.card-body{padding:11px 11px 14px;}
.card-title{font-size:14px;font-weight:800;color:#fff;margin-bottom:4px;line-height:1.18;}
.card-desc{font-size:10.5px;color:rgba(255,255,255,0.58);line-height:1.42;margin-bottom:9px;}
.card-cta{font-size:10.5px;color:#33eadc;font-weight:800;display:flex;align-items:center;gap:3px;}

/* AI STRIP */
.ai-strip{margin:22px 16px 0;background:linear-gradient(135deg,#04152a,#071628);border:1px solid rgba(0,196,180,0.22);border-radius:20px;padding:16px;display:flex;align-items:center;gap:14px;box-shadow:0 14px 36px rgba(0,0,0,0.22);}
.ai-avatar{width:50px;height:50px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid rgba(0,196,180,0.3);}
.ai-text h3{font-size:15px;font-weight:700;margin-bottom:3px;}
.ai-text p{font-size:11px;color:rgba(255,255,255,0.62);line-height:1.45;}
.ai-btn{background:rgba(0,196,180,0.12);border:1px solid rgba(0,196,180,0.35);color:#00c4b4;font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;padding:9px 15px;border-radius:10px;white-space:nowrap;cursor:pointer;flex-shrink:0;transition:background 0.15s;}
.ai-btn:hover{background:rgba(0,196,180,0.22);}

/* FOOTER BAR */
.footer-bar{margin:20px 16px 0;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
.fi{text-align:center;padding:12px 6px;}
.fi-icon{font-size:20px;margin-bottom:5px;}
.fi-lbl{font-size:9px;font-weight:700;color:rgba(255,255,255,0.5);line-height:1.3;text-transform:uppercase;letter-spacing:0.5px;}
.fi-sub{font-size:8px;color:rgba(255,255,255,0.3);line-height:1.3;margin-top:2px;}

/* SEO CONTENT */
.content{padding:24px 18px 0;}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(3,13,20,0.85);z-index:1000;display:flex;align-items:flex-end;opacity:0;pointer-events:none;transition:opacity .25s;}
.modal-overlay.open{opacity:1;pointer-events:all;}
@media(min-width:600px){.modal-overlay{align-items:center;justify-content:center;}.modal-sheet{width:90%!important;max-width:860px!important;border-radius:20px!important;transform:scale(0.95)!important;}.modal-overlay.open .modal-sheet{transform:scale(1)!important;}}
.modal-sheet{background:#0a1a27;width:100%;max-height:92vh;border-radius:24px 24px 0 0;border-top:1px solid rgba(255,255,255,0.08);overflow:hidden;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .32s cubic-bezier(.4,0,.2,1);touch-action:none;}
.modal-overlay.open .modal-sheet{transform:translateY(0);}
.modal-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.15);margin:10px auto 0;flex-shrink:0;}
.modal-header{background:linear-gradient(135deg,#071220,#0a2440);padding:12px 18px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.06);}
.modal-eyebrow{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.35);}
.modal-title{font-family:'Playfair Display',serif;font-size:20px;color:white;font-weight:700;}
.modal-header-right{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.modal-fullpage{display:inline-flex;align-items:center;gap:5px;border-radius:20px;padding:6px 12px;font-size:12px;font-weight:600;color:white;cursor:pointer;white-space:nowrap;border:none;animation:discoBall 1.2s ease-in-out infinite;}
@keyframes discoBall{0%{background:linear-gradient(90deg,#e8341a,#ff8c00);box-shadow:0 0 8px rgba(232,52,26,0.6);}25%{background:linear-gradient(90deg,#ff8c00,#ffcc00);box-shadow:0 0 8px rgba(255,200,0,0.6);}50%{background:linear-gradient(90deg,#0d9e8a,#00cfff);box-shadow:0 0 8px rgba(0,207,255,0.6);}75%{background:linear-gradient(90deg,#7c5cbf,#ff3399);box-shadow:0 0 8px rgba(124,92,191,0.6);}100%{background:linear-gradient(90deg,#e8341a,#ff8c00);box-shadow:0 0 8px rgba(232,52,26,0.6);}}
.modal-fullpage:hover{transform:scale(1.05);animation:none;background:#0d9e8a;}
.modal-close{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.modal-close:hover{background:rgba(255,255,255,0.15);}
.modal-body{flex:1;overflow:hidden;position:relative;}
.modal-iframe{width:100%;height:100%;border:none;display:block;min-height:calc(92vh - 80px);}
@media(min-width:600px){.modal-iframe{min-height:calc(88vh - 80px);}}
.modal-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#07141f;flex-direction:column;gap:12px;}
.loading-spinner{width:36px;height:36px;border:2px solid rgba(13,158,138,0.2);border-top-color:#0d9e8a;border-radius:50%;animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.loading-text{font-size:13px;color:rgba(255,255,255,0.35);}
.back-to-top{position:fixed;bottom:24px;right:20px;background:rgba(45,219,180,0.9);color:#000;border:none;border-radius:50%;width:44px;height:44px;font-size:18px;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,212,200,0.4);z-index:999;transition:opacity 0.3s;}
.back-to-top.visible{display:flex;}
        `}</style>
      </Head>

      <div className="page-wrap">
      {/* HERO */}
      <div className="hero">
        <div className="hero-bg" style={{backgroundImage:"url('/hub-hero.png')"}}></div>
        <div className="hero-content">
          <div className="hero-badge">✦ Everything for your Destin trip</div>
          <h1>Plan Your<br /><span>Destin Trip</span></h1>
          <p className="hero-sub">Unlock the best deals, compare flights, discover activities, get beach info, and let <strong>Destiny Blue</strong> help every step.</p>
          <div className="hero-btns">
            <button className="hbtn hbtn-gold" onClick={() => openModal('deals')}>🏷️ Best Deals</button>
            <button className="hbtn hbtn-teal" onClick={() => openModal('gettinghere')}>✈️ Flights & Cars</button>
            <button className="hbtn hbtn-blue" onClick={() => openModal('activities')}>🐬 Activities</button>
            <a className="hbtn" href="https://www.destincondogetaways.com" target="_blank" rel="noopener" style={{background:'rgba(255,255,255,0.12)',color:'#fff',border:'1px solid rgba(255,255,255,0.24)'}}>🏠 Condos</a>
          </div>
        </div>
      </div>

      {/* FEATURED DEALS */}
      <div className="featured">
        <div className="feat-img-wrap">
          <img src="/hub-deals.png" alt="Best Deals — Destin Condo Getaways" loading="lazy" />
          <div className="feat-overlay">
            <div className="feat-badge">⭐ Featured</div>
            <div className="feat-title">Best Deals</div>
            <div className="feat-sub">Live price drops on beachfront condos</div>
            <div className="feat-pills">
              <span className="feat-pill">🏷️ Exclusive Discounts</span>
              <span className="feat-pill">🔔 Price Drop Alerts</span>
              <span className="feat-pill">✅ Verified Deals</span>
            </div>
          </div>
        </div>
        <div className="feat-foot">
          <div className="feat-foot-txt">Direct rates · No platform fees · Save up to 30%</div>
          <button className="feat-cta" onClick={() => openModal('deals')}>View Deals →</button>
        </div>
      </div>

      {/* CARD GRID */}
      <div className="sec-lbl">Explore Destin</div>
      <div className="grid">
        <div className="card" onClick={() => openModal('beaches')}>
          <img className="card-img" src="/hub-beaches.png" alt="Beaches" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Beaches</div>
            <div className="card-desc">Best spots for families, sunsets and relaxation.</div>
            <div className="card-cta">Explore →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('weather')}>
          <img className="card-img" src="/hub-weather.png" alt="Water & Weather" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Water &amp; Weather</div>
            <div className="card-desc">Forecasts &amp; conditions to plan the perfect beach day.</div>
            <div className="card-cta">Explore →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('cams')}>
          <img className="card-img" src="/hub-beachcam.png" alt="Beach Cams" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Beach Cams</div>
            <div className="card-desc">Live views of Destin's beaches and the Emerald Coast.</div>
            <div className="card-cta">Watch Now →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('seafood')}>
          <img className="card-img" src="/hub-seafood.png" alt="Seafood" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Seafood</div>
            <div className="card-desc">Waterfront dining &amp; fresh catches you'll love.</div>
            <div className="card-cta">Explore →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('localeats')}>
          <img className="card-img" src="/hub-eats.png" alt="Local Eats" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Local Eats</div>
            <div className="card-desc">Tacos, pizza, hidden gems and local favorites.</div>
            <div className="card-cta">Explore →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('spas')}>
          <img className="card-img" src="/hub-spa.png" alt="Spas" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Spas</div>
            <div className="card-desc">Top-rated resort treatments to relax and recharge.</div>
            <div className="card-cta">Explore →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('music')}>
          <img className="card-img" src="/hub-music.png" alt="Live Music" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Live Music</div>
            <div className="card-desc">Nightly live music at top spots across Destin.</div>
            <div className="card-cta">Explore →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('fireworks')}>
          <img className="card-img" src="/hub-fireworks.png" alt="Fireworks" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Fireworks</div>
            <div className="card-desc">Catch dazzling fireworks over the harbor.</div>
            <div className="card-cta">Explore →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('events')}>
          <img className="card-img" src="/hub-events.png" alt="Events 2026" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Events 2026</div>
            <div className="card-desc">Concerts, fishing rodeos, festivals &amp; more all year long.</div>
            <div className="card-cta">Explore →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('airports')}>
          <img className="card-img" src="/hub-airports.png" alt="Airports" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Airports</div>
            <div className="card-desc">VPS is 15 mins away. Check wait times, tips &amp; more.</div>
            <div className="card-cta">Explore →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('gettinghere')}>
          <img className="card-img" src="/hub-flights-cars.png" alt="Flights & Cars" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Flights &amp; Cars</div>
            <div className="card-desc">Compare fares to VPS, ECP and PNS. Best rental prices.</div>
            <div className="card-cta">Compare →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('deals')} style={{borderColor:'rgba(245,166,35,0.35)'}}>
          <img className="card-img" src="/hub-deals.png" alt="Best Deals" loading="lazy" />
          <div className="card-body">
            <div className="card-title" style={{color:'#f5a623'}}>Best Deals</div>
            <div className="card-desc">Live price drops on condos, activities and more.</div>
            <div className="card-cta" style={{color:'#f5a623'}}>View Deals →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('grocery')}>
          <img className="card-img" src="/hub-groceries.png" alt="Groceries" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Groceries</div>
            <div className="card-desc">Publix, Walmart &amp; Winn-Dixie all within 10 mins.</div>
            <div className="card-cta">Explore →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('planner')}>
          <img className="card-img" src="/hub-planner.png" alt="Trip Planner" loading="lazy" />
          <div className="card-body">
            <div className="card-title">Trip Planner</div>
            <div className="card-desc">Build your perfect itinerary in minutes.</div>
            <div className="card-cta">Plan Now →</div>
          </div>
        </div>
        <div className="card" onClick={() => openModal('activities')} style={{borderColor:'rgba(240,120,60,0.35)'}}>
          <img className="card-img" src="/hub-activities.png" alt="Activities & Tours" loading="lazy" />
          <div className="card-body">
            <div className="card-title" style={{color:'#f0997b'}}>Activities &amp; Tours</div>
            <div className="card-desc">Dolphin cruises, snorkeling, jet ski rentals, parasailing.</div>
            <div className="card-cta" style={{color:'#f0997b'}}>Explore →</div>
          </div>
        </div>
      </div>

      {/* AI CONCIERGE STRIP */}
      <div className="ai-strip">
        <img className="ai-avatar" src="/destiny_hero.jpg" alt="Destiny Blue AI Concierge" />
        <div className="ai-text">
          <h3>AI Concierge</h3>
          <p>Ask Destiny Blue anything about your Destin trip — availability, local tips, booking help, 24/7.</p>
        </div>
        <button className="ai-btn" onClick={() => openModal('destiny')}>Chat Now →</button>
      </div>

      {/* FOOTER BAR */}
      <div className="footer-bar">
        <div className="fi"><div className="fi-icon">📍</div><div className="fi-lbl">Local Insights</div><div className="fi-sub">From locals who know Destin best.</div></div>
        <div className="fi"><div className="fi-icon">💰</div><div className="fi-lbl">Save More</div><div className="fi-sub">Exclusive deals &amp; price drop alerts.</div></div>
        <div className="fi"><div className="fi-icon">🌊</div><div className="fi-lbl">All In One Place</div><div className="fi-sub">Flights, stays, activities and more.</div></div>
        <div className="fi"><div className="fi-icon">✨</div><div className="fi-lbl">AI-Powered</div><div className="fi-sub">Destiny Blue personalizes your perfect trip.</div></div>
      </div>

      {/* SEO CONTENT — preserved from original */}
      <div className="content">
        <div style={{marginTop:'8px',padding:'24px 20px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'16px'}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'20px',color:'white',margin:'0 0 12px',lineHeight:'1.3'}}>Everything You Need for a Destin Trip — In One Place</h2>
          <p style={{fontSize:'14px',color:'rgba(255,255,255,0.55)',lineHeight:'1.8',margin:'0 0 12px'}}>We built this guide after hosting over 400 groups of guests at <strong style={{color:'rgba(255,255,255,0.8)'}}>Pelican Beach Resort, Destin FL</strong>. Every question they asked — where to eat, which beach, what airport, how to find deals — is answered here.</p>
          <p style={{fontSize:'14px',color:'rgba(255,255,255,0.55)',lineHeight:'1.8',margin:'0 0 24px'}}><strong style={{color:'rgba(255,255,255,0.8)'}}>Destin, Florida</strong> sits on the Emerald Coast — named for the emerald green Gulf of Mexico waters and sugar-white quartz sand beaches. It is consistently ranked among the best beach destinations in the United States.</p>

          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'17px',color:'rgba(255,255,255,0.85)',margin:'0 0 10px'}}>🏖 Best Beaches in Destin</h2>
          <ul style={{fontSize:'14px',color:'rgba(255,255,255,0.55)',lineHeight:'1.8',margin:'0 0 12px',paddingLeft:'20px'}}>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>Henderson Beach State Park</strong> — pristine shoreline, nature trails, entry fee $4/vehicle.</li>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>Crystal Beach</strong> — calm, shallow waters ideal for families with young children.</li>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>James Lee Park</strong> — free parking, restrooms, lifeguards in season.</li>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>Pelican Beach Resort</strong> — private beach access for guests. No road to cross.</li>
          </ul>
          <div style={{background:'rgba(0,212,200,0.06)',borderLeft:'3px solid rgba(0,212,200,0.4)',padding:'10px 14px',borderRadius:'0 8px 8px 0',marginBottom:'12px'}}>
            <span style={{fontSize:'11px',letterSpacing:'1px',textTransform:'uppercase',color:'rgba(0,212,200,0.7)',fontFamily:'Arial'}}>💡 Local Insight</span>
            <p style={{fontSize:'13px',color:'rgba(255,255,255,0.5)',margin:'4px 0 0',lineHeight:'1.6'}}>Avoid the main boardwalk crowds — head to James Lee Park before 9 AM for free parking. Henderson Beach is worth the entry fee for the quiet and the nature trail.</p>
          </div>
          <p style={{fontSize:'14px',color:'rgba(255,255,255,0.55)',lineHeight:'1.8',margin:'0 0 20px'}}><a href="https://www.destincondogetaways.com/blog/best-beaches-destin" style={{color:'rgba(0,212,200,0.8)',textDecoration:'none',fontWeight:'600'}}>Read our full Destin beaches guide →</a></p>

          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'17px',color:'rgba(255,255,255,0.85)',margin:'0 0 10px'}}>✈️ Destin Travel Logistics: Airports & Getting Here</h2>
          <p style={{fontSize:'14px',color:'rgba(255,255,255,0.55)',lineHeight:'1.8',margin:'0 0 12px'}}>Three airports serve the Destin area. VPS is the closest but has limited routes. ECP has more flights and is often cheaper. PNS is the largest hub with the most airline options. <a href="https://www.destincondogetaways.com/blog/destinairport" style={{color:'rgba(0,212,200,0.8)',textDecoration:'none',fontWeight:'600'}}>See our full airport comparison →</a></p>

          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'17px',color:'rgba(255,255,255,0.85)',margin:'0 0 10px'}}>🌤 Destin Weather & Best Time to Visit</h2>
          <p style={{fontSize:'14px',color:'rgba(255,255,255,0.55)',lineHeight:'1.8',margin:'0 0 12px'}}>Destin has warm weather year-round. Peak season is June–August with water temps reaching 84°F. Spring and fall offer fewer crowds with still-pleasant conditions. <a href="https://www.destincondogetaways.com/blog/destinweather" style={{color:'rgba(0,212,200,0.8)',textDecoration:'none',fontWeight:'600'}}>Read our full Destin weather guide →</a></p>

          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'17px',color:'rgba(255,255,255,0.85)',margin:'0 0 10px'}}>🦞 Best Restaurants in Destin</h2>
          <ul style={{fontSize:'14px',color:'rgba(255,255,255,0.55)',lineHeight:'1.8',margin:'0 0 12px',paddingLeft:'20px'}}>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>AJ's Seafood & Oyster Bar</strong> — iconic HarborWalk spot, waterfront views, live music most nights.</li>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>Boshamps Seafood</strong> — best harbor sunset view in Destin.</li>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>Pompano Joe's</strong> — casual beachfront, great for lunch after the beach.</li>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>The Back Porch</strong> — oldest beach bar in Destin, open deck over the Gulf.</li>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>Dewey Destin's</strong> — locals' favorite for fresh-off-the-boat fish at the harbor.</li>
          </ul>
          <p style={{fontSize:'14px',color:'rgba(255,255,255,0.55)',lineHeight:'1.8',margin:'0 0 20px'}}><a href="https://www.destincondogetaways.com/blog/best-restaurants-destin" style={{color:'rgba(0,212,200,0.8)',textDecoration:'none',fontWeight:'600'}}>Read our full restaurant guide →</a></p>

          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'17px',color:'rgba(255,255,255,0.85)',margin:'0 0 10px'}}>🎆 Seasonal Events & Fireworks 2026</h2>
          <ul style={{fontSize:'14px',color:'rgba(255,255,255,0.55)',lineHeight:'1.8',margin:'0 0 12px',paddingLeft:'20px'}}>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>4th of July Fireworks</strong> — over Destin Harbor, one of the best on the Gulf Coast.</li>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>Destin Fishing Rodeo</strong> — entire month of October, the oldest fishing tournament in Florida.</li>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>Emerald Coast Blue Marlin Classic</strong> — June, world-class offshore fishing tournament.</li>
            <li><strong style={{color:'rgba(255,255,255,0.75)'}}>HarborWalk Village Events</strong> — live music, boat shows, and festivals throughout summer.</li>
          </ul>
          <p style={{fontSize:'14px',color:'rgba(255,255,255,0.55)',lineHeight:'1.8',margin:'0 0 20px'}}><a href="https://www.destincondogetaways.com/blog/destin-fireworks-2026" style={{color:'rgba(0,212,200,0.8)',textDecoration:'none',fontWeight:'600'}}>Fireworks guide</a> · <a href="https://www.destincondogetaways.com/blog/destin-events-2026" style={{color:'rgba(0,212,200,0.8)',textDecoration:'none',fontWeight:'600'}}>Events 2026 →</a></p>
        </div>

        {/* DEALS CTA */}
        <div style={{marginTop:'24px',padding:'24px 20px',background:'linear-gradient(135deg,rgba(0,212,200,0.08),rgba(0,212,200,0.03))',border:'1.5px solid rgba(0,212,200,0.3)',borderRadius:'16px',textAlign:'center'}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'18px',color:'white',margin:'0 0 10px'}}>🏷️ Live Price Drops — Book Direct & Save</h2>
          <p style={{fontSize:'14px',color:'rgba(255,255,255,0.55)',lineHeight:'1.7',margin:'0 0 16px'}}>We track daily price changes on Unit 707 and Unit 1006 at Pelican Beach Resort. When prices drop we surface them here — no Airbnb fees, no VRBO markup, direct from the owner.</p>
          <a href="https://deals.destincondogetaways.com/beach-deals" style={{display:'inline-block',padding:'13px 28px',background:'linear-gradient(135deg,#00c4b4,#00a89a)',color:'#fff',fontFamily:'Arial',fontSize:'14px',fontWeight:'bold',borderRadius:'10px',textDecoration:'none',boxShadow:'0 4px 16px rgba(0,196,180,0.4)',marginRight:'10px'}}>See Today's Price Drops →</a>
          <a href="https://www.destincondogetaways.com" style={{display:'inline-block',padding:'13px 28px',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.7)',fontFamily:'Arial',fontSize:'14px',fontWeight:'bold',borderRadius:'10px',textDecoration:'none',border:'1px solid rgba(255,255,255,0.2)'}}>Book Direct →</a>
        </div>

        {/* FAQ */}
        <div style={{marginTop:'24px',padding:'24px 20px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'16px',marginBottom:'32px'}}>
          <div style={{fontSize:'11px',letterSpacing:'2px',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginBottom:'20px',fontFamily:'Arial'}}>Frequently Asked Questions</div>
          {[
            {q:'What are the best beaches in Destin FL?',a:'Henderson Beach State Park, Crystal Beach, and James Lee Park are the top picks. All feature white quartz sand and emerald green Gulf waters the Emerald Coast is known for.'},
            {q:'What airport do you fly into for Destin Florida?',a:'VPS (Destin-Fort Walton Beach) is closest at 15 minutes. ECP (Panama City Beach) is 45 minutes with more flight options. PNS (Pensacola) is 1 hour with the most airlines.'},
            {q:'What is the best time to visit Destin Florida?',a:'May through October for warm water and beach weather. June–August is peak season. Spring and fall offer lower prices with still-pleasant temperatures and fewer crowds.'},
            {q:'Do you need a car in Destin Florida?',a:'Yes — public transportation is limited. Most attractions are spread along US-98. Renting a car at VPS, ECP, or PNS is recommended.'},
            {q:"What are the best restaurants in Destin Florida?",a:"AJ's Seafood & Oyster Bar, Boshamps Seafood, Pompano Joe's, and The Back Porch. HarborWalk Village has numerous waterfront dining options within walking distance."},
            {q:'How do I find cheap flights to Destin Florida?',a:'Compare fares to VPS, ECP, and PNS. Booking 6–8 weeks ahead and flying midweek yields the best prices. ECP and PNS typically have more competitive fares than VPS.'},
          ].map((item, i, arr) => (
            <div key={i} style={{marginBottom: i < arr.length-1 ? '16px' : '0', paddingBottom: i < arr.length-1 ? '16px' : '0', borderBottom: i < arr.length-1 ? '1px solid rgba(255,255,255,0.06)' : 'none'}}>
              <h3 style={{fontSize:'14px',fontWeight:'600',color:'rgba(0,212,200,0.9)',margin:'0 0 6px',fontFamily:'Arial'}}>{item.q}</h3>
              <p style={{fontSize:'13px',color:'rgba(255,255,255,0.5)',lineHeight:'1.6',margin:'0'}}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      </div>{/* /page-wrap */}

      {/* MODAL */}
      <div className="modal-overlay" id="modalOverlay" onClick={(e) => { if(e.target===document.getElementById('modalOverlay')) closeModal(); }}>
        <div className="modal-sheet" id="modalSheet">
          <div className="modal-handle"></div>
          <div className="modal-header">
            <div>
              <div className="modal-eyebrow" id="modalEyebrow">Destin, Florida</div>
              <div className="modal-title" id="modalTitle">Loading...</div>
            </div>
            <div className="modal-header-right">
              <button className="modal-fullpage" id="modalBlogBtn2" onClick={() => toggleBlog2()} style={{display:'none'}}>Local Guide →</button>
              <button className="modal-fullpage" id="modalBlogBtn" onClick={() => toggleBlog()} style={{display:'none'}}>Read full guide →</button>
              <button className="modal-close" onClick={() => closeModal()}>✕</button>
            </div>
          </div>
          <div className="modal-body">
            <div className="modal-loading" id="modalLoading">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading...</div>
            </div>
            <iframe className="modal-iframe" id="modalIframe" src="" onLoad={() => iframeLoaded()} style={{opacity:0,transition:'opacity .3s'}}></iframe>
          </div>
        </div>
      </div>

      <div id="backToTop" style={{position:'fixed',bottom:'24px',right:'16px',display:'none',flexDirection:'column',gap:'8px',zIndex:999}}>
        <a href="https://www.destincondogetaways.com" target="_blank" rel="noopener" style={{width:'44px',height:'44px',borderRadius:'50%',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',textDecoration:'none'}}>🏠</a>
        <button onClick={() => window.scrollTo({top:0,behavior:'smooth'})} style={{width:'44px',height:'44px',borderRadius:'50%',background:'rgba(45,219,180,0.9)',color:'#000',border:'none',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,212,200,0.4)'}}>↑</button>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
const TILES={
  beaches:   {eyebrow:'Explore',         title:'🏖️ Beaches',           url:'https://www.destincondogetaways.com/blog/best-beaches-destin',blog:null},
  weather:   {eyebrow:'Live Conditions', title:'🌊 Water & Weather',    url:'https://destin-concierge-new.vercel.app/destin-beach-conditions.html',blog:'https://www.destincondogetaways.com/blog/destinweather'},
  cams:      {eyebrow:'Live',            title:'📷 Beach Cams',         url:'https://www.destincondogetaways.com/destin-live-beach-cam-574002656',blog:null},
  seafood:   {eyebrow:'Food & Drink',    title:'🦞 Seafood',            url:'https://www.destincondogetaways.com/blog/best-restaurants-destin',blog:null},
  localeats: {eyebrow:'Food & Drink',    title:'🍝 Local Eats',         url:'https://www.destincondogetaways.com/blog/best-restaurants-destin-local-guide',blog:null},
  spas:      {eyebrow:'Relax',           title:'💆 Spas',               url:'https://www.destincondogetaways.com/blog/destinspa',blog:null},
  music:     {eyebrow:'Nightlife',       title:'🎵 Live Music',         url:'https://destin-concierge-new.vercel.app/destin-music-calendar.html',blog:'https://www.destincondogetaways.com/blog/destin-live-music-2026'},
  fireworks: {eyebrow:'Events',          title:'🎆 Fireworks',          url:'https://www.destincondogetaways.com/blog/destin-fireworks-2026',blog:null},
  events:    {eyebrow:'Events',          title:'📅 Events 2026',        url:'https://www.destincondogetaways.com/blog/destin-events-2026',blog:null},
  airports:  {eyebrow:'Flights & Cars',  title:'✈️ Airports',           url:'https://www.destincondogetaways.com/blog/destinairport',blog:null},
  gettinghere:{eyebrow:'Flights & Cars', title:'🚗✈️ Flights & Cars',   url:'https://destin-concierge-new.vercel.app/destin-car-rental.html',blog:'https://www.destincondogetaways.com/blog/how-to-find-cheaper-flights-and-car-rentals',blog2:'https://www.destincondogetaways.com/blog/destincar'},
  deals:     {eyebrow:'Direct Booking',  title:'🏷️ Best Deals',         url:'https://deals.destincondogetaways.com/beach-deals',blog:'https://deals.destincondogetaways.com/beach-deals'},
  grocery:   {eyebrow:'Essentials',      title:'🛒 Groceries',          url:'https://destin-concierge-new.vercel.app/supermarket-map.html',blog:'https://www.destincondogetaways.com/blog/destinsupermarkets'},
  planner:   {eyebrow:'Plan Your Stay',  title:'🗺️ Trip Planner',       url:'https://destin-concierge-new.vercel.app/destin-itinerary-planner.html',blog:null},
  activities:{eyebrow:'Things To Do',    title:'🐬 Activities & Tours', url:'https://destin-concierge-new.vercel.app/destin-tripshock.html',blog:null},
  destiny:   {eyebrow:'AI Concierge',    title:'💬 Destiny Blue',       url:'https://destin-concierge-new.vercel.app/concierge',blog:null},
};
var currentTile=null,showingBlog=false;
function openModal(key){
  if(navigator.vibrate)navigator.vibrate(8);
  gtag('event','tile_click',{tile_name:key});
  var tile=TILES[key];if(!tile)return;
  currentTile=key;showingBlog=false;
  document.getElementById('modalEyebrow').textContent=tile.eyebrow;
  document.getElementById('modalTitle').textContent=tile.title;
  updateBlogBtn();loadIframe(tile.url);
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function updateBlogBtn(){
  var tile=TILES[currentTile];
  var btn=document.getElementById('modalBlogBtn');
  var btn2=document.getElementById('modalBlogBtn2');
  if(!tile){btn.style.display='none';btn2.style.display='none';return;}
  if(showingBlog){btn.style.display='inline-flex';btn.textContent='← Back';btn2.style.display='none';}
  else if(tile.blog){
    btn.style.display='inline-flex';
    btn.textContent=currentTile==='gettinghere'?'Flights guide →':'Read full guide →';
    if(tile.blog2){btn2.style.display='inline-flex';btn2.textContent=currentTile==='gettinghere'?'Car rental guide →':'Local Guide →';}
    else{btn2.style.display='none';}
  }else{btn.style.display='none';btn2.style.display='none';}
}
function toggleBlog(){var tile=TILES[currentTile];if(!tile||!tile.blog)return;showingBlog=!showingBlog;loadIframe(showingBlog?tile.blog:tile.url);updateBlogBtn();}
function toggleBlog2(){var tile=TILES[currentTile];if(!tile||!tile.blog2)return;showingBlog=true;loadIframe(tile.blog2);updateBlogBtn();}
function loadIframe(url){document.getElementById('modalLoading').style.display='flex';var f=document.getElementById('modalIframe');f.style.opacity='0';f.src=url;}
function iframeLoaded(){document.getElementById('modalLoading').style.display='none';document.getElementById('modalIframe').style.opacity='1';}
function closeModal(){
  document.getElementById('modalSheet').style.transform='';
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow='';currentTile=null;showingBlog=false;
  setTimeout(function(){var f=document.getElementById('modalIframe');f.src='';f.style.opacity='0';document.getElementById('modalLoading').style.display='flex';},300);
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
var touchStartY=0,sheet=document.getElementById('modalSheet');
sheet.addEventListener('touchstart',function(e){touchStartY=e.touches[0].clientY;},{passive:true});
sheet.addEventListener('touchmove',function(e){var dy=e.touches[0].clientY-touchStartY;if(dy>0)sheet.style.transform='translateY('+dy+'px)';},{passive:true});
sheet.addEventListener('touchend',function(e){var dy=e.changedTouches[0].clientY-touchStartY;if(dy>80){closeModal();}else{sheet.style.transition='transform 0.3s ease';sheet.style.transform='';}});
window.addEventListener('scroll',function(){var el=document.getElementById('backToTop');if(el){el.style.display=window.scrollY>300?'flex':'none';}});
      `}} />
    </>
  );
}
