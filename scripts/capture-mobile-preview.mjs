import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await mkdir(".tmp/mobile-preview", { recursive: true });
for (const [name, route] of [["home", "/"], ["unit-707", "/condos/unit-707"], ["gallery", "/gallery"], ["destin-hub", "/destin-hub"]]) {
  await page.goto(`http://127.0.0.1:3020${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `.tmp/mobile-preview/${name}.png`, fullPage: false });
}
await browser.close();
console.log("Captured four mobile viewport screenshots.");
