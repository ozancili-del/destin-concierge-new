export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, itinerary, formSnapshot } = req.body;
  if (!email || !itinerary || !formSnapshot) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'BREVO_API_KEY not set' });
  }

  const snap = formSnapshot;
  const data = itinerary;

  // ── Build itinerary HTML email ──────────────────────────────────────────
  const groupStr = snap.adults + ' Adult' + (snap.adults > 1 ? 's' : '') +
    (snap.kids > 0 ? ' · ' + snap.kids + ' Kid' + (snap.kids > 1 ? 's' : '') : '');

  const daysHTML = data.days.map(day => {
    const weatherBadge = day.weather
      ? `<div style="display:inline-block;background:#e8f4f4;border:1px solid #b0d8d8;border-radius:20px;padding:4px 12px;font-size:12px;color:#0e7c7b;font-weight:500;margin-bottom:10px;">🌤 ${day.weather}</div>`
      : '';

    const blocksHTML = day.blocks.map(b => {
      const dirUrl = `https://www.google.com/maps/dir/Pelican+Beach+Resort,+1002+US-98,+Destin,+FL/${encodeURIComponent(b.place + ', Destin, FL')}`;
      const linkHTML = b.tripshock
        ? `<a href="https://tripshock.com/?aff=destindreamcondo" style="display:inline-block;font-size:11px;color:#0e7c7b;text-decoration:underline;font-weight:600;margin:3px 0;">📌 Book via TripShock</a><br>`
        : b.link_url
          ? `<a href="${b.link_url}" style="display:inline-block;font-size:11px;color:#0e7c7b;text-decoration:underline;font-weight:600;margin:3px 0;">🔗 ${b.link_label || b.link_url}</a><br>`
          : '';

      return `
        <td width="48%" valign="top" style="padding:4px;">
          <div style="background:#f7f3ed;border:1px solid #d8cfc4;border-radius:8px;padding:12px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#e8741a;text-transform:uppercase;margin-bottom:3px;">${b.emoji || ''} ${b.time}</div>
            <div style="font-size:14px;font-weight:700;color:#1a3a5c;margin-bottom:4px;">${b.place}</div>
            <div style="font-size:12px;color:#555;line-height:1.5;margin-bottom:6px;">${b.description}</div>
            ${linkHTML}
            <a href="${dirUrl}" style="display:block;font-size:11px;color:#aaa;text-decoration:underline;margin-bottom:4px;">📍 Directions from Pelican Beach Resort</a>
            ${b.tip ? `<div style="font-size:11px;color:#e8741a;font-style:italic;margin-top:3px;">✦ ${b.tip}</div>` : ''}
            ${b.backup ? `<div style="font-size:11px;color:#aaa;font-style:italic;margin-top:3px;">☂ Rainy day: ${b.backup}</div>` : ''}
          </div>
        </td>`;
    });

    // Pair blocks into rows of 2
    const rows = [];
    for (let i = 0; i < blocksHTML.length; i += 2) {
      rows.push(`
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
          <tr>
            ${blocksHTML[i] || '<td width="48%"></td>'}
            <td width="4%"></td>
            ${blocksHTML[i + 1] || '<td width="48%"></td>'}
          </tr>
        </table>`);
    }

    return `
      <div style="margin-bottom:20px;">
        <div style="background:#1a3a5c;color:white;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px;">
          DAY ${day.day_number} · ${day.title.toUpperCase()}
        </div>
        ${weatherBadge}
        ${rows.join('')}
      </div>`;
  }).join('');

  const emailHTML = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f3ed;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f3ed;padding:24px 0;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a3a5c;padding:20px 28px;">
            <div style="color:white;font-size:20px;font-weight:700;">Destin Condo Getaways</div>
            <div style="color:#8bb4d4;font-size:12px;margin-top:4px;">Your Personal Destin Itinerary · Crafted by Destiny Blue AI Concierge ©2026</div>
          </td>
        </tr>

        <!-- Destiny Blue message -->
        ${data.summary ? `
        <tr>
          <td style="background:#eaf4f4;padding:14px 28px;font-size:13px;color:#1a3a5c;line-height:1.7;font-style:italic;border-bottom:1px solid #d8cfc4;">
            ${data.summary}
          </td>
        </tr>` : ''}

        <!-- Trip summary strip -->
        <tr>
          <td style="background:#f7f3ed;padding:10px 28px;border-bottom:1px solid #d8cfc4;font-size:12px;color:#888;">
            👤 ${groupStr} &nbsp;·&nbsp; 📅 ${snap.arrFmt} – ${snap.depFmt} &nbsp;·&nbsp; 🏖 ${snap.beachPool} &nbsp;·&nbsp; ⚡ ${snap.pace}
            ${snap.cuisine && snap.cuisine.length ? ` &nbsp;·&nbsp; 🍽 ${snap.cuisine.join(', ')}` : ''}
            ${snap.interests && snap.interests.length ? ` &nbsp;·&nbsp; 🎯 ${snap.interests.join(', ')}` : ''}
          </td>
        </tr>

        <!-- Days -->
        <tr>
          <td style="padding:20px 28px;">
            ${daysHTML}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #d8cfc4;text-align:center;">
            <a href="https://www.destincondogetaways.com" style="display:inline-block;background:#e8741a;color:white;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">
              🏖 Book Your Destin Stay
            </a>
            <div style="margin-top:10px;font-size:11px;color:#aaa;">Pelican Beach Resort · Destin, FL · <a href="https://www.destincondogetaways.com" style="color:#0e7c7b;">destincondogetaways.com</a></div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1a3a5c;padding:14px 28px;">
            <div style="color:#8bb4d4;font-size:11px;">
              Chat with <a href="https://www.destincondogetaways.com/ai-concierge-574036277" style="color:#8bb4d4;">Destiny Blue</a>
              &nbsp;·&nbsp; Contact: <a href="mailto:ozan@destincondogetaways.com" style="color:#8bb4d4;">ozan@destincondogetaways.com</a>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:8px 28px;font-size:10px;color:#aaa;font-style:italic;">
            * Weather forecasts are estimates. Please verify before your trip.
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // ── 1. Add contact to Brevo list #6 ────────────────────────────────────
  try {
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        email,
        listIds: [6],
        updateEnabled: true,
      }),
    });
  } catch (err) {
    console.warn('Brevo contact add failed:', err.message);
    // Don't block email send if contact add fails
  }

  // ── 2. Send transactional email via Brevo ───────────────────────────────
  const sendRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      sender: { name: 'Destiny Blue · Destin Condo Getaways', email: 'ozan@destincondogetaways.com' },
      to: [{ email }],
      subject: `Your Destin Itinerary — Crafted by Destin Condo Getaways 🌊`,
      htmlContent: emailHTML,
    }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.json();
    console.error('Brevo send failed:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }

  return res.status(200).json({ success: true });
}
