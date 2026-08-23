# Best beaches guide migration reconciliation

- Source and canonical destination: `/blog/best-beaches-destin`
- Source visible text: approximately 3,377 words
- Preserved: all thirteen beach entries, local commentary, parking and crowd guidance, seasonal advice, internal links and the live Destin beach-conditions embed
- Deduplicated: three identical beach-condition embeds were reduced to one functional embed
- Transferred: all six OwnerRez-hosted article photographs now live in `public/` with descriptive filenames, preventing an OwnerRez-hosting dependency after cutover
- Structured data rebuilt without duplicates: WebPage, BreadcrumbList, Article and LodgingBusiness
- Responsive requirements: live conditions and photographs must remain within the article width on mobile with no horizontal overflow

No article section was intentionally discarded. Duplicate schema and duplicate live widgets were consolidated without changing the visible guide content.
