import { allowSameOriginRequest, enforceRateLimit } from '../../lib/public-api-security.js';

export default function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ['GET'] })) return;
  if (!enforceRateLimit(req, res, { scope: 'maps-key', limit: 60, windowMs: 10 * 60 * 1000 })) return;
  if (!process.env.GOOGLE_MAPS_KEY) return res.status(503).json({ error: 'Map service unavailable' });
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.status(200).json({ key: process.env.GOOGLE_MAPS_KEY });
}
