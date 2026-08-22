export const environment = {
  production: true,
  rolodexApiBase: 'https://zyppar.com/api/openloop', // the fresh rolodex sync backend (same droplet)
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 50, // 2026-08-22 LoopKeeper voice personas (22 Piper voices) in Settings; welcome TTS sends selected voice; animated OxAlpha splash in index.html (ring draw + dot orbit + LoopKeeper wordmark)
};
