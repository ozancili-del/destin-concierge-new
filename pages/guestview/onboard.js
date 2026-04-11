import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const TV_BRANDS = ['Samsung', 'LG', 'Sony', 'Vizio', 'TCL', 'Hisense', 'Toshiba', 'Other'];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_ANON_KEY
  );
}

export default function GuestViewOnboard() {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [legalChecked, setLegalChecked] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlLog, setCrawlLog] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [wifiSameBuilding, setWifiSameBuilding] = useState({});
  const [checkTimes, setCheckTimes] = useState([]);
  const [allSameTimes, setAllSameTimes] = useState(false);
  const [missingUnits, setMissingUnits] = useState([]);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [hostInfo, setHostInfo] = useState({ name: '', phone: '', email: '', website: '', affiliate: '' });
  const [authMode, setAuthMode] = useState(null);
  const [authSent, setAuthSent] = useState(false);
  const [email, setEmail] = useState('');
  const [user, setUser] = useState(null);
  const [orEmail, setOrEmail] = useState('');
  const [orKey, setOrKey] = useState('');
  const [orValidating, setOrValidating] = useState(false);
  const [orSample, setOrSample] = useState(null);
  const [orError, setOrError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedUnits, setSavedUnits] = useState([]);
  const [error, setError] = useState('');
  const [claimedModal, setClaimedModal] = useState(false);
  const [claimedEmail, setClaimedEmail] = useState('');
  const [claimedAuthSent, setClaimedAuthSent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingConnect, setPendingConnect] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        try {
          const saved = localStorage.getItem('guestview_onboard_data');
          if (saved) {
            const data = JSON.parse(saved);
            if (data.buildings) setBuildings(data.buildings);
            if (data.checkTimes) setCheckTimes(data.checkTimes);
            if (data.hostInfo) setHostInfo(data.hostInfo);
            if (data.url) setUrl(data.url);
            await saveUnitsToSupabase(session.user.id, data);
            localStorage.removeItem('guestview_onboard_data');
            setStep(6);
          } else {
            // Check if already has units — if so go to dashboard
            const res = await fetch(`/api/guestview/get-units?user_id=${session.user.id}`);
            const data = await res.json();
            if (data.units?.length > 0) {
              window.location.href = '/guestview';
            } else {
              setStep(6);
            }
          }
        } catch (e) { setStep(6); }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) {
        setUser(session.user);
        setStep(6);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function saveUnitsToSupabase(userId, data) {
    try {
      const allUnits = (data.buildings || []).flatMap((b, bIdx) => b.units.map(u => ({
        ...u,
        building: b.name,
        checkin_time: data.checkTimes?.[bIdx]?.checkin || '4:00 PM',
        checkout_time: data.checkTimes?.[bIdx]?.checkout || '10:00 AM',
        host_name: data.hostInfo?.name || '',
        host_phone: data.hostInfo?.phone || '',
        host_email: data.hostInfo?.email || '',
        host_website: data.hostInfo?.website || '',
        affiliate_url: data.hostInfo?.affiliate || ''
      })));
      await fetch('/api/guestview/save-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, user_slug: userId.substring(0, 8), units: allUnits, website_url: data.url, email: data.hostInfo?.email || '' })
      });
      // Also save user profile
      await fetch('/api/guestview/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, email: data.hostInfo?.email || '', name: data.hostInfo?.name || '', phone: data.hostInfo?.phone || '', website: data.hostInfo?.website || '', affiliate_url: data.hostInfo?.affiliate || '' })
      });
    } catch (e) { console.error('saveUnitsToSupabase error:', e); }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem('guestview_onboard_data', JSON.stringify({ buildings, checkTimes, hostInfo, url }));
    } catch (e) { console.error('localStorage save error:', e); }
  }

  async function handleCrawl() {
    if (!url.trim() || !legalChecked) return;
    setCrawling(true);
    setError('');
    setCrawlLog([]);
    try {
      const checkRes = await fetch('/api/guestview/check-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const checkData = await checkRes.json();
      if (checkData.claimed) { setCrawling(false); setClaimedModal(true); return; }
    } catch (e) {}

    const logs = ['Connecting to your website...', 'Scanning property listings...', 'Grouping units by building...'];
    for (let i = 0; i < logs.length; i++) {
      await new Promise(r => setTimeout(r, 700));
      setCrawlLog(prev => [...prev, { text: logs[i], done: false }]);
      await new Promise(r => setTimeout(r, 500));
      setCrawlLog(prev => prev.map((l, idx) => idx === i ? { ...l, done: true } : l));
    }
    try {
      const res = await fetch('/api/guestview/crawl', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const withState = data.data.buildings.map(b => ({
        ...b,
        units: b.units.map(u => {
          const numMatch = u.name.match(/\b(\d{3,4})\b/);
          return { ...u, active: true, wifi_name: '', wifi_password: '', tv_brand: '', unit_number: numMatch ? numMatch[1] : '' };
        })
      }));
      setBuildings(withState);
      setCheckTimes(data.data.buildings.map(b => ({ building: b.name, checkin: '4:00 PM', checkout: '10:00 AM' })));
      setCrawlLog(prev => [...prev, { text: `Found ${data.data.total} units across ${data.data.buildings.length} buildings`, done: true, highlight: true }]);
      await new Promise(r => setTimeout(r, 800));
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to crawl website');
    } finally {
      setCrawling(false);
    }
  }

  function handleLooksGood() {
    const missing = [];
    buildings.forEach(b => {
      b.units.forEach(u => {
        if (!u.active) return;
        const gaps = [];
        if (!u.unit_number) gaps.push('unit #');
        if (!u.wifi_name) gaps.push('WiFi name');
        if (!u.wifi_password) gaps.push('WiFi password');
        if (gaps.length) missing.push({ building: b.name, unit: u.name, gaps });
      });
    });
    if (missing.length) {
      setMissingUnits(missing);
      setShowMissingModal(true);
    } else {
      setStep(3);
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

  function updateCheckTime(idx, field, value) {
    setCheckTimes(prev => prev.map((t, i) => i !== idx ? t : { ...t, [field]: value }));
  }

  function toggleAllSameTimes() {
    const isOn = !allSameTimes;
    setAllSameTimes(isOn);
    if (isOn && checkTimes.length > 0) {
      const first = checkTimes[0];
      setCheckTimes(prev => prev.map(t => ({ ...t, checkin: first.checkin, checkout: first.checkout })));
    }
  }

  function handleTimeChange(idx, field, value) {
    if (allSameTimes) {
      setCheckTimes(prev => prev.map(t => ({ ...t, [field]: value })));
    } else {
      updateCheckTime(idx, field, value);
    }
  }

  async function handleAuth() {
    setError('');
    if (!email.trim()) return;
    saveToLocalStorage();
    const { error } = await getSupabase().auth.signInWithOtp({
      email, options: { emailRedirectTo: `${window.location.origin}/guestview/onboard` }
    });
    if (error) { setError(error.message); return; }
    setAuthSent(true);
  }

  async function handleGoogleAuth() {
    saveToLocalStorage();
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/guestview/onboard` }
    });
    if (error) setError(error.message);
  }

  async function handleClaimedLogin() {
    if (!claimedEmail.trim()) return;
    const { error } = await getSupabase().auth.signInWithOtp({
      email: claimedEmail,
      options: { emailRedirectTo: `${window.location.origin}/guestview/onboard` }
    });
    if (error) { setError(error.message); return; }
    setClaimedAuthSent(true);
  }

  async function handleSaveUnits() {
    setSaving(true);
    setError('');
    try {
      const allUnits = buildings.flatMap((b, bIdx) => b.units.map(u => ({
        ...u,
        building: b.name,
        checkin_time: checkTimes[bIdx]?.checkin || '4:00 PM',
        checkout_time: checkTimes[bIdx]?.checkout || '10:00 AM',
        host_name: hostInfo.name,
        host_phone: hostInfo.phone,
        host_email: hostInfo.email,
        host_website: hostInfo.website,
        affiliate_url: hostInfo.affiliate
      })));
      const res = await fetch('/api/guestview/save-units', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, user_slug: user.email.split('@')[0], units: allUnits, website_url: url, email: user.email || '' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedUnits(data.units);
      setStep(8);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleConnectClick() {
    if (!orEmail.trim() || !orKey.trim()) return;
    setShowConsentModal(true);
  }

  async function handleValidateOR() {
    setShowConsentModal(false);
    setOrValidating(true);
    setOrError('');
    try {
      const res = await fetch('/api/guestview/validate-or', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ or_email: orEmail, or_key: orKey, user_id: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrSample(data.sample);
      await new Promise(r => setTimeout(r, 1500));
      // If buildings is empty, units already saved — go straight to dashboard
      const activeUnits = buildings.flatMap(b => b.units.filter(u => u.active));
      if (activeUnits.length === 0) {
        window.location.href = '/guestview';
      } else {
        handleSaveUnits();
      }
    } catch (err) {
      setOrError(err.message);
    } finally {
      setOrValidating(false);
    }
  }

  const activeCount = buildings.flatMap(b => b.units.filter(u => u.active)).length;
  const totalSteps = 8;

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
        .top-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 2rem; }
        .back-btn { background: #fff; border: 1px solid #e8e6e0; border-radius: 8px; height: 42px; padding: 0 20px; font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif; color: #6b6b65; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .back-btn:hover { background: #f7f6f3; color: #1a1a18; }
        .steps { display: flex; gap: 5px; flex: 1; }
        .step-pip { height: 3px; border-radius: 2px; background: #e8e6e0; flex: 1; transition: background 0.3s; }
        .step-pip.done { background: #1D9E75; }
        .step-pip.active { background: #1D9E75; opacity: 0.5; }
        h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 0.4rem; }
        .sub { font-size: 15px; color: #6b6b65; line-height: 1.6; margin-bottom: 2rem; }
        .input-row { display: flex; gap: 8px; margin-bottom: 1rem; }
        input[type=text], input[type=email] { width: 100%; height: 42px; border: 1px solid #e8e6e0; border-radius: 8px; padding: 0 12px; font-size: 14px; font-family: 'DM Sans', sans-serif; background: #fafaf8; color: #1a1a18; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: #1D9E75; background: #fff; }
        .btn { height: 42px; padding: 0 20px; border-radius: 8px; font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.15s; border: none; white-space: nowrap; }
        .btn-primary { background: #1D9E75; color: #fff; }
        .btn-primary:hover { background: #0F6E56; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-outline { background: #fff; color: #1a1a18; border: 1px solid #e8e6e0; }
        .btn-outline:hover { background: #f7f6f3; }
        .legal-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 1.5rem; padding: 12px 14px; background: #fafaf8; border: 1px solid #e8e6e0; border-radius: 8px; cursor: pointer; }
        .legal-check { width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid #d0cdc7; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; transition: all 0.15s; }
        .legal-check.checked { background: #1D9E75; border-color: #1D9E75; }
        .legal-check-mark { color: #fff; font-size: 11px; font-weight: 700; }
        .legal-text { font-size: 12px; color: #6b6b65; line-height: 1.6; }
        .legal-text a { color: #1D9E75; text-decoration: none; }
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
        .times-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
        .times-table th { text-align: left; font-size: 11px; font-weight: 500; color: #9b9b94; padding: 0 8px 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .times-table td { padding: 5px 6px; vertical-align: middle; font-size: 13px; }
        .times-table input { width: 100%; height: 34px; border: 1px solid #e8e6e0; border-radius: 6px; padding: 0 10px; font-size: 13px; font-family: 'DM Sans', sans-serif; background: #fafaf8; color: #1a1a18; outline: none; }
        .times-table input:focus { border-color: #1D9E75; }
        .times-table input:disabled { opacity: 0.5; }
        .same-times-bar { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-bottom: 12px; font-size: 13px; color: #6b6b65; cursor: pointer; user-select: none; }
        .host-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 1.5rem; }
        .host-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .host-field { display: flex; flex-direction: column; gap: 5px; }
        .host-field label { font-size: 11px; font-weight: 500; color: #6b6b65; text-transform: uppercase; letter-spacing: 0.4px; }
        .affiliate-note { font-size: 12px; color: #9b9b94; margin-top: 4px; line-height: 1.5; }
        .err { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #dc2626; margin-bottom: 1rem; }
        .auth-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.5rem; }
        .auth-card { border: 1px solid #e8e6e0; border-radius: 10px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.15s; background: #fff; }
        .auth-card:hover { background: #f7f6f3; }
        .auth-icon { font-size: 22px; margin-bottom: 6px; }
        .auth-label { font-size: 14px; font-weight: 500; }
        .auth-sublabel { font-size: 12px; color: #9b9b94; margin-top: 2px; }
        .divider { display: flex; align-items: center; gap: 12px; margin: 1.25rem 0; color: #9b9b94; font-size: 13px; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e8e6e0; }
        .or-form { background: #fafaf8; border: 1px solid #e8e6e0; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; }
        .or-form label { font-size: 12px; font-weight: 500; color: #6b6b65; display: block; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.4px; }
        .or-form input { margin-bottom: 10px; }
        .or-sample { background: #e8f7f1; border: 1px solid #b3e6d4; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #0F6E56; }
        .sent-box { background: #e8f7f1; border: 1px solid #b3e6d4; border-radius: 10px; padding: 1.25rem; text-align: center; }
        .sent-box p { font-size: 14px; color: #0F6E56; line-height: 1.6; }
        .success-wrap { text-align: center; padding: 1rem 0; }
        .success-icon { width: 60px; height: 60px; background: #e8f7f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 26px; }
        .url-list { margin-top: 1.5rem; text-align: left; }
        .url-item { background: #fafaf8; border: 1px solid #e8e6e0; border-radius: 8px; padding: 10px 14px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
        .url-building { font-size: 12px; color: #9b9b94; margin-bottom: 2px; }
        .url-val { font-size: 12px; font-family: 'DM Mono', monospace; color: #1D9E75; }
        .trial-badge { display: inline-flex; align-items: center; gap: 6px; background: #e8f7f1; color: #0F6E56; border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: 500; margin-top: 1.5rem; }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; margin-right: 6px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
        .modal { background: #fff; border-radius: 16px; padding: 2rem; max-width: 440px; width: 100%; }
        .modal h2 { font-size: 18px; font-weight: 600; margin-bottom: 0.5rem; }
        .modal p { font-size: 14px; color: #6b6b65; line-height: 1.6; margin-bottom: 1rem; }
        .modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #9b9b94; float: right; margin-top: -4px; }
        .missing-list { background: #fef9ec; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; margin-bottom: 1rem; }
        .missing-item { font-size: 13px; color: #92400e; padding: 3px 0; }
        .modal-btns { display: flex; gap: 8px; }
        .already-account { text-align: center; margin-top: 1rem; font-size: 13px; color: #9b9b94; }
        .already-account a { color: #1D9E75; cursor: pointer; font-weight: 500; text-decoration: none; }
      `}</style>

      {claimedModal && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="modal-close" onClick={() => setClaimedModal(false)}>×</button>
            <h2>This website is already registered</h2>
            <p>Another GuestView account is linked to this website. If you own it, log in to access your account.</p>
            {!claimedAuthSent ? (
              <div className="input-row">
                <input type="email" placeholder="your@email.com" value={claimedEmail} onChange={e => setClaimedEmail(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={handleClaimedLogin}>Log in →</button>
              </div>
            ) : (
              <div className="sent-box"><p>Magic link sent to <strong>{claimedEmail}</strong>. Check your inbox.</p></div>
            )}
          </div>
        </div>
      )}

      {showMissingModal && (() => {
        const gapCounts = {};
        missingUnits.forEach(m => m.gaps.forEach(g => { gapCounts[g] = (gapCounts[g] || 0) + 1; }));
        return (
        <div className="modal-overlay">
          <div className="modal">
            <button className="modal-close" onClick={() => setShowMissingModal(false)}>×</button>
            <h2>Some info is missing</h2>
            <p>You can finish now or fill in the gaps later from your dashboard.</p>
            <div className="missing-list">
              {Object.entries(gapCounts).map(([gap, count]) => (
                <div key={gap} className="missing-item">{count} unit{count > 1 ? 's' : ''} missing {gap}</div>
              ))}
            </div>
            <div className="modal-btns">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowMissingModal(false)}>Finish now</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setShowMissingModal(false); setStep(3); }}>Fill in dashboard →</button>
            </div>
          </div>
        </div>
        );
      })()}

      <div className="wrap">
        <div className="card">
          <div className="logo">Guest<span>View</span></div>
          <div className="top-bar">
            <div className="steps">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`step-pip ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`} />
              ))}
            </div>
          </div>

          {step === 1 && (
            <>
              <h1>Welcome — let's find your units</h1>
              <p className="sub">Enter your vacation rental website and we'll scan it to find all your properties automatically.</p>
              <div className="input-row">
                <input type="text" placeholder="yoursite.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && !crawling && handleCrawl()} style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={handleCrawl} disabled={crawling || !url.trim() || !legalChecked}>
                  {crawling ? <><span className="spinner" />Scanning...</> : 'Find my units →'}
                </button>
              </div>
              <div className="legal-row" onClick={() => setLegalChecked(v => !v)}>
                <div className={`legal-check ${legalChecked ? 'checked' : ''}`}>
                  {legalChecked && <span className="legal-check-mark">✓</span>}
                </div>
                <span className="legal-text">I confirm I own or am authorized to manage this website and have the legal right to scan its content for use with GuestView. I agree to the <a href="#" onClick={e => e.stopPropagation()}>Terms of Service</a>.</span>
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
              <div className="already-account">Already have an account? <a onClick={() => setStep(5)}>Log in</a></div>
            </>
          )}

          {step === 2 && (
            <>
              <h1>Are these your units?</h1>
              <p className="sub">We found {activeCount} units. Uncheck any you don't want on GuestView, then fill in WiFi and TV details.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button className="btn-outline btn" style={{ height: 32, fontSize: 12, padding: '0 14px' }}
                  onClick={() => {
                    const allActive = buildings.every(b => b.units.every(u => u.active));
                    setBuildings(prev => prev.map(b => ({ ...b, units: b.units.map(u => ({ ...u, active: !allActive })) })));
                  }}>
                  {buildings.every(b => b.units.every(u => u.active)) ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {error && <div className="err">{error}</div>}
              {buildings.map((b, bIdx) => (
                <div key={bIdx} className="building-block">
                  <div className="building-header">
                    <div><span className="building-name">{b.name}</span><span className="building-count">({b.units.length} units)</span></div>
                    <div className="wifi-toggle" onClick={() => toggleWifi(bIdx)}>
                      <div className={`tog ${wifiSameBuilding[`b${bIdx}`] ? 'on' : ''}`} />
                      <span>Same WiFi for all</span>
                    </div>
                  </div>
                  <table className="unit-table">
                    <thead><tr><th></th><th>Unit</th><th>Unit #</th><th>WiFi name</th><th>WiFi password</th><th>TV brand</th></tr></thead>
                    <tbody>
                      {b.units.map((u, uIdx) => (
                        <tr key={uIdx} className={u.active ? '' : 'inactive'}>
                          <td><div className={`checkbox ${u.active ? 'checked' : ''}`} onClick={() => toggleUnit(bIdx, uIdx)}>{u.active && <span className="check-mark">✓</span>}</div></td>
                          <td style={{ fontSize: 12, color: '#6b6b65', paddingLeft: 4 }}>{u.name}</td>
                          <td><input type="text" placeholder="707" value={u.unit_number} onChange={e => updateUnit(bIdx, uIdx, 'unit_number', e.target.value)} disabled={!u.active} /></td>
                          <td><input type="text" placeholder="Network" value={u.wifi_name} onChange={e => handleWifiChange(bIdx, uIdx, 'wifi_name', e.target.value)} disabled={!u.active || (wifiSameBuilding[`b${bIdx}`] && uIdx > 0)} /></td>
                          <td><input type="text" placeholder="Password" value={u.wifi_password} onChange={e => handleWifiChange(bIdx, uIdx, 'wifi_password', e.target.value)} disabled={!u.active || (wifiSameBuilding[`b${bIdx}`] && uIdx > 0)} /></td>
                          <td><select value={u.tv_brand} onChange={e => updateUnit(bIdx, uIdx, 'tv_brand', e.target.value)} disabled={!u.active}><option value="">Brand</option>{TV_BRANDS.map(tv => <option key={tv}>{tv}</option>)}</select></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <div className="confirm-bar">
                <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="confirm-note">{activeCount} units selected</span>
                  <button className="btn btn-primary" onClick={handleLooksGood}>Looks good →</button>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1>Check-in & check-out times</h1>
              <p className="sub">Set the times per building. Most hosts use the same times everywhere.</p>
              <div className="same-times-bar" onClick={toggleAllSameTimes}>
                <div className={`tog ${allSameTimes ? 'on' : ''}`} />
                <span>All buildings same times</span>
              </div>
              <table className="times-table">
                <thead><tr><th>Building</th><th>Check-in</th><th>Check-out</th></tr></thead>
                <tbody>
                  {checkTimes.map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{t.building}</td>
                      <td><input type="text" value={t.checkin} onChange={e => handleTimeChange(i, 'checkin', e.target.value)} disabled={allSameTimes && i > 0} /></td>
                      <td><input type="text" value={t.checkout} onChange={e => handleTimeChange(i, 'checkout', e.target.value)} disabled={allSameTimes && i > 0} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="confirm-bar">
                <button className="back-btn" onClick={() => setStep(2)}>← Back</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="confirm-note">You can update these anytime in your dashboard</span>
                  <button className="btn btn-primary" onClick={() => setStep(4)}>Next →</button>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h1>Your host info</h1>
              <p className="sub">This shows on the TV so guests know how to reach you.</p>
              <div className="host-form">
                <div className="host-row">
                  <div className="host-field"><label>Your first name</label><input type="text" placeholder="e.g. Tufan" value={hostInfo.name} onChange={e => setHostInfo(p => ({ ...p, name: e.target.value }))} /></div>
                  <div className="host-field"><label>Phone number</label><input type="text" placeholder="+1 (555) 000-0000" value={hostInfo.phone} onChange={e => setHostInfo(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div className="host-row">
                  <div className="host-field"><label>Email</label><input type="text" placeholder="you@example.com" value={hostInfo.email} onChange={e => setHostInfo(p => ({ ...p, email: e.target.value }))} /></div>
                  <div className="host-field"><label>Website</label><input type="text" placeholder="vacationsatdestin.com" value={hostInfo.website} onChange={e => setHostInfo(p => ({ ...p, website: e.target.value }))} /></div>
                </div>
                <div className="host-field">
                  <label>Activities affiliate link</label>
                  <input type="text" placeholder="e.g. tripshock.com/?aff=yourcode" value={hostInfo.affiliate} onChange={e => setHostInfo(p => ({ ...p, affiliate: e.target.value }))} />
                  <div className="affiliate-note">We'll automatically generate a QR code from this link and display it on your TV dashboard so guests can book activities directly.</div>
                </div>
              </div>
              <div className="confirm-bar">
                <button className="back-btn" onClick={() => setStep(3)}>← Back</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="confirm-note">All fields optional — update anytime in dashboard</span>
                  <button className="btn btn-primary" onClick={() => setStep(5)}>Next →</button>
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h1>Create your account</h1>
              <p className="sub">Almost done. Sign in to save your setup and get your TV URLs.</p>
              {error && <div className="err">{error}</div>}
              {!authSent ? (
                <>
                  <div className="auth-grid">
                    <div className="auth-card" onClick={handleGoogleAuth}><div className="auth-icon">G</div><div className="auth-label">Google</div><div className="auth-sublabel">One click</div></div>
                    <div className="auth-card" onClick={() => setAuthMode('email')}><div className="auth-icon">@</div><div className="auth-label">Email link</div><div className="auth-sublabel">No password</div></div>
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
                  <div className="confirm-bar" style={{ marginTop: '1.5rem' }}>
                    <button className="back-btn" onClick={() => setStep(4)}>← Back</button>
                  </div>
                </>
              ) : (
                <div className="sent-box"><p>Magic link sent to <strong>{email}</strong>.<br />Check your inbox and click the link to continue.</p></div>
              )}
            </>
          )}

          {step === 6 && user && (
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
                  <div style={{ fontSize: 12, color: '#9b9b94', marginBottom: 10, marginTop: -4, padding: '6px 10px', background: '#f7f6f3', borderRadius: 6 }}>
                    Not ready to connect yet? Enter <strong style={{ fontFamily: 'DM Mono, monospace' }}>1111</strong> as your API key to explore with sample guest data first.
                  </div>
                  <button className="btn btn-primary" onClick={handleConnectClick} disabled={orValidating || !orEmail || !orKey} style={{ width: '100%', marginTop: 4 }}>
                    {orValidating ? <><span className="spinner" />Connecting...</> : 'Connect OwnerRez →'}
                  </button>
                </div>
              ) : (
                <div className="or-sample">
                  {orSample ? <>✓ Connected — found booking for <strong>{orSample.guest_first_name}</strong>, arriving <strong>{orSample.arrival}</strong>, departing <strong>{orSample.departure}</strong></> : '✓ Connected in demo mode — sample guest data ready'}
                </div>
              )}
              {saving && <p style={{ fontSize: 13, color: '#9b9b94', marginTop: 10 }}>Saving your units...</p>}
            </>
          )}

          {/* Consent Modal */}
          {showConsentModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Data access authorization</h2>
                <p style={{ fontSize: 14, color: '#6b6b65', lineHeight: 1.7, marginBottom: 16 }}>
                  By connecting OwnerRez, you authorize GuestView to access the following guest data only:
                </p>
                <div style={{ background: '#f7f6f3', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#1a1a18', padding: '4px 0', display: 'flex', gap: 8 }}>✓ Guest first name</div>
                  <div style={{ fontSize: 13, color: '#1a1a18', padding: '4px 0', display: 'flex', gap: 8 }}>✓ Check-in date</div>
                  <div style={{ fontSize: 13, color: '#1a1a18', padding: '4px 0', display: 'flex', gap: 8 }}>✓ Check-out date</div>
                </div>
                <p style={{ fontSize: 12, color: '#9b9b94', marginBottom: 20, lineHeight: 1.6 }}>
                  We access nothing else. No payment information, no contact details, no personal data beyond what's listed above.
                </p>
                <div className="modal-btns">
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowConsentModal(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleValidateOR}>I agree, connect →</button>
                </div>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="success-wrap">
              <div className="success-icon">✓</div>
              <h1>You're all set.</h1>
              <p className="sub" style={{ marginBottom: '0.5rem' }}>Your TV dashboard URLs are ready. Point each Amazon Signage Stick at its URL via AbleSign.</p>
              <div className="url-list">
                {savedUnits.slice(0, 5).map((u, i) => (
                  <div key={i} className="url-item">
                    <div><div className="url-building">{u.building}</div><div className="url-val">{u.tv_url}</div></div>
                    <button className="btn btn-outline" style={{ fontSize: 12, height: 30, padding: '0 12px' }} onClick={() => navigator.clipboard.writeText(`https://${u.tv_url}`)}>Copy</button>
                  </div>
                ))}
                {savedUnits.length > 5 && <p style={{ fontSize: 13, color: '#9b9b94', textAlign: 'center', marginTop: 8 }}>+ {savedUnits.length - 5} more — view all in your dashboard</p>}
              </div>
              <div className="trial-badge">Trial active · $2 / TV / month · no commitment</div>
              <div style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.location.href = '/guestview'}>Go to my dashboard →</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
