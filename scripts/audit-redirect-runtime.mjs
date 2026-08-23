import { spawn } from "node:child_process";

const port = 3197;
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NODE_ENV: "production" },
});

const output = [];
child.stdout.on("data", (chunk) => output.push(chunk.toString()));
child.stderr.on("data", (chunk) => output.push(chunk.toString()));

async function waitUntilReady() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(origin, { redirect: "manual" });
      if (response.status) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Next.js server did not start:\n${output.join("")}`);
}

const bookingQuery = "or_arrival=2026-09-04&or_departure=2026-09-07&or_adults=5&or_children=4&or_guests=9";
const cases = [
  ["/condos/unit-707", "/pelican-beach-resort-unit-707", true],
  ["/condos/unit-1006", "/pelican-beach-resort-unit-1006", true],
  ["/pelican-beach-resort-unit-707-orp5b47b5ax", "/pelican-beach-resort-unit-707", true],
  ["/pelican-beach-resort-unit-1006-orp5b6450ex", "/pelican-beach-resort-unit-1006", true],
  ["/resort", "/pelican-beach-resort-destin", false],
  ["/gallery", "/destin-condo-photo-gallery", false],
  ["/virtual-tours", "/pelican-beach-resort-condo-virtual-tours", false],
  ["/reviews", "/destin-condo-rental-reviews", false],
  ["/deals", "/destin-condo-deals", false],
  ["/snowbird", "/destin-snowbird-rentals", false],
  ["/offer", "/destin-condo-special-offers", false],
  ["/activities", "/destin-activities", false],
  ["/car-rentals", "/destin-car-rentals", false],
  ["/trip-planner", "/destin-vacation-itinerary-planner", false],
  ["/faq", "/destin-condo-rental-faq", false],
  ["/aboutus-574000712", "/about", false],
  ["/properties", "/destin-vacation-rentals-by-owner", false],
  ["/blog/destinitalian", "/blog/best-restaurants-destin-local-guide", false],
];

try {
  await waitUntilReady();
  const issues = [];
  for (const [source, destination, withBookingQuery] of cases) {
    const suffix = withBookingQuery ? `?${bookingQuery}` : "";
    const response = await fetch(`${origin}${source}${suffix}`, { redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status !== 308) issues.push(`${source} returned ${response.status}, expected 308`);
    if (!location) {
      issues.push(`${source} returned no Location header`);
      continue;
    }
    const redirected = new URL(location, origin);
    if (redirected.pathname !== destination) issues.push(`${source} targets ${redirected.pathname}, expected ${destination}`);
    if (withBookingQuery && redirected.searchParams.toString() !== new URLSearchParams(bookingQuery).toString()) {
      issues.push(`${source} did not preserve the complete booking query`);
    }
    if (redirected.pathname === source) issues.push(`${source} redirects to itself`);
  }
  if (issues.length) throw new Error(`Runtime redirect audit failed:\n- ${issues.join("\n- ")}`);
  console.log(`Runtime redirect audit passed: ${cases.length} representative 308 redirects.`);
  console.log("- Unit redirects preserve arrival, departure, adults, children, and total guests");
  console.log("- Temporary, OwnerRez, content, and consolidated-blog routes are one hop");
} finally {
  child.kill();
}
