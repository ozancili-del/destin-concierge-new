const SITE = "https://www.destincondogetaways.com";

export default function Robots() { return null; }

export async function getServerSideProps({ res }) {
  const isProduction = process.env.VERCEL_ENV === "production";
  const body = isProduction
    ? [
        "User-agent: *",
        "Allow: /",
        "Disallow: /api/",
        "Disallow: /book",
        "Disallow: /guestview/",
        "Disallow: /ozan",
        "Disallow: /tv/",
        "",
        `Sitemap: ${SITE}/sitemap.xml`,
        "",
      ].join("\n")
    : "User-agent: *\nDisallow: /\n";

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.write(body);
  res.end();
  return { props: {} };
}
