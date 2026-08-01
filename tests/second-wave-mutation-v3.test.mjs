import test from "node:test";
import assert from "node:assert/strict";
import {
  collectAllowedUrls,
  createDefaultState,
  validateReply,
} from "../lib/destiny-agent/business.js";
import { makeMockServices, runScript, textResponse, toolResponse } from "./test-helpers.mjs";

function check(reply, { toolResults = [], state = createDefaultState(), latestUser = "" } = {}) {
  return validateReply({
    reply,
    allowedUrls: collectAllowedUrls(toolResults, state, { includeStateVerified: false }),
    toolResults,
    state,
    latestUser,
    requireCurrentTurnUrls: true,
  });
}

const blueSeparators = ["", " ", "-", ".", "_", "/", "\\", " · ", "\u200b"];
const blueContexts = [
  value => `Use code ${value}.`,
  value => `Coupon: ${value}`,
  value => `Your promo is ${value}.`,
  value => `Enter ${value} at checkout.`,
  value => `The discount code is ${value}.`,
];
let blueCase = 0;
for (const separator of blueSeparators) {
  const token = ["B", "L", "U", "E"].join(separator);
  for (const context of blueContexts) {
    blueCase += 1;
    test(`mutation BLUE bypass ${blueCase}: ${JSON.stringify(separator)}`, () => {
      const result = check(context(token));
      assert.equal(result.ok, false);
      assert.ok(result.violations.some(v => v.code === "unauthorized_blue_code"));
    });
  }
}

const percentWords = [
  ["one", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5],
  ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["fifteen", 15],
  ["twenty", 20], ["twenty-five", 25], ["thirty", 30], ["forty", 40], ["fifty", 50],
];
for (const [word, value] of percentWords) {
  test(`mutation percentage: unsupported ${word} percent is rejected`, () => {
    const result = check(`I can give you ${word} percent off.`);
    assert.equal(result.ok, false);
    assert.ok(result.violations.some(v => v.code === "unverified_percentage"));
  });
  test(`mutation percentage: unsupported ${word} % is rejected`, () => {
    const result = check(`I can give you ${word} % off.`);
    assert.equal(result.ok, false);
    assert.ok(result.violations.some(v => v.code === "unverified_percentage"));
  });
  if (value !== 10) {
    test(`mutation percentage: unsupported numeric ${value} percent is rejected`, () => {
      const result = check(`I can give you ${value} percent off.`);
      assert.equal(result.ok, false);
      assert.ok(result.violations.some(v => v.code === "unverified_percentage"));
    });
  }
}

test("mutation percentage: ten percent direct discount remains allowed", () => {
  assert.equal(check("The automatic direct-booking discount is ten percent.").ok, true);
});

const hosts = ["evil.com", "phish.net", "fake.org", "payments.io", "ownerrez-login.co", "destincondogetaways.com.evil.com"];
const domainSurfaces = [
  host => host,
  host => `www.${host}`,
  host => `${host}/pay`,
  host => `Book here: ${host}`,
  host => `<${host}>`,
];
let domainCase = 0;
for (const host of hosts) {
  for (const surface of domainSurfaces) {
    domainCase += 1;
    test(`mutation domain ${domainCase}: bare/spoofed domain is rejected`, () => {
      const result = check(surface(host));
      assert.equal(result.ok, false);
      assert.ok(result.violations.some(v => ["unapproved_domain", "bare_domain_not_permitted"].includes(v.code)));
    });
  }
}

test("mutation domain: approved host without exact URL is still rejected", () => {
  const result = check("Visit destincondogetaways.com for details.");
  assert.equal(result.ok, false);
  assert.ok(result.violations.some(v => v.code === "bare_domain_not_permitted"));
});

const unitClaimTemplates = [
  unit => `${unit} is free for those dates.`,
  unit => `Unit ${unit} can accommodate you.`,
  unit => `We have availability in ${unit}.`,
  unit => `You can book Unit ${unit}.`,
  unit => `${unit} has space for your stay.`,
  unit => `We can place you in ${unit}.`,
  unit => `Unit ${unit} is yours for those dates.`,
  unit => `${unit} can take your group.`,
  unit => `There is room in Unit ${unit}.`,
  unit => `Unit ${unit} is good to go for your dates.`,
];
for (const unit of ["707", "1006"]) {
  for (let i = 0; i < unitClaimTemplates.length; i += 1) {
    const phrase = unitClaimTemplates[i](unit);
    test(`mutation availability ${unit}-${i + 1}: unsupported claim is rejected`, () => {
      const result = check(phrase);
      assert.equal(result.ok, false);
      assert.ok(result.violations.some(v => v.code === `unverified_availability_${unit}`));
    });
  }
}

const alertTemplates = [
  "I messaged Ozan.",
  "I passed this along to Ozan.",
  "Ozan got your message.",
  "I forwarded your note to the owner.",
  "The owner is aware now.",
  "I let the host know.",
  "I sent Ozan your note.",
  "I reached the owner.",
  "Your message is with Ozan.",
  "Ozan has been told.",
];
for (let i = 0; i < alertTemplates.length; i += 1) {
  test(`mutation alert ${i + 1}: unsupported delivery claim is rejected`, () => {
    const result = check(alertTemplates[i]);
    assert.equal(result.ok, false);
    assert.ok(result.violations.some(v => v.code === "unverified_alert_claim"));
  });
}

const codeFormats = ["1234", "12-34", "12 34", "1 2 3 4", "1-2-3-4", "1.2.3.4", "1/2/3/4", "123456", "123456#", "12_34"];
const codeTemplates = [
  code => `Door code: ${code}`,
  code => `Your entry PIN is ${code}.`,
  code => `Use ${code} at the lock.`,
  code => `Type ${code} into the keypad.`,
];
let codeCase = 0;
for (const code of codeFormats) {
  for (const template of codeTemplates) {
    codeCase += 1;
    test(`mutation door code ${codeCase}: formatted unauthorized code is rejected`, () => {
      const result = check(template(code));
      assert.equal(result.ok, false);
      assert.ok(result.violations.some(v => v.code === "unauthorized_door_code"));
    });
  }
}

for (const count of [9, 12, 16, 24, 40]) {
  test(`mutation tool flood: ${count} duplicate weather calls execute at most once`, async () => {
    const calls = Array.from({ length: count }, (_, i) => ({ name: "get_destin_weather", args: {}, id: `w_${count}_${i}` }));
    const services = makeMockServices();
    const response = {
      output_text: "",
      output: calls.map(call => ({ type: "function_call", id: `fc_${call.id}`, call_id: call.id, name: call.name, arguments: "{}" })),
    };
    const { result } = await runScript({ services, latestUser: "Weather", responses: [response, textResponse("I checked the forecast once.")] });
    assert.equal(services.calls.fetchDestinWeather.length, 1);
    assert.ok(result.debug.toolCalls.length <= 8);
    assert.equal(result.toolResults.length, count);
  });
}

for (const action of ["capture_lead", "relay_owner_message", "request_owner_chat"]) {
  test(`mutation side effect: repeated ${action} calls are suppressed`, async () => {
    const services = makeMockServices();
    const args = action === "capture_lead" ? { email: "test@example.com", first_name: "Test" }
      : action === "relay_owner_message" ? { message_summary: "Arriving late" }
      : {};
    const latestUser = action === "capture_lead" ? "test@example.com"
      : action === "relay_owner_message" ? "Please tell Ozan we are arriving late"
      : "Can I speak to Ozan?";
    const output = [0, 1, 2, 3].map(i => ({ type: "function_call", id: `fc_${i}`, call_id: `call_${i}`, name: action, arguments: JSON.stringify(args) }));
    const { result } = await runScript({
      services,
      latestUser,
      pageSource: action === "capture_lead" ? "popup" : null,
      responses: [{ output, output_text: "" }, textResponse(action === "capture_lead" ? "Code BLUE is authorized for the verified extra 5% discount." : "The request was sent once.")],
    });
    assert.equal(result.toolResults.filter(r => r.status === "duplicate_suppressed").length, 3);
    if (action === "capture_lead") assert.equal(services.calls.addBrevoContact.length, 1);
    if (action === "relay_owner_message") assert.equal(services.calls.sendEmergencyDiscord.length, 1);
    if (action === "request_owner_chat") assert.equal(services.calls.sendOwnerChatInvite.length, 1);
  });
}
