# Destin fireworks guide migration reconciliation

- Source and canonical destination: `/blog/destin-fireworks-2026`
- Source visible text: approximately 2,058 words
- Preserved: the 2026 schedule, venue details, directions, parking and viewing guidance, FAQs, internal links, and the interactive July 4 map
- Transferred: all five unique OwnerRez-hosted article photographs now live in `public/` with descriptive filenames
- Deduplicated: repeated hero imagery and duplicate OwnerRez schema are consolidated without removing article sections
- Structured data rebuilt without duplication: WebPage, BreadcrumbList, Article, FAQPage and LodgingBusiness
- Responsive requirements: the interactive map and photographs must remain within the article width on mobile with no horizontal overflow

No article section was intentionally discarded. The live map remains on the already-authorized Vercel origin until the final production hostname is authorized.
