import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

const MOCK_KEY = '1111';
const GUEST_NAMES = ['Sarah', 'Michael', 'Emma', 'James', 'Olivia', 'William', 'Ava', 'Benjamin', 'Sophia', 'Lucas'];

function encrypt(text) {
  const key = crypto.scryptSync(process.env.ANTHROPIC_API_KEY, 'guestview_salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function getRandomName() {
  return GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
}

function getFutureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { or_email, or_key, user_id } = req.body;
  if (!or_email || !or_key || !user_id) return res.status(400).json({ error: 'Missing required fields' });

  const isMock = or_key === MOCK_KEY;

  try {
    if (!isMock) {
      // Validate real OR key
      const credentials = Buffer.from(`${or_email}:${or_key}`).toString('base64');
      const orRes = await fetch('https://api.ownerrez.com/v2/bookings?count=1', {
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' }
      });
      if (!orRes.ok) return res.status(401).json({ error: 'Invalid OwnerRez credentials. Check your email and API key.' });
    }

    const encryptedKey = encrypt(or_key);

    // Save OR connection
    await supabase.from('guestview_or_connections').upsert({
      user_id, or_email, or_key_encrypted: encryptedKey, validated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    // Update user mock_mode and or_email
    await supabase.from('guestview_users').upsert({
      id: user_id, email: or_email, mock_mode: isMock, or_email
    }, { onConflict: 'id' });

    if (isMock) {
      // Generate mock bookings for all units
      const { data: units } = await supabase
        .from('guestview_units')
        .select('id')
        .eq('user_id', user_id);

      if (units?.length) {
        // Delete old mock bookings first
        await supabase.from('guestview_mock_bookings').delete().eq('user_id', user_id);

        const mockBookings = units.map((unit, i) => ({
          user_id,
          unit_id: unit.id,
          guest_first_name: getRandomName(),
          arrival: getFutureDate(i % 3 === 0 ? 0 : 1),
          departure: getFutureDate(i % 3 === 0 ? 3 : 5)
        }));

        await supabase.from('guestview_mock_bookings').insert(mockBookings);
      }

      return res.status(200).json({
        success: true,
        mock: true,
        sample: {
          guest_first_name: getRandomName(),
          arrival: getFutureDate(1),
          departure: getFutureDate(4)
        }
      });
    }

    // Real mode - get sample booking
    const credentials = Buffer.from(`${or_email}:${or_key}`).toString('base64');
    const orRes = await fetch('https://api.ownerrez.com/v2/bookings?count=1', {
      headers: { 'Authorization': `Basic ${credentials}` }
    });
    const orData = await orRes.json();
    const booking = orData.items?.[0];

    return res.status(200).json({
      success: true,
      mock: false,
      sample: booking ? {
        guest_first_name: booking.guest_first_name || booking.first_name || 'Guest',
        arrival: booking.arrival || booking.checkin,
        departure: booking.departure || booking.checkout
      } : null
    });

  } catch (err) {
    console.error('OR validation error:', err);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
}
