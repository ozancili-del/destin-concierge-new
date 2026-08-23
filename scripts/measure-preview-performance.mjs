import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const routes = ["/", "/availability", "/pelican-beach-resort-unit-707", "/pelican-beach-resort-unit-1006", "/destin-condo-photo-gallery", "/blog", "/destin-hub"];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = [];

for (const route of routes) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:3020${route}`, { waitUntil: "load", timeout: 45_000 });
  await page.waitForTimeout(500);
  report.push(await page.evaluate((currentRoute) => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const bytes = (items) => items.reduce((total, item) => total + (item.transferSize || item.encodedBodySize || 0), 0);
    const images = resources.filter((item) => item.initiatorType === "img" || item.initiatorType === "image");
    return {
      route: currentRoute,
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      loadMs: Math.round(navigation.loadEventEnd),
      resourceCount: resources.length,
      transferredKb: Math.round(bytes(resources) / 1024),
      imageCount: images.length,
      imageKb: Math.round(bytes(images) / 1024),
    };
  }, route));
  await context.close();
}

await browser.close();
await mkdir(".tmp", { recursive: true });
await writeFile(".tmp/preview-performance.json", JSON.stringify({ measuredAt: new Date().toISOString(), environment: "local Next.js development server", report }, null, 2));
console.table(report);
