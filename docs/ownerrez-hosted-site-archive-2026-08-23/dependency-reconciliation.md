# OwnerRez dependency reconciliation

## Safe distinction

Cancelling the **Hosted Website add-on** is not the same as cancelling OwnerRez. The following operational services must remain active unless they are separately replaced and tested.

| Dependency | Current use | Classification |
|---|---|---|
| OwnerRez PMS/account | Reservations, rates, availability, guest and property operations | **Keep active** |
| OwnerRez API (`api.ownerrez.com/v2`) | Live availability, calendar, booking and related server workflows | **Keep active** |
| OwnerRez widget loader (`app.ownerrez.com/widget.js`) | Booking/inquiry on `/book`, availability calendar, review feed | **Keep active** |
| OwnerRez payments/checkout | Final reservation transaction | **Keep active** |
| Destiny/OwnerRez webhooks | Operational integration; audit independently before disabling | **Keep until separately proven obsolete** |
| OwnerRez Hosted Website pages/theme/navigation | Replaced by Vercel production site | Candidate for cancellation after stability gate |
| OwnerRez Hosted Website DNS | Replaced by Cloudflare/Vercel | No longer active for production rendering |

## Asset survival

- The launch asset audit covers 193 migrated references and found no guest-site dependency on legacy hosted-site image URLs.
- `data/site-image-migration.json` retains OwnerRez CDN source URLs as provenance; local files under `public/images/site/` are the runtime replacements.
- Older reconciliation notes mentioning `uc.orez.io` are superseded by the later launch asset audit.
- TV/GuestView prototype files may still reference an OwnerRez-hosted image. They are quarantined separate projects and are not part of the public storefront. Archive or replace that image before reviving those projects.

## What cancellation must not change

- Current Vercel deployment and Cloudflare DNS.
- Live availability searches and all five booking parameters.
- Unit-specific totals and charge details.
- Booking and inquiry submission.
- Review feed and compact calendars.
- OwnerRez API credentials, property configuration, rates, taxes, fees, policies, payments, or messaging.

The Hosted Website add-on should be treated as a retired presentation layer only. Any OwnerRez cancellation screen that includes PMS, widgets, API, payments, or booking services is out of scope and must not be confirmed.
