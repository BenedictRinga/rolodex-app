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

## Chat with RolodexAI copy — MUST stay fresh
The Chat with RolodexAI modal lives in:

**`src/app/components/chat-with-rolodex/`**

The banner, mode labels, and handoff text are user-facing descriptions of what
RolodexAI is and does. When the app gains/renames/removes a feature, update this
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
