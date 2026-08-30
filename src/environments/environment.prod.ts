export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 153, // 2026-08-30 NUDGE TAKES THE SCREEN: escalation leaves Settings (deck to regular view), pulls the home scroller to the top so the opened inbox leads the viewport, double-pass travel to the armed loop; the expanded shell retracts itself when the selected loop leaves the open lists (sent/closed/dropped/waiting) so the Search fab and deck toolbar are restored on every path; demo SHOW/STOP persistence re-verified (rolodex_demo_enabled)
};
