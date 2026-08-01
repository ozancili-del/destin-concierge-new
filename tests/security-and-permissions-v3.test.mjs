import test from "node:test";
import assert from "node:assert/strict";
import {
  collectAllowedUrls,
  createDefaultState,
  safeFallback,
  validateReply,
} from "../lib/destiny-agent/business.js";

test("rejects arbitrary URLs", () => {
  const state = createDefaultState();
  const result = validateReply({
    reply: "Book here: https://evil.example/steal",
    allowedUrls: new Set(),
    toolResults: [],
    state,
    latestUser: "Can I book?",
  });
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((item) => item.code === "unapproved_url"));
});

test("allows exact current-turn tool capability URL", () => {
  const state = createDefaultState();
  const url = "https://www.destincondogetaways.com/pelican-beach-resort-unit-707-orp5b5aa01x";
  const toolResults = [{ ok: true, urls: [url], facts: [] }];
  const allowedUrls = collectAllowedUrls(toolResults, state);
  const result = validateReply({ reply: `Here is the verified option: ${url}`, allowedUrls, toolResults, state, latestUser: "Send the link" });
  assert.equal(result.ok, true);
});

test("does not authorize persisted malicious URLs", () => {
  const state = createDefaultState();
  state.verified.bookingUrls = ["https://evil.example/book"];
  assert.equal(collectAllowedUrls([], state).has("https://evil.example/book"), false);
});

for (const phrase of [
  "Ozan was notified",
  "I sent the alert successfully",
  "Your email has been captured",
]) {
  test(`rejects unsupported side-effect claim: ${phrase}`, () => {
    const result = validateReply({ reply: phrase, allowedUrls: [], toolResults: [], state: createDefaultState(), latestUser: "Help" });
    assert.equal(result.ok, false);
  });
}

test("safe fallback never emits a booking URL", () => {
  const reply = safeFallback({ state: createDefaultState(), latestUser: "Book August 5-10" });
  assert.doesNotMatch(reply, /https?:\/\//);
});

for (const phrase of [
  "Ozan might offer you a refund.",
  "The owner could provide a discount for the inconvenience.",
  "Maintenance may arrange a free night.",
  "Ozan might be able to offer a waived fee.",
  "The host could look into giving you a complimentary night.",
  "We can make this right with an account credit.",
  "You may receive an upgrade or late checkout.",
]) {
  test(`rejects invented concession: ${phrase}`, () => {
    const result = validateReply({ reply: phrase, allowedUrls: [], toolResults: [], state: createDefaultState(), latestUser: "The AC is still broken" });
    assert.equal(result.ok, false);
    assert.ok(result.violations.some(item => item.code === "unauthorized_concession"));
  });
}

test("allows a noncommittal relay response when the guest requests compensation", () => {
  const reply = "I understand why you're asking. I can pass your compensation request to Ozan for review, but I can't authorize or promise any outcome.";
  const result = validateReply({ reply, allowedUrls: [], toolResults: [], state: createDefaultState(), latestUser: "I want compensation" });
  assert.equal(result.ok, true);
});

test("allows an explicit owner-approved concession marker", () => {
  const reply = "Ozan will provide a refund.";
  const toolResults = [{ kind: "owner_authorization", data: { ownerApprovedConcession: true, approvedConcessionText: "Ozan will provide a refund." } }];
  const result = validateReply({ reply, allowedUrls: [], toolResults, state: createDefaultState(), latestUser: "What did Ozan approve?" });
  assert.equal(result.ok, true);
});
