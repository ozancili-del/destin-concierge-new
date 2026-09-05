# Voice recording and baseline tests

This is an instrumentation release, not a turn-taking fix. The model, client VAD,
classifier, coordinator, tool routing and playback controller are unchanged.

## Recording a real call

Use the stable private recording preview URL. Unlock cloud saving once per device
with the upload-only code. Obtain participants' permission,
then press **Start recorded test call**. That one button connects and records;
no checkbox or second call-button press is needed. The phone icon remains an
unrecorded-call option. If recording is unsupported, the recorded call does not start.
Audio chunks are saved to IndexedDB and uploaded during the recording through
`/api/voice-recordings` to the separate private Supabase bucket
`destiny-private-voice-tests`. Server-side AES-GCM encryption additionally protects
stored bytes; the download key remains server-side and on the owner's laptop.
The phone receives an upload-only, HTTP-only, seven-day cookie. The service-role
key never reaches the browser. Normal OpenAI processing and Sheet logging continue.

The laptop downloader (`scripts/sync-voice-recordings.mjs`) retrieves and assembles
recordings into `outputs/voice-tests/inbox/`. A recurring Codex task runs it while
the host is available. Nothing connects directly from the phone to the laptop.
The laptop must be awake and Codex available; otherwise the private store buffers
recordings until the next successful run. A manual ZIP button remains available.

Pending chunks retry when the SAME origin is reopened. Mobile OS shutdown,
private browsing, quota exhaustion or clearing site data can still lose unsynced
audio, especially the final seconds. Browser storage is best effort, not a backup
guarantee. Uploaded chunks survive closing the tab. Incomplete calls are recovered
from their latest checkpoint after five minutes without updates. Supabase copies
older than seven days are purged by the downloader only after it verifies a local
archive exists; retention can be longer while the laptop is offline. Local archives
are never automatically deleted. Usage is private-lab only, not public production.

Recording is limited to 3 minutes or approximately 16 MB. Hitting a limit saves
and stops ONLY the recorder; the conversation continues. Files include guest audio, received Destiny audio, `run.json`,
`events.json`, and an observational `report.json`. MIME/container is selected by
browser support (WebM/Opus or MP4). Start offsets share the call's monotonic clock.

**Important:** received audio is before local ducking/volume and does not prove what
the listener heard. The event log supplies duck/restore/clear timings. For physical
speaker verification use a separate consented device recording. No mixed file is
presented as an exact reproduction of the phone speaker. Muting the microphone
also mutes that guest recording track. Partial/failed recordings are marked.

## Automated baseline caller

Run from this checkout in Windows PowerShell:

```powershell
./scripts/create-voice-test-fixtures.ps1
```

This uses installed Windows speech synthesis, not a paid TTS service.
If an agent sandbox cannot access installed Windows voices, run the script in a
normal PowerShell session; do not install or purchase another voice service.
In the lab
select `suite.json` and the generated audio files together, then **Run & record
audio suite**. The suite injects audio through the same analyser, client gate,
WebRTC connection, transcription, coordinator and tools as a normal call. The real
microphone is not opened. Live API/tool usage is billable. Each click runs one call,
at most 2 minutes, with no automatic reruns. Keep the tab foregrounded.

The supplied suite asks about amenities, interrupts the answer, and asks about
November weather. Event triggers are future events only, consumed once per step;
an absent trigger is an inconclusive timeout, not a passing test. Each file must
be <=5 MB and <=20 seconds; a suite supports 1–12 steps. The final step leaves
20 seconds for an answer. A slow answer can therefore be incomplete; consult the
ending reason before evaluating it.

For cough/noise tests, use an actual consented recorded cough/noise clip. Do not
substitute a tone and claim cough robustness. A separate suite can send an amenities
question, then `cough.wav` on `audio_playback_started` after 1200 ms. Likewise test
Turkish-accented English using real fixture recordings. Repeat identical fixtures
against two builds and compare the ZIPs and build IDs. No fixture files go in git.

## Acceptance checks / next work

- Quiet question: response event latency plus audio review for completed answer.
- Cough/noise during output: no hang-up, inspect clear/duck/restoration and continuity.
- Directed interruption: old answer stops, new question is answered, no quiet talking-over.
- Short replies (two / yes / 707), hesitation and language consistency.
- Slow lookup with interruption: pending task is not lost or duplicated.
- Phone speaker/headset check: native autoplay, echo, volume and acoustics are NOT
  covered by digital fixture injection.

Reports deliberately say `REQUIRES_AUDIO_REVIEW`: a next playback event can be a
progress announcement, not the answer. No LLM audio grader or autonomous semantic
judgment is implemented yet. Establish this baseline before tuning VAD or migrating
to an SDK. Remaining product items include stable local knowledge, unsupported
booking-lookup promises, private access/cost controls, and links-only guest UI.
