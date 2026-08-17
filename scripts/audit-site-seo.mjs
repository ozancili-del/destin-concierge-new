import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pages = [
  "pages/index.js",
  "pages/availability.js",
  "pages/book.js",
  "pages/destin-vacation-rentals-by-owner.js",
  "pages/resort.js",
  "pages/condos/unit-707.js",
  "pages/condos/unit-1006.js",
  "pages/reviews.js",
  "pages/gallery.js",
  "pages/virtual-tours.js",
  "pages/trip-planner.js",
  "pages/destin-ai-concierge.js",
  "pages/guest-guide.js",
  "pages/faq.js",
  "pages/map.js",
  "pages/about.js",
  "pages/privacy.js",
  "pages/why-book-direct.js",
  "pages/beach-cam.js",
  "pages/blog.js",
  "pages/destin-hub.js",
];

const schemaRequired = new Set([
  "pages/index.js",
  "pages/availability.js",
  "pages/book.js",
  "pages/destin-vacation-rentals-by-owner.js",
  "pages/resort.js",
  "pages/reviews.js",
  "pages/trip-planner.js",
  "pages/destin-ai-concierge.js",
  "pages/guest-guide.js",
  "pages/faq.js",
  "pages/about.js",
  "pages/privacy.js",
  "pages/why-book-direct.js",
  "pages/blog.js",
  "pages/destin-hub.js",
]);

const issues = [];
for (const relative of pages) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    issues.push(`${relative}: missing page file`);
    continue;
  }
  let source = fs.readFileSync(file, "utf8");
  if (/import UnitPage from/.test(source)) source += fs.readFileSync(path.join(root, "components/UnitPage.js"), "utf8");
  if (/import MigratedBlogArticle from/.test(source)) source += fs.readFileSync(path.join(root, "components/MigratedBlogArticle.js"), "utf8");
  if (!/<title>[^<]*<\/title>/.test(source)) issues.push(`${relative}: missing rendered title`);
  if (!/meta\s+name="description"\s+content=(?:"[^"]+"|\{[^}]+\})/.test(source.replace(/\s+/g, " "))) issues.push(`${relative}: missing rendered meta description`);
  if (!/rel="canonical"/.test(source)) issues.push(`${relative}: missing canonical`);
  if (!/noindex,nofollow/.test(source)) issues.push(`${relative}: preview is not protected by noindex,nofollow`);
  if (schemaRequired.has(relative) && !/application\/ld\+json/.test(source)) issues.push(`${relative}: missing JSON-LD`);
}

if (issues.length) {
  console.error(`Site SEO audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Site SEO audit passed: ${pages.length} priority pages have title, description, canonical and preview protection; ${schemaRequired.size} schema-owned pages include JSON-LD.`);
