export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 116, // 2026-08-27 CHOICE-FIRST CALENDAR (founder doctrine): nothing auto-writes to the device calendar - appointments/reminders offer Save + calendar at creation (three-button alerts + form checkbox, remembered default), received invites ask at arrival; discrete default = LoopKeeper only; 7 cal.* keys x 39 locales
};
