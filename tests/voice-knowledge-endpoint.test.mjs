import test from "node:test";
import assert from "node:assert/strict";
import handler from "../pages/api/destiny-voice-knowledge.js";
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
    assert.equal(url, "https://knowledge.test/bundle");
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
