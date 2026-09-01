import test from "node:test";
import assert from "node:assert/strict";
import { classifyFastRoute, routeFastRequest, sharedRouterEnabled } from "../lib/destiny-agent/fast-router.js";

test("routes condo comparisons to code-owned specialist", () => {
  const result = routeFastRequest({ message: "What is the difference between unit 707 and 1006?" });
  assert.equal(result.handled, true);
  assert.equal(result.route, "condo_comparison");
  assert.match(result.reply, /7th floor/);
  assert.match(result.reply, /10th floor/);
});

test("routes narrow resort and unit facts", () => {
  assert.deepEqual(classifyFastRoute("Do the condos have a washer and dryer?").topics, ["laundry"]);
  assert.equal(routeFastRequest({ message: "Is parking included and are there EV chargers?" }).route, "unit_resort_facts");
  assert.equal(routeFastRequest({ message: "What pools and hot tubs are at the resort?" }).route, "unit_resort_facts");
});

test("routes only explicit guide-link requests", () => {
  assert.equal(routeFastRequest({ message: "Show me your restaurant guide link" }).route, "guide_link");
  assert.equal(routeFastRequest({ message: "Where should we eat tonight?" }).handled, false);
});

test("falls back for live, transactional, support, and ambiguous questions", () => {
  const questions = [
    "Are the condos available October 4 to October 8?",
    "How much does unit 707 cost?",
    "What is the weather today?",
    "What time are fireworks tonight?",
    "My air conditioner is broken",
    "I am locked out",
    "Can I speak with Ozan?",
    "What about that?",
  ];
  for (const message of questions) {
    const result = routeFastRequest({ message });
    assert.equal(result.handled, false, message);
    assert.equal(result.route, "full_agent", message);
  }
});

test("feature flag is an immediate kill switch", () => {
  assert.equal(sharedRouterEnabled({ DESTINY_SHARED_ROUTER: "false" }), false);
  assert.equal(routeFastRequest({ message: "Compare 707 vs 1006", enabled: false }).handled, false);
});
