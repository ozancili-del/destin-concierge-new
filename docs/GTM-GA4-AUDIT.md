# GTM and GA4 migration audit

Audit date: August 18, 2026
Scope: read-only inspection of the signed-in Google Tag Manager container, current production page, and migration code
Production changes: none
GTM changes or publishing: none

## Executive conclusion

The current GTM container is not the primary analytics implementation. It is predominantly a legacy SEO injection layer built for the OwnerRez-hosted site, plus Microsoft Clarity and the Travelpayouts affiliate-link script. The replacement site already has a cleaner code-owned GA4 funnel and route-native metadata/structured data.

The safe migration is therefore **not** to copy all GTM tags into the new site and **not** to delete them immediately. At cutover, retain GTM as a controlled bridge, verify parity in production, then retire the legacy SEO tags after their code-owned replacements pass schema, search, and analytics checks.

## Connected systems and identifiers

- GTM account: Destin Condo Getaways
- GTM web container: `www.destincondogetaways.com/`
- GTM container ID: `GTM-PQSF8S6D`
- GA4 measurement ID: `G-3SGXCQ4FTC`
- Microsoft Clarity project ID: `vdueltd0r2`
- Site-owned analytics initializer: `public/dcg-core.js`

## Current GTM inventory

The workspace contains 15 tags and 15 page-view triggers. It has no user-defined variables. Built-in variables are limited to Event, Page Hostname, Page Path, Page URL, and Referrer.

### Tags

| GTM tag | Purpose observed | Trigger | Migration decision |
| --- | --- | --- | --- |
| `1006` | Unit VacationRental JSON-LD | Legacy unit-707 URL condition | Replace in code; verify unit/tag mapping before retirement |
| `707` | Unit VacationRental JSON-LD | Legacy unit-1006 URL condition | Replace in code; verify unit/tag mapping before retirement |
| `airport schme` | Airport Article JSON-LD | `/blog/destinairport` | Replace with route-native BlogPosting/Article JSON-LD |
| `Artice car` | Car guide Article JSON-LD | `/blog/destincar` | Replace with route-native BlogPosting/Article JSON-LD |
| `beaches` | Beaches guide structured data | `/blog/best-beaches-destin` | Replace with route-native JSON-LD after parity check |
| `i dont know` | Unit review JSON-LD builder | Unit legacy URLs | Replace with visible, unit-appropriate review markup in code |
| `market FAQ` | Supermarkets FAQPage JSON-LD | `/blog/destinsupermarkets` | Replace in code only where visible FAQ content supports it |
| `Meta Description` | JavaScript meta-description path map | All page views | Retire after verifying server-rendered route metadata |
| `Microsoft Clarity - Official` | Clarity session analytics | All Pages | Retain once; prevent duplicate direct/GTM installation |
| `Refer adaba thingy` | Loads the Travelpayouts affiliate-link script from `emrldco.com/NTA1OTQ2.js?t=505946` | Broad page-view trigger | Retain once, but scope to relevant affiliate/planning content; exclude booking, availability, unit, form, account, and chat routes |
| `rest` | Restaurant FAQPage JSON-LD | Restaurant guide | Replace in code only where visible FAQ content supports it |
| `REviews thing` | Global LodgingBusiness, aggregate rating and reviews | All Pages | Replace with one authoritative entity; do not inject globally |
| `schme market` | Supermarkets Article JSON-LD | `/blog/destinsupermarkets` | Replace with route-native JSON-LD |
| `sicak su` | Weather Article JSON-LD | `/blog/destinweather` | Replace with route-native JSON-LD and local durable images |
| `Tears of bread` | Dynamic BreadcrumbList using legacy path map | Broad page-view trigger | Replace with route-native breadcrumbs and canonical URLs |

### Trigger quality

The triggers are entirely page-view/path based. Several names are ambiguous or swapped, and several filters target legacy OwnerRez slugs. Examples include:

- Trigger `1006` filters `Page URL contains unit-707`.
- Trigger `Page View 707` filters the legacy Unit 1006 path.
- `Bread`, `Meta Descriptions`, and `Referql` have broad page-view scope.
- Two unused triggers remain for restaurant buttons and the old trip planner.

This is fragile under a Next.js migration because route names, client navigation, canonical paths, and server-rendered metadata differ from the old hosted templates.

## Live-production evidence

The current public homepage loads:

- GA4 `gtag.js` for `G-3SGXCQ4FTC`.
- GTM `GTM-PQSF8S6D`.
- A second Google tag load using `GTM-PQSF8S6D` as though it were a Google tag ID.
- Microsoft Clarity through GTM.
- The `emrldco.com` referral script, with evidence of more than one injection path.

The old production template therefore carries credible duplication risk. The migration must install each service exactly once.

## New-site analytics architecture

`public/dcg-core.js` is the intended source of truth:

- Loads GA4 and GTM only on the real production hostname.
- Keeps Vercel previews and local development isolated from external analytics.
- Sends one sanitized page view per URL.
- Implements canonical funnel events: `search`, `select_item`, `booking_cta_click`, `begin_checkout`, `generate_lead`, and `purchase`.
- Supports affiliate, contact, and chat events.
- Removes names, email addresses, phone numbers, messages, comments, and questions from analytics parameters.
- Preserves first-party cross-domain attribution for the branded subdomains.
- Maps legacy event names to the canonical funnel for continuity.

No GA4 configuration or GA4 event tags were found in the GTM tag inventory. GA4 should remain code-owned; adding GA4 configuration in GTM would create duplicate page views/events.

## Critical risks to close before cutover

1. **Duplicate installers:** GA4, GTM, Clarity, or the referral script must not be loaded by both the site and GTM/direct legacy HTML.
2. **Travelpayouts scope:** retain the confirmed affiliate script only where commercially relevant and verify its privacy behavior; do not let it rewrite or intercept booking, availability, unit, form, account, or chat links.
3. **Global structured-data mismatch:** LodgingBusiness and review markup should not be injected indiscriminately on every page.
4. **Legacy URL dependency:** many triggers and breadcrumbs target OwnerRez paths and would misfire or become obsolete after migration.
5. **OwnerRez asset dependency:** legacy JSON-LD uses `uc.orez.io` images. Code-owned schemas should reference durable migrated assets.
6. **Metadata timing:** JavaScript-injected meta descriptions are inferior to server-rendered Next metadata and can conflict with page metadata.
7. **Workspace safety:** GTM currently has one unpublished workspace change deleting `Schema - SoftwareApplication - Trip Planner`. Do not accidentally publish it with migration work.
8. **Clarity duplication:** `public/pricing-dashboard-v2.html` also contains a direct Clarity installation. If GTM runs there, only one installation should remain.

## Retain, replace, retire plan

### Retain during cutover

- The GTM container loader, temporarily, as the controlled migration bridge.
- Microsoft Clarity exactly once (Ozan confirmed it remains required).
- Travelpayouts exactly once on relevant affiliate/planning content, with booking and private workflows excluded (Ozan confirmed it remains required).

### Replace in application code

- Organization/LodgingBusiness identity.
- Unit VacationRental data.
- Visible and appropriately scoped reviews/ratings.
- Article/BlogPosting data.
- FAQPage data where the questions and answers are visible on the same page.
- BreadcrumbList data.
- Titles and meta descriptions.

### Retire after verified parity

- All GTM Custom HTML SEO/schema tags.
- The GTM JavaScript meta-description map.
- Legacy OwnerRez-slug triggers and unused triggers.
- Any duplicate script installer.

## Required production verification sequence

1. Export the current GTM container version and workspace before edits.
2. Preserve the unrelated pending deletion without publishing it.
3. Create a clean migration workspace/version rather than editing the existing mixed workspace.
4. In Tag Assistant, verify one GA4 page view per route and no duplicate GA/GTM/Clarity requests.
5. Verify the canonical funnel using one controlled journey: homepage search → availability → unit → checkout start → inquiry/test completion.
6. Verify phone, email, chat, affiliate, and cross-domain transitions.
7. Confirm DebugView receives sanitized parameters and no PII.
8. Mark only `begin_checkout`, `generate_lead`, and `purchase` as GA4 key events.
9. Run Rich Results Test and Schema Markup Validator on representative routes.
10. Only after code-owned parity passes, publish a GTM version that retires the legacy SEO tags.

## Decisions recorded

- Keep Microsoft Clarity after migration, installed exactly once.
- Keep the confirmed Travelpayouts `emrldco.com` integration, installed exactly once and restricted to relevant public affiliate/planning pages.
- Approve retirement of the legacy SEO/schema tags after production parity is demonstrated.

## Audit confidence

High confidence in the architecture and retain/replace/retire recommendation. Final event-delivery confidence requires Tag Assistant and GA4 DebugView on the production hostname after cutover because preview analytics are intentionally disabled.
