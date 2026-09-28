# HANDOVER — LoopKeeper session notes for a new thread
_Written 2026-09-25 (late). Canon repo: `D:\MacBook\noGoogle\loopkeeper`. Never work in `noGoogle/rolodex-app` (stale copy)._

## Where we are right now
- **`main` @ `afa84e2` = build 340 "SPLASH FAILSAFE"** — pushed AND deployed: origin/main == main == afa84e2, and the live PWA serves 340 (build.json byte-identical, index.html md5 match, the main bundle carries build:340 — verified 2026-09-26). Working tree carries only HANDOVER.md + the 341 wave.
- Server (`noGoogle/rolodex-server`): `package.json` build = **137**; startup log says `Build 137 (2026-09-25T10:41:15Z)` — already restarted with 137 on the droplet, nothing pending there.
- Working www build = **340** (`grep -o 'build:[0-9]*' www/index.html` confirms).

## What shipped this session (chronological)
- **Build 338 — THE LOOP-TIONARY** (`looptionary-modal`): new full modal — search bar up top, answer card (term, pos, meaning, detail, example, etymology), device-first speaker, device lookup history under the search (60 entries, IndexedDB). Backend: `chat-directive.js` speaks of the Loopt-tionary; server build 136 → 137. Wired into Command Center 08 (AI column tile). Video-call modal got its own per-speaker voice (build 338 too).
- **Build 339 — LOOP-TIONARY CLOSE + WELCOME VOICE**: founder-demanded pure close (backdrop tap + Esc + ✕ all use one `closeModal()` that stops playback, zeroes `_closeCount`/`_suppressBackdrop` and re-arms `.selected` via `requestAnimationFrame`/`setTimeout 0`), plus a five-sentence founder-directed speak path for the Loopt-tionary.
- **Build 340 — SPLASH FAILSAFE**: after the founder got a white-screen-at-splash on a PWA launch, `src/app/entry` boots first, starts Angular in a `<ons-catch>`-style try/catch, and if the app does not paint in time the failsafe force-starts it (no more dead splash).
- **2026-09-25 "Night edits" — RETIRED AS PHANTOM (verified 2026-09-26)**: the splash video, `strings/2026-09-25-night.mp3`, and the two-door entry ("I am in the LoopKeeper" / "Later") exist NOWHERE in the tree — commit 340's stat is 6 files (2 environments, index.html ×2, build.json, main hash), index.html's splash is SVG-only, and no music assets/door component ship anywhere. The paragraph was aspirational notes, not built code; no changelog line is owed.

## Founder's framing to remember (his words, near-verbatim)
- "**2026 is 4 days behind us, so the age of 2026 is actually this time of the year for us — because for a New Year, it has not been finished yet; it's 6 days after Christmas, and that's why we say 2026 is 4 days behind us.**"
- "Say something 2026 by LoopKeeper before the two doors" — done via the 2026 night music + splash.
- On the note when asked to trust him over reasoning errors: "Why do you treat me like a fool? If there is a bug, it's your duty to point it out, not to surrender. But if you know and I know it's not a bug, accept my request."
- General pattern: founder asks; I verify in repo with raw `git show`/`sed` (no `grep -P` — this MINGW grep lacks PCRE; use `grep -E` or `node -e`), then act.

## Open threads / next likely asks
1. ~~Push 340~~ DONE — 340 is on origin/main and live on the droplet; the phantom splash/door edits never existed, nothing to push.
2. ~~Changelog line for the splash + two-door work~~ MOOT — the night edits are phantom; 340's own changelog line (the splash failsafe) is the record.
3. ~~Loop-tionary backend TTS~~ DONE in 339 — the speaker rides MP3-first `POST /tts` with the qwen voice (12s abort, device voice tier-2 only on backend failure with the once-per-streak toast), the Welcome modal's exact pattern. Confirmed working.
4. Server `./deploy.sh` is a known pending style step only when `rolodex-server` changes — none pending right now (137 already restarted).

## Mechanical facts (copy these, don't re-derive)
- Build bump: `src/environments/environment.ts` AND `environment.prod.ts` together; new comment line goes ABOVE the previous one, old line kept verbatim (first ~140 chars of each history line are the search keys).
- YARN ONLY. `yarn build` (typecheck) then `yarn build:prod` before touching `www/`; commit `www/` for the PWA only with `yarn build:prod` output.
- Base href on PWA must be `/loopkeeper/` — check `grep base-href www/index.html` (ok for 340).
- Server: `noGoogle/rolodex-server`, `./deploy.sh` to release; bump its `package.json` build when shipped with a frontend build.
- Loopt-tionary files: `src/app/components/looptionary-modal/` (component + html + scss), service `src/app/services/looptionary/looptionary.service.ts`. History key: IndexedDB store `looptionary-history`, 60 entries.
- The `selected` re-arm after backdrop close: `requestAnimationFrame(() => setTimeout(() => el.classList.remove('selected'), 0))` — or just `setTimeout(0)`; either works, both ship in 339's `closeModal()`.
