export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 145, // 2026-08-29 ONE GAP NOT THREE NAGS + FOOTER TOOLBAR: 80vh -> 75vh; deck View toolbar sits up as a footer while the inbox is expanded; ONE pulsating gap notification opens a persisted context panel (Who / Last touch / How you know / Why sitting); bold packet headings; i18n x39 (514 keys)
};
