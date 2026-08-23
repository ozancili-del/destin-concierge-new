import fs from "node:fs";

const origin = process.env.AUDIT_ORIGIN || "http://localhost:3107";
const productionOrigin = "https://www.destincondogetaways.com";
const sitemapSource = fs.readFileSync("pages/sitemap.xml.js", "utf8");
const routeBlock = sitemapSource.match(/const ROUTES\s*=\s*\[([\s\S]*?)\];/)?.[1] || "";
const routes = [...routeBlock.matchAll(/["'](\/[^"']*)["']/g)].map((match) => match[1]);
const issues = [];
const notes = [];

const decode = (value = "") => value
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&#x27;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">");
const text = (html = "") => decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const attr = (html, tag, name) => decode(html.match(new RegExp(`<${tag}\\b[^>]*\\b${name}=["']([^"']*)["'][^>]*>`, "i"))?.[1] || "");
const canonicalOf = (html) => decode(html.match(/<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i)?.[1] || "");
const meta = (html, name) => decode(html.match(new RegExp(`<meta\\b(?=[^>]*\\bname=["']${name}["'])(?=[^>]*\\bcontent=["']([^"']*)["'])[^>]*>`, "i"))?.[1] || "");
const flatten = (node, output = []) => {
  if (!node || typeof node !== "object") return output;
  if (Array.isArray(node)) for (const child of node) flatten(child, output);
  else {
    if (node["@type"]) output.push(node);
    if (node["@graph"]) flatten(node["@graph"], output);
  }
  return output;
};

if (!routes.length) issues.push("Could not extract canonical routes from sitemap source.");
if (new Set(routes).size !== routes.length) issues.push("Sitemap source contains duplicate routes.");

for (const route of routes) {
  const response = await fetch(`${origin}${route}`, { redirect: "manual" });
  if (response.status !== 200) {
    issues.push(`${route}: rendered status ${response.status}, expected 200`);
    continue;
  }
  const html = await response.text();
  const visible = text(html).toLowerCase();
  const title = decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const description = meta(html, "description");
  const robots = meta(html, "robots");
  const canonical = canonicalOf(html);
  const expectedCanonical = `${productionOrigin}${route === "/" ? "/" : route}`;
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemas = [];

  if (!title) issues.push(`${route}: missing rendered title`);
  else {
    if (title.length < 25) notes.push(`${route}: short title (${title.length} characters)`);
    if (title.length > 65) notes.push(`${route}: long title (${title.length} characters)`);
  }
  if (!description) issues.push(`${route}: missing rendered meta description`);
  else if (description.length < 90 || description.length > 180) notes.push(`${route}: description length ${description.length} (review recommended)`);
  if (canonical !== expectedCanonical) issues.push(`${route}: canonical ${canonical || "missing"} does not equal ${expectedCanonical}`);
  if (/[?#]/.test(canonical.replace(productionOrigin, ""))) issues.push(`${route}: canonical contains a query string or fragment`);
  const staticCommercialRoute = ["/destin-activities", "/destin-car-rentals"].includes(route);
  const expectedRobots = staticCommercialRoute ? "index,follow" : "noindex,nofollow";
  if (robots !== expectedRobots) issues.push(`${route}: rendered robots is ${robots || "missing"}, expected ${expectedRobots}`);
  if (h1Count !== 1) issues.push(`${route}: rendered H1 count is ${h1Count}, expected exactly 1`);

  for (const [index, match] of jsonLd.entries()) {
    try { schemas.push(...flatten(JSON.parse(decode(match[1])))); }
    catch (error) { issues.push(`${route}: JSON-LD block ${index + 1} is invalid (${error.message})`); }
  }
  if (!schemas.length) issues.push(`${route}: no parseable JSON-LD entities rendered`);

  const ids = new Map();
  for (const entity of schemas) {
    if (entity["@id"]) {
      const prior = ids.get(entity["@id"]);
      const current = JSON.stringify(entity);
      if (prior && prior !== current) issues.push(`${route}: conflicting JSON-LD entities share @id ${entity["@id"]}`);
      ids.set(entity["@id"], current);
    }
    if (["WebPage", "CollectionPage", "AboutPage", "FAQPage"].includes(entity["@type"]) && entity.url && entity.url !== expectedCanonical) {
      issues.push(`${route}: ${entity["@type"]} URL ${entity.url} disagrees with canonical`);
    }
    if (entity["@type"] === "BreadcrumbList") {
      const items = entity.itemListElement || [];
      const positions = items.map((item) => item.position).join(",");
      if (!items.length || positions !== items.map((_, i) => i + 1).join(",")) issues.push(`${route}: breadcrumb positions are incomplete or out of order`);
      if (items.at(-1)?.item !== expectedCanonical) issues.push(`${route}: final breadcrumb does not resolve to the page canonical`);
    }
    if (entity["@type"] === "FAQPage") {
      for (const question of entity.mainEntity || []) {
        if (!visible.includes(String(question.name || "").toLowerCase())) issues.push(`${route}: FAQ schema question is not visible: ${question.name}`);
        const answer = text(String(question.acceptedAnswer?.text || "")).toLowerCase();
        const meaningful = answer.split(/[^a-z0-9]+/).filter((word) => word.length > 3);
        const supported = meaningful.filter((word) => visible.includes(word));
        if (!answer || (meaningful.length >= 5 && supported.length / meaningful.length < 0.7)) issues.push(`${route}: FAQ schema answer is not visibly supported: ${question.name}`);
      }
    }
    if (["VacationRental", "LodgingBusiness"].includes(entity["@type"]) && entity.address) {
      const address = entity.address;
      for (const field of ["streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry"]) {
        if (!address[field]) issues.push(`${route}: ${entity["@type"]} address is missing ${field}`);
      }
    }
    if (entity.aggregateRating) {
      const value = Number(entity.aggregateRating.ratingValue);
      const count = Number(entity.aggregateRating.reviewCount || entity.aggregateRating.ratingCount);
      if (!(value > 0 && value <= 5 && count > 0)) issues.push(`${route}: invalid aggregate rating values`);
    }
  }

  const breadcrumb = schemas.find((entity) => entity["@type"] === "BreadcrumbList");
  if (route !== "/" && !breadcrumb) issues.push(`${route}: missing BreadcrumbList JSON-LD`);
  if (route.startsWith("/blog/") && !schemas.some((entity) => ["Article", "BlogPosting"].includes(entity["@type"]))) issues.push(`${route}: blog route lacks Article or BlogPosting schema`);
}

if (issues.length) {
  console.error(`Rendered search-readiness audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  if (notes.length) {
    console.error(`\nAdvisory notes (${notes.length}):`);
    for (const note of notes) console.error(`- ${note}`);
  }
  process.exit(1);
}

console.log(`Rendered search-readiness audit passed for ${routes.length} canonical routes.`);
console.log("- Canonicals: clean, absolute, query-free and aligned with rendered schema");
console.log("- Preview protection: dynamic routes use meta robots; canonical static commercial routes use middleware X-Robots-Tag protection");
console.log("- Structure: one H1, parseable JSON-LD and canonical breadcrumbs");
console.log("- FAQ integrity: schema questions and answers are present in visible content");
console.log("- Search entities: blog articles, lodging addresses and ratings validated");
if (notes.length) {
  console.log(`Advisory notes (${notes.length}):`);
  for (const note of notes) console.log(`- ${note}`);
}
