export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 124, // 2026-08-28 GROUND ZERO: the 4 W's of a card are recollective — WHEN/WHERE now mean the FIRST meeting ("Mar 2024 · her book launch"), never an appointment; card labels ("Last Interaction"→"First met"), Confidante interview, consult card WHERE/WHEN, welcome storyboard, tester-dashboard mobile hardening (same key on every device, peek, forget, store-only-on-success)
};
