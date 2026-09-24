# HANDOVER NOTE — THE TESTER CHANNEL: STATUS CORRECTED 2026-09-24

**Date:** 2026-09-24 · **State:** app build 332 (the live-aperture fix SHIPPED below), server build 129
**Author:** the LoopKeeper build thread

**⚠️ CORRECTED BY LIVE PROBE (2026-09-24): the droplet HAS been deployed past server 128.** Probes: the tester-chat inbox route answers **401** (the gate exists and works), the auth/token mint answers **200**, and the investor summary serves the FULL modern shape (`analytics.growthLoop`, `recentChurns`, `knownDevices`, `dauSplit`) with a ticking `generatedAt`. The founder's assumption was right: deploys after 123 carry their effects, and they HAVE run. The earlier "deploys never ran" claim in this note was wrong and is withdrawn. What remains is (A) the icon's stale-snapshot bug — SHIPPED as app 332 — and (B) verifying the key end-to-end with the REAL key (the founder's checklist at the bottom).

---

## The feature in one paragraph

LoopKeeper's home header carries a chat-bubble icon beside the search and server icons. It opens a per-device "report to HQ" thread: first open auto-mints the device's **Chat ID** (`LK-XXXXX`, the Settings → Chat ID mechanism), the tester drops reports (features, bugs, suggestions), and the founder reads/replies from **Command Center section 08** (admin-key gated). Backend: `rolodex-server` build 128 — model `TesterChat` (`chatId` unique, `deviceId`, `msgs[{from: 'tester'|'founder', text, at}]`), routes `POST/GET /api/rolodex/tester-chat`, `GET /api/rolodex/tester-chat/inbox`, `POST /api/rolodex/tester-chat/reply`. Visibility law (app 327/330): the icon shows for devices in the tester roster (the absorbed numeric `testerId` tag on every analytics event) **or** once the Investor portal has been unlocked this session (the sessional `InvestorGateService` — the same law as the Command Center's aperture icon). All committed: app 331 / server 129, trees clean. **Neither deploy has run.**

---

## PROBLEM A — The chat icon never shows, even after the Investor portal is unlocked

**Symptom (founder, live):** entered the Investors portal successfully; the Command Center's aperture icon appeared (that law works); the tester-chat icon did NOT appear, in the same session.

**Root cause — verified in code, one read-depth bug:**

- `src/app/home/home.page.ts` (~line 827, `ngOnInit`):
  ```ts
  this.testerChannelOn = this.analytics.getTesterId() > 0 || this.investorGate.unlockedThisSession;
  ```
  This is a **one-time snapshot taken at boot**. `ngOnInit` runs once; the Investor unlock happens minutes later, so the snapshot is permanently `false` for that session.
- `src/app/services/investor-gate/investor-gate.service.ts` — `providedIn: 'root'` singleton; `unlock()` sets `unlockedThisSession = true`. One instance per app; home and the portal share it. Correct.
- The Command Center's aperture icon works because `rolodex.component.html` reads `investorGate.unlockedThisSession` **directly in the template** — re-evaluated every change-detection cycle. Home's icon reads the stale **field** `testerChannelOn`.

**The fix (one line, when the go is given):** make it a live getter instead of a boot snapshot:

```ts
get testerChannelOn(): boolean {
  return this.analytics.getTesterId() > 0 || this.investorGate.unlockedThisSession;
}
```

(and delete the ngOnInit assignment). The template binding `*ngIf="testerChannelOn"` then re-evaluates each CD cycle exactly like the aperture icon. Nothing else touches this path; the tester-roster half and the modal (moved to the template root in app 328) are verified fine.

**Secondary check while there:** the icon's sheet (`ion-modal`, template root of `home.page.html`) and `openTesterChat()` are gated on the same flag — no other timing traps found.

---

## PROBLEM B — The TESTER_ADMIN_KEY gate "has never passed"

**Symptom (founder, historical + current):** the admin-key surfaces (tester-dashboard at `/loopkeeper/tester-dashboard.html`, Command Center 07-Noise write, and now the 08 tester-channel inbox/reply) reject the founder's key or never let him in.

**The record so far:**

1. **The ~24h rejection incident (2026-09-23):** the correct key failed for about a day while the server simultaneously answered 200 to the same key in a direct probe. Two latches were found and fixed in code:
   - **App 311:** the tester-dashboard loaded a **stored key from localStorage** into the field — after the key changed on the droplet, the old value sat behind the dots and re-sent itself on every attempt. Fixed: a 401 now forgets the stored key, clears the field, and says so. (Also: the Command Center's key prompt trims pasted whitespace.)
   - **Server 123:** the server read `TESTER_ADMIN_KEY` from the **process env**, which **pm2 had frozen at an older boot** — an edited `.env` was shadowed until the next full restart. Fixed: file-first read (`D:/TODOs/db-tools-tmp/zyppar.env` then `.env`), boot log names the source (never the value), `deploy.sh` restart uses `--update-env`, and deploy.sh now **aborts if `.env` is git-tracked**, backs it up (timestamped, last 10 kept), and is append-only on the Mongo URI.
2. **The decisive fact:** **the server deploys 123→129 have never run.** The droplet is still executing pre-123 code — the stale-env shadow bug is still live there, and the tester-channel endpoints (128) do not exist on it yet (the app's inbox shows "the server does not know this command yet — deploy server build 128").
3. **Open question for the solver:** after `./deploy.sh` (which runs `git reset --hard origin/main` — verify the working tree is pushed — then yarn, the `.env` guard, `pm2 restart rolodex-server --update-env`), probe from the droplet:
   ```bash
   pm2 env rolodex-server | grep TESTER_ADMIN_KEY   # what the old boot froze
   grep '^TESTER_ADMIN_KEY' /opt/rolodex-server/.env # the file the code now reads first
   pm2 logs rolodex-server --lines 20               # the boot prints '[admin] TESTER_ADMIN_KEY source: .env file'
   curl -s "https://zyppar.com/api/rolodex/tester-chat/inbox?key=<THE_KEY>"   # expect {ok:true,...} or {ok:true,threads:[]}
   ```
   If the boot log still names "process env (STALE RISK)" or the key still fails, the next suspect is the `.env` parse regex in `src/config.js` (`envRead` matches `^NAME=["']?VALUE` — confirm the droplet's `.env` line has no leading spaces/quotes variation it can't match).

**What is gated by this key (all should pass with the same `TESTER_ADMIN_KEY`):** tester-dashboard login · Command Center 07-Noise write · Command Center 08 tester-channel inbox + reply. The Investor portal's password is a DIFFERENT secret and must never be accepted by these gates (the founder's explicit ruling).

---

## What a solver must not break (the settled laws)

- **The two-view law:** the home page has exactly two views — the first-timer cocoon (always meets a visitor until the journey concludes; its 01 = the two avoidance doors + the 🌱 welcome footer) and the regular view (once retired: every boot/reload opens on the TASKS ‖ PERSON panel, title "Name the next loop you need to close"). The notifier dock never renders while the cocoon stands.
- **The write gate:** server 124's JWT-shaped token gate on the user-data writes fails OPEN until `AUTH_SECRET` is set in the droplet `.env` — that is deliberate deploy-order safety, not a bug.
- **Deploy order matters:** server `./deploy.sh` FIRST (carries 123→129), then the app `www 232-331`. The app posts 404 against the old server until the server lands.
- One-shot sweep scripts live in `src/` and are DELETED after running — never committed. Yarn only, never npm. Build counters: app in both `src/environments/environment*.ts` (the single-line `//` changelog chain), server in `package.json`.

## Where things live

- App: `D:\MacBook\noGoogle\loopkeeper` — home header icon + sheet: `src/app/home/home.page.{ts,html}`; the HQ sheet styles: `src/app/home/home.page.scss` (`.tc-*`); the investor gate: `src/app/services/investor-gate/investor-gate.service.ts`.
- Server: `D:\MacBook\noGoogle\rolodex-server` — the tester-chat routes + model: `src/index.js` (grep `TesterChat`); the admin-key source: `src/config.js`; the gate: `src/auth.js`; the Assistant's factual base: `src/chat-directive.js`.
- Commits of record: app 327 `2c690a3`, 330 `38d38e0`, 331 `19ad374` · server 128 `06f92fb`, 129 `375e6c7`.

---

## THE FOUNDER CHECKLIST — execute in order (2026-09-24)

1. **Server side (the droplet)**: `cd /opt/rolodex-server && grep '^TESTER_ADMIN_KEY' .env` — note the exact value (call it KEY). Confirm no trailing spaces or quote variants on that line.
2. **The gate, from anywhere**: `curl -s "https://zyppar.com/api/rolodex/tester-chat/inbox?key=KEY"` — a wrong key MUST answer 401 (verified live today); the correct key MUST answer `{"ok":true,...}`. If the correct key 401s: `pm2 logs rolodex-server --lines 30 --nostream` and read the `[admin] TESTER_ADMIN_KEY source:` line — if it names the process env, run `pm2 restart rolodex-server --update-env` and probe again; if it names the .env file and still 401s, the `.env` line parse is the suspect (leading spaces / quote variants).
3. **The app**: deploy `www 232-332` (carries the live-aperture fix). Open the Investor portal, unlock — the chat icon now APPEARS beside search and server in the SAME session (the stale snapshot is gone; restart still re-locks it — the sessional law stands).
4. **End-to-end**: tap the icon (the ChatID mints) → drop a report → open Command Center → 08 → Open the inbox → paste KEY when asked (trailing spaces are trimmed) → the thread appears → Reply → the tester's sheet shows the reply on the next read (a 15s read while the sheet stands).
5. **The portal record**: verified LIVE (generatedAt ticks; the full modern shape serves — the fetch is no-store at unlock + hourly). If the nine sections read identical numbers between entries, the likely truth is the numbers did not move (a quiet day; testers + your own fleet excluded). If you want tighter in-session freshness, the hourly refresh can drop to 15 minutes — say the word.
