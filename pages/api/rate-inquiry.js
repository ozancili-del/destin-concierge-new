// pages/api/rate-inquiry.js
// Receives inquiry from rate-finder.html and sends email to Ozan via Brevo

export default async function handler(req, res) {
  // CORS — allow all destincondogetaways.com subdomains
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, message, context } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing email' });

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
        subject: `Rate inquiry${name ? ' from ' + name : ''} — ${context || email}`,
        htmlContent: `
          <h2>New rate inquiry</h2>
          <p><strong>From:</strong> ${name || ''} &lt;${email}&gt;</p>
          <p><strong>Details:</strong> ${context || 'N/A'}</p>
          ${message ? `<p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>` : ''}
          <hr>
          <p style="color:#999;font-size:12px">Sent via destincondogetaways.com rate finder</p>
        `
      })
    });

    // Also add to Brevo contacts
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        listIds: [3],
        updateEnabled: true,
        attributes: { SOURCE: 'rate-finder', INQUIRY: context }
      })
    }).catch(() => {});

    if (!toOzan.ok) {
      const err = await toOzan.text();
      console.error('Brevo error:', err);
      return res.status(500).json({ error: 'Failed to send' });
    }

    return res.status(200).json({ ok: true });

  } catch (e) {
    console.error('rate-inquiry error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
