export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 156, // 2026-08-30 HONEST CAPTIONS (founder: ambiguous labels do not fit the bill): every metric on the investor portal and About page now says exactly what it counts - Contact-sync devices / Synced in last 24h (sync fires only on contact changes, never app opens), timeline note explains quiet bars mean no contact edits not no users, activation table explains Devices = all-time distinct organic devices and why Added a card can honestly read 0 (invite-born cards never fire card_added), top-events note states the 7d window + organic-only + rows-list-what-fired semantics; a stray </div> from the activation caption edit was caught and removed (div balance verified 219/219)
};
