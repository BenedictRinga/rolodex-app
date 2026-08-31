// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 161, // 2026-08-31 BUILD 161 (founder: fab restore + flip icon): the Search fab now comes back after every Loops process - the inbox-mirror resets at every inbox close/reopen (R-icon toggle, Settings swap, close, nudge travel), because a destroyed inbox can no longer emit its retract. The two surface doors (walk foot + shelf) became a small round flip icon (arrow-redo, the card-flip mark): the shelf one sits directly under the three sample pills, never below the fold. Previous: 2026-08-31 BUILD 160 (founder: kill demo prompts + no serial skip): loadContacts no longer seeds mockContacts unconditionally on an empty persisted deck - Demo OFF now means an EMPTY deck (no prompts, no engine-minted sample check-ins, ever). Walk: with real people aboard, Not this one opens the chooser (filter + tap, walk.find) instead of paging the deck one card at a time; pure-demo decks still cycle. Previous: THE MINE DOOR (founder): a first-timer walks a demo name all the way to the Send stage, where a big rounded MINE tile waits (styled like the Who card, + glyph, translated sub-line). Tap = elegant reset to slide 1, then their own device Contact Picker (add sheet where the picker does not exist); the pick lands as the Who card, past the fresh-pick sort trap. Add sheet + toasts translated (loopkeeper.add.*). device_list_started fires once ever per device at the first real card (walk confirm / picker / manual / invite) -> server activation row "Started their list" + Investors portal row. Empty deck (Demo OFF) gets its own teal door (whoAdd) to the same picker - no dead-end text. i18n walk.mine + add.* + walk.whoAdd across 39 locales.
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
