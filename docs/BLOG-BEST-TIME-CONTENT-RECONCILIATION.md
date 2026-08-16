# Best Time to Visit Destin Article Migration Reconciliation

## Mapping

- Production source: `https://www.destincondogetaways.com/blog/best-time-to-visit-destin-florida`
- Preview and future canonical path: unchanged
- Source length: approximately 2,700 visible words

## Interactive quiz

The source embeds `https://destin-concierge-new.vercel.app/destin-month-quiz.html`. The same asset exists in this repository as `/public/destin-month-quiz.html`; the preview migration rewrites the iframe to `/destin-month-quiz.html`, retains its accessible title, and keeps only one copy.

## Content and schema

The full month-by-month guide, seasonal comparisons, practical advice, quiz and visible FAQs are retained. Captured scripts and unsafe attributes are removed. The replacement emits `WebPage`, `BreadcrumbList`, `Article`, visible-question-only `FAQPage`, and one shared `LodgingBusiness` entity.

## Verification gate

- verify the quiz loads and completes at both desktop and mobile widths;
- verify one H1, one live-availability form and one quiz iframe;
- verify no overflow, broken assets, unsafe article scripts or encoding defects;
- recheck seasonal facts before production cutover.

Production remains unchanged during preview development.
