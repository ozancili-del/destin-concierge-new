# Destin Essentials Article Content Audit

## Current page

- Source URL: `https://www.destincondogetaways.com/blog/destinessentials`
- Intended replacement path: `/blog/destinessentials`
- Status: rebuild required before migration; do not copy directly.

## Why direct migration is unsafe

The current page title and meta description promise a broad Destin visitor guide covering grocery stores, pharmacies, packing guidance and what to expect at Pelican Beach Resort. The visible article currently covers hospitals/urgent care, pharmacies and emergency contacts only. It does not deliver the grocery, packing or resort-arrival sections promised by the search snippet.

The saved HTML also contains presentation wrappers copied from a ChatGPT conversation, including:

- conversation-turn and message-role containers;
- Tailwind/ChatGPT interface class names;
- an empty input form;
- redundant nested layout elements unrelated to the article.

These elements must not be migrated.

## Information requiring verification

Before publishing the rebuilt page, verify each facility name, status, address, phone number, hours and service description against an official source. Particular attention is required for:

- hospital/urgent-care branding and locations;
- the listed independent pharmacy name;
- which law-enforcement agency serves Destin;
- fire-district and poison-control contact details;
- 24-hour versus limited-hour availability.

No emergency or medical detail should be inferred from the old article.

## Required rebuilt content

The replacement should fulfill the actual search intent and its own metadata:

1. grocery stores near Pelican Beach Resort;
2. pharmacies and urgent-care options;
3. emergency contacts, with a clear 911 instruction;
4. beach and sun essentials;
5. packing checklist;
6. family/child essentials;
7. arrival-day shopping strategy;
8. links to the resort guide, weather, beaches, restaurants, map and guest guide;
9. live-availability form near the top;
10. concise FAQ based on visible page content.

## Structured-data plan

Use one nonduplicated graph containing:

- `WebPage`
- `Article`
- `BreadcrumbList`
- `FAQPage` only when the matching questions and answers are visibly present
- the shared sitewide `LodgingBusiness` reference

Do not copy hidden, mismatched or unsupported FAQ answers. The preview stays `noindex,nofollow` until final-domain cutover.

## Migration decision

Preserve the useful intent and verified facts, not the broken interface markup. The current page remains live and untouched until the replacement content is verified and approved.
