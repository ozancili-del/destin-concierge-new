// Permanent, same-host migration redirects. Next.js emits HTTP 308 for
// `permanent: true`; Google treats 301 and 308 as equivalent permanent moves.
// Unspecified query parameters are preserved, including OwnerRez booking state.
const permanent = (source, destination, extra = {}) => ({ source, destination, permanent: true, ...extra });

const legacyRedirects = [
  permanent("/sitemap-vercel.xml", "/sitemap.xml"),

  // OwnerRez numbered and alternate page URLs.
  permanent("/destin-live-beach-cam-574002656", "/beach-cam"),
  permanent("/webcam-574002656", "/beach-cam"),
  permanent("/aboutus-574000712", "/about"),
  permanent("/about-me-574000712", "/about"),
  permanent("/aboutme-574000712", "/about"),
  permanent("/privacy-574035022", "/privacy"),
  permanent("/properties", "/destin-vacation-rentals-by-owner"),
  permanent("/pelican-", "/destin-vacation-rentals-by-owner"),
  permanent("/pelican-beach-resort-destin-574048693", "/resort"),
  permanent("/-pelican-beach-resort-condo-rental-574046950", "/why-book-direct"),
  permanent("/pelican-beach-resort-unit-707-orp5b47b5ax", "/condos/unit-707"),
  permanent("/pelican-beach-resort-unit-1006-orp5b6450ex", "/condos/unit-1006"),
  permanent("/destin-vacation-itinerary-planner-574049367", "/trip-planner"),
  permanent("/ai-concierge-574036277", "/destin-ai-concierge"),
  permanent("/concierge", "/destin-ai-concierge"),
  permanent("/virtualtour-574001044", "/virtual-tours"),
  permanent("/destin-condo-guide-574047967", "/faq"),
  permanent("/pricing-dashboard-574049826", "/deals"),

  // Former Vercel/subdomain file URLs now served at clean main-domain routes.
  permanent("/beach-deals", "/deals"),
  permanent("/rate-finder.html", "/deals"),
  permanent("/destin-hub.html", "/destin-hub"),
  permanent("/destin-car-rental.html", "/car-rentals"),
  permanent("/destin-tripshock.html", "/activities"),
  permanent("/snowbird.html", "/snowbird"),

  // Retired or consolidated blog URLs reported by Google/Bing.
  permanent("/blog/rss", "/blog"),
  permanent("/blog/why-we-built-an-ai-concierge-for-destin-vacation-rentals", "/destin-ai-concierge"),
  permanent("/blog/destin-condo-ai-concierge-direct-booking", "/why-book-direct"),
  permanent("/blog/destin-vacation-rental-ai-concierge", "/destin-ai-concierge"),
  permanent("/blog/destinitalian", "/blog/best-restaurants-destin-local-guide"),
  permanent("/blog/destinsushi", "/blog/best-restaurants-destin-local-guide"),
  permanent("/blog/destindelights", "/blog/best-restaurants-destin-local-guide"),
];

module.exports = { legacyRedirects };
