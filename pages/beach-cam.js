import fs from "node:fs";
import path from "node:path";
import MigratedBlogArticle from "../components/MigratedBlogArticle";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/beach-cam`;

export default function BeachCam({ articleHtml, structuredData }) {
  return <MigratedBlogArticle
    pageTitle="Destin Beach Cams Live | Gulf Views, Crab Island & Miramar Beach"
    description="Watch live Destin beach cams from Pelican Beach Resort, Crab Island, Okaloosa Island, Sterling Sands and Miramar Beach, plus Gulf conditions and beach safety guidance."
    structuredData={structuredData}
    heroImage="/beaches-pelican-balcony.jpg"
    heroAlt="Live Gulf view from Pelican Beach Resort in Destin Florida"
    kicker="Five live Emerald Coast views"
    title="Destin Live Beach Cams"
    intro="Check the Gulf, beach activity, water color and surf from Pelican Beach Resort through Miramar Beach before you head out."
    articleHtml={articleHtml}
    related={[
      { label: "Conditions", title: "Destin weather and Gulf temperature", href: "/blog/destinweather" },
      { label: "Beaches", title: "Best beaches in Destin", href: "/blog/best-beaches-destin" },
      { label: "Events", title: "Destin events calendar", href: "/blog/destin-events-2026" },
      { label: "Resort", title: "Pelican Beach Resort guide", href: "/resort" },
    ]}
  />;
}

export function getStaticProps() {
  const sourcePath = path.join(process.cwd(), "data", "beach-cam-source.html");
  const source = fs.readFileSync(sourcePath, "utf8");
  const schemas = [];
  const schemaPattern = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = schemaPattern.exec(source))) {
    try { schemas.push(JSON.parse(match[1])); } catch (_) {}
  }
  const graph = schemas.flatMap((schema) => schema["@graph"] || [schema]).map((node) => {
    if (node?.["@type"] === "WebPage") return { ...node, "@id": `${canonical}#webpage`, url: canonical };
    if (node?.["@type"] === "Article") return { ...node, mainEntityOfPage: canonical };
    return node;
  });
  const structuredData = { "@context": "https://schema.org", "@graph": graph };
  const articleHtml = source
    .replace(schemaPattern, "")
    .replace(/<meta[^>]*>/gi, "")
    .replaceAll("https://www.destincondogetaways.com/destin-live-beach-cam-574002656", "/beach-cam")
    .replaceAll("https://www.destincondogetaways.com/blog/destinweather", "/blog/destinweather")
    .replaceAll("https://www.destincondogetaways.com/blog/best-beaches-destin", "/blog/best-beaches-destin")
    .replaceAll("https://www.destincondogetaways.com/blog/destin-events-2026", "/blog/destin-events-2026")
    .replaceAll("https://www.destincondogetaways.com/pelican-beach-resort-destin-574048693", "/resort");
  return { props: { articleHtml, structuredData } };
}
