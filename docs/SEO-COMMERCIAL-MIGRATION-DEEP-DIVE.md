# Destin Condo Getaways: SEO, Rich Results and Commercial Migration Plan

Audit date: 2026-08-16
Scope: current OwnerRez production site, Search Console evidence supplied/inspected during the migration, and the `website/homepage-preview` implementation
Status: strategy and migration gate; not a production-cutover approval

## Executive decision

The site does **not** need to become less useful as a Destin guide. Its informational pages are the reason Google already trusts the domain. The problem is that this authority is not consistently transferred to the pages that can earn revenue.

The correct strategy is a two-engine site:

1. **Demand capture:** retain and strengthen the pages that answer fireworks, beaches, restaurants, weather, events and music searches.
2. **Commercial conversion:** create clear, crawlable destinations for beachfront condo rentals, live availability, Unit 707, Unit 1006, car rentals, flights and activities; connect every relevant guide to the appropriate commercial next step.

Do not turn every article into a sales page. Instead, make the next useful action obvious at the point where the reader's intent changes.

## Search Console baseline: what must be protected

Current three-month Search Console totals recorded during this audit:

- 8,699 clicks
- 432,673 impressions
- 2.0% CTR
- average position 7.4
- 57 URLs receiving impressions

The domain's current organic engine is concentrated in six pages:

| Current URL | Clicks | Impressions | Position | Decision |
|---|---:|---:|---:|---|
| `/blog/destin-fireworks-2026` | 4,091 | 78,218 | 5.3 | Preserve URL and intent; update carefully |
| `/blog/best-beaches-destin` | 1,889 | 118,026 | 7.1 | Preserve; improve CTR and condo/activity handoffs |
| `/blog/best-restaurants-destin` | 764 | 74,701 | 7.8 | Preserve; strengthen snippets and local utility |
| `/blog/destin-events-2026` | 756 | 24,114 | 6.5 | Preserve; maintain dates and official-source links |
| `/blog/destinweather` | 463 | 53,078 | 6.0 | Preserve; improve CTR and weather-to-planning actions |
| `/blog/destin-live-music-2026` | 315 | 13,233 | 6.6 | Preserve; improve event freshness and venue verification |

These six pages account for approximately 95% of recorded clicks. They must not be casually renamed, merged, shortened or redirected during the hosting migration.

### Commercial weakness visible in Search Console

| Page or topic | Current signal | Meaning |
|---|---|---|
| Homepage | 21 clicks / 1,316 impressions / position 25.3 | Weak non-brand commercial relevance |
| Resort guide | 9 / 2,724 / 20.6 | Demand exists; page is not competitive enough |
| `/properties` | 0 / 459 / 28.8 | Generic route and thin search purpose |
| `/availability` | 0 / 65 / 17.3 | Useful conversion page, not a strong acquisition page |
| `/book` | 0 / 161 / 28.0 | Transaction page should convert, not carry the whole SEO burden |
| Unit 707 | 7 / 280 / 8.0 | Valuable ranking; preserve identity and exact redirect |
| Unit 1006 | 1 / 120 / 7.4 | Valuable ranking; preserve identity and exact redirect |
| `destincar` | 55 / 3,144 / 6.8 | Existing authority worth turning into a stronger car-rental funnel |
| `destinairport` | 22 / 23,493 / 9.3 | Major CTR opportunity and natural bridge to flights/cars |
| external car-rental tool | 8 / 2,888 / 24.4 | Fragmented subdomain signal and weak landing-page relevance |
| activities tool | 0 / 263 / 14.3 | Tool exists but lacks a strong first-party acquisition page |
| flight/car article | 0 / 6 / 5.2 | Almost no demand captured despite a good nominal position |
| deals page | 5 / 189 / 16.8 | Useful conversion mechanism but isolated on a subdomain |

## Target information architecture

### Primary booking cluster

| Clean route | Search purpose | Primary action |
|---|---|---|
| `/` | Brand + Destin beachfront condo overview | Search live availability |
| `/destin-beachfront-condo-rentals` | Main commercial collection page | Compare and select a unit |
| `/pelican-beach-resort-unit-707` | Exact property listing | Check dates / continue to secure checkout |
| `/pelican-beach-resort-unit-1006` | Exact property listing | Check dates / continue to secure checkout |
| `/availability` | Live availability comparison | Open current OwnerRez results |
| `/book` | Transactional booking flow | Complete secure booking |
| `/pelican-beach-resort-destin` | Resort/location research | Move to matching condo or availability |
| `/destin-condo-rental-reviews` | Trust and proof | Continue to availability |
| `/destin-condo-photo-gallery` | Visual consideration | Open a unit or availability |
| `/pelican-beach-resort-condo-virtual-tours` | High-intent visual inspection | Open a unit or availability |

The old `/properties` route should 301 directly to `/destin-beachfront-condo-rentals`. Do not redirect it to the homepage or availability page; the new collection page is the closest intent match.

### Travel-planning commercial cluster

| Recommended route | Role | Relationship to existing content |
|---|---|---|
| `/destin-airport-car-rentals` | Commercial car-rental landing page with live affiliate tool | Distinct from the long educational `destincar` guide |
| `/flights-to-destin-florida` | Flight-search landing page | Supported by `destinairport` and the cheaper-flights guide |
| `/things-to-do-in-destin` | Activities landing page with TripShock browsing tool | Supported by beaches, kids, romance, water, events and itinerary content |
| `/destin-condo-deals` | Current reduced-date discovery | Replace `deals.` subdomain destination after validation |
| `/snowbird-rentals-destin-fl` | Monthly winter stay landing page | Replace `sunbirds.` subdomain destination |
| `/destin-vacation-itinerary-planner` | Personalized itinerary tool | Route activities, dining and stay interest to relevant pages |

Informational guides should remain articles. Commercial landing pages should contain enough unique explanatory content to rank, but their main job is helping the visitor take action.

## Page-by-page plan

### Homepage `/`

**Intent:** Destin beachfront condo rental + brand trust.
**Required improvements:**

- One descriptive H1 containing “Destin beachfront condo rentals” and Pelican Beach Resort without keyword stuffing.
- Put the live availability form in the first screen and keep its labels server-rendered.
- Add a short, visible proof block: owner-managed, Gulf-front location, occupancy, review count, secure OwnerRez checkout.
- Link prominently to the condo collection, both unit pages, resort guide and reviews.
- Use secondary planning links for car rentals, flights and activities; do not let them compete with the booking CTA.
- Add concise visible FAQ content only where it helps users; do not expect an FAQ rich result.
- JSON-LD: `WebSite`, `Organization`, `LodgingBusiness` and homepage `WebPage`. Keep one stable `#business` ID and one authoritative NAP object.
- Do not attach unit-specific `VacationRental` objects to the homepage.

### Condo collection `/destin-beachfront-condo-rentals`

**Intent:** “Destin vacation rentals by owner,” “Destin beachfront condo rentals,” and Pelican Beach Resort condo comparison.
**Required improvements:**

- Make this the strongest commercial SEO page rather than a generic `/properties` page.
- Explain the common resort/location benefits once; compare only the meaningful differences between Units 707 and 1006.
- Include image-led unit cards, occupancy, bed setup, floor, style and direct links.
- Include owner-direct benefits without repeating a full “Why Book Direct” essay several times.
- Use `CollectionPage`, `ItemList`, `BreadcrumbList`; reference, but do not duplicate, each unit's complete `VacationRental` object.
- Internal links: resort, availability, reviews, gallery, virtual tours, book, airport/car, flights and activities.

### Unit 707 and Unit 1006

**Intent:** exact listing and long-tail unit searches.
**Required improvements:**

- Protect each page as an independent canonical URL; old OwnerRez URL must 301 directly to its matching clean URL.
- Preserve all unique OwnerRez listing facts, policies, photos, descriptions and review evidence.
- Place date/guest selection and secure checkout above long descriptive text.
- Ensure every gallery image has useful, non-repetitive alt text and explicit dimensions; provide lightbox behavior.
- Add visible review excerpts with source links to Airbnb/VRBO where permitted.
- JSON-LD: one complete `VacationRental` per unit, plus `WebPage` and `BreadcrumbList`. Use at least eight representative images and include bedroom, bathroom and common-area images.
- Validate exact address including unit number, latitude/longitude precision, stable identifier, occupancy, beds, floor size, bathroom count, amenities, check-in/out and dated reviews.
- Do not duplicate the same unit as both `VacationRental` and multiple competing `LodgingBusiness` objects.
- Important eligibility caveat: Google's dedicated VacationRental search integration currently requires Hotel Center/TAM eligibility; valid schema alone does not guarantee entry into that feature.

### Availability `/availability`

**Intent:** conversion, not broad discovery.
**Required improvements:**

- Retain searchable dates, guest counts, multi-month calendars and map/location context.
- Provide plain-language states for available, unavailable, today and minimum-stay limitations.
- Every selection must lead into the current OwnerRez booking/checkout flow with parameters intact.
- JSON-LD: `WebPage` and `BreadcrumbList`; do not invent `Offer` markup unless a visible, current price and valid availability are present on the page.
- Add `noindex` only if it produces effectively infinite query combinations; the clean base page itself should be indexable if it has unique useful content.

### Book `/book`

**Intent:** complete booking.
**Required improvements:**

- Prioritize working OwnerRez widget/functionality, security context, accepted payments and cancellation-policy access.
- Avoid competing affiliate or blog exits once the user enters checkout.
- Track search, unit selection, checkout initiation and booking completion in GA4/GTM.
- JSON-LD should remain minimal: `WebPage`, `BreadcrumbList`, and a reference to the business. Do not publish speculative prices.

### Resort `/pelican-beach-resort-destin`

**Intent:** resort research with commercial next step.
**Required improvements:**

- Keep it independent: it already has 2,724 impressions.
- Cover location, beach access, pool/amenity reality, layout, parking, resort rules, nearby dining and who the resort suits.
- Remove unit-detail duplication; link to the collection and unit pages.
- Add original maps/photos and a concise comparison between Pelican Beach main building and nearby similarly named buildings where useful.
- JSON-LD: `WebPage`, `BreadcrumbList`, `Place` or accurately scoped lodging entity. Do not claim to own or represent the entire resort.

### Why Book Direct

**Decision:** keep temporarily, but demote from primary navigation while data is monitored.
**Required improvements:**

- Consolidate its strongest trust and direct-booking content into the condo collection and homepage.
- If the remaining page has little independent query/backlink value, 301 it to the condo collection after Search Console query/link review.
- Avoid numeric savings claims unless phrased and supported accurately (“save up to 20% compared with some platform totals,” not a universal guarantee).

### Reviews `/destin-condo-rental-reviews`

**Intent:** brand validation and pre-booking trust.
**Required improvements:**

- Keep visible review excerpts, reviewer attribution/date where available, property context, photos, and outbound source links.
- Do not expect self-serving `LocalBusiness` review stars. Google does not show self-controlled LocalBusiness/Organization stars simply because they validate.
- Unit-level reviews may remain within accurate `VacationRental` markup when requirements are satisfied.
- Use `WebPage`, `BreadcrumbList` and visible `Review` data cautiously; never merge ratings from incompatible sources without explaining the basis.

### Gallery and virtual tours

**Intent:** visual consideration.
**Required improvements:**

- Keep them separate because the interaction differs: photos versus immersive tours.
- Use crawlable `<img>` elements, descriptive alt text, width/height, responsive sources and compressed formats.
- Add captions and deep links to the correct unit rather than generic “book now” buttons.
- For virtual tours, use `VideoObject` only if the content meets Google's video requirements; otherwise use `MediaObject`/`WebPage` and descriptive visible text.

### Map `/map`

**Intent:** location proof and local orientation.
**Required improvements:**

- Keep the map page, add crawlable visible text describing the address, beach relationship, VPS travel context and nearby landmarks.
- Link to resort, airport, car rental, unit pages and availability.
- JSON-LD: `WebPage`, `BreadcrumbList`, `Place`; the embedded map itself is not enough content for ranking.

### FAQ `/destin-condo-rental-faq`

**Intent:** remove booking objections and reduce support friction.
**Required improvements:**

- Keep a standalone crawlable FAQ page and selected contextual FAQs on relevant pages.
- Accordion text is readable by Google when it exists in the rendered HTML and is available to users.
- Maintain `FAQPage` only as semantically accurate markup, not as a promise of a Google FAQ expansion; Google removed broad FAQ rich-result availability.
- Questions should link to booking, policies, guest guide and accessibility/occupancy facts where applicable.

### Destin AI concierge, planner and guest guide

- `/destin-ai-concierge`: `SoftwareApplication` or `WebApplication`, `WebPage`, `BreadcrumbList`; clearly disclose AI and explain what it can and cannot do.
- `/destin-vacation-itinerary-planner`: retain working email flow; use `WebApplication`, visible FAQs and contextual links to activities/stays.
- `/guest-guide`: primarily guest-support intent; keep indexable only if it contains useful public pre-booking information. Separate sensitive or booking-specific content behind authenticated links.

### About, privacy and contact

- `/about`: strengthen owner identity and trust without publishing unnecessary personal details; use `AboutPage`, `Person`, `Organization`, breadcrumb.
- `/privacy`: accurate policy text, effective date, data processors and contact route; use `WebPage` and breadcrumb, not commercial schema.
- Maintain consistent phone, email, address, brand name and Facebook URL site-wide.

## Informational content plan

### Tier 1: protect and improve, never casually rename

- Fireworks
- Best beaches
- Best restaurants
- Events
- Weather/water temperature
- Live music
- Beach cams

For each: preserve URL, verify facts and dates, improve title/meta CTR, include a visible updated date, link to official sources, and place one contextually correct commercial module after the user receives value.

### Tier 2: high-impression opportunities

- `best-time-to-visit-destin-florida`: 22,758 impressions and only 0.2% CTR—rewrite title/meta against actual query mix before changing body content.
- `destinairport`: 23,493 impressions and 0.1% CTR—major snippet/intent mismatch; connect it to VPS/ECP comparison, flight search and car rental.
- `destinspa`: position 17—needs query targeting, local entity clarity and stronger originality.
- `destincar`: preserve existing ranking, add stronger links to the dedicated rental tool.

### Tier 3: consolidate only after query/backlink review

- Two restaurant guides
- `destinocen`, `destinexplore`, `destinkids`
- AI concierge/direct-booking articles versus the commercial condo page
- `destinessentials` versus supermarket/local-services content

Do not merge solely because topics overlap. Merge when the pages compete for the same query intent and the weaker page has no unique links, traffic or useful content.

## Commercial internal-link rules

1. Every article gets a **primary next action chosen by intent**, not the same CTA everywhere.
2. Beaches/water/kids/romance pages link to `/things-to-do-in-destin` when recommending bookable activities.
3. Airport/transport pages link to `/flights-to-destin-florida` and `/destin-airport-car-rentals`.
4. Weather/best-time/events pages link to availability only after giving the requested information.
5. Resort/reviews/gallery/virtual-tour pages link directly to the condo collection or matching unit.
6. All commercial pages link back to supporting evidence pages: resort, reviews, policies and relevant guides.
7. Replace every internal link that still points to OwnerRez-numbered URLs or old subdomains with its final clean route before cutover.

Current code still references legacy destinations extensively:

- `deals.` host in 23 files
- `explore.` host in 22 files
- `offer.` host in 10 files
- `sunbirds.` host in 5 files
- old numbered resort URL in 19 files
- old numbered About URL in 18 files
- old numbered AI concierge URL in 20 files

These are migration debt, not harmless cosmetic links.

## JSON-LD architecture

### Site-wide graph

Create one reusable graph generator with stable IDs:

- `https://www.destincondogetaways.com/#website`
- `https://www.destincondogetaways.com/#organization`
- `https://www.destincondogetaways.com/#business`
- owner `Person` ID if used

Do not copy a complete business/review object into every article. Reference its `@id`.

### By page type

| Page type | Recommended schema |
|---|---|
| Homepage | WebSite, Organization, LodgingBusiness, WebPage |
| Condo collection | CollectionPage, ItemList, BreadcrumbList |
| Unit | VacationRental, WebPage, BreadcrumbList, Reviews where valid |
| Article | Article or BlogPosting, WebPage, BreadcrumbList; FAQ only when visible |
| Events guide | Article + individual Event objects only for real discrete events with required dates/location/status |
| Activity landing | CollectionPage/ItemList; Product/Offer only when actual visible bookable data is present |
| Software tools | SoftwareApplication/WebApplication, WebPage, BreadcrumbList |
| Video/cam page | VideoObject only for playable, indexable videos with valid thumbnail/upload/live metadata |

### Remove or correct

- Remove `Event` schema from the make-an-offer form; submitting a rate inquiry is not an event.
- Stop marking every article as a separate full `LodgingBusiness`.
- Eliminate duplicate breadcrumbs, duplicate business entities and conflicting aggregate ratings.
- Do not use `Offer` for a link that merely opens a third-party browsing page with no visible current price.
- Do not use rich-result types simply because Rich Results Test says “valid”; the page must match Google's feature guidelines and visible content.

## Technical SEO and migration blockers

### Critical before production

1. **Robots:** preview pages intentionally use `noindex,nofollow`; production needs an environment-controlled indexing policy. Do not manually remove tags page by page.
2. **Sitemap:** the checked-in `public/sitemap.xml` points to subdomains and is not a complete canonical sitemap for the migrated site. Replace it with one generated from final routes and real `lastmod` dates.
3. **Robots sitemap target:** current `robots.txt` points at `https://deals.destincondogetaways.com/sitemap-vercel.xml`; production must point at the canonical main-domain sitemap.
4. **Redirect map:** `next.config.js` currently redirects only five legacy paths. Build and test a complete one-to-one map for every indexed OwnerRez and subdomain URL.
5. **Canonicals:** every indexable page must self-canonicalize to the final `www` URL. Never canonicalize a preview URL to a page that has different content indefinitely.
6. **Internal links:** update all old-numbered and subdomain links to final URLs so users and Google do not traverse redirects.
7. **404/410:** genuinely retired pages need 404/410 or the closest true consolidated destination; do not mass-redirect everything to the homepage.
8. **Query URLs:** booking/date parameters should canonicalize appropriately and avoid generating an indexable URL explosion.

### Performance and accessibility

The existing Lighthouse evidence showed mobile performance around 47, LCP around 36.7 seconds and a payload near 14 MB. This is an SEO and conversion problem, not polish.

Priority work:

- convert oversized hero/destin-condo-photo-gallery images to responsive AVIF/WebP and size them correctly;
- preload only the true LCP image and avoid lazy-loading it;
- lazy-load below-the-fold galleries, maps, Kuula tours, chat and affiliate tools;
- reserve dimensions for images/iframes/chat to prevent layout shift;
- remove unused CSS/JS and render essential titles/text server-side;
- fix accessible names, alt attributes, contrast and malformed ARIA trees;
- keep mobile availability and booking actions usable without overlays covering content.

## Metadata and SERP plan

- Write titles from actual Search Console query families, not a fixed keyword formula.
- Use unique descriptions that answer “why this result” and include a truthful next action.
- Add Open Graph/Twitter metadata for pages likely to be shared; this does not directly improve rankings but improves presentation and referral CTR.
- Use one H1 per page and a logical H2/H3 outline.
- Dates on articles must reflect real publication and meaningful modification, not automatic daily refreshes.
- Do not promise “best price,” “save 20%,” live inventory or live event confirmation unless the page supports the claim.

## Measurement plan

Configure GA4/GTM events with stable names:

- `availability_search`
- `unit_view`
- `checkout_start`
- `ownerrez_handoff`
- `activity_click`
- `car_rental_click`
- `flight_search_click`
- `deal_view`
- `chat_open`
- `planner_submit`
- `contact_click`

Include page path, content cluster, unit, dates/guest count only where privacy-safe, and outbound partner. Mark true booking/lead events as conversions. Preserve existing GTM container and Search Console verification during migration.

## Migration sequence

### Phase 0 — evidence lock

- Export 16 months of Search Console pages, queries, devices and countries.
- Export GA4 landing pages and conversions, backlinks, current sitemap and all indexed URLs.
- Crawl production, including titles, descriptions, canonicals, H1s, status codes, internal links, images and JSON-LD.
- Save the complete old-to-new URL ledger.

### Phase 1 — technical foundation

- Centralize metadata, canonical and JSON-LD builders.
- Implement production/preview robots control.
- Generate sitemap and redirect tests.
- Standardize header/footer/live-availability components and analytics.

### Phase 2 — money pages

- Finish homepage, condo collection, unit pages, availability, book, resort, reviews, gallery and virtual tours.
- Build car-rental, flights and activities landing pages on the main domain while preserving tool functionality.
- Add context-specific internal links from relevant articles.

### Phase 3 — traffic pages

- Migrate Tier 1 articles one by one without changing URLs.
- Improve the high-impression/low-CTR pages using their real query data.
- Resolve only evidence-backed cannibalization.

### Phase 4 — validation

- Crawl preview with JavaScript rendering.
- Validate schema with Schema.org validator and eligible types with Rich Results Test.
- Test mobile layout, Core Web Vitals, keyboard access, images, forms, chat and OwnerRez handoffs.
- Test every redirect directly to its final 200 destination with no chain.

### Phase 5 — controlled cutover

- Remove production `noindex` through the environment switch.
- Activate redirects, canonical sitemap and robots together.
- Submit sitemap and inspect representative URLs in Search Console.
- Monitor old/new URL traffic, indexing, rich-result errors, 404s, rankings and conversions daily for the first two weeks, then weekly.
- Keep permanent redirects for at least one year and preferably indefinitely.

## Priority backlog

### Competitive performance benchmark

Use `https://www.destincondorent.com/` as the primary competitor benchmark across homepage, condo, resort, booking, review, guide and commercial-intent templates. The August 16, 2026 PageSpeed evidence supplied by Ozan establishes this baseline:

| Measurement | Competitor baseline |
| --- | ---: |
| Desktop Lighthouse performance | 91 |
| Mobile Lighthouse performance | 48 |
| Desktop accessibility | 87 |
| Mobile accessibility | 92 |
| Desktop best practices | 54 |
| Mobile best practices | 50 |
| SEO | 100 |
| Agentic Browsing | 2/2 |
| Desktop field CLS | 0.38 (failed) |
| Mobile field CLS | 0.13 (needs improvement) |

The migrated Destin Condo Getaways site must not merely equal the competitor's strongest isolated scores. It should achieve **SEO 100 and Agentic Browsing 2/2 while materially beating its mobile performance, accessibility, best-practices and layout-stability results**. Compare like-for-like page templates and record dated mobile and desktop results before cutover. Avoid optimizing a Lighthouse score at the expense of booking functionality, analytics, content depth or real-user Core Web Vitals.

Performance is only one part of this competitive target. `destincondorent.com` is also the primary **organic visibility and direct-booking benchmark**. Maintain a Google and Bing query scorecard covering high-booking-intent terms such as Destin beachfront condo rentals, Destin vacation rentals by owner, Pelican Beach Resort condo rentals, direct booking, unit/bedroom searches, reviews, availability and related long-tail combinations. Record for each query: ranking URL, position, title/snippet, rich result, competitor presence, landing-page intent, booking CTA and conversion evidence. The objective is to grow qualified organic entrances and direct bookings—not merely outrank a competitor on informational phrases.

Initial search evidence on August 16, 2026 shows the competitor surfacing dedicated commercial pages including `/book-all/` and `/vacation-rentals-by-owner/`. Destin Condo Getaways therefore needs equally clear or stronger canonical pages for booking, condo collection, individual units and Pelican Beach Resort intent, supported by contextual guides rather than operating mainly as a travel blog.

#### Homepage comparison — August 16, 2026

Destin Condo Getaways is currently ahead in visual refinement, semantic structure, labeled form controls, guest-count capture, owner-direct explanation, planning utility, FAQ coverage and the clarity of presenting the exact available units. The competitor is ahead in keyword-explicit hero messaging, visible inventory depth, review volume, repeated booking reinforcement, property/pelican-beach-resort-destin proof and mature commercial internal linking.

Immediate issues on the Destin Condo Getaways preview:

- the mobile Destiny promotion and chat controls obstruct the hero and availability journey, dim the page and create layout/conversion risk;
- the preview banner must never ship to production;
- the homepage H1 is emotionally stronger but less explicit about the primary search intent than the competitor's `Destin Condo Rentals Pelican Beach Resort` heading;
- several homepage and footer links still point to old OwnerRez or subdomain URLs instead of final migrated canonical routes;
- repeated `two condos` language overemphasizes limited inventory rather than the exact-condo, owner-managed value proposition;
- the unit cards need unmistakable real-unit photography and stronger direct paths to dates, price and booking;
- current proof (`4.94`, `400+ stays`, `1,000+ guests`) is credible but presented less forcefully than the competitor's `2500+ real reviews` claim, so authentic reviews, platform links and owner identity must do more trust work.

### Mandatory step-by-step order

Work through these gates sequentially. Do not begin the next gate until the current gate has been tested and accepted.

1. **Booking-flow integrity:** verify the complete path from every availability form and booking CTA through date/guest transfer, unit selection, live OwnerRez availability/pricing, secure checkout and confirmation. Confirm mobile and desktop behavior, back-navigation, invalid/unavailable dates, occupancy limits and tracking. No page should imply that a reservation is complete before OwnerRez confirms it.
2. **Logical inter-page linking:** audit every header, footer, card, contextual link and CTA. Each link must serve the visitor's current intent, use the final clean URL, avoid redirect chains, and lead naturally toward the next useful page. Articles should link contextually to the relevant condo, availability, activity, car or flight path instead of using the same sales CTA everywhere.
3. **Mobile performance and PageSpeed Agentic Browsing:** test every page template with PageSpeed/Lighthouse and a real cold mobile load. Measure Core Web Vitals, image and JavaScript weight, render blocking, caching and layout shifts. The explicit target is for PageSpeed's **Agentic Browsing** audit to recognize the migrated site and pass **2/2**, not merely for the site to claim that it is AI-friendly. Resolve every reported agent-accessibility failure, including malformed accessibility trees, layout instability affecting agents, unnamed controls, nonsemantic navigation, non-crawlable links and primary interactions that depend exclusively on visual or delayed client-side behavior.
4. Final URL and redirect ledger.
5. Canonicals, sitemap, robots and indexing controls.
6. JSON-LD and rich-result validation.
7. **Full presentation, accessibility and broken-link QA:** crawl every route and inspect the shared templates on mobile and desktop. Include character-encoding and typography checks for mojibake, replacement symbols, malformed emoji/icons, smart-quote/dash corruption and text that renders differently on mobile. Also verify contrast, accessible names, keyboard behavior, image alternatives, link status and external embeds.
8. **GA4 YTD, Search Console, GTM and conversion-event verification:** use the year-to-date GA4 property as migration evidence, not just a post-launch check. Record traffic and conversions by landing page, channel, source, device and user journey; identify pages that generate organic, AI-assistant, referral and paid traffic before deciding whether to merge or redirect them. Reconcile every important GA4 event with its GTM tag, trigger and variable, then verify the same behavior on the migrated routes.
9. Controlled cutover and monitoring.

### P0 — blocks safe migration

- Complete URL/redirect ledger
- Production indexing switch
- Main-domain generated sitemap and corrected robots.txt
- Shared canonical/schema system
- Remove misleading schema
- Preserve GTM/Search Console verification
- Fix mobile LCP/image payload and major layout shift

### P1 — revenue opportunity

- Main condo collection page
- Dedicated car rental, flights and activities landing pages
- Contextual CTAs from the six traffic leaders
- Airport and best-time title/meta/query alignment
- End-to-end OwnerRez checkout analytics

### P2 — authority and trust

- Resort guide improvement
- Unit image/alt/review enrichment
- About/reviews/FAQ/entity consistency
- Local citations and source freshness for events/music/fireworks

### P3 — consolidation and cleanup

- Restaurant cannibalization review
- Thin-guide consolidation decisions
- Retire subdomains after all signals/functions move
- Remove legacy links and obsolete schema/content fragments

## Definition of done

The migration is not done when pages “look good.” It is done when:

- every valuable old URL has an evidence-based destination;
- all final pages return 200, self-canonicalize and are in the sitemap;
- previews remain non-indexed and production pages are indexable;
- no internal link points at a redirecting legacy URL;
- structured data is accurate, nonduplicated and matches visible content;
- Unit 707 and 1006 retain their listing identity and booking flow;
- every availability and booking entry point reaches the correct OwnerRez flow with dates, guest counts and unit context preserved;
- every internal link follows an intentional user journey, points directly to its final canonical URL and avoids unnecessary redirects;
- each production page template passes a documented mobile performance audit, has no unresolved high-impact Core Web Vitals regression, and exposes its primary content and navigation in crawlable semantic HTML;
- PageSpeed/Lighthouse reports **2/2 for Agentic Browsing** on the production page templates, with no malformed accessibility tree, unnamed primary controls or navigation that depends exclusively on visual/client-side interaction;
- a dated GA4 year-to-date baseline is preserved for landing pages, acquisition channels, AI-assistant traffic, engagement and conversion events, and the post-migration implementation can be compared directly against it;
- the six organic traffic leaders retain their query purpose;
- condo, car, flight and activity paths are measurable and easy to reach;
- mobile Core Web Vitals and accessibility are materially improved;
- Search Console shows no migration-driven spike in errors or invalid rich-result items.
