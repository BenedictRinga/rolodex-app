export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 140, // 2026-08-28 SETTINGS SLIM STICKY: the nav map is released to scroll with the Profile and the rest of the page - the sticky strip keeps ONLY the Settings label + Home icon, and tapping Settings now pulls the page back to the top, which reveals the map anyway (scrollTo offset auto-measures the slim float; scroll-margin floor 180px to 72px)
};
