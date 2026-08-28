export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 121, // 2026-08-28 SAMPLE GUARD + SCROLLABLE LANG POPOVER: the three capture samples ("Promised Tunde...") now FAIL when present verbatim - no loop, no event, no nudges; tapping a sample prefills the box for editing instead of capturing; language popover (15 entries) caps height and scrolls
};
