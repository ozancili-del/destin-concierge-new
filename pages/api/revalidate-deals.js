// pages/api/revalidate-deals.js
// Called by chat.js after "lets go MF" snapshot completes
// Forces ISR rebuild of /beach-deals so purchased stamps appear immediately

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = req.headers['x-revalidate-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await res.revalidate('/beach-deals');
    return res.status(200).json({ revalidated: true });
  } catch (err) {
    console.error('[REVALIDATE] Failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
