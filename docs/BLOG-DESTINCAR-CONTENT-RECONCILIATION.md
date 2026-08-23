# Destin Rental-Car Article Migration Reconciliation

## Mapping and scope

- Production source: `https://www.destincondogetaways.com/blog/destincar`
- Preview path: `/blog/destincar`
- Future canonical path: unchanged
- Visible source length: approximately 3,000 words

The complete visible article is retained in the shared migration layout. Scripts and unsafe attributes are removed, while editorial sections, comparison tables, affiliate links, disclosure text, FAQs, and internal links remain.

## Image handling

The OwnerRez article exposes an image element without a usable `src` in the rendered page. The migration replaces that broken element with the existing repository asset `/car-rental-coastal-drive.png`, retaining the source alt text and explicit responsive image behavior.

## Schema

The replacement emits a single graph with `WebPage`, `BreadcrumbList`, `Article`, visible-question-only `FAQPage`, and the shared `LodgingBusiness` entity. Duplicate source Article objects are intentionally not copied.

## Verification gate

- confirm all captured sections and the affiliate disclosure are visible;
- confirm affiliate links retain sponsored/nofollow/noopener attributes;
- preview verification found one visible H1, one live-availability form, 3,076 rendered words, no desktop/mobile overflow, no broken images, no encoding defects and the five expected schema types;
- the replacement image loaded successfully on desktop and mobile;
- recheck transportation facts and examples before production cutover.

Production remains unchanged during preview development.
