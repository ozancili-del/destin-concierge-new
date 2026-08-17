import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagesRoot = path.join(root, "pages");
const sourceRoots = [path.join(root, "pages"), path.join(root, "components"), path.join(root, "public")];
const ignoredParts = ["pages\\api\\", "pages\\admin\\", "pages\\guestview\\", "pages\\tv\\"];
const cleanAliases = new Set(["/activities", "/car-rentals", "/deals"]);
const assetExtensions = /\.(?:avif|css|gif|html|ico|jpe?g|js|json|map|mjs|mp4|pdf|png|svg|txt|webmanifest|webp|xml)$/i;
const legacyPath = /\/(?:aboutus-|privacy-|pelican-beach-resort-unit-\d+-orp|pelican-beach-resort-destin-|destin-vacation-itinerary-planner-|ai-concierge-|virtualtour-)/i;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function pageRoute(file) {
  const relative = path.relative(pagesRoot, file).replaceAll("\\", "/").replace(/\.(?:js|jsx|ts|tsx)$/, "");
  if (relative === "index") return "/";
  if (relative.endsWith("/index")) return `/${relative.slice(0, -6)}`;
  return `/${relative}`;
}

const routeFiles = walk(pagesRoot).filter((file) => /\.(?:js|jsx|ts|tsx)$/.test(file));
const routes = new Set(routeFiles
  .filter((file) => !ignoredParts.some((part) => file.includes(part)))
  .map(pageRoute)
  .filter((route) => !route.includes("[")));
for (const alias of cleanAliases) routes.add(alias);

const issues = [];
let linksChecked = 0;
for (const file of sourceRoots.flatMap(walk).filter((item) => /\.(?:html|js|jsx|ts|tsx)$/.test(item))) {
  if (ignoredParts.some((part) => file.includes(part)) || /public\\tv/i.test(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const linkPattern = /(?:<a\b[^>]*?href|<form\b[^>]*?action)\s*=\s*["']([^"']+)["']/gi;
  for (const match of source.matchAll(linkPattern)) {
    const href = match[1].trim();
    linksChecked += 1;
    if (!href || href.startsWith("#") || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    if (/^https?:\/\//i.test(href)) {
      const url = new URL(href);
      if (url.hostname === "www.destincondogetaways.com" && url.pathname !== "/") {
        issues.push({ file, href, reason: legacyPath.test(url.pathname) ? "legacy public-site path" : "absolute self-link bypasses preview host" });
      }
      continue;
    }
    if (!href.startsWith("/")) continue;
    const pathname = href.split(/[?#]/, 1)[0] || "/";
    if (assetExtensions.test(pathname) || pathname.startsWith("/_next/")) continue;
    if (!routes.has(pathname)) issues.push({ file, href, reason: "missing local route" });
  }
}

if (issues.length) {
  console.error(`Site-link audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${path.relative(root, issue.file)}: ${issue.href} (${issue.reason})`);
  process.exit(1);
}

console.log(`Site-link audit passed: ${linksChecked} literal links checked across ${routes.size} public routes/aliases.`);
