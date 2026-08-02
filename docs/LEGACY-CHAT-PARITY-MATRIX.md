# Legacy `pages/api/chat.js` capability parity

Date: 2026-08-01  
Legacy source: `pages/api/chat.js` on `main`  
Candidate: Agent v3 on `agent/agent-v3-endpoint-flag`

## Meaning of this audit

This matrix inventories the guest-visible and operational behavior in the 4,193-line legacy handler. A capability is not marked **verified** merely because similar words occur in an AI prompt. It needs a deterministic implementation or knowledge source, a callable Agent v3 route, and an offline test. Live vendor behavior remains a separate cutover gate.

Status meanings:

- **Verified**: implementation and offline test exist.
- **Verified, owner change**: deliberately differs from the legacy behavior and has an owner-policy test.
- **Controlled test pending**: code and offline isolation tests exist, but real credentials/data have not been exercised.

## Booking and inventory

| Legacy capability | Agent v3 implementation | Test evidence | Status |
|---|---|---|---|
| Parse ordinary, misspelled, cross-year, numeric and multilingual date ranges | `extractDates`, `parseDateText`, `validateDateRange` | business matrix + fuzz suites | Verified |
| Resolve named 2026 holidays | `HOLIDAY_DATES`, `extractHolidayDates` | business matrix holiday cases | Verified |
| Reject vague weeks/months until exact dates are known | `detectVagueWeek`; availability requires a valid range | legacy parity contract + tool matrix | Verified |
| Apply explicit check-in/check-out/whole-stay date adjustments | `parseDateAdjustment` | business matrix + fuzz suite | Verified |
| Treat “stay N more days” as checkout extension and recheck | deterministic pre-route in `runAgentTurn` | owner alert-policy suite | Verified, owner change |
| Ask what “make it one day later” refers to | ambiguous adjustment is not silently applied | legacy parity contract | Verified, owner change |
| Preserve current dates and party across relevant follow-ups | typed state and state patching | stress + state-integrity suites | Verified |
| Fresh OwnerRez verification before every booking-link request or resend | `check_availability`; no persisted-link resend | controlled integration + policy suite | Verified, owner change |
| Fail closed on unknown or malformed inventory | tri-state service adapter and URL guard | service chaos + tool matrix | Verified |
| Offer one or both units only when positively open | availability tool and reply validator | controlled integration + matrices | Verified |
| Offer verified partial-stay windows when full stay is booked | `fetchCalendarAlternatives` through `check_availability` | tool matrix partial-window cases | Verified |
| Find alternative open windows | `find_open_windows` | tool + service matrices | Verified |
| Respect maximum six occupants per unit | `validateParty`, `MAX_OCCUPANCY` | business matrix + fuzz suite | Verified |
| Split 7–12 guests across two condos without losing adults/children | `findValidTwoUnitSplits` | exhaustive party matrix + fuzz invariants | Verified |
| Require both condos to be open before presenting a split | two-unit availability path | tool matrix | Verified |
| Enforce adult/child HOA composition rules | `validateParty` and split validator | business/tool/fuzz matrices | Verified |
| Use disclosed adults and zero children when children are not mentioned, while explaining the assumption | deterministic party baseline | owner policy suite | Verified, owner change |
| Ignore non-traveling relatives and past-trip numbers | evidence-scoped party parser | stress + owner policy suites | Verified |
| Let guest update party on booking page or reply for a fresh link | Agent prompt and deterministic availability result facts | owner policy suite | Verified, owner change |
| One-bedroom mismatch disclosure | deterministic detector + reply validator + knowledge | business matrix | Verified |
| Exact OwnerRez booking-link parameters | `buildBookingLink` | business matrix + fuzz suite | Verified |
| Price-drop facts without invented totals | `fetchPriceDrops` inside availability | tool + service suites | Verified |
| Ticker-selected unit remains preference only; inventory is still checked | route context + prompt | endpoint cutover suite | Verified |

## Existing guests and operations

| Legacy capability | Agent v3 implementation | Test evidence | Status |
|---|---|---|---|
| Signed existing-booking lookup | server-owned booking ID/signature + OwnerRez adapter | handler, tool and service suites | Verified |
| Booking-specific greeting and pre/during/post-stay wording | `chat-agent.js` deterministic entry handling | handler matrix | Verified |
| Door code released only inside the approved seven-day window | booking service + reply permission guard | service, chaos and adversarial suites | Verified |
| Lockout treated as emergency | deterministic safety backstop | adversarial + tool matrix | Verified |
| Maintenance alert delivery | Discord service adapter | controlled integration + service suites | Controlled test pending |
| Every reported damage or external disturbance reaches maintenance alerts | safety backstop | owner alert-policy suite | Verified, owner change |
| Repeated later maintenance messages may alert again | per-turn rather than conversation-wide dedupe | controlled integration | Verified, owner change |
| Empathy never invents compensation or hints that Ozan may provide it | prompt + monetary/concession validator | security/adversarial suites | Verified, owner change |
| Relay an explicit message to Ozan | `relay_owner_message` | tool + live-routing suites | Controlled test pending |
| Request owner live chat without exposing the internal URL | `request_owner_chat` + Discord adapter | tool, service and controlled integration suites | Controlled test pending |
| Google Sheets state/transcript persistence | route and Sheets adapter | handler + chaos suites | Controlled test pending |
| Exact hidden owner pricing snapshot command | complete-message route match | endpoint + handler suites | Controlled test pending |

## Trip planning and lead flows

| Legacy capability | Agent v3 implementation | Test evidence | Status |
|---|---|---|---|
| Live Destin forecast with honest failure behavior | `get_destin_weather` | controlled, service and chaos suites | Controlled test pending |
| Seasonal weather and live-water-condition guidance | business knowledge retrieval | legacy parity contract + knowledge tests | Verified |
| TripShock categories, affiliate attribution and optional dates | `search_activities`, `buildTripShockLink` | business/tool/fuzz suites | Verified |
| Beach photographer request routes to TripShock | deterministic route | owner policy suite | Verified, owner change |
| Itinerary request routes immediately to dedicated planner | deterministic route | owner policy + service suites | Verified, owner change |
| Flight links use confirmed condo dates unless explicit flight dates differ | `search_flights` | controlled integration + owner policy | Verified, owner change |
| Never claim activity or flight links prove live price/seats/availability | prompt + claim guard | owner policy and adversarial suites | Verified |
| Blog/local guide retrieval and approved URLs | `get_local_guide`, knowledge retrieval | tool, service and URL-security suites | Verified |
| Page-source greetings | deterministic handler routing | handler matrix | Verified |
| Eligible email capture through Brevo and BLUE unlock only after success | `capture_lead` | tool, service and adversarial suites | Controlled test pending |

## Property knowledge and policies

The legacy system prompt was preserved as `knowledge-v1.js` and is accessed through `get_business_knowledge` / `get_unit_facts`. The parity contract checks retrieval and preservation of the high-risk rule families below:

- unit differences, sleeping layout and maximum occupancy;
- resort pools, café, grills, fitness, parking, wristbands and beach access;
- beach-chair placement and LDV service facts;
- AC, balcony, appliances, outlets, Wi-Fi and TV guidance;
- pets/service animals, smoking, accessibility and child safety;
- security deposit, cancellation, booking transfer and refund boundaries;
- direct-booking and monthly-stay discounts;
- competitor, trust/scam and escalation handling;
- restaurants, shopping, beaches, events, airports and seasonal local guidance;
- contact information and owner escalation boundaries.

These knowledge families are covered by `legacy-capability-parity-v3.test.mjs` plus the existing knowledge/tool suites. Exact factual answers still depend on the model calling the required knowledge tool; the prompt explicitly requires that call and the completion/URL/claim guards police the result.

## Conclusion and cutover gate

No legacy capability is currently classified as missing in the offline code audit. This does **not** authorize production cutover. OwnerRez, Sheets, Discord, Brevo, weather, door-code and owner-chat behavior still require controlled real-integration testing; the full live-model benchmark must be rerun after the latest deterministic changes; Preview must then pass smoke, canary and rollback exercises. The feature flag remains off by default and `pages/api/chat.js` remains the rollback implementation.
