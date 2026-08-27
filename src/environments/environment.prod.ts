export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 112, // 2026-08-27 HONEST GAUGE: welcome storyboard meter slide (OEM dead-end vs one capture); wedge drafts now in the user's language (owed-reply/check-in/promise/coffee, short tone)
};
