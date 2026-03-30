// pages/api/pricelabs-proxy.js
// Handles all PriceLabs API calls server-side to keep API key secure
// Also handles Claude analysis calls

const PRICELABS_API_KEY = process.env.PRICELABS_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PL_BASE = 'https://api.pricelabs.co/v1';

const LISTINGS = {
  '1006': { id: '410894', pms: 'ownerrez', name: 'Unit 1006' },
  '707':  { id: '293722', pms: 'ownerrez', name: 'Unit 707'  },
};

// Competitors to EXCLUDE
const EXCLUDED_COMPETITORS = new Set(['48096457']);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
        const { prices_1006, prices_707, competitors, listings_data, upload_history, action_log } = req.body;

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

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err) {
    console.error('PriceIQ proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
