# Destin Spa Article Migration Reconciliation

## Page mapping

- Current production URL: `https://www.destincondogetaways.com/blog/destinspa`
- Preview URL: `/blog/destinspa`
- Future canonical URL: `https://www.destincondogetaways.com/blog/destinspa`
- Migration type: exact-path replacement; no redirect is planned for this URL.

## Content reconciliation

The complete visible OwnerRez article body was migrated, including:

- headline, introduction and author/update line;
- quick-comparison table for the ten spas;
- all ten detailed spa profiles;
- booking advice, addresses, phone numbers and drive-time context;
- wellness and relaxation guidance;
- frequently asked questions;
- calls to the condo pages and related Destin planning content.

The article was not shortened. Embedded scripting, inline event handlers, and `javascript:` URLs were removed; editorial HTML and links were retained. Character encoding was repaired after visual QA so typographic punctuation, emoji and star symbols render correctly.

## Structured data retained or added

The preview emits a single nonduplicated graph containing:

- `WebPage`
- `BreadcrumbList`
- `FAQPage`
- `Article`
- `LodgingBusiness`

The preview remains `noindex,nofollow` until domain cutover. Production canonical and indexing signals are intentionally not changed during preview development.

## Dependencies

This article has no iframe, API, map, quiz, calendar or Vercel micro-app dependency. Its two visible article images currently use the existing OwnerRez CDN URLs and were verified to load.

## Verification gate

Before production replacement:

- compare all visible sections against the current OwnerRez page;
- validate desktop and mobile layout with no horizontal overflow;
- confirm the availability form and internal links;
- run Google Rich Results Test and schema validation on the final-domain page;
- confirm GTM/GA consent and event behavior after global analytics integration;
- verify no duplicate sitewide business/review markup is emitted.
