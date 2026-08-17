import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagesRoot = path.join(root, "pages");
const strategy = JSON.parse(fs.readFileSync(path.join(root, "data", "blog-link-strategy.json"), "utf8"));
const aliases = new Set(["/activities", "/car-rentals", "/deals"]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function pageRoute(file) {
  const relative = path.relative(pagesRoot, file).replaceAll("\\", "/").replace(/\.js$/, "");
  if (relative === "index") return "/";
  return relative.endsWith("/index") ? `/${relative.slice(0, -6)}` : `/${relative}`;
}

const pageFiles = walk(pagesRoot).filter((file) => file.endsWith(".js") && !file.includes(`${path.sep}api${path.sep}`));
const routes = new Set(pageFiles.map(pageRoute).filter((route) => !route.includes("[")));
for (const alias of aliases) routes.add(alias);

const blogSlugs = fs.readdirSync(path.join(pagesRoot, "blog"))
  .filter((name) => name.endsWith(".js"))
  .map((name) => name.replace(/\.js$/, ""))
  .sort();

const issues = [];
for (const slug of blogSlugs) {
  const entry = strategy[slug];
  if (!entry) {
    issues.push(`/blog/${slug}: missing intent-specific next-step strategy`);
    continue;
  }
  for (const field of ["eyebrow", "title", "copy"]) {
    if (!entry[field] || entry[field].trim().length < 8) issues.push(`/blog/${slug}: weak or missing ${field}`);
  }
  for (const actionName of ["primary", "booking"]) {
    const action = entry[actionName];
    if (!action?.label || !action?.href) {
      issues.push(`/blog/${slug}: incomplete ${actionName} action`);
      continue;
    }
    const pathname = action.href.split(/[?#]/, 1)[0] || "/";
    if (!routes.has(pathname)) issues.push(`/blog/${slug}: ${actionName} points to missing route ${pathname}`);
    if (/^(?:click here|learn more|read more)$/i.test(action.label.trim())) issues.push(`/blog/${slug}: generic ${actionName} anchor text`);
  }
  if (entry.primary?.href === entry.booking?.href) issues.push(`/blog/${slug}: duplicate next-step destinations`);
}

for (const slug of Object.keys(strategy)) {
  if (!blogSlugs.includes(slug)) issues.push(`Strategy entry has no matching blog page: ${slug}`);
}

if (issues.length) {
  console.error(`Internal-link strategy audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

const destinationCounts = Object.values(strategy).flatMap((entry) => [entry.primary.href, entry.booking.href])
  .reduce((counts, href) => counts.set(href, (counts.get(href) || 0) + 1), new Map());

console.log(`Internal-link strategy audit passed: ${blogSlugs.length} blog entry pages have distinct, descriptive next steps.`);
console.log(`Strategic destinations: ${[...destinationCounts.entries()].map(([href, count]) => `${href} (${count})`).join(", ")}`);
