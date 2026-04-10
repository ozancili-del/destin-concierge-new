import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  try {
    // Delete all user data — cascade handles related tables
    await supabase.from('guestview_mock_bookings').delete().eq('user_id', user_id);
    await supabase.from('guestview_announcements').delete().eq('user_id', user_id);
    await supabase.from('guestview_devices').delete().eq('user_id', user_id);
    await supabase.from('guestview_units').delete().eq('user_id', user_id);
    await supabase.from('guestview_or_connections').delete().eq('user_id', user_id);
    await supabase.from('guestview_onboarding').delete().eq('user_id', user_id);
    await supabase.from('guestview_users').delete().eq('id', user_id);

    // Delete from Supabase auth
    await supabase.auth.admin.deleteUser(user_id);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
}
