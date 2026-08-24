# OwnerRez Hosted Website offline archive

Archive date: August 23, 2026  
Scope: the **OwnerRez Hosted Website add-on**, not the OwnerRez PMS account, API, widgets, calendars, reviews, payments, or webhooks.

## What was captured

### Captured directly from the signed-in OwnerRez administrator

- Hosted website name: `Destin Condo Getaways`
- Live domain: `destincondogetaways.com`
- Test site name: `destin-getaways`
- Property scope: `All`
- Status at capture: `Enabled`
- OwnerRez displayed one hosted-website record.

No OwnerRez setting was saved, published, disabled, or deleted during capture.

### Reconstructed from repository evidence

The OwnerRez page editor repeatedly timed out, so a raw page-by-page CMS export could not be captured reliably. The replacement site's authoritative migration records were therefore used to reconstruct the inventory:

- [`page-inventory.csv`](page-inventory.csv): 46 current canonical public routes.
- [`legacy-redirect-inventory.csv`](legacy-redirect-inventory.csv): known OwnerRez-era and interim aliases that remain permanently redirected.
- [`retired-host-inventory.csv`](retired-host-inventory.csv): four retired public subdomains, their fallbacks, and path exceptions.
- [`hosted-site-settings.md`](hosted-site-settings.md): directly observed site-level settings and the capture limitation.
- [`dependency-reconciliation.md`](dependency-reconciliation.md): what survives Hosted Website cancellation and what must remain active.
- [`shutdown-checklist.md`](shutdown-checklist.md): evidence required before cancelling only the Hosted Website add-on.

Primary source records outside this folder:

- [`../MIGRATION-LEDGER.md`](../MIGRATION-LEDGER.md)
- [`../REDIRECT-MASTER-MAP.md`](../REDIRECT-MASTER-MAP.md)
- [`../WEBSITE-SEO-SCHEMA-INVENTORY.md`](../WEBSITE-SEO-SCHEMA-INVENTORY.md)
- [`../BLOG-MIGRATION-INVENTORY.md`](../BLOG-MIGRATION-INVENTORY.md)
- [`../../config/redirect-inventory.js`](../../config/redirect-inventory.js)
- [`../../pages/sitemap.xml.js`](../../pages/sitemap.xml.js)

## Archive conclusion

The guest-facing replacement and local asset archive are in the Git repository. The main site no longer depends on OwnerRez Hosted Website pages or their DNS to render. It **does** intentionally depend on OwnerRez's reservation services and widgets for live booking, calendars, availability, and reviews.

This archive is complete enough to preserve the migration record, but it is not a raw OwnerRez CMS export. Cancellation approval remains separate: the migration ledger requires a post-cutover stability window and immediate smoke testing after cancellation.
