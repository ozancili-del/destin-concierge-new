# Destin events guide migration reconciliation

- Source and canonical destination: `/blog/destin-events-2026`
- Source visible text: approximately 2,714 words
- Preserved: the month-by-month 2026 calendar, major festivals, fishing events, concerts, seasonal guidance, FAQs and internal links
- Preserved dependency: the existing events masthead remains on the Destin Concierge Vercel project because its asset export failed; the page itself uses a local events hero
- Structured data rebuilt without duplication: WebPage, BreadcrumbList, Article, FAQPage and LodgingBusiness
- Responsive requirements: all event listings and CTA sections must remain within the article width on mobile with no horizontal overflow

No article section was intentionally discarded. Duplicate OwnerRez and GTM-injected schemas were consolidated.
