// pages/api/rate-inquiry.js
// Receives inquiry from rate-finder.html and sends email to Ozan via Brevo
import { allowSameOriginRequest, cleanText, enforceJsonSize, enforceRateLimit, escapeHtml, isBotTrapFilled, validEmail } from '../../lib/public-api-security.js';

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ['POST'] })) return;
  if (!enforceJsonSize(req, res, 10000)) return;
  if (!enforceRateLimit(req, res, { scope: 'rate-inquiry', limit: 5, windowMs: 3600000 })) return;
  if (isBotTrapFilled(req.body)) return res.status(400).json({ error: 'Invalid submission' });

  const email = validEmail(req.body?.email);
  const name = cleanText(req.body?.name, 100);
  const message = cleanText(req.body?.message, 2000, { multiline: true });
  const context = cleanText(req.body?.context, 500, { multiline: true });
  if (!email) return res.status(400).json({ error: 'Please enter a valid email' });

  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) return res.status(500).json({ error: 'Brevo key not set' });

  try {
    // Send notification email to Ozan
    const toOzan = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Rate Finder', email: 'noreply@destincondogetaways.com' },
        to: [{ email: 'ozan@destincondogetaways.com', name: 'Ozan' }],
        replyTo: { email },
        subject: `Rate inquiry${name ? ' from ' + name : ''} — ${cleanText(context || email, 120)}`,
        htmlContent: `
          <h2>New rate inquiry</h2>
          <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
          <p><strong>Details:</strong> ${escapeHtml(context || 'N/A').replace(/\n/g, '<br>')}</p>
          ${message ? `<p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>` : ''}
          <hr>
          <p style="color:#999;font-size:12px">Sent via destincondogetaways.com rate finder</p>
        `
      })
    });

    if (!toOzan.ok) {
      console.error('Brevo rate-inquiry status:', toOzan.status);
      return res.status(500).json({ error: 'Failed to send' });
    }

    return res.status(200).json({ ok: true });

  } catch (e) {
    console.error('rate-inquiry error:', e?.name || 'Error');
    return res.status(500).json({ error: 'Unable to send the inquiry right now' });
  }
}
