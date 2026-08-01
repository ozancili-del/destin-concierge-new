import test from "node:test";
import assert from "node:assert/strict";
import { makeMockServices, runScript, textResponse } from "./test-helpers.mjs";

async function runAlertCase(latestUser) {
  const services = makeMockServices();
  const { result } = await runScript({
    services,
    latestUser,
    responses: [textResponse("Thanks for letting me know. Ozan has been alerted.")],
  });
  return { result, services };
}

test("owner policy alerts on accidental property damage", async () => {
  const { result, services } = await runAlertCase("I accidentally broke a plate");
  assert.equal(services.calls.sendEmergencyDiscord.length, 1);
  assert.equal(result.state.flags.accidentalDamage, true);
  assert.equal(result.state.flags.alertSent, true);
  assert.equal(result.state.mode, "maintenance");
});

test("owner policy alerts on an external disturbance", async () => {
  const { result, services } = await runAlertCase("There is loud construction noise outside");
  assert.equal(services.calls.sendEmergencyDiscord.length, 1);
  assert.equal(result.state.flags.externalDisturbance, true);
  assert.equal(result.state.flags.alertSent, true);
  assert.equal(result.state.mode, "maintenance");
});
