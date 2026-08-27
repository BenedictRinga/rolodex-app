export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 113, // 2026-08-27 METER ON CARD BACKS: founder relocation out of the inbox; timed closer celebration on receipt-closed loops (deck-matched); 10 i18n keys x39
};
