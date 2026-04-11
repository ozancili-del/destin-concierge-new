import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

function generateTvUrl(userSlug, building, unitName, unitNumber) {
  const b = building.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 10);
  // Use unit number if available, otherwise extract trailing number/word from unit name
  const uRaw = unitNumber || unitName.replace(/^.*?([\w-]+)$/, '$1');
  const u = uRaw.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 10);
  return `guestview.destincondogetaways.com/tv/${userSlug}-${b}-${u}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user_id, user_slug, units, website_url, email } = req.body;
  if (!user_id || !units?.length) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Ensure guestview_users row exists (handles re-onboarding after account deletion)
    await supabase.from('guestview_users').upsert(
      { id: user_id, email: email || '', updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

    await supabase.from('guestview_units').delete().eq('user_id', user_id);

    const rows = units
      .filter(u => u.active !== false)
      .map(u => ({
        user_id,
        building: u.building,
        unit_name: u.name,
        unit_number: u.unit_number || null,
        wifi_name: u.wifi_name || null,
        wifi_password: u.wifi_password || null,
        tv_brand: u.tv_brand || null,
        tv_url: generateTvUrl(user_slug || user_id.substring(0, 8), u.building, u.name, u.unit_number),
        active: true
      }));

    const { error } = await supabase.from('guestview_units').insert(rows);
    if (error) throw error;

    await supabase.from('guestview_onboarding').upsert({
      user_id,
      step: 5,
      website_url,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    const { data: savedUnits } = await supabase
      .from('guestview_units')
      .select('*')
      .eq('user_id', user_id);

    return res.status(200).json({ success: true, units: savedUnits });
  } catch (err) {
    console.error('Save units error:', err);
    return res.status(500).json({ error: 'Failed to save units.' });
  }
}
