import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

export async function getServerSideProps({ params }) {
  const { slug } = params;

  try {
    // Find unit by tv_url slug
    const { data: unit } = await supabase
      .from('guestview_units')
      .select('*')
      .ilike('tv_url', `%${slug}`)
      .single();

    if (!unit) return { notFound: true };

    // Get user to check mock_mode
    const { data: user } = await supabase
      .from('guestview_users')
      .select('mock_mode')
      .eq('id', unit.user_id)
      .single();

    let booking = null;

    if (user?.mock_mode) {
      // Get mock booking for this unit
      const { data: mock } = await supabase
        .from('guestview_mock_bookings')
        .select('*')
        .eq('unit_id', unit.id)
        .single();
      if (mock) booking = { guest_first_name: mock.guest_first_name, arrival: mock.arrival, departure: mock.departure };
    }

    return { props: { unit, booking, isMock: user?.mock_mode || false } };
  } catch (err) {
    return { notFound: true };
  }
}

export default function TVPreview({ unit, booking, isMock }) {
  const guestName = booking?.guest_first_name || 'Guest';
  const arrival = booking?.arrival ? new Date(booking.arrival).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '—';
  const departure = booking?.departure ? new Date(booking.departure).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '—';
  const accentColor = unit.accent_color || '#48cae4';
  const headline = unit.headline || `${unit.building} · Unit ${unit.unit_number} · Destin, Florida`;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --teal: ${accentColor}; --gold: #f6c453; --soft: rgba(255,255,255,0.6); --faint: rgba(255,255,255,0.3); --line: rgba(255,255,255,0.08); }
        html, body { background: #0a1628; color: #fff; font-family: 'Inter', sans-serif; min-height: 100vh; overflow-x: hidden; }
        .preview-banner { background: rgba(246,196,83,0.15); border-bottom: 1px solid rgba(246,196,83,0.3); padding: 8px 24px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: rgba(246,196,83,0.9); }
        .preview-banner span { font-weight: 500; }
        .tv-wrap { padding: 32px; }
        .eyebrow { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 12px; }
        h1 { font-size: 52px; font-weight: 300; color: #fff; margin-bottom: 8px; }
        h1 span { color: var(--teal); }
        .welcome-msg { font-size: 16px; font-style: italic; color: var(--soft); margin-bottom: 32px; }
        .grid { display: grid; grid-template-columns: 320px 1fr 280px; gap: 20px; }
        .card { background: rgba(255,255,255,0.04); border: 1px solid var(--line); border-radius: 16px; padding: 20px; }
        .sec-label { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--faint); margin-bottom: 16px; }
        .essential { background: rgba(255,255,255,0.04); border: 1px solid var(--line); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
        .e-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: var(--faint); margin-bottom: 6px; }
        .e-network { font-size: 16px; color: #fff; margin-bottom: 3px; }
        .e-password { font-size: 13px; color: var(--teal); }
        .e-checkout { font-size: 24px; font-weight: 300; color: #86efac; }
        .e-sub { font-size: 11px; color: var(--faint); margin-top: 4px; }
        .announce-card { background: rgba(246,196,83,0.08); border: 1px solid rgba(246,196,83,0.25); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
        .announce-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(246,196,83,0.6); margin-bottom: 6px; }
        .announce-text { font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.5; }
        .host-row { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
        .host-label { font-size: 10px; color: var(--faint); letter-spacing: 1px; text-transform: uppercase; }
        .host-num { font-size: 13px; color: var(--soft); }
        .mock-note { font-size: 11px; color: rgba(246,196,83,0.7); margin-top: 4px; }
        .checkin-info { background: rgba(255,255,255,0.04); border: 1px solid var(--line); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
      `}</style>

      {isMock && (
        <div className="preview-banner">
          <span>Preview mode — showing sample guest data</span>
          <span>This is how your TV will look for real guests</span>
        </div>
      )}

      <div className="tv-wrap">
        <div className="eyebrow">{headline}</div>
        <h1>Good afternoon, <span>{guestName}</span></h1>
        <p className="welcome-msg">Welcome to {unit.building}. We hope you enjoy your stay.</p>

        <div className="grid">
          <div>
            <div className="card">
              <div className="sec-label">Live Gulf Conditions</div>
              <div style={{ color: 'var(--faint)', fontSize: 13 }}>Weather data loads on live TV</div>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="sec-label">Your Day</div>
              <div style={{ color: 'var(--faint)', fontSize: 13 }}>AI recommendations load on live TV based on time of day</div>
            </div>
          </div>

          <div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="sec-label">Unit Essentials</div>

              <div className="essential">
                <div className="e-label">WiFi</div>
                <div className="e-network">{unit.wifi_name || 'WiFi name'}</div>
                <div className="e-password">{unit.wifi_password || 'Password'}</div>
              </div>

              <div className="essential">
                <div className="e-label">Check-out</div>
                <div className="e-checkout">{departure}</div>
                <div className="e-sub">{unit.checkout_time || '10:00 AM'} · Door locks automatically</div>
              </div>

              <div className="announce-card">
                <div className="announce-label">Building Notice</div>
                <div className="announce-text">There are no building announcements at this time. Enjoy your stay!</div>
              </div>

              <div className="host-row">
                <div>
                  <div className="host-label">Need anything?</div>
                  <div className="host-num">{unit.host_name || 'Your host'} · {unit.host_phone || ''}</div>
                  {isMock && <div className="mock-note">Sample data</div>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--teal)' }}>{unit.host_website || ''}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
