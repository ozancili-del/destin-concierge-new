import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const analyticsPath = path.join(root, "public", "site-analytics.js");
const source = fs.readFileSync(analyticsPath, "utf8");
const appSource = fs.readFileSync(path.join(root, "pages", "_app.js"), "utf8");

assert.match(appSource, /src="\/site-analytics\.js"/, "Next pages must load the shared analytics layer");
assert.match(source, /begin_checkout/, "Canonical booking event is missing");
assert.match(source, /generate_lead/, "Canonical lead event is missing");
assert.match(source, /affiliate_click/, "Affiliate click event is missing");
assert.match(source, /chat_message_sent/, "Chat engagement event is missing");
assert.match(source, /email\|phone\|name\|message\|comment\|question/, "PII parameter guard is missing");

const trackedFiles = [
  "pages/beach-deals.js",
  "pages/destin-hub.js",
  "pages/offer.js",
  "pages/rates-calendar.js",
  "pages/snowbird.js",
  "public/destin-car-rental.html",
  "public/destin-hub.html",
  "public/destin-tripshock.html",
  "public/pricing-dashboard-v2.html",
  "public/rate-finder.html",
  "public/snowbird.html"
];

for (const relative of trackedFiles) {
  const contents = fs.readFileSync(path.join(root, relative), "utf8");
  assert.doesNotMatch(contents, /googletagmanager\.com\/(?:gtag|gtm\.js)/, `${relative} still has an independent tracker`);
  if (relative.startsWith("public/")) {
    assert.match(contents, /src="\/site-analytics\.js"/, `${relative} does not load the shared analytics layer`);
  }
}

function createBrowser(hostname) {
  const scripts = [];
  const listeners = {};
  const document = {
    title: "Analytics test",
    readyState: "complete",
    head: { appendChild(node) { scripts.push(node); } },
    createElement() { return {}; },
    getElementById() { return null; },
    addEventListener(type, handler) { listeners[type] = handler; }
  };
  const window = {
    location: {
      hostname,
      origin: `https://${hostname}`,
      pathname: "/availability",
      search: "?email=guest@example.com&or_guests=2",
      href: `https://${hostname}/availability?email=guest@example.com&or_guests=2`
    },
    history: { pushState() {}, replaceState() {} },
    addEventListener(type, handler) { listeners[type] = handler; },
    setTimeout(handler) { handler(); },
    dataLayer: []
  };
  const context = { window, document, URL, Object, Array, String, Number, Date, RegExp, FormData: class {}, console };
  vm.runInNewContext(source, context, { filename: analyticsPath });
  return { window, scripts };
}

const preview = createBrowser("preview.example.com");
assert.equal(preview.scripts.length, 0, "Preview must not send analytics traffic");
assert.equal(preview.window.DCGAnalytics.production, false);
const previewPageView = preview.window.dataLayer.find((item) => item?.event === "page_view");
assert.ok(previewPageView, "Preview should expose page-view telemetry for QA");
assert.doesNotMatch(previewPageView.page_location, /guest@example\.com/, "Page URLs must not expose email addresses");
preview.window.DCGAnalytics.track("generate_lead", { email: "guest@example.com", phone: "555-555-5555", lead_type: "inquiry" });
const lead = preview.window.dataLayer.find((item) => item?.event === "generate_lead");
assert.equal(lead.email, undefined);
assert.equal(lead.phone, undefined);
assert.equal(lead.lead_type, "inquiry");

const production = createBrowser("www.destincondogetaways.com");
assert.equal(production.window.DCGAnalytics.production, true);
assert.deepEqual(production.scripts.map((script) => script.id).sort(), ["dcg-ga4", "dcg-gtm"]);

console.log(`Analytics audit passed: ${trackedFiles.length} surfaces use one tracker; preview isolation and PII guards verified.`);
