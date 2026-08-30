// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 156, // 2026-08-30 HONEST CAPTIONS (founder: ambiguous labels do not fit the bill): every metric on the investor portal and About page now says exactly what it counts - Contact-sync devices / Synced in last 24h (sync fires only on contact changes, never app opens), timeline note explains quiet bars mean no contact edits not no users, activation table explains Devices = all-time distinct organic devices and why Added a card can honestly read 0 (invite-born cards never fire card_added), top-events note states the 7d window + organic-only + rows-list-what-fired semantics; a stray </div> from the activation caption edit was caught and removed (div balance verified 219/219)
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
