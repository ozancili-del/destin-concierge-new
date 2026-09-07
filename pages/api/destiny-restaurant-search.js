import OpenAI from "openai";
import { createDomainResult } from "../../lib/destiny-domain/contracts.js";
import { allowSameOriginRequest, cleanText, enforceJsonSize, enforceRateLimit } from "../../lib/public-api-security.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SEARCH_TIMEOUT_MS = 20_000;

function responseText(response) {
  if (typeof response?.output_text === "string") return response.output_text.trim();
  return (response?.output || []).flatMap(item => item?.content || [])
    .filter(item => item?.type === "output_text" && item?.text)
    .map(item => item.text)
    .join("\n")
    .trim();
}

function responseUrls(response) {
  const urls = [];
  for (const output of response?.output || []) {
    for (const content of output?.content || []) {
      for (const annotation of content?.annotations || []) {
        const url = annotation?.url || annotation?.url_citation?.url;
        if (typeof url === "string" && /^https?:\/\//i.test(url)) urls.push(url);
      }
    }
  }
  return [...new Set(urls)].slice(0, 5);
}

export function createHandler({ openaiClient = openai } = {}) {
  return async function handler(req, res) {
    if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
    if (!enforceJsonSize(req, res, 4_000)) return;
    if (!enforceRateLimit(req, res, { scope: "destiny-restaurant-search", limit: 10, windowMs: 10 * 60 * 1000 })) return;

    const query = cleanText(req.body?.query, 500);
    if (query.length < 3) return res.status(400).json({ error: "A restaurant question is required." });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    try {
      const response = await openaiClient.responses.create({
        model: process.env.DESTINY_RESTAURANT_SEARCH_MODEL || "gpt-5-mini",
        input: [{
          role: "developer",
          content: [
            "Research only the restaurant named in the guest's quoted request.",
            "This search was explicitly confirmed by the guest because the restaurant was absent from Destiny's approved local guide.",
            "Use current primary restaurant sources when possible. Give a concise description, location, cuisine, normal published hours, official contact or reservation route, and any material uncertainty.",
            "Do not claim current wait time, table availability, menu-item availability, or dietary accommodation. Tell the guest to confirm those directly with the restaurant.",
            "Do not make a reservation. Do not broaden this into unrelated recommendations.",
            `Guest request: ${JSON.stringify(query)}`,
          ].join(" "),
        }],
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
        reasoning: { effort: "low" },
        store: false,
        max_output_tokens: 650,
      }, { signal: controller.signal });
      const answer = responseText(response);
      const links = responseUrls(response);
      if (!answer) throw new Error("empty_restaurant_search_result");
      return res.status(200).json({
        reply: `${answer}${links.length ? `\nUseful links:\n${links.map(url => `- ${url}`).join("\n")}` : ""}`,
        links,
        domain: createDomainResult({
          traceId: req.body?.traceId, turnId: req.body?.turnId, subrequestId: req.body?.subrequestId,
          status: "complete", requestedRoute: "live", executedRoute: "external-restaurant-search", httpStatus: 200,
          source: "web_search", resolved: ["restaurant_research"],
        }),
      });
    } catch (error) {
      const timedOut = error?.name === "AbortError";
      return res.status(timedOut ? 504 : 502).json({
        error: timedOut
          ? "The restaurant search reached its time limit. Please check the restaurant directly."
          : "The restaurant search could not be completed. Please check the restaurant directly.",
        domain: createDomainResult({
          traceId: req.body?.traceId, turnId: req.body?.turnId, subrequestId: req.body?.subrequestId,
          status: "unavailable", requestedRoute: "live", executedRoute: "external-restaurant-search", httpStatus: timedOut ? 504 : 502,
          source: "web_search", fallbackReason: timedOut ? "restaurant_search_timeout" : "restaurant_search_failed", unresolved: ["restaurant_research"],
        }),
      });
    } finally {
      clearTimeout(timer);
    }
  };
}

export default createHandler();
