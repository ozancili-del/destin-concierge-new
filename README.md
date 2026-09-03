# destin-concierge-new

## Agentic concierge migration

The engineering handover for moving from the regex-driven `/api/chat` endpoint to the agent-first `/api/chat-agent` endpoint is available here:

1. [Agentic engineering handover](docs/AGENTIC-HANDOVER.md)
2. [Test and production cutover playbook](docs/AGENTIC-TEST-AND-CUTOVER-PLAYBOOK.md)
3. [Codex implementation assignment](docs/CODEX-AGENTIC-TASK.md)

Pre-cutover backup branch: `backup/pre-agentic-cutover-2026-08-01`.

The migration is designed to remain reversible: keep `pages/api/chat.js` as the rollback endpoint while staging, live-model testing, integration testing, and canary rollout are completed.