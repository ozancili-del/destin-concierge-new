export class PlanStore {
  async create() { throw new Error("PlanStore.create must be implemented."); }
  async get() { throw new Error("PlanStore.get must be implemented."); }
  async compareAndSet() { throw new Error("PlanStore.compareAndSet must be implemented."); }
}

// Test/shadow only. Active routing must use an authenticated durable store.
export class InMemoryShadowPlanStore extends PlanStore {
  constructor() {
    super();
    this.records = new Map();
  }

  async create(plan) {
    if (this.records.has(plan.planId)) return Object.freeze({ created: false, record: this.records.get(plan.planId) });
    const record = Object.freeze({ plan, version: 1, result: null });
    this.records.set(plan.planId, record);
    return Object.freeze({ created: true, record });
  }

  async get(planId) {
    return this.records.get(planId) || null;
  }

  async compareAndSet(planId, expectedVersion, patch) {
    const current = this.records.get(planId);
    if (!current || current.version !== expectedVersion) return Object.freeze({ updated: false, record: current || null });
    const record = Object.freeze({ ...current, ...patch, version: current.version + 1 });
    this.records.set(planId, record);
    return Object.freeze({ updated: true, record });
  }
}
