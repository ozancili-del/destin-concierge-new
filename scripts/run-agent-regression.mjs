#!/usr/bin/env node
// scripts/run-agent-regression.mjs

const baseUrl =
  process.env.REGRESSION_RUNNER_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://app.destincondogetaways.com";

const secret = process.env.REGRESSION_SECRET;
if (!secret) {
  console.error("Missing REGRESSION_SECRET.");
  process.exit(1);
}

const args = process.argv.slice(2);
const body = {
  writeToSheet: !args.includes("--dry-run"),
  includeDangerous: args.includes("--include-dangerous"),
};

const limitArg = args.find(arg => arg.startsWith("--limit="));
if (limitArg) body.limit = Number(limitArg.split("=")[1]);

const testsArg = args.find(arg => arg.startsWith("--tests="));
if (testsArg) body.testIds = testsArg.split("=")[1].split(",").map(v => v.trim()).filter(Boolean);

const conversationsArg = args.find(arg => arg.startsWith("--conversations="));
if (conversationsArg) {
  body.conversations = conversationsArg.split("=")[1].split(",").map(v => v.trim()).filter(Boolean);
}

console.log(`Running Destiny Blue regression suite at ${baseUrl}...`);

const response = await fetch(`${baseUrl}/api/run-agent-regression`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-regression-secret": secret,
  },
  body: JSON.stringify(body),
});

const text = await response.text();
let data;
try {
  data = JSON.parse(text);
} catch (_) {
  console.error(`Non-JSON response (${response.status}):\n${text}`);
  process.exit(1);
}

if (!response.ok || !data.ok) {
  console.error(data);
  process.exit(1);
}

console.log("\nRegression complete");
console.table({
  Total: data.summary.total,
  Pass: data.summary.pass,
  Partial: data.summary.partial,
  Fail: data.summary.fail,
  "Average score": data.summary.averageScore,
  "Duration (sec)": data.durationSeconds,
});
console.log(`Run ID: ${data.runId}`);
console.log(`Sheet updated: ${data.wroteToSheet ? "yes" : "no"}`);

if (data.summary.fail > 0) process.exitCode = 2;
