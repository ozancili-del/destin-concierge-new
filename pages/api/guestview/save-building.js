import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  // Upsert — ignore if already exists
  const { error } = await supabase
    .from('guestview_buildings')
    .upsert({ name: name.trim() }, { onConflict: 'name', ignoreDuplicates: true });
  if (error) return res.status(500).json({ error: 'Failed to save building' });
  return res.status(200).json({ success: true });
}
