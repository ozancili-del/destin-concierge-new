import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { legacyRedirects } = require("../config/legacy-redirects.js");

const issues = [];
const robots = fs.readFileSync("pages/robots.txt.js", "utf8");
const sitemapSource = fs.readFileSync("pages/sitemap.xml.js", "utf8");
const nextConfig = fs.readFileSync("next.config.js", "utf8");
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

const canonicalSitemap = "https://www.destincondogetaways.com/sitemap.xml";
if (!robots.includes('const SITE = "https://www.destincondogetaways.com"') || !robots.includes('`Sitemap: ${SITE}/sitemap.xml`')) {
  issues.push("robots.txt does not advertise the canonical production sitemap");
}
if (/https:\/\/(?:deals|explore|offer|sunbirds|guestview)\.destincondogetaways\.com/.test(`${robots}\n${sitemapSource}`)) {
  issues.push("legacy subdomain URL remains in sitemap surfaces");
}
if (!/NEXT_PUBLIC_DEPLOYMENT_ENV:\s*process\.env\.VERCEL_ENV/.test(nextConfig)) issues.push("deployment environment is not exposed for robots switching");
if (!/process\.env\.VERCEL_ENV\s*===\s*["']production["']/.test(robots)) issues.push("robots route does not block non-production deployments");
if (!legacyRedirects.some((rule) => rule.source === "/sitemap-vercel.xml" && rule.destination === "/sitemap.xml" && rule.permanent)) {
  issues.push("legacy sitemap URL does not permanently redirect to /sitemap.xml");
}

const routeMatches = [...sitemapSource.matchAll(/"(\/(?:[^" ]*)?)"/g)].map((match) => match[1]);
const routes = new Set(routeMatches);
if (routeMatches.length !== routes.size) issues.push("canonical sitemap contains duplicate routes");
for (const required of ["/", "/availability", "/pelican-beach-resort-destin", "/pelican-beach-resort-unit-707", "/pelican-beach-resort-unit-1006", "/destin-condo-rental-reviews", "/blog", "/destin-condo-deals", "/destin-snowbird-rentals", "/destin-condo-special-offers"]) {
  if (!routes.has(required)) issues.push(`canonical sitemap is missing ${required}`);
}
if (routes.has("/book")) issues.push("transactional /book route must not be in the indexable sitemap");
for (const route of routes) {
  if (route.includes("?") || route.includes("#")) issues.push(`canonical sitemap contains parameterized route ${route}`);
  if (/\.(?:html?|xml)$/.test(route)) issues.push(`canonical sitemap contains a legacy file-style route ${route}`);
  if (/^\/(?:api|guestview|ozan|tv)(?:\/|$)/.test(route)) issues.push(`canonical sitemap contains private or utility route ${route}`);
}

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
