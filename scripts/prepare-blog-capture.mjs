import fs from "node:fs";
import path from "node:path";

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) throw new Error("Usage: node scripts/prepare-blog-capture.mjs <capture.json> <output.json>");

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
let html = source.html || "";
html = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
  .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, "")
  .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
  .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "$1=\"#\"")
  .replace(/Two beachfront condos at Pelican Beach Resort, Destin\./g, "Owner-direct stays at Pelican Beach Resort in Destin.");

const visibleText = html.replace(/<[^>]+>/g, " ").replace(/&[a-z0-9#]+;/gi, " ").replace(/\s+/g, " ");
const faq = source.schemas.find((item) => item?.["@type"] === "FAQPage");
const visibleFaq = faq ? {
  ...faq,
  mainEntity: (faq.mainEntity || []).filter((item) => visibleText.includes(item.name)),
} : null;

const output = {
  sourceUrl: source.url,
  title: source.title,
  description: source.description,
  h1: source.h1,
  html,
  faq: visibleFaq?.mainEntity?.length ? visibleFaq : null,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8");
