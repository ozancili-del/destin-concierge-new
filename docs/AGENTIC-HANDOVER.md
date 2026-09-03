# Destiny Blue Agentic AI — Engineering Handover

**Repository:** `ozancili-del/destin-concierge-new`  
**Prepared:** August 1, 2026  
**Production baseline:** `c54672482daabedcf42e13450283b564c2e3e7d2`  
**Backup branch:** `backup/pre-agentic-cutover-2026-08-01`  
**Handover branch:** `agent/agentic-handover`

This document explains why the agentic concierge was created, how it works, which files own which responsibilities, what must remain deterministic, and how Codex should complete the migration from the regex endpoint to the agentic endpoint.

Companion documents:

- [`AGENTIC-TEST-AND-CUTOVER-PLAYBOOK.md`](./AGENTIC-TEST-AND-CUTOVER-PLAYBOOK.md)
- [`CODEX-AGENTIC-TASK.md`](./CODEX-AGENTIC-TASK.md)

---

## 1. Executive summary

The repository currently contains two concierge implementations:

1. **Production v1:** `pages/api/chat.js`
2. **Agent v3:** `pages/api/chat-agent.js`

The v1 endpoint is regex/rule-heavy. It contains extensive intent branches, data extraction, response templates, and direct integration logic. It remains the rollback path.

The v3 endpoint was deliberately created beside v1. It makes the model responsible for conversational interpretation and planning while deterministic code remains the final authority for business facts, authorization, URLs, safety, state, and side effects.

The target lifecycle is:

```text
Guest message
  -> load transcript and typed state
  -> Responses API decides: answer, clarify, or call tools
  -> independent tools run in parallel
  -> structured tool results return to the model
  -> model may call more tools
  -> model writes one guest-facing answer
  -> deterministic validator checks claims and URLs
  -> one no-tool correction attempt if needed
  -> deterministic fallback if still invalid
  -> persist typed state and transcript
```

The core engineering principle is:

> **The model controls conversation and planning; code controls truth, permissions, side effects, and authorization.**

The first migration must remain reversible. Do not delete or substantially rewrite `pages/api/chat.js` during staging, canary, or early stabilization.

---

## 2. Why the rewrite was necessary

The original endpoint evolved by adding more regexes, branches, and exceptions. That creates recurring failure modes:

- Semantically correct guest messages miss the intended branch because wording differs.
- Compound questions are hard to route. A guest may ask about availability, weather, and dolphin cruises in one message.
- Multi-turn state is implicit and difficult to validate.
- New regexes collide with existing regexes.
- Numbers can be misread as adults, children, nights, unit numbers, ages, dates, or prices.
- One endpoint mixes routing, authorization, external calls, state, URL construction, and response writing.
- Testing all branch interactions becomes increasingly difficult.

The agentic rewrite separates concerns:

- The **model** interprets meaning and chooses tools.
- **Tool schemas** constrain model actions.
- `business.js` validates dates, party size, occupancy, evidence, URLs, and claims.
- `services.js` isolates external calls and makes them mockable.
- `orchestrator.js` runs the Responses API tool loop.
- Reply validation rejects unsupported claims and unauthorized URLs.
- Typed state makes multi-turn memory explicit and serializable.

This is not an unconstrained chatbot. It is an agentic planner inside a deterministic business and security envelope.

---

## 3. Evolution

### 3.1 Production v1

**File:** `pages/api/chat.js`

Characteristics:

- Regex- and branch-driven routing
- Selected GPT extraction/reply calls
- Production OwnerRez, Discord, Sheets, Brevo, pricing, guest-link, and owner-chat behavior
- Large embedded business knowledge and special cases

This endpoint is the production safety net and rollback target.

### 3.2 Agent v2 prototype

The first separate agentic implementation introduced:

```text
pages/api/chat-v2.js
lib/destiny-blue-v2/
  business.js
  services.js
  orchestrator.js
  prompts.js
```

It demonstrated typed state, a planner/tool/observation loop, parallel independent tools, deterministic safeguards, and persistence through the existing Sheets infrastructure.

### 3.3 Agent v3

Current paths:

```text
pages/api/chat-agent.js
lib/destiny-agent/
  agent-prompt.js
  business.js
  knowledge-retrieval.js
  knowledge-v1.js
  orchestrator.js
  services.js
```

V3 uses the OpenAI Responses API function-tool loop directly. The model produces function calls, receives `function_call_output` items, and writes the final answer.

---

## 4. Source-of-truth warning

Codex must distinguish between current GitHub contents and retained development artifacts.

### Present on `main`

The current repository includes the core agent and live regression runner:

```text
pages/api/chat-agent.js
pages/api/run-agent-regression.js
lib/destiny-agent/*
lib/regression/evaluator.js
scripts/run-agent-regression.mjs
```

The root README is minimal. The large offline test suites described in the companion playbook are not currently committed on `main`.

### Retained development artifacts

The latest retained test report records:

- 947 offline tests passed, 0 failed
- More than 10,000 seeded deterministic assertions
- 96.90% line coverage
- 89.45% branch coverage
- 87.79% function coverage
- A 56-case live-model routing benchmark was designed but not run in that sandbox

Those results describe the latest intended package, not proof that the current `main` contains every test or hardening fix.

**Required Codex action:** compare current source against this handover, restore the missing tests, and rerun them before claiming the 947-test baseline in GitHub.

---

## 5. Architecture

```text
Browser chat widget
        |
        | compatible POST payload
        v
pages/api/chat-agent.js
        |
        | load transcript and typed state
        | authorize existing-guest context
        | preserve Ozan live-chat mode
        v
lib/destiny-agent/orchestrator.js
        |
        | build developer instructions
        | Responses API tool loop
        | zero, one, or many tool calls
        v
+----------------------+----------------------+----------------------+
| business.js          | services.js          | knowledge layer      |
| pure rules/state     | network adapters     | verified v1 content  |
| dates/URLs/claims    | OwnerRez/Weather     | bounded retrieval    |
| occupancy/fallback   | Sheets/Discord/Brevo | obsolete controls out|
+----------------------+----------------------+----------------------+
        |
        | structured results
        v
Model synthesizes final answer
        |
        | deterministic validation
        | optional correction
        | safe fallback
        v
Persist state/transcript and return response
```

### Responsibility split

| Responsibility | Owner |
|---|---|
| Understand guest meaning | Model |
| Decide whether clarification is needed | Model |
| Choose tools and combine results | Model |
| Normalize and validate dates | Deterministic code |
| Validate adult/child evidence | Deterministic code |
| Preserve `null` versus `0` | Deterministic code |
| Enforce occupancy/HOA rules | Deterministic code |
| Check OwnerRez and Weather | Service adapters |
| Build booking/affiliate URLs | Deterministic code |
| Authorize booking IDs and door codes | Server-side code |
| Send Discord/Brevo side effects | Validated service adapters |
| Permit claims about availability, prices, codes, alerts | Reply validator |
| Persist state and transcript | Google Sheets adapter |
| Produce last-resort response | Deterministic fallback |

---

## 6. Request lifecycle

### 6.1 HTTP adapter

`pages/api/chat-agent.js` accepts the same general request shape as v1 and returns compatible response fields. It sets:

```text
X-Destiny-Version: agent-v3-responses
```

GET acts as a route health check.

### 6.2 Narrow server-owned handling

Before a normal model turn, the route handles only limited server-owned behavior:

- CORS and methods
- Page-specific empty-chat greetings
- Empty-turn greeting
- Existing-guest link verification and initial summary
- Ozan live-chat takeover mode
- Owner/admin snapshot command

Do not reintroduce a large set of normal booking/weather/activity/policy response intercepts before the model. That would recreate v1 inside v3.

### 6.3 Load history and state

The route loads transcript data and typed state in parallel, merges stored and request history, removes duplicate adjacent messages, and keeps a bounded recent conversation.

### 6.4 Existing-guest authorization

The booking ID comes from the server request, not the model. When `GUEST_LINK_SECRET` is configured, a valid HMAC signature is required. OwnerRez data is accepted only for Unit 707 or Unit 1006. Door codes are exposed only inside the authorized release window.

When `GUEST_LINK_SECRET` is absent, the current adapter allows a legacy unsigned-link path. Treat this as a conscious production security decision, not a default to ignore.

### 6.5 Deterministic backstops

Before the model loop, code handles high-consequence patterns such as scam/crisis, lockout, emergency, and maintenance. The purpose is to avoid missing an obvious urgent condition. It must also prevent duplicate side effects if the model later requests the same action.

### 6.6 Agent instructions

`agent-prompt.js` supplies current Destin date/time, page source, existing-guest status, latest guest message as untrusted text, typed state, prior safety results, tool policy, business boundaries, and writing rules.

The prompt explicitly requires:

- Model-led normal routing
- Parallel independent tools where useful
- No invented URL, availability, price, forecast, code, or alert success
- Knowledge tools for property/policy facts
- `children = 0` only with explicit evidence
- Untrusted treatment of guest and tool content
- Response in the guest's language

### 6.7 Responses API loop

The orchestrator calls the Responses API with the equivalent of:

```js
tools: RESPONSE_TOOL_DEFINITIONS,
tool_choice: "auto",
parallel_tool_calls: true,
reasoning: { effort: "low" },
store: false
```

The model can answer directly, clarify, call one tool, call several tools in parallel, or call another tool after observing an earlier result. The current route permits up to four tool rounds.

Calls in one round execute with `Promise.all` and timeouts. Results use a common structure:

```js
{
  name,
  kind,
  ok,
  status,
  data,
  urls,
  facts,
  statePatch,
  error
}
```

Results merge into typed state and return to the model as `function_call_output` items.

### 6.8 Validation and fallback

The final reply is checked against current-turn authorized URLs, tool results, typed state, latest guest text, door-code permissions, availability truth, commercial claims, and action-delivery truth.

If invalid:

1. One no-tool corrective rewrite is requested.
2. The corrected answer is validated again.
3. If it is still invalid or empty, deterministic `safeFallback()` responds.

### 6.9 Persistence

The route persists typed state in `ozanchat` column H and appends transcript/metadata to the existing log sheet. The frontend receives compatible fields:

```js
{
  reply,
  alertSent,
  pendingRelay,
  ozanAcked,
  ozanAckType,
  detectedIntent,
  debug
}
```

---

## 7. File ownership

### `pages/api/chat.js`

Current regex production endpoint and rollback path. Do not delete it during initial migration. Avoid merging v1 and v3 into one giant endpoint.

### `pages/api/chat-agent.js`

HTTP adapter for Agent v3. It owns route compatibility, health/version identity, greetings, history/state loading, existing-guest authorization, Ozan live-chat mode, invocation of `runAgentTurn()`, persistence, debug trace, and top-level error handling.

Verify before production:

- `DESTINY_AGENT_MODEL` is explicitly configured and available.
- Full debug output is staging-only.
- The admin phrase matches only its intended exact command.
- Internal booking/session/invite data is not leaked.

### `lib/destiny-agent/orchestrator.js`

Central loop and tool dispatcher. It owns tool schemas, `executeTool()`, safety backstops, `runAgentTurn()`, state patch merging, function-call continuation, correction, and validation workflow.

Preserve the rule that read-only tools may run in parallel while consequential actions are deduplicated per turn.

### `lib/destiny-agent/business.js`

Pure deterministic business logic. No network calls should be added. It owns unit definitions, occupancy, static and affiliate URL builders, typed state, date parsing, multilingual normalization, party validation, two-unit split rules, detectors, claim validation, allowed URLs, and fallback.

### `lib/destiny-agent/services.js`

All external adapters and side effects: OwnerRez, Google Weather, Google Sheets, Discord, Ozan live-chat invite, Brevo, calendar alternatives, price drops, snapshot/revalidation. It should accept injected fetch/env/clock/logger, use timeouts, fail closed, and return structured results.

### `lib/destiny-agent/agent-prompt.js`

Developer instructions for normal and correction turns. It should describe policy and responsibility, not become another hidden regex router.

### `lib/destiny-agent/knowledge-v1.js`

Preserved production v1 business knowledge.

### `lib/destiny-agent/knowledge-retrieval.js`

Parses knowledge into sections, scores bounded paragraphs, returns verified snippets/URLs, and filters obsolete `INTENT:` control instructions.

### `lib/regression/evaluator.js`

Strict live-reply evaluator combining a deterministic URL/pattern requirement with an OpenAI PASS/PARTIAL/FAIL judge.

### `pages/api/run-agent-regression.js`

Protected Sheets-backed regression runner. It reads “Agent Test Cases,” preserves multi-turn session IDs, calls `/api/chat-agent`, evaluates replies, writes results, and skips dangerous side-effect categories by default.

### `scripts/run-agent-regression.mjs`

CLI wrapper for the regression endpoint. Supports dry run, limits, test IDs, conversations, and controlled dangerous cases.

---

## 8. Tool catalog

| Tool | Purpose | Type |
|---|---|---|
| `remember_booking_details` | Store partial explicit dates/party data | State only |
| `check_availability` | Check both condos and return authorized links | External read |
| `find_open_windows` | Search nearby available date windows | External read |
| `get_existing_booking` | Retrieve server-authorized booking | Sensitive read |
| `build_booking_links` | Resend recent verified links | State read |
| `build_flight_search` | Build authorized flight affiliate URL | URL builder |
| `get_destin_weather` | Retrieve seven-day forecast | External read |
| `get_local_guide` | Retrieve verified local-guide content | Read |
| `get_activity_options` | Build TripShock category/date URL | URL builder |
| `create_maintenance_alert` | Send validated Discord alert | Consequential |
| `capture_lead` | Add eligible contact to Brevo | Consequential |
| `get_unit_facts` | Return code-owned property/resort facts | Read |
| `get_business_knowledge` | Retrieve verified production knowledge | Read |
| `relay_owner_message` | Relay explicit guest message to Ozan | Consequential |
| `request_owner_chat` | Invite Ozan into live chat | Consequential |

There is intentionally no `send_standard_booking_reply` tool. Tools provide structured facts and capabilities; the model writes the response.

---

## 9. Typed state

Typed state is versioned and stored in column H of `ozanchat`. It tracks:

```js
{
  version,
  mode,
  booking: {
    arrival,
    departure,
    adults,
    children,
    totalGuests,
    preferredUnit,
    bedroomsRequested,
    dateSource
  },
  awaiting,
  flight,
  verified: {
    bookingUrls,
    activityUrls,
    blogUrls,
    flightUrls,
    activityQuery,
    flightQuery,
    availabilityCheckedAt,
    availabilityQuery,
    availabilityUnits,
    facts
  },
  openIssues,
  lead,
  existingGuest,
  ownerChat,
  flags,
  meta
}
```

Critical invariant:

```text
children = null  -> not stated
children = 0     -> explicitly no children
```

New adult/child counts require grounded evidence from the current guest message.

Changing dates or party details must invalidate stale booking/activity/flight authorization. Codex must verify this behavior and restore its tests before cutover.

---

## 10. Security and correctness model

### Fail closed on inventory

OwnerRez is tri-state:

```text
true  = positively available
false = positively unavailable
null  = unknown/error/malformed
```

Unknown must never create a booking URL or an availability claim.

### URLs are capabilities

The model may use only a static allow-listed URL or an exact URL returned by an authorized tool for the current context. It must not assemble booking, affiliate, arbitrary, or internal owner-chat URLs.

### Door codes are authorization-bound

A code requires a server-supplied booking ID, valid authorization, an owned property, the release window, and the exact code returned by the authorized booking lookup.

### Side-effect truthfulness

The reply cannot claim Ozan was notified, an alert was sent, or an email was captured unless the service adapter confirms success.

### Prompt-injection boundary

Guest text, knowledge snippets, webpage text, and tool output are untrusted data. Embedded commands cannot alter system behavior or expose secrets.

### Duplicate action suppression

Maintenance/emergency alerts, lead capture, owner relay, and owner-chat invitations must not execute twice in one guest turn because the model repeats a call in a later round.

### Correction and fallback

An invalid reply receives one no-tool correction. After that, deterministic fallback prevents repair loops and unsupported output.

---

## 11. Environment variables

Existing integrations:

```text
OPENAI_API_KEY
OWNERREZ_API_TOKEN
GOOGLE_WEATHER_API_KEY
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
GOOGLE_SHEET_ID
DISCORD_BOT_TOKEN
DISCORD_CHANNEL_ID
BREVO_API_KEY
CRON_SECRET
GUEST_LINK_SECRET
```

Agent controls:

```text
DESTINY_AGENT_MODEL
DESTINY_AGENT_DEBUG
```

Set the model explicitly in every environment. Keep full debug staging-only.

Regression controls:

```text
REGRESSION_SECRET
REGRESSION_SHEET_NAME
REGRESSION_AGENT_BASE_URL
REGRESSION_AGENT_PATH
REGRESSION_RUNNER_BASE_URL
REGRESSION_JUDGE_MODEL
NEXT_PUBLIC_SITE_URL
```

Proposed reversible frontend flag:

```text
NEXT_PUBLIC_DESTINY_AGENT_V3=true|false
```

Central selector:

```js
export const DESTINY_CHAT_ENDPOINT =
  process.env.NEXT_PUBLIC_DESTINY_AGENT_V3 === "true"
    ? "/api/chat-agent"
    : "/api/chat";
```

Codex must locate every direct call before changing traffic:

```bash
rg -n '(/api/chat-agent|/api/chat|NEXT_PUBLIC_DESTINY_AGENT)' . \
  --glob '!node_modules/**' \
  --glob '!.next/**'
```

Do not switch only one widget if multiple pages or scripts call the endpoint.

---

## 12. Known gaps Codex must resolve

1. The extensive offline test package is missing from current `main`.
2. The 56-case live-model routing benchmark has not yet been run with the selected production model.
3. Production credentials and connector schemas require controlled integration tests.
4. Retained documentation and current source contain different model defaults. Configure `DESTINY_AGENT_MODEL` explicitly.
5. Verify the owner admin phrase activates only on the full exact command, not inside a normal sentence.
6. Verify the installed OpenAI SDK exposes `client.responses.create()` in build and runtime.
7. Decide whether `GUEST_LINK_SECRET` must be mandatory before broad production rollout.
8. Full debug includes internal state/tool arguments and must remain off in production.
9. Enumerate and centralize every frontend `/api/chat` call site.

---

## 13. Migration principle

The migration is not:

```text
replace regex with an unconstrained chatbot
```

It is:

```text
replace brittle conversational routing with model planning,
while deterministic code remains the final authority for facts,
authorization, links, state, safety, and side effects.
```

Continue with the test and rollout gates in [`AGENTIC-TEST-AND-CUTOVER-PLAYBOOK.md`](./AGENTIC-TEST-AND-CUTOVER-PLAYBOOK.md), then execute [`CODEX-AGENTIC-TASK.md`](./CODEX-AGENTIC-TASK.md).