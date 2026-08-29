// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 142, // 2026-08-29 INVITE LANDING REDUX: one language state (Inbox + Settings both read/write TranslationService, live getters, persists + overrides); invite landing rebuilt - Confirm you know them (was Find-in-contacts), empty WhatsApp quotes get a real line, Not now replaced by See more, Confirm AND See-more hand off to the Welcome package, anonymous invite_issue failure report lands in the investor portal roll-up, Get-the-app commented out pending the tester process; landing fully i18n-d (was hardcoded English) x39 - 505 keys
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
