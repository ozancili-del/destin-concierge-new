# Destin live music guide migration reconciliation

- Source and canonical destination: `/blog/destin-live-music-2026`
- Source visible text: approximately 2,252 words
- Preserved: the 2026 concert highlights, venue-by-venue guidance, free performance options, seasonal advice, internal links and interactive music calendar
- Preserved dependency: the live calendar stays on the existing Destin Concierge Vercel origin so its current data and behavior remain intact
- Structured data rebuilt without duplication: WebPage, BreadcrumbList, Article, ItemList and LodgingBusiness
- Responsive requirements: the interactive calendar must remain within the article width on mobile with no horizontal overflow

No article section was intentionally discarded. Duplicate OwnerRez schema was consolidated.
