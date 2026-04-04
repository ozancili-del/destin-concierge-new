// pages/api/pricelabs-proxy.js
// Handles all PriceLabs API calls server-side to keep API key secure
// Also handles Claude analysis calls

const PRICELABS_API_KEY = process.env.PRICELABS_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OWNERREZ_USER = process.env.OWNERREZ_USER || 'ozan@destincondogetaways.com';
const OWNERREZ_TOKEN = process.env.OWNERREZ_API_TOKEN;
const OR_BASE = 'https://api.ownerrez.com/v2';
const PL_BASE = 'https://api.pricelabs.co/v1';

const LISTINGS = {
  '1006': { id: '410894', pms: 'ownerrez', name: 'Unit 1006', orSince: '2024-01-01' },
  '707':  { id: '293722', pms: 'ownerrez', name: 'Unit 707',  orSince: '2023-01-01' },
};

const EXCLUDED_COMPETITORS = new Set(['48096457']);

// OwnerRez paginated fetch helper
async function fetchORBookings(sinceDate) {
  const credentials = Buffer.from(`${OWNERREZ_USER}:${OWNERREZ_TOKEN}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'PriceIQ/1.0'
  };
  let allItems = [];
  let url = `${OR_BASE}/bookings?property_ids=410894,293722&since_utc=2022-01-01T00:00:00Z&status=active&limit=50`;
  let pageCount = 0;
  const MAX_PAGES = 15; // safety limit for Vercel 10s timeout
  while (url && pageCount < MAX_PAGES) {
    pageCount++;
    const r = await fetch(url.startsWith('http') ? url : `https://api.ownerrez.com${url}`, { headers });
    if (!r.ok) break;
    const data = await r.json();
    const items = data.items || [];
    allItems = allItems.concat(items);
    url = data.next_page_url || null;
  }
  return allItems;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    switch (action) {

      // GET /api/pricelabs-proxy?action=listings
      case 'listings': {
        const results = {};
        for (const [unit, info] of Object.entries(LISTINGS)) {
          const r = await fetch(`${PL_BASE}/listings/${info.id}?pms=${info.pms}`, {
            headers: { 'X-Api-Key': PRICELABS_API_KEY }
          });
          results[unit] = await r.json();
        }
        return res.status(200).json(results);
      }

      // POST /api/pricelabs-proxy?action=prices
      // body: { start_date, end_date }
      case 'prices': {
        const { start_date, end_date } = req.body;
        const results = {};
        for (const [unit, info] of Object.entries(LISTINGS)) {
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
          results[unit] = Array.isArray(data) ? data[0] : data;
        }
        return res.status(200).json(results);
      }

      // POST /api/pricelabs-proxy?action=override
      // body: { unit, overrides: [{date, price, min_stay?, reason}] }
      case 'override': {
        const { unit, overrides } = req.body;
        const info = LISTINGS[unit];
        if (!info) return res.status(400).json({ error: 'Invalid unit' });

        const payload = {
          pms: info.pms,
          overrides: overrides.map(o => ({
            date: o.date,
            price: String(o.price),
            price_type: 'fixed',
            currency: 'USD',
            ...(o.min_stay && { min_stay: o.min_stay }),
            reason: o.reason || 'PriceIQ recommendation'
          }))
        };

        const r = await fetch(`${PL_BASE}/listings/${info.id}/overrides`, {
          method: 'POST',
          headers: {
            'X-Api-Key': PRICELABS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const data = await r.json();
        return res.status(200).json(data);
      }

      // POST /api/pricelabs-proxy?action=analyze
      // body: { prices_1006, prices_707, competitors, listings_data, seasonal_profile }
      case 'analyze': {
        const { prices_1006, prices_707, competitors, listings_data, upload_history, action_log, booking_pace } = req.body;

        // Build competitor summary — only available dates, exclude blocked units
        const today = new Date().toISOString().split('T')[0];
        const in14Days = new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0];

        // Build date map from competitor data
        const compByDate = {};
        for (const comp of competitors) {
          if (EXCLUDED_COMPETITORS.has(comp.id)) continue;
          for (const [date, info] of Object.entries(comp.prices || {})) {
            if (!compByDate[date]) compByDate[date] = { booked: [], available: [] };
            if (info.available === 0 && info.price > 0) {
              compByDate[date].booked.push({ id: comp.id, name: comp.name, lastSeenPrice: info.price });
            } else if (info.available === 1 && info.price > 0) {
              compByDate[date].available.push({ id: comp.id, name: comp.name, price: info.price });
            }
          }
        }

        // Build analysis context
        const units = {
          '1006': { prices: prices_1006, listing: listings_data?.['1006'] },
          '707':  { prices: prices_707,  listing: listings_data?.['707']  },
        };

        // Find actionable dates for next 180 days
        const actionableDates = [];
        const endDate = new Date(Date.now() + 180*24*60*60*1000).toISOString().split('T')[0];

        // Group by week to avoid 180 individual date entries
        const weekMap = {};

        for (const [unit, data] of Object.entries(units)) {
          if (!data.prices?.data) continue;
          for (const d of data.prices.data) {
            if (d.date < today || d.date > endDate) continue;
            if (d.booking_status?.includes('Booked')) continue;
            if (d.unbookable) continue;

            const comp = compByDate[d.date] || { booked: [], available: [] };
            const isUrgent = d.date <= in14Days;
            const bookedRatio = comp.booked.length / Math.max(comp.booked.length + comp.available.length, 1);
            const avgAvailPrice = comp.available.length > 0
              ? Math.round(comp.available.reduce((s, c) => s + c.price, 0) / comp.available.length)
              : null;
            const lastYearADR = d.ADR_STLY > 0 ? d.ADR_STLY : null;
            const stlyBooked = d.booking_status_STLY?.includes('Booked');
            const profileCapped = d.uncustomized_price > d.price * 1.1;

            // Week key — group dates into 7-day windows per unit
            const dateObj = new Date(d.date);
            const weekStart = new Date(dateObj);
            weekStart.setDate(dateObj.getDate() - dateObj.getDay());
            const weekKey = `${unit}_${weekStart.toISOString().split('T')[0]}`;

            if (!weekMap[weekKey]) {
              weekMap[weekKey] = {
                unit,
                weekStart: weekStart.toISOString().split('T')[0],
                dates: [],
                prices: [],
                uncustomized: [],
                lastYearADRs: [],
                stlyBooked: false,
                isUrgent: false,
                bookedRatios: [],
                avgAvailPrices: [],
                bookedLastSeen: [],
                profileCapped: false,
                demandDescs: []
              };
            }

            const wk = weekMap[weekKey];
            wk.dates.push(d.date);
            wk.prices.push(d.price);
            wk.uncustomized.push(d.uncustomized_price);
            if (lastYearADR) wk.lastYearADRs.push(lastYearADR);
            if (stlyBooked) wk.stlyBooked = true;
            if (isUrgent) wk.isUrgent = true;
            if (profileCapped) wk.profileCapped = true;
            wk.bookedRatios.push(bookedRatio);
            if (avgAvailPrice) wk.avgAvailPrices.push(avgAvailPrice);
            if (comp.booked.length > 0) {
              wk.bookedLastSeen.push(Math.round(comp.booked.reduce((s,c) => s + c.lastSeenPrice, 0) / comp.booked.length));
            }
            if (d.demand_desc) wk.demandDescs.push(d.demand_desc);
          }
        }

        // Convert week map to actionable dates
        for (const wk of Object.values(weekMap)) {
          const avgPrice = Math.round(wk.prices.reduce((s,v) => s+v, 0) / wk.prices.length);
          const avgUncust = Math.round(wk.uncustomized.reduce((s,v) => s+v, 0) / wk.uncustomized.length);
          const avgBookedRatio = wk.bookedRatios.reduce((s,v) => s+v, 0) / wk.bookedRatios.length;
          const avgLastYearADR = wk.lastYearADRs.length > 0
            ? Math.round(wk.lastYearADRs.reduce((s,v) => s+v, 0) / wk.lastYearADRs.length) : null;
          const avgAvailCompPrice = wk.avgAvailPrices.length > 0
            ? Math.round(wk.avgAvailPrices.reduce((s,v) => s+v, 0) / wk.avgAvailPrices.length) : null;
          const avgBookedLastSeen = wk.bookedLastSeen.length > 0
            ? Math.round(wk.bookedLastSeen.reduce((s,v) => s+v, 0) / wk.bookedLastSeen.length) : null;

          // Overpriced signal: you are available, comps are available, you are more expensive
          const overpriced = avgAvailCompPrice && avgPrice > avgAvailCompPrice * 1.05
            && avgBookedRatio < 0.5;

          // Underpriced signal: comps booked at higher last-seen, or profile capping you below uncustomized
          const underpriced = (avgBookedLastSeen && avgPrice < avgBookedLastSeen * 0.9)
            || wk.profileCapped;

          actionableDates.push({
            unit: wk.unit,
            weekOf: wk.weekStart,
            dates: wk.dates,
            dateRange: `${wk.dates[0]} to ${wk.dates[wk.dates.length-1]}`,
            avgYourPrice: avgPrice,
            avgUncustomized: avgUncust,
            avgLastYearADR,
            stlyBooked: wk.stlyBooked,
            isUrgent: wk.isUrgent,
            profileCapped: wk.profileCapped,
            overpriced,
            underpriced,
            competitorBookedRatio: Math.round(avgBookedRatio * 100),
            avgAvailableCompPrice: avgAvailCompPrice,
            avgBookedCompLastSeen: avgBookedLastSeen,
            daysInWeek: wk.dates.length,
            dominantDemand: wk.demandDescs[0] || null
          });
        }

        // Sort: urgent first, then by booked ratio, then by date
        actionableDates.sort((a, b) => {
          if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
          if (b.competitorBookedRatio !== a.competitorBookedRatio) return b.competitorBookedRatio - a.competitorBookedRatio;
          return a.weekOf < b.weekOf ? -1 : 1;
        });

        // Take top 30 weeks for Claude — covers 3-4 months
        const topDates = actionableDates.slice(0, 30);

        const systemPrompt = `You are PriceIQ, an expert vacation rental pricing advisor for Pelican Beach Resort in Destin, FL.

You analyze data for two beachfront condo units:
- Unit 1006 (10th floor, "Fresh Coastal") - PriceLabs ID 410894
- Unit 707 (7th floor, "Classic Coastal") - PriceLabs ID 293722

Base price: $315/night. Both units sleep up to 6.

CRITICAL RULES:
1. Competitor available=0 means BOOKED. Price shown = last seen before booking, NOT actual sale price. Never claim to know actual sale price.
2. CHECK BOTH DIRECTIONS — you can be TOO LOW or TOO HIGH. Don't only recommend raises.
3. OVERPRICED signal (overpriced=true): you are available, competitors are available, your price is 5%+ above their avg asking. If date is approaching and you're the most expensive available unit — recommend LOWER.
4. UNDERPRICED signal (underpriced=true): competitors booked at higher last-seen prices, or profile is capping PriceLabs algorithm.
5. If recommending below last year ADR, you MUST provide explicit reasoning.
6. 14-day window (isUrgent=true) = flag first regardless of direction.
7. profileCapped=true means your seasonal profile MAX is blocking PriceLabs from going higher — recommend CHECK_PROFILE not a DSO.
8. Cover ALL months in the data — April through September. Don't cluster on near-term only.
9. Be specific. Exact dollar amounts. Exact date ranges. No vague advice.
10. BOOKING PACE: paceVsLY shows % ahead/behind last year's booking pace for each month. Negative = behind. If a unit is 50%+ behind last year's pace for a future month with no competitor signal explaining it — flag as ALARM: conversion problem not pricing problem. Don't just recommend lowering price if the unit has strong reviews.

COMPETITOR DATA NOTE:
- 19 unique Pelican Beach competitors tracked (9 from 1006 comp set + 10 from 707 comp set)
- Unit 48096457 excluded from all analysis
- Competitor prices for booked dates = last seen asking price, actual sale price unknown

OUTPUT FORMAT:
Return a JSON array of recommendations. Each recommendation:
{
  "unit": "1006" or "707" or "both",
  "dateRange": "Apr 10-12",
  "dates": ["2026-04-10", "2026-04-11", "2026-04-12"],
  "priority": "URGENT" | "HIGH" | "MEDIUM" | "WATCH",
  "action": "RAISE" | "LOWER" | "HOLD" | "CHECK_PROFILE",
  "currentPrice": 346,
  "recommendedPrice": 420,
  "reasoning": "detailed explanation with specific data points",
  "competitorContext": "7/9 competitors booked, last seen $380-475",
  "lastYearContext": "Last year: booked at ADR $322 same time",
  "estimatedRevenueDelta": "+$222 for 3 nights if applied",
  "profileNote": null or "Your seasonal profile caps this at $331 — consider updating April_1 season max"
}

Maximum 6 recommendations. Prioritize: URGENT dates first, then HIGH impact revenue opportunities.`;

        const userPrompt = `Analyze these ${topDates.length} weekly periods across both units covering the next 6 months and provide pricing recommendations.

MARKET CONTEXT:
- Unit 1006 occupancy next 30 days: ${listings_data?.['1006']?.occupancy_next_30 || 'N/A'} vs market ${listings_data?.['1006']?.market_occupancy_next_30 || 'N/A'}
- Unit 707 occupancy next 30 days: ${listings_data?.['707']?.occupancy_next_30 || 'N/A'} vs market ${listings_data?.['707']?.market_occupancy_next_30 || 'N/A'}
- PriceLabs recommended base: $${listings_data?.['1006']?.recommended_base_price || 291} (current: $315)

BOOKING PACE VS LAST YEAR (real OwnerRez bookings — nightsBookedByToday = nights booked as of today's date):
${booking_pace?.length ? JSON.stringify(booking_pace.slice(0, 20), null, 2) : 'No booking pace data — load from OwnerRez first'}

PREVIOUS PRICING ACTIONS (what you already pushed — use this to assess if changes worked):
${action_log?.length ? JSON.stringify(action_log, null, 2) : 'No previous actions recorded yet'}

UPLOAD HISTORY: ${upload_history ? JSON.stringify(upload_history) : 'First analysis'}

WEEKLY DATA (each row = one week, both units analyzed separately):
${JSON.stringify(topDates, null, 2)}

INSTRUCTIONS:
1. Cover ALL time periods — April, May, June and beyond. Don't focus only on near-term dates.
2. If previous actions exist — assess whether they worked. If you raised a price X days ago and the date is still unbooked, flag it. If a raise led to a booking, confirm the strategy.
3. Group adjacent weeks with same pattern into one recommendation.
4. Flag URGENT (within 14 days) first.
5. Flag profile-capped dates (profileCapped=true) — these need seasonal profile update not DSO.
6. For empty months with no competitor bookings — tell me if market is soft or if I need to drop price.
7. Maximum 6 recommendations covering the full horizon.
8. Each recommendation must have specific dollar amounts, not vague advice.

Return ONLY a valid JSON array. No prose, no markdown backticks.`;

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [
              { role: 'user', content: userPrompt }
            ],
            system: systemPrompt
          })
        });

        const claudeData = await claudeRes.json();
        const rawText = claudeData.content?.[0]?.text || '[]';

        let recommendations;
        try {
          const clean = rawText.replace(/```json|```/g, '').trim();
          recommendations = JSON.parse(clean);
        } catch(e) {
          recommendations = [];
        }

        return res.status(200).json({
          recommendations,
          actionableDatesCount: actionableDates.length,
          analyzedDates: topDates.length,
          generatedAt: new Date().toISOString()
        });
      }

      // GET /api/pricelabs-proxy?action=bookingpace
      case 'bookingpace': {
        // Fetch all bookings from 2023 (707) / 2024 (1006) to present
        const allItems = await fetchORBookings('2023-01-01');
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Filter: real bookings only, and filter by arrival >= 2023-01-01 
        // (since_utc filters by updated_utc not arrival, so we filter manually)
        const bookings = allItems.filter(b => 
          !b.is_block && 
          b.status === 'active' && 
          b.type === 'booking' &&
          b.arrival >= '2023-01-01'
        );

        // Build per-unit booking history
        const history = { '1006': [], '707': [] };
        for (const b of bookings) {
          const unit = b.property_id === 410894 ? '1006' : '707';
          const nights = Math.ceil((new Date(b.departure) - new Date(b.arrival)) / (1000*60*60*24));
          const grossADR = nights > 0 ? Math.round((b.total_amount || 0) / nights) : 0;
          const netADR = nights > 0 ? Math.round(((b.total_amount || 0) - (b.total_host_fees || 0)) / nights) : 0;
          history[unit].push({
            arrival: b.arrival,
            departure: b.departure,
            bookedDate: b.booked_utc?.split('T')[0],
            nights,
            grossADR,
            netADR,
            totalGross: Math.round(b.total_amount || 0),
            totalNet: Math.round((b.total_amount || 0) - (b.total_host_fees || 0)),
            channel: b.listing_site || 'unknown',
            leadDays: b.booked_utc ? Math.ceil((new Date(b.arrival) - new Date(b.booked_utc)) / (1000*60*60*24)) : null
          });
        }

        // Build booking pace: for each future month, how many nights booked as of today
        // vs same time in prior years
        const pace = {};
        for (const [unit, bkgs] of Object.entries(history)) {
          pace[unit] = {};
          for (const b of bkgs) {
            const arrYear = b.arrival.substring(0, 4);
            const arrMonth = b.arrival.substring(0, 7); // YYYY-MM
            // Was this booking made by today's date in its year?
            // i.e. booked_date month/day <= today month/day
            if (!b.bookedDate) continue;
            const bookedMD = b.bookedDate.substring(5); // MM-DD
            const todayMD = todayStr.substring(5);      // MM-DD
            const bookedByToday = bookedMD <= todayMD;

            if (!pace[unit][arrMonth]) {
              pace[unit][arrMonth] = { year: arrYear, month: arrMonth, nightsBookedByToday: 0, totalNightsBooked: 0, revenue: 0, bookings: 0 };
            }
            pace[unit][arrMonth].totalNightsBooked += b.nights;
            pace[unit][arrMonth].revenue += b.totalGross;
            pace[unit][arrMonth].bookings += 1;
            if (bookedByToday) pace[unit][arrMonth].nightsBookedByToday += b.nights;
          }
        }

        // Build YoY pace comparison for each upcoming month
        const upcoming = [];
        for (let i = 0; i < 9; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
          const monthKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const prevYear = `${d.getFullYear()-1}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const prev2Year = `${d.getFullYear()-2}-${String(d.getMonth()+1).padStart(2,'0')}`;

          for (const unit of ['1006','707']) {
            const curr = pace[unit]?.[monthKey] || { nightsBookedByToday: 0, totalNightsBooked: 0, revenue: 0, bookings: 0 };
            const ly   = pace[unit]?.[prevYear]  || null;
            const ly2  = pace[unit]?.[prev2Year] || null;

            // Skip months with no data at all
            if (!curr.bookings && !ly && !ly2) continue;

            upcoming.push({
              unit,
              month: monthKey,
              current: curr,
              lastYear: ly,
              twoYearsAgo: ly2,
              paceVsLY: ly ? Math.round((curr.nightsBookedByToday / Math.max(ly.nightsBookedByToday, 1) - 1) * 100) : null
            });
          }
        }

        // Channel mix summary
        const channelMix = { '1006': {}, '707': {} };
        for (const [unit, bkgs] of Object.entries(history)) {
          for (const b of bkgs) {
            const ch = b.channel || 'unknown';
            if (!channelMix[unit][ch]) channelMix[unit][ch] = { bookings: 0, revenue: 0, nights: 0 };
            channelMix[unit][ch].bookings++;
            channelMix[unit][ch].revenue += b.totalGross;
            channelMix[unit][ch].nights += b.nights;
          }
        }

        // Lead time by month
        const leadTimes = { '1006': {}, '707': {} };
        for (const [unit, bkgs] of Object.entries(history)) {
          for (const b of bkgs) {
            if (!b.leadDays || !b.arrival) continue;
            const m = b.arrival.substring(0,7);
            if (!leadTimes[unit][m]) leadTimes[unit][m] = [];
            leadTimes[unit][m].push(b.leadDays);
          }
        }
        // Average lead times
        const avgLeadTimes = { '1006': {}, '707': {} };
        for (const [unit, months] of Object.entries(leadTimes)) {
          for (const [m, days] of Object.entries(months)) {
            avgLeadTimes[unit][m] = Math.round(days.reduce((s,v)=>s+v,0)/days.length);
          }
        }

        return res.status(200).json({
          totalBookings: bookings.length,
          history,
          pace: upcoming,
          channelMix,
          avgLeadTimes,
          fetchedAt: new Date().toISOString()
        });
      }

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err) {
    console.error('PriceIQ proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
