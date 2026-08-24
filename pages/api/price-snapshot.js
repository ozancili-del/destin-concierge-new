// pages/api/price-snapshot.js
// Pulls PriceLabs prices for both units (today → one year ahead) and upserts into Supabase
// Called only by the authenticated Vercel cron (midnight CST).

import { createClient } from '@supabase/supabase-js';

const PRICELABS_API_KEY = process.env.PRICELABS_API_KEY;
const PL_BASE = 'https://api.pricelabs.co/v1';
const CRON_SECRET = process.env.CRON_SECRET; // add this to Vercel env vars

const LISTINGS = {
  '707':  { id: '293722', pms: 'ownerrez' },
  '1006': { id: '410894', pms: 'ownerrez' },
};

export default async function handler(req, res) {
  // Allow cron (GET with secret header) or internal POST with secret
  const authHeader = req.headers['x-cron-secret'] || req.headers['authorization'];
  // Fail closed when CRON_SECRET is absent. Without this guard, an absent
  // header and absent environment variable both evaluate to `undefined`.
  const isAuthorized = Boolean(
    CRON_SECRET &&
    authHeader &&
    (authHeader === CRON_SECRET || authHeader === `Bearer ${CRON_SECRET}`)
  );

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL;
    const supabaseServiceKey = process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY;
    if (!PRICELABS_API_KEY || !supabaseUrl || !supabaseServiceKey) {
      return res.status(503).json({ error: 'Snapshot service is not configured' });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const start_date = today.toISOString().split('T')[0];
    const coverageEnd = new Date(today);
    coverageEnd.setUTCDate(coverageEnd.getUTCDate() + 365);
    const end_date = coverageEnd.toISOString().split('T')[0];
    const captured_date = start_date;

    console.log(`[SNAPSHOT] Pulling prices ${start_date} → ${end_date}`);

    // Pull prices for both units in parallel
    const results = await Promise.all(
      Object.entries(LISTINGS).map(async ([unit, info]) => {
        const r = await fetch(`${PL_BASE}/listing_prices`, {
          method: 'POST',
          headers: {
            'X-Api-Key': PRICELABS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pms: info.pms,
            listings: [{ id: info.id, pms: info.pms }],
            start_date,
            end_date
          })
        });
        const data = await r.json();
        const unitData = Array.isArray(data) ? data[0] : data;
        return { unit, data: unitData };
      })
    );

    // Build rows for upsert
    const rows = [];
    for (const { unit, data } of results) {
      if (!data?.data) continue;
      for (const d of data.data) {
        if (!d.date || !d.price) continue;
        rows.push({
          unit_id: unit,
          date: d.date,
          price: d.price,
          min_stay: d.min_stay || null,
          demand_desc: d.demand_desc || null,
          uncustomized_price: d.uncustomized_price || null,
          captured_date,
        });
      }
    }

    if (rows.length === 0) {
      return res.status(200).json({ success: true, saved: 0, message: 'No rows to save' });
    }

    // Upsert in batches of 500 (Supabase limit)
    const BATCH = 500;
    let totalSaved = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase
        .from('price_snapshots')
        .upsert(batch, { onConflict: 'unit_id,date,captured_date' });
      if (error) throw new Error(`Supabase upsert error: ${error.message}`);
      totalSaved += batch.length;
    }

    console.log(`[SNAPSHOT] Saved ${totalSaved} rows for captured_date=${captured_date}`);
    return res.status(200).json({
      success: true,
      saved: totalSaved,
      captured_date,
      units: results.map(r => r.unit),
    });

  } catch (err) {
    console.error('[SNAPSHOT] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
