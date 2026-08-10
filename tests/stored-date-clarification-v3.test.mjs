import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultState } from "../lib/destiny-agent/business.js";
import { runAgentTurn } from "../lib/destiny-agent/orchestrator.js";

test("ambiguous date adjustment presents concrete choices from stored dates", async () => {
  const state = createDefaultState();
  state.booking = {
    ...state.booking,
    arrival: "2027-08-05",
    departure: "2027-08-10",
    adults: 2,
    children: 2,
    totalGuests: 4,
  };
  const result = await runAgentTurn({
    openai: { responses: { create: async () => { throw new Error("model should not be called"); } } },
    services: {},
    state,
    messages: [{ role: "user", content: "Make it one day later." }],
    latestUser: "Make it one day later.",
    sessionId: "stored-date-clarification",
    now: new Date("2026-08-10T12:00:00-05:00"),
  });

  assert.match(result.reply, /Move check-in only: August 6, 2027 to August 10, 2027/i);
  assert.match(result.reply, /Move checkout only: August 5, 2027 to August 11, 2027/i);
  assert.match(result.reply, /Shift the entire stay: August 6, 2027 to August 11, 2027/i);
  assert.doesNotMatch(result.reply, /include the current dates|repeat.*dates/i);
  assert.equal(result.debug.safetyIntercept, "ambiguous_stored_date_adjustment");
});
