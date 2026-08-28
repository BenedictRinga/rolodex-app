export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 141, // 2026-08-28 DEMO SHOWS ITS WORK: the Settings demo button stops being a blind toggle - label now reads Show demo / Stop demo from live state, and the tap exits to the deck then scrolls straight to the DEMO CONTACTS section (or back to top when stopping) with a toast; fulcrum empty.body finally translated for zh-cmn-Hans, zh-cmn-Hant, so, am, hi, ja (build 134 widening had skipped them)
};
