# AGENTS.md — Rolodex App (AI build instructions)

This file tells AI assistants working on this repo what to keep consistent.

## Repo rules
- YARN ONLY. Never use npm here.
- Build hygiene:
  - `yarn build` (dev) before commits — TYPECHECK ONLY. Its output is NEVER
    commit-eligible.
  - `yarn build:prod` before committing `www/` — commit only the production
    `www/` output. PROOF OF THE RULE (2026-08-27, build 109 regression): dev
    `www/` carries `<base href="/">`, so on the droplet every chunk/i18n fetch
    resolved to site root and users got splash-then-blank-home. Always check
    `grep base-href www/index.html` shows `/loopkeeper/` before staging `www/`.
- Bump `src/environments/environment.ts` AND `src/environments/environment.prod.ts`
  `build` counter together with every user-visible frontend change, and keep it
  equal to the backend `package.json` `build` when both are released together.

## Brand canonicality (2026-08-26 LOOPKEEPER MIGRATION)
- The product brand is **LoopKeeper**. The package/dir/service names may keep the
  historical `rolodex` prefix (they are internal), but **user-visible strings,
  store ids, share URLs and API paths must say loopkeeper**.
- API canonical path: `/api/loopkeeper` (environment.rolodexApiBase). Legacy
  `/api/openloop` and `/api/rolodex` remain server-side aliases — do not use
  them in new code.
- Android identity: `com.zyppar.loopkeeper` (see PLAYSTORE.md).
- See `_resolutionsNote` / `_ajvNote` in package.json for the 2026-08-26
  dependency-tree repairs (nx 19.8.14 pins + direct ajv 8.16.0). `yarn.lock`
  now exists — commit it; never run `npm install` here.

## Chat with LoopKeeper copy — MUST stay fresh
The Chat with LoopKeeper modal lives in:

**`src/app/components/chat-with-rolodex/`**

The banner, mode labels, and handoff text are user-facing descriptions of what
LoopKeeper is and does. When the app gains/renames/removes a feature, update this
modal's copy in the same commit.

The AI's factual knowledge comes from the backend directive:

**`rolodex-server/src/chat-directive.js`**

When you change a capability in the frontend, check whether that directive
needs the same update (plans, settings list, trial, storage, install status,
etc.). The backend repo's `AGENTS.md` explains this obligation.

## Other copy that must mirror the app
- Settings items: `src/app/components/rolodex/rolodex.component.html`
- About / Investors portal: `src/app/components/about-rolodex/`
- Welcome modal: `src/app/components/welcome-modal/`
- Billing modal: `src/app/components/billing-modal/`

Keep feature names, prices, trial rules, and availability statements identical
across all of these, or the Confidante will answer from stale facts.

## FFmpeg.wasm — client-side video/audio processing (build 65+)
- Packages: `@ffmpeg/ffmpeg@0.12.10`, `@ffmpeg/core@0.12.10`,
  `@ffmpeg/util@^0.12.2`.
- Core assets live in **`src/assets/ffmpeg/`** (`ffmpeg-core.js` + the 31 MB
  `ffmpeg-core.wasm`) and are committed. Do NOT delete them; `www/` carries a
  copy for the PWA.
- We intentionally use **`@ffmpeg/core` (single-threaded)**, not
  `@ffmpeg/core-mt`: the PWA is served without COOP/COEP headers, so
  SharedArrayBuffer is not guaranteed. Do NOT switch to core-mt unless the
  server adds those headers.
- `workerURL` is intentionally omitted — single-threaded core has no separate
  `ffmpeg-core.worker.js` file.
- Service: **`src/app/services/ffmpeg/ffmpeg.service.ts`** — `load()`,
  `convertToMp4()`, `convertToMp3()`. Used by `VideoCallModalComponent` to
  convert recorded WebM clips to MP4 on-device before sending.
- Tooling warning: `yarn add`/`npm install` currently fail on this repo's
  pre-existing dependency tree (`@nrwl` packages removed from registry +
  `@capacitor-community/text-to-speech` peer conflict). FFmpeg packages were
  vendored manually from `zyppar/node_modules` + `npm pack @ffmpeg/core@0.12.10`;
  `package-lock.json` is NOT in sync. If a clean install is ever required, use
  `npm install --legacy-peer-deps` (or repair the lockfile) despite the YARN
  ONLY rule above — this repo has no `yarn.lock`.

## Anonymous product analytics (build 75+)
- Service: **`src/app/services/analytics/analytics.service.ts`** — queues
  anonymous events (no contacts/names/message text), flushes in batches to
  `POST /api/rolodex/analytics/events`, consent key
  `loopkeeper_analytics_enabled` (default ON, toggle in Settings → Privacy).
- Track meaningful actions: `app_launch`, `session_start/end` (duration),
  `card_added`, `card_edited`, `card_removed`, `loop_captured`, `message_sent`,
  `loop_closed`, `confidante_message`, `feedback_sent`, `invite_created`,
  `billing_started`, `billing_succeeded`, `video_clip_sent`.
- Reliability events (BUILD 189-190): `ai_chat_failed` (home chat died —
  categorical stage: `httpNNN`/`empty`/`network`/`timeout`), `ai_draft_failed`
  (compose/refine fell back to the on-device engine — kind + stage), and
  `app_error` (BUILD 190: the global window.onerror + unhandledrejection hook
  in `CrashReporterService` fires it — `{ type, page }` categorical only,
  5s/type+page flood valve; the scalable pipeline ledger, while the
  `/crashes` JSONL stays as the detailed stream with messages + stacks).
  Event names + stages only, never message text, in analytics.
- THE COMMAND CENTER (BUILD 190-191): the Investors portal's operations console
  (`components/command-center/`). TWO hosts: the portal's button/index chip
  (in-template ion-modal, [stats] passed in) AND the RolodexPage
  SESSIONAL APERTURE (BUILD 191: the aperture-outline icon appears ONLY after
  the portal password succeeds this session — `InvestorGateService`,
  in-memory, re-locks on restart — and opens `RolodexView.CommandCenter`, the
  same view-swap contract as Settings with the external Home icon plus the
  console's own internal Close; the component self-fetches
  `/investor/summary` on that path). Carries Reliability (incl. app_error
  rows + crash ledger + `analyticsIngestFailures`), Timeline, Rooms,
  Translations. The PORTAL keeps the growth story (Delta, Live, Presence,
  Retention, Activation, Events, Redesign) — new telemetry sections belong in
  the Command Center, not the portal, per the founder's decluttering rule.
- Locale depth (BUILD 191): the portal's Presence section renders
  `locales.topTimezones` (Place table — full IANA zone, city-level) alongside
  the Region table. Privacy line held: tz comes from the device clock — never
  IP, never geolocation; a city means "phones set to this clock".
- Loop wake notifications (BUILD 189): `LoopWakeService` (Soliloquy pattern —
  OS-held `LocalNotifications.schedule` with a future Date, deterministic
  ids, resync from the ledger on load). A snoozed loop's `waitUntil()` date
  speaks at 9AM local; `bringBack`/`markSent`/`closeFully`/`dropWithDignity`/
  `remove` cancel; `LoopsService.all()` resyncs. PWA = dock nudge + catch-up
  (browsers cannot schedule future notifications). Device-local only —
  loop handles never leave the phone.
- Investors portal (`about-rolodex.component.html`) renders the backend
  analytics summary: DAU/WAU/MAU, sessions, avg session, retention cohorts,
  activation, top events, reliability. Keep the portal fields in sync with
  `rolodex-server` `computeAnalyticsSummary()`.
- Self-report fields (build 77+): `visitNumber`, `isReturning`,
  `daysSinceFirstUse`, `totalTimeSpentSeconds` are computed locally and sent
  as numeric props — never as identities.

## Closed-beta tester system (build 119+)
- Deeplink invite: **`src/tester.html`** → deployed at `/loopkeeper/tester.html?t=<6-digit code>`;
  Accept → `POST /api/loopkeeper/tester/accept` (server build 36+, rolodex-server).
- Founder console: **`src/tester-dashboard.html`** (same-origin, key-gated by
  `TESTER_ADMIN_KEY` env on the server). Both pages ship via the
  `tester*.html` glob in angular.json assets (both build configs).
- App side: analytics service absorbs `?t=` once (stored
  `loopkeeper_tester_id`), then tags EVERY analytics event with the numeric
  `testerId` prop; feedback POST carries the same number. Numeric code only —
  never a name/phone/email. Server rolls events into `TesterDay` and the
  roster reports accept/install/practice/nudge states.
- Keep tester facts (reward: 6 months paid Assistant for first 15 finishers)
  mirrored in `rolodex-server/src/chat-directive.js` if they change.

## NetworkService — quiet background fetches (build 77+)
- **`src/app/services/network/network.service.ts`** — `safeFetch()` returns
  null on offline/network-changed/abort; never throws; 12s timeout default.
- USE IT for every background/poll fetch (updates check, AI status, investor
  summary, analytics flush). User-initiated fetches may still use raw fetch,
  but prefer safeFetch to keep the console quiet.
- Browser devtools may still list failed requests; safeFetch prevents
  unhandled rejections and retry storms.

## Privacy hardening — data that may leave the device (build 77+)
- Analytics: anonymous deviceId + event names + numeric props ONLY.
- Cloud sync: default OFF; sends contacts/ownerPhone only when explicitly
  enabled by the user.
- Users API lookup: sends only the recipient phone the user chose to message
  (user-volunteered reachability check), never the contacts list.
- Socket chat: room + user-set display name + message text; no phone.
- AI chat: stateless — backend never persists/logs messages.
- Feedback: only the AI-gleaned summary is sent; raw chat text stays on device.
- NEVER add phone/contact collection to analytics or background calls.

## Pocket FM-derived backlog (2026-09-14, build 199)
The founder's playbook file D:/TODOs/Pocket_FM Playbook.txt maps Rohan Nayak's
0-to-500M breakdown - but it was mapped FOR ZYPPAR. The LoopKeeper adaptation
lives here:
- #2 Daily-drops habit engine -> loop wake 9AM MORNING DIGEST (build 199):
  one notification/day listing waiting loops by handle (replaces per-loop
  pings; PWA catch-up once/day).
- #3 Cliffhanger shares (organic) -> ACHIEVEMENT SHARE (build 199): dock
  nudge at week-milestones (1/3/5/10/20/30 closed loops), tap -> share sheet.
- #1 Exhaustion stitching -> TRIAL STITCH (build 199): expired trial meets
  the user with the free path - RE-FILL THE 7 DAYS ON DEMAND
  (draft-engine.reopenTrial -> /api/loopkeeper/trial/reopen; the pre-release
  silent auto-renew PRE_RELEASE_RENEWAL is now FALSE) or invite a friend.
  Once per 48h per expiry.
- #6 Drop-off analytics -> already built (dailyEvents, deviceGrowth,
  channel funnel, reliability, crash ledger - builds 69-76).
- #5 Localization -> lite version shipped (39 locales + tz greeting,
  build 195; directive warmth, server 75). Deeper: locale-aware capture
  samples still EN - candidate.
- #4 Rewarded ads: NOT APPLICABLE (off-brand for a private assistant).
- Hard paywall: NEVER - the never-block doctrine is protected design.

## Billing enforcement policy (2026-09-14, founder)
"We are deliberately delaying billing enforcement until statistics tell us the
app is sticky, which is best gathered from first adopters." Concretely:
- NO billing enforcement of any kind until the investor-portal statistics
  (retention cohorts D1/D7, DAU/WAU trend, session depth) prove stickiness.
- The trial stays re-fillable at the user's instance (build 199: the trial
  stitch - reopenTrial via /api/loopkeeper/trial/reopen); PRE_RELEASE_RENEWAL
  stays false.
- Prices ($1 Basic / $5 Assistant) remain advertised in the billing modal but
  are never enforced. Do not add paywalls, trial locks, or nudge-to-pay flows
  until the founder calls the moment.

## No safety assurances (2026-09-20, founder — standing policy)
We do NOT give users assurances of safety or privacy in copy. It is lame and
unnecessary; even LLMs have ultimately been deceptive on this score. THE TRUE
TEST: no one — not even an AI — can catch LoopKeeper secretly collecting data
a user did not volunteer to LoopKeeper. We win that ambiguity by TRUE ACTION,
not words; and the lack of incentives is the true measure of likely behavior.
- Never ship user-facing copy that says "safe", "secure", "your data stays
  yours", "nothing knows a name", "Anonymous ids only" or similar reassurance
  framings. State FACTS about behavior instead (e.g., a toggle's default
  state, what a button erases).
- Existing offenders are removed as they are found (build 277 removed the
  first-minute "Yours is safe here" clause and the Command Center's
  "nothing here knows a name" note).
- This policy rides every surface: app, portal, chat directive, server copy.

## NOTE TO SELF (2026-09-22) — continuity into the next phase
**The strategic brief for everything from here: `D:\TODOs\USE_NOW.txt`.**
Read it before drawing ANY refinement plan. It is the Grok differentiation
audit the founder commissioned (Muse / Instinct / Fo / Ollie vs LoopKeeper,
no-budget constraint) and the brief I judged the next thread's plans against.

**First impressions, on record:**
- Its spine is right and the meters already said so: 294 devices but D1≈0
  and message_sent in single digits while the tray grew — builds 156→293
  widened the secretary (16 loop kinds, console, admin keys) more than they
  moved one avoided message out of one stranger's phone. The stress test
  can prove the doors work; it cannot prove the product works.
- The one open seat it names is real and ours: the avoider sending the
  shame-loaded message in THEIR OWN words. The engine already holds the
  pieces it prizes — dropWithDignity, suggestWhySitting, ownWords (253) —
  but they live in the engine, not on the face of the product.
- The hard truths I accept: "You press Send is not a moat" (the WhatsApp
  handover is the quit point); 16 kinds is the secretary spread; the walk
  still invites polish (editing is procrastination with a keyboard); the
  9am digest is a list; RISING_NUDGE_DAYS is a shame machine. The founder
  already banned streaks — the wake gets the same rule.
- The six moves (USE_NOW.txt §"Six moves, all of them free"): one real
  avoidance as the first session; copy is not a close (ask "did it leave?");
  whySitting ON the card face, one-tap correctable, draft changes with the
  answer; two-line default draft, edit demoted; one-loop digest + quiet
  return; the message itself is the growth loop. Everything else (mail
  reading, calls, payments, more kinds, more locales) is out of scope —
  their capital advantage or a different company.
- Judge every plan in the next thread against its score table: if a move
  helps an admitted avoider send the awkward thing in their own words, it
  is in; if it widens the tray, it is out.

**Shipped state at handover:** app 293 (first-minute in-flow + benefit
show, every-visit-until-engaged, ten-doors lens, wipe verified, probes),
server 107 pending deploy (polish-alpha path fix — ./deploy.sh ONLY, see
the server AGENTS.md deploy policy), onboarding stress probes committed
(scripts/stress-onboarding.cjs, burst-onboarding.cjs).
