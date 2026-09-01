# Destiny Open Issues

## Current-booking access claim

- **Status:** Open; investigation required. Do not change production behavior yet.
- **Observed:** During conversation testing, Destiny confidently said she could access an existing booking, asked the guest for their name and email address, and then told the guest to open the existing-booking link "for security purposes" so Destiny could access or confirm the reservation. This created the appearance that clicking a link grants Destiny permission or completes verification even though no server-verified booking context had been established.
- **Problem:** That capability must not be implied unless the guest has been securely identified and the booking lookup has been successfully verified by the server.
- **Next work:** Reproduce the exact conversation, trace whether the claim comes from the Realtime prompt, shared chat prompt, or existing-booking tool description, then design the authorization and wording boundaries before modifying code.
- **Required behavior:** For an unidentified guest, Destiny should explain that she cannot access a current reservation from the conversation alone and should offer the approved verification/contact path. She may describe or use booking details only after a server-verified booking context exists.
- **Privacy boundary:** Destiny must not solicit a name or email address as though those fields alone authorize or unlock a booking lookup. Any identity data requested must correspond to an implemented, server-side verification mechanism and have a clear purpose.
- **Link boundary:** Destiny must not claim that an existing-booking link has been opened, verified, or connected unless the application actually provided and validated that signed link. If the guest does not have a valid link, Destiny should direct them to the approved recovery or owner-contact path without implying access.
- **Authorization boundary:** Clicking or opening a link in the guest's browser does not itself grant Destiny access. Only a request that reaches Destiny with a valid, server-validated booking token/context may unlock booking-specific assistance; Destiny must never describe the click as authorization or a security handshake.
- **Regression coverage needed:** Written chat and voice tests for unidentified guests, failed verification, valid verified booking context, and attempts to persuade Destiny to invent or expose reservation details.

### Reproduction evidence — 2026-08-31

Session `wb_62golc6b5v5` reproduced the problem in three turns:

1. The guest supplied dates and Unit 707. Destiny said existing-booking retrieval required a confirmation number, booking email, or opening a booking link.
2. The guest supplied confirmation number `ORB19025587`. Destiny said it could pull the reservation after receiving the booking email or after the guest opened the booking link.
3. The guest supplied a booking email (redacted here). The server correctly returned `No booking link was supplied to the server.` Destiny nevertheless proposed that the guest open or paste the link and falsely explained that doing so would give the system permission to read the reservation.

This establishes two separate unsupported claims:

- **Unsupported lookup claim:** Destiny implies that confirmation number plus email is an implemented lookup/authorization path. It is not.
- **Unsupported permission claim:** Destiny implies that opening or pasting a booking link grants permission. A browser click or pasted URL is not authorization; only server validation of the expected signed booking context can authorize booking-specific tools.

The server-side booking guard appears to have failed closed correctly. The defect is in the assistant's interpretation and recovery wording after the denied tool call, plus any prompt/tool descriptions that advertise lookup methods the server does not support.

## Generic activities request takes the full slow path

- **Status:** Open; routing/response design required. Do not change production behavior yet.
- **Observed:** On 2026-08-31, session `wb_4yujgfck5lk` asked, “I'm trying to find some activities in Destin.” The answer took roughly 20 seconds.
- **Response behavior:** Destiny returned a long catalog containing individual TripShock affiliate links for dolphin cruises, fishing, jet skis, parasailing, paddling, sunset cruises, and boat tours, followed by a local guide link and a request for dates/group/preferences.
- **Diagnosis:** The generic discovery request did not match the shared deterministic fast router, so it entered the full agent/tool workflow. No dates, live prices, schedules, or current availability were requested, so a live/tool-heavy path was unnecessary for the first turn.
- **Desired first turn:** Give a brief curated overview of activity categories from code-owned facts, then ask one useful narrowing question (dates, group composition, or preferred activity style). Do not dump every affiliate link immediately.
- **Escalation boundary:** Use the live activity tool only after the guest supplies dates or explicitly requests current schedules, prices, availability, or bookable options.
- **Potential implementation:** Add a conservative `activity_discovery` specialist route shared by chat and voice. It should return a short deterministic answer and one approved general activities/guide link; retain the full agent for dated or live requests.
- **Regression coverage needed:** Generic activities routes fast; dated activities, “available today,” price/schedule questions, and follow-up personalization remain on verified live/full-agent paths.

## Voice tool calls create abandonment-risk silence

- **Status:** Open; voice interaction design required. Do not change production behavior yet.
- **Observed:** A roughly 20-second activity lookup is tolerable as backend work, but the Realtime conversation provides prolonged silence while waiting. A guest may assume the call froze and close it.
- **Core distinction:** This is not only a latency problem. Long verified operations will sometimes remain necessary; the voice experience must communicate progress without inventing results.
- **Desired behavior:** Before a potentially slow tool call, Destiny should immediately give a short audible acknowledgement such as, “Absolutely—let me narrow down a few good options.” If the operation remains slow beyond a defined threshold, Destiny should provide one brief audible check-in while the tool continues. The UI may also show a checking state, but visual feedback is secondary because the guest may not be looking at the phone. Destiny should then deliver the verified result when ready.
- **Truthfulness boundary:** Progress language may describe the action being performed but must not claim that availability, prices, schedules, or booking data have been found before the tool succeeds.
- **Conversation boundary:** Avoid repeated filler, fake percentages, promises such as “just a few seconds,” and chatter that prevents interruption. Use at most one additional audible check-in unless the operation genuinely changes phase. The guest must remain able to interrupt or cancel.
- **Potential implementation:** Add an immediate pre-tool spoken acknowledgement for slow specialist/full-agent routes, then a single timer-based spoken check-in if the operation crosses the long-wait threshold. Pair this with visual status and cancellation/interruption handling. Keep fast deterministic routes free of unnecessary filler.
- **Regression coverage needed:** Slow success, slow failure, timeout, interruption, and cancellation; confirm acknowledgement plays promptly, no unverified result is spoken, and only one final answer is rendered.

## Mobile activity links lose their individual labels

- **Status:** Open; frontend rendering change required. Do not change production behavior yet.
- **Observed:** On 2026-08-31, session `wb_l6mc105y8l` produced three relevant, weather-aware recommendations: morning dolphin cruise, family pirate cruise, and kayak/paddleboard rental. In the phone UI, all three links appeared as the same generic “Book Activities in Destin” action, so users could not tell which button opened which activity.
- **Confirmed cause:** `public/destiny-head.js` maps every `tripshock.com` URL to one domain-level label: `🐬 Book Activities in Destin`. The renderer ignores the activity category encoded in each TripShock path and the descriptive markdown/link context generated by Destiny.
- **Desired behavior:** Activity buttons must retain a specific human label, for example “View dolphin cruises,” “View pirate cruises,” and “View kayak & paddleboard rentals.” The visible label must be determined from a safe code-owned mapping of approved TripShock path categories, not arbitrary model-supplied HTML.
- **Fallback behavior:** Unknown but approved TripShock paths may continue using the generic “Book Activities in Destin” label.
- **Voice behavior:** Spoken output should name the three activities but should not read URLs aloud. The written transcript should contain the individually labeled buttons.
- **Regression coverage needed:** Multiple TripShock categories in one reply render distinct labels on desktop and mobile; links retain dates and affiliate parameters; unknown approved paths use the generic fallback; unsafe domains never become action buttons.

## Over-helpful accommodation follow-up weakens commercial boundaries

- **Status:** Open; conversation policy and state-grounding changes required. Do not change production behavior yet.
- **Observed:** Mobile screenshots show one continuous voice conversation in which the guest explicitly said “Three adults,” then requested nearby accommodations and vacation-rental pages. Destiny correctly retained the three-adult party size. It then asked whether the guest wanted external hotels, vacation rentals, or budget options. After “Vacation rental. Propose me some web pages,” Destiny supplied both unit pages plus a large list of loosely related company pages and again offered external listing pages.
- **Commercial-boundary defect:** Destiny should help guests evaluate and book the two managed Pelican Beach condos. It should not volunteer competitor/external accommodation searches. If neither managed condo fits, it may honestly explain the limitation and offer owner contact or approved Destin planning help, but it must not act as a general lodging broker unless that business policy is explicitly changed.
- **Helpfulness/verbosity defect:** For “vacation rental pages,” the useful answer is the two managed unit pages and, optionally, one availability/compare action. Virtual tour, reviews, beach cam, weather, and trip-planner links are unrelated clutter in that turn.
- **Desired response pattern:** Briefly confirm the guest is asking about vacation rentals; present Unit 707 and Unit 1006 with meaningful labels; offer one next step to compare them or check dates. Preserve the stated three-adult party context.
- **Regression coverage needed:** Cross-turn party memory preserves the supplied composition; accommodation requests prefer managed inventory; external lodging is not volunteered; link count and relevance remain bounded; voice response is concise and does not read URLs.

### Confirmed Realtime transcript persistence gap

Code inspection confirms a separate and more direct cause for voice turns being totally absent from the server transcript:

- `saveVoiceMessage()` in `public/destiny-head.js` writes Realtime user and assistant transcripts only into the in-browser `history`, `sessionStorage`, and `localStorage`.
- A Realtime turn reaches `/api/destiny-chat` and the Sheets logger only when the model invokes `ask_destiny_brain` (or another backend tool path).
- A question the Realtime model answers directly may appear normally in the phone chat but is never posted to the server and therefore never appears in the logged transcript.

This creates a split record: tool-using voice turns are logged, while direct voice turns can be completely missing. It also means later backend tool calls receive browser history, but operational review in Sheets does not show the full conversation that led to them.

Required future behavior:

- Persist every completed Realtime user transcript and final assistant transcript to a dedicated server endpoint under the current `sessionId`, regardless of tool usage.
- Use stable turn/event IDs and idempotency so reconnects or duplicate Realtime events cannot create duplicate log rows.
- Preserve ordering when a tool call produces both a written result and a final spoken summary; do not log the same assistant turn twice.
- Treat browser storage as UI continuity/cache, not the authoritative transcript record.
- Test direct answer, tool answer, interrupted answer, reconnect, duplicate event, and failed logging paths.

## Voice and written chat do not have behavioral parity

- **Status:** Confirmed architectural regression risk. Do not change production behavior until a unified design and parity tests are ready.
- **Evidence:** Written chat and voice do not use one brain with two input/output modes.
- **Realtime layer:** `pages/api/destiny-realtime.js` uses `gpt-realtime-1.5` with a short voice-specific prompt. It may answer casual turns directly and independently decides when to call tools.
- **Voice tool layer:** When Realtime invokes `ask_destiny_brain`, `/api/destiny-chat` runs the agent with `DESTINY_VOICE_AGENT_MODEL` or the default `gpt-5-mini`.
- **Written chat layer:** The same endpoint runs written chat with `DESTINY_AGENT_MODEL` or the default `gpt-5.6-sol`.
- **Consequence:** Voice can behave differently from the previously tested written chat because it has a separate prompt, separate tool-selection decision, and a smaller composition model. The screenshots show voice volunteering competitor accommodation categories, producing an overlong link dump, and emitting a spoken “let me check” turn before the backend answer.
- **Required direction:** Voice should be an interface over the same policy, state, verified tools, and commercial guardrails as written chat. Differences should be limited to concise spoken formatting, interruption, and audio UX—not business behavior or factual authority.
- **Design requirement:** Define one shared policy/router/state layer, with deterministic guardrails before either model. Realtime may handle greetings and speech turn-taking, but substantive requests should enter the same authoritative workflow. If a faster model is retained for voice composition, it must pass the same parity suite and output guards as written chat.
- **Regression coverage needed:** Run identical transcripts through chat and voice adapters and compare intent, tools, state updates, allowed destinations, party details, booking claims, and core answer content. Permit only presentation differences such as shorter spoken wording and omission of spoken URLs.

### Transcription-bias prompt leaked as a guest message

Mobile screenshot evidence shows a blue guest bubble containing: `Destiny, Destin, Pelican Beach Resort, condo, Unit 707, Unit 1006, Ozan`.

That text exactly matches the `gpt-4o-mini-transcribe` prompt configured in `pages/api/destiny-realtime.js`. It is intended only to bias recognition toward business names, but the transcription result was accepted and rendered/persisted as though the guest spoke it.

This is a confirmed voice regression and can contaminate conversation history, routing, and later model answers.

Required future safeguards:

- Do not use a phrase-list prompt that can be returned verbatim as a valid utterance, or replace it with a safer recognition strategy.
- Reject a completed transcript that exactly or near-exactly matches the internal transcription prompt when the audio evidence is empty/low-confidence.
- Do not render or persist low-confidence prompt-echo transcripts as user messages.
- Test silence, background noise, short utterances, business-name utterances, and exact prompt-echo output.
