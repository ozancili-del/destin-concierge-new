// pages/api/deal-view.js
// Tracks a view event and returns the 72-hour view count for that deal

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { unit, arrival, departure } = req.body;
  if (!unit || !arrival || !departure) {
    return res.status(400).json({ error: "unit, arrival, departure required" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
    process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
  );

  // Insert view event
  await supabase.from("deal_view_events").insert({
    unit,
    arrival,
    departure,
  });

  // Count views in last 72 hours
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("deal_view_events")
    .select("*", { count: "exact", head: true })
    .eq("unit", unit)
    .eq("arrival", arrival)
    .eq("departure", departure)
    .gte("viewed_at", cutoff);

  return res.status(200).json({ views: count || 1 });
}
