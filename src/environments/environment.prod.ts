export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 146, // 2026-08-29 ONE VOICE PER ANGLE: search fab hides when inbox expanded; gapnote pulse never dims (glow+background); Missing: ... gapnote; facts-only packet rows; relatable steps map; human engine suggestions; i18n x39 (514 keys)
};
