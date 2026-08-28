export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 123, // 2026-08-28 FALLBACK REWARD: tester deal gains the approved consolation line (everyone past the first 15 finishers earns 3 months) so a 20-invite cohort can never leave a finisher empty-handed
};
