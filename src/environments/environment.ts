// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 145, // 2026-08-29 ONE GAP, NOT THREE NAGS + FOOTER TOOLBAR: shell expansion 80vh to 75vh (80 pushed the deck View toolbar half out of viewport); while expanded the deck View toolbar SITS UP AS A FOOTER (sticky bottom) via inboxExpanded wiring (loop-inbox expandedChange -> home -> rolodex host class); the three gap rows are replaced by ONE pulsating tappable notification (Still open - no {{items}} yet. Tap to fill.) opening a persisted context panel (Who / Last touch / How you know / Why sitting - all save to the loop); packet row headings now bold; i18n x39 - 514 keys
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
