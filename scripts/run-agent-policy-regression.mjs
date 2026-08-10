import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const approvedDivergences = new Set([
  "admin snapshot structured failure surfaces its reason",
  "preferred-unit-only change does not invalidate date availability",
  "persisted verification fails closed: invalid timestamp",
  "persisted verification fails closed: future timestamp",
  "persisted verification fails closed: missing query",
  "persisted verification fails closed: malicious hostname",
  "persisted verification fails closed: mismatched arrival",
  "persisted verification fails closed: link for unavailable unit",
  "persisted verification fails closed: non-numeric party query",
  "persisted verification fails closed: mixed valid and malicious links",
  "valid persisted booking verification can be resent",
  "read-only tools may still run in separate reasoning rounds",
  'availability matrix {"707":true,"1006":null}',
  "resend booking links rejects stale verification",
  "resend booking links returns current verified links",
  "maintenance issue is deduplicated across state",
  "accidental guest damage does not auto-alert",
  "external noise does not auto-alert as unit maintenance",
  "maintenance alert suppresses accidental guest damage",
  "maintenance alert suppresses external disturbance",
  "availability missing children fails without network call",
]);

const testFiles = readdirSync("tests")
  .filter(name => name.endsWith(".test.mjs"))
  .sort()
  .map(name => `tests/${name}`);

const result = spawnSync(process.execPath, [
  "--experimental-default-type=module",
  "--test",
  ...testFiles,
], { encoding: "utf8" });

const output = `${result.stdout || ""}${result.stderr || ""}`;
process.stdout.write(output);
const observedFailures = new Set(
  [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map(match => match[1].trim()),
);
const unexpected = [...observedFailures].filter(name => !approvedDivergences.has(name));
const staleApprovals = [...approvedDivergences].filter(name => !observedFailures.has(name));

console.log("\nOwner-policy regression summary:");
console.log(`  Historical tests executed: ${output.match(/^# tests (\d+)$/m)?.[1] || "unknown"}`);
console.log(`  Approved baseline divergences observed: ${observedFailures.size - unexpected.length}/${approvedDivergences.size}`);
console.log(`  Unexpected failures: ${unexpected.length}`);

if (unexpected.length) console.error(`Unexpected failures:\n- ${unexpected.join("\n- ")}`);
if (staleApprovals.length) console.error(`Approved divergences no longer failing; review and remove from manifest:\n- ${staleApprovals.join("\n- ")}`);

if (unexpected.length || staleApprovals.length) process.exitCode = 1;
else console.log("  Result: PASS (zero unexpected offline failures)");
