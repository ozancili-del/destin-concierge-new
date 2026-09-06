import test from "node:test";
import assert from "node:assert/strict";
import { createDomainResult, domainResultSucceeded } from "../lib/destiny-domain/contracts.js";

test("domain result is versioned, bounded, and uses explicit completion status", () => {
  const result = createDomainResult({
    traceId: "trace_1",
    turnId: "turn_1",
    subrequestId: "subrequest_1",
    status: "complete",
    requestedRoute: "knowledge",
    executedRoute: "published-knowledge",
    httpStatus: 200,
    revision: "revision_1",
    source: "published",
    cacheState: "hit",
    resolved: ["restaurant_mimmos", "restaurant_mimmos"],
  });
  assert.equal(result.version, 1);
  assert.equal(result.status, "complete");
  assert.deepEqual(result.resolved, ["restaurant_mimmos"]);
  assert.equal(domainResultSucceeded(result), true);
});

test("invalid domain fields fail closed rather than becoming telemetry authority", () => {
  const result = createDomainResult({ status: "success-ish", traceId: "bad trace", httpStatus: 42 });
  assert.equal(result.status, "error");
  assert.equal(result.traceId, "");
  assert.equal(result.httpStatus, null);
  assert.equal(domainResultSucceeded(result), false);
});
