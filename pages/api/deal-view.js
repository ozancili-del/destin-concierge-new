// pages/api/deal-view.js
// Tracks a view event and returns the 72-hour view count for that deal

import { createClient } from "@supabase/supabase-js";
import { allowSameOriginRequest, cleanText, enforceJsonSize, enforceRateLimit, parseIsoDate } from "../../lib/public-api-security.js";

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
  if (!enforceJsonSize(req, res, 2_000)) return;
  if (!enforceRateLimit(req, res, { scope: "deal-view", limit: 30, windowMs: 600_000 })) return;

  const unit = cleanText(req.body?.unit, 4);
  const arrival = cleanText(req.body?.arrival, 10);
  const departure = cleanText(req.body?.departure, 10);
  if (!["707", "1006"].includes(unit) || !parseIsoDate(arrival) || !parseIsoDate(departure)) {
    return res.status(400).json({ error: "unit, arrival, departure required" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
    process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
  );

  // Insert view event
  const { error: insertError } = await supabase.from("deal_view_events").insert({
    unit,
    arrival,
    departure,
  });
  if (insertError) return res.status(503).json({ error: "View tracking is temporarily unavailable" });

  // Count views in last 72 hours
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("deal_view_events")
    .select("*", { count: "exact", head: true })
    .eq("unit", unit)
    .eq("arrival", arrival)
    .eq("departure", departure)
    .gte("viewed_at", cutoff);
  if (countError) return res.status(503).json({ error: "View tracking is temporarily unavailable" });

  return res.status(200).json({ views: count || 1 });
}
