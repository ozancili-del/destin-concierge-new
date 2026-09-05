// Synthetic storage smoke test: no microphone, no private conversation audio.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const configFile = path.resolve("outputs/voice-tests/cloud/laptop-config.json");
const config = JSON.parse(fs.readFileSync(configFile));
if (process.argv[2]) {
  const endpoint = new URL(process.argv[2]);
  if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".vercel.app")) throw new Error("Invalid endpoint");
  config.endpoint = endpoint.href;
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), { mode: 0o600 });
}
const endpoint = config.endpoint;
const anonymous = await fetch(`${endpoint}?op=list`);
if (anonymous.status !== 401) throw new Error(`Anonymous read not denied (${anonymous.status})`);
const login = await fetch(`${endpoint}?op=login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: config.uploadSecret }) });
if (!login.ok) throw new Error(`Login failed (${login.status})`);
const cookie = login.headers.get("set-cookie").split(";")[0];
const readAsWriter = await fetch(`${endpoint}?op=list`, { headers: { Cookie: cookie } });
if (readAsWriter.ok) throw new Error("Upload code must not list private recordings");
const id = crypto.randomBytes(16).toString("hex");
const wav = fs.readFileSync("outputs/voice-tests/baseline/amenities.wav");
async function put(file, bytes) {
  const result = await fetch(`${endpoint}?id=${id}&file=${file}`, { method: "PUT", headers: { Cookie: cookie }, body: bytes });
  if (!result.ok) throw new Error(`Upload failed (${result.status})`);
}
await put("guest-00000.bin", wav);
await put("guest-00000.bin", wav); // idempotent retry
await put("snapshot.json", JSON.stringify({ schemaVersion: 1, callId: `synthetic-storage-${id}`, finalized: true, updatedAt: new Date().toISOString(), events: [], tracks: [{ label: "guest", mime: "audio/wav", chunks: 1 }] }));
const returned = await fetch(`${endpoint}?id=${id}&file=guest-00000.bin`, { headers: { Authorization: `Bearer ${config.downloadSecret}` } });
if (!returned.ok || !Buffer.from(await returned.arrayBuffer()).equals(wav)) throw new Error("Audio byte verification failed");
console.log(`Cloud smoke test passed: anonymous denied, uploader cannot read, retry safe, downloaded audio bytes match. Synthetic recording ${id}.`);
