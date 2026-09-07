import test from "node:test";
import assert from "node:assert/strict";
import handler, { requestedRecommendationCount } from "../pages/api/destiny-voice-knowledge.js";
import { resetPublishedKnowledgeCacheForTests } from "../lib/destiny-agent/published-knowledge.js";

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
}

test("private voice knowledge endpoint returns approved HQ facts without an OpenAI round trip", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnabled = process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED;
  const originalUrl = process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL;
  resetPublishedKnowledgeCacheForTests();
  process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED = "true";
  process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL = "https://knowledge.test/bundle";
  globalThis.fetch = async url => {
    const requested = new URL(url);
    assert.equal(`${requested.origin}${requested.pathname}`, "https://knowledge.test/bundle");
    assert.match(requested.searchParams.get("knowledge_window") || "", /^\d+$/);
    return {
      ok: true,
      json: async () => ({
        revision: "owner-approved-1",
        manifest: { schema_version: "1.0" },
        topics: [{
          topic_id: "amenities",
          title: "Amenities",
          entries: [{
            id: "ev-location",
            name: "EV charger location",
            publication_status: "approved",
            retrieval_tags: ["EV", "charger", "parking", "upper"],
            facts: [{ claim: "Two J1772 chargers are on the upper garage level.", publication_status: "approved" }],
          }],
        }],
      }),
    };
  };

  try {
    const req = {
      method: "POST",
      headers: { host: "voice.test", origin: "https://voice.test" },
      socket: { remoteAddress: "127.0.0.77" },
      body: { query: "Where are the EV chargers?" },
    };
    const res = responseRecorder();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.source, "published");
    assert.equal(res.body.revision, "owner-approved-1");
    assert.equal(res.body.domain.status, "complete");
    assert.equal(res.body.domain.executedRoute, "published-knowledge");
    assert.equal(res.body.domain.cacheState, "miss");
    assert.match(res.body.reply, /upper garage level/i);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnabled === undefined) delete process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED;
    else process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED = originalEnabled;
    if (originalUrl === undefined) delete process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL;
    else process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL = originalUrl;
    resetPublishedKnowledgeCacheForTests();
  }
});

test("voice knowledge endpoint reports route handoff without hiding it as a knowledge result", async () => {
  const req = {
    method: "POST",
    headers: { host: "voice.test", origin: "https://voice.test" },
    socket: { remoteAddress: "127.0.0.79" },
    body: { query: "What is the weather tomorrow?", traceId: "trace_weather", turnId: "turn_weather", subrequestId: "sub_weather" },
  };
  const res = responseRecorder();
  await handler(req, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.route, "live");
  assert.equal(res.body.domain.status, "partial");
  assert.equal(res.body.domain.requestedRoute, "knowledge");
  assert.equal(res.body.domain.executedRoute, "route-classifier");
  assert.equal(res.body.domain.fallbackReason, "requires_live");
  assert.equal(res.body.domain.traceId, "trace_weather");
});

test("known restaurant hours stay on the published HQ route even when phrased as open now", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnabled = process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED;
  const originalUrl = process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL;
  resetPublishedKnowledgeCacheForTests();
  process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED = "true";
  process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL = "https://knowledge.test/restaurants";
  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    revision: "restaurant-static-1", manifest: { schema_version: "1.0" }, topics: [{
      topic_id: "restaurants", title: "Restaurants", entries: [{
        id: "restaurant_pazzo", name: "Pazzo Italiano", publication_status: "approved",
        retrieval_tags: ["Pazzo", "Italian", "hours", "open"],
        facts: [{ claim: "Pazzo Italiano's stored normal hours are available in the approved guide.", publication_status: "approved" }],
      }],
    }],
  }) });
  try {
    const req = { method: "POST", headers: { host: "voice.test", origin: "https://voice.test" }, socket: { remoteAddress: "127.0.0.96" }, body: { query: "Is Pazzo open now?" } };
    const res = responseRecorder();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.route, "knowledge");
    assert.deepEqual(res.body.topics, ["restaurants"]);
    assert.equal(res.body.source, "published");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnabled === undefined) delete process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED; else process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED = originalEnabled;
    if (originalUrl === undefined) delete process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL; else process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL = originalUrl;
    resetPublishedKnowledgeCacheForTests();
  }
});

test("broad recommendations default to three unless the guest asks for another count", () => {
  assert.equal(requestedRecommendationCount("Recommend Italian restaurants"), 3);
  assert.equal(requestedRecommendationCount("Give me restaurant recommendations"), 3);
  assert.equal(requestedRecommendationCount("Can you suggest some restaurants?"), 3);
  assert.equal(requestedRecommendationCount("What are the best places to eat?"), 3);
  assert.equal(requestedRecommendationCount("Give me beach recommendations"), 3);
  assert.equal(requestedRecommendationCount("Suggest some things to do"), 3);
  assert.equal(requestedRecommendationCount("Give me shopping recommendations"), 3);
  assert.equal(requestedRecommendationCount("Give me two beach options"), 2);
  assert.equal(requestedRecommendationCount("Recommend restaurants for two adults"), 3);
  assert.equal(requestedRecommendationCount("What airports can I use for Destin?"), 3);
  assert.equal(requestedRecommendationCount("Which airport should I use for Destin?"), 3);
  assert.equal(requestedRecommendationCount("Give me two airport options"), 2);
  assert.equal(requestedRecommendationCount("Where are the EV chargers?"), null);
});

test("recommendation endpoint returns three named candidates and a hard response contract", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnabled = process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED;
  const originalUrl = process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL;
  resetPublishedKnowledgeCacheForTests();
  process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED = "true";
  process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL = "https://knowledge.test/recommendations";
  const restaurantNames = ["Pazzo", "Mimmo's", "Fat Clemenza's", "Nonna's", "Capriccio", "Boshamps"];
  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    revision: "three-options", manifest: { schema_version: "1.0" }, topics: [{
      topic_id: "restaurants", title: "Restaurants", entries: restaurantNames.map((name, index) => ({
        id: `italian_${index}`, name, publication_status: "approved", retrieval_tags: ["Italian"],
        recommendation_categories: ["restaurant", "restaurant-italian"],
        facts: [{ claim: `${name} is an Italian option.`, publication_status: "approved" }],
        recommendation_notes: [{ text: `Consider ${name} for Italian food.`, publication_status: "approved" }],
      })),
    }],
  }) });
  try {
    for (const [index, query] of ["Recommend Italian restaurants", "Give me restaurant recommendations", "Can you suggest some restaurants?"].entries()) {
      const req = { method: "POST", headers: { host: "voice.test", origin: "https://voice.test" }, socket: { remoteAddress: `127.0.0.${88 + index}` }, body: { query } };
      const res = responseRecorder();
      await handler(req, res);
      assert.equal(res.statusCode, 200, query);
      assert.equal(res.body.requestedCount, 3, query);
      assert.equal(res.body.resultCount, 3, query);
      assert.equal(res.body.coverageGap, false, query);
      assert.equal(new Set(res.body.candidates.map((item) => item.name)).size, 3, query);
      assert.ok(res.body.candidates.every((item) => restaurantNames.includes(item.name)), query);
      assert.match(res.body.reply, /Name every one of the 3 distinct candidates/i, query);
    }
    const firstReq = { method: "POST", headers: { host: "voice.test", origin: "https://voice.test" }, socket: { remoteAddress: "127.0.0.94" }, body: { query: "Recommend restaurants" } };
    const firstRes = responseRecorder();
    await handler(firstReq, firstRes);
    const firstIds = firstRes.body.candidates.map(item => item.id);
    const moreReq = { method: "POST", headers: { host: "voice.test", origin: "https://voice.test" }, socket: { remoteAddress: "127.0.0.95" }, body: { query: "What other ones?", priorQuery: "Recommend restaurants", excludeCandidateIds: [...firstIds, "../../invalid"] } };
    const moreRes = responseRecorder();
    await handler(moreReq, moreRes);
    assert.equal(moreRes.statusCode, 200);
    assert.equal(moreRes.body.resultCount, 3);
    assert.equal(moreRes.body.candidates.some(item => firstIds.includes(item.id)), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnabled === undefined) delete process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED; else process.env.DESTINY_PUBLISHED_KNOWLEDGE_ENABLED = originalEnabled;
    if (originalUrl === undefined) delete process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL; else process.env.DESTINY_PUBLISHED_KNOWLEDGE_URL = originalUrl;
    resetPublishedKnowledgeCacheForTests();
  }
});
