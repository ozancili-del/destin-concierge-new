// pages/api/price-drops.js
// Queries Supabase price_snapshots and returns meaningful price drops for given dates
// Called by: chat.js when guest mentions specific dates

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

const WINDOWS = [1, 3, 5, 7, 14, 30]; // days to compare against
const MIN_DROP_PCT = 5; // minimum % drop to report

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { arrival, departure } = req.query;
  if (!arrival || !departure) {
    return res.status(400).json({ error: 'arrival and departure required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Build list of dates in range
    const dates = [];
    let d = new Date(arrival);
    const end = new Date(departure);
    while (d < end) {
      dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }

    if (dates.length === 0) return res.status(200).json({ '707': null, '1006': null });

    // Fetch all snapshots for these dates across all relevant captured_dates
    // We need today's snapshot + snapshots from each window ago
    const capturedDates = [today, ...WINDOWS.map(w => {
      const dd = new Date();
      dd.setDate(dd.getDate() - w);
      return dd.toISOString().split('T')[0];
    })];

    const { data: snapshots, error } = await supabase
      .from('price_snapshots')
      .select('unit_id, date, price, captured_date')
      .in('date', dates)
      .in('captured_date', capturedDates);

    if (error) throw new Error(error.message);
    if (!snapshots || snapshots.length === 0) {
      return res.status(200).json({ '707': null, '1006': null, reason: 'no_data' });
    }

    // Organize by unit → captured_date → date → price
    const byUnit = {};
    for (const row of snapshots) {
      if (!byUnit[row.unit_id]) byUnit[row.unit_id] = {};
      if (!byUnit[row.unit_id][row.captured_date]) byUnit[row.unit_id][row.captured_date] = {};
      byUnit[row.unit_id][row.captured_date][row.date] = row.price;
    }

    const result = {};

    for (const unit of ['707', '1006']) {
      const unitData = byUnit[unit];
      if (!unitData || !unitData[today]) {
        result[unit] = null;
        continue;
      }

      // Calculate average current price across the date range
      const todayPrices = Object.values(unitData[today]);
      const avgToday = todayPrices.reduce((s, v) => s + v, 0) / todayPrices.length;

      // Find best (biggest) meaningful drop across all windows
      let bestDrop = null;

      for (const window of WINDOWS) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - window);
        const pastKey = pastDate.toISOString().split('T')[0];

        if (!unitData[pastKey]) continue;

        const pastPrices = Object.values(unitData[pastKey]);
        if (pastPrices.length === 0) continue;

        const avgPast = pastPrices.reduce((s, v) => s + v, 0) / pastPrices.length;
        const dropPct = ((avgPast - avgToday) / avgPast) * 100;

        if (dropPct >= MIN_DROP_PCT) {
          if (!bestDrop || dropPct > bestDrop.dropPct) {
            bestDrop = {
              dropPct: Math.round(dropPct),
              fromPrice: Math.round(avgPast),
              toPrice: Math.round(avgToday),
              windowDays: window,
            };
          }
        }
      }

      result[unit] = bestDrop;
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error('[PRICE-DROPS] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
