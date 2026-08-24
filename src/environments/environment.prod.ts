export const environment = {
  production: true,
  rolodexApiBase: 'https://zyppar.com/api/openloop', // the fresh rolodex sync backend (same droplet)
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 77, // 2026-08-24 NetworkService quiet polls + anonymized self-report (visit #, returning, total time) + AI chat/feedback privacy hardening
};
