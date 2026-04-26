// pages/api/deals-subscribe.js
// Adds email to Brevo list 5 (existing) with deals-alert tag

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Not configured' });

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email,
        attributes: { SOURCE: 'deals-page-alert' },
        listIds: [7],
        updateEnabled: true,
      }),
    });

    if (response.status === 201 || response.status === 204) {
      return res.status(200).json({ success: true });
    }

    const body = await response.text();
    console.warn('[DEALS-SUBSCRIBE]', response.status, body);
    return res.status(500).json({ error: 'Failed to subscribe' });

  } catch (err) {
    console.error('[DEALS-SUBSCRIBE]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
