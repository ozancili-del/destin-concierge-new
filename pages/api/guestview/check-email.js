import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const { data } = await supabase
    .from('guestview_users')
    .select('id')
    .ilike('email', email.trim())
    .maybeSingle();
  return res.status(200).json({ exists: !!data });
}
