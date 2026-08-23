# Destin weather and water-temperature guide migration reconciliation

- Source and canonical destination: `/blog/destinweather`
- Source supplied directly from the current OwnerRez page markup
- Preserved: live NOAA conditions, monthly water-temperature table, swimming comfort bands, Crab Island and pontoon guidance, beach-flag safety, seasonal recommendations, FAQs and internal links
- Preserved dependency: one live beach-conditions embed on the existing Destin Concierge Vercel origin
- Transferred: the OwnerRez masthead now uses the existing local Pelican Beach photograph
- Consolidated structured data: WebPage, BreadcrumbList, Article, FAQPage, Dataset and LodgingBusiness
- Removed: duplicate Article, BlogPosting, business and property schema blocks embedded in the old article
- Responsive requirements: the live conditions panel and temperature table must remain within the article width on mobile

No visible article section was intentionally discarded. Conversion-copy claims and the prominent offer CTA remain preserved for the separate copy review already parked with the owner.
