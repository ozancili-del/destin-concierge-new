import fs from "node:fs";
import path from "node:path";

const [sourcePath, outputPath, fallbackImage, iframeTitle = "Interactive Destin guide", preserveVercel = "false", expandHidden = "false", assetMapPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) throw new Error("Usage: node scripts/prepare-blog-capture.mjs <capture.json> <output.json>");

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
let html = source.html || "";
html = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
  .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, "")
  .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, "")
  .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
  .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "$1=\"#\"")
  .replace(/Two beachfront condos at Pelican Beach Resort, Destin\./g, "Owner-direct stays at Pelican Beach Resort in Destin.");
if (fallbackImage && fallbackImage !== "-") html = html.replace(/<img(?![^>]*\bsrc=)([^>]*)>/i, `<img src="${fallbackImage}"$1>`);
if (assetMapPath) {
  const assetMap = JSON.parse(fs.readFileSync(assetMapPath, "utf8"));
  for (const [remote, local] of Object.entries(assetMap)) html = html.replaceAll(remote, local);
}
if (preserveVercel !== "true") html = html.replace(/https:\/\/destin-concierge-new\.vercel\.app\//g, "/");
if (expandHidden === "true") {
  html = html
    .replace(/display\s*:\s*none\s*;?/gi, "display:block;")
    .replace(/<button\b/gi, "<div")
    .replace(/<\/button>/gi, "</div>");
}
const seenIframes = new Set();
html = html.replace(/<iframe\b[^>]*>(?:<\/iframe>)?/gi, (frame) => {
  const normalized = frame.replace(/\s+/g, " ").trim();
  const src = frame.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  const key = src || normalized;
  if (seenIframes.has(key)) return "";
  seenIframes.add(key);
  if (/\btitle=/i.test(frame)) return frame;
  const airnav = src?.match(/live-widget\/(K?VPS|K?ECP|K?PNS)/i);
  const airport = airnav?.[1]?.replace(/^K/i, "").toUpperCase();
  const board = src?.includes("departuresOnly=true") ? "departures" : "arrivals";
  const title = airport ? `${airport} live ${board} board` : iframeTitle;
  return frame.replace(/<iframe/i, `<iframe title="${title}"`);
});

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
  extraSchemas: source.schemas.filter((item) => ["ItemList", "SoftwareApplication"].includes(item?.["@type"])),
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8");
