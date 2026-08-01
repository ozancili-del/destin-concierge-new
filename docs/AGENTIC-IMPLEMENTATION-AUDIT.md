# Agent v3 implementation audit

Date: 2026-08-01  
Audited baseline: `c54672482daabedcf42e13450283b564c2e3e7d2` (`main`)  
Handover reviewed: draft PR #1, head `73cf12eba60ae8f3555dfdd0df86643db2c7a701`

## Protected branch

`backup/pre-agentic-cutover-2026-08-01` remained at `c54672482daabedcf42e13450283b564c2e3e7d2`. It was never checked out for development, edited, or updated.

## Frontend endpoint inventory

Six direct `/api/chat` uses were found and centralized:

| Surface | Original call sites | New route |
|---|---:|---|
| `pages/concierge.js` | 3 | `DESTINY_CHAT_ENDPOINT` |
| `pages/index.js` | 1 | `DESTINY_CHAT_ENDPOINT` |
| `public/destiny-head.js` | 1 | `/api/destiny-chat` |
| `public/destiny-blue-tests.html` | 1 | `/api/destiny-chat` |

Raw files under `public/` are not transformed by Next.js and cannot safely read `process.env`. All surfaces therefore call the stable `/api/destiny-chat` entrypoint. Its server-side selector delegates to the untouched regex handler when `NEXT_PUBLIC_DESTINY_AGENT_V3` is not exactly `"true"`, and to Agent v3 only when it is exactly `"true"`.

## Integration parity

| Integration/capability | Agent v3 status | Audit result |
|---|---|---|
| OwnerRez availability | `check_availability`, fail-closed tri-state | Present; controlled true/false/unknown matrix passes |
| Weather | `get_destin_weather` | Present; controlled success and failure isolation pass |
| Sheets state/transcript | service adapter and route persistence | Present; live credentials not available locally |
| Discord alerts | `create_maintenance_alert` | Present; controlled single-delivery mock passes |
| Brevo | `capture_lead` | Present; missing-config fail-closed test passes |
| Existing guests | server-owned `guestBid`/`guestSig` authorization | Signature was dropped by frontend; fixed and regression-tested |
| Door codes | authorized booking lookup and release window | Present; real booking matrix still requires controlled credentials |
| Owner relay/live chat | `relay_owner_message`, `request_owner_chat` | Present; controlled explicit-request/no-internal-URL test passes |
| Pricing signals | deterministic `fetchPriceDrops` inside availability | Present; live pricing credentials/environment not tested |
| Page source | supplied to prompt and persistence | Present |
| Ticker unit | request field existed but was not passed to agent | Fixed as a preference-only prompt input; availability remains live/fail-closed |
| Admin snapshot phrase | substring regex | Fixed to complete trimmed-message match |

## Restored test provenance

The 16 files and 947-test implementation described in retained reports are not present on `main`, PR #1, any fetched branch, or reachable Git history. The attached handover contains the specification and historical totals, not the test source. This change therefore recreates a smaller auditable package from the retained behavior and defect matrix; it does **not** claim that the original 947 tests were recovered.

Current recreated package:

- `business-matrix-v3.test.mjs`
- `controlled-integration-v3.test.mjs`
- `endpoint-cutover-v3.test.mjs`
- `integration-parity-v3.test.mjs`
- `security-and-permissions-v3.test.mjs`
- `services-failure-isolation-v3.test.mjs`
- `live-routing-eval.mjs` (56 live-model cases)

Current deterministic result: **55 passed, 0 failed**.

Coverage from `npm run test:agent:coverage`:

- Lines: 31.85%
- Branches: 53.50%
- Functions: 48.81%

This is below the retained artifact report and must be reported as a divergence, not relabeled as parity.

## Defects found and fixed

1. Date/party changes retained stale booking, activity, and flight URL capabilities.
2. Unsupported generic alert-delivery language could bypass the side-effect validator.
3. Unsupported email-capture language could bypass the side-effect validator.
4. Guest-link signatures were not preserved by the frontend.
5. Ticker-unit context never reached Agent v3.
6. The owner snapshot command matched inside longer guest sentences.

## Validation and remaining gates

Passed:

- OpenAI SDK exposes `client.responses.create`.
- 55 recreated deterministic/controlled tests.
- Centralized route defaults to regex v1 and enables v3 only for exact `"true"`.
- Existing `/api/chat` remains deployed.

Blocked or incomplete:

- `npm run test:agent:live`: blocked because no `OPENAI_API_KEY` or explicit `DESTINY_AGENT_MODEL` exists in the local controlled environment.
- `npm run regression -- --dry-run --limit=5`: blocked because `REGRESSION_SECRET` is unavailable.
- Real OwnerRez, Sheets, Discord, Brevo, door-code, and owner-chat tests: not run without an explicitly controlled credential/data environment.
- `next build`: dependency compilation reached Next.js but the sandbox denied `readlink C:\Users\Lenovo` (`EPERM`). This is an execution-environment restriction, not a source compilation diagnostic.
- Installed dependency audit reports two vulnerabilities (one high, one critical), including the pinned Next.js version warning. Dependency upgrades are outside this flag PR and require a separate reviewed change.

## Cutover recommendation

**Do not enable production traffic yet.** The flag must remain false until the 56-case live benchmark, Sheets regression, controlled real-integration matrix, preview smoke, canary, and rollback exercise are completed with an explicit production-candidate model.

