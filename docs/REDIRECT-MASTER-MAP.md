# Redirect Master Map

Updated: August 18, 2026
Scope: OwnerRez-hosted URLs, prior Vercel/subdomain URLs, and historical Google/Bing crawl findings
Production status: unchanged; these rules are staged in draft PR #10

## Contract

- Every moved public URL lands on its closest relevant canonical page in one permanent server-side hop.
- Next.js uses HTTP **308** for `permanent: true`. Google documents both 301 and 308 as permanent migration signals.
- Next.js passes unspecified query parameters through redirects. Legacy unit links therefore retain `or_arrival`, `or_departure`, `or_adults`, `or_children`, and `or_guests`.
- Canonical destinations return 200 and appear in the production sitemap; redirect sources never appear in it.
- Unknown pages are not mass-redirected to the homepage. Consolidation is topic-specific to avoid soft-404 signals.
- HTTPS and bare-domain to `https://www.destincondogetaways.com` canonicalization remain a DNS/Vercel cutover check because they depend on production domain attachment.

## Same-domain paths

| Historical URL | Final canonical route | Reason |
|---|---|---|
| `/sitemap-vercel.xml` | `/sitemap.xml` | One authoritative sitemap |
| `/destin-live-beach-cam-574002656`, `/webcam-574002656` | `/beach-cam` | Beach-cam replacement |
| `/aboutus-574000712`, `/about-me-574000712`, `/aboutme-574000712` | `/about` | About-page aliases |
| `/privacy-574035022` | `/privacy` | Privacy replacement |
| `/properties`, `/pelican-` | `/destin-vacation-rentals-by-owner` | Closest commercial collection intent |
| `/pelican-beach-resort-destin-574048693` | `/resort` | Resort replacement |
| `/-pelican-beach-resort-condo-rental-574046950` | `/why-book-direct` | Historic direct-booking page |
| `/pelican-beach-resort-unit-707-orp5b47b5ax` | `/condos/unit-707` | Exact listing identity; booking query retained |
| `/pelican-beach-resort-unit-1006-orp5b6450ex` | `/condos/unit-1006` | Exact listing identity; booking query retained |
| `/destin-vacation-itinerary-planner-574049367` | `/trip-planner` | Planner replacement |
| `/ai-concierge-574036277`, `/concierge` | `/destin-ai-concierge` | One public concierge route |
| `/virtualtour-574001044` | `/virtual-tours` | Virtual-tour replacement |
| `/destin-condo-guide-574047967` | `/faq` | Public condo FAQ replacement |
| `/pricing-dashboard-574049826` | `/deals` | Public price-reduction intent |
| `/beach-deals`, `/rate-finder.html` | `/deals` | Clean deals route |
| `/destin-hub.html` | `/destin-hub` | Clean planning-hub route |
| `/destin-car-rental.html` | `/car-rentals` | Clean transport route |
| `/destin-tripshock.html` | `/activities` | Clean activities route |
| `/snowbird.html` | `/snowbird` | Clean snowbird route |
| `/blog/rss` | `/blog` | No replacement feed; preserve human discovery |
| `/blog/why-we-built-an-ai-concierge-for-destin-vacation-rentals` | `/destin-ai-concierge` | Closest AI-concierge intent |
| `/blog/destin-condo-ai-concierge-direct-booking` | `/why-book-direct` | Consolidated direct-booking intent |
| `/blog/destin-vacation-rental-ai-concierge` | `/destin-ai-concierge` | Consolidated concierge intent |
| `/blog/destinitalian`, `/blog/destinsushi`, `/blog/destindelights` | `/blog/best-restaurants-destin-local-guide` | Consolidated specialty dining coverage |
| `/blog?categoryId=611`, `/blog?categoryId=644` | `/blog` | Retired OwnerRez category variants; query removed |

## Retired public subdomains

| Historical host/path | Final canonical route | Fallback policy |
|---|---|---|
| `deals.../`, `/beach-deals`, `/rate-finder.html` | `/deals` | Other retired deals paths also go to `/deals` |
| `explore.../`, `/destin-hub`, `/destin-hub.html` | `/destin-hub` | Other retired explore paths go to the hub |
| `explore.../destin-car-rental.html` | `/car-rentals` | Exact functional successor |
| `explore.../destin-tripshock.html` | `/activities` | Exact functional successor |
| `explore.../blog/best-restaurants-destin-local-guide` | Same main-domain blog route | Historical cross-host 404 repair |
| `explore.../blog/destinweather` | Same main-domain blog route | Historical cross-host 404 repair |
| `explore.../pelican-beach-resort-unit-1006-orp5b6450ex` | `/condos/unit-1006` | Historical cross-host 404 repair |
| `deals.../blog/destinnights` | `/blog/destinnights` | Historical cross-host 404 repair |
| `offer.../`, `/offer` | `/offer` | Other retired offer paths go to `/offer` |
| `sunbirds.../`, `/snowbird` | `/snowbird` | Other retired sunbird paths go to `/snowbird` |

`guestview.destincondogetaways.com` and `app.destincondogetaways.com` are application surfaces, not retired public SEO hosts. Their temporary product routing remains separate from this migration map.

## Deliberate non-redirects

- `/availability` remains the canonical availability/results route.
- `/book` remains a `noindex,follow` transactional handoff that preserves booking state; it is not an SEO landing page.
- Current blog URLs remain unchanged.
- Truly unknown main-domain URLs continue to return a real 404 rather than being sent to an unrelated page.

## Cutover verification

After the production domain is attached, run `npm run test:redirect-map` and live HTTP checks that assert:

1. source returns 308 (or platform-equivalent permanent status);
2. `Location` is the final HTTPS `www` canonical URL;
3. following it produces exactly one redirect hop and a final 200;
4. unit booking parameters survive unchanged;
5. no source URL appears in the sitemap or internal links;
6. HTTP, HTTPS, bare-domain, `www`, and trailing-slash variants behave deterministically.
