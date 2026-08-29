// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 152, // 2026-08-29 GROWTH VOICE + STANDING FULCRUM: shares tracked by voice/channel, invite funnel timed created-landed-accepted by the anonymous 48h token, share-voice switcher in Settings (Auto-A-B-C with preview), voiceB de-ambiguated (no more dating-site misread), nudge_tapped event; the Loops fulcrum is STANDING again (pills - fulcrum - input at all times, question form "Something sitting? Something gnawing?" when loops wait) - it had been empty-state-gated since build 87; investors portal gains shares/funnel KPIs and a per-voice comparative table; i18n x39 (519 keys)
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
