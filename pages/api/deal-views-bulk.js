// pages/api/deal-views-bulk.js
// Returns 72h view counts for all current deals in one request
// Called client-side on every page load for always-fresh counts

import { createClient } from "@supabase/supabase-js";
import { allowSameOriginRequest, enforceJsonSize, enforceRateLimit } from "../../lib/public-api-security.js";

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
  if (!enforceJsonSize(req, res, 12_000)) return;
  if (!enforceRateLimit(req, res, { scope: "deal-views-bulk", limit: 30, windowMs: 600_000 })) return;

  const { deals } = req.body;
  if (!deals?.length) return res.status(200).json({ viewCounts: {} });
  if (!Array.isArray(deals) || deals.length > 50) return res.status(400).json({ error: "Invalid deals request" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
    process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
  );

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("deal_view_events")
    .select("unit, arrival, departure")
    .gte("viewed_at", cutoff)
    .in("unit", ["707", "1006"]);
  if (error) return res.status(503).json({ error: "View counts are temporarily unavailable" });

  const viewCounts = {};
  for (const row of (rows || [])) {
    const key = `${row.unit}::${row.arrival}::${row.departure}`;
    viewCounts[key] = (viewCounts[key] || 0) + 1;
  }

  return res.status(200).json({ viewCounts });
}
