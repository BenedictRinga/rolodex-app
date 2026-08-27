export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 115, // 2026-08-27 CALENDAR SYNC: appointments + reminders write through to the device calendar (Android=Google via the phone's account sync; web gets .ics download); week agenda (next 7 days) in Reminders; received card-to-card invites finally land on card + calendar (appointment$ consumed); 6 cal.* keys x 39 locales
};
