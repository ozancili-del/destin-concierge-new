import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

function encrypt(text) {
  const key = crypto.scryptSync(process.env.GUESTVIEW_ENCRYPTION_SECRET || process.env.ANTHROPIC_API_KEY, 'guestview_salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { or_email, or_key, user_id } = req.body;
  if (!or_email || !or_key || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const credentials = Buffer.from(`${or_email}:${or_key}`).toString('base64');
    const orRes = await fetch('https://api.ownerrez.com/v2/bookings?count=1', {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });

    if (!orRes.ok) {
      return res.status(401).json({ error: 'Invalid OwnerRez credentials. Check your email and API key.' });
    }

    const orData = await orRes.json();
    const booking = orData.items?.[0];

    let sample = null;
    if (booking) {
      sample = {
        guest_first_name: booking.guest_first_name || booking.first_name || 'Guest',
        arrival: booking.arrival || booking.checkin,
        departure: booking.departure || booking.checkout
      };
    }

    const encryptedKey = encrypt(or_key);
    const { error: dbError } = await supabase
      .from('guestview_or_connections')
      .upsert({
        user_id,
        or_email,
        or_key_encrypted: encryptedKey,
        validated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (dbError) throw dbError;

    await supabase
      .from('guestview_onboarding')
      .upsert({ user_id, or_connected: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    return res.status(200).json({ success: true, sample });
  } catch (err) {
    console.error('OR validation error:', err);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
}
