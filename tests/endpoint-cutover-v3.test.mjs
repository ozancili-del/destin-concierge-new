import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

process.env.OPENAI_API_KEY ||= "test";
const { agentV3Enabled, selectDestinyChatHandler } = await import("../pages/api/destiny-chat.js");
const { isAdminSnapshotCommand } = await import("../pages/api/chat-agent.js");

test("flag defaults to regex v1", () => assert.equal(agentV3Enabled({}), false));
test("only exact string true enables Agent v3", () => {
  assert.equal(agentV3Enabled({ NEXT_PUBLIC_DESTINY_AGENT_V3: "true" }), true);
  assert.equal(agentV3Enabled({ NEXT_PUBLIC_DESTINY_AGENT_V3: "TRUE" }), false);
  assert.equal(agentV3Enabled({ NEXT_PUBLIC_DESTINY_AGENT_V3: "1" }), false);
});
test("both flag states resolve to callable handlers", () => {
  assert.equal(typeof selectDestinyChatHandler({}), "function");
  assert.equal(typeof selectDestinyChatHandler({ NEXT_PUBLIC_DESTINY_AGENT_V3: "true" }), "function");
});

test("all frontend chat surfaces use the centralized route", async () => {
  const files = ["pages/concierge.js", "pages/index.js", "public/destiny-head.js", "public/destiny-blue-tests.html"];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /(?:fetch\(|value=|const API=)[^\n]*\/api\/chat(?:["'])/);
    assert.match(source, /api\/destiny-chat|DESTINY_CHAT_ENDPOINT/);
  }
});

test("rollback endpoint remains deployed", async () => {
  const source = await readFile(new URL("../pages/api/chat.js", import.meta.url), "utf8");
  assert.match(source, /export default async function handler/);
});

test("admin snapshot command requires the complete trimmed message", () => {
  assert.equal(isAdminSnapshotCommand("lets go mf"), true);
  assert.equal(isAdminSnapshotCommand("  LETS   GO MF  "), true);
  assert.equal(isAdminSnapshotCommand("Guest said lets go mf yesterday"), false);
  assert.equal(isAdminSnapshotCommand("lets go mf please"), false);
});

test("existing-guest signature and ticker context are preserved", async () => {
  const concierge = await readFile(new URL("../pages/concierge.js", import.meta.url), "utf8");
  const agentRoute = await readFile(new URL("../pages/api/chat-agent.js", import.meta.url), "utf8");
  assert.match(concierge, /guestSig:\s*sig \|\| null/);
  assert.match(concierge, /guestSig:\s*guestSigRef\.current \|\| null/);
  assert.match(agentRoute, /tickerUnit,/);
});
