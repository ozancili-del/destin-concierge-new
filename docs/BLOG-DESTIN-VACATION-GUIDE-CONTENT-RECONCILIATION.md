# Destin Vacation Guide 2026 Migration Reconciliation

## Mapping

- Production source: `https://www.destincondogetaways.com/blog/destin-florida-vacation-guide-2026`
- Preview path and future canonical path: unchanged
- Visible source length: approximately 1,100 words

## Styling dependency

The OwnerRez article includes the external stylesheet `https://destin-concierge-new.vercel.app/disco.css`. The file already exists in the repository as `/public/disco.css`. The migration removes the stylesheet tag from captured body HTML and loads `/disco.css` from the document head, preserving the designed guide modules without an external production-host dependency.

## Content and schema

The complete visible trip-planning guide and its internal navigation are retained. The replacement uses `WebPage`, `BreadcrumbList`, `Article`, visible-question-only `FAQPage`, and one shared `LodgingBusiness` entity, removing the duplicate LodgingBusiness objects found on the source page.

## Verification gate

- verify the guide modules retain their intended styling;
- verify the local stylesheet returns successfully;
- verify one H1, one live-availability form, no overflow or encoding defects and the five expected schema types;
- recheck internal links before final cutover.

Production remains unchanged during preview development.
