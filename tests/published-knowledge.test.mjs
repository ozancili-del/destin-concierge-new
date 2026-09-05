import test from "node:test";
import assert from "node:assert/strict";
import {
  rankPublishedKnowledge,
  resetPublishedKnowledgeCacheForTests,
  searchPublishedKnowledge,
} from "../lib/destiny-agent/published-knowledge.js";

const bundle = {
  revision: "6339a434",
  manifest: { schema_version: "1.0", policy: "approved-current-conflict-free" },
  topics: [
    {
      topic_id: "amenities",
      title: "Amenities",
      entries: [{
        id: "ev_chargers",
        name: "EV chargers",
        publication_status: "approved",
        retrieval_tags: ["electric vehicle", "parking", "J1772"],
        guest_questions: ["Can I charge my EV?"],
        facts: [{ claim: "Two Level 2 J1772 chargers are on the upper parking-garage level.", publication_status: "approved" }],
        recommendation_notes: [{ text: "Guests need a compatible J1772 adapter.", publication_status: "approved" }],
        example_spoken_answers: { short: "There are two paid J1772 chargers." },
      }],
    },
    {
      topic_id: "restaurants",
      title: "Restaurants",
      entries: [{
        id: "pazzo",
        name: "Pazzo Italiano",
        publication_status: "approved",
        retrieval_tags: ["Italian", "pasta"],
        facts: [
          { claim: "Pazzo Italiano serves Italian food.", publication_status: "approved" },
          { claim: "An unapproved claim must never be retrieved.", publication_status: "draft" },
        ],
        recommendation_notes: [{ text: "Consider it for an Italian dinner.", publication_status: "approved" }],
        safe_fallback: "Check current hours before leaving.",
      }],
    },
  ],
};

test("published retrieval is disabled by default", async () => {
  resetPublishedKnowledgeCacheForTests();
  let called = false;
  const result = await searchPublishedKnowledge({
    query: "EV charger",
    env: {},
    fetchImpl: async () => { called = true; throw new Error("unexpected"); },
  });
  assert.equal(called, false);
  assert.equal(result.status, "disabled");
  assert.equal(result.source, "legacy");
});

test("published retrieval uses the approved snapshot when enabled", async () => {
  resetPublishedKnowledgeCacheForTests();
  const result = await searchPublishedKnowledge({
    query: "Do you have an EV charger?",
    topics: ["resort"],
    env: { DESTINY_PUBLISHED_KNOWLEDGE_ENABLED: "true", DESTINY_PUBLISHED_KNOWLEDGE_URL: "https://knowledge.test/bundle" },
    fetchImpl: async () => ({ ok: true, json: async () => bundle }),
  });
  assert.equal(result.source, "published");
  assert.equal(result.revision, "6339a434");
  assert.match(result.snippets[0].text, /Two Level 2 J1772/);
});

test("ranking never renders draft facts", () => {
  const result = rankPublishedKnowledge(bundle, { query: "Italian dinner", topics: ["restaurants"], limit: 3 });
  assert.equal(result.snippets.length, 1);
  assert.match(result.snippets[0].text, /Pazzo Italiano serves Italian food/);
  assert.doesNotMatch(result.snippets[0].text, /unapproved claim/);
});
