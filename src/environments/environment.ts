// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 144, // 2026-08-29 THE LOOP CONVERSATION GETS A VOICE: LOOP tap chimes (falling pluck) and the app answers with a DIFFERENT chime (warm two-note resolve) as the packet + draft appear; the shell then expands 57.5vh to 80vh so the response is ON the viewport, and the view glides to it (toggle-open presents too, AI-polish chimes); context GAPS pulse in amber until filled (relation row now always shows, with a placeholder); "Sitting because" reworded to "Still open because"; detail gains a Context-Draft-Send orientation map and a closing whisper (send closes the loop - a reply raises the next one); i18n x39 - 509 keys
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
