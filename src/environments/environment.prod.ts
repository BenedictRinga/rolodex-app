export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 148, // 2026-08-29 LEGACY WHISPER MIGRATION V2: substring sweep of whySitting+pretext+draft on load; fragment summaries fall through to the honest hello; gap panel humanized + rebuilt inputs; i18n x39
};
