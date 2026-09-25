// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper BASE PAIR — the DISPLAYED version composes as 0.3.<build> (updates.service composeVersion, build 263)
build: 339, // 2026-09-25 BUILD 339 THE DOOR THAT CLOSES + THE WELCOME VOICE, VERBATIM (founder: Looptionary works but does not close when tapped to dismiss. Audio does not come out also when clicked + the correction: No inventing - look for exactly how Welcome modal/slides handled audio playback). (1) THE DISMISS: with modalController.create() nobody listens to component Outputs - the (close) emit floated into the void and the X stayed dead. The component now dismisses ITSELF (the injected ModalController; closeModal() on the X; emitClose kept). (2) THE VOICE, THE REAL CAUSE: the 338 speak() rode ONLY the device tier (speakDeviceFirst) - but the Welcome NEVER speaks that way. The Welcome path, now mirrored verbatim: the tap grants audio by the audio-command-first order (playback.stop(), beginLoading(), primeGesturePermission()) BEFORE the ask; then MP3-FIRST - POST /tts with the selected qwen voice (VoiceOptions.selectedVoiceId when it starts with qwen-, else qwen-echo), 12s abort, playback.playBlob(blob); the DEVICE voice is tier 2 ONLY when the backend is dead (501/timeout), with the Welcome own once-per-streak toast (welcome.ttsHiccup); the text rides the SAME preprocessForTTS(raw, All) the Welcome runs. The earlier prime+predicate guesses remain (the stale cancel predicate clear), but the true silence was the missing MP3 tier and the missing priming - exactly what the founder suspected with no inventing. MEASURED: typecheck clean; prod clean; base href /loopkeeper/; build:339 in main (1). DEPLOY: app www 232-339 (server unchanged). Previous: build: 338, // 2026-09-25 BUILD 338 THE LOOP-TIONARY + THE CHAT VOICES
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
