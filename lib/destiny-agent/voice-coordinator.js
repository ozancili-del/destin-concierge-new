const terminalStatuses = new Set(["completed", "cancelled", "failed", "incomplete"]);

const cloneLease = lease => lease ? { ...lease } : null;

export class VoiceResponseCoordinator {
  constructor({ emit = () => {} } = {}) {
    this.emit = emit;
    this.epoch = 0;
    this.sequence = 0;
    this.lease = null;
    this.queue = [];
    this.ended = true;
  }

  start(epoch) {
    this.epoch = epoch;
    this.sequence = 0;
    this.lease = null;
    this.queue = [];
    this.ended = false;
    this.emit({ type: "state", state: "idle", epoch });
  }

  end() {
    this.epoch += 1;
    this.ended = true;
    this.queue = [];
    this.lease = null;
    this.emit({ type: "state", state: "ended", epoch: this.epoch });
  }

  request(kind, response = {}, context = {}) {
    if (this.ended) return null;
    const requestToken = `voice_${this.epoch}_${++this.sequence}`;
    const job = {
      kind,
      context: { ...context },
      requestToken,
      response: {
        ...response,
        metadata: {
          ...(response.metadata || {}),
          destiny_kind: kind,
          destiny_epoch: String(this.epoch),
          destiny_request_token: requestToken,
          ...(context.turnId ? { destiny_turn_id: String(context.turnId) } : {}),
          ...(context.toolCallId ? { destiny_tool_call_id: String(context.toolCallId) } : {}),
        },
      },
    };
    if (this.lease) {
      this.queue.push(job);
      this.emit({ type: "queued", job, owner: cloneLease(this.lease) });
    } else {
      this.#acquire(job);
    }
    return requestToken;
  }

  responseCreated(response = {}) {
    if (this.ended) return;
    const metadata = response.metadata || {};
    const epoch = Number(metadata.destiny_epoch);
    if (Number.isFinite(epoch) && epoch !== this.epoch) {
      this.emit({ type: "stale", event: "response.created", responseId: response.id });
      return;
    }
    const token = metadata.destiny_request_token;
    if (!this.lease || (token && token !== this.lease.requestToken)) {
      this.emit({ type: "unowned", event: "response.created", responseId: response.id });
      return;
    }
    this.lease.responseId = response.id || this.lease.responseId;
    this.lease.generationStatus = "in_progress";
    this.emit({ type: "bound", lease: cloneLease(this.lease) });
    if (this.lease.cancelOnCreate) this.#emitCancellation(this.lease);
  }

  audioStarted(responseId) {
    if (!this.#matches(responseId)) return false;
    this.lease.playbackStarted = true;
    this.lease.playbackStatus = "playing";
    this.emit({ type: "state", state: "playing", lease: cloneLease(this.lease) });
    return true;
  }

  responseDone(response = {}) {
    if (!this.#matches(response.id)) return false;
    this.lease.generationStatus = terminalStatuses.has(response.status) ? response.status : "completed";
    this.lease.generationTerminal = true;
    const hasAudio = Array.isArray(response.output) && response.output.some(item =>
      Array.isArray(item?.content) && item.content.some(content => content?.type === "audio" || content?.type === "output_audio")
    );
    if (!hasAudio && !this.lease.playbackStarted) {
      this.lease.playbackStatus = "not_produced";
      this.lease.playbackTerminal = true;
    }
    this.#releaseIfTerminal();
    return true;
  }

  audioStopped(responseId) {
    if (!this.#matches(responseId)) return false;
    this.lease.playbackStatus = "stopped";
    this.lease.playbackTerminal = true;
    this.#releaseIfTerminal();
    return true;
  }

  audioCleared(responseId) {
    if (!this.lease || (responseId && this.lease.responseId && responseId !== this.lease.responseId)) return false;
    this.lease.playbackStatus = "cleared";
    this.lease.playbackTerminal = true;
    this.#releaseIfTerminal();
    return true;
  }

  interrupt(reason = "guest_speech", { dropQueued = true } = {}) {
    if (!this.lease || this.ended) return false;
    if (dropQueued && this.queue.length) {
      const dropped = this.queue.splice(0);
      dropped.forEach(job => this.emit({ type: "dropped", reason, job }));
    }
    this.lease.interrupted = true;
    this.lease.interruptReason = reason;
    if (!this.lease.responseId) {
      this.lease.cancelOnCreate = true;
      this.emit({ type: "state", state: "cancelling", lease: cloneLease(this.lease) });
      return true;
    }
    this.#emitCancellation(this.lease);
    return true;
  }

  hasLease() {
    return Boolean(this.lease);
  }

  activeLease() {
    return cloneLease(this.lease);
  }

  #acquire(job) {
    this.lease = {
      ...job,
      responseId: null,
      generationStatus: "requested",
      generationTerminal: false,
      playbackStatus: "not_started",
      playbackStarted: false,
      playbackTerminal: false,
      cancelRequested: false,
      clearRequested: false,
      cancelOnCreate: false,
      interrupted: false,
    };
    this.emit({ type: "send_response", job, lease: cloneLease(this.lease) });
  }

  #emitCancellation(lease) {
    if (!lease.cancelRequested && !lease.generationTerminal) {
      lease.cancelRequested = true;
      this.emit({ type: "send_cancel", responseId: lease.responseId, lease: cloneLease(lease) });
    }
    if (!lease.clearRequested && !lease.playbackTerminal) {
      lease.clearRequested = true;
      this.emit({ type: "clear_audio", responseId: lease.responseId, lease: cloneLease(lease) });
    }
    this.emit({ type: "state", state: "cancelling", lease: cloneLease(lease) });
  }

  #matches(responseId) {
    if (!this.lease) return false;
    if (!responseId) return Boolean(this.lease.responseId);
    return responseId === this.lease.responseId;
  }

  #releaseIfTerminal() {
    if (!this.lease?.generationTerminal || !this.lease?.playbackTerminal) return;
    const released = cloneLease(this.lease);
    this.lease = null;
    this.emit({ type: "released", lease: released });
    const next = this.queue.shift();
    if (next && !this.ended) this.#acquire(next);
  }
}
