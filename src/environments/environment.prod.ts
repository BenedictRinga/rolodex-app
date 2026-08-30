export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 155, // 2026-08-30 DEMO ISOLATION (founder: demo contacts must be excluded from every result or process when Demo is off): toggling demo OFF now purges every artifact it fed - loops minted from demo cards are removed (sourceContactId match), relationship scores and birthday lists are cleared, the automation re-sweep clears managed demo follow-up events and reschedules real-only ones, and the notification debounce batch checks liveness against storage so a deleted event can never ring; every rolodexSync.push site is real-only (10 sites) - demo never leaves the device
};
