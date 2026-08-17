import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "public", "images", "site");
const roots = ["pages", "components", "data", "public"];
const allowed = new Set([".js", ".jsx", ".json", ".html", ".css"]);
const sourcePattern = /https:\/\/uc\.orez\.io\/(?:f|i)\/[A-Za-z0-9_-]+(?:-(?:Large|MediumOriginal))?/g;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    if (relative === "data/site-image-migration.json") continue;
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      files.push(...await collectFiles(absolute));
    } else if (allowed.has(path.extname(entry.name)) && !/^public\/tv.*\.html$/i.test(relative)) {
      files.push(absolute);
    }
  }
  return files;
}

function extensionFor(contentType) {
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return ".jpg";
}

const files = (await Promise.all(roots.map((item) => collectFiles(path.join(root, item))))).flat();
const contents = new Map();
const urls = new Set();

for (const file of files) {
  const source = await readFile(file, "utf8");
  contents.set(file, source);
  for (const match of source.matchAll(sourcePattern)) urls.add(match[0]);
}

await mkdir(outputDir, { recursive: true });
const replacements = new Map();
const manifest = [];

for (const [index, url] of [...urls].sort().entries()) {
  const candidates = [url];
  if (/\/f\/[A-Za-z0-9]+-(?:Large|MediumOriginal)$/.test(url)) {
    candidates.push(url.replace("/f/", "/i/"));
  }
  let response;
  for (const candidate of candidates) {
    response = await fetch(candidate, { headers: { "User-Agent": "DestinCondoGetawaysMigration/1.0" } });
    if (response.ok) break;
  }
  if (!response.ok) throw new Error(`Image download failed (${response.status}): ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const id = url.match(/\/(?:f|i)\/([A-Za-z0-9]+)/)?.[1] || createHash("sha256").update(url).digest("hex").slice(0, 32);
  const variant = url.includes("-Large") ? "-large" : url.includes("-MediumOriginal") ? "-medium" : "";
  const filename = `${id}${variant}${extensionFor(contentType)}`;
  await writeFile(path.join(outputDir, filename), bytes);
  const local = `/images/site/${filename}`;
  replacements.set(url, local);
  manifest.push({ source: url, local, bytes: bytes.length, contentType });
  process.stdout.write(`\rDownloaded ${index + 1}/${urls.size}`);
}

for (const [file, original] of contents) {
  let updated = original;
  for (const [source, local] of replacements) updated = updated.replaceAll(source, local);
  if (updated !== original) await writeFile(file, updated, "utf8");
}

await writeFile(
  path.join(root, "data", "site-image-migration.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), images: manifest }, null, 2)}\n`,
  "utf8",
);

process.stdout.write(`\nMigrated ${manifest.length} unique image URLs into public/images/site.\n`);
