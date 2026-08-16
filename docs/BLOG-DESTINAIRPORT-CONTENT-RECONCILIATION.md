# Destin airport guide migration reconciliation

- Source: `/blog/destinairport`
- Destination: same canonical path on the Vercel site
- Migrated readable text: approximately 2,390 words
- Preserved: VPS/ECP/PNS comparisons, driving guidance, airport tables, airline and rental-car information, FAQs, internal links and airport-specific advice
- Live embeds retained: one authorized VPS-to-Pelican route map and six AirNavRadar boards (arrivals and departures for VPS, ECP and PNS)
- Removed: one duplicate occurrence of the same route map
- Structured data retained or rebuilt: WebPage, BreadcrumbList, Article, SoftwareApplication, visible FAQPage and LodgingBusiness
- Responsive rule: external boards are forced to the article width on mobile so their original 640px minimum does not create horizontal page overflow

The AirNavRadar boards are iframe integrations rather than inline scripts, so the migration preserves the live data source without copying third-party executable code into the application.
