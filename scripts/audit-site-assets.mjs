import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["pages", "components", "data", "public"];
const extensions = new Set([".js", ".jsx", ".json", ".html", ".css"]);
const ignored = new Set(["data/site-image-migration.json"]);
const forbiddenHosts = ["uc.orez.io", "destin-concierge-new.vercel.app/destiny_avatar.png"];
const issues = [];
const references = new Set();

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    if (ignored.has(relative) || /^public\/tv.*\.html$/i.test(relative)) continue;
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      files.push(...await collect(absolute));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push({ absolute, relative });
    }
  }
  return files;
}

const files = (await Promise.all(sourceRoots.map((directory) => collect(path.join(root, directory))))).flat();
for (const file of files) {
  const source = await readFile(file.absolute, "utf8");
  for (const host of forbiddenHosts) {
    if (source.includes(host)) issues.push(`${file.relative}: forbidden legacy asset host ${host}`);
  }
  for (const match of source.matchAll(/\/images\/site\/[A-Za-z0-9_.-]+/g)) references.add(match[0]);
}

for (const reference of references) {
  try {
    await access(path.join(root, "public", reference.slice(1)));
  } catch {
    issues.push(`missing local asset: ${reference}`);
  }
}

if (issues.length) {
  console.error(`Site-asset audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Site-asset audit passed: ${references.size} migrated references resolve locally and no production source uses legacy image hosts.`);
