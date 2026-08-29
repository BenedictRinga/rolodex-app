export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 144, // 2026-08-29 THE LOOP CONVERSATION GETS A VOICE: capture chime + different response chime; shell expands to 80vh when a loop answers and scrolls to it; amber gap pulses; "Still open because"; steps map + after-send whisper; i18n x39 (509 keys)
};
