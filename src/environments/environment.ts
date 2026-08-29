// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 148, // 2026-08-29 LEGACY WHISPER MIGRATION V2: old persisted loops carried nerd strings the v1 migration missed (it required exact string + suggested marker) - v2 sweeps substring matches across whySitting AND pretext AND draft (natural hook -> the right words to start with; the open thread: -> the thread:; user-written reasons never match engine phrases so untouched); tiny summary fragments (the B case) no longer become the thread: B - they fall through to the honest hello; draft why-clause Still here because; gap panel field humanized (What is held it up / the honest reason it is still here) and its inputs rebuilt (12px radius, real padding, 38px min height, focus line); i18n x39 (514 keys)
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
