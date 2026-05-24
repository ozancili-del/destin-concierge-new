import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { unit } = req.query;
  if (!unit || !["707", "1006"].includes(unit)) {
    return res.status(400).json({ error: "Invalid unit" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL,
    process.env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY
  );

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = today.toISOString().split("T")[0];
  const end = new Date(today.getTime() + 365 * 86400000).toISOString().split("T")[0];

  // Get latest captured_date first
  const { data: latest } = await supabase
    .from("price_snapshots")
    .select("captured_date")
    .eq("unit_id", unit)
    .order("captured_date", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return res.status(200).json({ booked: [] });

  const { data: rows } = await supabase
    .from("price_snapshots")
    .select("date, demand_desc, price")
    .eq("unit_id", unit)
    .eq("captured_date", latest.captured_date)
    .gte("date", start)
    .lte("date", end);

  const booked = (rows || [])
    .filter(r => /unavailable|booked|reserved/i.test(r.demand_desc || ""))
    .map(r => r.date);

  // Build per-day rates using adjustedAvg formula: round(price * 0.875 + 25)
  const rates = {};
  (rows || []).forEach(r => {
    if (r.price && !/unavailable|booked|reserved/i.test(r.demand_desc || "")) {
      rates[r.date] = Math.round(r.price * 0.875 + 25);
    }
  });

  return res.status(200).json({ booked, rates });
}
