const terminalStatuses = new Set(["completed", "cancelled", "failed", "incomplete"]);

const cloneLease = lease => lease ? { ...lease, context: { ...lease.context } } : null;

/**
 * Owns every audible Realtime response for one call. Public methods enqueue
 * events; effects run only after all state transitions have committed.
 */
export class VoiceResponseCoordinator {
  constructor({ emit = () => {} } = {}) {
    this.emit = emit;
    this.epoch = 0;
    this.sequence = 0;
    this.lease = null;
    this.queue = [];
    this.ended = true;
    this.candidate = null;
    this.events = [];
    this.reducing = false;
  }

  start(epoch) { this.#dispatch({ type: "START", epoch }); }
  end() { this.#dispatch({ type: "END" }); }

  request(kind, response = {}, context = {}) {
    if (this.ended) return null;
    const requestToken = `voice_${this.epoch}_${++this.sequence}`;
    this.#dispatch({ type: "REQUEST", job: this.#createJob(kind, response, context, requestToken) });
    return requestToken;
  }

  responseCreated(response = {}) { return this.#dispatch({ type: "RESPONSE_CREATED", response }); }
  audioStarted(responseId) { return this.#dispatch({ type: "AUDIO_STARTED", responseId }); }
  responseDone(response = {}) { return this.#dispatch({ type: "RESPONSE_DONE", response }); }
  audioStopped(responseId) { return this.#dispatch({ type: "AUDIO_STOPPED", responseId }); }
  audioCleared(responseId) { return this.#dispatch({ type: "AUDIO_CLEARED", responseId }); }

  speechStarted(candidateId) {
    this.#dispatch({ type: "SPEECH_STARTED", candidateId: String(candidateId || `candidate_${this.epoch}_${++this.sequence}`) });
  }

  restoreSpeech(candidateId, reason = "non_meaningful_audio") {
    return this.#dispatch({ type: "SPEECH_RESTORE", candidateId, reason });
  }

  confirmInterruption(candidateId, reason = "meaningful_guest_speech", options = {}) {
    return this.#dispatch({ type: "INTERRUPT", candidateId, reason, options });
  }

  interrupt(reason = "meaningful_guest_speech", options = {}) {
    return this.confirmInterruption(this.candidate?.candidateId, reason, options);
  }

  recoverCancellationTimeout(requestToken) {
    return this.#dispatch({ type: "CANCELLATION_TIMEOUT", requestToken });
  }

  invalidateQueued(predicate, reason = "invalidated") {
    return this.#dispatch({ type: "INVALIDATE_QUEUE", predicate, reason });
  }

  hasLease() { return Boolean(this.lease); }
  activeLease() { return cloneLease(this.lease); }
  activeCandidate() { return this.candidate ? { ...this.candidate } : null; }

  #createJob(kind, response, context, requestToken) {
    return {
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
          ...(context.taskId ? { destiny_task_id: String(context.taskId) } : {}),
          ...(context.waveId ? { destiny_wave_id: String(context.waveId) } : {}),
          ...(context.toolCallId ? { destiny_tool_call_id: String(context.toolCallId) } : {}),
        },
      },
    };
  }

  #dispatch(event) {
    this.events.push(event);
    if (this.reducing) return true;
    this.reducing = true;
    const effects = [];
    let result = true;
    while (this.events.length) {
      if (this.#reduce(this.events.shift(), effects) === false) result = false;
    }
    this.reducing = false;
    for (const effect of effects) this.emit(effect);
    return result;
  }

  #reduce(event, effects) {
    if (event.type === "START") {
      this.epoch = event.epoch;
      this.sequence = 0;
      this.lease = null;
      this.queue = [];
      this.candidate = null;
      this.ended = false;
      effects.push({ type: "state", state: "idle", epoch: this.epoch });
      return true;
    }
    if (event.type === "END") {
      this.epoch += 1;
      this.ended = true;
      this.queue = [];
      this.lease = null;
      this.candidate = null;
      effects.push({ type: "restore_audio", reason: "call_ended" });
      effects.push({ type: "state", state: "ended", epoch: this.epoch });
      return true;
    }
    if (this.ended) return false;

    if (event.type === "REQUEST") {
      if (this.lease) {
        this.queue.push(event.job);
        effects.push({ type: "queued", job: event.job, owner: cloneLease(this.lease) });
      } else this.#acquire(event.job, effects);
      return true;
    }

    if (event.type === "INVALIDATE_QUEUE") {
      const kept = [];
      for (const job of this.queue) {
        if (typeof event.predicate === "function" && event.predicate(job)) effects.push({ type: "dropped", reason: event.reason, job });
        else kept.push(job);
      }
      this.queue = kept;
      return true;
    }

    if (event.type === "CANCELLATION_TIMEOUT") {
      if (!this.lease || !this.lease.interrupted || this.lease.requestToken !== event.requestToken) return false;
      const released = cloneLease(this.lease);
      this.lease = null;
      this.candidate = null;
      effects.push({ type: "restore_audio", reason: "cancellation_timeout_recovered" });
      effects.push({ type: "recovered", reason: "cancellation_timeout", lease: released });
      const next = this.queue.shift();
      if (next && !this.ended) this.#acquire(next, effects);
      return true;
    }

    if (event.type === "SPEECH_STARTED") {
      this.candidate = { candidateId: event.candidateId, epoch: this.epoch, phase: "provisional" };
      if (this.lease && !this.lease.playbackTerminal) {
        this.lease.ducked = true;
        effects.push({ type: "duck_audio", candidateId: event.candidateId, lease: cloneLease(this.lease) });
      }
      return true;
    }

    if (event.type === "SPEECH_RESTORE") {
      if (event.candidateId && this.candidate && event.candidateId !== this.candidate.candidateId) return false;
      if (this.lease) this.lease.ducked = false;
      this.candidate = null;
      effects.push({ type: "restore_audio", reason: event.reason });
      return true;
    }

    if (event.type === "INTERRUPT") {
      if (event.candidateId && this.candidate && event.candidateId !== this.candidate.candidateId) return false;
      if (this.candidate) this.candidate.phase = "confirmed";
      if (!this.lease) {
        this.candidate = null;
        effects.push({ type: "restore_audio", reason: "no_active_output" });
        return false;
      }
      const { dropQueued = false, dropPredicate } = event.options || {};
      if (dropQueued || typeof dropPredicate === "function") {
        const kept = [];
        for (const job of this.queue) {
          const shouldDrop = dropQueued || dropPredicate(job);
          if (shouldDrop) effects.push({ type: "dropped", reason: event.reason, job });
          else kept.push(job);
        }
        this.queue = kept;
      }
      this.lease.interrupted = true;
      this.lease.interruptReason = event.reason;
      this.lease.ducked = true;
      if (!this.lease.responseId) {
        this.lease.cancelOnCreate = true;
        effects.push({ type: "state", state: "cancelling", lease: cloneLease(this.lease) });
      } else this.#emitCancellation(this.lease, effects);
      return true;
    }

    if (event.type === "RESPONSE_CREATED") {
      const metadata = event.response?.metadata || {};
      const exactMatch = this.lease
        && metadata.destiny_epoch === String(this.epoch)
        && metadata.destiny_request_token === this.lease.requestToken
        && metadata.destiny_kind === this.lease.kind;
      if (!exactMatch) {
        const stale = metadata.destiny_epoch && metadata.destiny_epoch !== String(this.epoch);
        effects.push({ type: stale ? "stale" : "unowned", event: "response.created", responseId: event.response?.id });
        if (!stale && event.response?.id) effects.push({ type: "contain_unowned", responseId: event.response.id });
        return false;
      }
      this.lease.responseId = event.response.id || this.lease.responseId;
      this.lease.generationStatus = "in_progress";
      effects.push({ type: "bound", lease: cloneLease(this.lease) });
      if (this.lease.cancelOnCreate) this.#emitCancellation(this.lease, effects);
      return true;
    }

    if (event.type === "AUDIO_STARTED") {
      if (!this.#matches(event.responseId)) return false;
      this.lease.playbackStarted = true;
      this.lease.playbackStatus = "playing";
      effects.push({ type: "state", state: "playing", lease: cloneLease(this.lease) });
      return true;
    }

    if (event.type === "RESPONSE_DONE") {
      if (!this.#matches(event.response?.id)) return false;
      const status = event.response?.status;
      if (!terminalStatuses.has(status)) {
        effects.push({ type: "diagnostic", event: "unknown_response_status", status, responseId: event.response?.id });
        return false;
      }
      this.lease.generationStatus = status;
      this.lease.generationTerminal = true;
      const hasAudio = Array.isArray(event.response?.output) && event.response.output.some(item =>
        Array.isArray(item?.content) && item.content.some(content => content?.type === "audio" || content?.type === "output_audio")
      );
      if (!hasAudio && !this.lease.playbackStarted) {
        this.lease.playbackStatus = "not_produced";
        this.lease.playbackTerminal = true;
      }
      this.#releaseIfTerminal(effects);
      return true;
    }

    if (event.type === "AUDIO_STOPPED") {
      if (!this.#matches(event.responseId)) return false;
      this.lease.playbackStatus = "stopped";
      this.lease.playbackTerminal = true;
      this.#releaseIfTerminal(effects);
      return true;
    }

    if (event.type === "AUDIO_CLEARED") {
      if (!this.lease?.clearRequested || !this.#matches(event.responseId)) return false;
      this.lease.playbackStatus = "cleared";
      this.lease.playbackTerminal = true;
      this.#releaseIfTerminal(effects);
      return true;
    }
    return false;
  }

  #acquire(job, effects) {
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
      ducked: false,
    };
    effects.push({ type: "send_response", job, lease: cloneLease(this.lease) });
  }

  #emitCancellation(lease, effects) {
    if (!lease.cancelRequested && !lease.generationTerminal) {
      lease.cancelRequested = true;
      effects.push({ type: "send_cancel", responseId: lease.responseId, lease: cloneLease(lease) });
    }
    if (!lease.clearRequested && !lease.playbackTerminal) {
      lease.clearRequested = true;
      effects.push({ type: "clear_audio", responseId: lease.responseId, lease: cloneLease(lease) });
    }
    effects.push({ type: "state", state: "cancelling", lease: cloneLease(lease) });
  }

  #matches(responseId) {
    return Boolean(this.lease?.responseId && responseId && responseId === this.lease.responseId);
  }

  #releaseIfTerminal(effects) {
    if (!this.lease?.generationTerminal || !this.lease?.playbackTerminal) return;
    const released = cloneLease(this.lease);
    this.lease = null;
    this.candidate = null;
    effects.push({ type: "restore_audio", reason: "output_terminal" });
    effects.push({ type: "released", lease: released });
    const next = this.queue.shift();
    if (next && !this.ended) this.#acquire(next, effects);
  }
}
