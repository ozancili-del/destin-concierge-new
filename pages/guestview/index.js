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

const TV_BRANDS = ['Samsung', 'LG', 'Sony', 'Vizio', 'TCL', 'Hisense', 'Toshiba', 'Other'];

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
  const [authed, setAuthed] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddAnnounce, setShowAddAnnounce] = useState(false);
  const [activeNav, setActiveNav] = useState('units');
  const [form, setForm] = useState({});
  const [announceForm, setAnnounceForm] = useState({ type: '', start: '', end: '' });
  const [toast, setToast] = useState('');
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [showPublishBlocker, setShowPublishBlocker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [brandingForm, setBrandingForm] = useState({ brand_name: '', logo_url: '', tagline: '' });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeletedConfirm, setShowDeletedConfirm] = useState(false);
  const [goLiveEmail, setGoLiveEmail] = useState('');
  const [goLiveKey, setGoLiveKey] = useState('');
  const [goLiveError, setGoLiveError] = useState('');
  const [goLiveLoading, setGoLiveLoading] = useState(false);
  const [showGoLiveConsent, setShowGoLiveConsent] = useState(false);

  // Basket: set of unit IDs
  const [basket, setBasket] = useState(new Set());

  // Collapsible sections: default all collapsed
  const [openSections, setOpenSections] = useState({ selected: false, notSelected: false, published: false });

  // Basket view
  const [showBasket, setShowBasket] = useState(false);
  const [showPreviewConfirm, setShowPreviewConfirm] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push('/guestview/onboard'); return; }
      setUser(session.user);
      await loadData(session.user.id);
      setLoading(false);
      setAuthed(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { router.push('/guestview/onboard'); return; }
      if (session?.user) setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadData(userId) {
    try {
      const res = await fetch(`/api/guestview/get-units?user_id=${userId}`);
      const data = await res.json();
      setUnits(data.units || []);
      setProfile(data.profile || null);
      if (data.profile) setBrandingForm({ brand_name: data.profile.brand_name || '', logo_url: data.profile.logo_url || '', tagline: data.profile.tagline || '' });
      setAnnouncements(data.announcements || []);
    } catch (e) {
      console.error('Load error:', e);
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

  async function handlePushUpdate() {
    if (hasUnsaved) await handleSave();
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
      showToast('Update pushed to TV.');
    } catch (e) {
      showToast('Push failed. Try again.');
    }
  }

  function handleAddToBasket() {
    if (!selectedUnit.wifi_name || !selectedUnit.wifi_password || !selectedUnit.tv_brand) {
      // soft warning — ask if they previewed
      setShowPreviewConfirm(true);
      return;
    }
    doAddToBasket();
  }

  function doAddToBasket() {
    setBasket(prev => new Set([...prev, selectedUnit.id]));
    setModalOpen(false);
    showToast('Added to basket.');
  }

  function removeFromBasket(unitId) {
    setBasket(prev => { const n = new Set(prev); n.delete(unitId); return n; });
  }

  function handlePreview() {
    const slug = selectedUnit.tv_url?.split('/tv/')?.[1] || selectedUnit.id;
    window.open(`/tv/preview/${slug}`, '_blank');
  }

  async function handleSaveAnnouncement() {
    const baseType = announceForm.type === 'Custom message' ? '' : announceForm.type;
    const details = announceForm.customText?.trim() || '';
    const message = baseType && details ? `${baseType} — ${details}` : baseType || details;
    if (!message || !announceForm.start || !announceForm.end) return;
    const buildings = announceForm.allBuildings
      ? [...new Set(units.map(u => u.building))]
      : [selectedUnit.building];
    try {
      const saved = [];
      for (const building of buildings) {
        const res = await fetch('/api/guestview/save-announcement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, building, message, starts_at: announceForm.start, expires_at: announceForm.end })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        saved.push(data.announcement);
      }
      setAnnouncements(prev => [...prev, ...saved]);
      setAnnounceForm({ type: '', start: '', end: '', allBuildings: false });
      setShowAddAnnounce(false);
      showToast(buildings.length > 1 ? `Saved for all ${buildings.length} buildings.` : 'Announcement saved.');
    } catch (e) {
      showToast('Failed to save announcement.');
    }
  }

  async function handleGoLive() {
    setGoLiveLoading(true);
    setGoLiveError('');
    try {
      const res = await fetch('/api/guestview/go-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ or_email: goLiveEmail, or_key: goLiveKey, user_id: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(prev => ({ ...prev, mock_mode: false }));
      setShowGoLiveConsent(false);
      setShowGoLiveModal(false);
      setGoLiveEmail('');
      setGoLiveKey('');
      showToast('You are now live! Real guest data will appear on your TV dashboards.');
    } catch (e) {
      setGoLiveError(e.message);
      setShowGoLiveConsent(false);
    } finally {
      setGoLiveLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return;
    try {
      await fetch('/api/guestview/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      await getSupabase().auth.signOut();
      setShowDeleteModal(false);
      setShowDeletedConfirm(true);
    } catch (e) {
      showToast('Failed to delete account. Contact support.');
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

  function toggleSection(key) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // Categorise units
  const publishedUnits = units.filter(u => u.status === 'live');
  const selectedUnits = units.filter(u => u.active && u.status !== 'live');
  const notSelectedUnits = units.filter(u => !u.active && u.status !== 'live');

  const basketUnits = units.filter(u => basket.has(u.id));
  const basketTotal = (basketUnits.length * 4.99).toFixed(2);

  const unitAnnouncements = selectedUnit
    ? announcements.filter(a => a.building === selectedUnit.building)
    : [];

  const modalStatus = () => {
    if (hasUnsaved) return { dot: 'dot-red', title: selectedUnit?.status === 'live' ? 'Live — unsaved changes' : 'Unsaved changes', sub: 'Save your changes first' };
    if (selectedUnit?.status === 'live') return { dot: 'dot-green', title: `Live — published ${selectedUnit.published_at ? new Date(selectedUnit.published_at).toLocaleDateString() : ''}`, sub: 'Up to date' };
    if (selectedUnit?.status === 'draft') return { dot: 'dot-amber', title: 'Draft saved — not yet in basket', sub: 'Preview, then add to basket' };
    return { dot: 'dot-amber', title: 'Not configured yet', sub: 'Save draft or add to basket when ready' };
  };

  if (!authed) return null;

  const SectionHeader = ({ sectionKey, label, count, dotClass }) => (
    <div className="sec-header" onClick={() => toggleSection(sectionKey)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`sec-dot ${dotClass}`} />
        <span className="sec-label">{label}</span>
        <span className="sec-count">{count} unit{count !== 1 ? 's' : ''}</span>
      </div>
      <span className="sec-chevron">{openSections[sectionKey] ? '▲' : '▼'}</span>
    </div>
  );

  const UnitCard = ({ unit, section }) => {
    const inBasket = basket.has(unit.id);
    return (
      <div className="unit-card" style={{ maxWidth: 680, background: section === 'notSelected' ? '#fafaf8' : '#fff' }}>
        <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => openUnit(unit)}>
          <div className="unit-name" style={{ color: section === 'notSelected' ? '#6b6b65' : '#1a1a18' }}>{unit.unit_name}</div>
          <div className="unit-sub">
            Unit {unit.unit_number || '—'}
            {section === 'notSelected' && ' · Not configured'}
            {section === 'selected' && unit.status === 'draft' && ' · Draft saved'}
            {section === 'selected' && unit.status !== 'draft' && ' · Not configured'}
            {section === 'published' && unit.published_at && ` · Published ${new Date(unit.published_at).toLocaleDateString()}`}
          </div>
        </div>
        <div className="unit-right">
          {section === 'published' && (
            <span className="pill pill-live"><span className="pill-dot" />Live</span>
          )}
          {section === 'selected' && inBasket && (
            <span className="pill pill-draft"><span className="pill-dot" />In basket</span>
          )}
          {section === 'notSelected' && (
            <button className="btn-inline btn-select" onClick={async (e) => {
              e.stopPropagation();
              const res = await fetch('/api/guestview/update-unit', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unit_id: unit.id, user_id: user.id, active: true, status: 'draft' })
              });
              if (res.ok) { setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, active: true, status: 'draft' } : u)); showToast('Unit selected.'); }
            }}>Select →</button>
          )}
          <span className="arrow" style={{ cursor: 'pointer' }} onClick={() => openUnit(unit)}>›</span>
        </div>
      </div>
    );
  };

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
        /* Basket chip */
        .basket-chip { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e8e6e0; border-radius: 20px; padding: 6px 14px; font-size: 13px; color: #1a1a18; cursor: pointer; transition: border-color 0.15s; }
        .basket-chip:hover { border-color: #1D9E75; }
        .basket-badge { background: #1D9E75; color: #fff; border-radius: 99px; font-size: 11px; font-weight: 600; padding: 1px 7px; }
        .basket-price { font-size: 12px; color: #6b6b65; }
        /* Collapsible sections */
        .sec-wrap { border: 1px solid #e8e6e0; border-radius: 12px; margin-bottom: 10px; overflow: hidden; max-width: 680px; }
        .sec-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; cursor: pointer; user-select: none; }
        .sec-header:hover { background: #fafaf8; }
        .sec-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .sec-dot-selected { background: #378ADD; }
        .sec-dot-notSelected { background: #c8c6c0; }
        .sec-dot-published { background: #1D9E75; }
        .sec-label { font-size: 14px; font-weight: 500; color: #1a1a18; }
        .sec-count { font-size: 12px; color: #9b9b94; background: #f7f6f3; border-radius: 99px; padding: 1px 8px; }
        .sec-chevron { font-size: 10px; color: #9b9b94; }
        .sec-body { border-top: 1px solid #e8e6e0; }
        /* Unit cards */
        .unit-card { background: #fff; border-bottom: 1px solid #f0ede8; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; transition: background 0.1s; }
        .unit-card:last-child { border-bottom: none; }
        .unit-card:hover { background: #fafaf8; }
        .unit-name { font-size: 14px; font-weight: 500; color: #1a1a18; }
        .unit-sub { font-size: 12px; color: #9b9b94; margin-top: 2px; }
        .unit-right { display: flex; align-items: center; gap: 10px; }
        .pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px; }
        .pill-live { background: #E1F5EE; color: #0F6E56; }
        .pill-draft { background: #FAEEDA; color: #633806; }
        .pill-empty { background: #f7f6f3; color: #9b9b94; border: 1px solid #e8e6e0; }
        .pill-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .arrow { font-size: 18px; color: #9b9b94; }
        .btn-inline { font-size: 12px; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 500; border: none; transition: all 0.15s; }
        .btn-select { background: #E6F1FB; color: #185FA5; border: 0.5px solid #B5D4F4; }
        .btn-select:hover { background: #B5D4F4; }
        /* Modal */
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
        /* Basket modal */
        .basket-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 480px; border: 1px solid #e8e6e0; overflow: hidden; }
        .basket-unit-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0ede8; }
        .basket-unit-row:last-child { border-bottom: none; }
        .basket-remove { background: none; border: none; color: #9b9b94; cursor: pointer; font-size: 18px; padding: 0 4px; line-height: 1; }
        .basket-remove:hover { color: #E24B4A; }
        .basket-total { display: flex; justify-content: space-between; align-items: center; padding: 12px 0 0; font-size: 14px; font-weight: 500; color: #1a1a18; border-top: 1px solid #e8e6e0; margin-top: 4px; }
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
          {profile?.mock_mode && (
            <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#633806' }}>You're in demo mode</div>
                <div style={{ fontSize: 12, color: '#854F0B', marginTop: 2 }}>Your TV dashboards are running with sample guest data. Connect your real OwnerRez account to go live.</div>
              </div>
              <button className="btn" style={{ background: '#EF9F27', color: '#fff', border: 'none', whiteSpace: 'nowrap', fontSize: 12 }} onClick={() => setShowGoLiveModal(true)}>Go live →</button>
            </div>
          )}

          {activeNav === 'units' && (
            <>
              <div className="main-header">
                <h1>My units</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge-trial">$4.99/TV/mo</span>
                  {basket.size > 0 && (
                    <div className="basket-chip" onClick={() => setShowBasket(true)}>
                      <span>Basket</span>
                      <span className="basket-badge">{basket.size}</span>
                      <span className="basket-price">${basketTotal}/mo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected */}
              <div className="sec-wrap">
                <SectionHeader sectionKey="selected" label="Selected" count={selectedUnits.length} dotClass="sec-dot-selected" />
                {openSections.selected && (
                  <div className="sec-body">
                    {selectedUnits.length === 0
                      ? <div style={{ padding: '12px 16px', fontSize: 13, color: '#9b9b94' }}>No selected units yet.</div>
                      : selectedUnits.map(unit => <UnitCard key={unit.id} unit={unit} section="selected" />)
                    }
                  </div>
                )}
              </div>

              {/* Not selected */}
              <div className="sec-wrap">
                <SectionHeader sectionKey="notSelected" label="Not selected" count={notSelectedUnits.length} dotClass="sec-dot-notSelected" />
                {openSections.notSelected && (
                  <div className="sec-body">
                    {notSelectedUnits.length === 0
                      ? <div style={{ padding: '12px 16px', fontSize: 13, color: '#9b9b94' }}>All units are selected.</div>
                      : notSelectedUnits.map(unit => <UnitCard key={unit.id} unit={unit} section="notSelected" />)
                    }
                  </div>
                )}
              </div>

              {/* Published */}
              <div className="sec-wrap">
                <SectionHeader sectionKey="published" label="Published" count={publishedUnits.length} dotClass="sec-dot-published" />
                {openSections.published && (
                  <div className="sec-body">
                    {publishedUnits.length === 0
                      ? <div style={{ padding: '12px 16px', fontSize: 13, color: '#9b9b94' }}>No published units yet.</div>
                      : publishedUnits.map(unit => <UnitCard key={unit.id} unit={unit} section="published" />)
                    }
                  </div>
                )}
              </div>

              {units.length === 0 && <div className="empty-state">No units found. Something went wrong — contact support.</div>}
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
                  const isExpired = now > end;
                  const isLive = now >= start && now <= end;
                  const fmt = d => { const s = typeof d === 'string' ? d.replace('T',' ').replace('+00:00','').replace('.000Z','') : ''; const dt = new Date(s); return dt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); };
                  if (isExpired) return null;
                  return (
                    <div key={i} className="announce-row" style={{ maxWidth: 680, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div className="announce-msg">{a.message}</div>
                        <div className="announce-meta">{fmt(a.starts_at)} – {fmt(a.expires_at)} · {a.building}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span className={`ann-badge ${isLive ? 'ann-live' : 'ann-sched'}`}>{isLive ? 'Live' : 'Scheduled'}</span>
                        <button onClick={async () => {
                          await fetch('/api/guestview/delete-announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, user_id: user.id }) });
                          setAnnouncements(prev => prev.filter((_, idx) => idx !== i));
                          showToast('Announcement deleted.');
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9b9b94', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
                      </div>
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
                <div className="field-grid">
                  <div className="field full"><label>Brand name</label><input type="text" value={brandingForm.brand_name} onChange={e => setBrandingForm(p => ({ ...p, brand_name: e.target.value }))} /></div>
                  <div className="field full"><label>Logo URL</label><input type="text" value={brandingForm.logo_url} onChange={e => setBrandingForm(p => ({ ...p, logo_url: e.target.value }))} /></div>
                  <div className="field full"><label>Tagline</label><input type="text" value={brandingForm.tagline} onChange={e => setBrandingForm(p => ({ ...p, tagline: e.target.value }))} /></div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={async () => {
                  const res = await fetch('/api/guestview/save-branding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, ...brandingForm }) });
                  if (res.ok) showToast('Branding saved.'); else showToast('Save failed.');
                }}>Save branding</button>
              </div>
            </>
          )}

          {activeNav === 'settings' && (
            <>
              <div className="main-header"><h1>Settings</h1></div>
              <div className="section" style={{ maxWidth: 480 }}>
                <h3>Danger zone</h3>
                <div style={{ fontSize: 13, color: '#6b6b65', marginBottom: 12 }}>Permanently delete your account and all associated data.</div>
                <button className="btn" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={() => setShowDeleteModal(true)}>Delete account</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unit configure modal */}
      {modalOpen && selectedUnit && (() => {
        const ms = modalStatus();
        const isPublished = selectedUnit.status === 'live';
        const inBasket = basket.has(selectedUnit.id);
        const unitAnnouncements = announcements.filter(a => a.building === selectedUnit.building);
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
                      <div className="field"><label>TV brand</label><select value={form.tv_brand} onChange={e => updateForm('tv_brand', e.target.value)} style={{ height: 34, border: '1px solid #e8e6e0', borderRadius: 8, padding: '0 10px', fontSize: 13, background: '#fff', color: form.tv_brand ? '#1a1a18' : '#9b9b94', outline: 'none', fontFamily: 'DM Sans, sans-serif', width: '100%' }}><option value="">Select brand...</option>{TV_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
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
                      const end = new Date(a.expires_at);
                      const start = new Date(a.starts_at);
                      const isExpired = now > end;
                      const isLive = now >= start && now <= end;
                      if (isExpired) return null;
                      return (
                        <div key={i} className="announce-row">
                          <div style={{ flex: 1 }}>
                            <div className="announce-msg">{a.message}</div>
                            <div className="announce-meta">{new Date(a.starts_at.replace('+00:00','').replace('Z','')).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })} – {new Date(a.expires_at.replace('+00:00','').replace('Z','')).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span className={`ann-badge ${isLive ? 'ann-live' : 'ann-sched'}`}>{isLive ? 'Live' : 'Scheduled'}</span>
                            <button onClick={async () => {
                              await fetch('/api/guestview/delete-announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, user_id: user.id }) });
                              setAnnouncements(prev => prev.filter((_, idx) => idx !== i));
                              showToast('Announcement deleted.');
                            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9b9b94', fontSize: 16, padding: '0 4px' }}>×</button>
                          </div>
                        </div>
                      );
                    })}
                    <button className="add-btn" onClick={() => setShowAddAnnounce(v => !v)}>+ Add announcement</button>
                    {showAddAnnounce && (
                      <div className="add-form">
                        <select value={announceForm.type} onChange={e => setAnnounceForm(p => ({ ...p, type: e.target.value, customText: '' }))}>
                          <option value="">Select type...</option>
                          {ANNOUNCEMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        {announceForm.type && (
                          <input type="text" placeholder={announceForm.type === 'Custom message' ? 'Type your announcement...' : 'Add details (optional)...'} value={announceForm.customText || ''} onChange={e => setAnnounceForm(p => ({ ...p, customText: e.target.value }))} style={{ marginBottom: 6, width: '100%', height: 32, border: '1px solid #e8e6e0', borderRadius: 8, padding: '0 8px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
                        )}
                        <div className="date-row">
                          <input type="datetime-local" value={announceForm.start} onChange={e => setAnnounceForm(p => ({ ...p, start: e.target.value }))} />
                          <input type="datetime-local" value={announceForm.end} onChange={e => setAnnounceForm(p => ({ ...p, end: e.target.value }))} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b6b65', marginBottom: 8, cursor: 'pointer' }}>
                          <input type="checkbox" checked={announceForm.allBuildings || false} onChange={e => setAnnounceForm(p => ({ ...p, allBuildings: e.target.checked }))} />
                          Apply to all units in this building
                        </label>
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
                  {isPublished
                    ? <button className="btn btn-primary" onClick={handlePushUpdate}>Push update</button>
                    : inBasket
                      ? <button className="btn btn-ghost" onClick={() => { removeFromBasket(selectedUnit.id); showToast('Removed from basket.'); setModalOpen(false); }}>Remove from basket</button>
                      : <button className="btn btn-primary" onClick={handleAddToBasket}>Add to basket</button>
                  }
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Preview confirm (soft gate before Add to basket) */}
      {showPreviewConfirm && (
        <div className="modal-bg open" onClick={e => { if (e.target.classList.contains('modal-bg')) setShowPreviewConfirm(false); }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Have you previewed this unit?</div>
              <button className="modal-close" onClick={() => setShowPreviewConfirm(false)}>×</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: 14, color: '#6b6b65', lineHeight: 1.7, marginBottom: 16 }}>Some fields look incomplete. We recommend previewing the TV before adding to basket — but you can skip if you're sure.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowPreviewConfirm(false); handlePreview(); }}>Preview first</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setShowPreviewConfirm(false); doAddToBasket(); }}>Add anyway</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basket modal */}
      {showBasket && (
        <div className="modal-bg open" onClick={e => { if (e.target.classList.contains('modal-bg')) setShowBasket(false); }}>
          <div className="basket-modal">
            <div className="modal-header">
              <div className="modal-title">Basket</div>
              <button className="modal-close" onClick={() => setShowBasket(false)}>×</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              {basketUnits.length === 0
                ? <div style={{ fontSize: 13, color: '#9b9b94', textAlign: 'center', padding: '1rem 0' }}>Your basket is empty.</div>
                : <>
                    {basketUnits.map(unit => (
                      <div key={unit.id} className="basket-unit-row">
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a18' }}>{unit.unit_name}</div>
                          <div style={{ fontSize: 12, color: '#9b9b94' }}>Unit {unit.unit_number || '—'} · $4.99/mo</div>
                        </div>
                        <button className="basket-remove" onClick={() => removeFromBasket(unit.id)}>×</button>
                      </div>
                    ))}
                    <div className="basket-total">
                      <span>{basketUnits.length} unit{basketUnits.length !== 1 ? 's' : ''}</span>
                      <span>${basketTotal}/mo</span>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowBasket(false)}>Keep configuring</button>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { showToast('Stripe coming soon.'); }}>Publish & pay →</button>
                    </div>
                  </>
              }
            </div>
          </div>
        </div>
      )}

      {/* Go live modal */}
      {showGoLiveModal && (
        <div className="modal-bg open" onClick={e => { if (e.target.classList.contains('modal-bg')) { setShowGoLiveModal(false); setShowGoLiveConsent(false); }}}>
          <div className="modal" style={{ maxWidth: 480 }}>
            {!showGoLiveConsent ? (
              <>
                <div className="modal-header">
                  <div className="modal-title">Connect your real OwnerRez account</div>
                  <button className="modal-close" onClick={() => setShowGoLiveModal(false)}>×</button>
                </div>
                <div style={{ padding: '1.25rem 1.5rem' }}>
                  {goLiveError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{goLiveError}</div>}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: '#6b6b65', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>OwnerRez account email</label>
                    <input type="text" placeholder="you@example.com" value={goLiveEmail} onChange={e => setGoLiveEmail(e.target.value)} style={{ width: '100%', height: 38, border: '1px solid #e8e6e0', borderRadius: 8, padding: '0 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', background: '#fafaf8' }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: '#6b6b65', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>OwnerRez API key</label>
                    <input type="text" placeholder="Paste your real API key" value={goLiveKey} onChange={e => setGoLiveKey(e.target.value)} style={{ width: '100%', height: 38, border: '1px solid #e8e6e0', borderRadius: 8, padding: '0 12px', fontSize: 13, fontFamily: 'DM Mono, monospace', outline: 'none', background: '#fafaf8' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowGoLiveModal(false)}>Cancel</button>
                    <button className="btn btn-primary" style={{ flex: 1, background: '#EF9F27' }} disabled={!goLiveEmail || !goLiveKey} onClick={() => setShowGoLiveConsent(true)}>Connect →</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="modal-header">
                  <div className="modal-title">Data access authorization</div>
                  <button className="modal-close" onClick={() => setShowGoLiveConsent(false)}>×</button>
                </div>
                <div style={{ padding: '1.25rem 1.5rem' }}>
                  <p style={{ fontSize: 14, color: '#6b6b65', lineHeight: 1.7, marginBottom: 12 }}>By connecting OwnerRez, you authorize GuestView to access the following guest data only:</p>
                  <div style={{ background: '#f7f6f3', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: '#1a1a18', padding: '3px 0' }}>✓ Guest first name</div>
                    <div style={{ fontSize: 13, color: '#1a1a18', padding: '3px 0' }}>✓ Check-in date</div>
                    <div style={{ fontSize: 13, color: '#1a1a18', padding: '3px 0' }}>✓ Check-out date</div>
                  </div>
                  <p style={{ fontSize: 12, color: '#9b9b94', marginBottom: 16, lineHeight: 1.6 }}>We access nothing else. No payment info, no contact details, no personal data beyond what's listed above.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowGoLiveConsent(false)}>Back</button>
                    <button className="btn btn-primary" style={{ flex: 1, background: '#EF9F27' }} disabled={goLiveLoading} onClick={handleGoLive}>{goLiveLoading ? 'Connecting...' : 'I agree, go live →'}</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Publish blocker */}
      {showPublishBlocker && (
        <div className="modal-bg open" onClick={e => { if (e.target.classList.contains('modal-bg')) setShowPublishBlocker(false); }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title">You're in demo mode</div>
              <button className="modal-close" onClick={() => setShowPublishBlocker(false)}>×</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: 14, color: '#6b6b65', lineHeight: 1.7, marginBottom: 16 }}>Your TV dashboard is not yet live on a device. To publish to TV you need to:</p>
              <div style={{ background: '#f7f6f3', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#1a1a18', padding: '4px 0' }}>1. Connect your real OwnerRez account</div>
                <div style={{ fontSize: 13, color: '#1a1a18', padding: '4px 0' }}>2. Enable the GuestView service for this unit</div>
                <div style={{ fontSize: 13, color: '#1a1a18', padding: '4px 0' }}>3. Set up your Amazon Signage Stick</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowPublishBlocker(false)}>Close</button>
                <button className="btn btn-primary" style={{ flex: 1, background: '#EF9F27' }} onClick={() => { setShowPublishBlocker(false); setShowGoLiveModal(true); }}>Go live →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="modal-bg open" onClick={e => { if (e.target.classList.contains('modal-bg')) setShowDeleteModal(false); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: '#dc2626' }}>Delete account</div>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: 14, color: '#6b6b65', lineHeight: 1.7, marginBottom: 16 }}>This will permanently delete all your units, announcements, and data. This cannot be undone.</p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#6b6b65', display: 'block', marginBottom: 6 }}>Type <strong>DELETE</strong> to confirm</label>
                <input type="text" placeholder="DELETE" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} style={{ width: '100%', height: 38, border: '1px solid #fecaca', borderRadius: 8, padding: '0 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}>Cancel</button>
                <button className="btn" style={{ flex: 1, background: deleteConfirm === 'DELETE' ? '#dc2626' : '#f0ede8', color: deleteConfirm === 'DELETE' ? '#fff' : '#9b9b94', border: 'none' }} disabled={deleteConfirm !== 'DELETE'} onClick={handleDeleteAccount}>Delete everything</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeletedConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '90%' }}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>👋</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a18', marginBottom: 12, textAlign: 'center' }}>Sorry to see you go</h2>
            <p style={{ fontSize: 14, color: '#6b6b65', lineHeight: 1.7, marginBottom: 16 }}>We confirm that all your data has been permanently deleted from our systems, including:</p>
            <div style={{ background: '#f7f6f3', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#1a1a18', lineHeight: 2 }}>
              <div>✓ All unit and property information</div>
              <div>✓ Your OwnerRez API connection</div>
              <div>✓ All building announcements</div>
              <div>✓ Your account profile and branding</div>
              <div>✓ Your GuestView account</div>
            </div>
            <p style={{ fontSize: 12, color: '#9b9b94', marginBottom: 20, lineHeight: 1.6 }}>This deletion is permanent and cannot be undone. If you ever want to return, you are welcome to create a new account at any time.</p>
            <button style={{ width: '100%', height: 44, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              onClick={() => { setShowDeletedConfirm(false); router.push('/guestview/onboard'); }}>
              I acknowledge — goodbye
            </button>
          </div>
        </div>
      )}

      <div className="toast-wrap">
        <div className="toast">{toast}</div>
      </div>
    </>
  );
}
