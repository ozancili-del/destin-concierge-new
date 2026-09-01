import test from "node:test";
import assert from "node:assert/strict";
import { toSpokenText } from "../lib/destiny-agent/speech-text.js";

test("spoken text keeps labels but removes markdown URLs", () => {
  const result = toSpokenText("See [Unit 1006](https://example.com/unit?utm_source=x) and **book direct**.");
  assert.equal(result, "See Unit 1006 and book direct.");
  assert.doesNotMatch(result, /https|utm_source|\*\*/i);
});

test("spoken text removes bare links, html, and emoji", () => {
  const result = toSpokenText('<strong>Great!</strong> 🌊 Visit https://example.com/path now.');
  assert.equal(result, "Great! Visit now.");
});

test("spoken text translates visual-only directions", () => {
  assert.equal(toSpokenText("Click the link below for availability."), "see the option on screen for availability.");
});

test("spoken text limits unusually long replies at a sentence boundary", () => {
  const result = toSpokenText(`${"A".repeat(700)}. ${"B".repeat(700)}.`);
  assert.ok(result.length <= 1201);
  assert.ok(result.endsWith(".") || result.endsWith("…"));
});
