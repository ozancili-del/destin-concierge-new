# Blog Migration Inventory

Branch: `website/homepage-preview`  
Audit date: 2026-08-15  
Production status: unchanged

## Rules

- Preserve every current article URL during migration.
- Reconcile visible text, headings, images, metadata, schema, internal links, affiliate links, and interactive dependencies before replacing an OwnerRez article.
- Keep preview pages `noindex,nofollow` until cutover.
- Do not create indexable thin tag archives automatically.
- Retain tags as article metadata; create a public tag/category page only when it has meaningful unique copy and several related articles.
- Use a permanent redirect only when an article is intentionally consolidated.
- Keep the shared Live Availability form, header, footer, GTM behavior, and Destiny chat integration consistent.

## Current library

| Article | Approx. words | Important dependencies | Current schema |
|---|---:|---|---|
| destinweather | 3,425 | `destin-beach-conditions.html` | Breadcrumb, Article, LocalBusiness, LodgingBusiness, FAQ, BlogPosting, Dataset |
| destin-fireworks-2026 | 1,981 | `july4-map.html`, concierge source | Breadcrumb, Article, FAQ, LocalBusiness, LodgingBusiness |
| best-beaches-destin | 3,467 | `destin-beach-conditions.html`, concierge source | Breadcrumb, Article, LocalBusiness, LodgingBusiness |
| best-restaurants-destin | 2,184 | `restaurant-map.html`, concierge source | Breadcrumb, ItemList, Article, LocalBusiness, LodgingBusiness, FAQ |
| destin-events-2026 | 2,800 | events masthead, concierge source | Breadcrumb, Article, FAQ, LocalBusiness, LodgingBusiness |
| how-to-find-cheaper-flights-and-car-rentals | 1,633 | affiliate/transport links | Breadcrumb, FAQ, LodgingBusiness |
| destin-florida-vacation-guide-2026 | 1,091 | `disco.css`, `destin-hub.html`, concierge | Breadcrumb, FAQ, LodgingBusiness |
| destinspa | 2,019 | external business links | Breadcrumb, FAQ, Article, LodgingBusiness |
| destinairport | 2,479 | `vps-to-pelican-map.html`, six AirNavRadar widgets, concierge | Breadcrumb, FAQ, SoftwareApplication, LodgingBusiness, Article |
| destincar | 3,082 | transport/affiliate links | Breadcrumb, FAQ, Article, LodgingBusiness |
| best-restaurants-destin-local-guide | 1,277 | `restaurant-map.html`, concierge source | Breadcrumb, ItemList, LodgingBusiness, FAQ, Article |
| best-time-to-visit-destin-florida | 2,726 | `destin-month-quiz.html`, concierge source | Breadcrumb, FAQ, LodgingBusiness |
| destin-live-music-2026 | 2,340 | `destin-music-calendar.html` | Breadcrumb, ItemList, LodgingBusiness |
| destinsupermarkets | 1,436 | `supermarket-map.html` | Breadcrumb, LodgingBusiness, FAQ, Article |
| destin-condo-ai-concierge-direct-booking | 1,913 | Google map | Breadcrumb, FAQ, LodgingBusiness |
| destin-vacation-rental-ai-concierge | 1,702 | Google map | Breadcrumb, BlogPosting, FAQ, LodgingBusiness |
| destindiversehistory | 591 | none special | Breadcrumb, LodgingBusiness |
| destinocen | 630 | activity/affiliate links | Breadcrumb, LodgingBusiness |
| destinromance | 531 | activity/restaurant links | Breadcrumb, LodgingBusiness |
| destinnights | 606 | venue/music links | Breadcrumb, LodgingBusiness |
| destinessentials | 586 | local essential-service links | Breadcrumb, LodgingBusiness |
| destinkids | 637 | family activity/affiliate links | Breadcrumb, LodgingBusiness |
| destinexplore | 575 | activity/affiliate links | Breadcrumb, LodgingBusiness |

## Current migration status

| Slug | Status | Notes |
|---|---|---|
| `destinspa` | Migrated and verified in preview | Full 2,005-word visible article retained; Unicode repaired; images, availability form, responsive layout and five schema types verified. See `BLOG-DESTINSPA-CONTENT-RECONCILIATION.md`. |
| `how-to-find-cheaper-flights-and-car-rentals` | Migrated and verified in preview | Full 1,626-word rendered guide retained; desktop/mobile, images, availability, Unicode, safe article HTML and five schema types verified. See `BLOG-FLIGHTS-CARS-CONTENT-RECONCILIATION.md`. |
| `destincar` | Migrated and verified in preview | Full 3,076-word rendered guide retained; replacement image, desktop/mobile, availability, safe article HTML and five schema types verified. See `BLOG-DESTINCAR-CONTENT-RECONCILIATION.md`. |
| `destinsupermarkets` | Migrated locally; preview verification pending | Full guide retained; duplicate external map replaced with one accessible repository-local map. See `BLOG-DESTINSUPERMARKETS-CONTENT-RECONCILIATION.md`. |
| `destinessentials` | Rebuild required | Source contains ChatGPT UI wrappers and a content/meta mismatch; service and emergency facts require verification. See `BLOG-DESTINESSENTIALS-CONTENT-AUDIT.md`. |
| All other articles | Inventory/audit stage | Current OwnerRez pages remain live and untouched. |

## Migration classification

### Preserve and reconcile carefully

The first sixteen articles contain substantial content, valuable schema, interactive tools, or strong search intent. Migrate them individually without dropping existing functionality.

### Improve during migration

`destindiversehistory`, `destinocen`, `destinromance`, `destinnights`, `destinessentials`, `destinkids`, and `destinexplore` are comparatively thin. Preserve their URLs, but strengthen their useful local content, citations, headings, internal links, images, and article schema during migration.

### Cannibalization review before cutover

- `best-restaurants-destin` vs. `best-restaurants-destin-local-guide`
- `destinocen` vs. `destinexplore` vs. `destinkids`
- `destin-condo-ai-concierge-direct-booking` vs. `/why-book-direct`
- `destinessentials` vs. `destinsupermarkets`

Do not consolidate automatically. Compare Search Console queries, backlinks, and page purpose first.

## Vercel assets already present in the repository

- `public/destin-beach-conditions.html`
- `public/july4-map.html`
- `public/restaurant-map.html`
- `public/vps-to-pelican-map.html`
- `public/destin-month-quiz.html`
- `public/destin-music-calendar.html`
- `public/supermarket-map.html`
- `public/destin-hub.html`
- supporting hub imagery and CSS

Each dependency must be tested on desktop and mobile when its article is migrated.

## Tags and categories

The existing OwnerRez blog has two categories: **Things to do in Destin** and **Destin useful information**. The replacement hub uses clearer reader-facing groups while retaining those meanings.

A tag page such as `/tag/tesla-destin/` is not inherently beneficial. The inspected example contained one article, a generic heading, and little unique value. Our policy:

- store useful tags in article data;
- expose filters on the hub without generating a crawlable URL for every tag;
- create indexable category/topic landing pages only when they offer unique explanatory copy and multiple strong articles;
- otherwise use `noindex,follow` or omit the archive.
