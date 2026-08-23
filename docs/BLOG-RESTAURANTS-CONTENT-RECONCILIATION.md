# Restaurant guide migration reconciliation

- Source: `/blog/best-restaurants-destin-local-guide`
- Destination: same canonical path on the Vercel site
- Source visible text: 1,188 words with four collapsed sections
- Migrated readable text: approximately 2,585 words after expanding every restaurant category
- Preserved: quick-reference table, restaurant descriptions, owner notes, FAQ answers, internal links and the authorized interactive restaurant map
- Replaced: OwnerRez-only accordion JavaScript with permanently readable HTML
- Structured data retained or rebuilt: WebPage, BreadcrumbList, Article, ItemList, visible FAQPage and LodgingBusiness
- Map rule: keep the authorized `destin-concierge-new.vercel.app/restaurant-map.html` origin until the final production hostname is explicitly allowed by the Google Maps key

No source paragraph was intentionally discarded. Duplicate site chrome and executable OwnerRez scripts were not migrated.
