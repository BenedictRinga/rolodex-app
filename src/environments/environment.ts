// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 146, // 2026-08-29 ONE VOICE PER ANGLE: the Search fab hides while the inbox is expanded (it blocked the deck View footer and the Settings button); gapnote pulse fixed - it never dims now, the pulse rides on glow + background (dimming to .65 had made it FAINTER than its surroundings); de-tautology pass - gapnote now says Missing: ... (li-why owns the still-open voice), the Why-sitting display row and the em-dash rows are gone (a row only speaks when it holds a fact), detail.steps is relatable (What we know / What to say / Off it goes), engine suggests human words (the right words to start with... / they last); i18n x39 values refreshed (514 keys)
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
