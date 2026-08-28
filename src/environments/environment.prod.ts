export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 137, // 2026-08-28 ABOUT I18N + AUTO-CAPS: About prose becomes aboutTxt.* keys hand-translated into Swahili and Somali (38 new keys, i18n x39 at 494 keys/file); all four chat composers auto-capitalize sentence starts (ASCII, caret-safe) - no more painfully pressing CAPS; Assistant/Loops border parity + per-pill orbs (134) retained
};
