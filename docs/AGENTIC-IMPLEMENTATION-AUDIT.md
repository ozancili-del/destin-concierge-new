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

The owner supplied the original `DESTINY_BLUE_AGENT_V3_947_TESTS.zip`. Its outer SHA-256 was independently verified as:

`4877140587db12a69e085731d47ccc0e6500b16c1b26296e8eb9bb45d9794aaa`

All 30 entries in the archive's internal `SHA256SUMS.txt` also verified successfully. The archive contains all 16 offline suites, `test-helpers.mjs`, the live-routing benchmark, source snapshot, retained reports, coverage output, migration checklist, and checksums. Although the retained documentation calls it a 56-case benchmark, the executable currently reports 55 cases.

The exact archived source snapshot reproduced the retained result: **947 passed, 0 failed**. Reproduced coverage was 96.90% lines, 89.32% branches, and 87.79% functions.

The 16 original offline suites were then run unchanged against this implementation branch's current source. The initial result was **903 passed, 44 failed** (96.80% lines, 88.71% branches, 87.61% functions).

After owner review of repeat-action and concession behavior, the branch now scores **921 passed, 26 failed** on the unchanged authentic suite. The combined authentic and implementation-specific suite scores **963 passed, 26 failed** across 989 tests.

Owner-approved policy encoded in this draft:

- repeated guest messages are meaningful conversation context, not machine duplicates;
- emergency and maintenance reports remain priority and may alert again on a later guest message;
- identical internal side effects are suppressed only within processing of one guest message;
- empathy cannot introduce or imply compensation or anything of value;
- the bot cannot suggest that Ozan or another party may provide a concession;
- a guest compensation request may be relayed without authorization or outcome promises; and
- an owner-approved concession may be repeated only from an explicit trusted-tool marker and exact approved text.

Two authentic expectations now intentionally conflict with the reviewed policy: one expects an already-open maintenance issue to be suppressed across later state, and one expects an identical read-only call to execute again in a later internal reasoning round. The remaining failures cluster in:

- bounded and signature-deduplicated tool execution;
- persisted booking-verification validation and invalidation;
- long-input/history bounding and multi-turn state retention;
- mixed-clause current-party parsing;
- legacy flight-tool status contracts; and
- admin snapshot structured-failure behavior.

The archived source snapshot differs materially from the current branch (including hundreds of changed orchestrator lines). It was not copied over the current implementation. The archive reports and checksum manifests are retained under `docs/agent-v3-test-archive/`; the original suites and benchmark are restored under `tests/`.

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
- Authentic archive and all internal checksums verified.
- Authentic archived snapshot reproduces 947/947.
- Centralized route defaults to regex v1 and enables v3 only for exact `"true"`.
- Existing `/api/chat` remains deployed.

Blocked or incomplete:

- Current implementation does not have offline parity: 921/947, with 26 failures, including two documented intentional policy differences.
- `npm run test:agent:live`: completed at **48/55**. Group results were compound 5/6, booking 6/6, clarification 5/6, follow-up 3/5, weather 4/4, activities 4/4, guide 4/4, knowledge 6/6, flight 3/4, safety 4/5, lead 1/2, relay 2/2, and owner-chat 1/1.
- `npm run regression -- --dry-run --limit=5`: blocked because `REGRESSION_SECRET` is unavailable.
- Real OwnerRez, Sheets, Discord, Brevo, door-code, and owner-chat tests: not run without an explicitly controlled credential/data environment.
- `next build`: dependency compilation reached Next.js but the sandbox denied `readlink C:\Users\Lenovo` (`EPERM`). This is an execution-environment restriction, not a source compilation diagnostic.
- Installed dependency audit reports two vulnerabilities (one high, one critical), including the pinned Next.js version warning. Dependency upgrades are outside this flag PR and require a separate reviewed change.

## Cutover recommendation

**Do not enable production traffic yet.** The flag must remain false until the 26 remaining offline results are resolved or explicitly rebaselined through owner-approved tests, the live benchmark reaches its required threshold, and the Sheets regression, controlled real-integration matrix, preview smoke, canary, and rollback exercise pass with an explicit production-candidate model.
