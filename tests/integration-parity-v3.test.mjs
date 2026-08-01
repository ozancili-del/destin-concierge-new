import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { RESPONSE_TOOL_DEFINITIONS } from "../lib/destiny-agent/orchestrator.js";

const toolNames = new Set(RESPONSE_TOOL_DEFINITIONS.map((tool) => tool.name));
for (const name of [
  "check_availability",
  "get_destin_weather",
  "create_maintenance_alert",
  "capture_lead",
  "get_existing_booking",
  "relay_owner_message",
  "request_owner_chat",
]) {
  test(`Agent v3 exposes parity tool: ${name}`, () => assert.equal(toolNames.has(name), true));
}

test("Agent adapter preserves frontend request and response fields", async () => {
  const source = await readFile(new URL("../pages/api/chat-agent.js", import.meta.url), "utf8");
  for (const field of ["messages", "sessionId", "alertSent", "pendingRelay", "ozanAcked", "ozanAckType", "pageSource", "guestBid", "guestSig", "sawBanner", "tickerUnit"]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }
  for (const field of ["reply", "alertSent", "pendingRelay", "ozanAcked", "ozanAckType", "detectedIntent", "debug"]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }
});

test("sensitive integrations remain deterministic service adapters", async () => {
  const source = await readFile(new URL("../lib/destiny-agent/services.js", import.meta.url), "utf8");
  for (const marker of ["OWNERREZ_API_TOKEN", "GOOGLE_WEATHER_API_KEY", "GOOGLE_SHEET_ID", "DISCORD_BOT_TOKEN", "BREVO_API_KEY", "GUEST_LINK_SECRET"]) {
    assert.match(source, new RegExp(marker));
  }
});

