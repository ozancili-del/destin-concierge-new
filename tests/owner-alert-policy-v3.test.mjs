import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultState } from "../lib/destiny-agent/business.js";
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

test("model-authored plan makes the agent execute a forgotten compound-request task", async () => {
  const services = makeMockServices();
  const { result } = await runScript({
    services,
    latestUser: "What is the weather, and can you find a dolphin cruise?",
    responses: [
      { output: [
        { type: "function_call", call_id: "request-plan", name: "set_request_plan", arguments: JSON.stringify({ tasks: [
          { id: "forecast", outcome: "Answer the guest's weather question", required_tool: "get_destin_weather" },
          { id: "cruise", outcome: "Provide dolphin-cruise browsing options", required_tool: "get_activity_options" },
        ] }) },
        { type: "function_call", call_id: "weather-first", name: "get_destin_weather", arguments: "{}" },
      ], output_text: "" },
      textResponse("The forecast is partly cloudy."),
      { output: [{ type: "function_call", call_id: "activity-after-guard", name: "get_activity_options", arguments: JSON.stringify({ category: "dolphin", start_date: null, end_date: null }) }], output_text: "" },
      textResponse("The forecast is partly cloudy, and here is the dolphin-cruise browsing link."),
    ],
  });
  assert.equal(services.calls.fetchDestinWeather.length, 1);
  assert.equal(result.debug.toolCalls.filter(call => call.name === "get_activity_options").length, 1);
  assert.deepEqual(result.debug.completion.requested, ["forecast", "cruise"]);
  assert.deepEqual(result.debug.completion.attempted, ["forecast", "cruise"]);
  assert.equal(result.debug.completion.reprompts, 1);
});

test("explicit traveling party overrides children mentioned only in small talk", async () => {
  const services = makeMockServices();
  const { result } = await runScript({
    services,
    latestUser: "My sister has 2 kids but she isn't coming. It will just be me and my husband August 5-10.",
    responses: [
      { output: [{
        type: "function_call",
        call_id: "small-talk-party",
        name: "check_availability",
        arguments: JSON.stringify({
          date_text: "August 5-10", arrival: null, departure: null,
          adults: 2, adults_evidence: "me and my husband",
          children: 2, children_evidence: "2 kids",
          total_guests: null, total_guests_evidence: null,
          preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null,
        }),
      }], output_text: "" },
      textResponse("I checked August 5–10 for the actual traveling party: two adults and zero children. The booking link uses that baseline; update it if the traveling party changes."),
    ],
  });
  assert.equal(services.calls.checkBothUnits.length, 1);
  assert.equal(result.state.booking.adults, 2);
  assert.equal(result.state.booking.children, 0);
  assert.match(result.reply, /two adults and zero children/i);
});

test("itinerary requests go straight to the dedicated planner", async () => {
  const { result, openai } = await runScript({
    latestUser: "Build me a three-day Destin itinerary.",
    responses: [],
  });
  assert.equal(openai.calls.length, 0);
  assert.equal(result.debug.safetyIntercept, "itinerary_planner");
  assert.match(result.reply, /destin-vacation-itinerary-planner-574049367/);
  assert.doesNotMatch(result.reply, /Day 1|morning:|afternoon:/i);
});

test("beach photographer requests go to TripShock without contact or booking promises", async () => {
  const { result, openai } = await runScript({
    latestUser: "Find a beach photographer for family pictures.",
    responses: [],
  });
  assert.equal(openai.calls.length, 0);
  assert.equal(result.debug.safetyIntercept, "tripshock_photographer");
  assert.match(result.reply, /tripshock\.com.*beach-photographers/i);
  assert.doesNotMatch(result.reply, /I can contact|I can book|appointment|checked availability/i);
});

test("stay one more day extends checkout and completes fresh availability", async () => {
  const state = createDefaultState();
  state.mode = "booking";
  Object.assign(state.booking, { arrival: "2026-08-05", departure: "2026-08-10", adults: 2, children: 0 });
  const services = makeMockServices();
  const { result } = await runScript({
    state,
    services,
    latestUser: "Stay one more day",
    responses: [
      { output: [
        { type: "function_call", call_id: "extension-plan", name: "set_request_plan", arguments: JSON.stringify({ tasks: [
          { id: "update_checkout", outcome: "Extend checkout by one day", required_tool: "remember_booking_details" },
          { id: "recheck", outcome: "Run fresh availability for the extended stay", required_tool: "check_availability" },
        ] }) },
        { type: "function_call", call_id: "extend-stay", name: "remember_booking_details", arguments: JSON.stringify({ date_text: "Stay one more day", date_role: "range", arrival: null, departure: null, adults: null, adults_evidence: null, children: null, children_evidence: null, total_guests: null, total_guests_evidence: null, preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null }) },
      ], output_text: "" },
      textResponse("I noted the extension."),
      { output: [{ type: "function_call", call_id: "fresh-extension-check", name: "check_availability", arguments: JSON.stringify({ date_text: null, arrival: null, departure: null, adults: null, adults_evidence: null, children: null, children_evidence: null, total_guests: null, total_guests_evidence: null, preferred_unit: null, bedrooms_requested: null, bedrooms_evidence: null }) }], output_text: "" },
      textResponse("I extended checkout to August 11 and ran a fresh availability check for two adults and zero children."),
    ],
  });
  assert.deepEqual(services.calls.checkBothUnits, [{ arrival: "2026-08-05", departure: "2026-08-11" }]);
  assert.equal(result.state.booking.departure, "2026-08-11");
  assert.equal(result.debug.completion.reprompts, 1);
});
