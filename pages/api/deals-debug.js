// pages/api/deals-debug.js
// Temporary debug endpoint — shows exactly what the deals engine finds

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
      process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
    );

    const SCAN_DAYS   = 180;
    const STAY_NIGHTS = [3, 4, 5];
    const WINDOWS     = [7, 14, 30];
    const MIN_DROP    = 5;
    const MAX_DEALS   = 20;

    function fmt(d) { return d.toISOString().split('T')[0]; }
    function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = fmt(today);

    const allDates = [];
    for (let i = 1; i <= SCAN_DAYS + 5; i++) allDates.push(fmt(addDays(today, i)));

    const capturedDates = [todayStr, ...WINDOWS.map(w => fmt(addDays(today, -w)))];

    const { data: snapshots, error } = await supabase
      .from('price_snapshots')
      .select('unit_id, date, price, captured_date')
      .in('date', allDates)
      .in('captured_date', capturedDates)
      .limit(5000);

    if (error) return res.status(200).json({ error: error.message });

    // What captured dates actually came back?
    const returnedCapturedDates = [...new Set(snapshots.map(r => r.captured_date))].sort();
    const returnedUnits = [...new Set(snapshots.map(r => r.unit_id))];
    const totalRows = snapshots?.length || 0;

    // Build byUnit
    const byUnit = {};
    for (const row of snapshots) {
      if (!byUnit[row.unit_id]) byUnit[row.unit_id] = {};
      if (!byUnit[row.unit_id][row.captured_date]) byUnit[row.unit_id][row.captured_date] = {};
      byUnit[row.unit_id][row.captured_date][row.date] = row.price;
    }

    const maxPrice = {};
    for (const row of snapshots) {
      const key = `${row.unit_id}::${row.date}`;
      if (!maxPrice[key] || row.price > maxPrice[key]) maxPrice[key] = row.price;
    }

    // Check first 10 arrival dates for unit 707, 3 nights
    const sampleChecks = [];
    const unitData = byUnit['707'];
    if (unitData?.[todayStr]) {
      for (let i = 1; i <= 10; i++) {
        const arrival = addDays(today, i);
        const arrivalStr = fmt(arrival);
        const windowDates = [arrivalStr, fmt(addDays(arrival,1)), fmt(addDays(arrival,2))];

        const todayPrices = windowDates.map(d => unitData[todayStr]?.[d]).filter(v => v != null);
        const maxPrices = windowDates.map(d => maxPrice[`707::${d}`]).filter(v => v != null);

        const avgToday = todayPrices.length === 3 ? todayPrices.reduce((s,v)=>s+v,0)/3 : null;
        const avgMax = maxPrices.length === 3 ? maxPrices.reduce((s,v)=>s+v,0)/3 : null;
        const dropPct = avgToday && avgMax ? ((avgMax - avgToday) / avgMax) * 100 : null;

        sampleChecks.push({
          arrival: arrivalStr,
          todayPrices,
          maxPrices,
          avgToday: avgToday ? Math.round(avgToday) : null,
          avgMax: avgMax ? Math.round(avgMax) : null,
          dropPct: dropPct ? Math.round(dropPct) : null,
          qualifies: dropPct >= MIN_DROP && dropPct <= 60 && avgMax > avgToday
        });
      }
    }

    return res.status(200).json({
      todayStr,
      capturedDatesQueried: capturedDates,
      capturedDatesReturned: returnedCapturedDates,
      returnedUnits,
      totalRows,
      hasTodayData: !!byUnit['707']?.[todayStr],
      sampleChecks_707_3nights: sampleChecks
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
