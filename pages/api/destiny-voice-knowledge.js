import { classifyPublishedKnowledgeRoute, contextualizePublishedKnowledgeQuery, inferPublishedKnowledgeTopics, inferPublishedRecommendationCategory, isBroadPublishedKnowledgeRecommendation, isGenericPublishedKnowledgeFollowUp, searchPublishedKnowledge } from "../../lib/destiny-agent/published-knowledge.js";
import { cleanDomainId, createDomainResult } from "../../lib/destiny-domain/contracts.js";
import { allowSameOriginRequest, cleanText, enforceJsonSize, enforceRateLimit } from "../../lib/public-api-security.js";

export function requestedRecommendationCount(query, topics = inferPublishedKnowledgeTopics(query)) {
  const value = String(query || "");
  if (!isBroadPublishedKnowledgeRecommendation(value, topics)) return null;
  const explicit = value.match(/\b(?:give|show|list|name|recommend|suggest|offer)\s+(?:me\s+)?(?:about\s+)?([1-5]|one|two|three|four|five)\b/i)?.[1]?.toLowerCase()
    || value.match(/\b([1-5]|one|two|three|four|five)\s+(?:different\s+)?(?:restaurants?|places?|options?|choices?|recommendations?|beaches|activities|attractions|shops?|grocer(?:y|ies)|supermarkets?|spas?|airports?)\b/i)?.[1]?.toLowerCase();
  const number = { one: 1, two: 2, three: 3, four: 4, five: 5 }[explicit] || Number(explicit);
  return Number.isFinite(number) ? number : 3;
}

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
  if (!enforceJsonSize(req, res, 6_000)) return;
  if (!enforceRateLimit(req, res, { scope: "destiny-voice-knowledge", limit: 60, windowMs: 10 * 60 * 1000 })) return;

  const query = cleanText(req.body?.query, 500);
  const priorQuery = cleanText(req.body?.priorQuery, 500);
  const traceId = cleanDomainId(req.body?.traceId);
  const turnId = cleanDomainId(req.body?.turnId);
  const subrequestId = cleanDomainId(req.body?.subrequestId);
  const excludeCandidateIds = isGenericPublishedKnowledgeFollowUp(query)
    ? [...new Set((Array.isArray(req.body?.excludeCandidateIds) ? req.body.excludeCandidateIds : [])
      .map(value => cleanText(value, 120))
      .filter(value => /^[a-z0-9_-]+$/i.test(value)))]
      .slice(0, 12)
    : [];
  if (query.length < 2) return res.status(400).json({ error: "A complete knowledge question is required." });

  const retrievalQuery = contextualizePublishedKnowledgeQuery(query, priorQuery);
  const route = classifyPublishedKnowledgeRoute(retrievalQuery);
  if (route !== "knowledge") {
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(409).json({
      error: route === "availability" ? "This request requires the availability tool." : "This request requires a live or protected-information check.",
      route,
      domain: createDomainResult({
        traceId, turnId, subrequestId,
        status: "partial",
        requestedRoute: "knowledge",
        executedRoute: "route-classifier",
        httpStatus: 409,
        fallbackReason: `requires_${route}`,
        unresolved: [route],
      }),
    });
  }

  const topics = inferPublishedKnowledgeTopics(retrievalQuery);
  const recommendationCategory = inferPublishedRecommendationCategory(retrievalQuery, topics);
  const requestedCount = requestedRecommendationCount(query, topics);
  const result = await searchPublishedKnowledge({ query: retrievalQuery, topics, limit: requestedCount ? Math.max(requestedCount, 5) : 4, requireMatch: true, excludeEntryIds: excludeCandidateIds });
  if (result.source !== "published" || !result.snippets.length) {
    return res.status(404).json({
      error: "The approved Destiny Knowledge HQ does not contain a reliable answer for that question.",
      status: result.status,
      domain: createDomainResult({
        traceId, turnId, subrequestId,
        status: "unavailable",
        requestedRoute: "knowledge",
        executedRoute: "published-knowledge",
        httpStatus: 404,
        revision: result.revision || "",
        source: result.source || "",
        cacheState: result.cacheState || "",
        fallbackReason: result.status || "no_match",
        unresolved: ["knowledge"],
      }),
    });
  }

  const selected = requestedCount ? result.snippets.slice(0, requestedCount) : result.snippets;
  const topicMismatch = requestedCount && topics.length
    ? selected.find(item => !topics.includes(item.topicId))
    : null;
  const categoryMismatch = recommendationCategory.startsWith("restaurant")
    ? selected.find(item => item.topicId !== "restaurants")
    : null;
  if (topicMismatch || categoryMismatch) {
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(502).json({
      error: "The knowledge result did not match the guest's requested category.",
      route: "knowledge",
      topics,
      recommendationCategory,
      rejectedCandidate: (topicMismatch || categoryMismatch)?.entryId || "",
      domain: createDomainResult({
        traceId, turnId, subrequestId,
        status: "error",
        requestedRoute: "knowledge",
        executedRoute: "published-knowledge",
        httpStatus: 502,
        revision: result.revision || "",
        source: result.source || "",
        cacheState: result.cacheState || "",
        fallbackReason: "knowledge_category_mismatch",
        unresolved: ["knowledge_category"],
      }),
    });
  }
  const facts = selected.map(item => item.text).filter(Boolean);
  const candidates = selected.map(item => ({ id: item.entryId, name: item.name, topic: item.topicId, detail: item.text })).filter(item => item.name);
  const links = Array.isArray(result.urls) ? result.urls : [];
  const reply = [
    "Approved Destiny Knowledge HQ results:",
    ...candidates.map(candidate => `- ${candidate.name}: ${candidate.detail}`),
    ...(links.length ? ["Useful companion links:", ...links.map(link => `- ${link}`)] : []),
    requestedCount ? `The guest requested recommendations. Name every one of the ${candidates.length} distinct candidates above, with one useful differentiator each. Do not collapse the list to one option and do not invent padding.` : "Answer the guest naturally and concisely from these results.",
    "Do not claim that changing information is current unless the results explicitly say so.",
  ].join("\n");

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({
    reply, facts, candidates, requestedCount, resultCount: candidates.length,
    coverageGap: Boolean(requestedCount && candidates.length < requestedCount),
    links, topics, recommendationCategory, route: "knowledge",
    revision: result.revision || null, source: "published",
    domain: createDomainResult({
      traceId, turnId, subrequestId,
      status: requestedCount && candidates.length < requestedCount ? "partial" : "complete",
      requestedRoute: "knowledge",
      executedRoute: "published-knowledge",
      httpStatus: 200,
      revision: result.revision || "",
      source: "published",
      cacheState: result.cacheState || "",
      resolved: candidates.map(candidate => candidate.id),
      unresolved: requestedCount && candidates.length < requestedCount ? ["recommendation_coverage"] : [],
    }),
  });
}
