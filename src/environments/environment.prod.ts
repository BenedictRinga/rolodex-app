export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 139, // 2026-08-28 SECRETARY STAGE SYNC: the About card write-back scene was buried under the era photos (36s photo clock vs 7.5s story loop, never in phase; pre-delay base opacity held photos over the SVG) - one 37.5s master cycle = exactly 5 story loops now gives the SVG stage the first 15s so the pen writes on every cycle; reduced-motion/data guards + a visible rm-note whisper; i18n x39 at 495 keys
};
