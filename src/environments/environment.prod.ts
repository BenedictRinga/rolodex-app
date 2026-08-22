export const environment = {
  production: true,
  rolodexApiBase: 'https://zyppar.com/api/openloop', // the fresh rolodex sync backend (same droplet)
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 57, // 2026-08-22 LoopKeeper share URL moved to zyppar.com/loopkeeper/ (clean path, own OG image); build:prod base-href /loopkeeper/
};
