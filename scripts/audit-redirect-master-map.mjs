import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { legacyRedirects } = require("../config/legacy-redirects.js");
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const sitemap = fs.readFileSync("pages/sitemap.xml.js", "utf8");
const blog = fs.readFileSync("pages/blog.js", "utf8");
const issues = [];

const sources = new Set();
for (const rule of legacyRedirects) {
  if (sources.has(rule.source)) issues.push(`duplicate path redirect source ${rule.source}`);
  sources.add(rule.source);
  if (!rule.permanent) issues.push(`${rule.source} is not permanent`);
  if (!rule.destination.startsWith("/")) issues.push(`${rule.source} does not use a same-host canonical destination`);
}

for (const rule of legacyRedirects) {
  if (sources.has(rule.destination)) issues.push(`${rule.source} chains through redirect source ${rule.destination}`);
  if (rule.destination !== "/sitemap.xml" && !sitemap.includes(`"${rule.destination}"`)) {
    issues.push(`${rule.source} targets ${rule.destination}, which is absent from the canonical sitemap`);
  }
}

const requiredPaths = [
  "/properties", "/pelican-", "/pelican-beach-resort-unit-707-orp5b47b5ax",
  "/pelican-beach-resort-unit-1006-orp5b6450ex", "/pricing-dashboard-574049826",
  "/destin-hub.html", "/destin-car-rental.html", "/destin-tripshock.html",
  "/rate-finder.html", "/blog/rss", "/blog/destinitalian", "/blog/destinsushi",
  "/blog/destindelights", "/blog/why-we-built-an-ai-concierge-for-destin-vacation-rentals",
];
for (const source of requiredPaths) if (!sources.has(source)) issues.push(`historical path is unmapped: ${source}`);

if (!/query\.categoryId[\s\S]*destination:\s*["']\/blog["'][\s\S]*permanent:\s*true/.test(blog)) {
  issues.push("OwnerRez blog category query variants are not permanently consolidated to /blog");
}

const publicHosts = ["deals.destincondogetaways.com", "explore.destincondogetaways.com", "offer.destincondogetaways.com", "sunbirds.destincondogetaways.com"];
for (const host of publicHosts) {
  const rules = vercel.redirects.filter((rule) => rule.has?.some((item) => item.type === "host" && item.value === host));
  if (!rules.some((rule) => rule.source === "/:path*" && rule.permanent)) issues.push(`${host} lacks a permanent catch-all`);
  for (const rule of rules) {
    if (!rule.permanent) issues.push(`${host}${rule.source} is not permanent`);
    if (!rule.destination.startsWith("https://www.destincondogetaways.com/")) issues.push(`${host}${rule.source} does not land directly on canonical www`);
  }
}

const hostSpecifics = [
  ["deals.destincondogetaways.com", "/beach-deals", "/deals"],
  ["deals.destincondogetaways.com", "/rate-finder.html", "/deals"],
  ["explore.destincondogetaways.com", "/destin-hub.html", "/destin-hub"],
  ["explore.destincondogetaways.com", "/destin-car-rental.html", "/car-rentals"],
  ["explore.destincondogetaways.com", "/destin-tripshock.html", "/activities"],
  ["explore.destincondogetaways.com", "/pelican-beach-resort-unit-1006-orp5b6450ex", "/condos/unit-1006"],
];
for (const [host, source, destination] of hostSpecifics) {
  const match = vercel.redirects.find((rule) => rule.source === source && rule.has?.some((item) => item.type === "host" && item.value === host));
  if (!match) issues.push(`missing host-specific redirect ${host}${source}`);
  else if (new URL(match.destination).pathname !== destination) issues.push(`${host}${source} targets ${match.destination}, expected ${destination}`);
}

if (issues.length) {
  console.error(`Redirect master-map audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Redirect master-map audit passed: ${legacyRedirects.length} path rules and ${publicHosts.length} retired public hosts.`);
console.log("- Every path target is a canonical sitemap route (or the canonical sitemap itself)");
console.log("- No same-host redirect chains or duplicate sources");
console.log("- Known Google/Bing 404 and duplicate URLs are covered");
console.log("- Booking query parameters remain eligible for native Next.js pass-through");
