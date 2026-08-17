import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagesRoot = path.join(root, "pages");
const base = new URL(process.argv[2] || process.env.SITE_AUDIT_BASE || "http://localhost:3000");
const ignoredRoute = /^\/(?:api|admin|guestview|tv)(?:\/|$)/;
const ignoredFile = /(?:^|[\\/])(?:_app|_document|_error|404)\.(?:js|jsx|ts|tsx)$/;
const pageExtension = /\.(?:js|jsx|ts|tsx)$/;
const htmlEntity = (value) => value.replaceAll("&amp;", "&").replaceAll("&#x2F;", "/").replaceAll("&#47;", "/");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function pageRoute(file) {
  const relative = path.relative(pagesRoot, file).replaceAll("\\", "/").replace(pageExtension, "");
  if (relative === "index") return "/";
  if (relative.endsWith("/index")) return `/${relative.slice(0, -6)}`;
  return `/${relative}`;
}

const queue = walk(pagesRoot)
  .filter((file) => pageExtension.test(file) && !ignoredFile.test(file))
  .map(pageRoute)
  .filter((route) => !route.includes("[") && !ignoredRoute.test(route));
queue.push("/activities", "/car-rentals", "/deals");

const checked = new Map();
const discoveredFrom = new Map(queue.map((route) => [route, "route inventory"]));
const failures = [];

while (queue.length) {
  const route = queue.shift();
  if (checked.has(route)) continue;
  const target = new URL(route, base);
  let response;
  try {
    response = await fetch(target, { redirect: "follow", headers: { "user-agent": "Destin-internal-link-audit/1.0" } });
  } catch (error) {
    failures.push({ route, source: discoveredFrom.get(route), status: "network error", detail: error.message });
    continue;
  }
  checked.set(route, response.status);
  if (!response.ok) {
    failures.push({ route, source: discoveredFrom.get(route), status: response.status, detail: response.statusText });
    continue;
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) continue;
  const html = await response.text();
  for (const match of html.matchAll(/<a\b[^>]*?href=["']([^"']+)["']/gi)) {
    const href = htmlEntity(match[1].trim());
    if (!href || href.startsWith("#") || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    let linked;
    try { linked = new URL(href, target); } catch { continue; }
    const isPublicSite = linked.hostname === "www.destincondogetaways.com" || linked.hostname === "destincondogetaways.com";
    if (linked.origin !== base.origin && !isPublicSite) continue;
    const linkedRoute = `${linked.pathname}${linked.search}`;
    if (/\.(?:avif|css|gif|ico|jpe?g|js|json|map|mjs|mp4|pdf|png|svg|txt|webmanifest|webp|xml)$/i.test(linked.pathname)) continue;
    if (!discoveredFrom.has(linkedRoute)) discoveredFrom.set(linkedRoute, route);
    if (!checked.has(linkedRoute)) queue.push(linkedRoute);
  }
}

if (failures.length) {
  console.error(`Rendered HTTP link audit failed with ${failures.length} broken route(s):`);
  for (const failure of failures) console.error(`- ${failure.route} <- ${failure.source}: ${failure.status} ${failure.detail}`);
  process.exit(1);
}

console.log(`Rendered HTTP link audit passed: ${checked.size} internal routes requested from ${base.origin}; no 4xx/5xx responses.`);
