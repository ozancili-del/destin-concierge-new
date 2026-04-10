import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { user_id, brand_name, logo_url, tagline } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  try {
    const { error } = await supabase
      .from('guestview_users')
      .update({ brand_name, logo_url, tagline })
      .eq('id', user_id);

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('save-branding error:', err);
    return res.status(500).json({ error: 'Failed to save branding' });
  }
}
