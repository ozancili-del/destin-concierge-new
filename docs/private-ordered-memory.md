# Ordered private Chat/Voice memory

This local change fixes lost accepted input without changing the frozen accepted Brain artifacts. It is disabled unless DESTINY_ORDERED_MEMORY=1, never enabled in production, and requires DESTINY_PRIVATE_MODEL_CALLS=1 separately to process turns or use ordered-mode Realtime. No environment settings were enabled by this work.

## Request and processing contract

The browser creates a shared synthetic conversation through a signed HttpOnly/SameSite cookie; concurrent initialization uses Web Locks and one anonymous bootstrap seed. Chat and Voice use the same identity.

POST accept validates the narrow input shape, rejects known secret/PII patterns and commits immutable text, channel, client sequence and turn ID before acknowledging. Repeated IDs replay their receipt; changed content conflicts. Same-client delivery order is enforced, cross-channel order is assigned atomically. Admission is bounded at 16 pending/256 total events and 1.5 MB; no silent truncation of accepted input.

POST process claims the next event with a durable fence. It records model dispatch/receipt usage, checks freshness before model/tool work and commit, and advances committed state only for that event. A new accepted event causes bounded semantic reconciliation, never a silent transport retry. Three reconciliations pause the conversation. A technical failure, missing usage or abandoned worker pauses automatic execution, retaining input for human recovery. No unsafe worker takeover exists.

The existing primary model loop interprets directedness, continuation/correction, cancellation, language and topic through one typed context tool. It retains ordinary composition and deterministic domain executors. Background/cancelled candidates cannot act or mutate state. Topic reset clears incompatible retrieved knowledge/search context and reconnects domain adapters to the new scope. Six calls/turn, 2400 output tokens/call, 25s timeout, no model retries; function duration is configured for 180s.

Input capture, storage and playback have separate lifetimes. Provider audio-commit order controls transcript buffering; completion order cannot reorder turns. Ending a call or replacing audio ownership cannot abort accepted ingestion. Uncertain ingestion ACKs stop further submission instead of overtaking a possibly committed turn. Duplicate completed answers replay without another call. Chat displays retained answers from either channel. Obsolete audio is suppressed; its completed text remains available in Chat/audit. This is not a claim that every queued independent answer is spoken.

## Storage and retention

Hosted adapter: dedicated Redis-compatible HTTPS REST, atomic EVAL compare-and-swap, absolute SET PXAT expiration at conversation creation plus 24 hours; expiry never extends on activity. A separate database is required, not just a namespace in GuestView or a production database.

Required deployment-only configuration:
- DESTINY_PREVIEW_MEMORY_REST_URL: dedicated HTTPS Redis REST origin.
- DESTINY_PREVIEW_MEMORY_REST_TOKEN: server-only database credential.
- DESTINY_PREVIEW_MEMORY_ISOLATED=1: operator assertion that the database is isolated.
- DESTINY_ORDERED_MEMORY_SIGNING_KEY: separate random server-only signing secret, at least 32 characters.
- DESTINY_ORDERED_MEMORY=1 only for private preview.
- DESTINY_PRIVATE_MODEL_CALLS=1 only after a separate usage authorization and applicable spending controls.

No hosted database, keys or environment changes were provisioned. The operator must verify isolation, 24h deletion, no longer-lived backups/log exports and private access. The marker alone cannot prove infrastructure isolation. Redis replication/backup policies are external provisioning requirements.

Local deterministic adapter: absolute DESTINY_ORDERED_MEMORY_ROOT, exclusive file locks for reads/writes, atomic fsync/rename and one-second cleanup while running. Startup purges expired records. Reads refuse expired data. Files survive restart, but an offline local process cannot physically delete files on schedule; this is a test adapter, not a substitute for hosted expiry. An abandoned filesystem lock requires explicit operator recovery.

Only synthetic transcript/state/audit data is authorized. There is no audio field, reservation lookup, external review-log write or GuestView fallback. Ordered Voice disables raw recording construction. Browser cached input/answers and identity seed are cleared at expiry; suspended browsers clear on resume/status rejection. Known sensitive patterns and exact configured credentials are rejected before storage, but heuristic filtering cannot certify arbitrary free text is non-PII: synthetic-only review use remains a required boundary. No real guest testing is authorized.

## Validation and readiness

Run offline with scripts/private-offline-guard.cjs, which blocks external HTTP/fetch/socket access. Tests cover acceptance before processing, duplicates/conflicts, sequence gaps, cross-channel concurrency, real file contention/restart/expiry, atomic Redis command shape, technical/unknown-usage stops, bounded reconciliation, cancellation/background/language/topic behavior, the actual executor with scripted Responses, cookie/production boundaries, and client capture/ACK races.

See docs/private-voice-capability-audit.md for the capability matrix and remaining gaps. Evidence lives in the originating task's outputs/private-ordered-memory: FINAL-TESTS.tap, BUILD.log, RAW-REPLAY.json, SCRIPTED-TRANSCRIPTS.json and historical failing harness runs.

Local validation is not deployment approval. A separate isolated-store provisioning authorization and private deployment/bounded physical test authorization are required. No paid model test, push, deployment, production alias/pointer, public traffic or HQ publication change is part of this repair.
