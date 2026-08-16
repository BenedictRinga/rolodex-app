import { platformBrowser } from '@angular/platform-browser';

import { AppModule } from './app/app.module';

// 2026-08-16 FIX: the bootstrap was platformBrowserDynamic (JIT) on an AOT-built
// production bundle. In Angular 18 the dynamic path creates the platform through
// the compiler's injector context, where the Injector 'any' provider cannot
// resolve -> "R3InjectorError(Platform: core)[PlatformRef -> Injector]: No
// provider for Injector" at boot (blank screen in the browser). The AOT-static
// platformBrowser() bootstrap is the supported pattern for AOT builds and fixes
// the platform DI chain.
platformBrowser().bootstrapModule(AppModule)
  .catch(err => console.log(err));
