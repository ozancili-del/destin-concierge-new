# OwnerRez Hosted Website shutdown checklist

## Before cancellation

- [x] Production DNS points to Vercel through Cloudflare.
- [x] Canonical sitemap contains the 46 intended public routes.
- [x] Legacy redirect inventory is stored independently of OwnerRez.
- [x] Main-site asset audit reports no legacy hosted-site image dependency.
- [x] Direct OwnerRez hosted-site record is archived in this folder.
- [ ] Complete the agreed stability window. Cutover was August 22, 2026; this archive was created only one day later.
- [ ] Confirm `/book`, `/availability`, both unit pages, review feed, calendars, totals, inquiry, and checkout still work immediately before cancellation.
- [ ] Confirm the Destiny/OwnerRez webhook's current owner and purpose before disabling it; it is not automatically part of Hosted Website cancellation.
- [ ] Preserve billing screenshots or cancellation confirmation from OwnerRez.

## Cancellation boundary

Cancel only the product explicitly labelled **Hosted Website** (or equivalent website-hosting add-on).

Do **not** cancel or disable:

- OwnerRez account/PMS
- properties, rates, taxes, fees, rules, payments, or channel configuration
- API access or credentials
- booking, inquiry, calendar, availability, or review widgets
- webhooks without a separate dependency audit

## Immediate post-cancellation smoke test

- [ ] Homepage and all priority canonical pages return `200`.
- [ ] Old OwnerRez numbered URLs permanently redirect to their clean canonical destinations.
- [ ] Availability results preserve dates, adults, children, and total guests.
- [ ] Unit 707 and Unit 1006 show live totals and charge details.
- [ ] Booking and inquiry controls load; stop before submitting a real reservation unless an approved test booking is used.
- [ ] Reviews and calendars load.
- [ ] `robots.txt` and `sitemap.xml` remain correct.
- [ ] Watch Vercel/Cloudflare errors, Google Search Console, Bing Webmaster Tools, analytics, and conversion events.

## Recommended decision rule

Do not cancel solely because the replacement site is live. Cancel after at least seven error-free days for booking, widgets, redirects, and crawling; retain heightened monitoring through the first 30 days. If the next OwnerRez billing date forces an earlier decision, repeat the complete smoke test immediately before and after cancellation and retain this repository archive plus the historical DNS values.
