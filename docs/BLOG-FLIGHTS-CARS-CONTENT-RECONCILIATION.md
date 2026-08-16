# Flights and Car Rentals Article Migration Reconciliation

## Page mapping

- Current production URL: `https://www.destincondogetaways.com/blog/how-to-find-cheaper-flights-and-car-rentals`
- Preview URL: `/blog/how-to-find-cheaper-flights-and-car-rentals`
- Future canonical URL: unchanged
- Migration type: exact-path replacement; no redirect planned

## Content handling

The complete visible OwnerRez article was captured and retained, including its airport comparison, flight and rental-car examples, affiliate disclosures, planning advice, tables, FAQs, and internal links.

The migration removes scripts, style blocks, forms, inline event handlers, and `javascript:` URLs from captured article HTML. It also replaces the repeated “two beachfront condos” sales sentence with the approved owner-direct Pelican Beach Resort wording.

## Structured data

The preview emits one graph containing:

- `WebPage`
- `BreadcrumbList`
- `Article`
- `FAQPage`
- `LodgingBusiness`

FAQ entries are included only when their question is visibly present in the article. This eliminates the source mismatch where hidden schema could describe a question not shown on the page.

## Affiliate and factual review

- Existing affiliate URLs and `sponsored nofollow noopener` attributes are retained.
- The visible affiliate disclosure remains on the page.
- Example prices are preserved as historical examples, not live price promises.
- Airport and rental guidance must be rechecked before final-domain cutover.

## Verification gate

- production compilation completed successfully for the new code;
- local build later stopped on the unrelated `/tv/preview/[slug]` page because the clean clone does not contain Vercel’s Supabase environment variables;
- Vercel completed the environment-backed preview build;
- preview verification found one visible H1, one live-availability form, 1,626 rendered words, no horizontal overflow, no broken images, no mojibake, no scripts inside the article and the five expected schema types;
- run final rich-result and analytics checks after domain cutover.

Production and OwnerRez remain unchanged during preview development.
