# Pelican Beach Resort content reconciliation

Source URL: `https://www.destincondogetaways.com/pelican-beach-resort-destin-574048693`

Destination route: `/resort`

Audit date: 2026-08-15

## Source problems corrected

- Two visible H1 headings were consolidated into one descriptive H1.
- A malformed JSON-LD block embedded a second `<script>` inside the first script. It was rebuilt as one valid JSON-LD graph.
- Duplicate LodgingBusiness definitions were reconciled into one business entity.
- Unit 707 and Unit 1006 VacationRental objects were retained as separate entities and supported by visible condo cards.
- FAQ structured data was aligned exactly with visible semantic `details/summary` content.
- Existing production GTM container `GTM-PQSF8S6D` is preserved globally but activates only on the production hostname, preventing preview analytics contamination.

## Content disposition

| Existing content | New destination | Status |
|---|---|---|
| Resort introduction and owner experience | Resort hero and introduction | Retained and tightened |
| 1002 US-98 address and central Destin location | Location section, footer and JSON-LD | Retained |
| Pelican versus Terrace beachfront distinction | Beachfront introduction and FAQ | Retained |
| Private white-quartz beach description | Beach section | Retained |
| Seasonal La Dolce Vita service and owner-provided beach gear | Beach section | Retained with seasonal qualification |
| Seasonal Tiki Bar | Beach and amenities sections | Retained |
| Three pools, kiddie pool and two hot tubs | Pools, amenities and FAQ | Retained |
| Fitness, sauna, steam room, courts, grills and laundry | Amenities grid | Retained |
| Parking, security and EV charging | Amenities and FAQ | Retained |
| Interactive amenity map | Embedded `/pelican-beach-interactive.html` | Retained |
| VPS/PNS distances and nearby attractions | Location section | Retained with traffic qualification |
| Unit 707 and Unit 1006 comparisons | Visible condo cards and VacationRental schema | Retained |
| Direct-booking explanation | Short booking path plus internal link to `/why-book-direct` | Moved by search intent |
| Emerald Coast destination overview | Short beach/location copy plus internal guide links | Consolidated |
| Six resort FAQs | Visible dropdowns and FAQPage schema | Retained |
| Three reviews and 4.94/400 aggregate | Visible review cards and LodgingBusiness schema | Retained |
| Related guides | Related-links section and complete footer | Expanded |

## Deployed verification gate

- Exactly one H1.
- All five page images loaded and have descriptive alt text.
- Availability form posts to the existing OwnerRez `/properties` flow.
- Interactive map loads from the repository asset.
- JSON-LD types: WebPage, BreadcrumbList, FAQPage, LodgingBusiness, VacationRental, VacationRental.
- Six visible FAQs match six FAQPage entities.
- Full postal address, ZIP and geo coordinates present.
- 4.94/400 aggregate and three reviews present visibly and in schema.
- Preview remains `noindex,nofollow`.
- GTM is present in shared app code but intentionally dormant on the Vercel preview hostname.

## Cutover-only checks

- Replace preview robots directive with production indexing and canonical.
- Map the old OwnerRez URL directly to `/resort` using one permanent redirect.
- Run Google Rich Results Test on the production-domain version.
- Confirm GTM Preview mode sees `GTM-PQSF8S6D` and audit every tag, trigger and conversion before DNS cutover.
- Confirm GA4, Search Console verification and consent behavior on the final production hostname.
