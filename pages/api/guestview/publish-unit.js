import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { unit_id, user_id } = req.body;
  if (!unit_id || !user_id) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const { data, error } = await supabase
      .from('guestview_units')
      .update({ status: 'live', published_at: new Date().toISOString() })
      .eq('id', unit_id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, unit: data });
  } catch (err) {
    console.error('publish-unit error:', err);
    return res.status(500).json({ error: 'Failed to publish unit' });
  }
}
