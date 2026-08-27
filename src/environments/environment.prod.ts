export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 109, // 2026-08-27 APEX CONSULT + RU/HE: 🩺 consult card on every loop row; full Russian & Hebrew sweeps (366 keys × 39 locales); consult strings for fr/es/de/sw
};
