export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 114, // 2026-08-27 CHAT CHAT-STRING GUARD + FULL-SCREEN EDIT: [object Object] killed at every ingress + self-healing thread scrub; contact edit/create is a true full-screen modal (no sheet-drag jerk); empty three-dots commented out; meter hint0 wording; card-back row rhythm
};
