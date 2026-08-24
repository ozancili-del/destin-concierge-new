import { createClient } from "@supabase/supabase-js";
import { allowSameOriginRequest, enforceRateLimit } from '../../lib/public-api-security.js';

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ['GET'] })) return;
  if (!enforceRateLimit(req, res, { scope: 'availability', limit: 60, windowMs: 10 * 60 * 1000 })) return;

  const { unit } = req.query;
  if (!unit || !["707", "1006"].includes(unit)) {
    return res.status(400).json({ error: "Invalid unit" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL;
  const serviceKey = process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ error: "Availability is temporarily unavailable" });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = today.toISOString().split("T")[0];
  const end = new Date(today.getTime() + 365 * 86400000).toISOString().split("T")[0];

  // Get latest captured_date first
  const { data: latest, error: latestError } = await supabase
    .from("price_snapshots")
    .select("captured_date")
    .eq("unit_id", unit)
    .order("captured_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError || !latest?.captured_date) {
    console.error("Availability snapshot lookup failed", latestError?.message || "No snapshot found");
    return res.status(503).json({ error: "Live dates could not be verified" });
  }

  const { data: rows, error: rowsError } = await supabase
    .from("price_snapshots")
    .select("date, demand_desc, price, min_stay")
    .eq("unit_id", unit)
    .eq("captured_date", latest.captured_date)
    .gte("date", start)
    .lte("date", end);

  if (rowsError || !rows?.length) {
    console.error("Availability snapshot rows failed", rowsError?.message || "No covered dates found");
    return res.status(503).json({ error: "Live dates could not be verified" });
  }

  const booked = (rows || [])
    .filter(r => /unavailable|booked|reserved/i.test(r.demand_desc || ""))
    .map(r => r.date);

  // Preserve the established adjusted-average display formula. Its business
  // rationale is being traced separately before any future change.
  const rates = {};
  const minStays = {};
  (rows || []).forEach(r => {
    if (r.price && !/unavailable|booked|reserved/i.test(r.demand_desc || "")) {
      // Match the active OwnerRez "My Website" pricing rules:
      // 12.5% Destiny Blue rent discount, then the $25/night management fee.
      // Do not simplify this to the raw PriceLabs rate without reconciling
      // both OwnerRez rules and the secure-checkout total.
      rates[r.date] = Math.round(Number(r.price) * 0.875 + 25);
      minStays[r.date] = Math.max(1, Number(r.min_stay) || 1);
    }
  });

  const covered = rows.map(r => r.date);
  const capturedAt = latest.captured_date;
  const ageDays = Math.floor((Date.now() - new Date(`${capturedAt}T12:00:00Z`).getTime()) / 86400000);
  if (!Number.isFinite(ageDays) || ageDays > 2) {
    console.error(`Availability snapshot is stale for unit ${unit}: ${capturedAt}`);
    return res.status(503).json({ error: "Live dates are refreshing; please try again shortly" });
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({ status: "ok", booked, rates, minStays, covered, capturedAt });
}
