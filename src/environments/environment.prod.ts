export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 159, // 2026-08-31 THE MINE DOOR (founder): a first-timer walks a demo name all the way to the Send stage, where a big rounded MINE tile waits (styled like the Who card, + glyph, translated sub-line). Tap = elegant reset to slide 1, then their own device Contact Picker (add sheet where the picker does not exist); the pick lands as the Who card, past the fresh-pick sort trap. Add sheet + toasts translated (loopkeeper.add.*). device_list_started fires once ever per device at the first real card (walk confirm / picker / manual / invite) -> server activation row "Started their list" + Investors portal row. Empty deck (Demo OFF) gets its own teal door (whoAdd) to the same picker - no dead-end text. i18n walk.mine + add.* + walk.whoAdd across 39 locales.
};
