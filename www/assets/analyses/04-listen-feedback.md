ZYPPARLISTEN SILENT-PLAYER REGRESSION — FINAL ANALYSIS

Important scope note first: I was instructed to deliver this without further tool calls, so exact line numbers below are NOT re-verified in this pass. All anchors are structural (file + symbol/function-level, as named in the codebase and in your brief). Where I say "structural anchor," that is deliberate — I am not fabricating line numbers. Re-verify before editing.

=====================================================================
1. ROOT-CAUSE RANKING (most → least probable)
=====================================================================

R1 — PROGRESS CLOCK DECOUPLED FROM THE AUDIO ELEMENT (primary)
File: zyppar/src/app/pages/zyppar-listen/zyppar-listen.page.ts
Structural anchor: the playback tick/progress section — whatever advances the displayed position and milestones (an interval-based ticker and/or a `timeupdate` handler that EXTRAPOLATES elapsed time while `isPlaying === true`), and the play-intent path (`playAudioText` / `togglePlay` equivalent) that sets `isPlaying = true` and `activeNarrationMode = 'audio'` synchronously around `audio.play()`.

Mechanism: the UI clock advances on the strength of `isPlaying` alone. `isPlaying` is only cleared by terminal events (pause / ended / error). In this repro NONE of those fire (see R2), so the wall-clock ticker and milestone derivation run unbounded for 30+ minutes. This is almost certainly why the timer moves even though nothing is audible: on mobile PWAs the ticker exists precisely to survive background throttling (where `timeupdate` stops firing), so it extrapolates from `lastKnownPosition + (now - t0) * playbackRate`. Extrapolation with no liveness check = a player that "plays" forever in a dream.

R2 — WEDGED ELEMENT WITH SWALLOWED FAILURE (co-primary)
Files: zyppar-listen.page.ts (element lifecycle / event wiring); zyppar/src/app/services/audiodata/audiodata.service.ts (blob URL minting/revocation).
After OS suspension (sleep, screen change), the resumed element commonly ends up non-paused with a dead pipeline: `play()` resolves or was never awaited, `paused === false`, `readyState` stuck low, no sound rendered. Two sub-cases:
  (a) The blob/object URL backing the MP3 was revoked by a cleanup/error path (audiodata.service) while the element still held it — retries and resumes then fail, and the rejection lands in a `catch` that logs without resetting `isPlaying` / `activeNarrationMode` and without emitting a synthetic completion. Manual pause→resume repeatedly "succeeds" (promise resolves) yet renders nothing — exactly your symptom 2.
  (b) The element genuinely decodes a truncated/empty/silent MP3 (backend returned 200 with partial bytes): `currentTime` advances over a tiny buffered span then freezes, but the app-level extrapolator (R1) keeps the UI moving regardless.
Either way: `ended` NEVER fires, so every audit hooked to natural completion is skipped.

R3 — RULE B / ensureNarrationDeliverED SUPPRESSED BY FALSE DELIVERY EVIDENCE
File: zyppar-listen.page.ts (Rule B site) and zyppar/src/app/services/audiobrief/audiobrief.service.ts (delivery-evidence recording).
Structural anchor: the guard at the top of the fallback path that early-returns when it observes "narration appears active": `isPlaying === true`, or `!audio.paused`, or a recent `timeupdate`/`canplay`, or the delivery-evidence latch set. The delivery-evidence gates we added key on TRANSPORT signals (HTTP 200, `loadedmetadata`, first `timeupdate`) — none of which distinguish audible output from a silent/wedged element (web APIs offer no audibility signal). Result: the very first liveness twitch of the broken element permanently satisfies the gate; `ensureNarrationDelivered` becomes a no-op for the rest of the session. Additionally, because `ended` never fires (R2), the on-completion invocation of the audit never happens either. Both doors are closed simultaneously.

R4 — TAP-TO-PLAY PILL GATED OUT THREE WAYS AT ONCE
File: zyppar-listen.page.ts; structural anchors: `presentTtsTapToPlay`, `hasGesturedThisSession`, `ttsFallbackInFlight`, `activeNarrationMode`.
The pill can only render if ALL of these cooperate, and each is independently poisoned in this repro:
  - `ttsFallbackInFlight` latch leak: an earlier fallback attempt set it true and an exception path exited without a `finally`, so every later attempt early-returns. Your repeated manual pause/resumes multiply the chances of hitting the leaking path.
  - `activeNarrationMode` is still `'audio'` (the element claims to be playing), so the code never enters the TTS-presenting branch at all.
  - `hasGesturedThisSession`: if presentation requires a FRESH gesture captured after the fallback became ready, then a background/lock/resume cycle (which produces no DOM gesture) leaves the condition false forever, and `presentTtsTapToPlay()` exits before painting. Note the design irony: the pill's own tap IS the required gesture — requiring a pre-existing fresh gesture defeats the mechanism.
Net: backend says "ready", frontend agrees internally, and the one UI affordance that would legally unlock device TTS is unreachable.

R5 — FASTER BACKEND NOTIFY IS NECESSARY BUT UNCONSUMED
Files: zypparserver/src/services/media.service.ts (synthesis/streaming), library.controller.ts; consumer side in audiobrief.service.ts.
The backend improvement correctly surfaces delay/error sooner, but the frontend consumes that signal into the SAME gated corridor as R3/R4 (fallback suppressed, pill suppressed). Faster truth arriving at a jammed door changes nothing observable. This is why your backend fix improved latency of notifications without changing user-visible outcome.

=====================================================================
2. PRIORITIZED FIX INSTRUCTIONS (edits described, not diffs)
=====================================================================

P0-1 — zyppar-listen.page.ts — make the element the sole source of progress truth
  - Advance displayed position ONLY from observed `audio.currentTime` deltas (`timeupdate`-sourced). Where background throttling forces extrapolation, stamp each extrapolated segment with the element position it started from and RE-SYNC `elapsed := audio.currentTime` on `visibilitychange`→visible, on `pageshow`, and on any resume path, BEFORE extrapolating further.
  - Add a silent-stall liveness probe (external observer — see caveat below): if `isPlaying === true` AND (`audio.paused` OR `audio.readyState < 2` OR `audio.currentTime` unchanged across ~10 s while nominally playing), declare SILENT_STALL and invoke the SAME public completion/reset pathway used by the natural `ended` handler. This makes downstream audits (ensureNarrationDelivered) run exactly as if playback finished. Do NOT synthesize manual-stop semantics.
  - Always `await audio.play()` inside try/catch; map NotAllowedError / AbortError / NotSupportedError to: `isPlaying = false`, clear `activeNarrationMode`, emit the same completion/reset pathway. This is purely additive.
  - Wrap the ENTIRE TTS fallback attempt in try/finally that clears `ttsFallbackInFlight`; additionally give the latch a staleness TTL (a latch older than N seconds is ignored) so one historical leak can never wedge a session again. Do not touch `isManualStopping` / `isManualPausing`.
  - Rework `presentTtsTapToPlay` preconditions: replace the "fresh gesture since fallback-ready" requirement with "a gesture token captured at any point this session, unconsumed"; the pill's own tap handler consumes the token and performs the TTS `play()`. The button is the gesture; do not demand a gesture before offering the button.

P0-2 — audiodata.service.ts — blob URL hygiene
  - Pair every `revokeObjectURL(url)` with: only revoke when no live element has `src === url`; on revoke, detach (`removeAttribute('src')`, `load()`) and null the element reference. Never revoke underneath a playing element. Expose a single owner function for mint/revoke so page code cannot bypass it.

P0-3 — audiobrief.service.ts — harden delivery evidence
  - Upgrade the delivery-evidence gate to record TRANSPORT-COMPLETE evidence only (full body received, or `ended` reached, or received bytes ≥ declared duration), never first-timeupdate/first-metadata. Add an explicit `markNarrationUnhealthy(reason)` written by the page's SILENT_STALL probe, and have `ensureNarrationDelivered` treat unhealthy-or-absent-evidence as undelivered.
  - Ensure the backend delay/error notification surfaces through a subject the page subscribes to OUTSIDE the R3/R4 guard corridor, so a fast backend signal can always trigger the fallback attempt (even if the attempt itself then hits the gesture/pill path).

P1 — local-tts-sandbox.service.ts — mirror every behavioral fix above (it is a verbatim StudioPlayback clone; fixing one and not the other guarantees the bug resurfaces in whichever surface the user is in). Prefer extracting shared logic into one module long-term.
P1 — media.service.ts / library.controller.ts — include `contentLengthBytes` and declared `durationSeconds` in the ready payload so the client can reject suspiciously small payloads (empty/silent MP3 detection server-assisted); optionally expose a checksum/HEAD check.

CRITICAL CAVEAT COMPLIANCE: none of the above modifies `isManualStopping` / `isManualPausing`. The stall probe must NOT live inside the guarded manual-transition functions; implement it as an external observer (element-event subscription + interval) that only calls the PUBLIC natural-completion/reset API. If the caveat headers in the two large files forbid inserting probes anywhere within their guarded sections, the least-invasive path is exactly this external-observer pattern plus additive try/finally around the fallback attempt — no edits to existing latch writes, no edits inside the sovereign transition bodies.

=====================================================================
3. VERIFICATION CHECKLIST (real PWA mobile device)
=====================================================================
 1. Attach Safari Web Inspector (iOS) / chrome://inspect (Android) BEFORE starting; keep console + network open via cable during all steps.
 2. Cold start → play an audioText → lock phone immediately; wake after 5 min: verify timer matches audible position exactly.
 3. Reproduce the 30-min silent session. Watch `audio.currentTime` live: FROZEN while UI advances ⇒ confirms R1 (extrapolation bug). ADVANCING while silent ⇒ element really decodes silence/truncated payload ⇒ inspect the MP3 response bytes and content-length (points to R2b / backend payload).
 4. During the silent session, log `readyState`, `paused`, `error`, `stalled`, `waiting` events: confirms which wedge state (R2a vs R2b) and that `ended` truly never fires.
 5. Confirm the SILENT_STALL probe fires within ~10 s of wedge onset and that milestones freeze at the same moment (not before/after).
 6. Rapid manual pause/resume ×5: verify no duplicated tickers/intervals, `ttsFallbackInFlight` returns to false every cycle (finally executed), and no state accumulation.
 7. Screen-switch away and back mid-playback: verify position re-syncs from element on visible, no jump-forward ghost progress.
 8. Airplane-mode cut mid-stream: fallback path must engage within the backend's new fast-delay window, and the pill must appear and, when tapped, start TTS audio.
 9. Throttle to Slow 2G: verify Rule B engages on the fast delay notification even when the audio element is half-loaded (proves R5 corridor is open).
10. Regression guard for sovereignty latches: manual STOP still cancels everything and suppresses fallback; manual PAUSE does not trigger stall-probe false positives (probe must tolerate paused-by-user state — this is why it must read, not write, the manual flags).
11. Kill-and-relaunch mid-session: state recovery sane, no phantom "playing" UI.

=====================================================================
4. HONEST CAPABILITY NOTE
=====================================================================
From code alone I can prove the GATING TOPOLOGY: which early-return guards CAN suppress the fallback and the pill, and that the progress path CAN advance independently of the element. What I CANNOT prove from static reading is WHICH guard actually fired in the field, nor distinguish R2a (wedged/revoked-blob element) from R2b (genuinely decoding a silent payload) — that distinction is only observable on a device via Web Inspector during a real sleep cycle, because it depends on OS suspension behavior, blob lifetime, and actual response bytes. Exact line-number anchors also require a fresh read of the current sources; the structural anchors above are honest placeholders, not verified offsets. Treat items 3, 4, 5, 8, 10 of the checklist as human-device-mandatory.

=====================================================================
5. DIVERGENCE NOTE
=====================================================================
local-tts-sandbox.service.ts is documented as a verbatim clone of the StudioPlayback service. Two divergence risks: (1) the clone may already LAG the canonical file (e.g., missing the newer delivery-evidence gates), meaning behavior differs per entry surface and fixes must be applied twice or the logic extracted; (2) the backend's newly accelerated delay/error notifications now DIVERGE FROM FRONTEND ASSUMPTIONS — client-side timers/latches were sized for a slower backend, and the fast signal currently terminates at the jammed guard corridor (R3/R4) rather than producing user-visible recovery. Any timing constants touched by the P0 fixes must be re-derived against the new backend latencies, not the historical ones.
