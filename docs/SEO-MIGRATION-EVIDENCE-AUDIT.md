# SEO Migration Evidence Audit

Date: August 17, 2026  
Scope: production OwnerRez-hosted site versus Vercel migration preview  
Rule: production remains unchanged until every cutover gate in this document passes.

## Executive decision

The migration should not treat the current website as a collection of pages to redesign. It is an established search asset with several high-performing guides, page-specific structured data, analytics history, and commercial entry points. The safe strategy is:

1. Preserve the search leaders and their intent, copy, headings, media, internal links, canonicals, and legitimate structured data.
2. Improve weak commercial pages and connect informational traffic to relevant condo, availability, flight, car-rental, and activity paths.
3. Move page-specific GTM metadata/schema into version-controlled page code, then retire the duplicate GTM injections at cutover.
4. Keep the GTM container for analytics and measurement, not as the long-term content-management system for SEO markup.

## Verified Search Console baseline

Three-month domain totals observed in the signed-in Search Console property:

- 8,675 clicks
- 432,189 impressions
- 2.0% average CTR
- 7.4 average position

### Pages carrying organic discovery

| Page | Clicks | Impressions | Migration decision |
|---|---:|---:|---|
| Destin fireworks 2026 | 4,075 | 77,855 | Tier 1: preserve and improve carefully |
| Best beaches in Destin | 1,873 | 118,028 | Tier 1: preserve and improve carefully |
| Best restaurants in Destin | 778 | 74,949 | Tier 1: preserve and improve carefully |
| Destin events 2026 | 757 | 23,910 | Tier 1: preserve and improve carefully |
| Destin weather | 454 | 52,451 | Tier 1: preserve live functions and copy |
| Destin live music | 317 | 13,273 | Tier 1: preserve and improve carefully |
| Live beach cam | 167 | 5,917 | Tier 1: preserve working streams and URLs |
| Car-rental guide | 55 | 3,148 | Strengthen commercial intent and tracking |
| Best time to visit | 53 | 23,061 | Preserve; improve condo-planning links |
| Spa guide | 30 | 4,224 | Preserve; improve related-stay path |
| Airport guide | 23 | 23,545 | High-impression opportunity; improve CTR |
| Homepage | 20 | 1,308 | Reposition for direct-booking intent |
| Resort guide | 8 | 2,726 | Restore missing depth; improve booking path |
| Unit 707 | 7 | 281 | Preserve rental schema; improve exact-unit intent |
| Unit 1006 | 1 | 120 | Preserve rental schema; improve exact-unit intent |

### Commercial pages with impressions but weak clicks

| Page | Clicks | Impressions | Required action |
|---|---:|---:|---|
| Properties | 0 | 459 | Replace weak label/intent with vacation-rental collection page |
| Map | 0 | 436 | Keep as supporting utility; connect to units and resort |
| Activities | 0 | 262 | Clarify activity-search value and affiliate journey |
| Book | 0 | 160 | Make exact-unit selection, guest count, total, and checkout unmistakable |
| Availability | 0 | 65 | Present live results, full totals, and direct routes to exact units |

This proves that the site must remain more than a travel blog, but deleting or thinning the guides would destroy the traffic source that can feed commercial pages.

## Verified Search Console enhancements

- Breadcrumbs: 44 valid
- Datasets: 7 valid
- Events: 20 valid
- Review snippets: 307 valid
- Vacation rental: 53 valid, 2 invalid
- Videos: 7 valid

Cutover must not reduce these valid-item families. The two invalid vacation-rental items must be diagnosed separately rather than copied blindly.

## Production versus preview content findings

The following are rendered-word-count differences from paired production and preview crawls. Word count is not a ranking target by itself; it is a loss detector.

| Page | Production | Preview | Delta | Status |
|---|---:|---:|---:|---|
| Homepage | 880 | 809 | -71 | Reconcile |
| Vacation-rental collection | 342 | 854 | +512 | Expanded |
| Availability | 176 | 389 | +213 | Expanded |
| Book | 142 | 368 | +226 | Expanded |
| Unit 707 | 1,197 | 1,203 | +6 | Reconciled and expanded |
| Unit 1006 | 1,205 | 1,208 | +3 | Reconciled and expanded |
| Resort | 1,690 | 1,755 | +65 | Reconciled and expanded |
| Reviews | 149 | 467 | +318 | Expanded |
| Fireworks | 2,039 | 2,134 | +95 | Protected |
| Beaches | 3,525 | 3,605 | +80 | Protected |
| Restaurants | 2,242 | 2,643 | +401 | Protected |
| Events | 2,858 | 2,945 | +87 | Protected |
| Weather | 3,483 | 3,550 | +67 | Protected |
| Live music | 2,398 | 2,496 | +98 | Protected |
| Trip planner | 965 | 987 | +22 | Reconciled and expanded |
| AI concierge | 1,056 | 1,125 | +69 | Reconciled and expanded |
| About | 588 | 608 | +20 | Reconciled and expanded |
| Privacy | 1,078 | 1,123 | +45 | Reconciled and expanded |

The airport guide returned no comparable rendered content during the automated preview crawl and requires a direct route/render check before approval.

## Canonical and indexing findings

- Preview pages intentionally use `noindex,nofollow`. This must remain until the production-domain cutover.
- Multiple migrated blog components defined canonical values but did not render them. This was corrected in the preview branch for all affected migrated guides.
- Canonicals were added to the homepage, resort, reviews, and unit pages.
- Canonicals must always point to the final production-domain clean URL, never the Vercel preview hostname.
- `/book` currently behaves as part of the availability/checkout journey. Its canonical/redirect policy must be finalized so two indexable pages do not compete for the same intent.

## GTM audit

Verified container: `GTM-PQSF8S6D`  
Verified account/container: Destin Condo Getaways / `www.destincondogetaways.com/`

Observed tags include:

- `707` — VacationRental JSON-LD for Unit 707
- `1006` — VacationRental JSON-LD for Unit 1006
- `airport schme` — airport-page schema
- `Artice car` — car-guide structured data
- `beaches` — beach-guide structured data
- `market FAQ` and `schme market` — market/supermarket schema
- `Meta Description` — page-specific metadata injection
- `REviews thing` — all-pages custom HTML
- `rest` — restaurant structured data
- `sicak su` — water-temperature structured data
- `Tears of bread` — breadcrumb structured data
- Microsoft Clarity — all pages

The Unit 707 tag was inspected directly and contains a `VacationRental` object with its old URL, name, description, images, phone, email, address, and page-specific trigger. The preview unit page already owns a richer version-controlled VacationRental/WebPage/Breadcrumb graph. Both must not run together after cutover.

### GTM migration rule

At cutover:

- Keep GTM/GA4/Clarity and commercial-event tracking.
- Retire page-specific SEO metadata and JSON-LD injections only after their code-owned replacements pass validation.
- Do not publish both the legacy GTM schema and the new page schema on the same final page.
- Archive a container export before changing GTM.

No GTM changes are authorized or made by this audit.

## GA4 evidence and measurement requirements

Signed-in GA4 property access was verified for account `a301266948`, property `p425988639`. Acquisition channels include Organic Search, Direct, Organic Social, Paid Social, and AI Assistant.

Before cutover, preserve the GA4 measurement ID and verify these events end to end:

- availability search submitted
- unit selected from availability results
- unit detail viewed with dates/guests retained
- complete total displayed
- booking checkout started
- inquiry submitted
- flight link clicked
- car-rental link clicked
- activity affiliate link clicked
- chat opened and meaningful chat engagement

## Structured-data ownership model

| Page family | Required code-owned schema |
|---|---|
| Homepage | Organization, LodgingBusiness, WebSite/WebPage, BreadcrumbList where applicable, visible FAQ only |
| Unit pages | VacationRental, Accommodation details, WebPage, BreadcrumbList, visible reviews |
| Resort | LodgingBusiness/Place, VacationRental references, FAQPage, BreadcrumbList |
| Reviews | LodgingBusiness with visible aggregate rating/reviews, BreadcrumbList |
| Guides | Article/BlogPosting, BreadcrumbList, visible FAQPage, LodgingBusiness reference |
| Events/fireworks/music | Article plus valid Event entities only for visible, supportable events |
| Beach cams/video | VideoObject for live/embedded streams with accurate URLs and thumbnails |
| Planner/concierge | WebApplication or SoftwareApplication only when properties are accurate and visible |

Schema must describe visible page content. It must not manufacture offers, ratings, events, availability, or prices.

## Page-by-page priority plan

### Tier 1 — protect before any cutover

1. Fireworks
2. Beaches
3. Restaurants
4. Events
5. Weather
6. Live music
7. Beach cams

For each: preserve its old intent coverage, headings, substantive copy, interactive/live tools, internal links, media, canonical, metadata, and valid schema. Add commercial links where contextually useful without turning the guide into an advertisement.

### Tier 2 — repair commercial conversion

1. Homepage
2. Vacation-rental collection
3. Availability
4. Unit 707
5. Unit 1006
6. Book/checkout
7. Resort
8. Reviews

The booking flow must retain dates and guests, identify available units, show the exact complete total from the reservation system, expose its charge breakdown, and lead to secure checkout without misleading locally calculated pricing.

### Tier 3 — high-impression opportunities

1. Airport guide
2. Best time to visit
3. Car-rental guide
4. Flights and cars guide
5. Activities
6. Map

Improve titles/descriptions for search intent, strengthen useful content, and create measurable commercial paths without adding unsupported claims.

### Tier 4 — content reconciliation required

1. Trip planner
2. AI concierge
3. About
4. Privacy

These currently lose substantial production content and cannot be approved until every meaningful old section is marked preserved, improved, merged, intentionally removed, or legally superseded.

## Cutover gates

The migration is not approved until all gates pass:

1. Every indexed/known old URL has a final destination: retained URL, one-hop 301, deliberate 410, or justified noindex.
2. Tier 1 content reconciliation is complete.
3. Unit, resort, reviews, events, breadcrumbs, and video structured data validate without critical errors.
4. Preview canonicals resolve to final production URLs; preview remains noindex until cutover.
5. Sitemap contains only canonical 200-status indexable URLs.
6. Robots rules, HTTPS, www/non-www, and trailing-slash behavior are deterministic.
7. Booking-flow tests pass on desktop and mobile using live reservation-system results.
8. GTM/GA4/Clarity load once, and the commercial events above are observed.
9. No duplicate legacy GTM JSON-LD remains after code-owned replacements go live.
10. Mobile performance, accessibility, SEO, and agentic-browsing audits are rerun on representative templates.
11. Search Console baseline and enhancement counts are archived for post-cutover comparison.
12. Rollback instructions and the pre-cutover DNS/hosting configuration are documented.

## Immediate implementation already completed in preview

- Restored rendered canonicals across thirteen migrated guide pages.
- Added canonical links to the homepage, resort, reviews, and unit templates.
- Added a homepage Organization/LodgingBusiness/Breadcrumb/FAQ JSON-LD graph so the core business identity no longer depends solely on GTM.
- Preserved preview `noindex,nofollow` behavior.
- Restored substantive resort content covering exact-unit comparison, complete-price comparison, occupancy, central-Destin booking context, seasonality, and internal planning paths.
- Expanded the trip planner with visible explanations of its inputs, group-aware pacing, weather flexibility, operator verification, and how to use the generated itinerary.
- Expanded the AI concierge page with visible examples of conversational follow-ups, retained trip context, ambiguity handling, source verification, secure-checkout boundaries, and owner escalation.
- Expanded About, Privacy, and both unit templates so they preserve owner-trust, data-use, AI-chat, analytics, exact-guest-count, and complete-total explanations that existed or were implied in the current site.

## Google, Bing, and AI-search implementation standard

The migration follows the current official guidance rather than adding a separate layer of invented “AI SEO” markup:

- Google states that pages eligible for AI Overviews and AI Mode use the same foundational search requirements: crawlable canonical pages, useful textual content, discoverable internal links, strong page experience, helpful images, and structured data that matches visible content.
- Google explicitly states that there is no special AI schema or separate machine-readable AI file required. The migration will not add unsupported schema solely to advertise AI readiness.
- Bing states that the same crawl, indexing, clarity, authority, and trust signals support classic search, Copilot grounding, and AI citations. Each important URL therefore needs a focused topic, explicit facts, crawlable internal links, canonical inclusion in the sitemap, and accurate structured data.
- Bing recommends XML sitemaps plus IndexNow for timely discovery. IndexNow belongs in the post-cutover publishing workflow, after the canonical production URLs are final; it must not announce preview URLs.
- Important answers must exist in visible HTML, not only in widgets, images, chat transcripts, or JSON-LD. This is why the resort, planner, concierge, booking, and unit explanations are being expanded in the page body.
- Content length is used only as a migration-loss detector. Additions must help a guest choose, plan, verify, or book; no page will be padded to reach an arbitrary word count.

Official references reviewed August 17, 2026:

- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search
- https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a
- https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview

These changes are preview-only and require build, link, rendered-head, and structured-data validation before push.
