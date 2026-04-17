// backfill-prices.js
// Run once from terminal: node backfill-prices.js
// Seeds price_snapshots with estimated historical prices for captured_dates:
// today-1, today-3, today-5, today-7, today-14
// Uses seasonal profile + occupancy adjustments to reconstruct past prices
// Real cron data takes over from tomorrow onwards

import { createClient } from '@supabase/supabase-js';

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL;
const SUPABASE_KEY = process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY;
const BASE_PRICE = 315;
const MIN_PRICE = 285;
const MAX_PRICE = 315; // seasonal max varies but use global as fallback
const UNITS = ['707', '1006'];

// Days back to backfill
const BACKFILL_WINDOWS = [1, 3, 5, 7, 14];

// ── SEASONAL PROFILE ─────────────────────────────────────────────────────────
// From PriceLabs_Custom_Seasonal_Profile_17042026.csv
// Each entry: { name, startMD: "MM-DD", endMD: "MM-DD", min%, base%, max% }
const SEASONAL_PROFILE = [
  { name: 'Winter',      start: '01-01', end: '01-31', min: -60, base: -50, max: -49 },
  { name: 'February',    start: '02-01', end: '03-01', min: -54, base: -50, max: -44 },
  { name: 'March',       start: '03-02', end: '03-05', min: -56, base: -45, max:  -5 },
  { name: 'March_1',     start: '03-06', end: '03-12', min: -39, base: -25, max:  -5 },
  { name: 'March_2',     start: '03-13', end: '03-15', min: -22, base: -17, max:  -5 },
  { name: 'March_3',     start: '03-16', end: '03-26', min: -20, base: -17, max:  -5 },
  { name: 'SpringBreak', start: '03-27', end: '04-04', min: -10, base:  10, max:  10 },
  { name: 'April',       start: '04-05', end: '04-10', min: -15, base:   4, max:  10 },
  { name: 'April_1',     start: '04-11', end: '04-13', min: -20, base: -18, max:   5 },
  { name: 'April_2',     start: '04-14', end: '04-19', min: -28, base:  -4, max:   1 },
  { name: 'May',         start: '04-20', end: '05-09', min: -30, base: -13, max:   1 },
  { name: 'May_1',       start: '05-10', end: '05-16', min: -10, base:   1, max:   5 },
  { name: 'May_2',       start: '05-17', end: '05-21', min: -15, base:  25, max:  30 },
  { name: 'May_3',       start: '05-22', end: '05-24', min:  20, base:  70, max:  75 },
  { name: 'May_4',       start: '05-25', end: '05-28', min:  15, base:  40, max:  50 },
  { name: 'June',        start: '05-29', end: '06-06', min:  25, base:  60, max:  61 },
  { name: 'June_1',      start: '06-07', end: '06-09', min:  30, base:  44, max:  45 },
  { name: 'June_2',      start: '06-10', end: '06-25', min:  50, base:  60, max:  65 },
  { name: 'June_3',      start: '06-26', end: '07-03', min:  50, base:  75, max:  85 },
  { name: 'July4th',     start: '07-04', end: '07-05', min:  60, base:  85, max: 110 },
  { name: 'Summer',      start: '07-06', end: '07-26', min:  55, base:  65, max:  75 },
  { name: 'Summer_2',    start: '07-27', end: '08-01', min:  15, base:  53, max:  55 },
  { name: 'August',      start: '08-02', end: '08-08', min:  10, base:  25, max:  26 },
  { name: 'August_2',    start: '08-09', end: '08-20', min: -20, base:   0, max:   5 },
  { name: 'August_3',    start: '08-21', end: '08-24', min: -25, base:  11, max:  12 },
  { name: 'August_4',    start: '08-25', end: '09-03', min:  -5, base:  -2, max:   0 },
  { name: 'LaborWeek',   start: '09-04', end: '09-06', min: -10, base:  10, max:  11 },
  { name: 'September',   start: '09-07', end: '09-19', min: -25, base:  -7, max:   1 },
  { name: 'LateSept',    start: '09-20', end: '09-30', min: -25, base: -10, max:  -5 },
  { name: 'October',     start: '10-01', end: '10-24', min: -15, base: -13, max: -10 },
  { name: 'October_1',   start: '10-25', end: '10-31', min: -38, base: -25, max: -15 },
  { name: 'November',    start: '11-01', end: '11-25', min: -60, base: -50, max: -45 },
  { name: 'ThanksGiving',start: '11-26', end: '11-29', min: -55, base: -30, max: -35 },
  { name: 'December',    start: '11-30', end: '12-23', min: -66, base: -65, max: -60 },
  { name: 'Xmas',        start: '12-24', end: '12-31', min: -57, base: -25, max: -20 },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function getSeasonalModifier(dateStr) {
  // dateStr = "YYYY-MM-DD"
  const md = dateStr.substring(5); // "MM-DD"
  for (const s of SEASONAL_PROFILE) {
    if (md >= s.start && md <= s.end) {
      return s.base / 100; // return as decimal e.g. -0.13
    }
  }
  return 0; // fallback
}

function getOccupancyAdjustment(daysOut) {
  // Based on confirmed PriceLabs occupancy rules
  if (daysOut <= 15) return -0.20;
  if (daysOut <= 30) return -0.20;
  if (daysOut <= 60) return -0.05;
  return 0;
}

function calculatePrice(dateStr, capturedDateStr) {
  const date = new Date(dateStr);
  const captured = new Date(capturedDateStr);
  const daysOut = Math.ceil((date - captured) / (1000 * 60 * 60 * 24));

  if (daysOut < 0) return null; // past date relative to captured

  const seasonalMod = getSeasonalModifier(dateStr);
  const occupancyMod = getOccupancyAdjustment(daysOut);

  // PriceLabs calculation: base → seasonal → occupancy → clamp
  let price = BASE_PRICE * (1 + seasonalMod);
  price = price * (1 + occupancyMod);
  price = Math.round(price);

  // Clamp to min/max
  price = Math.max(MIN_PRICE, Math.min(MAX_PRICE, price));

  return price;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE env vars. Set NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL and GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const today = new Date().toISOString().split('T')[0];
  const endDate = `${new Date().getFullYear()}-12-31`;

  console.log(`\n🏖️  Price Backfill Script`);
  console.log(`Today: ${today}`);
  console.log(`Backfilling windows: ${BACKFILL_WINDOWS.map(w => `today-${w}`).join(', ')}\n`);

  let totalInserted = 0;

  for (const daysBack of BACKFILL_WINDOWS) {
    const capturedDate = addDays(today, -daysBack);
    console.log(`\n📅 Processing captured_date = ${capturedDate} (today-${daysBack})`);

    const rows = [];

    // Build all future dates from capturedDate to end of year
    let d = new Date(capturedDate);
    const end = new Date(endDate);

    while (d <= end) {
      const dateStr = d.toISOString().split('T')[0];
      const daysOut = Math.ceil((d - new Date(capturedDate)) / (1000 * 60 * 60 * 24));

      if (daysOut >= 0) {
        const price = calculatePrice(dateStr, capturedDate);
        if (price !== null) {
          for (const unit of UNITS) {
            rows.push({
              unit_id: unit,
              date: dateStr,
              price,
              min_stay: 2,
              demand_desc: null,
              uncustomized_price: null,
              captured_date: capturedDate,
            });
          }
        }
      }
      d.setDate(d.getDate() + 1);
    }

    console.log(`   Generated ${rows.length} rows (${rows.length / UNITS.length} dates × ${UNITS.length} units)`);

    // Upsert in batches of 500
    const BATCH = 500;
    let batchInserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase
        .from('price_snapshots')
        .upsert(batch, { onConflict: 'unit_id,date,captured_date' });
      if (error) {
        console.error(`   ❌ Batch error:`, error.message);
      } else {
        batchInserted += batch.length;
      }
    }

    console.log(`   ✅ Inserted ${batchInserted} rows for captured_date=${capturedDate}`);
    totalInserted += batchInserted;
  }

  console.log(`\n✅ Backfill complete. Total rows inserted: ${totalInserted}`);
  console.log(`\nPrice sample check (Unit 707, May 15):`);
  for (const daysBack of BACKFILL_WINDOWS) {
    const capturedDate = addDays(today, -daysBack);
    const price = calculatePrice('2026-05-15', capturedDate);
    console.log(`  captured_date=${capturedDate} (today-${daysBack}): $${price}`);
  }
  console.log(`  captured_date=${today} (today/real):`, '← check Supabase for actual value');
}

main().catch(console.error);
