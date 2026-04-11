import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    const [unitsRes, profileRes, announcementsRes, onboardingRes] = await Promise.all([
      supabase.from('guestview_units').select('*').eq('user_id', user_id).order('building').order('unit_name'),
      supabase.from('guestview_users').select('*').eq('id', user_id).single(),
      supabase.from('guestview_announcements').select('*').eq('user_id', user_id).order('starts_at', { ascending: false }),
      supabase.from('guestview_or_connections').select('validated_at').eq('user_id', user_id).single()
    ]);
    return res.status(200).json({
      units: unitsRes.data || [],
      profile: { ...profileRes.data, or_connected: !!onboardingRes.data?.validated_at },
      announcements: announcementsRes.data || []
    });
  } catch (err) {
    console.error('get-units error:', err);
    return res.status(500).json({ error: 'Failed to load data' });
  }
}
