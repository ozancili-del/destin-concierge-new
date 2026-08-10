# Destiny Blue Agent v3

This is a parallel, agent-first rewrite of the production `pages/api/chat.js`.
The original endpoint is not modified.

## What changed

Every normal guest message now follows one Responses API tool loop:

```text
load typed state
  -> model decides whether to answer, clarify, or call tools
  -> independent tools execute in parallel
  -> structured tool outputs return to the model
  -> model may call more tools
  -> model writes the guest-facing reply
  -> deterministic validation checks URLs, availability, prices, alerts, and door codes
  -> state is persisted
```

The route contains no normal booking, checkout, guest-count, bedroom, activity, weather, policy, or maintenance response intercepts. The model controls those conversations.

Deterministic code remains for actions and safety:

- OwnerRez availability and booking lookup
- Google Weather
- Google Sheets state and transcript persistence
- Discord alerts and Ozan live-chat invitations
- Brevo lead capture
- Booking, flight, activity, and guide URL construction
- Occupancy and HOA rules
- Door-code authorization
- Discount authorization
- Output validation and safe fallback
- Empty-state/page greetings and the owner admin phrase

## Files

```text
pages/api/chat-agent.js
lib/destiny-agent/
  agent-prompt.js
  business.js
  knowledge-retrieval.js
  knowledge-v1.js
  orchestrator.js
  services.js
tests/agent-v3.test.mjs
```

`knowledge-v1.js` contains the production v1 knowledge content. The model does not receive the giant string. It calls `get_business_knowledge`, which retrieves only relevant verified paragraphs. Obsolete `INTENT:` transport instructions are filtered out.

## Deploy beside v1

Copy these paths into the existing Next.js project without changing `pages/api/chat.js`:

```text
pages/api/chat-agent.js
lib/destiny-agent/*
```

Update the OpenAI JavaScript SDK so `client.responses.create()` is available:

```bash
npm install openai@latest
```

The existing environment variables are reused:

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

New optional variables:

```text
DESTINY_AGENT_MODEL=gpt-5-mini
DESTINY_AGENT_DEBUG=true
```

Use a model available to your API project. `DESTINY_AGENT_DEBUG=true` returns full tool traces and typed state during staging. Without it, responses expose only a compact trace with tool names and validation status.

## Frontend cutover

Change only the fetch URL during testing:

```js
const endpoint = process.env.NEXT_PUBLIC_DESTINY_AGENT_V3 === "true"
  ? "/api/chat-agent"
  : "/api/chat";
```

The request and response fields remain compatible with v1:

```js
{
  messages,
  sessionId,
  alertSent,
  pendingRelay,
  ozanAcked,
  ozanAckType,
  pageSource,
  guestBid,
  guestSig,
  sawBanner,
  tickerUnit
}
```

The response still includes:

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

The HTTP response also carries:

```text
X-Destiny-Version: agent-v3-responses
```

## Proving that the agent is actually running

Enable `DESTINY_AGENT_DEBUG=true` and send:

> August 5–10, two adults and no children. Is Unit 707 available, what will the weather be, and find a dolphin cruise.

A correct trace should contain all three tools in one turn:

```json
{
  "debug": {
    "agentic": true,
    "api": "responses",
    "toolCalls": [
      { "name": "check_availability" },
      { "name": "get_destin_weather" },
      { "name": "get_activity_options" }
    ]
  }
}
```

The first OpenAI request has:

```js
tools: RESPONSE_TOOL_DEFINITIONS
tool_choice: "auto"
parallel_tool_calls: true
```

Function results are sent back as `function_call_output` items. The agent then writes the final answer.

## Tool set

The model can choose among:

- `remember_booking_details`
- `check_availability`
- `find_open_windows`
- `get_existing_booking`
- `build_booking_links`
- `build_flight_search`
- `get_destin_weather`
- `get_local_guide`
- `get_activity_options`
- `create_maintenance_alert`
- `capture_lead`
- `get_unit_facts`
- `get_business_knowledge`
- `relay_owner_message`
- `request_owner_chat`

There is intentionally no `send_standard_booking_reply` tool. Availability tools return structured data and authorized URLs; the agent writes the response.

## State

Typed state is persisted in column H of the existing `ozanchat` sheet while columns A–G keep their v1 meanings. It tracks:

- arrival and departure
- adults and children, preserving `null` versus `0`
- preferred unit and bedroom request
- flight origin/destination
- verified URLs and availability results
- authorized existing booking
- maintenance issues and alert state
- lead/discount authorization
- Ozan live-chat state

## Security and correctness behavior

- Unknown OwnerRez results fail closed and do not create unit booking URLs.
- Two-condo links are created only when both condos are positively available.
- Every reply URL must be static-safe or explicitly returned by a tool in the current turn.
- The model cannot provide an existing booking ID; it comes from the server request.
- Door codes are rejected unless the current-turn booking tool authorized the exact code.
- Claims that Ozan was notified are rejected unless Discord delivery was confirmed.
- Failed replies receive one no-tool corrective rewrite, then a deterministic fallback.
- The `lets go mf` owner command remains preserved exactly as requested.

## Tests

Run the complete offline suite in the host project, where the OpenAI SDK is installed:

```bash
node --experimental-default-type=module \
  --experimental-test-coverage \
  --test tests/*.test.mjs
```

Current offline result: **947 passed, 0 failed**.

Combined coverage is **96.90% lines, 89.45% branches, and 87.79% functions**. The seeded property suite also runs more than **10,000 deterministic randomized assertions**.

The three-campaign suite covers:

- real Responses API function schemas and `function_call_output` continuation
- direct, parallel, sequential, malformed-envelope, timeout, correction, and fallback behavior
- every non-empty combination of five independent read-only tools in both execution orders
- stale-state invalidation and corrupted persisted booking-link rejection
- cross-round duplicate side-effect suppression
- paraphrased, multilingual, ambiguous, historical, hypothetical, and follow-up booking details
- full occupancy, HOA, one-unit, two-unit, and unsplittable-party matrices
- every OwnerRez availability state plus malformed/missing response schemas
- Weather, Discord, Brevo, blog, snapshot, HMAC, JWT, and Sheets failure paths
- URL, bare-domain, contact, price, percentage, availability, alert, door-code, and BLUE permissions
- Unicode confusables, prompt injection, malformed model arguments, tool floods, and bounded context
- HTTP methods, CORS, greetings, exact admin command, owner chat, existing guests, persistence, and debug modes

See `TEST-REPORT.md` for the complete 947-test matrix and defects discovered.

A separate **56-case live-model routing benchmark** is included:

```bash
OPENAI_API_KEY=... \
DESTINY_V3_MODEL=gpt-5-mini \
node --experimental-default-type=module tests/live-routing-eval.mjs
```

It uses the real OpenAI model while mocking all external business services. It was not run in this sandbox because no OpenAI key was available.

## Recommended migration

1. Deploy `/api/chat-agent` without changing the frontend default.
2. Set `DESTINY_AGENT_DEBUG=true` in staging.
3. Run the compound tool test and the regression scenarios.
4. Route internal/offline testing to `/api/chat-agent`.
5. Compare replies, tool traces, latency, and OwnerRez/Discord/Sheets logs.
6. Send a small percentage of real traffic to v3.
7. Remove debug state before broad rollout.
8. Switch the frontend default only after external integration tests pass.

## Not live-tested here

The 947-test offline suite uses scripted model outputs and mocked external services. No production credentials were available, so this environment did not make real calls to OpenAI, OwnerRez, Google Weather, Google Sheets, Discord, Brevo, or the deployed snapshot/calendar services.

The included `tests/live-routing-eval.mjs` specifically addresses the remaining question: whether the live model chooses the correct tools for unseen paraphrases. Run it with a real OpenAI key before switching guest traffic, followed by controlled integration tests against staging credentials.
