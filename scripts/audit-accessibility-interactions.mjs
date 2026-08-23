import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const baseUrl = process.env.SITE_AUDIT_URL || "http://127.0.0.1:3020";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const failures = [];

async function assertPageLayout(name, viewport, route = "/", options = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: options.reducedMotion || "no-preference" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(400);
  if (options.zoom) await page.evaluate((zoom) => { document.documentElement.style.zoom = String(zoom); }, options.zoom);
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    visibleMain: Boolean(document.querySelector("main")),
    controls: [...document.querySelectorAll('a[href],button,input:not([type="hidden"]),select,textarea')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      }).length,
  }));
  if (result.overflow > 2) failures.push(`${name} ${route}: ${result.overflow}px horizontal overflow`);
  if (!result.visibleMain) failures.push(`${name} ${route}: main content missing`);
  if (!result.controls) failures.push(`${name} ${route}: no visible interactive controls`);
  await context.close();
}

await assertPageLayout("320px", { width: 320, height: 720 });
await assertPageLayout("mobile-landscape", { width: 844, height: 390 });
await assertPageLayout("tablet-portrait", { width: 768, height: 1024 });
await assertPageLayout("tablet-landscape", { width: 1024, height: 768 });
await assertPageLayout("200%-zoom", { width: 1280, height: 800 }, "/", { zoom: 2 });
await assertPageLayout("reduced-motion", { width: 390, height: 844 }, "/", { reducedMotion: "reduce" });

{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  const bubble = page.locator("#db-btn");
  const dialog = page.locator("#db-window");
  if (await bubble.getAttribute("aria-expanded") !== "false") failures.push("chat: closed bubble does not expose aria-expanded=false");
  if (await dialog.getAttribute("aria-hidden") !== "true") failures.push("chat: closed dialog is not hidden from assistive technology");
  if ((await dialog.getAttribute("inert")) === null) failures.push("chat: closed dialog remains keyboard-focusable");
  await bubble.click();
  await page.waitForTimeout(350);
  if (await bubble.getAttribute("aria-expanded") !== "true") failures.push("chat: opening does not expose aria-expanded=true");
  if (await dialog.getAttribute("aria-hidden") !== "false") failures.push("chat: opened dialog remains aria-hidden");
  if ((await dialog.getAttribute("inert")) !== null) failures.push("chat: opened dialog remains inert");
  const activeAfterOpen = await page.evaluate(() => document.activeElement?.id || "");
  if (activeAfterOpen !== "db-input") failures.push(`chat: focus did not move to input (found ${activeAfterOpen || "none"})`);
  await page.keyboard.press("Escape");
  const activeAfterEscape = await page.evaluate(() => document.activeElement?.id || "");
  if (activeAfterEscape !== "db-btn") failures.push(`chat: Escape did not return focus to bubble (found ${activeAfterEscape || "none"})`);
  if (await dialog.getAttribute("aria-hidden") !== "true") failures.push("chat: Escape did not hide dialog");
  if ((await dialog.getAttribute("inert")) === null) failures.push("chat: Escape did not restore inert state");
  await context.close();
}

for (const route of ["/pelican-beach-resort-unit-707", "/destin-condo-photo-gallery"]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  const opener = route === "/destin-condo-photo-gallery"
    ? page.getByRole("button", { name: /^Enlarge /i }).first()
    : page.getByRole("button", { name: /view|open|enlarge|photo/i }).first();
  if (!(await opener.count())) {
    failures.push(`${route}: no accessible lightbox opener found`);
  } else {
    await opener.click();
    const close = page.getByRole("button", { name: /close/i }).last();
    if (!(await close.count()) || !(await close.isVisible())) failures.push(`${route}: lightbox close control is not visible and named`);
    else {
      const active = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim() || "");
      if (!/close/i.test(active)) failures.push(`${route}: lightbox did not receive focus on open`);
      await page.keyboard.press("Escape");
      const restored = await opener.evaluate((element) => document.activeElement === element);
      if (!restored) failures.push(`${route}: lightbox Escape did not restore opener focus`);
    }
  }
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error(`Accessibility interaction audit failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Accessibility interaction audit passed: chat focus/Escape semantics, lightbox focus return, 320px, 200% zoom, mobile landscape, tablets and reduced motion.");
