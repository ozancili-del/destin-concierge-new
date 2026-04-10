import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import { useRouter } from 'next/router';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_ANON_KEY
  );
}

const ANNOUNCEMENT_TYPES = [
  'Pool closed / limited access',
  'Elevator out of service',
  'Parking restrictions',
  'Pest control scheduled',
  'Water shut-off',
  'WiFi maintenance',
  'Construction noise expected',
  'Holiday check-in reminder',
  'Custom message'
];

export default function GuestViewDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [units, setUnits] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showAddAnnounce, setShowAddAnnounce] = useState(false);
  const [activeNav, setActiveNav] = useState('units');
  const [form, setForm] = useState({});
  const [announceForm, setAnnounceForm] = useState({ type: '', start: '', end: '' });
  const [toast, setToast] = useState('');

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push('/guestview/onboard'); return; }
      setUser(session.user);
      await loadData(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session?.user) { router.push('/guestview/onboard'); return; }
      setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadData(userId) {
    try {
      const res = await fetch(`/api/guestview/get-units?user_id=${userId}`);
      const data = await res.json();
      setUnits(data.units || []);
      setProfile(data.profile || null);
      setAnnouncements(data.announcements || []);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }

  function openUnit(unit) {
    setSelectedUnit(unit);
    setForm({
      unit_number: unit.unit_number || '',
      tv_brand: unit.tv_brand || '',
      wifi_name: unit.wifi_name || '',
      wifi_password: unit.wifi_password || '',
      checkin_time: unit.checkin_time || '4:00 PM',
      checkout_time: unit.checkout_time || '10:00 AM',
      headline: unit.headline || `${unit.building} · Unit ${unit.unit_number} · Destin, Florida`,
      accent_color: unit.accent_color || '#48cae4',
      host_name: unit.host_name || profile?.name || '',
      host_phone: unit.host_phone || profile?.phone || '',
      host_email: unit.host_email || profile?.email || '',
      host_website: unit.host_website || profile?.website || '',
      affiliate_url: unit.affiliate_url || profile?.affiliate_url || '',
    });
    setHasUnsaved(false);
    setShowAddAnnounce(false);
    setModalOpen(true);
  }

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasUnsaved(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/guestview/update-unit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit_id: selectedUnit.id, user_id: user.id, ...form, status: 'draft' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUnits(prev => prev.map(u => u.id === selectedUnit.id ? { ...u, ...form, status: 'draft' } : u));
      setSelectedUnit(prev => ({ ...prev, ...form, status: 'draft' }));
      setHasUnsaved(false);
      showToast('Draft saved.');
    } catch (e) {
      showToast('Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (hasUnsaved) await handleSave();
    setPublishing(true);
    try {
      const res = await fetch('/api/guestview/publish-unit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit_id: selectedUnit.id, user_id: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUnits(prev => prev.map(u => u.id === selectedUnit.id ? { ...u, status: 'live', published_at: new Date().toISOString() } : u));
      setModalOpen(false);
      showToast('Published! TV dashboard is now live.');
    } catch (e) {
      showToast('Publish failed. Try again.');
    } finally {
      setPublishing(false);
    }
  }

  function handlePreview() {
    const slug = selectedUnit.tv_url?.split('/tv/')?.[1] || selectedUnit.id;
    window.open(`/tv/preview/${slug}`, '_blank');
  }

  async function handleSaveAnnouncement() {
    if (!announceForm.type || !announceForm.start || !announceForm.end) return;
    try {
      const res = await fetch('/api/guestview/save-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          building: selectedUnit.building,
          message: announceForm.type,
          starts_at: announceForm.start,
          expires_at: announceForm.end
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnnouncements(prev => [...prev, data.announcement]);
      setAnnounceForm({ type: '', start: '', end: '' });
      setShowAddAnnounce(false);
      showToast('Announcement saved.');
    } catch (e) {
      showToast('Failed to save announcement.');
    }
  }

  async function handleSignOut() {
    await getSupabase().auth.signOut();
    router.push('/guestview/onboard');
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  const buildingGroups = units.reduce((acc, u) => {
    if (!acc[u.building]) acc[u.building] = [];
    acc[u.building].push(u);
    return acc;
  }, {});

  const unitAnnouncements = selectedUnit
    ? announcements.filter(a => a.building === selectedUnit.building)
    : [];

  const statusInfo = (unit) => {
    if (unit.status === 'live') return { label: 'Live', cls: 'pill-live' };
    if (unit.status === 'draft') return { label: 'Draft', cls: 'pill-draft' };
    return { label: 'Not published', cls: 'pill-empty' };
  };

  const modalStatus = () => {
    if (hasUnsaved) return { dot: 'dot-red', title: selectedUnit?.status === 'live' ? 'Live — unsaved changes' : 'Unsaved changes', sub: 'Save your changes first' };
    if (selectedUnit?.status === 'live') return { dot: 'dot-green', title: `Live — published ${selectedUnit.published_at ? new Date(selectedUnit.published_at).toLocaleDateString() : ''}`, sub: 'Up to date' };
    if (selectedUnit?.status === 'draft') return { dot: 'dot-amber', title: 'Draft saved — not yet published', sub: 'Preview before publishing' };
    return { dot: 'dot-amber', title: 'Not published yet', sub: 'Save draft or publish when ready' };
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f3', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#6b6b65' }}>
      Loading your dashboard...
    </div>
  );

  return (
    <>
      <Head>
        <title>GuestView Dashboard</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #f7f6f3; font-family: 'DM Sans', sans-serif; color: #1a1a18; }
        .shell { display: flex; min-height: 100vh; }
        .sidebar { width: 210px; background: #fff; border-right: 1px solid #e8e6e0; padding: 1.25rem 0; flex-shrink: 0; display: flex; flex-direction: column; position: fixed; top: 0; bottom: 0; left: 0; }
        .sb-logo { font-size: 15px; font-weight: 600; color: #1a1a18; padding: 0 1.25rem 1.25rem; border-bottom: 1px solid #e8e6e0; margin-bottom: 0.75rem; }
        .sb-logo span { color: #1D9E75; }
        .sb-section { font-size: 10px; font-weight: 500; color: #9b9b94; text-transform: uppercase; letter-spacing: 0.5px; padding: 0.5rem 1.25rem 0.25rem; }
        .sb-item { display: flex; align-items: center; gap: 8px; padding: 8px 1.25rem; font-size: 13px; color: #6b6b65; cursor: pointer; transition: all 0.15s; }
        .sb-item:hover { background: #f7f6f3; color: #1a1a18; }
        .sb-item.active { background: #E1F5EE; color: #0F6E56; font-weight: 500; }
        .sb-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .sb-bottom { margin-top: auto; padding: 1rem 1.25rem; border-top: 1px solid #e8e6e0; }
        .sb-user { font-size: 13px; font-weight: 500; color: #1a1a18; }
        .sb-email { font-size: 11px; color: #9b9b94; margin-top: 2px; }
        .sb-signout { font-size: 12px; color: #9b9b94; cursor: pointer; margin-top: 8px; }
        .sb-signout:hover { color: #1a1a18; }
        .main { margin-left: 210px; flex: 1; padding: 2rem; }
        .main-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
        .main-header h1 { font-size: 20px; font-weight: 600; color: #1a1a18; }
        .badge-trial { background: #E1F5EE; color: #0F6E56; font-size: 11px; font-weight: 500; padding: 3px 12px; border-radius: 20px; }
        .building-label { font-size: 10px; font-weight: 500; color: #9b9b94; text-transform: uppercase; letter-spacing: 0.5px; margin: 1.25rem 0 6px; }
        .unit-card { background: #fff; border: 1px solid #e8e6e0; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: border-color 0.15s; max-width: 680px; }
        .unit-card:hover { border-color: #c8c6c0; }
        .unit-name { font-size: 15px; font-weight: 500; color: #1a1a18; }
        .unit-sub { font-size: 12px; color: #9b9b94; margin-top: 2px; }
        .unit-right { display: flex; align-items: center; gap: 10px; }
        .pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px; }
        .pill-live { background: #E1F5EE; color: #0F6E56; }
        .pill-draft { background: #FAEEDA; color: #633806; }
        .pill-empty { background: #f7f6f3; color: #9b9b94; border: 1px solid #e8e6e0; }
        .pill-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .arrow { font-size: 18px; color: #9b9b94; }
        .modal-bg { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; align-items: center; justify-content: center; padding: 1.5rem; }
        .modal-bg.open { display: flex; }
        .modal { background: #fff; border-radius: 16px; width: 100%; max-width: 820px; max-height: 90vh; display: flex; flex-direction: column; border: 1px solid #e8e6e0; overflow: hidden; }
        .modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e8e6e0; display: flex; align-items: flex-start; justify-content: space-between; flex-shrink: 0; }
        .modal-title { font-size: 16px; font-weight: 600; color: #1a1a18; }
        .modal-sub { font-size: 11px; color: #1D9E75; font-family: 'DM Mono', monospace; margin-top: 3px; }
        .modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #9b9b94; line-height: 1; padding: 0; }
        .modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .col { display: flex; flex-direction: column; gap: 1.25rem; }
        .section { background: #fafaf8; border-radius: 12px; padding: 1rem 1.25rem; border: 1px solid #f0ede8; }
        .section h3 { font-size: 11px; font-weight: 500; color: #9b9b94; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0ede8; }
        .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .field { display: flex; flex-direction: column; gap: 4px; }
        .field.full { grid-column: 1 / -1; }
        .field label { font-size: 10px; font-weight: 500; color: #6b6b65; text-transform: uppercase; letter-spacing: 0.4px; }
        .field input[type=text], .field input[type=date] { height: 34px; border: 1px solid #e8e6e0; border-radius: 8px; padding: 0 10px; font-size: 13px; background: #fff; color: #1a1a18; outline: none; font-family: 'DM Sans', sans-serif; width: 100%; }
        .field input[type=color] { height: 34px; border: 1px solid #e8e6e0; border-radius: 8px; padding: 2px 4px; cursor: pointer; width: 100%; }
        .field input:focus { border-color: #1D9E75; }
        .color-preview { display: flex; align-items: center; gap: 8px; margin-top: 5px; font-size: 11px; color: #9b9b94; }
        .color-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
        .announce-row { background: #fff; border-radius: 8px; padding: 9px 12px; margin-bottom: 6px; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; border: 1px solid #e8e6e0; }
        .announce-msg { font-size: 12px; color: #1a1a18; margin-bottom: 2px; }
        .announce-meta { font-size: 10px; color: #9b9b94; }
        .ann-badge { font-size: 10px; padding: 2px 7px; border-radius: 20px; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
        .ann-live { background: #E1F5EE; color: #0F6E56; }
        .ann-sched { background: #FAEEDA; color: #633806; }
        .add-btn { background: none; border: none; color: #1D9E75; font-size: 12px; font-weight: 500; cursor: pointer; padding: 4px 0; font-family: 'DM Sans', sans-serif; }
        .add-form { background: #fff; border-radius: 8px; padding: 10px; margin-top: 6px; border: 1px solid #e8e6e0; }
        .add-form select { width: 100%; height: 32px; border: 1px solid #e8e6e0; border-radius: 8px; padding: 0 8px; font-size: 12px; background: #fff; color: #1a1a18; font-family: 'DM Sans', sans-serif; margin-bottom: 6px; outline: none; }
        .date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }
        .date-row input { height: 32px; border: 1px solid #e8e6e0; border-radius: 8px; padding: 0 8px; font-size: 12px; background: #fff; color: #1a1a18; outline: none; font-family: 'DM Sans', sans-serif; width: 100%; }
        .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e8e6e0; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: #fff; gap: 1rem; }
        .footer-status { display: flex; align-items: center; gap: 8px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .dot-green { background: #1D9E75; }
        .dot-amber { background: #EF9F27; }
        .dot-red { background: #E24B4A; }
        .status-text strong { display: block; font-size: 13px; font-weight: 500; color: #1a1a18; }
        .status-text span { font-size: 11px; color: #9b9b94; }
        .footer-btns { display: flex; gap: 8px; }
        .btn { border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; border: none; padding: 9px 16px; white-space: nowrap; transition: all 0.15s; }
        .btn-primary { background: #1D9E75; color: #fff; }
        .btn-primary:hover { background: #0F6E56; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost { background: transparent; color: #6b6b65; border: 1px solid #e8e6e0; }
        .btn-ghost:hover { background: #f7f6f3; }
        .btn-save { background: transparent; color: #1a1a18; border: 1px solid #e8e6e0; }
        .btn-save:hover { background: #f7f6f3; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-sm { font-size: 11px; padding: 5px 12px; }
        .empty-state { text-align: center; padding: 3rem 1rem; color: #9b9b94; font-size: 14px; }
        .toast-wrap { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200; pointer-events: none; transition: opacity 0.3s; opacity: ${toast ? 1 : 0}; }
        .toast { background: #1a1a18; color: #fff; font-size: 13px; padding: 10px 18px; border-radius: 8px; white-space: nowrap; }
      `}</style>

      <div className="shell">
        <div className="sidebar">
          <div className="sb-logo">Guest<span>View</span></div>
          <div className="sb-section">Manage</div>
          <div className={`sb-item ${activeNav === 'units' ? 'active' : ''}`} onClick={() => setActiveNav('units')}><span className="sb-dot" />My units</div>
          <div className={`sb-item ${activeNav === 'announcements' ? 'active' : ''}`} onClick={() => setActiveNav('announcements')}><span className="sb-dot" />Announcements</div>
          <div className="sb-section">Account</div>
          <div className={`sb-item ${activeNav === 'ownerrez' ? 'active' : ''}`} onClick={() => setActiveNav('ownerrez')}><span className="sb-dot" />OwnerRez</div>
          <div className={`sb-item ${activeNav === 'branding' ? 'active' : ''}`} onClick={() => setActiveNav('branding')}><span className="sb-dot" />Branding</div>
          <div className={`sb-item ${activeNav === 'settings' ? 'active' : ''}`} onClick={() => setActiveNav('settings')}><span className="sb-dot" />Settings</div>
          <div className="sb-bottom">
            <div className="sb-user">{profile?.name || user?.email?.split('@')[0]}</div>
            <div className="sb-email">{user?.email}</div>
            <div className="sb-signout" onClick={handleSignOut}>Sign out</div>
          </div>
        </div>

        <div className="main">
          {activeNav === 'units' && (
            <>
              <div className="main-header">
                <h1>My units</h1>
                <span className="badge-trial">Trial · $2/TV/mo</span>
              </div>
              {Object.keys(buildingGroups).length === 0 ? (
                <div className="empty-state">No units found. Something went wrong — contact support.</div>
              ) : (
                Object.entries(buildingGroups).map(([building, bUnits]) => (
                  <div key={building}>
                    <div className="building-label">{building}</div>
                    {bUnits.map(unit => {
                      const s = statusInfo(unit);
                      return (
                        <div key={unit.id} className="unit-card" onClick={() => openUnit(unit)}>
                          <div>
                            <div className="unit-name">{unit.unit_name}</div>
                            <div className="unit-sub">Unit {unit.unit_number || '—'}</div>
                          </div>
                          <div className="unit-right">
                            <span className={`pill ${s.cls}`}><span className="pill-dot" />{s.label}</span>
                            <span className="arrow">›</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </>
          )}

          {activeNav === 'announcements' && (
            <>
              <div className="main-header"><h1>Announcements</h1></div>
              {announcements.length === 0 ? (
                <div className="empty-state">No announcements yet. Open a unit to add one.</div>
              ) : (
                announcements.map((a, i) => {
                  const now = new Date();
                  const start = new Date(a.starts_at);
                  const end = new Date(a.expires_at);
                  const isLive = now >= start && now <= end;
                  return (
                    <div key={i} className="announce-row" style={{ maxWidth: 680, marginBottom: 8 }}>
                      <div>
                        <div className="announce-msg">{a.message}</div>
                        <div className="announce-meta">{new Date(a.starts_at).toLocaleDateString()} – {new Date(a.expires_at).toLocaleDateString()} · {a.building}</div>
                      </div>
                      <span className={`ann-badge ${isLive ? 'ann-live' : 'ann-sched'}`}>{isLive ? 'Live' : 'Scheduled'}</span>
                    </div>
                  );
                })
              )}
            </>
          )}

          {activeNav === 'ownerrez' && (
            <>
              <div className="main-header"><h1>OwnerRez</h1></div>
              <div className="section" style={{ maxWidth: 480 }}>
                <h3>Connection status</h3>
                <div style={{ fontSize: 14, color: '#1a1a18', marginBottom: 12 }}>
                  {profile?.or_connected ? '✓ Connected' : 'Not connected'}
                </div>
                <div style={{ fontSize: 13, color: '#6b6b65' }}>To update your API key, re-run the onboarding flow or contact support.</div>
              </div>
            </>
          )}

          {activeNav === 'branding' && (
            <>
              <div className="main-header"><h1>Branding</h1></div>
              <div className="section" style={{ maxWidth: 480 }}>
                <h3>Your brand</h3>
                <div className="field-grid" style={{ gap: 10 }}>
                  <div className="field full"><label>Brand name</label><input type="text" placeholder="e.g. Vacations at Destin" defaultValue={profile?.brand_name || ''} /></div>
                  <div className="field full"><label>Logo URL</label><input type="text" placeholder="https://... (replaces Destiny Blue on TV)" defaultValue={profile?.logo_url || ''} /></div>
                  <div className="field full"><label>Tagline</label><input type="text" placeholder="e.g. Your Gulf Coast home away from home" defaultValue={profile?.tagline || ''} /></div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 12 }}>Save branding</button>
              </div>
            </>
          )}

          {activeNav === 'settings' && (
            <>
              <div className="main-header"><h1>Settings</h1></div>
              <div className="section" style={{ maxWidth: 480 }}>
                <h3>Account</h3>
                <div style={{ fontSize: 13, color: '#6b6b65', marginBottom: 12 }}>Signed in as <strong>{user?.email}</strong></div>
                <button className="btn btn-ghost" onClick={handleSignOut}>Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && selectedUnit && (() => {
        const ms = modalStatus();
        return (
          <div className="modal-bg open" onClick={e => { if (e.target.classList.contains('modal-bg')) setModalOpen(false); }}>
            <div className="modal">
              <div className="modal-header">
                <div>
                  <div className="modal-title">{selectedUnit.unit_name} — {selectedUnit.building}</div>
                  <div className="modal-sub">{selectedUnit.tv_url || 'URL pending publish'}</div>
                </div>
                <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
              </div>

              <div className="modal-body">
                <div className="col">
                  <div className="section">
                    <h3>Unit details</h3>
                    <div className="field-grid">
                      <div className="field"><label>Unit #</label><input type="text" value={form.unit_number} onChange={e => updateForm('unit_number', e.target.value)} /></div>
                      <div className="field"><label>TV brand</label><input type="text" value={form.tv_brand} onChange={e => updateForm('tv_brand', e.target.value)} /></div>
                      <div className="field"><label>Check-in</label><input type="text" value={form.checkin_time} onChange={e => updateForm('checkin_time', e.target.value)} /></div>
                      <div className="field"><label>Check-out</label><input type="text" value={form.checkout_time} onChange={e => updateForm('checkout_time', e.target.value)} /></div>
                      <div className="field"><label>WiFi name</label><input type="text" value={form.wifi_name} onChange={e => updateForm('wifi_name', e.target.value)} /></div>
                      <div className="field"><label>WiFi password</label><input type="text" value={form.wifi_password} onChange={e => updateForm('wifi_password', e.target.value)} /></div>
                      <div className="field full"><label>TV headline</label><input type="text" value={form.headline} onChange={e => updateForm('headline', e.target.value)} /></div>
                    </div>
                  </div>
                  <div className="section">
                    <h3>Accent color</h3>
                    <div className="field full">
                      <label>Pick your color</label>
                      <input type="color" value={form.accent_color} onChange={e => updateForm('accent_color', e.target.value)} />
                      <div className="color-preview">
                        <div className="color-dot" style={{ background: form.accent_color }} />
                        <span>{form.accent_color === '#48cae4' ? 'Default teal' : `Custom: ${form.accent_color}`}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col">
                  <div className="section">
                    <h3>Host info</h3>
                    <div className="field-grid">
                      <div className="field"><label>Name</label><input type="text" value={form.host_name} onChange={e => updateForm('host_name', e.target.value)} /></div>
                      <div className="field"><label>Phone</label><input type="text" value={form.host_phone} onChange={e => updateForm('host_phone', e.target.value)} /></div>
                      <div className="field"><label>Email</label><input type="text" value={form.host_email} onChange={e => updateForm('host_email', e.target.value)} /></div>
                      <div className="field"><label>Website</label><input type="text" value={form.host_website} onChange={e => updateForm('host_website', e.target.value)} /></div>
                      <div className="field full"><label>Affiliate link</label><input type="text" value={form.affiliate_url} onChange={e => updateForm('affiliate_url', e.target.value)} /></div>
                    </div>
                  </div>
                  <div className="section">
                    <h3>Building announcements</h3>
                    {unitAnnouncements.length === 0 && <div style={{ fontSize: 12, color: '#9b9b94', marginBottom: 8 }}>No announcements for this building.</div>}
                    {unitAnnouncements.map((a, i) => {
                      const now = new Date();
                      const isLive = now >= new Date(a.starts_at) && now <= new Date(a.expires_at);
                      return (
                        <div key={i} className="announce-row">
                          <div>
                            <div className="announce-msg">{a.message}</div>
                            <div className="announce-meta">{new Date(a.starts_at).toLocaleDateString()} – {new Date(a.expires_at).toLocaleDateString()}</div>
                          </div>
                          <span className={`ann-badge ${isLive ? 'ann-live' : 'ann-sched'}`}>{isLive ? 'Live' : 'Scheduled'}</span>
                        </div>
                      );
                    })}
                    <button className="add-btn" onClick={() => setShowAddAnnounce(v => !v)}>+ Add announcement</button>
                    {showAddAnnounce && (
                      <div className="add-form">
                        <select value={announceForm.type} onChange={e => setAnnounceForm(p => ({ ...p, type: e.target.value }))}>
                          <option value="">Select type...</option>
                          {ANNOUNCEMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <div className="date-row">
                          <input type="date" value={announceForm.start} onChange={e => setAnnounceForm(p => ({ ...p, start: e.target.value }))} />
                          <input type="date" value={announceForm.end} onChange={e => setAnnounceForm(p => ({ ...p, end: e.target.value }))} />
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveAnnouncement}>Save announcement</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <div className="footer-status">
                  <div className={`status-dot ${ms.dot}`} />
                  <div className="status-text">
                    <strong>{ms.title}</strong>
                    <span>{ms.sub}</span>
                  </div>
                </div>
                <div className="footer-btns">
                  <button className="btn btn-save" onClick={handleSave} disabled={saving || !hasUnsaved}>{saving ? 'Saving...' : 'Save draft'}</button>
                  <button className="btn btn-ghost" onClick={handlePreview}>Preview TV</button>
                  <button className="btn btn-primary" onClick={handlePublish} disabled={publishing}>{publishing ? 'Publishing...' : 'Publish live'}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="toast-wrap">
        <div className="toast">{toast}</div>
      </div>
    </>
  );
}
