const exactRoutes = new Map([
  ["/aboutus-574000712", "/about"],
  ["/privacy-574035022", "/privacy"],
  ["/pelican-beach-resort-destin-574048693", "/pelican-beach-resort-destin"],
  ["/-pelican-beach-resort-condo-rental-574046950", "/why-book-direct"],
  ["/pelican-beach-resort-unit-707-orp5b47b5ax", "/pelican-beach-resort-unit-707"],
  ["/pelican-beach-resort-unit-1006-orp5b6450ex", "/pelican-beach-resort-unit-1006"],
  ["/destin-live-beach-cam-574002656", "/beach-cam"],
  ["/destin-vacation-itinerary-planner-574049367", "/destin-vacation-itinerary-planner"],
  ["/ai-concierge-574036277", "/destin-ai-concierge"],
  ["/virtualtour-574001044", "/pelican-beach-resort-condo-virtual-tours"],
  ["/destin-condo-guide-574047967", "/destin-condo-rental-faq"],
  ["/properties", "/destin-vacation-rentals-by-owner"],
  ["/destin-hub.html", "/destin-hub"],
  ["/destin-tripshock.html", "/destin-activities"],
  ["/destin-car-rental.html", "/destin-car-rentals"],
  ["/concierge", "/destin-ai-concierge"],
  ["/offer", "/destin-condo-special-offers"],
]);

const hostRoutes = new Map([
  ["www.destincondogetaways.com", null],
  ["destincondogetaways.com", null],
  ["deals.destincondogetaways.com", "/destin-condo-deals"],
  ["explore.destincondogetaways.com", null],
  ["offer.destincondogetaways.com", "/destin-condo-special-offers"],
  ["sunbirds.destincondogetaways.com", "/destin-snowbird-rentals"],
  ["destin-concierge-new.vercel.app", null],
]);

const exploreRoutes = new Map([
  ["/destin-hub", "/destin-hub"],
  ["/destin-hub.html", "/destin-hub"],
  ["/destin-tripshock.html", "/destin-activities"],
  ["/destin-car-rental.html", "/destin-car-rentals"],
]);

export function cleanInternalUrl(value) {
  if (!value || value.startsWith("#")) return value;
  if (value.startsWith("/")) {
    const match = value.match(/^([^?#]*)([?#].*)?$/);
    const pathname = match?.[1] || value;
    const suffix = match?.[2] || "";
    return `${exactRoutes.get(pathname) || pathname}${suffix}`;
  }
  let url;
  try { url = new URL(value); } catch { return value; }
  if (!hostRoutes.has(url.hostname)) return value;

  let pathname = url.pathname || "/";
  if (url.hostname === "explore.destincondogetaways.com") pathname = exploreRoutes.get(pathname) || "/destin-hub";
  else if (hostRoutes.get(url.hostname)) pathname = hostRoutes.get(url.hostname);
  else pathname = exactRoutes.get(pathname) || pathname;

  return `${pathname}${url.search}${url.hash}`;
}

export function cleanInternalLinksInHtml(html = "") {
  return html.replace(/href=(['"])([^'"]+)\1/gi, (match, quote, href) => `href=${quote}${cleanInternalUrl(href)}${quote}`);
}

// Migrated OwnerRez articles often include their own visual masthead and H1.
// The new page shell already supplies the canonical H1, so retaining the old
// one creates a duplicate document heading. Preserve all of the article copy
// while removing only legacy H1 elements.
export function prepareMigratedArticleHtml(html = "") {
  return cleanInternalLinksInHtml(html).replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, "");
}
