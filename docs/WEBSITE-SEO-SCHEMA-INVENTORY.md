# Website SEO and Structured-Data Migration Inventory

Status: discovery baseline captured 2026-08-15  
Source: current OwnerRez-hosted production pages and public sitemap  
Target branch: `website/homepage-preview`

## Non-negotiable migration rules

1. Preserve every legitimate structured-data object and visible supporting fact.
2. Distinguish OwnerRez-generated schema from manually embedded schema.
3. Rebuild OwnerRez-generated markup before OwnerRez hosting is retired.
4. Merge true duplicates into one accurate graph; never silently discard unique properties.
5. Structured data must match visible page content.
6. Preserve valuable visible text across the new site, redistributing duplicate content to the page with the correct search intent.
7. Use one shared header, complete deep footer, and shared button component across all pages.
8. Validate page content, links, canonical, schema and rich-result eligibility before cutover.

## OwnerRez-generated markup observed

- Homepage: Organization and BreadcrumbList in the document head.
- Unit 707: large VacationRental object in the document head.
- Unit 1006: large VacationRental object in the document head.
- Supporting pages: BreadcrumbList commonly generated in the head.
- OwnerRez-generated objects disappear when OwnerRez hosting is retired and must be recreated on the new site.

## Site-wide/manual business markup observed

A substantial `LodgingBusiness` object identified as:

`https://www.destincondogetaways.com/#business`

It includes business identity, contact information, address, geo coordinates, amenities, policies, ratings and visible review data. It appears widely across current pages and must be reconciled into a clean site-level graph.

## Page-specific structured-data inventory

| Current page | Custom/important schema observed | Migration destination |
|---|---|---|
| Homepage | Organization, BreadcrumbList, LodgingBusiness | `/` |
| Unit 707 | OwnerRez VacationRental plus manually embedded VacationRental, BreadcrumbList, LodgingBusiness | `/condos/unit-707` |
| Unit 1006 | OwnerRez VacationRental plus manually embedded VacationRental, BreadcrumbList, LodgingBusiness | `/condos/unit-1006` |
| Why Book Direct | BreadcrumbList, LodgingBusiness, ratings/reviews | `/why-book-direct` with business reference and visible supporting content |
| Pelican Beach Resort | FAQPage, LodgingBusiness, VacationRental/Accommodation details, reviews | `/resort`; redistribute unit-specific rental facts to unit pages |
| Beach Cam | VideoObject graph, BroadcastEvent, FAQPage, Article, WebPage, LodgingBusiness | `/beach-cam` |
| AI Concierge | LocalBusiness, SoftwareApplication, Offer, FAQPage | future clean concierge route |
| Itinerary Planner | FAQPage, SoftwareApplication, Offer | future clean planner route |
| Destin Weather | Article, BlogPosting, Dataset, FAQPage, Thing, Place, LocalBusiness, BreadcrumbList | future clean weather guide route |
| Fireworks | Article, FAQPage, LocalBusiness, BreadcrumbList | future clean fireworks guide route |
| Events | Article, FAQPage, LocalBusiness/LodgingBusiness, reviews, BreadcrumbList | future clean events guide route |
| Live Music | ItemList containing Event, Place and Offer objects | future clean live-music guide route |
| Best Beaches | Article, WebPage, LocalBusiness, Thing, BreadcrumbList | future clean beaches guide route |
| Restaurants | ItemList, Restaurant, Article, WebPage, LocalBusiness, BreadcrumbList | future clean restaurant guide route |
| Local Restaurant Guide | ItemList and Restaurant objects | consolidate with restaurant strategy |
| Flights and Cars | FAQPage | future clean flights/cars guide |
| Vacation Guide | FAQPage and LodgingBusiness | future clean vacation guide |
| Spa | FAQPage, Article, WebPage | future clean spa guide |
| Airport | FAQPage, SoftwareApplication, Airport, Offer | future clean airport guide |
| Car Rental | FAQPage, Article, WebPage | future clean car-rental guide |
| Best Time to Visit | FAQPage | future clean seasonal guide |
| AI Direct Booking article | FAQPage | future clean article route |
| Vacation Rental AI Concierge article | BlogPosting, WebPage, FAQPage | future clean article route |

## Known quality issues to improve

- Resort page currently renders two H1 headings.
- Current unit pages duplicate VacationRental objects from automatic and manual sources.
- Unit 707 currently has many images without useful alt text.
- Unit 1006 currently has many images without useful alt text.
- Some pages duplicate BreadcrumbList and business objects.
- Rich Results Test validity does not remove the need for content/schema consistency.
- Self-referential business review markup must be reviewed against current Google guidelines; visible review content will still be preserved for users.

## Content-preservation gate per page

Before a page is marked migrated:

- Record old title, meta description, canonical and H1/H2 structure.
- Record visible body-text length and section outline.
- Record all internal links and images.
- Record every JSON-LD block, nested type and unique property.
- Identify which text remains, moves to another page, is consolidated, or is improved.
- Confirm no unique useful statement disappears without an explicit destination.
- Confirm the complete shared footer and standardized buttons are present.
- Confirm responsive rendering and availability handoff.
- Run structured-data validation and a crawl/link check.

## Cutover gate

- Clean URLs live and canonical.
- Old OwnerRez URLs redirect directly with server-side 301/308 rules.
- New sitemap contains only canonical clean URLs.
- Redirect map tested with no chains or loops.
- Unit VacationRental markup recreated without dependency on OwnerRez.
- Page-specific schema validated against visible content.
- Search Console and Rich Results tests completed.
