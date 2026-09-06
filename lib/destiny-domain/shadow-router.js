import { createRouterInput } from "./contracts.js";
import { routeRequest, summarizeRouterPlan } from "./route-request.js";

export function buildRouterShadow({ channel, text, sessionId, turnId, sequence = 1, context = {} } = {}) {
  try {
    const input = createRouterInput({ channel, originalText: text, sessionId, turnId, sequence, context });
    const plan = routeRequest(input);
    return Object.freeze({ ok: true, plan, summary: summarizeRouterPlan(plan) });
  } catch (error) {
    return Object.freeze({ ok: false, error: String(error?.message || error).slice(0, 300), summary: Object.freeze({ version: 2, routes: ["clarify"], intents: ["unknown"], fields: [], capabilities: ["none"], shadow: true }) });
  }
}
