// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 141, // 2026-08-28 DEMO SHOWS ITS WORK: the Settings demo button stops being a blind toggle - label now reads Show demo / Stop demo from live state, and the tap exits to the deck then scrolls straight to the DEMO CONTACTS section (or back to top when stopping) with a toast; fulcrum empty.body finally translated for zh-cmn-Hans, zh-cmn-Hant, so, am, hi, ja (build 134 widening had skipped them)
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
