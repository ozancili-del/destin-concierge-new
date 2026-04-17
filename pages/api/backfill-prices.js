// pages/api/backfill-prices.js
// TEMPORARY ONE-TIME ENDPOINT — DELETE AFTER RUNNING
// Hit once from browser: https://destin-concierge-new.vercel.app/api/backfill-prices?secret=backfill2026
// Then delete this file from GitHub

import { createClient } from '@supabase/supabase-js';

const SECRET = 'backfill2026';
const BASE_PRICE = 315;
const MIN_PRICE = 285;
const MAX_PRICE = 315;
const UNITS = ['707', '1006'];
const BACKFILL_WINDOWS = [1, 3, 5, 7, 14];

const SEASONAL_PROFILE = [
  { name: 'Winter',      start: '01-01', end: '01-31', base: -50 },
  { name: 'February',    start: '02-01', end: '03-01', base: -50 },
  { name: 'March',       start: '03-02', end: '03-05', base: -45 },
  { name: 'March_1',     start: '03-06', end: '03-12', base: -25 },
  { name: 'March_2',     start: '03-13', end: '03-15', base: -17 },
  { name: 'March_3',     start: '03-16', end: '03-26', base: -17 },
  { name: 'SpringBreak', start: '03-27', end: '04-04', base:  10 },
  { name: 'April',       start: '04-05', end: '04-10', base:   4 },
  { name: 'April_1',     start: '04-11', end: '04-13', base: -18 },
  { name: 'April_2',     start: '04-14', end: '04-19', base:  -4 },
  { name: 'May',         start: '04-20', end: '05-09', base: -13 },
  { name: 'May_1',       start: '05-10', end: '05-16', base:   1 },
  { name: 'May_2',       start: '05-17', end: '05-21', base:  25 },
  { name: 'May_3',       start: '05-22', end: '05-24', base:  70 },
  { name: 'May_4',       start: '05-25', end: '05-28', base:  40 },
  { name: 'June',        start: '05-29', end: '06-06', base:  60 },
  { name: 'June_1',      start: '06-07', end: '06-09', base:  44 },
  { name: 'June_2',      start: '06-10', end: '06-25', base:  60 },
  { name: 'June_3',      start: '06-26', end: '07-03', base:  75 },
  { name: 'July4th',     start: '07-04', end: '07-05', base:  85 },
  { name: 'Summer',      start: '07-06', end: '07-26', base:  65 },
  { name: 'Summer_2',    start: '07-27', end: '08-01', base:  53 },
  { name: 'August',      start: '08-02', end: '08-08', base:  25 },
  { name: 'August_2',    start: '08-09', end: '08-20', base:   0 },
  { name: 'August_3',    start: '08-21', end: '08-24', base:  11 },
  { name: 'August_4',    start: '08-25', end: '09-03', base:  -2 },
  { name: 'LaborWeek',   start: '09-04', end: '09-06', base:  10 },
  { name: 'September',   start: '09-07', end: '09-19', base:  -7 },
  { name: 'LateSept',    start: '09-20', end: '09-30', base: -10 },
  { name: 'October',     start: '10-01', end: '10-24', base: -13 },
  { name: 'October_1',   start: '10-25', end: '10-31', base: -25 },
  { name: 'November',    start: '11-01', end: '11-25', base: -50 },
  { name: 'ThanksGiving',start: '11-26', end: '11-29', base: -30 },
  { name: 'December',    start: '11-30', end: '12-23', base: -65 },
  { name: 'Xmas',        start: '12-24', end: '12-31', base: -25 },
];

function getSeasonalModifier(dateStr) {
  const md = dateStr.substring(5);
  for (const s of SEASONAL_PROFILE) {
    if (md >= s.start && md <= s.end) return s.base / 100;
  }
  return 0;
}

function getOccupancyAdjustment(daysOut) {
  if (daysOut <= 30) return -0.20;
  if (daysOut <= 60) return -0.05;
  return 0;
}

function calculatePrice(dateStr, capturedDateStr) {
  const daysOut = Math.ceil((new Date(dateStr) - new Date(capturedDateStr)) / (1000 * 60 * 60 * 24));
  if (daysOut < 0) return null;
  const seasonalMod = getSeasonalModifier(dateStr);
  const occupancyMod = getOccupancyAdjustment(daysOut);
  let price = BASE_PRICE * (1 + seasonalMod) * (1 + occupancyMod);
  price = Math.round(price);
  return Math.max(MIN_PRICE, Math.min(MAX_PRICE, price));
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  if (req.query.secret !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
    process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
  );

  const today = new Date().toISOString().split('T')[0];
  const endDate = `${new Date().getFullYear()}-12-31`;
  const results = [];

  for (const daysBack of BACKFILL_WINDOWS) {
    const capturedDate = addDays(today, -daysBack);
    const rows = [];
    let d = new Date(capturedDate);
    const end = new Date(endDate);

    while (d <= end) {
      const dateStr = d.toISOString().split('T')[0];
      const price = calculatePrice(dateStr, capturedDate);
      if (price !== null) {
        for (const unit of UNITS) {
          rows.push({ unit_id: unit, date: dateStr, price, min_stay: 2, demand_desc: null, uncustomized_price: null, captured_date: capturedDate });
        }
      }
      d.setDate(d.getDate() + 1);
    }

    const BATCH = 500;
    let saved = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await supabase
        .from('price_snapshots')
        .upsert(rows.slice(i, i + BATCH), { onConflict: 'unit_id,date,captured_date' });
      if (!error) saved += Math.min(BATCH, rows.length - i);
    }

    results.push({ capturedDate, daysBack, saved });
  }

  return res.status(200).json({
    success: true,
    results,
    totalSaved: results.reduce((s, r) => s + r.saved, 0),
    message: 'Backfill complete. Delete this file from GitHub now.'
  });
}
