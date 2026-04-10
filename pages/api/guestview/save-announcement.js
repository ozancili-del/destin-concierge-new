import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { user_id, building, message, starts_at, expires_at } = req.body;
  if (!user_id || !building || !message || !starts_at || !expires_at) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('guestview_announcements')
      .insert({ user_id, building, message, starts_at, expires_at })
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, announcement: data });
  } catch (err) {
    console.error('save-announcement error:', err);
    return res.status(500).json({ error: 'Failed to save announcement' });
  }
}
