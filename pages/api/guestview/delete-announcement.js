import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id, user_id } = req.body;
  if (!id || !user_id) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const { error } = await supabase
      .from('guestview_announcements')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('delete-announcement error:', err);
    return res.status(500).json({ error: 'Failed to delete announcement' });
  }
}
