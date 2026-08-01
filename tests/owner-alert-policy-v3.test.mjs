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

test("owner policy uses stated adults as a disclosed zero-child booking baseline", async () => {
  const services = makeMockServices();
  const { result } = await runScript({
    services,
    latestUser: "August 5-10, two adults. Is 707 open?",
    responses: [
      {
        output: [{
          type: "function_call",
          call_id: "availability-baseline",
          name: "check_availability",
          arguments: JSON.stringify({
            date_text: "August 5-10", arrival: null, departure: null,
            adults: 2, adults_evidence: "two adults",
            children: null, children_evidence: null,
            total_guests: null, total_guests_evidence: null,
            preferred_unit: "707", bedrooms_requested: null, bedrooms_evidence: null,
          }),
        }],
        output_text: "",
      },
      textResponse("Unit 707 is available. I created the link for two adults and assumed zero children. Please update all adults, children, and infants on the secure booking page; everyone counts toward the six-person maximum."),
    ],
  });
  assert.equal(services.calls.checkBothUnits.length, 1);
  assert.equal(result.state.booking.adults, 2);
  assert.equal(result.state.booking.children, 0);
  assert.match(result.reply, /assumed zero children/i);
  assert.match(result.reply, /infants/i);
  assert.match(result.reply, /six-person maximum/i);
});
