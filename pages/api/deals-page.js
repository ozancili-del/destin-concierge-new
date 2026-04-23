// pages/api/deals-page.js
// Scans next 90 days for price drops across 3/4/5 night stays
// Returns best deals for the deals page — no guest input needed

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
  process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
);

const SCAN_DAYS   = 90;
const STAY_NIGHTS = [3, 4, 5];
const WINDOWS     = [7, 14, 30];
const MIN_DROP    = 5;
const MAX_DEALS   = 10;

function fmt(d) { return d.toISOString().split('T')[0]; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function friendly(str) {
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = fmt(today);

    // All dates we might need: today+1 through today+90+5
    const allDates = [];
    for (let i = 1; i <= SCAN_DAYS + 5; i++) {
      allDates.push(fmt(addDays(today, i)));
    }

    // Captured dates: today + each comparison window
    const capturedDates = [
      todayStr,
      ...WINDOWS.map(w => fmt(addDays(today, -w)))
    ];

    // Single Supabase query — fetch everything at once
    const { data: snapshots, error } = await supabase
      .from('price_snapshots')
      .select('unit_id, date, price, captured_date')
      .in('date', allDates)
      .in('captured_date', capturedDates);

    if (error) throw new Error(error.message);
    if (!snapshots || snapshots.length === 0) {
      return res.status(200).json({ deals: [], total: 0, reason: 'no_data', updatedAt: new Date().toISOString() });
    }

    // Organise: byUnit[unit][captured_date][date] = price
    const byUnit = {};
    for (const row of snapshots) {
      if (!byUnit[row.unit_id]) byUnit[row.unit_id] = {};
      if (!byUnit[row.unit_id][row.captured_date]) byUnit[row.unit_id][row.captured_date] = {};
      byUnit[row.unit_id][row.captured_date][row.date] = row.price;
    }

    const candidates = [];

    for (const unit of ['707', '1006']) {
      const unitData = byUnit[unit];
      if (!unitData?.[todayStr]) continue;

      const unitLabel = unit === '707' ? 'Unit 707 — Classic Coastal' : 'Unit 1006 — Fresh Coastal';
      const unitSub   = unit === '707' ? '7th floor · Beachfront · Sleeps 6' : '10th floor · Panoramic views · Sleeps 6';

      // Every possible arrival date
      for (let i = 1; i <= SCAN_DAYS; i++) {
        const arrival    = addDays(today, i);
        const arrivalStr = fmt(arrival);

        // Each stay length
        for (const nights of STAY_NIGHTS) {
          const departure    = addDays(arrival, nights);
          const departureStr = fmt(departure);

          // Dates in this window
          const windowDates = [];
          for (let j = 0; j < nights; j++) {
            windowDates.push(fmt(addDays(arrival, j)));
          }

          // Today's prices for this window — must have all nights
          const todayPrices = windowDates.map(d => unitData[todayStr]?.[d]).filter(v => v != null);
          if (todayPrices.length < nights) continue;

          const avgToday = todayPrices.reduce((s, v) => s + v, 0) / todayPrices.length;

          // Best drop across comparison windows
          let bestDrop = null;
          for (const w of WINDOWS) {
            const pastKey    = fmt(addDays(today, -w));
            if (!unitData[pastKey]) continue;

            const pastPrices = windowDates.map(d => unitData[pastKey]?.[d]).filter(v => v != null);
            if (pastPrices.length < nights) continue;

            const avgPast = pastPrices.reduce((s, v) => s + v, 0) / pastPrices.length;
            const dropPct = ((avgPast - avgToday) / avgPast) * 100;

            if (dropPct >= MIN_DROP && dropPct <= 60 && avgPast > avgToday) {
              if (!bestDrop || dropPct > bestDrop.dropPct) {
                bestDrop = {
                  dropPct:    Math.round(dropPct),
                  fromPrice:  Math.round(avgPast),
                  toPrice:    Math.round(avgToday),
                  windowDays: w,
                };
              }
            }
          }

          if (!bestDrop) continue;

          candidates.push({
            unit,
            unitLabel,
            unitSub,
            arrival:           arrivalStr,
            departure:         departureStr,
            arrivalFriendly:   friendly(arrivalStr),
            departureFriendly: friendly(departureStr),
            nights,
            dropPct:           bestDrop.dropPct,
            fromPrice:         bestDrop.fromPrice,
            toPrice:           bestDrop.toPrice,
            windowDays:        bestDrop.windowDays,
            totalSavings:      Math.round((bestDrop.fromPrice - bestDrop.toPrice) * nights),
          });
        }
      }
    }

    // Sort: biggest drop first, then biggest total savings
    candidates.sort((a, b) => b.dropPct - a.dropPct || b.totalSavings - a.totalSavings);

    // Deduplicate — no overlapping windows for same unit
    const finalDeals = [];
    const usedRanges = { '707': [], '1006': [] };

    for (const deal of candidates) {
      const used     = usedRanges[deal.unit];
      const overlaps = used.some(r => deal.arrival < r.departure && deal.departure > r.arrival);
      if (!overlaps) {
        finalDeals.push(deal);
        usedRanges[deal.unit].push({ arrival: deal.arrival, departure: deal.departure });
      }
      if (finalDeals.length >= MAX_DEALS) break;
    }

    return res.status(200).json({
      deals:     finalDeals,
      total:     finalDeals.length,
      updatedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[DEALS-PAGE]', err.message);
    return res.status(500).json({ error: err.message, deals: [] });
  }
}
