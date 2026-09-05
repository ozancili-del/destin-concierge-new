// Run once by the owner. Never prints credentials or sends them to the browser.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
const env = parseEnv(fs.readFileSync(".env.voice-cloud-bootstrap", "utf8"));
const supabase = createClient(env.GUESTVIEW_SUPABASE_URL || env.NEXT_PUBLIC_GUESTVIEW_SUPABASE_URL, env.GUESTVIEW_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const name = "destiny-private-voice-tests";
const existing = await supabase.storage.getBucket(name);
if (existing.data?.public) throw new Error("Refusing public bucket; owner review required");
if (!existing.data) {
  const created = await supabase.storage.createBucket(name, { public: false, fileSizeLimit: 524288, allowedMimeTypes: ["application/json", "application/octet-stream"] });
  if (created.error) throw new Error(`Private bucket creation failed: ${created.error.message}`);
}
const folder = path.resolve("outputs/voice-tests/cloud");
fs.mkdirSync(folder, { recursive: true });
const file = path.join(folder, "laptop-config.json");
let config;
if (fs.existsSync(file)) config = JSON.parse(fs.readFileSync(file));
else {
  config = { endpoint: "", uploadSecret: crypto.randomBytes(12).toString("base64url"), downloadSecret: crypto.randomBytes(32).toString("base64url"), outputDirectory: path.resolve("outputs/voice-tests/inbox") };
  fs.writeFileSync(file, JSON.stringify(config, null, 2), { flag: "wx", mode: 0o600 });
  fs.writeFileSync(path.join(folder, "phone-recording-access.txt"), `Private voice recording upload code (enter once per device):\n${config.uploadSecret}\nDo not publish this code. It allows recording uploads, not downloads.\n`, { mode: 0o600 });
}
const cli = process.argv[2];
if (!cli) throw new Error("Supply the installed Vercel CLI path");
for (const [key, value] of [["VOICE_RECORDING_UPLOAD_SECRET", config.uploadSecret], ["VOICE_RECORDING_DOWNLOAD_SECRET", config.downloadSecret]]) {
  const result = spawnSync(process.execPath, [cli, "env", "add", key, "preview", "--sensitive", "--force"], { input: value + "\n", encoding: "utf8", timeout: 60000 });
  if (result.status !== 0) throw new Error(`Could not configure ${key}; no secret printed`);
}
console.log("Private bucket and preview credentials configured. Laptop configuration and phone access code are in outputs/voice-tests/cloud.");
