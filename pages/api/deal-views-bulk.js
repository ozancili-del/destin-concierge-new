// pages/api/deal-views-bulk.js
// Returns 72h view counts for all current deals in one request
// Called client-side on every page load for always-fresh counts

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { deals } = req.body;
  if (!deals?.length) return res.status(200).json({ viewCounts: {} });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
    process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
  );

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await supabase
    .from("deal_view_events")
    .select("unit, arrival, departure")
    .gte("viewed_at", cutoff)
    .in("unit", ["707", "1006"]);

  const viewCounts = {};
  for (const row of (rows || [])) {
    const key = `${row.unit}::${row.arrival}::${row.departure}`;
    viewCounts[key] = (viewCounts[key] || 0) + 1;
  }

  return res.status(200).json({ viewCounts });
}
