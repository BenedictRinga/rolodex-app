# LoopKeeper — Continuity Note (updated 2026-09-22, end of thread at app build 309 / server 121)

New thread? Read AGENTS.md first, then this. Everything below is verified state, not recollection.
The strategic brief is `D:\TODOs\USE_NOW.txt` — the Grok differentiation audit and its six moves;
every plan in this thread is judged against its gate: *does it help an admitted avoider send the
awkward thing in their own words — in; does it widen the tray — out.*

---

## 1. What this project is

**LoopKeeper** — a relationship follow-through PWA: contacts become cards; loops
("things I keep meaning to send") are captured, drafted by the Assistant, and
dispatched. Sending CLOSES the loop (Zeigarnik: fired and forgotten, mind free);
a reply arriving later raises a fresh loop.

Two repos:

| Repo | Path | Role |
|---|---|---|
| `loopkeeper` | `D:\MacBook\noGoogle\loopkeeper` | Ionic/Angular PWA, yarn, served at `https://zyppar.com/loopkeeper/` (**canonical** — `rolodex-app` is a stale parallel copy, archived) |
| `rolodex-server` | `D:\MacBook\noGoogle\rolodex-server` | Node/Express + Mongoose at `https://zyppar.com/api/loopkeeper/*` (internal alias `/api/rolodex/*`) |

## 2. Current state (verified, 2026-09-22 end of thread)

- **App: build 309**, commit `6938d70` (HEAD), working tree clean.
- **Server: build 121**, commit `acc7ef1` (HEAD), working tree clean.
- Counters: app `build:` in BOTH `src/environments/environment.ts` + `environment.prod.ts`
  (the single-line `//` comment IS the changelog — new entry prepended, previous demoted
  with "Previous:"); server `"build": N` in `rolodex-server/package.json`.
- **Deploy queue outstanding (the founder deploys)**: app `www 232-309`; server `./deploy.sh`
  (121 — fixes the log-analysis 500 that shipped with 117). App deploys: "app www 232-NNN".
- Proofs passed on 309: base href `/loopkeeper/`; `build:309` ×1 in main; the ft-canvas
  markers in lazy chunk `www/2688.*.js`; `www/build.json {"build":309}`; i18n parity 690.

## 3. THE PLAN vs WHAT WAS DONE — the brief's six moves (all executed)

The brief (`USE_NOW.txt`) named six moves. Status after this thread:

| # | Move (brief, verbatim intent) | Built as | State |
|---|---|---|---|
| 1 | First session is one human avoidance — "The reply I owe" / "The decision I keep not making" | **309 THE FIRST-TIMER CANVAS** (supersedes 294→308's gate rework) | DONE — see §6 |
| 2 | Copy is not the close — the receipt asks once "did it leave?" | **298** (`copyAsk`/`confirmCopyLeft`/`copyDidNotLeave`, `copy_receipt {left}`) | DONE |
| 3 | whySitting on the face, one-tap correctable, draft changes with the answer | **300** (card-face why + 4 chips; `whyChipKeys`/`nameWhy`, `why_named`) | DONE |
| 4 | Two-line default draft; 90 seconds then buttons; edit demoted | **303** (the ninety-second gate, `sideDoorsOpen`, `edit_opened`/`send_opened len`) + **304** (16 kinds × two-line drafts; 6 `draft.*` wedges × 39 locales) | DONE |
| 5 | The 9am digest is ONE loop already drafted; retire RISING_NUDGE_DAYS → quiet return | **305** (`resyncDigest` serves one loop; `QUIET_NUDGE_DAYS = 2`; the "{{n}}d" shame display retired) | DONE |
| 6 | The message is the only growth loop — message_sent per device per 14 days | **306** portal card + **server 117** (`growthLoop` meter) — the meter's 500 fixed in **121** | DONE (121 pending deploy) |

Plus: **302 the exit's sunny day** (the Settings wipe ends on a full-page sunny day with an
armed logo; the user's own tap returns — never auto-reload. Founder: "beautiful").

## 4. Founder rulings of this thread (the laws behind the builds)

1. **THE FIRST-TIMER CANVAS (309, the standing law)** — the home page splits into TWO VIEWS:
   first-timer vs not first-timer. The first-timer view is a BLANK SLATE: the two gates side
   by side in the middle + the Welcome below (**one Welcome, not two** — the modal skips while
   the canvas stands). "The reply I owe" transforms the slate to just "From my phone" (with
   the return arrow; the branding nullifies on return). The pick opens the dialog IN SITU —
   all the way to success. "The decision I keep not making" ditto (183 self-loop). Once
   concluded + congratulations, the ORIGINAL panel and the surroundings open (a first-timer
   otherwise gets distracted — the deck stays veiled until the success). No new component.
2. **Tap AND continue** is the surmounting (the flags as agreed): `lk_cover_engaged` = the
   ring surmounted (the real card's arrival — or a real send for the decide path);
   `lk_firstminute_done` = the panel's deed done → the regular walk. A bare tap is nullified
   by the return (the 297 law). The 301/302 "Or start with" collapse and 307's
   "every-launch-forever" sweep are BOTH superseded — do not resurrect either.
3. **Thou doth apologize too much** — the picker preface lost "kept on your phone" in all 39
   locales. No privacy disclaimers in the first-timer flow.
4. **The sunny day has nothing to do with loops** — it belongs to the Settings wipe only.
5. **Ship discipline**: deploy = `./deploy.sh` on the server, "app www 232-NNN" by the
   founder. The build-counter comment is the changelog. Never npm.

## 5. Current state of the key mechanisms (where the code lives now)

- **The first-timer canvas**: `home.page.html` (`.ft-canvas`, fixed overlay, gates → phone
  states) + `home.page.ts` (`ftView: '' | 'gates' | 'phone' | 'flow'`, `ftReply/ftPhone/
  ftDecide/ftReturnToGates`). The doors call into the inbox's walk: `startCoverReply() →
  walk.armCoverReply()` (owed-reply branding), `startCoverDecide() → walk.selfTap('decide',
  true)`, `armFtContact() → walk.armFtCard()` (the pick's first card armed as the Who; the
  tap births via `confirmWho → birthFromWho` with the branding). The pick's landing hook is
  in `addFromPhoneContacts` (ftView === 'phone' → ftView='flow' + arm the first card).
- **The walk's panel** shows ONLY in the panel phase:
  `firstMinute && fmPhase === 'panel' && !taskDraftOn && !ftCanvas` (send-walk.component.html).
  Phase rides home → inbox → walk as `[fmPhase]` ('ring' | 'panel'). The first-minute
  component renders by phase: PHASE RING = the two doors + courtesy; PHASE PANEL = the
  original 278 view intact (title, TASK/PERSON, Show me + demo, courtesy).
- **The success**: the walk's `fire()` emits `firstMinuteEntry` → home's `onFirstMinuteEntry`
  clears `ftView`, keeps `firstMinuteActive`, flips `fmPhase='panel'`, persists
  `lk_cover_engaged`. The panel's deed (`onContactsDirty`) later flips `lk_firstminute_done`.
- **The sunny day**: `rolodex.component.ts` `wipeAllAndReload()` → farewell →
  `sunnyAfterWipe` → `<app-sunny-day>` → `finishWipe()` (the `_wipe` reload on the logo tap).
  SunnyDayComponent MUST stay exported in `rolodex.module.ts` (the 299 silent-failure lesson).
- **Copy receipt (298)**: `fire('copy')` early-returns before `markSent`; slide 5 asks
  "did it leave?" — Yes → real close; Not yet → the loop stays open.
- **The growth meter**: `rolodex-server/src/index.js` `computeAnalyticsSummary()` →
  `growthLoop {windowDays, senders, messages, avgPerSendingDevice}` (organic only, guarded
  try/catch — a meter failure returns null, never a 500). Portal card: about-rolodex
  section 06 "The growth loop" (id `inv-growth`; later sections renumbered 07-10).
- **The digest**: `loop-wake.service.ts resyncDigest()` — ONE loop (earliest `nextNudgeAt`),
  body "The words for {person} are written and waiting."; `QUIET_NUDGE_DAYS = 2` (flat step,
  no ladder — RISING_NUDGE_DAYS is gone).
- **The two-line drafts**: `loops.service.ts generateDraft()` — all 16 SHORT tones are
  complete sendable drafts; the why still weaves; `ownWords` never overwritten.

## 6. Verify 309 on production (the founder's checklist)

Fresh device → the blank slate (two gates + the Welcome below, nothing else) →
"The reply I owe" → "From my phone" + the return arrow (back → the gates) → the pick →
the card armed in the walk → tap → the words in situ → send → the receipt →
**the ORIGINAL panel + the surroundings**. "The decision I keep not making" → straight to
the words → send → the panel. The welcome modal must NOT double-greet.

## 7. Ship sequence (unchanged, per build)

1. Bump both app environment counters (+ server `package.json` when backend changed).
2. `yarn build` — typecheck. NEVER npm.
3. `yarn build:prod` — runs `[static-block-fix]` + `[index-css-fix]`, writes `www/build.json`.
4. **Proofs** (all must pass before commit):
   - `grep -o 'base href="[^"]*"' www/index.html` → `/loopkeeper/`
   - `grep -o 'build:[ ]*309' www/main.*.js | wc -l` → 1 (basic-regex `?` is literal in
     git-bash — use `[ ]*`, not `?`)
   - Feature strings live in the LAZY chunk — currently `www/2688.*.js` (NOT main.js)
   - `www/build.json` → `{"build":N}`; i18n values in `www/assets/i18n/*.json`
5. Commit via `.git-commit-msg-N.txt` (write → `git add -A && git reset -q -- <msg> && git
   commit -q -F <msg> && rm <msg>` → `git status --short | wc -l` = 0).

## 8. i18n (every user-visible string)

- 39 locale files in `src/assets/i18n/*.json`: `{ "loopkeeper": { <flat dotted key>: value } }`
  — **currently 690 keys per file, parity verified**. Majors hand-translated: sw so fr es de
  ar ru he am hi ja zh-cmn-Hans zh-cmn-Hant it nl pl tr ha. Minors carry EN deliberately.
- One-shot Node sweep scripts in `src/`: write → run → verify parity → **DELETE, never commit**.
- **HARD LESSONS (both hit in build 309)**:
  - The writer must output `{ "loopkeeper": { <key-without-prefix>: value } }` — flattening
    from the root and re-wrapping in `loopkeeper` DOUBLE-NESTS the file and breaks every
    string. The corruption was caught by parity and restored via
    `git checkout -- src/assets/i18n/` (the committed tree is the recovery point).
  - Multi-line bash (heredocs, multi-line `node -e`) breaks the shell wrapper (exit 127) —
    use the Write/Edit tools or single-line commands.
- Em-dashes/unicode: fine in script FILES; break inline bash — use `\uXXXX` or the Edit tool.

## 9. Build log (this thread)

**App 294→309** (commits in order): 294 the avoidance cover · 295 the gate held · 296 the
gate, unpolluted · 297 the return to cover · 298 copy is not the close · 299 the sunny day ·
300 the why on the face · 301 the obvious door (superseded) · 302 the cover, whole +
the exit's sunny day · 303 ninety seconds, then the buttons · 304 the two lines ·
305 the quiet return · 306 the growth loop meter (portal) · 307 the outer ring (REVERTED by
308 — a sweeping misread, on the record) · 308 the two phases (superseded by 309's canvas) ·
**309 the first-timer canvas**.

**Server 108→121**: 108 the avoidance-cover directive · 112+ the directive bullets (the
return to cover, copy is not the close, the sunny day, the why on the face, ninety seconds,
the two lines, the quiet return) · 117 the growth meter (`growthLoop` in the summary) ·
119 the two-phases directive · 120 the canvas directive · **121 the log-analysis 500, fixed**
(`now` out of scope + a stale renamed variable had killed the whole summary endpoint; the
block is now guarded — the meter can return null, never a 500).

Directive (`chat-directive.js`) current law: THE FIRST-TIMER CANVAS (309) — supersedes the
avoidance-cover/outer-ring/two-phases bullets. Keep it in-step with every capability change.

## 10. Open threads for the next session

1. **Deploy queue**: app `www 232-309`; server `./deploy.sh` (121). Then §6's checklist.
2. The phone image on the "From my phone" door is a plain ion-icon placeholder — the founder
   said "I will add later" (a real graphic, as with the sunny day).
3. Live-check the analytics summary AFTER the server deploy (the 121 fix): portal +
   Command Center must load (200) and the growth-loop card must show numbers.
4. The `growthLoop` meter is new — watch its first real numbers before any feature decision
   (the brief: it is the ONE meter).
5. Community-burnish i18n: minors still ride EN; the preface sweep left the sysNote copy
   untouched (deliberate — it explains the OS's own wording).
6. Someday: explain the device-count reconciliation in the portal (HANDOVER 156-era item,
   still open).

## 11. Where things live (quick index)

- Environment counters: `src/environments/environment.ts` + `environment.prod.ts` (the
  chained `//` comment IS the changelog; raw newlines in the comment break the file — TS1109)
- First-timer canvas: `src/app/home/home.page.{ts,html,scss}` (`ftView` machine) + the
  phase chain `[fmPhase]` home → inbox → walk; panel: `src/app/components/first-minute/`
- The walk (the dialog in situ): `src/app/components/send-walk/` (slides 1-5, the ftCanvas
  input, `avoidKind` branding, the copy receipt, the ninety-second gate)
- Loop engine: `src/app/services/loops/loops.service.ts` (drafts, why chips, QUIET_NUDGE_DAYS)
- Digest: `src/app/services/loop-wake/loop-wake.service.ts`
- Sunny day: `src/app/components/sunny-day/` (+ `rolodex.component.ts` wipeAllAndReload)
- Investors portal: `src/app/components/about-rolodex/` (lazy chunk 2688; section 06 = the
  growth loop; sections after it renumbered 07-10)
- Backend summary: `rolodex-server/src/index.js` → `computeAnalyticsSummary()` (the growth
  block near line 2714 — guarded)
- Directive (AI facts): `rolodex-server/src/chat-directive.js`
- Laws: `loopkeeper/AGENTS.md` (THE FIRST GATE history + THE OUTER RING → THE FIRST-TIMER
  CANVAS succession) — the brief lives at `D:\TODOs\USE_NOW.txt`