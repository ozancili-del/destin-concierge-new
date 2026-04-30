// pages/api/deal-view.js
// Increments view count for a specific deal (unit + arrival + departure)
// Called client-side when a deal card mounts in beach-deals.js

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

  // Upsert — insert if new, increment if exists
  const { data, error } = await supabase.rpc("increment_deal_view", {
    p_unit:      unit,
    p_arrival:   arrival,
    p_departure: departure,
  });

  if (error) {
    console.error("[deal-view]", error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ views: data });
}
