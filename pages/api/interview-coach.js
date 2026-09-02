import OpenAI from "openai";
import { allowSameOriginRequest, cleanText, enforceJsonSize, enforceRateLimit } from "../../lib/public-api-security.js";

export default async function handler(req, res) {
  if (!allowSameOriginRequest(req, res, { methods: ["POST"] })) return;
  if (!enforceJsonSize(req, res, 24_000)) return;
  if (!enforceRateLimit(req, res, { scope: "interview-coach", limit: 30, windowMs: 60 * 60 * 1000 })) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "The interview coach is temporarily unavailable." });

  const question = cleanText(req.body?.question, 1600, { multiline: true });
  const story = cleanText(req.body?.story, 12_000, { multiline: true });
  const storyTitle = cleanText(req.body?.storyTitle, 160);
  const history = Array.isArray(req.body?.history)
    ? req.body.history.slice(-6).map((item) => ({
        role: item?.role === "assistant" ? "assistant" : "user",
        content: cleanText(item?.content, 1800, { multiline: true }),
      })).filter((item) => item.content)
    : [];

  if (!question || !story) return res.status(400).json({ error: "Choose a story and enter a question." });

  const prompt = `You are a rigorous but supportive interview coach. Help the candidate rehearse the selected STAR story. Stay grounded only in the supplied story; never invent employers, metrics, actions, dates, or outcomes. Identify weak logic, missing evidence, excessive length, unclear ownership, likely follow-up questions, and ways to sound natural rather than memorized. Answer the candidate's exact question first. Be concise unless they explicitly ask for a rewrite or mock interview.\n\nSELECTED STORY: ${storyTitle}\n${story}\n\nRECENT COACHING CHAT:\n${history.map((item) => `${item.role.toUpperCase()}: ${item.content}`).join("\n")}\n\nCANDIDATE QUESTION: ${question}`;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model: "gpt-5.6-sol",
      input: prompt,
      max_output_tokens: 900,
    });
    const answer = cleanText(response.output_text, 6000, { multiline: true });
    if (!answer) throw new Error("EMPTY_RESPONSE");
    return res.status(200).json({ answer });
  } catch (error) {
    console.error("[INTERVIEW COACH] response failed", {
      name: error?.name || "Error",
      status: error?.status || null,
      code: error?.code || null,
      message: cleanText(error?.message, 500),
    });
    return res.status(502).json({ error: "The coach could not answer just now. Please try again." });
  }
}
