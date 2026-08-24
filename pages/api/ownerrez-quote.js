import { allowSameOriginRequest, enforceJsonSize, enforceRateLimit, parseIsoDate } from '../../lib/public-api-security.js';

const OWNERREZ_BASE = 'https://api.ownerrez.com/v2';
const OWNERREZ_USER = process.env.OWNERREZ_USER || 'ozan@destincondogetaways.com';
const PROPERTIES = Object.freeze({
  '707': 293722,
  '1006': 410894,
});

function ownerRezHeaders() {
  const token = process.env.OWNERREZ_API_TOKEN;
  if (!token) throw new Error('OWNERREZ_API_TOKEN is not configured');
  return {
    Authorization: `Basic ${Buffer.from(`${OWNERREZ_USER}:${token}`).toString('base64')}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'DestinCondoGetaways/1.0',
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...ownerRezHeaders(), ...(options.headers || {}) } });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!response.ok) {
    const error = new Error(`OwnerRez returned ${response.status}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

function normalizeCharges(charges = []) {
  return charges.map((charge) => ({
    description: charge.description || charge.type || 'Charge',
    type: charge.type || null,
    amount: Number(charge.amount || 0),
    taxable: Boolean(charge.is_taxable),
    surchargeId: charge.surcharge_id || null,
    taxId: charge.tax_id || null,
  }));
}

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ['POST'] })) return;
  if (!enforceJsonSize(req, res, 4096)) return;
  if (!enforceRateLimit(req, res, { scope: 'ownerrez-quote', limit: 20, windowMs: 10 * 60 * 1000 })) return;

  const { unit, arrival, departure, adults = 2, children = 0, infants = 0 } = req.body || {};
  const propertyId = PROPERTIES[String(unit)];
  const arrivalDate = parseIsoDate(arrival);
  const departureDate = parseIsoDate(departure);
  const guestCounts = [adults, children, infants].map(Number);

  if (!propertyId) return res.status(400).json({ error: 'unit must be 707 or 1006' });
  if (!arrivalDate || !departureDate || departureDate <= arrivalDate) {
    return res.status(400).json({ error: 'valid arrival and departure dates are required' });
  }
  if (arrivalDate < new Date(new Date().toISOString().slice(0, 10))) {
    return res.status(400).json({ error: 'arrival must be today or later' });
  }
  if (guestCounts.some((value) => !Number.isInteger(value) || value < 0) || adults < 1) {
    return res.status(400).json({ error: 'guest counts are invalid' });
  }
  if (guestCounts.reduce((sum, value) => sum + value, 0) > 6) {
    return res.status(400).json({ error: 'maximum occupancy is 6 guests' });
  }

  let stage = 'configuration';
  try {
    ownerRezHeaders();
    stage = 'quote';
    const quote = await fetchJson(`${OWNERREZ_BASE}/quotes`, {
      method: 'POST',
      body: JSON.stringify({
        property_id: propertyId,
        arrival,
        departure,
        adults: Number(adults),
        children: Number(children),
        infants: Number(infants),
        pets: 0,
        // OwnerRez applies the website-scoped discount and surcharge rules by
        // listing-site name. The v2 quote schema calls this field listing_site.
        listing_site: process.env.OWNERREZ_WEBSITE_LISTING_SITE || 'My Website',
        generate_charges: true,
        generate_email: false,
        hold_dates: false,
        test: true,
        validate_rules: true,
      }),
    });
    const charges = normalizeCharges(quote?.charges);
    const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      source: 'ownerrez-test-quote',
      unit: String(unit),
      arrival,
      departure,
      listingSite: process.env.OWNERREZ_WEBSITE_LISTING_SITE || 'My Website',
      charges,
      total: Number(total.toFixed(2)),
    });
  } catch (error) {
    console.error('OwnerRez quote probe failed:', error.message, error.details || '');
    const reason = error.message === 'OWNERREZ_API_TOKEN is not configured'
      ? 'configuration-missing'
      : Number.isInteger(error.status)
          ? `ownerrez-http-${error.status}`
          : 'ownerrez-request-failed';
    return res.status(503).json({
      error: 'OwnerRez quote could not be generated',
      fallback: 'manual-estimate',
      diagnostic: { stage, reason },
    });
  }
}
