export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 110, // 2026-08-27 HOTFIX: www/ must ALWAYS come from yarn build:prod (base-href /loopkeeper/) — 109 accidentally shipped the dev-config bundle and blanked the home page
};
