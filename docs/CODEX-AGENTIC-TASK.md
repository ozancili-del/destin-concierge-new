# Destiny Blue — Codex Agentic Migration Assignment

**Read first:**

1. [`AGENTIC-HANDOVER.md`](./AGENTIC-HANDOVER.md)
2. [`AGENTIC-TEST-AND-CUTOVER-PLAYBOOK.md`](./AGENTIC-TEST-AND-CUTOVER-PLAYBOOK.md)

**Repository:** `ozancili-del/destin-concierge-new`  
**Backup branch:** `backup/pre-agentic-cutover-2026-08-01`  
**Current production rollback endpoint:** `/api/chat`  
**Agentic endpoint:** `/api/chat-agent`

---

## Assignment

Move the application from the regex-driven concierge to the agent-first concierge through a reversible, test-backed cutover.

Do not simply replace `/api/chat` and hope for the best. Restore test parity, verify live-model routing, centralize endpoint selection, test integrations in preview, and preserve an immediate rollback.

---

## Required work order

1. **Do not edit or force-push the backup branch.**
2. Read both handover documents completely.
3. Inventory the repository and compare `pages/api/chat.js` with `pages/api/chat-agent.js`.
4. Find every frontend call to `/api/chat`.
5. Verify v3 parity for OwnerRez, Weather, Sheets, Discord, Brevo, existing guests, door codes, owner relay/live chat, pricing, and page-source behavior.
6. Restore the missing offline test suites described in the playbook.
7. Recreate tests for every previously discovered defect.
8. Run the full offline suite and coverage on the current source.
9. Fix current-source divergence required to pass the intended behavior.
10. Add one centralized feature-flagged endpoint selector.
11. Deploy a preview with Agent v3 enabled and full debug on.
12. Run the 56-case live-model routing benchmark with the production-candidate model.
13. Run controlled integration tests.
14. Prepare a separate cutover PR containing evidence, risk assessment, canary plan, and rollback steps.

---

## Non-goals for the first implementation PR

- Do not delete `pages/api/chat.js`.
- Do not merge v1 and v3 into one giant endpoint.
- Do not make irreversible Google Sheets schema changes.
- Do not expose full debug state in production.
- Do not alter guest-facing business policies without Ozan's approval.
- Do not replace deterministic authorization with model judgment.
- Do not run dangerous scenarios against real Discord, Brevo, or guest data unless the environment is explicitly controlled.
- Do not claim the 947-test baseline until the tests are committed and rerun against the current code.

---

## First repository commands

```bash
git status -sb
git remote -v
git log --oneline -20

find pages/api lib/destiny-agent lib/regression scripts tests \
  -maxdepth 3 -type f 2>/dev/null | sort

rg -n '(/api/chat-agent|/api/chat|NEXT_PUBLIC_DESTINY_AGENT|DESTINY_AGENT_)' . \
  --glob '!node_modules/**' \
  --glob '!.next/**'

rg -n 'TOOL_DEFINITIONS|RESPONSE_TOOL_DEFINITIONS|runAgentTurn|executeTool|validateReply|safeFallback|parallel_tool_calls' \
  lib/destiny-agent pages/api/chat-agent.js
```

Verify Responses API availability in the installed SDK:

```bash
node - <<'NODE'
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: 'test' });
console.log({ responsesCreate: typeof client.responses?.create });
NODE
```

---

## Frontend cutover implementation

Locate all hard-coded endpoint uses and centralize them. Recommended shape:

```js
export const DESTINY_CHAT_ENDPOINT =
  process.env.NEXT_PUBLIC_DESTINY_AGENT_V3 === "true"
    ? "/api/chat-agent"
    : "/api/chat";
```

Acceptance:

- Flag false is byte-for-byte equivalent in request routing to current production.
- Flag true sends every chat surface to `/api/chat-agent`.
- Request fields remain intact: messages, session ID, alert/relay state, Ozan acknowledgement, page source, guest booking/signature data, banner state, and ticker unit.
- Response handling remains compatible.
- Existing guest links still work.
- Rollback requires only the flag and redeployment, not a code revert.

---

## Agent-source checks required before preview

### Model configuration

The current source and retained documentation have used different fallback model names. Set `DESTINY_AGENT_MODEL` explicitly in local, preview, and production. Record the exact model in test evidence.

### Admin command

Verify the owner command triggers only when the complete trimmed message equals the intended phrase. It must not activate when embedded in a normal guest sentence.

### Debug exposure

Full debug may include tool arguments and typed state. Preview only. Production must return the compact trace or no sensitive trace.

### Guest-link security

Decide whether production requires `GUEST_LINK_SECRET`. Document any legacy unsigned-link compatibility and its risk.

### Action deduplication

Confirm maintenance/emergency alerts, lead capture, owner relay, and owner-chat invitation cannot repeat in later model rounds of the same guest turn.

### Stale capability invalidation

Changing dates or party details must invalidate old booking, flight, and activity URL authorization.

---

## Test commands

Existing Sheets-backed regression smoke:

```bash
npm run regression -- --dry-run --limit=5
```

Intended full offline suite after restoration:

```bash
node --experimental-default-type=module \
  --experimental-test-coverage \
  --test tests/*.test.mjs
```

Live routing benchmark after restoration:

```bash
OPENAI_API_KEY=... \
DESTINY_AGENT_MODEL=<production-candidate-model> \
node --experimental-default-type=module tests/live-routing-eval.mjs
```

Do not put real secrets in commits, logs, screenshots, or PR descriptions.

---

## Required preview smoke proof

With `DESTINY_AGENT_DEBUG=true`, send a compound request equivalent to:

> August 5–10, two adults and no children. Is Unit 707 available, what will the weather be, and find a dolphin cruise.

The debug trace must show the agentic Responses loop and the equivalent tool set:

```text
check_availability
get_destin_weather
get_activity_options
```

The order is irrelevant. Validate the final answer, not only tool selection.

---

## Evidence required in the cutover PR

- Exact files changed
- Every `/api/chat` call site found
- Feature-flag implementation
- Offline test total and coverage
- Recreated test file list
- Live-routing result by category
- Selected model
- Preview deployment identifier
- OwnerRez matrix results
- Existing-guest and door-code results
- Weather, Sheets, Discord, Brevo, owner-chat results
- Prompt-injection/URL tests
- Known failures or partials
- Latency and cost comparison
- Canary scope
- Tested rollback procedure

---

## Stop-ship failures

Do not enable broad production traffic if any of these remain:

- Unauthorized door-code exposure
- False availability or fabricated booking link
- Existing-guest privacy failure
- Duplicate consequential actions
- Unsupported claim that Ozan was notified
- OwnerRez unknown treated as available
- Arbitrary/disallowed URL in reply
- Prompt or secret exposure
- Corrupted multi-turn state
- Rollback not tested

---

## Definition of done

- [ ] Backup branch remains unchanged.
- [ ] Current repository includes the restored test package.
- [ ] Full offline suite passes on the cutover commit.
- [ ] Coverage is recorded.
- [ ] Every frontend route call is centralized.
- [ ] Feature flag switches v1/v3 cleanly.
- [ ] 56-case live-model benchmark is run with the selected model.
- [ ] Controlled integration matrix passes.
- [ ] Debug is off in production.
- [ ] Canary succeeds.
- [ ] Rollback is exercised.
- [ ] Agent v3 becomes default through the reversible flag.
- [ ] v1 remains deployed during stabilization.

The architecture to preserve is: **model-led conversation, deterministic authority.**