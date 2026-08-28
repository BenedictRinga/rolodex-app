export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 122, // 2026-08-28 TESTER LINK OG PREVIEW: tester.html carries the full OG/Twitter block (same 1200x630 logo card as the SPA shares) so tester invites no longer share as a bare URL; surface hint wording (WhatsApp, email)
};
