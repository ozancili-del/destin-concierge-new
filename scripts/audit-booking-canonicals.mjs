import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const issues = [];
const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) issues.push(message);
};
const forbidMatch = (source, pattern, message) => {
  if (pattern.test(source)) issues.push(message);
};

const bookingKeys = ["or_arrival", "or_departure", "or_adults", "or_children", "or_guests"];
const unitPage = read("components/UnitPage.js");
const availability = read("pages/availability.js");
const availabilitySearch = read("components/AvailabilitySearch.js");
const homepage = read("pages/index.js");
const book = read("pages/book.js");
const sitemap = read("pages/sitemap.xml.js");
const sitemapRouteBlock = sitemap.match(/const ROUTES\s*=\s*\[([\s\S]*?)\];/)?.[1] || "";

// Unit pages may receive booking parameters, but their indexable identity must
// always remain the clean, stable unit URL for Google and Bing.
requireMatch(unitPage, /const canonical = `\$\{liveSite\}\/pelican-beach-resort-unit-\$\{unit\.number\}`;/, "Unit canonical is not built from the clean unit route.");
requireMatch(unitPage, /<link rel="canonical" href=\{canonical\}/, "Unit pages do not emit their clean canonical.");
requireMatch(unitPage, /url: canonical/, "Unit structured data is not aligned with the clean canonical.");
const canonicalDeclaration = unitPage.match(/const canonical\s*=\s*([^;]+);/)?.[1] || "";
forbidMatch(canonicalDeclaration, /(?:query|router|window|location|or_)/i, "Unit canonical depends on request or booking parameters.");

// Search and checkout utility pages must not create parameter variants in the
// index. /book intentionally remains noindex while still forwarding parameters.
requireMatch(availability, /<link rel="canonical" href=\{`\$\{liveSite\}\/availability`\}/, "Availability does not canonicalize to /availability.");
requireMatch(book, /<meta name="robots" content="noindex,follow"/, "/book must remain noindex,follow.");
requireMatch(book, /<link rel="canonical" href=\{`\$\{liveSite\}\/book`\}/, "/book does not have a stable clean canonical.");
requireMatch(book, /for \(const \[key, value\] of Object\.entries\(query\)\)/, "/book no longer forwards incoming booking parameters.");

// Booking parameters are operational state, not disposable tracking data. All
// five must survive the homepage/search -> availability -> unit checkout flow.
for (const key of bookingKeys) {
  requireMatch(availabilitySearch, new RegExp(`name=["']${key}["']`), `Shared availability search is missing ${key}.`);
  requireMatch(availability, new RegExp(`router\\.query\\.${key}`), `Availability page does not read ${key}.`);
  requireMatch(availability, new RegExp(`${key}:`), `Availability-to-unit links do not serialize ${key}.`);
}
requireMatch(homepage, /import AvailabilitySearch from ["']\.\.\/components\/AvailabilitySearch["'];/, "Homepage does not import the shared availability search.");
requireMatch(homepage, /<AvailabilitySearch\s*\/>/, "Homepage does not render the shared availability search.");
requireMatch(availabilitySearch, /method="get" action="\/availability"/, "Shared availability search must use a crawl-safe GET to /availability.");
requireMatch(availability, /`\$\{condo\.href\}\?\$\{bookingQuery\}#checkout`/, "Available-unit links no longer carry the validated stay into checkout.");

// Only clean discovery URLs belong in XML sitemaps. Query strings and fragments
// can create duplicate URL families in both Google Search Console and Bing.
for (const route of ["/availability", "/pelican-beach-resort-unit-707", "/pelican-beach-resort-unit-1006"]) {
  requireMatch(sitemap, new RegExp(`(?:["'])${route.replaceAll("/", "\\/")}(?:["'])`), `Sitemap is missing clean route ${route}.`);
}
requireMatch(sitemap, /const ROUTES\s*=\s*\[/, "Sitemap route list could not be inspected.");
forbidMatch(sitemapRouteBlock, /["'][^"']*[?#][^"']*["']/, "Sitemap route list contains a query string or fragment.");
forbidMatch(sitemapRouteBlock, /or_(?:arrival|departure|adults|children|guests)/, "Sitemap contains booking parameters.");

if (issues.length) {
  console.error(`Booking canonical regression audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("Booking canonical regression audit passed.");
console.log("- Google/Bing canonical targets: clean availability and unit URLs");
console.log("- Sitemap: no booking parameters or fragments");
console.log("- Guest flow: all five booking parameters preserved through unit checkout");
console.log("- /book: noindex,follow and parameter-forwarding behavior preserved");
