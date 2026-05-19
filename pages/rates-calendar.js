import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";

function isSnowbirdDiscount(year, month, nights) {
  if (nights < 28) return false;
  return (year === 2026 && (month === 11 || month === 12)) || (year === 2027 && (month === 1 || month === 2));
}
function getDiscountPct(unit, year, month, nights) {
  if (!isSnowbirdDiscount(year, month, nights)) return 0.125;
  return unit === "707" ? 0.50 : 0.40;
}
function calcFees(priceSum, nights, unit, arrivalStr, adults, children) {
  const d = new Date(arrivalStr + "T12:00:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const exactRent = priceSum;
  const mgmt = 25 * nights;
  const rent = Math.round(exactRent * 0.875) + mgmt;
  const isSnowbird = isSnowbirdDiscount(year, month, nights);
  const discPct = getDiscountPct(unit, year, month, nights);
  const discount = Math.round(exactRent * discPct);
  const extraG = Math.max(0, (adults + children) - 4);
  const extraFee = extraG * 20 * nights;
  // Base total WITHOUT discount (what OwnerRez shows before direct booking discount)
  const rentAfterBase = rent + extraFee;
  const cleaning = 175;
  const taxBase = Math.round((rentAfterBase + cleaning) * 0.13);
  const adminBase = Math.round((rentAfterBase + cleaning + taxBase) * 0.03);
  const totalBase = rentAfterBase + cleaning + taxBase + adminBase;
  // Direct total WITH discount (only when booked via destincondogetaways.com)
  const rentAfterDisc = rent - discount + extraFee;
  const taxDisc = Math.round((rentAfterDisc + cleaning) * 0.13);
  const adminDisc = Math.round((rentAfterDisc + cleaning + taxDisc) * 0.03);
  const totalDisc = rentAfterDisc + cleaning + taxDisc + adminDisc;
  return { rent, discPct, discount, extraFee, cleaning, taxBase, adminBase, totalBase, taxDisc, adminDisc, totalDisc, isSnowbird };
}

const UNIT_META = {
  "707":  { name: "Unit 707", sub: "Classic Coastal · 7th Floor", slug: "pelican-beach-resort-unit-707-orp5b47b5ax" },
  "1006": { name: "Unit 1006", sub: "Fresh Coastal · 10th Floor", slug: "pelican-beach-resort-unit-1006-orp5b6450ex" },
};

function bookingUrl(unit, arrival, departure) {
  return `https://www.destincondogetaways.com/${UNIT_META[unit].slug}?or_arrival=${arrival}&or_departure=${departure}&or_adults=2&or_children=0&or_guests=2`;
}

function fmt(d) { return d.toISOString().split("T")[0]; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function pad(n) { return String(n).padStart(2, "0"); }

function isBooked(demand_desc) {
  if (!demand_desc) return false;
  const d = demand_desc.toLowerCase();
  return d.includes("unavailable") || d.includes("booked") || d.includes("reserved");
}

export async function getStaticProps() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
      process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
    );

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Get latest captured_date
    const { data: latest } = await supabase
      .from("price_snapshots")
      .select("captured_date")
      .order("captured_date", { ascending: false })
      .limit(1)
      .single();

    const latestCaptured = latest?.captured_date || fmt(today);

    // Fetch 12 months of data
    const startDate = fmt(addDays(today, -1));
    const endDate = fmt(addDays(today, 365));

    const { data: snapshots, error } = await supabase
      .from("price_snapshots")
      .select("unit_id, date, price, demand_desc")
      .eq("captured_date", latestCaptured)
      .gte("date", startDate)
      .lte("date", endDate)
      .limit(20000);

    if (error || !snapshots?.length) return { props: { dayData: {}, today: fmt(today) }, revalidate: 600 };

    const dayData = { "707": {}, "1006": {} };
    for (const row of snapshots) {
      if (dayData[row.unit_id]) {
        dayData[row.unit_id][row.date] = { price: row.price, booked: isBooked(row.demand_desc) };
      }
    }

    return { props: { dayData, today: fmt(today) }, revalidate: 600 };
  } catch (e) {
    console.error("[rates-calendar]", e.message);
    return { props: { dayData: {}, today: fmt(new Date()) }, revalidate: 600 };
  }
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function Calendar({ unit, year, month, dayData, arrival, departure, onDayClick, today }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = today;

  function dateStr(d) { return `${year}-${pad(month + 1)}-${pad(d)}`; }
  function inRange(d) {
    if (!arrival || !departure) return false;
    const ds = dateStr(d);
    return ds > arrival && ds < departure;
  }
  function isArrival(d) { return dateStr(d) === arrival; }
  function isDeparture(d) { return dateStr(d) === departure; }
  function isPast(d) { return dateStr(d) < todayDate; }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", padding: "4px 0", letterSpacing: ".06em" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const ds = dateStr(d);
          const info = dayData[unit]?.[ds];
          const booked = info?.booked;
          const price = info?.price;
          const past = isPast(d);
          const sel = isArrival(d) || isDeparture(d);
          const range = inRange(d);

          let bg = "rgba(2,18,40,.6)";
          let border = "rgba(255,255,255,.08)";
          let priceColor = "#f7fbff";
          let numColor = "rgba(255,255,255,.5)";
          let cursor = "pointer";

          if (past) { bg = "rgba(2,18,40,.3)"; cursor = "default"; priceColor = "rgba(255,255,255,.2)"; numColor = "rgba(255,255,255,.2)"; }
          else if (booked) { bg = "rgba(80,20,20,.5)"; border = "rgba(200,60,60,.3)"; priceColor = "rgba(255,100,100,.6)"; numColor = "rgba(255,100,100,.4)"; cursor = "default"; }
          else if (sel) { bg = "#47e2d0"; border = "#47e2d0"; priceColor = "#020b18"; numColor = "#020b18"; }
          else if (range) { bg = "rgba(71,226,208,.15)"; border = "rgba(71,226,208,.3)"; }

          return (
            <div
              key={d}
              onClick={() => !past && !booked && onDayClick(ds)}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 8,
                padding: "6px 4px",
                minHeight: 52,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                cursor,
                transition: "all .12s",
                position: "relative",
              }}
            >
              <span style={{ fontSize: 11, color: numColor, lineHeight: 1 }}>{d}</span>
              {price && !past && (
                <span style={{ fontSize: 12, fontWeight: 700, color: priceColor, lineHeight: 1 }}>${price}</span>
              )}
              {booked && !past && (
                <span style={{ fontSize: 9, color: "rgba(255,100,100,.6)", letterSpacing: ".04em" }}>BOOKED</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RatesCalendar({ dayData, today }) {
  const now = new Date(today + "T12:00:00");
  const [unit, setUnit] = useState("707");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [arrival, setArrival] = useState(null);
  const [departure, setDeparture] = useState(null);
  const [showFloat, setShowFloat] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowFloat(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function handleDayClick(ds) {
    if (!arrival || (arrival && departure)) {
      setArrival(ds);
      setDeparture(null);
    } else {
      if (ds <= arrival) { setArrival(ds); setDeparture(null); }
      else setDeparture(ds);
    }
  }

  function clearSelection() { setArrival(null); setDeparture(null); }

  // Stats for current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthPrices = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${pad(month + 1)}-${pad(d)}`;
    const info = dayData[unit]?.[ds];
    if (info && !info.booked && info.price > 0) monthPrices.push(info.price);
  }
  const avgPrice = monthPrices.length ? Math.round(monthPrices.reduce((s, p) => s + p, 0) / monthPrices.length) : null;
  const minPrice = monthPrices.length ? Math.min(...monthPrices) : null;
  const maxPrice = monthPrices.length ? Math.max(...monthPrices) : null;

  // Nights and total if selection complete
  let nights = null, totalRent = null;
  if (arrival && departure) {
    nights = Math.round((new Date(departure) - new Date(arrival)) / 86400000);
    const arrDays = [];
    let cur = new Date(arrival + "T12:00:00");
    const dep = new Date(departure + "T12:00:00");
    while (cur < dep) {
      arrDays.push(fmt(cur));
      cur = addDays(cur, 1);
    }
    const prices = arrDays.map(d => dayData[unit]?.[d]?.price).filter(Boolean);
    if (prices.length) totalRent = prices.reduce((s, p) => s + p, 0);
  }

  const url = arrival && departure ? bookingUrl(unit, arrival, departure) : null;

  function fmtDate(iso) {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <>
      <Head>
        <title>Rates Calendar — Pelican Beach Resort Destin FL</title>
        <meta name="description" content="Browse daily rates for beachfront condos at Pelican Beach Resort, Destin FL. Pick your dates and book direct." />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3SGXCQ4FTC');` }} />
      </Head>

      {/* Fixed dark bg */}
      <div style={{ position: "fixed", inset: 0, background: "#04101d", zIndex: 0 }} />

      {/* Top nav */}
      <header style={{ position: "relative", zIndex: 3, width: "min(860px,calc(100% - 32px))", margin: "20px auto 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="https://www.destincondogetaways.com" style={{ textDecoration: "none" }}>
          <b style={{ fontSize: 20, letterSpacing: ".12em", color: "#47e2d0", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900 }}>DESTIN</b>
          <span style={{ display: "block", fontSize: 10, letterSpacing: ".16em", color: "rgba(255,255,255,.6)", fontWeight: 700 }}>CONDO GETAWAYS</span>
        </a>
        <nav style={{ display: "flex", gap: 20, fontSize: 13, fontWeight: 700 }}>
          {[["Deals", "https://deals.destincondogetaways.com/beach-deals"],["Snowbird", "https://sunbirds.destincondogetaways.com"],["Destin Hub", "https://explore.destincondogetaways.com/destin-hub"]].map(([label, href]) => (
            <a key={label} href={href} style={{ color: "rgba(255,255,255,.7)", textDecoration: "none" }}>{label}</a>
          ))}
        </nav>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "24px 16px 80px" }}>
        {/* Hero */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#47e2d0", fontWeight: 800, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#47e2d0", display: "inline-block", marginRight: 6, verticalAlign: "middle" }} />
            Pelican Beach Resort · Destin FL
          </div>
          <h1 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "clamp(36px,6vw,56px)", fontWeight: 900, color: "#f7fbff", lineHeight: 1, marginBottom: 8 }}>
            Rates <span style={{ color: "#ffd166" }}>calendar.</span>
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.5)" }}>Browse daily rates · Pick your dates · Book direct with no platform fees</p>
        </div>

        {/* Unit toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["707", "1006"].map(u => (
            <button
              key={u}
              onClick={() => { setUnit(u); clearSelection(); }}
              style={{
                flex: 1, padding: "12px", borderRadius: 12, border: `1px solid ${unit === u ? "#47e2d0" : "rgba(255,255,255,.15)"}`,
                background: unit === u ? "rgba(71,226,208,.15)" : "transparent",
                color: unit === u ? "#47e2d0" : "rgba(255,255,255,.5)",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Barlow',sans-serif"
              }}
            >
              {UNIT_META[u].name} — {UNIT_META[u].sub}
            </button>
          ))}
        </div>

        {/* Month stats */}
        {avgPrice && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
            {[["Month avg", `$${avgPrice}`], ["Lowest night", `$${minPrice}`], ["Peak night", `$${maxPrice}`]].map(([label, val]) => (
              <div key={label} style={{ background: "rgba(2,18,40,.7)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#ffd166", fontFamily: "'Barlow Condensed',sans-serif" }}>{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Calendar */}
        <div style={{ background: "rgba(2,18,40,.7)", border: "1px solid rgba(71,226,208,.2)", borderRadius: 20, padding: 20, marginBottom: 16 }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "6px 14px", color: "#f7fbff", cursor: "pointer", fontSize: 14, fontFamily: "'Barlow',sans-serif" }}>←</button>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#f7fbff" }}>{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "6px 14px", color: "#f7fbff", cursor: "pointer", fontSize: 14, fontFamily: "'Barlow',sans-serif" }}>→</button>
          </div>

          <Calendar unit={unit} year={year} month={month} dayData={dayData} arrival={arrival} departure={departure} onDayClick={handleDayClick} today={today} />

          <p style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 12, textAlign: "center" }}>
            {!arrival ? "Tap a date to set check-in" : !departure ? "Tap a date to set check-out" : `${fmtDate(arrival)} → ${fmtDate(departure)} · ${nights} night${nights !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Booking panel */}
        {arrival && departure && url && totalRent && (() => {
          const fees = calcFees(totalRent, nights, unit, arrival, 2, 0);
          const discLabel = fees.isSnowbird ? `❄️ Snowbird discount (${Math.round(fees.discPct * 100)}%)` : "Direct booking discount (12.5%)";
          return (
            <div style={{ background: "rgba(2,18,40,.9)", border: "2px solid #47e2d0", borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#f7fbff", margin: 0 }}>{UNIT_META[unit].name}</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.45)", margin: "3px 0 0" }}>{fmtDate(arrival)} – {fmtDate(departure)} · {nights} nights · 2 guests</p>
                </div>
                <button onClick={clearSelection} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 12, marginBottom: 14 }}>
                {[
                  ["Rent", `$${fees.rent}`, false],
                  [discLabel, `-$${fees.discount}`, true],
                  ["Cleaning fee", `$${fees.cleaning}`, false],
                  ["Tax (13%)", `$${fees.taxDisc}`, false],
                  ["Admin (3%)", `$${fees.adminDisc}`, false],
                ].map(([label, val, green]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{label}</span>
                    <span style={{ fontSize: 12, color: green ? "#47e2d0" : "#f7fbff" }}>{val}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.1)", marginTop: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#f7fbff" }}>Total</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#ffd166" }}>${fees.totalDisc}</span>
                </div>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,.25)", margin: "8px 0 0" }}>2 guests · direct booking discount applied · final confirmed at checkout</p>
              </div>
              <a href={url} target="_blank" rel="noopener" style={{ display: "block", width: "100%", padding: 14, textAlign: "center", background: "#47e2d0", color: "#020b18", fontSize: 14, fontWeight: 900, borderRadius: 12, textDecoration: "none", letterSpacing: ".03em" }}>
                Book direct — check availability →
              </a>
            </div>
          );
        })()}

        {/* Instruction when nothing selected */}
        {!arrival && (
          <div style={{ background: "rgba(2,18,40,.5)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "14px 18px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", margin: 0 }}>
              Select check-in then check-out to see your booking total
            </p>
          </div>
        )}
      </main>

      {/* Floating home/top */}
      {showFloat && (
        <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 999 }}>
          <a href="https://www.destincondogetaways.com" target="_blank" rel="noopener" style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(2,18,40,.9)", border: "1px solid rgba(71,226,208,.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#47e2d0", fontSize: 18, textDecoration: "none" }}>🏠</a>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(2,18,40,.9)", border: "1px solid rgba(71,226,208,.35)", color: "#47e2d0", fontSize: 18, cursor: "pointer", fontFamily: "'Barlow',sans-serif" }}>↑</button>
        </div>
      )}

      <style jsx global>{`
        body { background: #04101d; color: #f7fbff; font-family: 'Barlow', sans-serif; margin: 0; }
        * { box-sizing: border-box; }
        @media(max-width:600px) {
          header nav { display: none; }
        }
      `}</style>
    </>
  );
}
