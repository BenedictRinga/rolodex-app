export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 147, // 2026-08-29 HUMAN WORDS, ONE OPEN: white gapnote text on amber pulse; Still here because / The promise / Opening line; no more the open thread; legacy suggested reasons migrate on load; i18n x39 (514 keys)
};
