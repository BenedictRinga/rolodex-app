// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  rolodexApiBase: 'https://zyppar.com/api/rolodex', // dev builds must type-check too (IDE-caught TS2339)
  version: '0.3.1', // RolodexAI app version — compared against /api/updates/check
  build: 19, // 2026-08-19 integer build counter — increments with each release
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
