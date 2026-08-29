export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 143, // 2026-08-29 NUDGE TAP ESCALATION: tapped check-in nudges escalate into an armed open loop (destination pill under the capture box); proactive Assistant drafts from the card + loop-o-meter whisper when the card is thin; dedicated investor invite-failure line; i18n x39 (506 keys)
};
