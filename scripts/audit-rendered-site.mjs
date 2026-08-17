import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const baseUrl = process.env.SITE_AUDIT_URL || "http://127.0.0.1:3020";
const defaultRoutes = [
  "/", "/availability", "/book", "/destin-vacation-rentals-by-owner", "/resort",
  "/condos/unit-707", "/condos/unit-1006", "/reviews", "/gallery", "/virtual-tours",
  "/trip-planner", "/destin-ai-concierge", "/guest-guide", "/faq", "/map", "/about",
  "/privacy", "/why-book-direct", "/beach-cam", "/blog", "/destin-hub",
];
const routes = process.env.AUDIT_ROUTES ? process.env.AUDIT_ROUTES.split(",") : defaultRoutes;
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const issues = [];
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  for (const route of routes) {
    const page = await context.newPage();
    const failedResponses = [];
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin === new URL(baseUrl).origin && response.status() >= 400) {
        failedResponses.push(`${response.status()} ${response.request().resourceType()} ${url.pathname}`);
      }
    });
    let response;
    try {
      response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(500);
    } catch (error) {
      issues.push(`${viewport.name} ${route}: navigation failed (${error.message})`);
      await page.close();
      continue;
    }
    const audit = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const label = (element) => (
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        element.textContent ||
        element.querySelector("img")?.getAttribute("alt") || ""
      ).trim();
      return {
        title: document.title.trim(),
        description: document.querySelector('meta[name="description"]')?.content?.trim() || "",
        h1: [...document.querySelectorAll("h1")].filter(visible).map((item) => item.textContent.trim()),
        mainCount: document.querySelectorAll("main").length,
        missingAlt: [...document.images].filter((image) => !image.hasAttribute("alt")).map((image) => image.src),
        brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
        unlabeledControls: [...document.querySelectorAll('a[href],button,input:not([type="hidden"]),select,textarea')]
          .filter(visible).filter((element) => !label(element)).map((element) => element.outerHTML.slice(0, 180)),
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        suspiciousUrls: [...document.querySelectorAll('[href],[src]')].map((element) => element.getAttribute("href") || element.getAttribute("src")).filter((value) => value === "&" || value === "/&"),
        suspiciousResources: performance.getEntriesByType("resource").filter((entry) => entry.name.endsWith("/&")).map((entry) => entry.initiatorType),
        suspiciousBackgrounds: [...document.querySelectorAll("*")].map((element) => ({ tag: element.tagName, className: element.className, backgroundImage: getComputedStyle(element).backgroundImage })).filter((item) => item.backgroundImage.includes('/&') || item.backgroundImage.includes('"&"')),
      };
    });
    const prefix = `${viewport.name} ${route}`;
    if (!response || response.status() >= 400) issues.push(`${prefix}: HTTP ${response?.status() || "unknown"}`);
    if (!audit.title) issues.push(`${prefix}: missing title`);
    if (!audit.description) issues.push(`${prefix}: missing meta description`);
    if (audit.h1.length !== 1) issues.push(`${prefix}: expected one visible H1, found ${audit.h1.length}`);
    if (audit.mainCount !== 1) issues.push(`${prefix}: expected one main landmark, found ${audit.mainCount}`);
    if (audit.missingAlt.length) issues.push(`${prefix}: ${audit.missingAlt.length} image(s) missing alt`);
    if (audit.brokenImages.length) issues.push(`${prefix}: ${audit.brokenImages.length} broken image(s): ${audit.brokenImages.join(", ")}`);
    if (audit.unlabeledControls.length) issues.push(`${prefix}: ${audit.unlabeledControls.length} unlabeled control(s): ${audit.unlabeledControls.join(" | ")}`);
    if (audit.horizontalOverflow > 2) issues.push(`${prefix}: ${audit.horizontalOverflow}px horizontal overflow`);
    if (audit.suspiciousUrls.length) issues.push(`${prefix}: suspicious document URL(s): ${audit.suspiciousUrls.join(", ")}`);
    if (audit.suspiciousResources.length) issues.push(`${prefix}: /& initiated by ${audit.suspiciousResources.join(", ")}`);
    if (audit.suspiciousBackgrounds.length) issues.push(`${prefix}: suspicious background(s): ${JSON.stringify(audit.suspiciousBackgrounds)}`);
    if (failedResponses.length) issues.push(`${prefix}: failed same-origin resources: ${[...new Set(failedResponses)].join(", ")}`);
    results.push({ viewport: viewport.name, route, status: response?.status(), ...audit });
    await page.close();
  }
  await context.close();
}

await browser.close();
await mkdir(".tmp", { recursive: true });
await writeFile(".tmp/rendered-site-audit.json", JSON.stringify({ checkedAt: new Date().toISOString(), results, issues }, null, 2));
if (issues.length) {
  console.error(`Rendered-site audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}
console.log(`Rendered-site audit passed: ${results.length} mobile/desktop page renders checked.`);
