export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
build: 157, // 2026-08-30 THE SEND WALK (founder): the Loops tab's DEFAULT surface is now a 4-slide walk for the chronic prevaricator - Who (engine picks + full device contacts deck) / What (chips from card truth: owed reply, promise, check-in - plus one optional line) / Words (engine draft, 4 tones, polish, my-own-words) / One tap (WhatsApp door, call door with 20-second plan, universal Copy door, SMS/email under More ways; clipboard always rides); send IS the close - completion chime + Off-your-mind slide + Next one; the full shelf is PACKED not deleted behind the quiet "I'm good" toggle (persisted loopkeeper_loops_surface, default walk), the shelf answers with "Smooth"; nudges route through inbox.nudgeArrived so an armed loop opens straight at the words; engine gains 'call' (tel:) + 'copy' (clipboard-only) channels; analytics unchanged - walk fires loop_captured exactly once per capture (parseCapture + create directly), message_sent/loop_closed on fire; i18n: 42 walk.* keys x 39 locales, 13 majors hand-translated
};
