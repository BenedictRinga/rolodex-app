export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 149, // 2026-08-29 LOCALE SIGNALS: anonymous IANA timezone + region + language subtags ride app_launch and session_start, and every deliberate language switch emits lang_switched (no IP, no geolocation, aggregate only); investors portal gains a where-in-the-world block (regions x languages table + switch count)
};
