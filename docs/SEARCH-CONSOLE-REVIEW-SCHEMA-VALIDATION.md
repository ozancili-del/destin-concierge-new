# Search Console review-schema validation

Status: controlled production test in progress  
Started: August 26, 2026  
Test URL: `https://www.destincondogetaways.com/guest-guide`

## Why this test exists

Search Console continued to report review-snippet issues after the Vercel migration. Repository inspection confirmed that several pages redeclared the same `LodgingBusiness` entity, `https://www.destincondogetaways.com/#business`, with business-level rating data. The review page also contradicted the other declarations by publishing `4.93 / 173` while the other affected pages published `4.94 / 400`.

Observed production schema before the test:

| Route | Aggregate rating | Nested Review objects | Search Console rows reported August 25 |
|---|---:|---:|---:|
| `/` | 4.94 / 400 | 3 | 8 |
| `/why-book-direct` | 4.94 / 400 | 3 | 8 |
| `/guest-guide` | 4.94 / 400 | 0 | 5 |
| `/pelican-beach-resort-destin` | 4.94 / 400 | 3 | 8 |
| `/destin-condo-rental-reviews` | 4.93 / 173 | 6 | 11 |

The row-count relationship is supporting evidence, not a documented Google calculation. The source-level presence of the rating and review properties is confirmed.

## Controlled change

Production commit `25501ff` removed only `aggregateRating` from the Guest Guide `LodgingBusiness`. Visible page content, testimonials, links, FAQ schema, breadcrumbs, and business identity remain unchanged.

Post-deployment HTML verification returned zero occurrences of:

- `aggregateRating`
- `reviewCount`
- `ratingValue`

Google's live URL check no longer detected review items. Search Console still showed the previously stored five issues, so validation was started on August 26, 2026.

## Hold rule

Do not add rating or review schema back to `/guest-guide` while validation is running. Do not use the stale Search Console issue count as evidence that the deployment failed when the live URL test is clean. Wait for Google to recrawl and reprocess the URL.

Do not expand this cleanup to the remaining affected pages until the Guest Guide validation result is observed, unless a separate urgent Search Console or policy problem requires immediate removal.

If validation succeeds, remove business-level `aggregateRating` and nested `review` properties from the homepage, Why Book Direct, resort, and reviews pages. Also remove the guest-score `starRating` from Why Book Direct because it is not an official lodging classification. Preserve all visible review content.

Unit-page ratings describe distinct vacation-rental entities and are outside this controlled test. Audit them separately before changing them.

## Comparison evidence

`/destin-ai-concierge` currently emits `WebPage`, `SoftwareApplication`, `BreadcrumbList`, and `FAQPage` schema. It references `/#business` but does not declare rating or review properties. Its prior Search Console warning disappeared after Google reprocessed the migrated page. This supports the expected sequence:

1. production HTML becomes clean;
2. live URL testing becomes clean;
3. the stored Search Console report remains stale temporarily;
4. the warning disappears after recrawl and reprocessing.

Referencing the stable `/#business` identifier is not itself the problem. Conflicting or self-controlled rating/review declarations attached to that entity are the properties under test.
