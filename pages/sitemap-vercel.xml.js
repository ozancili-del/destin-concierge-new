// pages/sitemap-vercel.xml.js
// Serves at: destincondogetaways.com/sitemap-vercel.xml
// Submit this URL in Google Search Console as a second sitemap

export default function Sitemap() { return null; }

export async function getServerSideProps({ res }) {
  const baseUrl  = "https://www.destincondogetaways.com";
  const today    = new Date().toISOString().split("T")[0];

  const pages = [
    { url: "/beach-deals",      changefreq: "daily",   priority: "0.9" },
    { url: "/ai-concierge",     changefreq: "monthly",  priority: "0.7" },
    { url: "/destin-hub",       changefreq: "monthly",  priority: "0.7" },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${baseUrl}${p.url}</loc>
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
