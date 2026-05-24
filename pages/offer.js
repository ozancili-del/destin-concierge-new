import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";

const CLEANING = 175;
const TAX_RATE = 0.13;
const ADMIN_RATE = 0.03;
const MONEY = n => "$" + Math.round(n).toLocaleString("en-US");

function calcFees(rate, nights) {
  if (!rate || !nights || nights <= 0) return null;
  const rent = rate * nights;
  const tax = Math.round((rent + CLEANING) * TAX_RATE);
  const admin = Math.round((rent + CLEANING + tax) * ADMIN_RATE);
  const total = rent + CLEANING + tax + admin;
  return { rent, tax, admin, total };
}

function getNights(ci, co) {
  if (!ci || !co) return 0;
  return Math.round((new Date(co) - new Date(ci)) / 86400000);
}

function OfferCalendar({ unit, year, month, arrival, departure, bookedDates, onSelect, onNav }) {
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
          return (
            <div key={dateStr} className={cls} onClick={() => !(isPast || isBooked) && onSelect(dateStr)}>
              {d}
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
  const fees = rate && nights > 0 ? calcFees(Number(rate), nights) : null;

  useEffect(() => {
    setLoadingDates(true);
    fetch(`/api/availability?unit=${unit}`)
      .then(r => r.json())
      .then(d => setBookedDates(d.booked || []))
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
      const res = await fetch("/api/rate-inquiry", {
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
        <title>Make an Offer — Destin Condo Getaways</title>
        <meta name="description" content="Propose your own nightly rate for a Gulf-front condo at Pelican Beach Resort, Destin FL." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700;900&family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <main className="offer-page">
        <header className="page-header">
          <div className="eyebrow">Destin Condo Getaways</div>
          <h1>Make an Offer</h1>
          <p>Choose your condo, pick your dates, and propose the nightly rate that works for your trip. We&apos;ll review and get back to you within a few hours.</p>
        </header>

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
                <OfferCalendar unit={unit} year={calYear} month={calMonth} arrival={arrival} departure={departure} bookedDates={bookedDates} onSelect={handleCalSelect} onNav={handleNav} />
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
                  <p className="fine-print">This is not a booking. We&apos;ll review and respond within a few hours. No charge until you confirm.</p>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <style jsx global>{`
        :root {
          --navy: #020b18; --navy2: #061527; --navy3: #0a1d34;
          --teal: #00d4c8; --gold: #ffd166; --red: #ff6b6b; --green: #5ee38b;
          --muted: #9fb2c8; --white: #f5fbff; --line: rgba(255,255,255,0.12);
          --heading: 'Barlow Condensed', sans-serif;
          --body: 'Inter', system-ui, sans-serif;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--body); color: var(--white); background: radial-gradient(circle at top left, rgba(0,212,200,.14), transparent 34rem), radial-gradient(circle at bottom right, rgba(255,209,102,.12), transparent 32rem), var(--navy); line-height: 1.5; }
        button, input, select { font: inherit; }

        .offer-page { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 80px; }
        .page-header { margin-bottom: 28px; }
        .eyebrow { color: var(--teal); letter-spacing: .22em; text-transform: uppercase; font-size: .78rem; font-weight: 900; }
        .page-header h1 { font-family: var(--heading); font-size: clamp(3rem,8vw,6rem); letter-spacing: .02em; line-height: .95; margin: 10px 0 12px; }
        .page-header p { max-width: 680px; color: var(--muted); font-size: 1rem; }

        .offer-shell { display: grid; grid-template-columns: minmax(320px,.94fr) minmax(380px,1.06fr); min-height: 720px; overflow: hidden; border: 1px solid var(--line); border-radius: 34px; background: linear-gradient(145deg,rgba(9,27,50,.98),rgba(4,16,30,.98)); box-shadow: 0 28px 90px rgba(0,0,0,.42); }

        .availability-side { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 28px; padding: 34px; background: linear-gradient(rgba(2,11,24,.24),rgba(2,11,24,.86)), url('/snowbird-hero.jpg') center/cover; }
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
        .day { aspect-ratio: 1; display: grid; place-items: center; border-radius: 10px; font-size: .8rem; font-weight: 700; cursor: pointer; transition: .12s; }
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
        }
        @media (max-width: 620px) {
          .form-grid, .counter-grid { grid-template-columns: 1fr; }
          .page-header h1 { font-size: 3.2rem; }
        }
      `}</style>
    </>
  );
}
