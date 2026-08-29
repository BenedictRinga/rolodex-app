export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 150, // 2026-08-29 CARD SPEAKS FIRST: deep-link sends (SMS/WhatsApp/Email) resolve the number from the matched contact card before ever prompting - the typed phone alert is now only for contacts with no card and no saved handle, and even then opens prefilled; handle is remembered on the loop either way
};
