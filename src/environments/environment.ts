// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 120, // 2026-08-28 GLM ENGINE + LANGUAGE DROPDOWN: third AI engine via OpenRouter (ai-settings gains GLM; chat ladder DeepSeek > Grok > GLM); Russian, Hebrew, Spanish, Portuguese-Brazil join the language dropdown; ai.engineGlm key x 39 locales
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
