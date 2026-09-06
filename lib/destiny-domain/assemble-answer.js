export function requirementCoverage(subrequest, blocks = []) {
  const satisfied = [];
  const unresolved = [];
  for (const requirement of subrequest.requirements) {
    const covered = blocks.some(block => block && block.field === requirement.field && (!requirement.subjectId || block.subjectId === requirement.subjectId));
    (covered ? satisfied : unresolved).push(requirement.id);
  }
  return Object.freeze({ satisfied: Object.freeze(satisfied), unresolved: Object.freeze(unresolved), complete: unresolved.length === 0 });
}

export function assembleAnswerFrame(plan, outcomeBlocks = {}) {
  const outcomes = plan.subrequests.map(subrequest => {
    const blocks = Array.isArray(outcomeBlocks[subrequest.id]) ? outcomeBlocks[subrequest.id] : [];
    const coverage = requirementCoverage(subrequest, blocks);
    return Object.freeze({
      subrequestId: subrequest.id,
      status: coverage.complete ? "complete" : blocks.length ? "partial" : "unavailable",
      satisfiedRequirementIds: coverage.satisfied,
      unresolvedRequirementIds: coverage.unresolved,
      reason: coverage.complete ? null : "required_fields_missing",
      candidateIds: Object.freeze([...new Set(blocks.map(block => block.subjectId).filter(Boolean))]),
      coverage: null,
      blocks: Object.freeze(blocks),
      next: coverage.complete ? "none" : "disclose_partial",
    });
  });
  return Object.freeze({
    kind: "result", version: 2, planId: plan.planId, sessionId: plan.sessionId, turnId: plan.turnId,
    revision: plan.revision, policyVersion: plan.policyVersion,
    status: outcomes.every(item => item.status === "complete") ? "complete" : outcomes.some(item => item.status === "complete" || item.status === "partial") ? "partial" : "unavailable",
    outcomes: Object.freeze(outcomes), disposition: "active", delivery: "ready",
  });
}
