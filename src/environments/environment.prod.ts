export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 111, // 2026-08-27 LANGUAGE + LOOP-O-METER: AI (Confidante/polish) replies in the user's language end-to-end; Loop-O-meter readiness strip on the Loops tab; localized offline notice
};
