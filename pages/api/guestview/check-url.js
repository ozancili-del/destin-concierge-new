import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

function normalizeUrl(url) {
  return url.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const normalized = normalizeUrl(url);

  const { data, error } = await supabase
    .from('guestview_onboarding')
    .select('user_id')
    .ilike('website_url', `%${normalized}%`)
    .limit(1);

  if (error) return res.status(500).json({ error: 'Check failed' });

  return res.status(200).json({ claimed: data && data.length > 0 });
}
