// Owner-only downloader. Run periodically while laptop is online. Credentials stay local.
import fs from "node:fs";
import path from "node:path";
import { makeDiagnosticZip, summarizeVoiceTest } from "../lib/destiny-agent/voice-test-capture.js";
const config = JSON.parse(fs.readFileSync(new URL("../outputs/voice-tests/cloud/laptop-config.json", import.meta.url)));
const endpoint = new URL(config.endpoint);
if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".vercel.app")) throw new Error("Expected the configured HTTPS private Vercel preview");
const root = path.resolve(config.outputDirectory);
fs.mkdirSync(root, { recursive: true });
async function request(query, method = "GET") {
  const url = new URL(endpoint); url.search = new URLSearchParams(query).toString();
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${config.downloadSecret}` }, redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Recording download failed (${response.status})`);
  return response;
}
const { files: sessions } = await (await request({ op: "list" })).json();
let saved = 0;
for (const session of sessions) {
  if (!/^[a-f0-9]{32}$/.test(session.name)) continue;
  const id = session.name;
  const output = path.join(root, `${id}.zip`);
  const marker = `${output}.json`;
  let snapshot;
  try { snapshot = await (await request({ id, file: "snapshot.json" })).json(); } catch { continue; }
  // A closed tab may never finalize. Preserve its latest checkpoint after 5 minutes idle.
  if (!snapshot.finalized && Date.now() - Date.parse(snapshot.updatedAt) < 300000) continue;
  if (fs.existsSync(marker)) {
    const previous = JSON.parse(fs.readFileSync(marker));
    const previousFile = path.join(root, path.basename(previous.file));
    if (previous.updatedAt === snapshot.updatedAt && fs.existsSync(previousFile) && fs.statSync(previousFile).size === previous.bytes) {
      await request({ op: "purge-expired", id }, "POST");
      continue;
    }
  }
  if (!Array.isArray(snapshot.tracks) || snapshot.tracks.length > 2) continue;
  const contents = {}; let total = 0;
  for (const track of snapshot.tracks) {
    if (!["guest", "destiny-received"].includes(track.label) || !Number.isInteger(track.chunks) || track.chunks < 0 || track.chunks > 200) throw new Error("Invalid recording manifest");
    const chunks = [];
    for (let i = 0; i < track.chunks; i++) {
      const bytes = await (await request({ id, file: `${track.label}-${String(i).padStart(5, "0")}.bin` })).arrayBuffer();
      total += bytes.byteLength;
      if (bytes.byteLength > 524288 || total > 24 * 1024 * 1024) throw new Error("Recording size bound exceeded");
      chunks.push(bytes);
    }
    contents[`${track.label}.${track.mime?.includes("mp4") ? "m4a" : track.mime?.includes("wav") ? "wav" : "webm"}`] = new Blob(chunks);
  }
  contents["run.json"] = JSON.stringify({ ...snapshot, events: undefined, recoveredAfterAbruptClose: !snapshot.finalized, limitations: "Received digital audio, not physical speaker output. Unfinalized captures may lack their final audio chunk." }, null, 2);
  contents["events.json"] = JSON.stringify(snapshot.events || [], null, 2);
  contents["report.json"] = JSON.stringify(summarizeVoiceTest(snapshot.events || []), null, 2);
  const bytes = Buffer.from(await (await makeDiagnosticZip(contents)).arrayBuffer());
  // Never replace an earlier recovered version; retain each changed checkpoint.
  const versioned = fs.existsSync(output) ? path.join(root, `${id}-${Date.now()}.zip`) : output;
  fs.writeFileSync(versioned, bytes, { flag: "wx" });
  fs.writeFileSync(marker, JSON.stringify({ updatedAt: snapshot.updatedAt, file: path.basename(versioned), bytes: bytes.length }));
  saved++;
}
console.log(`Voice sync complete: ${saved} new recordings saved to ${root}.`);
