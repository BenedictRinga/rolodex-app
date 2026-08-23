export const environment = {
  production: true,
  rolodexApiBase: 'https://zyppar.com/api/openloop', // the fresh rolodex sync backend (same droplet)
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 63, // 2026-08-23 chat sounds via ported Zyppar SoundService, auto-grow textarea (6-line cap), About modal full-height stable scroll, initialBreakpoint fix
};
