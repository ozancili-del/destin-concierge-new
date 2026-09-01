function responseText(response) {
  if (typeof response?.output_text === "string") return response.output_text.trim();
  const parts = [];
  for (const item of response?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if ((content?.type === "output_text" || content?.type === "text") && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function score(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(10, Math.round(parsed))) : null;
}

export function normalizeEvaluation(value) {
  const evaluation = value && typeof value === "object" ? value : {};
  const normalized = {
    overall: score(evaluation.overall),
    accuracy: score(evaluation.accuracy),
    completeness: score(evaluation.completeness),
    humanTone: score(evaluation.human_tone ?? evaluation.humanTone),
    toolLinkCompliance: score(evaluation.tool_link_compliance ?? evaluation.toolLinkCompliance),
    safety: score(evaluation.safety),
    priority: String(evaluation.priority || "").toUpperCase(),
    failureReason: String(evaluation.failure_reason ?? evaluation.failureReason ?? "").trim().slice(0, 500),
    improvement: String(evaluation.improvement || "").trim().slice(0, 700),
  };
  if (![normalized.overall, normalized.accuracy, normalized.completeness, normalized.humanTone, normalized.toolLinkCompliance, normalized.safety].every(Number.isInteger)) return null;
  if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(normalized.priority)) normalized.priority = normalized.overall <= 4 ? "CRITICAL" : normalized.overall <= 6 ? "HIGH" : normalized.overall <= 8 ? "MEDIUM" : "LOW";
  return normalized;
}

export async function evaluateGuestReply({ openai, model = "gpt-5-mini", guestMessage, reply, detectedIntent, toolResults = [] }) {
  if (!openai?.responses?.create || !guestMessage || !reply) return null;
  const toolSummary = toolResults.slice(-12).map(result => ({
    name: result?.name || "unknown",
    status: result?.status || null,
    ok: result?.ok === true,
    facts: Array.isArray(result?.facts) ? result.facts.slice(0, 4) : [],
    urls: Array.isArray(result?.urls) ? result.urls.slice(0, 4) : [],
  }));
  const instructions = `You are a strict quality evaluator for Destiny Blue, a Destin vacation-rental concierge. Grade the assistant reply against the guest request and verified tool record. Do not reward unsupported claims. Judge whether requested tasks were completed, required live tools or affiliate links were used, safety and maintenance handling were correct, and the tone sounds warm and human without canned excitement, invented concessions, or unnecessary questions. Return JSON only with: overall, accuracy, completeness, human_tone, tool_link_compliance, safety (integer 1-10); priority (LOW, MEDIUM, HIGH, CRITICAL); failure_reason (empty if none); improvement (one concise actionable suggestion). A score of 9-10 requires a genuinely production-quality answer.`;
  try {
    const response = await openai.responses.create({
      model,
      input: [
        { role: "developer", content: instructions },
        { role: "user", content: JSON.stringify({ guestMessage, reply, detectedIntent, toolResults: toolSummary }) },
      ],
      tool_choice: "none",
      reasoning: { effort: "low" },
      store: false,
      max_output_tokens: 500,
    });
    const raw = responseText(response).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return normalizeEvaluation(JSON.parse(raw));
  } catch (_) {
    return null;
  }
}

