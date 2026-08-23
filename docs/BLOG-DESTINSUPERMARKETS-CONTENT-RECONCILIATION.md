# Destin Supermarkets Article Migration Reconciliation

## Mapping

- Production source: `https://www.destincondogetaways.com/blog/destinsupermarkets`
- Preview path: `/blog/destinsupermarkets`
- Future canonical path: unchanged
- Visible source length: approximately 1,350 words

## Interactive dependency

The source renders the same supermarket-map iframe twice. The migration keeps one accessible iframe and adds a descriptive title. A preview test of the repository-local `/supermarket-map.html` copy failed with Google Maps `RefererNotAllowedMapError` because the API key does not authorize the new preview hostname. The migration therefore preserves the already-authorized `https://destin-concierge-new.vercel.app/supermarket-map.html` origin until the final production hostname is authorized. This keeps the map working without weakening API-key restrictions.

## Content and schema

The complete visible article, store comparisons, delivery guidance, reference table and FAQs are retained. Captured scripts and unsafe attributes are removed. The replacement emits `WebPage`, `BreadcrumbList`, `Article`, visible-question-only `FAQPage`, and the shared `LodgingBusiness` entity.

## Verification gate

- verify the authorized Vercel-hosted map renders and remains usable on mobile;
- verify one H1, one live-availability form and one supermarket-map iframe;
- authorize the final `www.destincondogetaways.com` hostname before switching the iframe to the repository-local copy;
- preview verification found one visible H1, one availability form, 1,421 rendered words, one accessible map iframe, no overflow or encoding defects, and the five expected schema types;
- the authorized external map rendered its nine-store interface without the Google error shown by the local preview-host copy;
- verify no horizontal overflow, broken images, unsafe article scripts or encoding defects;
- recheck store names, addresses, hours and delivery coverage before production cutover.

Production remains unchanged during preview development.
