import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // 2026-08-26 BRAND MIGRATION: OpenLoop -> LoopKeeper (pre-store, last free window).
  appId: 'com.zyppar.loopkeeper',
  appName: 'LoopKeeper',
  webDir: 'www-native', // 2026-08-17: native builds live here; www/ stays the PWA
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#FAF8F5',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
