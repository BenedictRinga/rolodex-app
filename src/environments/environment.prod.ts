export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 118, // 2026-08-27 STORAGE BEHIND AN ICON (founder): storage panel (tabs+panes) collapses behind a top-right storage icon - LoopKeeper Inbox becomes first panel; CLOUD | DEVICE | SERVER order, DEVICE middle; Settings > Cloud Sync opens panel temporarily; storage.toggle key x 39 locales
};
