import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { user_id, email, name, phone, website, affiliate_url } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  try {
    const { error } = await supabase
      .from('guestview_users')
      .upsert({ id: user_id, email: email || '', name, phone, website, affiliate_url }, { onConflict: 'id' });

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('save-profile error:', err);
    return res.status(500).json({ error: 'Failed to save profile' });
  }
}
