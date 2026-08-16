// pages/sitemap-vercel.xml.js
// Migration sitemap for the clean production routes.
export default function Sitemap() { return null; }
export async function getServerSideProps({ res }) {
  const today = new Date().toISOString().split("T")[0];
  const pages = [
    { url: "https://www.destincondogetaways.com/deals",       changefreq: "daily",   priority: "0.9" },
    { url: "https://www.destincondogetaways.com/snowbird",    changefreq: "weekly",  priority: "0.8" },
    { url: "https://www.destincondogetaways.com/destin-hub",  changefreq: "weekly",  priority: "0.8" },
    { url: "https://www.destincondogetaways.com/offer",       changefreq: "monthly", priority: "0.7" },
    { url: "https://www.destincondogetaways.com/car-rentals", changefreq: "monthly", priority: "0.6" },
    { url: "https://www.destincondogetaways.com/activities",  changefreq: "monthly", priority: "0.6" },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate");
  res.write(xml);
  res.end();
  return { props: {} };
}
