import fs from "node:fs";
import path from "node:path";
import { cleanInternalLinksInHtml, cleanInternalUrl } from "../lib/internal-links.js";

const root = process.cwd();
const issues = [];
const legacyPath = /\/(?:aboutus-|about-me-|aboutme-|privacy-|pelican-beach-resort-unit-\d+-orp|pelican-beach-resort-destin-|-pelican-beach-resort-condo-rental-|destin-vacation-itinerary-planner-|ai-concierge-|virtualtour-|destin-condo-guide-|properties(?:[/?#]|$)|destin-hub\.html|destin-tripshock\.html|destin-car-rental\.html|concierge(?:[/?#]|$))/i;
const legacyHost = /https?:\/\/(?:www\.)?destincondogetaways\.com\/(?!$)|https?:\/\/(?:deals|explore|offer|sunbirds)\.destincondogetaways\.com/i;

const cases = new Map([
  ["/pelican-beach-resort-unit-707-orp5b47b5ax?or_arrival=2026-09-10#availability", "/condos/unit-707?or_arrival=2026-09-10#availability"],
  ["/destin-hub.html", "/destin-hub"],
  ["/concierge?pageSource=beaches", "/destin-ai-concierge?pageSource=beaches"],
  ["https://www.destincondogetaways.com/pelican-beach-resort-destin-574048693", "/resort"],
  ["https://explore.destincondogetaways.com/destin-tripshock.html?aff=destindreamcondo", "/activities?aff=destindreamcondo"],
]);

for (const [input, expected] of cases) {
  const actual = cleanInternalUrl(input);
  if (actual !== expected) issues.push(`Normalizer returned ${actual} for ${input}; expected ${expected}.`);
}

const blogDataRoot = path.join(root, "data", "blog");
for (const name of fs.readdirSync(blogDataRoot).filter((item) => item.endsWith(".json"))) {
  const article = JSON.parse(fs.readFileSync(path.join(blogDataRoot, name), "utf8"));
  const rendered = cleanInternalLinksInHtml(article.html || "");
  for (const match of rendered.matchAll(/href=(['"])(.*?)\1/gi)) {
    const href = match[2];
    if (legacyPath.test(href)) issues.push(`${name}: rendered link still uses legacy path ${href}`);
    if (legacyHost.test(href)) issues.push(`${name}: rendered link still uses a retired/self-host URL ${href}`);
  }
}

const sharedHeader = fs.readFileSync(path.join(root, "components", "SiteHeader.js"), "utf8");
const sharedFooter = fs.readFileSync(path.join(root, "components", "SiteFooter.js"), "utf8");
for (const [label, route] of [
  ["condo collection", "/destin-vacation-rentals-by-owner"],
  ["availability", "/availability"],
  ["resort", "/resort"],
  ["blog hub", "/blog"],
  ["AI concierge", "/destin-ai-concierge"],
]) {
  if (!sharedHeader.includes(route) && !sharedFooter.includes(route)) issues.push(`Shared navigation is missing ${label}: ${route}`);
}
for (const route of ["/condos/unit-707", "/condos/unit-1006", "/gallery", "/virtual-tours", "/reviews", "/trip-planner", "/activities", "/car-rentals", "/deals", "/faq", "/about", "/privacy"]) {
  if (!sharedFooter.includes(route)) issues.push(`Shared footer is missing final route ${route}`);
}

if (issues.length) {
  console.error(`Internal-link routing audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("Internal-link routing audit passed.");
console.log("- Migrated blog HTML resolves directly to final clean routes");
console.log("- Booking query strings and fragments survive legacy-route cleanup");
console.log("- Shared navigation covers booking, lodging, planning and trust paths");
