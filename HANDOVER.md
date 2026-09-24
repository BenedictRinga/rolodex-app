# LoopKeeper — Continuity Note (updated 2026-09-24, app build 331 / server 129)

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

- **App: build 310** (THE CANVAS HELD — local, not yet committed at the time this note was rewritten).
- **Server: build 122** (directive only — the canvas paragraph).
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

1. **THE CANVAS HELD (310, the standing law — 309's overlay is superseded)** — the home page
   splits into TWO VIEWS and only one is mounted. The first-timer view is a BLANK PAGE and
   it stays the only page until a loop is concluded and the congratulations have played.
   Gates in the middle + one Welcome below. "The reply I owe" transforms to "From my phone"
   || "I will add later", with return. Either door opens the existing send-walk dialog
   cloned onto that page (not the inbox, not the deck), with return, through the send and
   the congratulations. "The decision I keep not making" opens that same dialog. A picked
   card does NOT admit. Return before send removes the unsent loop. Then the original panel
   and the surroundings open. `lk_ft_open` keeps a mid-flow reload on the canvas.
   `lk_cover_engaged` is written at the real send; the panel opens from the congratulations.
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

- **The first-timer canvas (310)**: `home.page.html` — `*ngIf="ftView"` is the blank page;
  `*ngIf="!ftView"` is the entire original home (not mounted until congratulations).
  `ftView: '' | 'gates' | 'phone' | 'flow'`. Phone is two doors (`ft.fromPhone`,
  `ft.addLater`). Flow hosts `<app-send-walk #ftWalk>` (exported from RolodexModule) with
  `[ftCanvas]="true"`. Boot: `openFtCard` births straight into the words; `openFtLater` /
  decide use `selfTap`. Return: `abandonFt` removes an unsent loop. `onFirstMinuteEntry`
  only persists `lk_cover_engaged`. `onFtConcluded` (the congratulations' Next) clears
  `ftView` and opens the original panel. A card arrival while `ftView` is set does not
  engage the gate and does not toast.
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

Fresh device → blank page only (two gates + one Welcome; no header, no inbox, no deck) →
"The reply I owe" → "From my phone" || "I will add later", return to the gates →
pick or later → the words on that same blank page, return still there → send →
the receipt → the congratulations → **then** the original panel and the surroundings.
Cancelling the picker stays on the two phone doors. "The decision I keep not making"
opens the words on the blank page and ends the same way. A picked card must not
reveal the home. The welcome modal must not also greet.

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

**App 311→331** (this thread's second wave, all committed + proven): **311-313** the
admin-gate incident closed end-to-end (311 the stale latch; server 123 the `.env` file is
the admin-key source; 312 the StorageService clean-slate wipe + the JWT-shaped write token;
313 secrets never ride the repo — `.gitignore`) · **314** the entry re-baseline (the
portal/CommandCenter deltas contrast against THIS device's last entry) · **315/126** the
Chat ID (voluntary, Settings, anonymity lead — server mints `LK-` ids) · **316** the
reminder picker (`ion-datetime` — the mobile-native fix) + the resume doubled · **317**
the anonymity angle + the tester exclusion as a structural guarantee (the `testerId` tag) ·
**318** the welcome leaf + the churn ledger (Command Center, the last 10 churned devices
with their trails) + the act-not-person sweep · **319-320** THE COCOON (the first-timer
view is an alternative Home, the Inbox starved) + the first-tap guarantee + the cocoon
quiet · **321/322** the composition + the footer law (01 carries only the 🌱 welcome as a
footer; the milestone words anchor 02) · **323-326** OWN WORDS UP FRONT (the reply dialog
twice-tall, the tune-uppers immediately present, the why at the foot in grey; the cursor
guaranteed via `getInputElement`; Copy the words) · **323/324** the second track, not a
duplication (the decide card as PHASED CLIPS — face + Name it → the flip → One thing /
Another? / Done → Remind me ‖ I schedule → the flourish; every phase returns) ·
**325** the movement footers + the return at the card + the None rhythm + the
null-unshift fix · **327/128** THE TESTER CHANNEL (the home-header chat icon, the HQ
sheet, the auto-minted Chat ID, Command Center 08 inbox + replies; the server `TesterChat`
model, double-gated) · **328** THE TWO VIEWS + the transition burst (balloons + sparks +
"Transitioning into the full experience...") · **329** THE DEAD BINDING (`[fmPhase]` →
`[phase]` — the regular view's 01 renders) · **330** "Name the next loop you need to
close" + the test aperture (the chat icon also rides the sessional Investor-portal
unlock) · **331** the cocoon dock law (the standard notifier never renders in the
cocoon) + the foreground poll (a left-open app catches a deploy within ~10 min).

**Server 123→129**: 123 the `.env` file is the admin-key source (file-first; the boot log
names the source) · 124 the JWT-shaped write gate (`auth.js`; `requireWriteAuth` on the
user-data writes; fails open until `AUTH_SECRET` is set) · 125 deploy.sh `.env`
guarantees (abort if tracked, timestamped backups, append-only URI) · 126 the Chat ID
mint + the LK- lookup branch · 127 the churn ledger · **128** THE TESTER CHANNEL
(`TesterChat`, the double-gated report POST, the thread GET, the admin inbox, the reply
door) · **129** the directive bullets (THE TWO VIEWS, THE TRANSITION, THE TESTER
CHANNEL).

Directive (`chat-directive.js`) current law: THE CANVAS (310) + THE TWO VIEWS (319-329)
+ THE TRANSITION (328) + THE TESTER CHANNEL (327/128). Keep it in-step with every
capability change.

## 10. Open threads for the next session

1. **Deploy queue**: server `./deploy.sh` FIRST (carries 123→129 — the admin-key source,
   the write gate, the Chat ID, the churn ledger, the tester channel, the directive); then
   app `www 232-331`. Then add `AUTH_SECRET=<random>` to the droplet's `.env` — until then
   the write gate logs and fails open (by design, deploy-order safe).
2. **Verify after both deploys**: the tester channel end-to-end (tester device sees the
   chat icon → the ChatID mints → a report lands in Command Center 08 → the reply reaches
   the tester's sheet; a non-tester sees nothing unless the Investor portal was opened this
   session); the cocoon journey (the clips → the burst + "Transitioning into the full
   experience..." → the regular view's TASKS ‖ PERSON 01); the churn ledger rows; the
   mobile reminder picker; the Investors portal + Command Center load (200) and the
   growth-loop card shows numbers.
3. The phone image on the "From my phone" door is a plain ion-icon placeholder — the founder
   said "I will add later" (a real graphic, as with the sunny day).
4. The `growthLoop` meter is new — watch its first real numbers before any feature decision
   (the brief: it is the ONE meter).
5. Community-burnish i18n: minors still ride EN; the preface sweep left the sysNote copy
   untouched (deliberate — it explains the OS's own wording). Parity at 720 keys.
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