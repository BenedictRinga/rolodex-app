import { platformBrowser } from '@angular/platform-browser';
import { Injector, INJECTOR } from '@angular/core';

import { AppModule } from './app/app.module';
import { environment } from 'src/environments/environment';

// 2026-08-16 FIX (two parts):
// 1. Bootstrap: platformBrowserDynamic (JIT) on an AOT bundle created the platform
//    through the compiler context — switched to the AOT-static platformBrowser().
// 2. THE REAL BLANK-SCREEN ROOT CAUSE: the production minifier transforms the
//    Injector class's static block into a private static arrow (`static #e = () =>
//    this.ɵprov = ...`) and DROPS its invocation — so Injector.ɵprov, .NULL and
//    .THROW_IF_NOT_FOUND never exist in the minified bundle. Two failures:
//    (a) the tree-shakable 'any' resolution -> "No provider for Injector" at the
//    platform creation; (b) after that's bypassed, `Injector.NULL` is undefined
//    -> component creation crashes. Fix: restore the statics + provide the token
//    explicitly (resolved from the internal INJECTOR token, which the R3Injector
//    always records) — bypassing the broken tree-shakable path entirely.
const INJECTOR_ANY = Injector as any;
if (typeof INJECTOR_ANY.NULL === 'undefined') {
  const THROW = Symbol('THROW_IF_NOT_FOUND');
  INJECTOR_ANY.THROW_IF_NOT_FOUND = THROW;
  INJECTOR_ANY.NULL = {
    get(token: unknown, notFoundValue?: unknown) {
      if (notFoundValue === THROW) {
        throw new Error(`NullInjectorError: No provider for ${String(token)}!`);
      }
      return notFoundValue;
    },
  };
  INJECTOR_ANY.__NG_ELEMENT_ID__ = -1;
}
platformBrowser([
  { provide: Injector, useFactory: (injector: unknown) => injector, deps: [INJECTOR] },
]).bootstrapModule(AppModule)
  .then(() => {
    // 2026-08-20 ZYPPAR-STYLE PWA: register the one service worker so the app
    // becomes installable (manifest + SW with a fetch handler are the Chrome
    // install criteria). The SW is a passthrough; updates clear it fully.
    if (environment.production && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('custom-sw.js').catch(() => {});
      });
    }
  })
  .catch(err => !environment.production && console.log(err));
