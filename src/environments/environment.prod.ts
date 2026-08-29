export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 142, // 2026-08-29 INVITE LANDING REDO: one language state (inbox + settings through the shared TranslationService); invite landing - Confirm you know them, See more (welcome), invite_issue failure report to the investors portal, Get-the-app commented out pending testers; landing i18n x39 (505 keys)
};
