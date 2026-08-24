# Hosted-site settings capture

## Direct OwnerRez evidence

Captured read-only from `https://app.ownerrez.com/settings/hostedsites` on August 23, 2026.

| Field | Captured value |
|---|---|
| Name | Destin Condo Getaways |
| Live | destincondogetaways.com |
| Test | destin-getaways |
| Properties | All |
| Status | Enabled |
| Hosted-site records visible | 1 |

The page also exposed `Create Hosted Website` and `Copy Existing Website` controls. Neither was used. No setting was changed.

## Capture limitation

The signed-in OwnerRez editor did not respond reliably enough for a defensible raw export of every CMS page, theme field, menu, or code-injection field. Repeated attempts timed out. Those items are therefore **not represented as directly captured**.

Instead, the page corpus and destination mappings were reconstructed from the checked-in sitemap, redirect source of truth, content reconciliation documents, asset migration manifest, and launch ledger. This distinction matters: the repository inventory proves what was migrated and what the live site serves, but it does not claim to be a byte-for-byte export of OwnerRez's internal CMS database.

## DNS rollback record

The migration ledger records the former OwnerRez rollback values:

- Apex A: `52.201.23.5`, `52.86.46.114`, `34.235.235.52`
- `www` CNAME: `hosted.ownerrez.com`

These values are historical rollback evidence only. Do not restore them unless a deliberate rollback is approved.
