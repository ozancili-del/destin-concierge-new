// pages/api/deals-subscribe.js
// Adds email to Brevo list 5 (existing) with deals-alert tag
import { allowSameOriginRequest, enforceJsonSize, enforceRateLimit, isBotTrapFilled, validEmail } from '../../lib/public-api-security.js';

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ['POST'] })) return;
  if (!enforceJsonSize(req, res, 4096)) return;
  if (!enforceRateLimit(req, res, { scope: 'deals-subscribe', limit: 6, windowMs: 3600000 })) return;
  if (isBotTrapFilled(req.body)) return res.status(400).json({ error: 'Invalid submission' });

  const email = validEmail(req.body?.email);
  if (!email) {
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

    console.warn('[DEALS-SUBSCRIBE] provider status', response.status);
    return res.status(500).json({ error: 'Failed to subscribe' });

  } catch (err) {
    console.error('[DEALS-SUBSCRIBE]', err?.name || 'Error');
    return res.status(500).json({ error: 'Unable to subscribe right now' });
  }
}
