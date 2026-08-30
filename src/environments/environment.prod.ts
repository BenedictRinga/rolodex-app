export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 154, // 2026-08-30 ANALYTICS INTEGRITY: portal top line is ORGANIC (own fleet + testers excluded server-side, reported as the Own fleet card), retention cohorts anchored server-side + noise-excluded; founder dashboard gains the own-fleet noise-device console (add/remove, TESTER_ADMIN_KEY gated)
};
