import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

export async function getServerSideProps({ params }) {
  const { slug } = params;
  try {
    const { data: unit } = await supabase
      .from('guestview_units')
      .select('*')
      .ilike('tv_url', `%${slug}`)
      .single();
    if (!unit) return { notFound: true };
    const { data: userProfile } = await supabase
      .from('guestview_users')
      .select('mock_mode, brand_name, logo_url, tagline, name, phone, website')
      .eq('id', unit.user_id)
      .single();
    let booking = null;
    if (userProfile?.mock_mode) {
      const { data: mock } = await supabase
        .from('guestview_mock_bookings')
        .select('*')
        .eq('unit_id', unit.id)
        .single();
      if (mock) booking = { guestFirstName: mock.guest_first_name, arrival: mock.arrival, departure: mock.departure };
    }
    const nowISO = new Date().toISOString();
    const { data: announcements } = await supabase
      .from('guestview_announcements')
      .select('message')
      .eq('user_id', unit.user_id)
      .eq('building', unit.building)
      .lte('starts_at', nowISO)
      .gte('expires_at', nowISO)
      .limit(1);
    return {
      props: {
        unit,
        booking,
        announcement: announcements?.[0]?.message || null,
        isMock: userProfile?.mock_mode || false,
        brandName: userProfile?.brand_name || unit.host_name || 'Your Host',
        logoUrl: userProfile?.logo_url || null,
        tagline: userProfile?.tagline || 'Your vacation rental concierge',
        profileName: userProfile?.name || '',
        profilePhone: userProfile?.phone || '',
        profileWebsite: userProfile?.website || ''
      }
    };
  } catch (err) {
    console.error('Preview page error:', err);
    return { notFound: true };
  }
}

export default function TVPreview({ unit, booking, announcement, isMock, brandName, logoUrl, tagline, profileName, profilePhone, profileWebsite }) {
  const accentColor = unit.accent_color || '#48cae4';
  const headline = unit.headline || `${unit.building} · Unit ${unit.unit_number} · Destin, Florida`;
  const wifiName = unit.wifi_name || 'WiFi Network';
  const wifiPass = unit.wifi_password || '--------';
  const checkoutTime = unit.checkout_time || '10:00 AM';
  const hostName = unit.host_name || profileName || '';
  const hostPhone = unit.host_phone || profilePhone || '';
  const hostWebsite = unit.host_website || profileWebsite || '';
  const affiliateUrl = unit.affiliate_url || 'https://www.tripshock.com/?aff=destindreamcondo';
  const guestName = booking?.guestFirstName || 'Guest';
  const departure = booking?.departure
    ? new Date(booking.departure + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/Chicago' })
    : '—';
  const BASE = 'https://destin-concierge-new.vercel.app';
  const brandParts = brandName.split(' ');
  const brandFirst = brandParts.slice(0, -1).join(' ');
  const brandLast = brandParts.slice(-1)[0];
  const brandHtml = brandFirst ? `${brandFirst} <span>${brandLast}</span>` : `<span>${brandLast}</span>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${unit.building} · Unit ${unit.unit_number}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@200;300;400;500&display=swap" rel="stylesheet"/>
<script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
:root{--bg:#071321;--panel:rgba(255,255,255,0.03);--line:rgba(255,255,255,0.08);--soft:rgba(255,255,255,0.55);--faint:rgba(255,255,255,0.28);--teal:${accentColor};--green:#4ade80;--gold:#f6c453;--violet:#a78bfa;--coral:#f87171;}
html,body{width:1920px;height:1080px;background:radial-gradient(circle at 15% 20%,#103255 0%,var(--bg) 45%,#040a12 100%);transition:background 2s ease;color:#fff;font-family:'DM Sans',system-ui,sans-serif;overflow:hidden;}
body{transform-origin:top left;}
${isMock ? `.preview-banner{position:fixed;top:0;left:0;right:0;background:rgba(246,196,83,0.15);border-bottom:1px solid rgba(246,196,83,0.3);padding:6px 24px;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:rgba(246,196,83,0.9);z-index:100;}` : ''}
.waves{position:absolute;inset:0;pointer-events:none;opacity:0.04;}
.screen{width:1920px;height:1080px;padding:${isMock ? '42px' : '28px'} 40px 24px;display:grid;grid-template-rows:175px 1fr 96px;gap:18px;position:relative;}
.header{display:grid;grid-template-columns:1fr 400px;gap:20px;background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:0 36px;}
.eyebrow{font-size:14px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:10px;}
h1{font-family:'Cormorant Garamond',serif;font-size:52px;font-weight:300;line-height:1;letter-spacing:-1px;}
h1 span{color:var(--teal);}
.welcome-msg{font-family:'Cormorant Garamond',serif;font-size:17px;font-style:italic;color:var(--soft);margin-top:6px;line-height:1.4;max-width:900px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;}
.status{display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right;gap:8px;}
.brand{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;}
.brand span{color:var(--teal);}
.tagline{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:var(--faint);}
.pill{display:inline-flex;align-items:center;gap:8px;background:rgba(72,202,228,0.1);border:1px solid rgba(72,202,228,0.2);border-radius:20px;padding:7px 16px;font-size:13px;color:var(--teal);}
.dot{width:7px;height:7px;border-radius:50%;background:var(--teal);animation:blink 2s infinite;}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:0.3;}}
@keyframes pulse-live{0%,100%{box-shadow:0 0 6px var(--green);}50%{box-shadow:0 0 14px var(--green),0 0 24px rgba(74,222,128,0.4);}}
.main-grid{display:grid;grid-template-columns:420px 1fr 320px;gap:20px;}
.card{background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:22px;display:flex;flex-direction:column;gap:12px;}
.sec-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--faint);}
.beach-card{background:linear-gradient(145deg,#0369a1 0%,#0284c7 100%);border:none;}
.day-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;flex:1;}
.moment{border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:0;border:1px solid var(--line);}
.moment.morning{background:rgba(246,196,83,0.04);border-color:rgba(246,196,83,0.15);}
.moment.afternoon{background:rgba(72,202,228,0.04);border-color:rgba(72,202,228,0.15);}
.moment.evening{background:rgba(167,139,250,0.04);border-color:rgba(167,139,250,0.15);}
.moment-head{display:flex;align-items:center;gap:10px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:10px;}
.m-icon{font-size:24px;}
.m-title{font-size:15px;font-weight:500;letter-spacing:1px;text-transform:uppercase;}
.m-time{font-size:11px;color:var(--soft);}
.split-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;margin-top:8px;}
.moment.morning .split-label{color:var(--gold);}
.moment.afternoon .split-label{color:var(--teal);}
.moment.evening .split-label{color:var(--violet);}
.rec-item{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
.rec-name{font-size:16px;color:#fff;font-family:'Cormorant Garamond',serif;font-weight:400;}
.rec-meta{font-size:11px;color:var(--faint);}
.loading-recs{font-family:'Cormorant Garamond',serif;font-size:17px;font-style:italic;color:var(--faint);text-align:center;padding:20px 0;}
.essentials-card{justify-content:space-between;}
.essential{border-radius:14px;padding:14px;}
.essential.blue{background:rgba(72,202,228,0.08);border:1px solid rgba(72,202,228,0.2);}
.essential.green{background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);}
.e-label{font-size:10px;text-transform:uppercase;letter-spacing:3px;color:var(--soft);margin-bottom:6px;}
.e-network{font-size:17px;font-weight:400;color:#fff;margin-bottom:3px;}
.e-password{font-size:13px;color:var(--teal);}
.e-checkout{font-size:26px;font-weight:300;color:#86efac;letter-spacing:1px;}
.e-sub{font-size:11px;color:rgba(255,255,255,0.3);margin-top:4px;}
.announcement-card{background:rgba(246,196,83,0.08);border:1px solid rgba(246,196,83,0.25);border-radius:12px;padding:12px 14px;}
.announcement-label{font-size:10px;text-transform:uppercase;letter-spacing:3px;color:rgba(246,196,83,0.6);margin-bottom:6px;}
.announcement-text{font-size:13px;color:rgba(255,255,255,0.85);line-height:1.5;}
.divider{height:1px;background:var(--line);margin:4px 0;}
.qr-single{display:flex;flex-direction:column;align-items:center;gap:8px;background:rgba(255,255,255,0.03);border:1px solid var(--line);border-radius:16px;padding:14px;}
.qr-img{width:100px;height:100px;background:#fff;border-radius:8px;padding:7px;display:flex;align-items:center;justify-content:center;}
.qr-lbl{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:300;color:rgba(255,255,255,0.7);text-align:center;line-height:1.3;}
.qr-sub{font-size:10px;color:var(--faint);text-align:center;letter-spacing:1px;}
.host-row{display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--line);}
.host-label{font-size:10px;color:var(--faint);letter-spacing:1px;text-transform:uppercase;}
.host-num{font-size:13px;color:var(--soft);}
.footer{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;}
.forecast{background:var(--panel);border:1px solid var(--line);border-radius:18px;display:flex;align-items:center;justify-content:center;gap:16px;padding:0 20px;}
.forecast .wx{font-size:36px;line-height:1;}
.f-day{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--faint);margin-bottom:3px;}
.f-temp{font-size:24px;font-weight:500;line-height:1;margin-bottom:2px;}
.f-low{font-size:11px;color:var(--faint);}
.f-desc{font-size:12px;color:var(--soft);}
.checkout-banner{background:linear-gradient(135deg,rgba(246,196,83,0.15),rgba(246,196,83,0.05));border:1px solid rgba(246,196,83,0.3);border-radius:16px;padding:16px 20px;text-align:center;}
.checkout-banner p{font-family:'Cormorant Garamond',serif;font-size:20px;font-style:italic;color:var(--gold);line-height:1.5;}
</style>
</head>
<body>
${isMock ? `<div class="preview-banner"><span>Preview mode · sample guest data</span><span>${unit.building} · Unit ${unit.unit_number}</span></div>` : ''}
<canvas id="starCanvas" style="position:absolute;inset:0;width:1920px;height:1080px;pointer-events:none;opacity:0;transition:opacity 1.5s ease;z-index:1;"></canvas>
<svg class="waves" viewBox="0 0 1920 1080" preserveAspectRatio="none"><path d="M0 280 Q480 220 960 280 Q1440 340 1920 280" stroke="white" stroke-width="2" fill="none"/><path d="M0 380 Q480 320 960 380 Q1440 440 1920 380" stroke="white" stroke-width="1" fill="none"/></svg>
<div class="screen">
<header class="header">
  <div style="display:flex;flex-direction:column;justify-content:center;gap:6px;">
    <div class="eyebrow">${headline}</div>
    <h1><span id="welcomePrefix" style="display:none;"></span><span id="guestName">Good afternoon, ${guestName}</span></h1>
    <div class="welcome-msg" id="welcomeMsg">Welcome to ${unit.building}. We hope you enjoy your stay.</div>
  </div>
  <div class="status">
    <div style="display:flex;align-items:center;gap:16px;">
      ${logoUrl
        ? `<img src="${logoUrl}" style="width:110px;height:130px;border-radius:14px;object-fit:cover;border:2px solid rgba(72,202,228,0.5);flex-shrink:0;" alt="${brandName}"/>`
        : ''
      }
      <div>
        <div class="brand">${brandHtml}</div>
        <div class="tagline">${tagline}</div>
      </div>
    </div>
    <div class="pill"><span class="dot"></span><span id="clockDisplay">—</span></div>
  </div>
</header>
<div class="main-grid">
  <div class="card beach-card" style="padding:16px;overflow:hidden;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div class="sec-label" style="color:rgba(255,255,255,0.75);">🌊 Live Gulf Conditions</div>
      <span id="bc-badge" style="font-size:9px;background:rgba(255,255,255,0.2);color:#fff;border-radius:20px;padding:3px 10px;letter-spacing:1px;">LOADING...</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:7px;">
      <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 6px;text-align:center;"><div style="font-size:11px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:1px;">Water</div><div style="font-size:22px;font-weight:800;color:#fff;" id="bc-water">--°F</div></div>
      <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 6px;text-align:center;"><div style="font-size:11px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:1px;">Air</div><div style="font-size:22px;font-weight:800;color:#fff;" id="bc-air">--°F</div></div>
      <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 6px;text-align:center;"><div style="font-size:11px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:1px;">Humidity</div><div style="font-size:22px;font-weight:800;color:#fff;" id="bc-hum">--%</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:7px;">
      <div style="background:rgba(255,255,255,0.12);border-radius:10px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:10px;color:rgba(255,255,255,0.6);">Wind</div><div style="font-size:12px;font-weight:700;color:#fff;" id="bc-wind">-- mph</div></div><span style="font-size:16px;">🌬️</span></div>
      <div style="background:rgba(255,255,255,0.12);border-radius:10px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:10px;color:rgba(255,255,255,0.6);">Pressure</div><div style="font-size:12px;font-weight:700;color:#fff;" id="bc-pressure">-- inHg</div></div><span style="font-size:16px;">📊</span></div>
      <div style="background:rgba(255,255,255,0.12);border-radius:10px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:10px;color:rgba(255,255,255,0.6);">High Tide</div><div style="font-size:12px;font-weight:700;color:#fff;" id="bc-htide">--:--</div></div><span style="font-size:16px;">🔼</span></div>
      <div style="background:rgba(255,255,255,0.12);border-radius:10px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:10px;color:rgba(255,255,255,0.6);">Low Tide</div><div style="font-size:12px;font-weight:700;color:#fff;" id="bc-ltide">--:--</div></div><span style="font-size:16px;">🔽</span></div>
      <div style="background:rgba(255,200,50,0.1);border:1px solid rgba(255,200,50,0.3);border-radius:10px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:10px;color:rgba(255,220,100,0.8);">Sunrise</div><div style="font-size:12px;font-weight:700;color:#fff;" id="bc-sunrise">--:--</div></div><span style="font-size:16px;">🌅</span></div>
      <div style="background:rgba(255,140,50,0.1);border:1px solid rgba(255,140,50,0.3);border-radius:10px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:10px;color:rgba(255,180,100,0.8);">Sunset</div><div style="font-size:12px;font-weight:700;color:#fff;" id="bc-sunset">--:--</div></div><span style="font-size:16px;">🌇</span></div>
    </div>
    <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:10px 14px;margin-bottom:7px;">
      <div style="font-size:9px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Gulf Water Temperature</div>
      <div style="position:relative;height:8px;border-radius:99px;background:linear-gradient(90deg,#60a5fa,#34d399,#fbbf24,#f97316,#ef4444);margin-bottom:5px;"><div id="bc-needle" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:#fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);border:2px solid rgba(0,0,0,0.15);transition:left 1s ease;"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:8px;color:rgba(255,255,255,0.4);margin-bottom:6px;"><span>50°F</span><span>60°F</span><span>70°F</span><span>80°F</span><span>90°F+</span></div>
      <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:8px;font-size:11px;color:#fff;text-align:center;" id="bc-verdict">Loading conditions...</div>
    </div>
    <div style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:7px;color:#86efac;font-size:11px;margin-bottom:7px;">
      <div style="width:7px;height:7px;border-radius:50%;background:#22c55e;animation:pulse-live 2.5s ease-in-out infinite;flex-shrink:0;"></div>
      Always check beach flags at access points before entering the water
    </div>
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:8px;">
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:500;">Book Activities & Tours</div>
      <canvas id="affiliateQR" width="110" height="110" style="border-radius:8px;background:#fff;padding:6px;"></canvas>
      <div style="text-align:center;">
        <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:#fff;">Destin Activities</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.65);margin-top:2px;">Dolphin cruises · Crab Island · Fishing · Water sports</div>
      </div>
    </div>
    <div style="margin-top:4px;font-size:8px;color:rgba(255,255,255,0.3);text-align:center;">NOAA Station 8729840 · Pensacola ~25mi from Destin</div>
  </div>
  <div class="card" style="gap:14px;" id="recsCard">
    <div class="sec-label" id="recsLabel">Your day · loading...</div>
    <div class="day-grid" id="recsGrid">
      <div class="moment morning"><div class="loading-recs">Loading morning recommendations...</div></div>
      <div class="moment afternoon"><div class="loading-recs">Loading afternoon recommendations...</div></div>
      <div class="moment evening"><div class="loading-recs">Loading evening recommendations...</div></div>
    </div>
    <div id="checkoutBanner" style="display:none;" class="checkout-banner"><p id="checkoutMsg"></p></div>
  </div>
  <div class="card essentials-card">
    <div class="sec-label">Unit Essentials</div>
    <div class="essential blue">
      <div class="e-label">📶 Wi-Fi</div>
      <div class="e-network">${wifiName}</div>
      <div class="e-password">${wifiPass}</div>
    </div>
    <div class="essential green">
      <div class="e-label">🕐 Check-out</div>
      <div class="e-checkout">${departure}</div>
      <div class="e-sub">${checkoutTime} · Door locks automatically</div>
    </div>
    <div class="announcement-card">
      <div class="announcement-label">📢 Building Notice</div>
      <div class="announcement-text">${announcement || 'There are no building announcements at this time. Enjoy your stay!'}</div>
    </div>
    <div class="divider"></div>
    <div class="qr-single">
      <div class="qr-img" style="padding:4px;">
        <canvas id="bookingQR" width="92" height="92"></canvas>
      </div>
      <div class="qr-lbl">Book Direct</div>
      <div class="qr-sub">Scan · Save on your next stay</div>
    </div>
    <div class="host-row">
      <div>
        <div class="host-label">Need anything?</div>
        <div class="host-num">${hostName}${hostPhone ? ' · ' + hostPhone : ''}</div>
      </div>
      <div style="font-size:11px;color:var(--teal);letter-spacing:1px;">${hostWebsite}</div>
    </div>
  </div>
</div>
<div class="footer" id="forecastFooter">
  <div class="forecast"><div class="wx">—</div><div><div class="f-day">—</div><div class="f-temp">—</div><div class="f-low">—</div><div class="f-desc">Loading...</div></div></div>
  <div class="forecast"><div class="wx">—</div><div><div class="f-day">—</div><div class="f-temp">—</div><div class="f-low">—</div><div class="f-desc">—</div></div></div>
  <div class="forecast"><div class="wx">—</div><div><div class="f-day">—</div><div class="f-temp">—</div><div class="f-low">—</div><div class="f-desc">—</div></div></div>
  <div class="forecast"><div class="wx">—</div><div><div class="f-day">—</div><div class="f-temp">—</div><div class="f-low">—</div><div class="f-desc">—</div></div></div>
  <div class="forecast"><div class="wx">—</div><div><div class="f-day">—</div><div class="f-temp">—</div><div class="f-low">—</div><div class="f-desc">—</div></div></div>
</div>
</div>
<script>
const BASE=${JSON.stringify(BASE)};
const GUEST_NAME=${JSON.stringify(guestName)};
const AFFILIATE_URL=${JSON.stringify(affiliateUrl)};
const HOST_WEBSITE=${JSON.stringify(hostWebsite)};
const BUILDING=${JSON.stringify(unit.building)};
window.addEventListener('load',function(){
  function tryQR(){
    if(typeof QRCode==='undefined'){setTimeout(tryQR,200);return;}
    QRCode.toCanvas(document.getElementById('affiliateQR'),AFFILIATE_URL||'https://www.tripshock.com',{width:110,margin:1,color:{dark:'#000000',light:'#ffffff'}},function(err){if(err)console.error(err);});
    const bUrl=HOST_WEBSITE?(HOST_WEBSITE.startsWith('http')?HOST_WEBSITE:'https://'+HOST_WEBSITE):'https://destincondogetaways.com';
    QRCode.toCanvas(document.getElementById('bookingQR'),bUrl,{width:92,margin:1,color:{dark:'#000000',light:'#ffffff'}},function(err){if(err)console.error(err);});
  }
  setTimeout(tryQR,500);
});
function updateClock(){const now=new Date();document.getElementById('clockDisplay').textContent=now.toLocaleString('en-US',{timeZone:'America/Chicago',weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true});}
updateClock();setInterval(updateClock,30000);
function scaleToFit(){const s=Math.min(window.innerWidth/1920,window.innerHeight/1080);document.body.style.transform='scale('+s+')';document.body.style.marginBottom=((1080*s)-1080)+'px';}
scaleToFit();window.addEventListener('resize',scaleToFit);
function wxIcon(c){c=(c||'').toUpperCase();if(c.includes('THUNDER')||c.includes('STORM'))return '⛈️';if(c.includes('RAIN'))return '🌧️';if(c.includes('PARTLY'))return '⛅';if(c.includes('CLOUDY'))return '☁️';return '☀️';}
function dayLabel(ds){return new Date(ds+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',timeZone:'America/Chicago'}).toUpperCase();}
function updateBg(ts){const g={morning:'radial-gradient(ellipse at 20% 80%,#7c3f00 0%,#b45309 20%,#1e3a5f 55%,#0a1628 100%)',afternoon:'radial-gradient(ellipse at 50% 0%,#0a4a6e 0%,#0a3352 30%,#081e38 65%,#040e1c 100%)',evening:'radial-gradient(ellipse at 60% 90%,#7c2d12 0%,#9d174d 25%,#2e1065 60%,#0a0a1a 100%)'};document.body.style.background=g[ts]||g.afternoon;}
async function loadLiveData(){
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    const r=await fetch(BASE+'/api/tv-data?unit=707',{signal:controller.signal});
    clearTimeout(timeout);
    const d=await r.json();
    if(d.weather){const cards=document.getElementById('forecastFooter').children;d.weather.slice(0,5).forEach((day,i)=>{if(cards[i])cards[i].innerHTML='<div class="wx">'+wxIcon(day.condition)+'</div><div><div class="f-day">'+dayLabel(day.date)+'</div><div class="f-temp">'+day.high+'°F</div><div class="f-low">Low '+day.low+'°F</div><div class="f-desc" style="color:var(--teal);">'+day.desc+'</div></div>';});}
    updateBg(d.timeSlot||'afternoon');
    await loadRecs(GUEST_NAME,d.weather,d.noaa,d.today,d.timeSlot);
  }catch(e){updateBg('afternoon');await loadRecs(GUEST_NAME,null,null,new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'}),'afternoon');}
}
async function loadRecs(name,weather,noaa,today,timeSlot){
  try{
    const dw=new Date(today+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',timeZone:'America/Chicago'});
    const th=weather?.[0]?.high||78;
    const ss=noaa?.sunset||'around 7:30pm';
    const ws=noaa?.wind?.speed||0;
    const res=await fetch('/api/guestview/recs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({building:BUILDING,guestName:name,weather:weather,timeSlot:timeSlot,sunset:ss,windSpeed:ws,temp:th,dayOfWeek:dw})});
    const data=await res.json();
    const text=data.content?.[0]?.text||'';
    const clean=text.replace(/\u0060\u0060\u0060json|\u0060\u0060\u0060/g,'').trim();
    const recs=JSON.parse(clean);
    renderRecs(recs,timeSlot||'afternoon',today);
  }catch(e){console.error('loadRecs error:',e);}
}
function renderRecs(recs,ts,today){
  const gm={morning:recs.greetingMorning,afternoon:recs.greetingAfternoon,evening:recs.greetingEvening};
  const sm={morning:recs.subMorning,afternoon:recs.subAfternoon,evening:recs.subEvening};
  document.getElementById('guestName').textContent=gm[ts]||recs.greetingAfternoon||'Good afternoon, '+GUEST_NAME;
  document.getElementById('welcomeMsg').textContent=sm[ts]||recs.subAfternoon||'';
  const dl=new Date(today+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'America/Chicago'});
  document.getElementById('recsLabel').textContent='Your day · '+dl;
  function bi(items){return(items||[]).map(i=>'<div class="rec-item" style="flex-direction:column;align-items:flex-start;margin-bottom:8px;"><span class="rec-name">'+i.name+'</span>'+(i.tip?'<span class="rec-meta" style="font-size:11px;color:var(--soft);margin-top:2px;">'+i.tip+'</span>':'')+' </div>').join('');}
  document.getElementById('recsGrid').innerHTML=
    '<div class="moment morning"><div class="moment-head"><div class="m-icon">🌅</div><div><div class="m-title">Morning</div><div class="m-time">Until noon</div></div></div><div class="split-label">Eat</div>'+bi(recs.morning?.eat)+'<div class="split-label">Do</div>'+bi(recs.morning?.do)+'</div>'+
    '<div class="moment afternoon"><div class="moment-head"><div class="m-icon">☀️</div><div><div class="m-title">Afternoon</div><div class="m-time">Noon – 5 PM</div></div></div><div class="split-label">Eat</div>'+bi(recs.afternoon?.eat)+'<div class="split-label">Do</div>'+bi(recs.afternoon?.do)+'</div>'+
    '<div class="moment evening"><div class="moment-head"><div class="m-icon">🌇</div><div><div class="m-title">Evening</div><div class="m-time">5 PM onwards</div></div></div><div class="split-label">Eat</div>'+bi(recs.evening?.eat)+'<div class="split-label">Tonight</div>'+bi(recs.evening?.tonight)+'</div>';
}
const NB='https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const NS='8729840';const NA='destincondogetaways';
function nu(p){return NB+'?date=latest&station='+NS+'&product='+p+'&units=english&time_zone=lst&application='+NA+'&format=json';}
function tu(){return NB+'?date=today&station='+NS+'&product=predictions&datum=MLLW&time_zone=lst&interval=hilo&units=english&application='+NA+'&format=json';}
function omu(){return 'https://api.open-meteo.com/v1/forecast?latitude=30.3763&longitude=-86.4958&current=relative_humidity_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=mph&daily=sunrise,sunset&timezone=America%2FChicago';}
function dc(d){return['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(d/22.5)%16];}
function mi(mb){return(mb*0.02953).toFixed(2);}
function pnt(str){if(!str)return null;const[dp,tp]=str.split(' ');const[y,mo,day]=dp.split('-').map(Number);const[h,m]=tp.split(':').map(Number);return new Date(y,mo-1,day,h,m);}
function ft(s){const[,t]=s.split(' ');if(!t)return s;const[h,m]=t.split(':');const hr=parseInt(h);return(hr%12||12)+':'+m+' '+(hr>=12?'PM':'AM');}
function bv(t){if(t<66)return'Brisk - best for a shoreline stroll.';if(t<75)return'Refreshing! Great for paddleboarding.';if(t<83)return'Paradise! The Gulf is perfect.';return'Tropical! Like a bathtub.';}
function bs(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
async function fbc(){
  try{
    const[wR,aR,pR,tR,mR]=await Promise.all([fetch(nu('water_temperature')).then(r=>r.json()),fetch(nu('air_temperature')).then(r=>r.json()),fetch(nu('air_pressure')).then(r=>r.json()),fetch(tu()).then(r=>r.json()),fetch(omu()).then(r=>r.json())]);
    if(wR.data?.[0]?.v){const wt=parseFloat(wR.data[0].v);bs('bc-water',wt.toFixed(1)+'°F');const pct=Math.min(98,Math.max(2,((wt-50)/45)*100));const n=document.getElementById('bc-needle');if(n)n.style.left=pct+'%';bs('bc-verdict',bv(wt));}
    if(aR.data?.[0]?.v)bs('bc-air',parseFloat(aR.data[0].v).toFixed(1)+'°F');
    if(pR.data?.[0]?.v)bs('bc-pressure',mi(parseFloat(pR.data[0].v))+' inHg');
    if(tR.predictions?.length){const now=new Date();const hs=tR.predictions.filter(p=>p.type==='H');const ls=tR.predictions.filter(p=>p.type==='L');const nh=hs.find(p=>pnt(p.t)>now)||hs[0];const nl=ls.find(p=>pnt(p.t)>now)||ls[0];if(nh)bs('bc-htide',ft(nh.t)+' · '+parseFloat(nh.v).toFixed(1)+'ft');if(nl)bs('bc-ltide',ft(nl.t)+' · '+parseFloat(nl.v).toFixed(1)+'ft');}
    if(mR.current){bs('bc-wind',mR.current.wind_speed_10m.toFixed(1)+' mph '+dc(mR.current.wind_direction_10m));bs('bc-hum',mR.current.relative_humidity_2m+'%');}
    if(mR.daily?.sunrise?.[0]){const f=dt=>new Date(dt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'America/Chicago'});bs('bc-sunrise',f(mR.daily.sunrise[0]));bs('bc-sunset',f(mR.daily.sunset[0]));}
    bs('bc-badge','LIVE · '+new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'America/Chicago'}));
  }catch(e){console.error('beach error:',e);}
}
fbc();setInterval(fbc,6*60*1000);
loadLiveData();
</script>
</body>
</html>`;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
