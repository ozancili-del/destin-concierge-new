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

### 3. Redirect map reconciliation — pending, critical

- Build a single source-of-truth table with every known OwnerRez and subdomain URL, destination, status code, parameter behavior, and verification result.
- Reconcile overlapping rules in `next.config.js` and `vercel.json` to avoid ambiguity.
- Ensure all redirects are one hop, permanent where appropriate, HTTPS, and `www` canonical.
- Test query-string preservation on both unit URLs and booking links.
- Include historical Google Search Console and Bing-reported 404/duplicate/redirect URLs.
- Keep redirects indefinitely; do not depend on OwnerRez hosting after DNS cutover.

### 4. Final functional and responsive dry run — pending, critical

- Test homepage → availability → unit → complete total → secure checkout on phone, tablet, laptop, and desktop.
- Test blank dates, invalid date order, maximum occupancy, adults/children limits, sold-out dates, one-unit availability, and both-unit availability.
- Verify full price breakdown and exact unit identity.
- Test all forms, email flows, trip planner, chat, Discord handoff, maps, virtual tours, beach cams, galleries, reviews, external affiliate links, phone, and email links.
- Test awkward widths in addition to standard devices; verify no horizontal overflow, clipped text, duplicate navigation, or layout shift.
- Crawl all internal links and verify no hidden 404s.
- Confirm all migrated images load from assets that survive OwnerRez hosting cancellation.

### 5. Search, schema, and indexability validation — pending, critical

- Run Google Rich Results Test and Schema Markup Validator on production-equivalent pages.
- Validate Organization/LodgingBusiness, VacationRental where eligible, BreadcrumbList, Review, FAQPage where appropriate, Article/BlogPosting, and VideoObject markup.
- Ensure visible content supports structured-data claims and remove duplicate/conflicting entities.
- Verify canonicals, titles, descriptions, headings, image alt text, Open Graph, and robots directives.
- Inspect representative URLs in Google Search Console and Bing URL Inspection after launch.
- Submit priority pages through IndexNow/Bing and request Google indexing selectively after redirect/canonical stability is confirmed.

### 6. Performance and accessibility launch audit — pending, critical

- Run matched mobile, tablet, and desktop performance traces against the launch candidate.
- Confirm Core Web Vitals, image sizing, font loading, caching, script cost, CLS, keyboard navigation, accessible names, contrast, and modal/chat behavior.
- Retest third-party embeds and widgets because their production behavior may differ from preview.
- Record results and accepted exceptions in this ledger.

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
