export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 151, // 2026-08-29 NUDGE TAP ANSWERS: tapping a check-in prompt now audibly and visibly responds - chime at the tap, a Reaching-out toast naming the destination, and after the inbox opens the view travels to the armed loop (presentResponse made public for the home page)
};
