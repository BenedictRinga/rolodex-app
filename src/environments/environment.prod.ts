export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 119, // 2026-08-28 TESTER RECRUITING (founder): deeplink tester.html + dashboard shipped as static assets; app absorbs ?t=<6-digit code> and tags every analytics event with the numeric testerId; new events loop_captured + confidante_message + feedback_sent; feedback POST carries testerId
};
