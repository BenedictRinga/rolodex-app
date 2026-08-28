// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 134, // 2026-08-28 BORDER PARITY & ORBS: visual-only sample pills return (upper tether for the fulcrum), Loops capture is a 3-line textarea with Enter-to-capture, clear-X added to the projected Assistant composer (modals already had it), surface renamed Chat -> Assistant ("making AI work for you..."), legacy chevrons dropped, i18n x39: softened build 124's interrogation — rotating capture placeholders (tap-to-fill pills gone, primary holds the larger dwell), plain "When/Where did you meet?" with whispering hints, first-letter-bolded W labels + commentary, empty-state heft, welcome secretary-emphasis, 👁 on every password alert, ✕ clears chat composers, i18n ×39
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
