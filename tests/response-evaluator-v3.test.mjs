import test from "node:test";
import assert from "node:assert/strict";
import { evaluateGuestReply, normalizeEvaluation } from "../lib/destiny-agent/response-evaluator.js";

test("normalizes and bounds evaluator scores", () => {
  assert.deepEqual(normalizeEvaluation({
    overall: 11, accuracy: 9, completeness: 8, human_tone: 7,
    tool_link_compliance: 6, safety: 10, priority: "medium",
    failure_reason: "Missing a link", improvement: "Include the verified link.",
  }), {
    overall: 10, accuracy: 9, completeness: 8, humanTone: 7,
    toolLinkCompliance: 6, safety: 10, priority: "MEDIUM",
    failureReason: "Missing a link", improvement: "Include the verified link.",
  });
});

test("evaluates a reply through a separate JSON-only model call", async () => {
  const calls = [];
  const openai = { responses: { async create(payload) {
    calls.push(payload);
    return { output_text: JSON.stringify({ overall: 5, accuracy: 8, completeness: 4, human_tone: 7, tool_link_compliance: 3, safety: 10, priority: "HIGH", failure_reason: "No activity link", improvement: "Call the activity tool and include its verified URL." }) };
  } } };
  const result = await evaluateGuestReply({ openai, guestMessage: "Find a jet ski", reply: "Try jet skiing.", detectedIntent: "ACTIVITY", toolResults: [] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].store, false);
  assert.equal(result.overall, 5);
  assert.equal(result.priority, "HIGH");
});

test("evaluator failure never blocks the guest response", async () => {
  const openai = { responses: { async create() { throw new Error("temporary"); } } };
  assert.equal(await evaluateGuestReply({ openai, guestMessage: "hello", reply: "Hi" }), null);
});

