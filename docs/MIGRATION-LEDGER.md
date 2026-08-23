# Destin Condo Getaways Website Migration Ledger

Last updated: August 17, 2026
Working branch: `website/homepage-preview`
Draft review vehicle: PR #10
Production status: untouched

This is the authoritative operational record for the OwnerRez-hosted website to Vercel migration. A task is complete only when it is implemented, tested, and represented accurately here.

## Current position

The replacement site is substantially built and remains in preview. Core pages, booking discovery, unit pages, blogs, supporting tools, responsive navigation, chat, SEO foundations, analytics instrumentation, and local assets have been migrated or rebuilt. The public domain still points to the existing production website.

The remaining work is principally launch assurance: GTM reconciliation, final sitemap/robots validation, redirect reconciliation, authenticated Google/Bing checks, full responsive and functional dry run, DNS cutover, and post-launch monitoring.

## Non-negotiable launch rules

- Do not change production DNS or merge the launch branch until the final dry run passes.
- Preserve every valuable legacy URL with a direct permanent redirect to the closest relevant new page.
- Preserve booking query parameters: `or_arrival`, `or_departure`, `or_adults`, `or_children`, and `or_guests`.
- Do not expose OwnerRez as guest-facing platform terminology.
- Preview deployments must remain `noindex,nofollow`; production must become indexable only at cutover.
- Do not place personally identifiable booking data in analytics events or URLs beyond the existing non-PII stay parameters.
- Keep a tested rollback path for DNS and deployment.

## Verified completed work

### Site and content

- Shared responsive header and footer implemented.
- Homepage and principal conversion pages rebuilt.
- Unit 707 and Unit 1006 pages rebuilt with local media, photo galleries, booking controls, calendars, reviews, and virtual-tour integration.
- Resort, vacation-rental, availability, booking, reviews, gallery, virtual tours, trip planner, concierge, guest guide, FAQ, map, About, privacy, beach-cam, and blog index routes implemented.
- Commercial supporting experiences for deals, car rentals, activities, Destin Hub, snowbirds, and offers retained behind clean routes or rewrites.
- High-value blog inventory migrated and internally linked.
- Legacy copy/schema reconciliation evidence retained in the other documents under `docs/`.

### Booking flow

- Shared availability form standardised across all migrated pages.
- Dates and adult/child counts carry from search to availability results and onward to unit checkout.
- Unit-specific checkout displays complete live totals and charge details from the booking system.
- Canonical booking-flow regression test exists as `npm run test:booking-canonicals`.
- Availability layouts rendered consistently at desktop, tablet, and mobile widths.

### Responsive and visual system

- Shared availability component now controls field borders, heights, spacing, labels, and button presentation sitewide.
- Phone, tablet, laptop, desktop, and intermediate-width behavior has received targeted testing.
- Mobile proactive chat promotion was removed; the user-initiated chat bubble remains.
- Homepage slogan behavior is responsive: compact treatment on mobile and integrated signature treatment in the desktop hero.
- Planning cards and related-content links were clarified so interactive elements read as links.

### SEO and discoverability foundations

- Canonical production URLs and structured-data inventory are represented in the code and supporting audits.
- Strategic internal-link audit and routing checks are implemented.
- Booking query URLs are prevented from becoming competing canonical index targets.
- Production `robots.txt` points crawlers to the single authoritative sitemap at `https://www.destincondogetaways.com/sitemap.xml`; non-production deployments block crawling.
- The dynamic production sitemap contains the intended canonical public route inventory, while the former `/sitemap-vercel.xml` address permanently redirects to it.
- Legacy redirect rules already exist in `next.config.js`; host-specific subdomain redirects exist in `vercel.json`.
- Preview SEO isolation remains intentional and must be removed/adjusted only during production cutover.

### Analytics and quality controls

- Site analytics events and booking/affiliate classification were implemented.
- Analytics isolation and PII protections have been audited in code.
- Automated checks exist for links, HTTP links, internal-link strategy, SEO, rendered search readiness, booking canonicals, cutover readiness, assets, and analytics.
- The site has been compared with `destincondorent.com` for performance, accessibility, payload, booking prominence, and responsive behavior.

## Existing automated checks

Run these before every launch-candidate commit:

```text
npm run test:site-links
npm run test:http-links
npm run test:link-strategy
npm run test:site-seo
npm run test:search-readiness
npm run test:booking-canonicals
npm run test:site-cutover
npm run test:site-assets
npm run test:site-analytics
npm run build
```

Known environment note: a local full build can stop on an existing TV preview route when Supabase environment variables are absent. The launch build must run with the actual Vercel environment configuration and must pass completely.

## Pending work in execution order

### 1. Google Tag Manager and GA4 audit — assessed; production validation pending, critical

- GTM tags, triggers, variables, custom HTML scripts, the pending workspace change, and live script loading have been inventoried read-only.
- Legacy OwnerRez URL patterns, duplicate-loader risks, obsolete SEO injection logic, and the Travelpayouts affiliate script have been identified.
- GTM has been reconciled with the new code-owned analytics architecture; see `docs/GTM-GA4-AUDIT.md`.
- Verify booking search, availability result, unit selection, checkout start, inquiry, outbound affiliate, phone, email, and chat events.
- Use Tag Assistant/Preview mode and GA4 DebugView.
- Ozan confirmed Microsoft Clarity and Travelpayouts must remain; verify both load exactly once and scope Travelpayouts away from booking/private workflows in production.

### 2. Sitemap and robots production validation — implemented; live cutover validation pending, critical

- [x] Expose one authoritative sitemap at `/sitemap.xml` and permanently redirect the former `/sitemap-vercel.xml` address.
- [x] Confirm every canonical indexable route appears once in the checked-in inventory.
- [x] Confirm no preview, API, TV, admin, chat-session, parameterised booking, duplicate `.html`, or legacy redirect URL appears.
- Add appropriate `lastmod` only when it can be maintained honestly.
- Verify correct XML content type, status 200, absolute HTTPS URLs, and production hostname.
- [x] Ensure production robots permits public crawling while excluding non-public utilities; preview deployments block crawling.
- Submit the final sitemap to both Google Search Console and Bing Webmaster Tools after cutover.

### 3. Redirect map reconciliation — staged and verified; live-domain validation pending

- `config/redirect-inventory.js` is the source of truth for 32 known OwnerRez/path aliases and four retired public subdomains; `config/legacy-redirects.js` derives the Next.js rules from it.
- `vercel.json` host rules are reconciled against that inventory, including exception-before-catch-all ordering and direct canonical `www` destinations.
- Static audits reject duplicates, redirect chains, missing sitemap destinations, non-permanent public-host rules, inventory drift, and unreachable host exceptions.
- Runtime HTTP tests prove representative 308 responses and unchanged `or_arrival`, `or_departure`, `or_adults`, `or_children`, and `or_guests` values on both unit migrations.
- Historical Google Search Console and Bing 404/duplicate/redirect examples are represented in the inventory and master map.
- Keep these rules indefinitely and independent of OwnerRez hosting. After DNS cutover, validate HTTP/bare-domain/HTTPS/`www` behavior and final 200 responses on the live domain.

### 4. Final functional and responsive dry run — complete for preview, production recheck required

- Test homepage → availability → unit → complete total → secure checkout on phone, tablet, laptop, and desktop.
- Test blank dates, invalid date order, maximum occupancy, adults/children limits, sold-out dates, one-unit availability, and both-unit availability.
- Verify full price breakdown and exact unit identity.
- Test all forms, email flows, trip planner, chat, Discord handoff, maps, virtual tours, beach cams, galleries, reviews, external affiliate links, phone, and email links.
- Test awkward widths in addition to standard devices; verify no horizontal overflow, clipped text, duplicate navigation, or layout shift.
- Crawl all internal links and verify no hidden 404s.
- Confirm all migrated images load from assets that survive OwnerRez hosting cancellation.

#### August 22, 2026 completion evidence

- The full pre-cutover suite passed: optimized production build, 46 canonical routes, booking-query preservation for all five parameters, 32-path redirect inventory across four retired hosts, and representative runtime 308 redirects.
- The rendered public-route crawl passed for 63 internal routes with no 4xx or 5xx responses. The audit now explicitly excludes the private `/ozan` owner console, matching the existing sitemap and robots boundary; it is not a guest-facing migration page.
- Static navigation passed for 532 internal links across 56 routes and aliases. Strategic linking passed for all 21 migrated blog entry pages. The asset audit passed for 193 migrated references with no dependency on legacy hosted-site image URLs.
- Eleven representative guest routes were checked at 390×844, 820×1180, 1024×768, and 1366×768: homepage, queried availability, both queried unit pages, queried booking page, gallery, trip planner, about, reviews, virtual tours, and map. All 44 route/viewport checks had one H1, no horizontal overflow, and no broken images.
- A live queried availability search retained September 10–14, 2026, three adults, one child, and four total guests; both exact available units were shown. Valid queried searches do not repeat the date-entry form.
- The live Unit 707 checkout retained the same dates and guest counts and displayed a complete total of $1,297.75 for four nights. Unit identity, Book Now, and Send Inquiry controls were present. No reservation or inquiry was submitted.
- Blank-date validation focused the required arrival field. Reversed dates produced “Checkout must be after check-in.” Selecting six adults constrained children to zero, enforcing the six-guest maximum.
- OwnerRez remains intentionally connected only where live reservation data is required: unit booking/inquiry, compact unit calendars, availability ribbon calendar, and the review feed. Kuula virtual tours, YouTube beach/media embeds, Airbnb/Vrbo review links, phone/email links, the itinerary planner, and tracked TripShock activity links remain represented.
- No `kiwi.com` link exists in the guest site source. The previous calendar-link anomaly is not reproducible in this candidate.
- The itinerary planner and transactional email flow are present and protected by signed, server-owned itinerary payloads. Chat, owner/Discord handoff, final itinerary email delivery, and affiliate conversion were not externally submitted during this dry run because they create real messages or third-party side effects; they require controlled post-cutover smoke checks.
- The complete agent regression suite currently reports 1,036 passing and seven failing tests. Those seven are pre-existing Destiny behavior/content assertions (price-drop wording, New Year calculation, owner alert aggregation, TripShock fuzz behavior, prompt length, service aggregation, and precipitation normalization), not storefront rendering, routing, booking, or migration failures. They remain a separate agent-quality workstream.

### 5. Search, schema, and indexability validation — pending, critical

- Run Google Rich Results Test and Schema Markup Validator on production-equivalent pages.
- Validate Organization/LodgingBusiness, VacationRental where eligible, BreadcrumbList, Review, FAQPage where appropriate, Article/BlogPosting, and VideoObject markup.
- Ensure visible content supports structured-data claims and remove duplicate/conflicting entities.
- Verify canonicals, titles, descriptions, headings, image alt text, Open Graph, and robots directives.
- Inspect representative URLs in Google Search Console and Bing URL Inspection after launch.
- Submit priority pages through IndexNow/Bing and request Google indexing selectively after redirect/canonical stability is confirmed.

### 6. Performance and accessibility launch audit — pre-cutover audit complete

- The rendered-site audit passed 84 representative page renders at 390×844, 820×1180, 1024×768, and 1440×1000 with one visible H1, one main landmark, no horizontal overflow, no broken images, and no unlabeled visible controls.
- A dedicated accessibility interaction audit also passed at 320×720, mobile landscape, tablet portrait, tablet landscape, and simulated 200% zoom. Reduced-motion mode was exercised with animations, transitions, and smooth scrolling disabled by CSS.
- The Destiny chat now exposes dialog/open-state semantics, moves focus into the chat when opened, traps keyboard focus, closes with Escape, and returns focus to the launcher. Unit and gallery lightboxes now provide the same Escape, focus-trap, and return-focus behavior.
- Automated accessibility-tree and keyboard checks passed. NVDA is not installed in this Windows environment and VoiceOver is macOS-only, so an actual spoken-output listening check remains a recommended human post-cutover spot check rather than a claimed automated pass.
- Third-party embeds and live reservation widgets must receive a short production smoke test because their network, cookie, and focus behavior can differ from the local production build.

### 7. DNS, hosting, TLS, and rollback preparation — pending, critical

- Confirm all Vercel environment variables, domains, aliases, cron jobs, and deployment protection settings.
- Export current Cloudflare DNS records and document the rollback values before editing.
- Verify Vercel TLS issuance and canonical host behavior.
- Reduce DNS TTL in advance if useful and safe.
- Define rollback triggers and the exact DNS/deployment rollback procedure.
- Do not cancel OwnerRez hosting until the new site, redirects, booking flows, assets, and search-engine crawling are stable.

### 8. Production cutover — pending

- Freeze content and code changes.
- Deploy the approved launch commit.
- Point the production hostname to Vercel.
- Verify HTTPS, `www` canonicalisation, homepage, priority pages, APIs, booking flow, redirects, sitemap, robots, analytics, and chat from outside the authenticated preview environment.
- Submit sitemaps and priority URLs only after these checks pass.

### August 22, 2026 production cutover record

- Approved launch commit: `3b502a7` on `website/homepage-preview`.
- Vercel production deployment: `dpl_BNhhhLSQhWS3N2RY6b4WGVvYy4W4`, served from `destin-concierge-ethnog1e2-ozans-projects-6452888f.vercel.app`.
- `destincondogetaways.com` and `www.destincondogetaways.com` were attached to the existing `destin-concierge-new` Vercel project and verified by Vercel.
- Cloudflare cutover records are DNS-only CNAMEs for both `@` and `www` to `0667490d3f5b0e77.vercel-dns-017.com`.
- Rollback DNS snapshot: apex A records `52.201.23.5`, `52.86.46.114`, and `34.235.235.52`; `www` CNAME `hosted.ownerrez.com`.
- Existing mail, verification, DKIM, DMARC, and tool-subdomain records were not changed. Existing `app`, `deals`, `offer`, `explore`, `sunbirds`, and `guestview` Vercel aliases remained attached.
- Public Cloudflare and Google DNS returned the Vercel target for `www`; Vercel reported both apex and `www` as configured correctly. Some local resolvers temporarily retained the old `www` response during its previous TTL.
- Live HTTPS returned `200` for the canonical homepage, availability with all five booking parameters, both unit pages, resort, gallery, blog, deals, offers, snowbirds, robots, and sitemap.
- Live legacy-path checks reached the intended clean canonical routes for both OwnerRez unit slugs, resort, why-book-direct, beach cam, and AI concierge. Retired deals, offer, and snowbird hosts reached their intended canonical pages.
- The production homepage is indexable, emits no `noindex`, and declares `https://www.destincondogetaways.com/` as canonical.
- OwnerRez website hosting must remain available during the stability window as the documented DNS rollback target. Do not cancel it until post-launch booking, analytics, crawling, and redirect monitoring are complete.

### 9. Post-launch monitoring — pending

- First hour: uptime, TLS, booking, forms, analytics, redirects, 404s, and server errors.
- First 72 hours: Google/Bing crawl activity, indexing, canonical selection, sitemap processing, Core Web Vitals, and conversion events.
- First 30 days: rankings, organic landing pages, booking conversion, affiliate events, crawl errors, redirect hits, and OwnerRez-host dependency checks.
- Keep the old hosting available until traffic and crawl logs show the migration is stable.

## Current redirect inventory already in code

The complete source-of-truth mapping is now maintained in `docs/REDIRECT-MASTER-MAP.md`, backed by `config/legacy-redirects.js`, host rules in `vercel.json`, and `npm run test:redirect-map`. It covers numbered OwnerRez URLs, duplicate aliases, former `.html` tools, historical Google/Bing 404s, retired public subdomains, and booking-query preservation. Guestview and app remain separate product surfaces.

This inventory is not yet considered launch-complete. It must be reconciled against Search Console, Bing Webmaster Tools, the supplied historical URL lists, current crawl results, and OwnerRez-hosted routes.

## Decisions still requiring Ozan

- Approve the final redirect destination for any legacy page that overlaps another topic.
- Approve tags/conversions that should be retired during the GTM audit.
- Approve the final production cutover window.
- Approve any content claim that cannot be verified from current source data.
- Approve cancellation of OwnerRez website hosting only after the stability period.

## Rollback outline

1. Preserve the prior DNS record values and the last stable deployment reference before cutover.
2. If checkout, TLS, routing, or critical tracking fails, restore the prior DNS target or promote the last stable Vercel deployment as appropriate.
3. Re-verify DNS resolution, HTTPS, homepage, booking, and critical redirects.
4. Record the incident and correction here before attempting another cutover.

## Evidence references

- Commit history on `website/homepage-preview`.
- Draft PR #10 and its Vercel preview deployments.
- `docs/SEO-MIGRATION-EVIDENCE-AUDIT.md`.
- `docs/SEO-COMMERCIAL-MIGRATION-DEEP-DIVE.md`.
- `docs/WEBSITE-SEO-SCHEMA-INVENTORY.md`.
- `docs/ANALYTICS-MEASUREMENT-PLAN.md`.
- `docs/GTM-GA4-AUDIT.md`.
- Content reconciliation files under `docs/`.
- Audit scripts under `scripts/` and test suites under `tests/`.

## August 18, 2026 final-candidate dry-run update

- The optimized production build completes without requiring TV-preview Supabase credentials; the TV preview now fails closed with a 404 when its private database configuration is unavailable.
- Rendered search-readiness passed for 46 canonical routes. Canonicals are absolute, query-free, schema-aligned, and preview deployments remain `noindex,nofollow`.
- Rendered HTTP crawling passed for 64 internal routes with no 4xx or 5xx response.
- The cutover, booking-canonical, and redirect-master-map suites passed, including preservation of all five booking parameters.
- Static internal-link coverage passed for 532 links across 56 routes and aliases. The strategic-link audit passed for all 21 blog entry pages.
- SEO, asset, and analytics audits passed: 21 priority metadata pages, 15 schema-owned pages, 193 migrated asset references, and 11 analytics surfaces.
- Chrome Lighthouse on the exact optimized build passed Accessibility 100, Best Practices 100, and Agentic Browsing 100 on both mobile and desktop. The preview-only SEO score is 69 solely because crawling is intentionally blocked before cutover.
- An unthrottled Chrome performance trace recorded 257 ms LCP, 13 ms TTFB, and 0.00 CLS. Render-blocking resources had an estimated 0 ms LCP/FCP impact. Production field performance still requires post-cutover observation.
- Key booking, lodging, trust, and media routes were rendered at 390×844, 820×1180, 1024×768, and 1440×1000. Every checked page had one visible H1, zero horizontal overflow, and zero broken images.
- The repeated contextual image on both unit pages was replaced with a distinct migrated unit image; the top gallery is no longer repeated verbatim farther down the page.
- Remaining launch gates: authenticated live availability/price/checkout edge-case testing, third-party form and chat/handoff testing, Tag Assistant plus GA4 DebugView validation, production Rich Results validation, DNS/TLS rehearsal, and rollback verification. None of these may be recorded as passed from a credential-free local build.

## August 22, 2026 public-surface containment update

- GuestView, the in-room TV prototype, and the website thermostat endpoint now fail closed with `404`, `no-store`, and `X-Robots-Tag: noindex, nofollow, noarchive`. Their source remains available for separate projects; they are not public storefront features.
- Internal PriceLabs management, pricing-AI, deals-debug, and agent-regression routes are quarantined. Public `/destin-condo-deals` and its scoped deal endpoints remain available.
- The owner live-chat administration page and join/leave/poll/send APIs are quarantined because their invite tokens were present but not cryptographically validated. Normal Destiny guest chat remains available; owner handoff must be rebuilt behind a separate authenticated boundary before re-enablement.
- The OwnerRez/Discord inbox drafting prototype is quarantined pending signed-webhook verification and durable state.
- The nightly `/api/price-snapshot` job remains available because it supplies public deal data, but now fails closed when `CRON_SECRET` or its authorization header is absent.
- A production build passed. Local production-server checks returned `404` for every quarantined route while the homepage, availability, deals, and Destiny concierge routes remained reachable. Production remains untouched.

## August 22, 2026 guest-facing API hardening update

- Public forms and AI endpoints now enforce same-origin browser requests, method allowlists, payload-size caps, bounded text, strict email/date/guest validation, honeypots, safe error responses, and best-effort per-IP application rate limits.
- The itinerary endpoint no longer accepts caller-authored prompts. It builds a server-owned prompt from allowlisted planner selections, validates the returned itinerary structure, and signs the exact result. The email endpoint sends only an unchanged, validly signed itinerary and no longer silently adds recipients to a marketing list.
- Rate inquiries and itinerary delivery remain transactional. Only the explicit deals-subscription form adds a contact to the deals list.
- Direct access to the legacy chat implementations is quarantined; guest pages use `/api/destiny-chat`. The hidden price-snapshot phrase was removed from every chat handler, and the snapshot job remains authenticated cron-only.
- Public deal reads and view-count endpoints now have method, origin, payload, validation, rate, cache, and provider-error controls. Public deal functionality remains available.
- Required launch environment: set a strong, independent `ITINERARY_SIGNING_SECRET` in Preview and Production. Do not store its value in the repository.
- Required Google Cloud control: restrict the browser Maps key by HTTP referrer to the final production hostnames and to only the Maps APIs the site uses. A browser Maps key is necessarily visible to clients; restriction is the security boundary.
- The in-process rate limiter is defense in depth, not a globally durable counter across serverless instances. At cutover, configure Vercel or Cloudflare edge rate limits for `/api/destiny-chat`, `/api/itinerary`, `/api/send-itinerary`, `/api/rate-inquiry`, `/api/deals-subscribe`, `/api/calendar`, and deal-view writes.
- **Pre-launch TODO — guest-safe durable rate limiting:** replace the IP-primary application limits with an anonymous first-party session identifier as the primary key (`session + endpoint`) and retain a higher IP-based emergency ceiling (`IP + endpoint`). This must distinguish legitimate guests sharing hotel, office, or mobile-carrier networks while still preventing cookie deletion from bypassing abuse controls. Do not store personal information in the identifier; use secure cookie attributes and verify normal planner, inquiry, availability, and Destiny-chat retries before launch.
