# AGENTS.md — Rolodex App (AI build instructions)

This file tells AI assistants working on this repo what to keep consistent.

## Repo rules
- YARN ONLY. Never use npm here.
- Build hygiene:
  - `yarn build` (dev) before commits.
  - `yarn build:prod` before committing `www/` — commit only the production `www/` output.
- Bump `src/environments/environment.ts` AND `src/environments/environment.prod.ts`
  `build` counter together with every user-visible frontend change, and keep it
  equal to the backend `package.json` `build` when both are released together.

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
