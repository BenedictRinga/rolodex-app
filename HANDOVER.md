# LoopKeeper — Handover Note (2026-08-30, end of thread at build 156)

New thread? Read AGENTS.md first, then this. Everything below is verified state, not recollection.

---

## 1. What this project is

**LoopKeeper** — a relationship follow-through PWA: contacts become cards; loops
("things I keep meaning to send") are captured, drafted by the Assistant, and
dispatched. Sending CLOSES the loop (Zeigarnik: fired and forgotten, mind free);
a reply arriving later raises a fresh loop.

Two repos:

| Repo | Path | Role |
|---|---|---|
| `rolodex-app` | `D:\MacBook\noGoogle\rolodex-app` | Ionic/Angular PWA, yarn, served at `https://zyppar.com/loopkeeper/` |
| `rolodex-server` | `D:\MacBook\noGoogle\rolodex-server` | Node/Express + Mongoose at `https://zyppar.com/api/loopkeeper/*` (internal alias `/api/rolodex/*`) |

## 2. Current state (verified clean, 2026-08-30)

- **App: build 156**, commit `cd0a292` (HEAD), working tree clean.
- **Server: build 47**, commit `1820166` (HEAD), working tree clean.
- App build counter lives in BOTH `src/environments/environment.ts` (line 10) and
  `src/environments/environment.prod.ts` (line 7) as `build: N, // <dated changelog>`.
  Server counter: `"build": N` in `rolodex-server/package.json` (line 4).
- The build-counter comment IS the changelog — read it to see what the last build did.

## 3. Ship sequence (do this for every user-visible change)

1. Bump both app environment counters (+ server `package.json` when backend changed).
2. `yarn build` — typecheck (~40–140s). NEVER npm.
3. `yarn build:prod` (~60–90s) — runs `[static-block-fix]` + `[index-css-fix]` automatically.
4. **Proofs** (all must pass before commit):
   - `grep -o 'base href="[^"]*"' www/index.html` → `/loopkeeper/` (build-109 regression guard)
   - `grep -c "build: ?156" www/main.*.js` → 1 (minifier strips the space)
   - Feature strings: the about-rolodex component compiles into lazy chunk `www/8635.*.js`
     (NOT main.js — searching main.js for its captions returns false 0s).
   - i18n values live in `www/assets/i18n/*.json` (runtime assets, not bundled).
5. Commit: write `.git-commit-msg-N.txt`, then
   `git add -A && git reset -q -- .git-commit-msg-N.txt && git commit -q -F .git-commit-msg-N.txt && rm .git-commit-msg-N.txt`,
   verify `git status --short | wc -l` = 0.

## 4. i18n (every user-visible string)

- 39 locale files in `src/assets/i18n/*.json`, FLAT dotted keys under a `loopkeeper`
  root object (e.g. `"consult.kWhere": "Where"`). Currently **519 keys per file**.
- Majors hand-translated: sw, so, fr, es, de, ar, ru, he, am, hi, ja, zh-cmn-Hans,
  zh-cmn-Hant. All other riders carry EN deliberately (community-burnish doctrine —
  the founder seeded Somali himself and expects communities to polish gaps).
- One-shot Node scripts in `scripts/`: write → run → verify parity (unique flat-key
  count across all 39) → **DELETE. Never commit them.**
- Amharic/unicode: encode as `\uXXXX` in scripts (Git Bash wrapper breaks on raw
  non-ASCII in inline commands).

## 5. Environment/tooling gotchas (learned the hard way)

- MSYS `/tmp` is invisible to Windows Node — write temp files to the cwd (`inv-probe.json`)
  and delete after; never `require('/tmp/...')`.
- Em-dashes/unicode in **inline** bash/perl commands break the shell wrapper (exit 127).
  Use the Edit/Write tools for unicode content, or `\uXXXX` escapes in scripts.
- `grep -c` exits 1 on zero matches — it breaks `&&` chains; separate with `;`.
- Edit tool: bash `sed` reads do NOT register snippets; re-read with the Read tool after
  any out-of-band edit or you get stale-scope errors. Files are mostly CRLF; Edit preserves.
- TS strict: index-signature access needs brackets (`obj['tz']`, TS4111).
- Production static-blocks: the minifier drops JS class `static { }` blocks —
  `[static-block-fix]` repairs them post-build (watch its output).

## 6. Architecture map

- **home.page.html** is the REAL Assistant surface — its composer/head is projected into
  the inbox via the `[chat-tab]` slot; the modals (`card-chat-modal`, `chat-with-rolodex`)
  are separate surfaces. Renamed Chat → Assistant (build 126); "Confidante" is a
  FORBIDDEN user-facing word (build 132) — internal ids keep `confidante` only.
- **Loops** (`loops.service.ts`): capture → chime #1 → context packet + draft → chime #2
  → send (deep-link via `buildSend`, clipboard always) → send IS the close → receipt →
  celebration. Legacy persisted strings get regex-migrated on load (`all()` migration v2,
  build 148) — engine phrases are unique so user-written text is never touched.
- **Notifications** (`event.service.ts`): reminders are in-memory JS timeouts; native
  `LocalNotifications.schedule` happens ONLY at fire time (`at: new Date()`), never
  pre-scheduled — so `cleanupTimeout` fully prevents rings; the 200ms debounce batch
  re-checks liveness against storage (build 155) so a deleted event can never ring.
  PWA dock notifications carry `data: { action: 'checkin', contactId }` and are
  tappable (drag-safe, `lastDragEnd` guard).
- **Analytics — two separate pipelines, never confuse them**:
  - `DeviceState` (presence/sync cards): pushes fire ONLY on contact changes, not app
    opens. "Synced in last 24h" = contact-change syncs. Stale-looking data (last sync
    2026-08-28) is correct behavior, not an outage.
  - `AnalyticsEvent` (DAU/WAU/MAU, sessions, retention, activation, topEvents,
    inviteFunnel, shares, locales): the real usage ledger.
- **Investors portal** (`about-rolodex`, lazy chunk 8635): every metric caption says
  exactly what it counts (build 156). No minted identifiers on screen; `f.deviceName`
  in feedback (line ~866) is a user-chosen self-label — permitted.
- **Backend** `src/index.js`: `/investor/summary` embeds `computeAnalyticsSummary()`
  (organic top line, ownFleet separate, sha1-idempotent ingest, hourly per-device
  rate limit). Tester roster + noise-devices console gated by `TESTER_ADMIN_KEY`;
  dashboard is `src/tester-dashboard.html`.

## 7. Founder doctrine (violating any of these = redo)

1. **Honest-storage**: demo never leaves the device — all 10 `rolodexSync.push` sites
   push `this.realContacts()` (build 155). Demo OFF purges every artifact it fed:
   demo-fed loops (sourceContactId match), relationship scores, birthday lists,
   managed follow-up events.
2. **Analytics integrity**: organic-only top line; own fleet + testers reported
   separately (server build 47); no IP/geolocation; invite tokens are anonymous 48h codes.
3. **Send is the close** (build 130): no "awaiting reply" limbo; next trigger is the
   app's autonomous nudge or a fresh loop from a received reply.
4. **Never interrogate the user** — subliminal bedrock (builds 124–125): decisive in
   the engine, ambiguous in copy; nudges whisper ("I told ya" when the card is thin).
5. **Human words**: no "open", no "hook", no nerd-speak in the loop UI (builds 146–148).
   One sense per line; gapnote text pops against its pulse (#fff6ea on amber).
6. **Chimes**: LOOP tap = falling pluck; app's answer = two-note resolve (`SoundService`).
7. **Every metric caption must say exactly what it counts** (build 156, founder:
   "ambiguous labels do not fit the bill").

## 8. Build log (this thread)

App 125→156 (commits in order): 125 subliminal bedrock/softening of 124 · 126
pill-row restored + Assistant rename · 127 input polish · 128 nudge tap coherence ·
129 close-it + celebration overlay · 130 send=closes loop + card strip · 131 deep
fields dossier · 132 social channels + Somali + forbidden lexicon · 133 border/orb ·
134 orb-per-pill + translation widening · 135 "Start any" · 136 ten-cohorts pill ·
137 auto-cap + About i18n (sw/so) · 139 era-SVG animation fix · 140 slim sticky
Settings · 141 demo SHOW/STOP truth + missing translations · 142 invite landing
redux + ONE language state · 143 nudge escalation + proactive Assistant · 144
chimes + 80vh expansion + gap pulses · 145 75vh + ONE gap panel + footer toolbar ·
146 one voice per angle + pulse fix · 147 human words, one open · 148 legacy
migration v2 · 149 locale signals · 150 card speaks first (no manual phone entry) ·
151 nudge tap answers · 152 growth voice + standing fulcrum · 153 nudge takes the
screen · 154 analytics integrity portal + founder console · 155 demo isolation ·
156 honest captions.

Server 40→47: 40 Assistant rename · 41 send-closes directive · 42 deep-fields
directive · 43 forbidden lexicon + Telegram · 44 invite-failure line · 45 locales
section · 46 shares + inviteFunnel · 47 analytics integrity (organic-only,
idempotent ingest, rate limit, noise-devices admin).

## 9. Production reality check (2026-08-30, live probes)

- Reachability confirmed (app 200, root 200, gated API 401); droplet serves build 155
  at probe time (served `main.604423c88e0f6a8a.js` = build-155 hash; 156 not yet deployed).
- Real usage: **DAU 27, WAU 74, MAU 74**, 810 sessions/7d (33/24h), avg session 410s.
- Locale: 34 devices, 100% Africa/Nairobi, en/en, 0 language switches.
- Arrivals: 74 new devices in 7d (51 on Aug 28–29). Retention **D1 ≈ 2.7%, D7 = 0** —
  the funnel break. Activation thin: loop_captured 10, invite_created 6, loop_closed 3,
  message_sent 1; card_added 0 (invite-born cards never fire `card_added` — documented
  in the portal caption), followups 0, billing 0. InviteFunnel/shares: 0 (build-152
  cold start, deployed same day).

## 10. Open threads for the next session

1. **Retention is the problem, not awareness** — 74 arrived, 2 came back day 1, 0 day 7.
   Worth a founder conversation before building more features.
2. `card_added = 0` — could instrument invite-born card creation, or accept the
   documented semantics (caption already explains it).
3. Deploy build 156 `www/` to the droplet (156 is committed locally; probe showed 155 live).
4. `f.deviceName` (about-rolodex line ~866) is a user-chosen self-label — currently
   permitted; flag if the founder wants it masked.
5. Device-count reconciliation (239 DeviceState vs 74 analytics vs 34 locale devices) —
   expected (different pipelines/eras) but worth explaining in the portal someday.
6. Somali + Amharic locales ride EN for most keys — community-burnish pending.

## 11. Where things live (quick index)

- Environment counters: `src/environments/environment.ts:10`, `environment.prod.ts:7`
- Loop engine + migrations: `src/app/services/loops/loops.service.ts`
- Follow-up engine: `src/app/services/followup-engine/followup-engine.service.ts`
- Notifications/scheduling: `src/app/services/event/event.service.ts`
- Share voices + tracking: `src/app/services/share-app/share-app.service.ts`
- Language ONE state: `src/app/services/translation/translation.service.ts`
- Investor portal: `src/app/components/about-rolodex/` (lazy chunk 8635)
- Loops UI: `src/app/components/loop-inbox/`
- Backend summary: `rolodex-server/src/index.js` → `computeAnalyticsSummary()`
- Directive (AI facts): `rolodex-server/src/chat-directive.js` — update whenever a
  capability/copy changes (AGENTS.md obligation)
