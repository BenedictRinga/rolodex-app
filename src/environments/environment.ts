// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 147, // 2026-08-29 HUMAN WORDS, ONE OPEN: gapnote text turned warm WHITE (#fff6ea + soft text-shadow) so it pops against the pulsing amber instead of blending chameleon-like; the three OPENs itemized and killed - sittingBecause is now Still HERE because (the one wait-voice), ctx.openPromise is The promise, ctx.hook is Opening line, and suggestPretext no longer says the open thread; legacy suggested whySitting strings migrate on load (natural hook -> the right words to start with...), user-written reasons never touched; i18n x39 values refreshed (514 keys)
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
