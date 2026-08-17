const SITE = "https://www.destincondogetaways.com";

const ROUTES = [
  "/", "/availability", "/destin-vacation-rentals-by-owner", "/resort",
  "/condos/unit-707", "/condos/unit-1006", "/reviews", "/gallery",
  "/virtual-tours", "/trip-planner", "/destin-ai-concierge", "/guest-guide",
  "/faq", "/map", "/about", "/privacy", "/why-book-direct", "/beach-cam",
  "/blog", "/destin-hub", "/deals", "/snowbird", "/offer", "/car-rentals",
  "/activities", "/blog/best-beaches-destin", "/blog/best-restaurants-destin",
  "/blog/best-restaurants-destin-local-guide", "/blog/best-time-to-visit-destin-florida",
  "/blog/destin-events-2026", "/blog/destin-fireworks-2026",
  "/blog/destin-florida-vacation-guide-2026", "/blog/destin-live-music-2026",
  "/blog/destinairport", "/blog/destincar", "/blog/destindiversehistory",
  "/blog/destinessentials", "/blog/destinexplore", "/blog/destinkids",
  "/blog/destinnights", "/blog/destinocen", "/blog/destinromance",
  "/blog/destinspa", "/blog/destinsupermarkets", "/blog/destinweather",
  "/blog/how-to-find-cheaper-flights-and-car-rentals",
];

export default function Sitemap() { return null; }

export async function getServerSideProps({ res }) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map((route) => `  <url><loc>${SITE}${route}</loc></url>`).join("\n")}
</urlset>`;
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();
  return { props: {} };
}
