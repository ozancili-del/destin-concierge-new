# Thin Blog Article Audit Batch

Audit date: 2026-08-15

These six OwnerRez articles were inspected before migration. They have no iframe or inline-script dependency and each uses one visible image, but their content is too thin or inconsistent to justify a blind copy.

| Slug | Approx. visible words | Key migration issue |
|---|---:|---|
| `destindiversehistory` | 504 | Broad history claims need authoritative sourcing and stronger Destin-specific chronology. |
| `destinocen` | 541 | Meta description promises live water temperature and ocean-condition guidance, but the inspected article has no embedded live-data dependency. Reconcile with the existing beach-conditions tool. |
| `destinromance` | 443 | Valuable search intent, but needs current venue verification, fuller local detail and internal links. |
| `destinnights` | 521 | Nightlife/venue facts can change; verify official venue status, schedules and links before publication. |
| `destinkids` | 552 | Family activity facts and affiliate coverage need verification; retain the useful family intent and rebuild with clearer age/rainy-day guidance. |
| `destinexplore` | 489 | Page title still says 2025 while metadata says 2026; overlaps with family, ocean and activity articles and needs a cannibalization decision. |

## Shared rebuild standard

For each page:

- retain its current public slug unless Search Console/backlink evidence supports consolidation;
- preserve genuinely useful original facts after verification;
- write a unique title, H1 and description that match the visible content;
- add a live-availability form near the top without overwhelming the article;
- use the shared header, footer, button and availability-form components;
- include useful contextual internal links, not a generic link dump;
- preserve or replace the source image with explicit dimensions, descriptive alt text and optimized delivery;
- add visible author/update information where appropriate;
- emit `WebPage`, `Article`, `BreadcrumbList`, and only evidence-backed page-specific schema;
- keep preview pages `noindex,nofollow` until cutover;
- validate mobile layout, accessibility, links, rich-result eligibility and analytics behavior.

## Decision

Do not publish these as copied OwnerRez HTML. Rebuild them individually after the higher-value, dependency-heavy pages are safely reconciled.
