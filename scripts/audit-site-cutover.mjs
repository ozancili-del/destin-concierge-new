import fs from "node:fs";

const issues = [];
const robots = fs.readFileSync("public/robots.txt", "utf8");
const sitemapIndex = fs.readFileSync("public/sitemap.xml", "utf8");
const sitemapSource = fs.readFileSync("pages/sitemap-vercel.xml.js", "utf8");
const nextConfig = fs.readFileSync("next.config.js", "utf8");
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

const canonicalSitemap = "https://www.destincondogetaways.com/sitemap-vercel.xml";
if (!robots.includes(`Sitemap: ${canonicalSitemap}`)) issues.push("robots.txt does not advertise the canonical production sitemap");
if (!sitemapIndex.includes(`<loc>${canonicalSitemap}</loc>`)) issues.push("sitemap.xml does not point to the canonical sitemap");
if (/https:\/\/(?:deals|explore|offer|sunbirds|guestview)\.destincondogetaways\.com/.test(`${robots}\n${sitemapIndex}\n${sitemapSource}`)) {
  issues.push("legacy subdomain URL remains in sitemap surfaces");
}
if (!/NEXT_PUBLIC_DEPLOYMENT_ENV:\s*process\.env\.VERCEL_ENV/.test(nextConfig)) issues.push("deployment environment is not exposed for robots switching");

const routeMatches = [...sitemapSource.matchAll(/"(\/(?:[^" ]*)?)"/g)].map((match) => match[1]);
const routes = new Set(routeMatches);
for (const required of ["/", "/availability", "/resort", "/condos/unit-707", "/condos/unit-1006", "/reviews", "/blog", "/deals"]) {
  if (!routes.has(required)) issues.push(`canonical sitemap is missing ${required}`);
}
if (routes.has("/book")) issues.push("transactional /book route must not be in the indexable sitemap");

for (const host of ["deals.destincondogetaways.com", "explore.destincondogetaways.com", "offer.destincondogetaways.com", "sunbirds.destincondogetaways.com"]) {
  const hostRedirects = vercel.redirects.filter((rule) => rule.has?.some((condition) => condition.type === "host" && condition.value === host));
  if (!hostRedirects.length) issues.push(`${host} has no migration redirect`);
  for (const rule of hostRedirects) {
    if (!rule.permanent) issues.push(`${host}${rule.source} is not a permanent redirect`);
    if (!rule.destination.startsWith("https://www.destincondogetaways.com/")) issues.push(`${host}${rule.source} does not redirect directly to the canonical www host`);
  }
}

const sourceFiles = [
  ...fs.readdirSync("pages", { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".js")).map((entry) => `pages/${entry.name}`),
  ...fs.readdirSync("pages/blog", { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".js")).map((entry) => `pages/blog/${entry.name}`),
  "components/MigratedBlogArticle.js",
  "components/UnitPage.js",
];
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  if (/content="noindex,nofollow"/.test(source)) issues.push(`${file} has an unconditional noindex,nofollow directive`);
}

if (issues.length) {
  console.error(`Cutover audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Cutover audit passed: ${routes.size} canonical routes, canonical sitemap discovery, preview protection, and no legacy sitemap hosts.`);
