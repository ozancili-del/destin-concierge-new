# Destiny Blue Phase 1 — local candidate for review

The local implementation is prepared in isolated Concierge and HQ worktrees. **This is not accepted for public activation.** The live semantic gate requires approval to send the compiled guest-safe material and test fixtures to OpenAI. No public deployment, alias, environment variable, publication pointer, or original HQ state was changed.

## What is implemented

- HQ compiler: strict guest-field allowlist, publication/expiry/conflict/revocation checks, immutable content hash, compact local index, and projections tied to eligible fact hashes. Ungrounded historical summaries are discarded. Compiler errors prevent publication.
- Airport reconciliation: canonical VPS → PNS → ECP ordering and approved planning estimates. The stale aggregate “no fixed airport time” fact is explicitly superseded, with authority recorded in the compiler report. Source history is retained.
- Shared runtime: one strict semantic request interpreter, deterministic server capability policy, typed independent subrequest results, pinned session revision, cumulative recommendation exclusions, category changes, and scoped use of existing business tools. The new path never invokes the full Chat agent or fetches HQ/GitHub knowledge during a guest request.
- Business protections: fresh booking-link checks and resends, tri-state availability, two-unit occupancy splits, correction invalidation, verified alternatives, price-drop wording, browsing links for flights/activities/cars, itinerary/Sunbird/photos destinations, pending search consent, partial-source beach warnings, and server denial of elevated operations.
- Private adapters: `/api/destiny-private-chat` and `/api/destiny-private-voice`, a `/destiny-private` review page, and a local-only Voice Lab switch. The existing audio transport/coordinator remains in place. The new review page excludes the legacy floating Chat widget.
- Local publication mechanics: immutable objects, atomic compare-and-swap pointer/history, idempotent publication IDs, signed gate receipts, runtime-code fingerprint binding, rollback, cache singleflight and last-known-good behavior. This adapter deliberately refuses Vercel’s ephemeral filesystem.
- Executable evaluation harness: all 214 definitions / 524 phrases expand into actual Chat/Voice execution and semantic answer checks. Missing model responses or grading cannot produce a passing receipt. Expected answers are not supplied to the interpreter. The CLI changes no pointer.

## Evidence

| Check | Result |
| --- | --- |
| New compiler/runtime/HTTP/gate checks | 34 passed, 0 failed |
| Full Concierge suite | 1,224 passed / 1,234; same 10 baseline failures |
| Original HQ suite | 22 passed / 23; existing authoritative-review fixture failure |
| Concierge and HQ local builds | Passed |
| Full compiled corpus | 194 entries, 1,262 eligible facts |
| Direct retrieval of every compiled entry | 194 / 194 passed |
| Local artifact load | About 85 ms in this run |
| Warm local retrieval | Median 0.62 ms; p95 3.14 ms, 100 samples |
| Real local HTTP adapter parity | Passed with explicitly scripted interpreter/services |
| Live semantic / answer-grading gate | 0 completed; approval blocked |
| Physical Voice / mobile audio | Not run |

The timing figures measure local loading and deterministic retrieval only. They exclude model/provider latency and audio. Fixture tests do not establish natural-language acceptance.

The ten Concierge baseline failures concern price-drop wording in the legacy agent, legacy link expectations, two map/SEO expectations, a future holiday window, two syntactically invalid test files, a TripShock fuzz path assertion, a prompt-size bound, and weather precipitation. They are recorded failures, not waived acceptance criteria. The new scoped renderer has a passing price-drop test; that does not resolve the separate legacy-agent failure.

## Revisions and files

Concierge base: `f0af946661610c7a6d4fc5cdfc1760cc498ba2f2`.

HQ base: `324ba04861168b587fc60c7429c56df02db0ca95`.

Both isolated branches: `migration/phase1-private-20260908`.

Compiled candidate: `f97caa7f4599f975271bf20e0f20d097d4847cbcb6db37fd902887698f2a78ef`.

The source state is version 149, SHA-256 `ed80dede76107dc71dbf084ab4dba662cba980167db451d103ad99c41697f43f`. The published content revision used for lineage is `64a715cc4cf0cf170edc57f1da4a5994276431d6`.

The review package contains patches for both verified bases, the guest artifact, evaluation definitions, compiler/validation reports, and the 69-row preservation matrix. It excludes repository history, environment files, credentials, node_modules, and the raw HQ archive.

## Run locally after review

Use the existing worktrees under this task’s `work/concierge` and `work/hq`, or apply each patch to its matching base. No dependency or lockfile changes are required.

Compile a candidate from an explicitly pinned state file:

```powershell
node --experimental-default-type=module scripts/compile-runtime-candidate.mjs <state.json> <source-commit> 2026-09-08 <output-directory>
```

Install the artifact without publishing a pointer, from the Concierge checkout:

```powershell
node --experimental-default-type=module scripts/install-private-candidate.mjs <artifact.json> <absolute-local-store>
```

The local server reads `DESTINY_PRIVATE_RUNTIME=1`, `DESTINY_PRIVATE_STORE`, and `DESTINY_PRIVATE_REVISION`. It binds session state to a signed HttpOnly cookie and rejects remote peers, non-local hosts, cross-origin requests, and browser-supplied authority/state. `DESTINY_PRIVATE_SESSION_KEY` may be set securely for session continuity across restarts; otherwise it is generated in memory. No key belongs in source control.

Model calls require the existing secure `OPENAI_API_KEY` configuration and the pending payload-specific approval. The default interpreter/grader is `gpt-5.6-sol`. A review-only page can be served with that credential removed from the server process; it will fail closed if a question is submitted.

After approval, the executable language gate is:

```powershell
node --experimental-default-type=module scripts/run-private-publication-gate.mjs <artifact.json> <evaluations.json> <report.json>
```

This sends the entity/category catalog, guest questions/context, and selected approved facts/assertions to OpenAI. It uses deterministic business-service fixtures and does not contact guests, send alerts, capture leads, or change reservations. Live-provider and physical Voice acceptance remain separate gates. Some supplied alternate questions have missing antecedents; the grader must report those fixture/context issues rather than manufacture context from expected entity IDs.

## Remaining work before activation

1. Run the small live smoke test, then the full phrase/caveat/coverage/parity suite with approval. Resolve failures, including natural prose, multilingual delivery, recommendation relevance and ambiguous fixture context. Current guest prose is largely extractive English; multilingual output is not established.
2. Complete the capability matrix’s provider-backed and authenticated checks. Elevated operations are retained in the original path but denied by default in this private candidate; their migration is not activated. Existing-booking greetings, alerts, owner chat, lead capture and operational persistence must not be marked preserved merely because their old code still exists.
3. Complete real-device Voice testing: accepted utterances, interruptions, playback, consent, link display, and failure behavior. The local build and coordinator tests cannot establish acoustic behavior.
4. Choose and validate a durable hosted object/pointer/session adapter before any Vercel preview activation. The local filesystem implementation is a reference adapter, not a hosted storage deployment.
5. Reconcile remaining baseline failures and obtain explicit owner approval for public activation. A successful language-gate receipt alone is not a complete release approval.

## Rollback

Default flags leave existing public routing intact. Turn the private flag off to return the local Voice page to its original path. Local backup refs preserve both bases. A local store rollback uses an expected generation and unique publication ID and reuses the previous verified artifact/receipt; if the runtime fingerprint changed, restore the matching runtime version too. A failed gate, invalid signature, hash mismatch or stale generation cannot advance the pointer. No public rollback is needed because no public change occurred.

## Approval boundary

The read-only OpenAI model lookup succeeded. Automatic approval review then rejected the live smoke test because repository-derived payloads would leave the machine for potentially billable OpenAI processing without specific approval. No semantic response or grade was obtained. An earlier attempt to inspect Vercel Environment Variables was also blocked because that page may expose credentials; deployed model overrides remain unverified. The local test credential does not require opening that page.

Approval is requested for the small semantic smoke test and then the 524-phrase Chat/Voice evaluation suite against OpenAI, using the compiled guest-safe material described above. Public deployment and operational side effects are outside this request.
