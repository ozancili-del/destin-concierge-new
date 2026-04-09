import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const TV_BRANDS = ['Samsung', 'LG', 'Sony', 'Vizio', 'TCL', 'Hisense', 'Other'];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_ANON_KEY
  );
}

export default function GuestViewOnboard() {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [crawlLog, setCrawlLog] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [wifiSameBuilding, setWifiSameBuilding] = useState({});
  const [email, setEmail] = useState('');
  const [authMode, setAuthMode] = useState(null);
  const [authSent, setAuthSent] = useState(false);
  const [user, setUser] = useState(null);
  const [orEmail, setOrEmail] = useState('');
  const [orKey, setOrKey] = useState('');
  const [orValidating, setOrValidating] = useState(false);
  const [orSample, setOrSample] = useState(null);
  const [orError, setOrError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedUnits, setSavedUnits] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); setStep(5); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); setStep(5); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleCrawl() {
    if (!url.trim()) return;
    setCrawling(true);
    setError('');
    setCrawlLog([]);
    const logs = ['Connecting to your website...','Scanning property listings...','Grouping units by building...'];
    for (let i = 0; i < logs.length; i++) {
      await new Promise(r => setTimeout(r, 700));
      setCrawlLog(prev => [...prev, { text: logs[i], done: false }]);
      await new Promise(r => setTimeout(r, 500));
      setCrawlLog(prev => prev.map((l, idx) => idx === i ? { ...l, done: true } : l));
    }
    try {
      const res = await fetch('/api/guestview/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const withState = data.data.buildings.map(b => ({
        ...b,
        units: b.units.map(u => ({ ...u, active: true, wifi_name: '', wifi_password: '', tv_brand: '', unit_number: '' }))
      }));
      setBuildings(withState);
      setCrawlLog(prev => [...prev, { text: `Found ${data.data.total} units across ${data.data.buildings.length} buildings`, done: true, highlight: true }]);
      await new Promise(r => setTimeout(r, 800));
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to crawl website');
    } finally {
      setCrawling(false);
    }
  }

  function updateUnit(bIdx, uIdx, field, value) {
    setBuildings(prev => prev.map((b, bi) => bi !== bIdx ? b : {
      ...b, units: b.units.map((u, ui) => ui !== uIdx ? u : { ...u, [field]: value })
    }));
  }

  function toggleUnit(bIdx, uIdx) {
    updateUnit(bIdx, uIdx, 'active', !buildings[bIdx].units[uIdx].active);
  }

  function toggleWifi(bIdx) {
    const bid = `b${bIdx}`;
    const isOn = !wifiSameBuilding[bid];
    setWifiSameBuilding(prev => ({ ...prev, [bid]: isOn }));
    if (isOn) {
      const first = buildings[bIdx].units[0];
      setBuildings(prev => prev.map((b, bi) => bi !== bIdx ? b : {
        ...b, units: b.units.map((u, ui) => ui === 0 ? u : { ...u, wifi_name: first.wifi_name, wifi_password: first.wifi_password })
      }));
    }
  }

  function handleWifiChange(bIdx, uIdx, field, value) {
    const bid = `b${bIdx}`;
    if (wifiSameBuilding[bid] && uIdx === 0) {
      setBuildings(prev => prev.map((b, bi) => bi !== bIdx ? b : {
        ...b, units: b.units.map(u => ({ ...u, [field]: value }))
      }));
    } else {
      updateUnit(bIdx, uIdx, field, value);
    }
  }

  async function handleAuth() {
    setError('');
    if (!email.trim()) return;
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/guestview/onboard` }
    });
    if (error) { setError(error.message); return; }
    setAuthSent(true);
  }

  async function handleGoogleAuth() {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/guestview/onboard` }
    });
    if (error) setError(error.message);
  }

  async function handleSaveUnits() {
    setSaving(true);
    setError('');
    try {
      const allUnits = buildings.flatMap(b => b.units.map(u => ({ ...u, building: b.name })));
      const res = await fetch('/api/guestview/save-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, user_slug: user.email.split('@')[0], units: allUnits, website_url: url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedUnits(data.units);
      setStep(6);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleValidateOR() {
    setOrValidating(true);
    setOrError('');
    try {
      const res = await fetch('/api/guestview/validate-or', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ or_email: orEmail, or_key: orKey, user_id: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrSample(data.sample);
      await new Promise(r => setTimeout(r, 1500));
      handleSaveUnits();
    } catch (err) {
      setOrError(err.message);
    } finally {
      setOrValidating(false);
    }
  }

  const activeCount = buildings.flatMap(b => b.units.filter(u => u.active)).length;

  return (
    <>
      <Head>
        <title>GuestView — Setup</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #f7f6f3; font-family: 'DM Sans', sans-serif; color: #1a1a18; }
        .wrap { min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 3rem 1rem; }
        .card { background: #fff; border-radius: 16px; border: 1px solid #e8e6e0; width: 100%; max-width: 680px; padding: 2.5rem; }
        .logo { font-size: 17px; font-weight: 600; letter-spacing: -0.3px; color: #1a1a18; margin-bottom: 2rem; }
        .logo span { color: #1D9E75; }
        .steps { display: flex; gap: 6px; margin-bottom: 2rem; }
        .step-pip { height: 3px; border-radius: 2px; background: #e8e6e0; flex: 1; transition: background 0.3s; }
        .step-pip.done { background: #1D9E75; }
        .step-pip.active { background: #1D9E75; opacity: 0.5; }
        h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 0.4rem; }
        .sub { font-size: 15px; color: #6b6b65; line-height: 1.6; margin-bottom: 2rem; }
        .input-row { display: flex; gap: 8px; margin-bottom: 1.5rem; }
        input[type=text], input[type=email] { width: 100%; height: 42px; border: 1px solid #e8e6e0; border-radius: 8px; padding: 0 12px; font-size: 14px; font-family: 'DM Sans', sans-serif; background: #fafaf8; color: #1a1a18; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: #1D9E75; background: #fff; }
        .btn { height: 42px; padding: 0 20px; border-radius: 8px; font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.15s; border: none; white-space: nowrap; }
        .btn-primary { background: #1D9E75; color: #fff; }
        .btn-primary:hover { background: #0F6E56; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-outline { background: #fff; color: #1a1a18; border: 1px solid #e8e6e0; }
        .btn-outline:hover { background: #f7f6f3; }
        .crawl-log { background: #fafaf8; border: 1px solid #e8e6e0; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
        .log-line { font-size: 13px; font-family: 'DM Mono', monospace; padding: 3px 0; color: #6b6b65; display: flex; align-items: center; gap: 8px; }
        .log-line.done { color: #1a1a18; }
        .log-line.highlight { color: #1D9E75; font-weight: 500; }
        .log-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .building-block { margin-bottom: 1.75rem; }
        .building-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f0ede8; }
        .building-name { font-size: 14px; font-weight: 600; color: #1a1a18; }
        .building-count { font-size: 12px; color: #9b9b94; margin-left: 6px; font-weight: 400; }
        .wifi-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b6b65; cursor: pointer; user-select: none; }
        .tog { width: 30px; height: 17px; border-radius: 9px; background: #e8e6e0; position: relative; transition: background 0.2s; flex-shrink: 0; }
        .tog.on { background: #1D9E75; }
        .tog::after { content: ''; position: absolute; width: 11px; height: 11px; background: #fff; border-radius: 50%; top: 3px; left: 3px; transition: left 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
        .tog.on::after { left: 16px; }
        .unit-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .unit-table th { text-align: left; font-size: 11px; font-weight: 500; color: #9b9b94; padding: 0 6px 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .unit-table td { padding: 3px 4px; vertical-align: middle; }
        .unit-table th:nth-child(1), .unit-table td:nth-child(1) { width: 30px; }
        .unit-table th:nth-child(2), .unit-table td:nth-child(2) { width: 22%; }
        .unit-table th:nth-child(3), .unit-table td:nth-child(3) { width: 14%; }
        .unit-table th:nth-child(4), .unit-table td:nth-child(4) { width: 20%; }
        .unit-table th:nth-child(5), .unit-table td:nth-child(5) { width: 18%; }
        .unit-table th:nth-child(6), .unit-table td:nth-child(6) { width: 18%; }
        .unit-table input, .unit-table select { width: 100%; height: 30px; border: 1px solid #e8e6e0; border-radius: 6px; padding: 0 7px; font-size: 12px; font-family: 'DM Sans', sans-serif; background: #fafaf8; color: #1a1a18; outline: none; }
        .unit-table input:focus, .unit-table select:focus { border-color: #1D9E75; }
        .unit-table tr.inactive td:not(:first-child) { opacity: 0.35; }
        .checkbox { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid #d0cdc7; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
        .checkbox.checked { background: #1D9E75; border-color: #1D9E75; }
        .check-mark { color: #fff; font-size: 10px; font-weight: 700; }
        .confirm-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: 1.5rem; border-top: 1px solid #f0ede8; flex-wrap: wrap; }
        .confirm-note { font-size: 13px; color: #9b9b94; }
        .auth-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.5rem; }
        .auth-card { border: 1px solid #e8e6e0; border-radius: 10px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.15s; background: #fff; }
        .auth-card:hover { background: #f7f6f3; border-color: #d0cdc7; }
        .auth-icon { font-size: 22px; margin-bottom: 6px; }
        .auth-label { font-size: 14px; font-weight: 500; }
        .auth-sublabel { font-size: 12px; color: #9b9b94; margin-top: 2px; }
        .divider { display: flex; align-items: center; gap: 12px; margin: 1.25rem 0; color: #9b9b94; font-size: 13px; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e8e6e0; }
        .or-form { background: #fafaf8; border: 1px solid #e8e6e0; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; }
        .or-form label { font-size: 12px; font-weight: 500; color: #6b6b65; display: block; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.4px; }
        .or-form input { margin-bottom: 10px; }
        .or-sample { background: #e8f7f1; border: 1px solid #b3e6d4; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #0F6E56; margin-top: 10px; }
        .err { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #dc2626; margin-bottom: 1rem; }
        .success-wrap { text-align: center; padding: 1rem 0; }
        .success-icon { width: 60px; height: 60px; background: #e8f7f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 26px; }
        .url-list { margin-top: 1.5rem; text-align: left; }
        .url-item { background: #fafaf8; border: 1px solid #e8e6e0; border-radius: 8px; padding: 10px 14px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
        .url-building { font-size: 12px; color: #9b9b94; margin-bottom: 2px; }
        .url-val { font-size: 12px; font-family: 'DM Mono', monospace; color: #1D9E75; }
        .trial-badge { display: inline-flex; align-items: center; gap: 6px; background: #e8f7f1; color: #0F6E56; border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: 500; margin-top: 1.5rem; }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; margin-right: 6px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sent-box { background: #e8f7f1; border: 1px solid #b3e6d4; border-radius: 10px; padding: 1.25rem; text-align: center; }
        .sent-box p { font-size: 14px; color: #0F6E56; line-height: 1.6; }
      `}</style>

      <div className="wrap">
        <div className="card">
          <div className="logo">Guest<span>View</span></div>
          <div className="steps">
            {[1,2,3,4,5,6].map(s => (
              <div key={s} className={`step-pip ${step > s ? 'done' : step === s ? 'active' : ''}`} />
            ))}
          </div>

          {step === 1 && (
            <>
              <h1>Welcome — let's find your units</h1>
              <p className="sub">Enter your vacation rental website and we'll scan it to find all your properties automatically.</p>
              <div className="input-row">
                <input type="text" placeholder="yoursite.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && !crawling && handleCrawl()} style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={handleCrawl} disabled={crawling || !url.trim()}>
                  {crawling ? <><span className="spinner" />Scanning...</> : 'Find my units →'}
                </button>
              </div>
              {crawlLog.length > 0 && (
                <div className="crawl-log">
                  {crawlLog.map((l, i) => (
                    <div key={i} className={`log-line ${l.done ? 'done' : ''} ${l.highlight ? 'highlight' : ''}`}>
                      <span className="log-dot" />{l.text}
                    </div>
                  ))}
                </div>
              )}
              {error && <div className="err">{error}</div>}
            </>
          )}

          {step === 2 && (
            <>
              <h1>Are these your units?</h1>
              <p className="sub">We found {activeCount} units. Uncheck any you don't want on GuestView, then fill in WiFi and TV details.</p>
              {error && <div className="err">{error}</div>}
              {buildings.map((b, bIdx) => (
                <div key={bIdx} className="building-block">
                  <div className="building-header">
                    <div>
                      <span className="building-name">{b.name}</span>
                      <span className="building-count">({b.units.length} units)</span>
                    </div>
                    <div className="wifi-toggle" onClick={() => toggleWifi(bIdx)}>
                      <div className={`tog ${wifiSameBuilding[`b${bIdx}`] ? 'on' : ''}`} />
                      <span>Same WiFi for all</span>
                    </div>
                  </div>
                  <table className="unit-table">
                    <thead>
                      <tr><th></th><th>Unit</th><th>Unit #</th><th>WiFi name</th><th>WiFi password</th><th>TV brand</th></tr>
                    </thead>
                    <tbody>
                      {b.units.map((u, uIdx) => (
                        <tr key={uIdx} className={u.active ? '' : 'inactive'}>
                          <td>
                            <div className={`checkbox ${u.active ? 'checked' : ''}`} onClick={() => toggleUnit(bIdx, uIdx)}>
                              {u.active && <span className="check-mark">✓</span>}
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: '#6b6b65', paddingLeft: 4 }}>{u.name}</td>
                          <td><input type="text" placeholder="707" value={u.unit_number} onChange={e => updateUnit(bIdx, uIdx, 'unit_number', e.target.value)} disabled={!u.active} /></td>
                          <td><input type="text" placeholder="Network" value={u.wifi_name} onChange={e => handleWifiChange(bIdx, uIdx, 'wifi_name', e.target.value)} disabled={!u.active || (wifiSameBuilding[`b${bIdx}`] && uIdx > 0)} /></td>
                          <td><input type="text" placeholder="Password" value={u.wifi_password} onChange={e => handleWifiChange(bIdx, uIdx, 'wifi_password', e.target.value)} disabled={!u.active || (wifiSameBuilding[`b${bIdx}`] && uIdx > 0)} /></td>
                          <td>
                            <select value={u.tv_brand} onChange={e => updateUnit(bIdx, uIdx, 'tv_brand', e.target.value)} disabled={!u.active}>
                              <option value="">Brand</option>
                              {TV_BRANDS.map(tv => <option key={tv}>{tv}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <div className="confirm-bar">
                <span className="confirm-note">{activeCount} units selected</span>
                <button className="btn btn-primary" onClick={() => setStep(3)}>Looks good →</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1>Create your account</h1>
              <p className="sub">Your {activeCount} units are ready. Sign in to save your setup and get your TV URLs.</p>
              {error && <div className="err">{error}</div>}
              {!authSent ? (
                <>
                  <div className="auth-grid">
                    <div className="auth-card" onClick={handleGoogleAuth}>
                      <div className="auth-icon">G</div>
                      <div className="auth-label">Google</div>
                      <div className="auth-sublabel">One click</div>
                    </div>
                    <div className="auth-card" onClick={() => setAuthMode('email')}>
                      <div className="auth-icon">@</div>
                      <div className="auth-label">Email link</div>
                      <div className="auth-sublabel">No password</div>
                    </div>
                  </div>
                  {authMode === 'email' && (
                    <>
                      <div className="divider">enter your email</div>
                      <div className="input-row">
                        <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1 }} />
                        <button className="btn btn-primary" onClick={handleAuth}>Send link →</button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="sent-box">
                  <p>Magic link sent to <strong>{email}</strong>.<br />Check your inbox and click the link to continue.</p>
                </div>
              )}
            </>
          )}

          {step === 5 && user && (
            <>
              <h1>Connect OwnerRez</h1>
              <p className="sub">GuestView reads your guest's name and check-in / check-out dates to personalize each TV screen. We encrypt your API key — we never see it in plain text.</p>
              {orError && <div className="err">{orError}</div>}
              {!orSample ? (
                <div className="or-form">
                  <label>OwnerRez account email</label>
                  <input type="text" placeholder="you@example.com" value={orEmail} onChange={e => setOrEmail(e.target.value)} />
                  <label>OwnerRez API key</label>
                  <input type="text" placeholder="Paste your API key" value={orKey} onChange={e => setOrKey(e.target.value)} style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }} />
                  <button className="btn btn-primary" onClick={handleValidateOR} disabled={orValidating || !orEmail || !orKey} style={{ width: '100%', marginTop: 4 }}>
                    {orValidating ? <><span className="spinner" />Connecting...</> : 'Connect OwnerRez →'}
                  </button>
                </div>
              ) : (
                <div className="or-sample">
                  ✓ Connected — found booking for <strong>{orSample.guest_first_name}</strong>, arriving <strong>{orSample.arrival}</strong>, departing <strong>{orSample.departure}</strong>
                </div>
              )}
              {saving && <p style={{ fontSize: 13, color: '#9b9b94', marginTop: 10 }}>Saving your units...</p>}
            </>
          )}

          {step === 6 && (
            <div className="success-wrap">
              <div className="success-icon">✓</div>
              <h1>You're all set.</h1>
              <p className="sub" style={{ marginBottom: '0.5rem' }}>Your TV dashboard URLs are ready. Point each Amazon Signage Stick at its URL via AbleSign.</p>
              <div className="url-list">
                {savedUnits.slice(0, 5).map((u, i) => (
                  <div key={i} className="url-item">
                    <div>
                      <div className="url-building">{u.building}</div>
                      <div className="url-val">{u.tv_url}</div>
                    </div>
                    <button className="btn btn-outline" style={{ fontSize: 12, height: 30, padding: '0 12px' }}
                      onClick={() => navigator.clipboard.writeText(`https://${u.tv_url}`)}>
                      Copy
                    </button>
                  </div>
                ))}
                {savedUnits.length > 5 && (
                  <p style={{ fontSize: 13, color: '#9b9b94', textAlign: 'center', marginTop: 8 }}>
                    + {savedUnits.length - 5} more — view all in your dashboard
                  </p>
                )}
              </div>
              <div className="trial-badge">Trial active · $2 / TV / month · no commitment</div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
