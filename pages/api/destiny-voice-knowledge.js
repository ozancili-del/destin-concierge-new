import { inferPublishedKnowledgeTopics, searchPublishedKnowledge } from "../../lib/destiny-agent/published-knowledge.js";
import { allowSameOriginRequest, cleanText, enforceJsonSize, enforceRateLimit } from "../../lib/public-api-security.js";

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
  if (!enforceJsonSize(req, res, 6_000)) return;
  if (!enforceRateLimit(req, res, { scope: "destiny-voice-knowledge", limit: 60, windowMs: 10 * 60 * 1000 })) return;

  const query = cleanText(req.body?.query, 500);
  if (query.length < 2) return res.status(400).json({ error: "A complete knowledge question is required." });

  const topics = inferPublishedKnowledgeTopics(query);
  const result = await searchPublishedKnowledge({ query, topics, limit: 4, requireMatch: true });
  if (result.source !== "published" || !result.snippets.length) {
    return res.status(404).json({
      error: "The approved Destiny Knowledge HQ does not contain a reliable answer for that question.",
      status: result.status,
    });
  }

  const facts = result.snippets.map(item => item.text).filter(Boolean);
  const links = Array.isArray(result.urls) ? result.urls : [];
  const reply = [
    "Approved Destiny Knowledge HQ results:",
    ...facts.map(fact => `- ${fact}`),
    ...(links.length ? ["Useful companion links:", ...links.map(link => `- ${link}`)] : []),
    "Answer the guest naturally and concisely from these results. Do not claim that changing information is current unless the results explicitly say so.",
  ].join("\n");

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ reply, facts, links, topics, revision: result.revision || null, source: "published" });
}
