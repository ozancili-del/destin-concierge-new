import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { unit_id, user_id, unit_number, tv_brand, wifi_name, wifi_password, checkin_time, checkout_time, headline, accent_color, host_name, host_phone, host_email, host_website, affiliate_url, status } = req.body;
  if (!unit_id || !user_id) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const { data, error } = await supabase
      .from('guestview_units')
      .update({ unit_number, tv_brand, wifi_name, wifi_password, checkin_time, checkout_time, headline, accent_color, host_name, host_phone, host_email, host_website, affiliate_url, status: status || 'draft' })
      .eq('id', unit_id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, unit: data });
  } catch (err) {
    console.error('update-unit error:', err);
    return res.status(500).json({ error: 'Failed to update unit' });
  }
}
