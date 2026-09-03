import test from "node:test";
import assert from "node:assert/strict";
import { VoiceResponseCoordinator } from "../lib/destiny-agent/voice-coordinator.js";

const audioOutput = [{ type: "message", content: [{ type: "audio", transcript: "test" }] }];

function harness(epoch = 1) {
  const effects = [];
  const coordinator = new VoiceResponseCoordinator({ emit: effect => effects.push(effect) });
  coordinator.start(epoch);
  const sent = () => effects.filter(effect => effect.type === "send_response");
  const bindLatest = (id, { startAudio = true } = {}) => {
    const effect = sent().at(-1);
    coordinator.responseCreated({ id, metadata: effect.job.response.metadata });
    if (startAudio) coordinator.audioStarted(id);
    return effect;
  };
  return { coordinator, effects, sent, bindLatest };
}

test("one audio lease serializes progress and final responses", () => {
  const h = harness();
  h.coordinator.request("tool_progress", { conversation: "none" }, { toolCallId: "weather" });
  h.bindLatest("resp_progress");
  h.coordinator.request("tool_final", {}, { toolCallId: "weather" });
  assert.equal(h.sent().length, 1, "final must remain queued while progress owns audio");

  h.coordinator.responseDone({ id: "resp_progress", status: "completed", output: audioOutput });
  assert.equal(h.sent().length, 1, "response.done is not playback completion");
  h.coordinator.audioStopped("resp_progress");
  assert.equal(h.sent().length, 2, "final starts only after generation and playback are terminal");
  assert.equal(h.sent()[1].job.kind, "tool_final");
});

test("playback stop before response.done also keeps the final blocked", () => {
  const h = harness();
  h.coordinator.request("tool_progress", { conversation: "none" });
  h.bindLatest("resp_progress");
  h.coordinator.request("tool_final");
  h.coordinator.audioStopped("resp_progress");
  assert.equal(h.sent().length, 1);
  h.coordinator.responseDone({ id: "resp_progress", status: "completed", output: audioOutput });
  assert.equal(h.sent().length, 2);
});

test("an exact interruption cancels generation and clears WebRTC audio", () => {
  const h = harness();
  h.coordinator.request("tool_progress", { conversation: "none" });
  h.bindLatest("resp_progress");
  assert.equal(h.coordinator.interrupt("guest_speech"), true);
  assert.deepEqual(h.effects.filter(effect => effect.type === "send_cancel").map(effect => effect.responseId), ["resp_progress"]);
  assert.deepEqual(h.effects.filter(effect => effect.type === "clear_audio").map(effect => effect.responseId), ["resp_progress"]);

  h.coordinator.responseDone({ id: "resp_progress", status: "cancelled", output: audioOutput });
  assert.equal(h.coordinator.hasLease(), true, "cancel acknowledgement alone cannot release buffered audio");
  h.coordinator.audioCleared("resp_progress");
  assert.equal(h.coordinator.hasLease(), false);
});

test("a provisional cough ducks and restores without cancelling or dropping work", () => {
  const h = harness();
  h.coordinator.request("turn", {});
  h.bindLatest("resp_turn");
  h.coordinator.request("tool_progress", { conversation: "none" });
  h.coordinator.request("tool_final", {});
  h.coordinator.speechStarted("cough_1");
  h.coordinator.restoreSpeech("cough_1", "empty_transcript");
  assert.equal(h.effects.filter(effect => effect.type === "duck_audio").length, 1);
  assert.equal(h.effects.filter(effect => effect.type === "restore_audio").length, 1);
  assert.equal(h.effects.filter(effect => effect.type === "send_cancel").length, 0);
  assert.equal(h.effects.filter(effect => effect.type === "clear_audio").length, 0);
  assert.equal(h.effects.filter(effect => effect.type === "dropped").length, 0);
  assert.equal(h.coordinator.hasLease(), true);
});

test("cancellation before response.created is applied once the response ID is known", () => {
  const h = harness();
  h.coordinator.request("opening", {});
  h.coordinator.interrupt("opening_timeout");
  assert.equal(h.effects.some(effect => effect.type === "send_cancel"), false);
  h.bindLatest("resp_opening", { startAudio: false });
  assert.deepEqual(h.effects.filter(effect => effect.type === "send_cancel").map(effect => effect.responseId), ["resp_opening"]);
  assert.deepEqual(h.effects.filter(effect => effect.type === "clear_audio").map(effect => effect.responseId), ["resp_opening"]);
});

test("mismatched playback events cannot release the active response", () => {
  const h = harness();
  h.coordinator.request("turn", {});
  h.bindLatest("resp_current");
  h.coordinator.responseDone({ id: "resp_current", status: "completed", output: audioOutput });
  assert.equal(h.coordinator.audioStopped("resp_old"), false);
  assert.equal(h.coordinator.hasLease(), true);
  h.coordinator.audioStopped("resp_current");
  assert.equal(h.coordinator.hasLease(), false);
});

test("old-epoch response events are ignored after a new call starts", () => {
  const h = harness(10);
  h.coordinator.request("turn", {});
  const oldMetadata = h.sent()[0].job.response.metadata;
  h.coordinator.end();
  h.coordinator.start(12);
  h.coordinator.responseCreated({ id: "resp_old", metadata: oldMetadata });
  assert.equal(h.coordinator.hasLease(), false);
  assert.equal(h.effects.some(effect => effect.type === "stale" && effect.responseId === "resp_old"), true);
});

test("duplicate terminal events remain idempotent", () => {
  const h = harness();
  h.coordinator.request("turn", {});
  h.bindLatest("resp_turn");
  h.coordinator.responseDone({ id: "resp_turn", status: "completed", output: audioOutput });
  h.coordinator.audioStopped("resp_turn");
  const releases = () => h.effects.filter(effect => effect.type === "released").length;
  assert.equal(releases(), 1);
  h.coordinator.responseDone({ id: "resp_turn", status: "completed", output: audioOutput });
  h.coordinator.audioStopped("resp_turn");
  assert.equal(releases(), 1);
});

test("a response proven to contain no audio releases without a playback event", () => {
  const h = harness();
  h.coordinator.request("turn", {});
  h.bindLatest("resp_tool_only", { startAudio: false });
  h.coordinator.responseDone({ id: "resp_tool_only", status: "completed", output: [{ type: "function_call" }] });
  assert.equal(h.coordinator.hasLease(), false);
});

test("response binding requires exact Destiny metadata", () => {
  const h = harness();
  h.coordinator.request("turn", {});
  assert.equal(h.coordinator.responseCreated({ id: "resp_unowned", metadata: {} }), false);
  assert.equal(h.coordinator.activeLease().responseId, null);
  assert.equal(h.effects.some(effect => effect.type === "contain_unowned" && effect.responseId === "resp_unowned"), true);
});

test("an unsolicited clear cannot release the active lease", () => {
  const h = harness();
  h.coordinator.request("turn", {});
  h.bindLatest("resp_turn");
  h.coordinator.responseDone({ id: "resp_turn", status: "completed", output: audioOutput });
  assert.equal(h.coordinator.audioCleared("resp_turn"), false);
  assert.equal(h.coordinator.hasLease(), true);
});

test("release effects can request another response without reentrant lease corruption", () => {
  const effects = [];
  let coordinator;
  coordinator = new VoiceResponseCoordinator({ emit: effect => {
    effects.push(effect);
    if (effect.type === "released") coordinator.request("followup", {});
  } });
  coordinator.start(1);
  coordinator.request("turn", {});
  const first = effects.find(effect => effect.type === "send_response");
  coordinator.responseCreated({ id: "resp_turn", metadata: first.job.response.metadata });
  coordinator.audioStarted("resp_turn");
  coordinator.responseDone({ id: "resp_turn", status: "completed", output: audioOutput });
  coordinator.audioStopped("resp_turn");
  const sent = effects.filter(effect => effect.type === "send_response");
  assert.equal(sent.length, 2);
  assert.equal(coordinator.activeLease().kind, "followup");
});

test("confirmed stop cancels speech but preserves queued task output", () => {
  const h = harness();
  h.coordinator.request("turn", {});
  h.bindLatest("resp_turn");
  h.coordinator.request("tool_final", {}, { taskId: "weather" });
  h.coordinator.speechStarted("stop_1");
  h.coordinator.confirmInterruption("stop_1", "interrupt_only", { dropQueued: false });
  assert.equal(h.effects.filter(effect => effect.type === "dropped").length, 0);
  h.coordinator.responseDone({ id: "resp_turn", status: "cancelled", output: audioOutput });
  h.coordinator.audioCleared("resp_turn");
  assert.equal(h.sent().at(-1).job.kind, "tool_final");
});
