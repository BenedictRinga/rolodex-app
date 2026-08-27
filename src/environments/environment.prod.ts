export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 117, // 2026-08-27 HONEST STORAGE TABS: Device/Cloud/Server tabs show real state - real cards only sync, demo never copies; 30 storage.* keys x 39 locales
};
