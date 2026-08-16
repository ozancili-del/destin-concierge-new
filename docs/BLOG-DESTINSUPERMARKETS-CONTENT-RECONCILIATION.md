# Destin Supermarkets Article Migration Reconciliation

## Mapping

- Production source: `https://www.destincondogetaways.com/blog/destinsupermarkets`
- Preview path: `/blog/destinsupermarkets`
- Future canonical path: unchanged
- Visible source length: approximately 1,350 words

## Interactive dependency

The source renders the same supermarket-map iframe twice. The migration keeps one accessible iframe, adds a descriptive title, and rewrites the external Vercel URL to the repository-owned `/supermarket-map.html` asset. This prevents duplicate maps and keeps the dependency within the same preview deployment.

## Content and schema

The complete visible article, store comparisons, delivery guidance, reference table and FAQs are retained. Captured scripts and unsafe attributes are removed. The replacement emits `WebPage`, `BreadcrumbList`, `Article`, visible-question-only `FAQPage`, and the shared `LodgingBusiness` entity.

## Verification gate

- verify the local map renders and remains usable on mobile;
- verify one H1, one live-availability form and one supermarket-map iframe;
- verify no horizontal overflow, broken images, unsafe article scripts or encoding defects;
- recheck store names, addresses, hours and delivery coverage before production cutover.

Production remains unchanged during preview development.
