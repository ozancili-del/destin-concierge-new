# Analytics measurement plan

## Source of truth

- GA4 measurement ID: `G-3SGXCQ4FTC`
- GTM container: `GTM-PQSF8S6D`
- `public/site-analytics.js` is the only site-owned analytics initializer.
- GA4 sends the behavioral events. GTM remains available for Clarity and vetted marketing tags; do not add duplicate GA4 configuration or event tags in GTM.
- Preview and local hosts create an inspectable `dataLayer` but do not contact Google or GTM.

## Canonical funnel

| Stage | Event | Meaning |
| --- | --- | --- |
| Discover | `page_view` | One sanitized view per URL, including client-side navigation |
| Search | `search` | Dates and guest counts submitted to live availability or a rate finder |
| Compare | `select_item` | A specific condo is selected |
| Intent | `booking_cta_click` | Visitor follows a booking or availability CTA |
| Checkout | `begin_checkout` | Visitor starts a unit-specific booking flow |
| Lead | `generate_lead` | Inquiry is sent |
| Sale | `purchase` | Reservation is completed by the booking platform |

Supporting events are `affiliate_click`, `contact`, `chat_open`, `chat_message_sent`, and `select_content`.

Legacy events are mapped to the canonical funnel for continuity: `BookingStarted`, `InquirySent`, `inquiry_sent`, `book_direct_click`, `snowbird_book_click`, `find_window_click`, `snowbird_find_rate`, and `tile_click`.

## Privacy rules

- Never send names, email addresses, phone numbers, messages, comments, or questions.
- Strip sensitive query parameters from recorded page and link URLs.
- Record contact method, not the email address or telephone number.
- Treat dates, party size, unit ID, placement, partner, and route as operational metadata.

## Cutover checks

1. Configure cross-domain measurement for the first-party subdomains and any external checkout domain that actually becomes part of the live flow.
2. Add unwanted self-referrals for booking/payment domains only after confirming the live navigation path.
3. Mark `generate_lead`, `begin_checkout`, and `purchase` as key events in GA4; do not mark clicks or page views as key events.
4. Verify DebugView once using a non-production debug session, then verify production Realtime after DNS cutover.
5. Reconcile completed reservations against the booking platform; GA4 is directional analytics, not the financial ledger.
6. Do not publish the unrelated pending GTM workspace deletion during migration.

## Baseline observed before migration

The signed-in GA4 property showed strong discovery traffic but a weakly instrumented booking funnel: roughly 20,000 active users year to date, 24 `BookingStarted` events, 16 `begin_checkout` events, and two purchases. It also showed self-referral traffic from the primary domain. The migration objective is consistent funnel measurement and attribution—not retroactive rewriting of historical data.
