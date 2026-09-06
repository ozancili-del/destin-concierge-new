import { authorizePlan } from "./policy.js";

export async function executePlan(plan, { executors = {}, dryRun = true, profile = "voice_lab_guest" } = {}) {
  if (!dryRun) throw new Error("Router v2 activation is blocked until E1-E5 pass.");
  const authorization = authorizePlan(profile, plan.subrequests);
  if (!authorization.allowed) throw new Error("Router plan failed capability authorization.");
  const outcomes = [];
  for (const subrequest of plan.subrequests) {
    const executor = executors[subrequest.route];
    if (!executor) {
      outcomes.push(Object.freeze({ subrequestId: subrequest.id, status: "unavailable", satisfiedRequirementIds: [], unresolvedRequirementIds: subrequest.requirements.map(item => item.id), reason: "shadow_executor_absent", candidateIds: [], coverage: null, blocks: [], next: "none" }));
      continue;
    }
    outcomes.push(Object.freeze(await executor(Object.freeze({ planId: plan.planId, subrequest, revision: plan.revision, policyVersion: plan.policyVersion }))));
  }
  return Object.freeze({ kind: "result", version: 2, planId: plan.planId, sessionId: plan.sessionId, turnId: plan.turnId, revision: plan.revision, policyVersion: plan.policyVersion, status: outcomes.every(item => item.status === "complete") ? "complete" : outcomes.some(item => item.status === "complete" || item.status === "partial") ? "partial" : "unavailable", outcomes: Object.freeze(outcomes), disposition: "active", delivery: "ready" });
}
