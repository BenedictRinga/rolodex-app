import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from '../../services/storage/storage.service';
import { StudioPlaybackService } from '../../services/studio-playback/studio-playback.service';
import { TextsplitterService } from '../../services/textsplitter/textsplitter.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { VoiceOptionsService } from '../../services/voice-options/voice-options.service';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';


export const WELCOME_DISMISSED_KEY = 'rolodex_welcome_dismissed';

export interface WelcomeDemoStep {
  id: string;
  /**
   * 2026-08-27 i18n: the four copy fields now hold TRANSLATE KEYS
   * (loopkeeper.welcome.<id>.*), not English text. The template pipes them;
   * stepTexts() resolves them for dwell-sizing and TTS narration so the
   * storyboard translates like every other user-facing comms surface.
   */
  kicker: string;
  title: string;
  copy: string;
  /** 2026-08-19 optional bold "SURPRISE" callout, separated from the main copy. */
  surprise?: string;
  /** 2026-08-20 optional bold/larger emphasis line, detached from the copy. */
  emphasis?: string;
  /**
   * 2026-09-14 BUILD 195 THE LOCAL GREETING: when the device's timezone maps
   * to one of OUR translation languages, the kicker becomes that locale's own
   * line, fetched from its i18n file — a RAW string, rendered as-is (the
   * template prefers it over the translate-piped key).
   */
  kickerRaw?: string;
}

/**
 * 2026-08-17 WELCOME AGAIN — the visual demo.
 *
 * Shows on init (unless the user turned it off via "Don't show this again"
 * or Settings > Welcome Again): a narrated, animated tour of what Rolodex
 * is and how to use it. Every "screen" is drawn in CSS — the demo needs no
 * data, no app state, and no live UI, so it can run anywhere, anytime.
 *
 * Public surface is unchanged: WELCOME_DISMISSED_KEY, start(), close() and
 * dontShowAgain() behave exactly as before, so nothing else in the app had
 * to move. Dismissing with role 'start' hands off to the live feature tour.
 */
@Component({
  selector: 'app-welcome-modal',
  templateUrl: './welcome-modal.component.html',
  styleUrls: ['./welcome-modal.component.scss'],
  standalone: false,
})
export class WelcomeModalComponent implements OnInit, OnDestroy {
  /** 2026-08-17: first visit greets 'Karibu sana!' — the replay says 'Welcome Again'. */
  @Input() isReplay = false;

  /** Seconds per step — the progress bar matches via STEP_MS. */
  readonly STEP_MS = 8000;

  steps: WelcomeDemoStep[] = [
    {
      id: 'intro',
      kicker: 'loopkeeper.welcome.intro.kicker',
      title: 'loopkeeper.welcome.intro.title',
      copy: 'loopkeeper.welcome.intro.copy',
      surprise: 'loopkeeper.welcome.intro.surprise',
    },
    {
      id: 'card',
      kicker: 'loopkeeper.welcome.card.kicker',
      title: 'loopkeeper.welcome.card.title',
      copy: 'loopkeeper.welcome.card.copy',
      emphasis: 'loopkeeper.welcome.card.emphasis',
    },
    {
      id: 'loopmotto',
      kicker: 'loopkeeper.welcome.loopmotto.kicker',
      title: 'loopkeeper.welcome.loopmotto.title',
      copy: 'loopkeeper.welcome.loopmotto.copy',
      // 2026-08-28 BUILD 132 THE ZEIGARNIK WHISPER: psychology's honest word
      // for what open loops do to a mind — and the quiet promise that closing
      // them is health, relationships, business. Not a lecture. One breath.
      emphasis: 'loopkeeper.welcome.loopmotto.emphasis',
    },
    {
      id: 'fourws',
      kicker: 'loopkeeper.welcome.fourws.kicker',
      title: 'loopkeeper.welcome.fourws.title',
      copy: 'loopkeeper.welcome.fourws.copy',
      // 2026-08-28 BUILD 125 SUBLIMINAL BEDROCK: the secretary's whisper —
      // the more background it holds, the better it writes for you.
      emphasis: 'loopkeeper.welcome.fourws.emphasis',
    },
    {
      // 2026-08-27 THE HONEST GAUGE: prepare the user for the Loop-O-meter —
      // and for the truth that absent their input, the app is just another
      // contacts app (the one their phone already has).
      // 2026-09-15 BUILD 206 (founder): slides 5-8 (followup, meter,
      // confidante, storage) LEAVE the tour - they become the MANAGING CARDS
      // modal, shown inside the user's first attempt to add a contact or
      // build a card (home.onCreateContact gate). The tour keeps the brand
      // arc: intro, card, loopmotto, fourws, outro, taste.
      id: 'outro',
      kicker: 'loopkeeper.welcome.outro.kicker',
      title: 'loopkeeper.welcome.outro.title',
      copy: 'loopkeeper.welcome.outro.copy',
      emphasis: 'loopkeeper.welcome.outro.emphasis',
    },
    {
      id: 'taste',
      kicker: 'loopkeeper.welcome.taste.kicker',
      title: 'loopkeeper.welcome.taste.title',
      copy: 'loopkeeper.welcome.taste.copy',
      surprise: 'loopkeeper.welcome.taste.surprise',
    },
  ];

  stepIndex = 0;
  /** 2026-08-21: slides do NOT auto-start. The user taps Play; that same tap
   *  primes audio first (stop → beginLoading → primeGesturePermission), then the
   *  timer starts — audio command before slides so they stay in sync. */
  autoPlay = false;
  /** 2026-08-20 BROWSER TTS: narrate each card while it is on screen.
   *  DEFAULT OFF: browsers block speech without a user gesture. Starting muted
   *  makes the user notice the 🔊 control and tap it — the tap is the gesture
   *  that unlocks audio reliably on mobile. */
  narrate = false;
  /** 2026-08-21: once the user taps 🔊, every timer-advanced step is allowed
   *  to speak too — previously only the tapped step spoke and the rest went
   *  silent because auto-advance passed allowDeviceFallback=false. */
  private deviceFallbackGranted = false;
  /** 2026-08-21 FLOATING AUDIO BUTTON: hidden normally; appears centered in the
   *  animation window when playback reports userInteractionRequired (NotAllowed
   *  or speech not-allowed). Off state first; tap enables audio, then fades. */
  audioUnlockVisible = false;
  audioUnlockActive = false;
  private unsubscribeUserInteraction?: () => void;
  get speechSupported(): boolean {
    return Capacitor.isNativePlatform() ||
      (typeof window !== 'undefined' && 'speechSynthesis' in window);
  }
  currentStepMs = this.STEP_MS;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** null = not tried, true = /tts returned audio, false = 501 (use device TTS on tap only). */
  private backendTtsOk: boolean | null = null;
  /** 2026-08-21: one visible notice per failed streak — no toast spam per slide. */
  private ttsErrorNotified = false;

  constructor(private readonly modalController: ModalController,
    private readonly storageService: StorageService,
    private readonly playback: StudioPlaybackService,
    private readonly textsplitter: TextsplitterService,
    private readonly alerts: AlertsService,
    private readonly voiceOptions: VoiceOptionsService,
    private readonly translate: TranslateService,
    ) {}

  /**
   * 2026-08-27 i18n: resolve a step's key fields into display/narration text.
   * Dwell sizing and TTS both consume this — they must narrate WORDS, never
   * the raw loopkeeper.welcome.* keys.
   */
  private stepTexts(step: WelcomeDemoStep): WelcomeDemoStep {
    const t = (k?: string) => (k ? this.translate.instant(k) : k);
    return {
      ...step,
      // BUILD 195: a timezone-picked raw greeting wins over the piped key.
      kicker: (step.kickerRaw ?? t(step.kicker)) as string,
      title: t(step.title) as string,
      copy: t(step.copy) as string,
      emphasis: t(step.emphasis),
      surprise: t(step.surprise),
    };
  }

  /**
   * 2026-09-14 BUILD 195 THE LOCAL GREETING (founder: configure "Karibu sana!"
   * to appear in any one of our translation languages dependent on where in
   * the world the phone is). NO IP, NO geolocation API — the DEVICE CLOCK is
   * the geography: the IANA zone's city maps to one of OUR 39 translation
   * locales, that locale's own i18n file supplies its translated greeting for
   * the first slide's kicker, and the rest of the tour stays in the user's
   * chosen language. A phone in Nairobi reads "Karibu sana!", a phone in
   * Paris reads our French line — the multilingual hook on the very first
   * thing a new device sees. Fallbacks: device language → current behaviour.
   */
  private static readonly GREET_CITY_TO_LOCALE: Record<string, string> = {
    // East Africa — the Swahili home; Karibu keeps its throne here.
    nairobi: 'sw', mombasa: 'sw', kisumu: 'sw', nakuru: 'sw', eldoret: 'sw',
    dar_es_salaam: 'sw', dodoma: 'sw', zanzibar: 'sw', kampala: 'sw', kigali: 'sw',
    // West Africa
    lagos: 'yo', ibadan: 'yo', abuja: 'yo', kano: 'ha', maiduguri: 'ha',
    enugu: 'ig', aba: 'ig', dakar: 'fr', abidjan: 'fr', kinshasa: 'fr', lubumbashi: 'fr',
    accra: 'en',
    // North
    cairo: 'ar', casablanca: 'ar', riyadh: 'ar', dubai: 'ar', doha: 'ar',
    abu_dhabi: 'ar', amman: 'ar', 'al_jizah': 'ar', tel_aviv: 'he',
    addis_ababa: 'am', mogadishu: 'so', harare: 'sn', bulawayo: 'sn',
    // Europe
    paris: 'fr', lyon: 'fr', marseille: 'fr', brussels: 'fr', geneva: 'fr', montreal: 'fr',
    madrid: 'es', barcelona: 'es', valencia: 'es', berlin: 'de', munich: 'de',
    hamburg: 'de', vienna: 'de', zurich: 'de', frankfurt: 'de',
    rome: 'it', milan: 'it', naples: 'it', turin: 'it',
    amsterdam: 'nl', rotterdam: 'nl', utrecht: 'nl',
    warsaw: 'pl', krakow: 'pl', stockholm: 'sv', copenhagen: 'da',
    oslo: 'nb_NO', bergen: 'nb_NO', athens: 'el', moscow: 'ru',
    saint_petersburg: 'ru', kyiv: 'ua', kiev: 'ua', istanbul: 'tr', ankara: 'tr',
    // The Americas
    new_york: 'en', los_angeles: 'en', chicago: 'en', toronto: 'en',
    mexico_city: 'es', guadalajara: 'es', bogota: 'es', medellin: 'es',
    lima: 'es', santiago: 'es', quito: 'es', caracas: 'es',
    buenos_aires: 'es', montevideo: 'es',
    sao_paulo: 'pt-br', rio_de_janeiro: 'pt-br', brasilia: 'pt-br', lisbon: 'pt-PT',
    // Asia-Pacific
    mumbai: 'hi', delhi: 'hi', kolkata: 'hi', bangalore: 'hi',
    manila: 'fil', quezon_city: 'fil',
    tokyo: 'ja', osaka: 'ja', beijing: 'zh-cmn-Hans', shanghai: 'zh-cmn-Hans',
    shenzhen: 'zh-cmn-Hans', guangzhou: 'zh-cmn-Hans', hong_kong: 'zh-cmn-Hant',
    taipei: 'zh-cmn-Hant', bangkok: 'th', jakarta: 'en', kuala_lumpur: 'en',
    johannesburg: 'af', cape_town: 'af', durban: 'af', pretoria: 'af',
  };

  private greetLocaleFor(): string | null {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const city = (tz.split('/')[1] || '').toLowerCase();
      if (city && WelcomeModalComponent.GREET_CITY_TO_LOCALE[city]) {
        return WelcomeModalComponent.GREET_CITY_TO_LOCALE[city];
      }
      // Fallback: the device language, when we ship it.
      const lang = String(navigator.language || '').toLowerCase().split('-')[0];
      const shipped = ['af', 'am', 'ar', 'bs', 'by', 'da', 'de', 'el', 'es', 'fil', 'fr',
        'ha', 'he', 'hi', 'ig', 'it', 'ja', 'nl', 'pl', 'ru', 'sk', 'sl', 'sn', 'so',
        'sv', 'th', 'tr', 'ua', 'yo'];
      if (shipped.includes(lang)) return lang;
      if (lang === 'pt') return 'pt-PT';
      if (lang === 'zh') return 'zh-cmn-Hans';
      if (lang === 'nb') return 'nb_NO';
      if (lang === 'en') return null; // EN keeps the Karibu flourish as-is
    } catch { /* no geography, no greeting change */ }
    return null;
  }

  /** Fetch OUR translation file for the greet locale and take its own line. */
  private async applyLocaleGreeting(): Promise<void> {
    if (this.isReplay) return; // the replay keeps its kicker
    try {
      const locale = this.greetLocaleFor();
      if (!locale || locale === this.translate.currentLang) return;
      const res = await fetch(`./assets/i18n/${locale}.json`);
      if (!res.ok) return;
      const dict = await res.json();
      const line = dict?.loopkeeper?.['welcome.intro.kicker'];
      if (typeof line === 'string' && line.trim()) {
        this.steps[0].kickerRaw = line; // raw translated text; kicker stays a key
      }
    } catch { /* keep the current-language greeting */ }
  }

  get isFirst(): boolean {
    return this.stepIndex === 0;
  }

  get isLast(): boolean {
    return this.stepIndex === this.steps.length - 1;
  }

  /** 2026-08-19 THE TASTE: the final "surprise" card that starts the guided loop. */
  get isTaste(): boolean {
    return this.steps[this.stepIndex]?.id === 'taste';
  }

  ngOnInit(): void {
    // 2026-08-17: first visit greets Karibu sana!; the replay says Welcome Again.
    // 2026-08-27 i18n: both greetings are keys now.
    if (this.isReplay) this.steps[0].kicker = 'loopkeeper.welcome.intro.kickerReplay';
    // 2026-09-14 BUILD 195: the greeting meets the world — the kicker renders
    // in one of OUR translation languages, picked by the device's timezone.
    void this.applyLocaleGreeting();
    // 2026-08-21: listen for the browser demanding a tap before audio — that is
    // when the floating audio button appears (off state) in the animation window.
    this.unsubscribeUserInteraction = this.playback.onUserInteractionRequired(() => {
      this.audioUnlockVisible = true;
      this.audioUnlockActive = false;
    });
    this.restartTimer();
  }

  ngOnDestroy(): void {
    this.unsubscribeUserInteraction?.();
    this.clearTimer();
    this.stopSpeech();
  }

  next(): void {
    if (!this.isLast) {
      this.stepIndex++;
      this.restartTimer(true);
    }
  }

  prev(): void {
    if (!this.isFirst) {
      this.stepIndex--;
      this.restartTimer(true);
    }
  }

  goTo(i: number): void {
    this.stepIndex = Math.min(this.steps.length - 1, Math.max(0, i));
    this.restartTimer(true);
  }

  /** 2026-08-21: Play = audio command FIRST (stop → beginLoading → prime),
   *  then the slides start. The same tap grants audio; no separate 🔊 needed
   *  unless the browser later demands another gesture (floating button). */
  async toggleAuto(): Promise<void> {
    this.autoPlay = !this.autoPlay;
    if (this.autoPlay) {
      this.deviceFallbackGranted = true;
      this.narrate = true;
      this.playback.stop();
      this.playback.beginLoading();
      await this.playback.primeGesturePermission();
      this.restartTimer(true);
    } else {
      this.stopSpeech();
      this.clearTimer();
    }
  }

  /** 2026-08-20 One full show, then stop on the last slide so it never loops
   *  forever. Each step's dwell is sized to its narration (longer copy → more
   *  time to absorb), not a fixed metronome. */
  private restartTimer(allowDeviceFallback = false): void {
    this.clearTimer();
    if (!this.autoPlay) return;
    const step = this.steps[this.stepIndex];
    this.currentStepMs = this.stepMsFor(this.stepTexts(step));
    void this.speakStep(step, allowDeviceFallback);
    this.timer = setTimeout(() => {
      if (this.isLast) {
        this.autoPlay = false;
        this.clearTimer();
        return;
      }
      this.stepIndex++;
      // Once the user granted audio (tapped 🔊,), keep narrating every step.
      this.restartTimer(this.deviceFallbackGranted);
    }, this.currentStepMs);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Dwell time: narration-aware so the reader/listener actually absorbs it. */
  private stepMsFor(step: WelcomeDemoStep): number {
    if (!this.narrate || !this.speechSupported) return this.STEP_MS;
    const text = `${step.kicker} ${step.title} ${step.copy} ${step.emphasis || ''} ${step.surprise || ''}`;
    return Math.max(this.STEP_MS, text.length * 60 + 5000);
  }

  /** MP3-first (matches Zyppar StudioAudioBridge): try backend /tts with a
   *  short timeout, then device TTS only when the user granted audio. On mobile
   *  the primeGesturePermission() call in toggleNarrate unlocks the audio element
   *  so the MP3 can play after the network round-trip. */
  private async speakStep(step: WelcomeDemoStep, allowDeviceFallback = false): Promise<void> {
    if (!this.narrate || !this.speechSupported) return;
    const s = this.stepTexts(step); // 2026-08-27 i18n: narrate words, never keys
    const raw = `${s.kicker}. ${s.title}. ${s.copy}${s.emphasis ? ' ' + s.emphasis : ''}`;
    const text = this.textsplitter.preprocessForTTS(raw, 'All');
    if (this.backendTtsOk !== false) {
      try {
        const r = await this.fetchTtsWithTimeout(text);
        if (r.status === 501) {
          this.backendTtsOk = false;
        } else if (r.ok) {
          this.backendTtsOk = true;
          this.ttsErrorNotified = false;
          await this.playback.playBlob(await r.blob());
          return;
        } else {
          this.backendTtsOk = false;
        }
      } catch {
        this.backendTtsOk = false;
      }
    }
    // 2026-08-21 VISIBLE TTS ERRORS: one toast per failed streak, then fall back
    // to the device voice when the user already granted audio.
    if (this.backendTtsOk === false && !this.ttsErrorNotified) {
      this.ttsErrorNotified = true;
      void this.alerts.showToast(
        this.translate.instant(allowDeviceFallback
          ? 'loopkeeper.welcome.ttsHiccup'
          : 'loopkeeper.welcome.ttsFailed'),
        3500
      );
    }
    if (this.backendTtsOk === false && allowDeviceFallback) {
      // 2026-08-27 i18n: the device voice follows the interface language when a
      // matching voice exists; en-US stays the safety net.
      await this.playback.speakDeviceFirst(text, this.translate.currentLang || 'en-US');
    }
  }

  private async fetchTtsWithTimeout(text: string): Promise<Response> {
    const ctrl = new AbortController();
    // 12s: Piper CPU synthesis is live now and can take a few seconds per chunk;
    // short enough that a truly dead backend still hands over to device voice.
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const selected = this.voiceOptions.selectedVoiceId;
    const voice = selected?.startsWith('qwen-') ? selected : 'qwen-echo';
    try {
      return await fetch(`${environment.rolodexApiBase}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private stopSpeech(): void {
    this.playback.stop();
  }

  /** Floating audio button (only visible after a userInteractionRequired error):
   *  off → tap → audio comes ON with the tap (never before), then fades away. */
  async tapAudioUnlock(): Promise<void> {
    if (this.audioUnlockActive) return;
    this.audioUnlockActive = true;
    this.narrate = true;
    this.deviceFallbackGranted = true;
    this.playback.stop();
    this.playback.beginLoading();
    await this.playback.primeGesturePermission();
    await this.speakStep(this.steps[this.stepIndex], true);
    setTimeout(() => {
      this.audioUnlockVisible = false;
      this.audioUnlockActive = false;
    }, 1500);
  }

  /** Primary CTA — dismiss with role 'start'; HomePage opens the live tour.
   *  2026-08-19 FIX: dismiss(data, role) — the role must be the SECOND arg,
   *  or HomePage's onDidDismiss() sees role='close' and the navigation dies. */
  start(): void {
    void this.modalController.dismiss(null, 'start');
  }

  /** 2026-08-19 THE TASTE: Let's go → HomePage opens Chat with LoopKeeper in
   *  situation mode, and the surprise (the guided real-loop demo) begins. */
  startTaste(): void {
    void this.modalController.dismiss(null, 'taste');
  }

  /** The taste offer declined — just close, no nagging. */
  maybeLater(): void {
    void this.modalController.dismiss(null, 'later');
  }

  /** The off-switch: persists the dismissal key so the demo never shows again. */
  dontShowAgain(): void {
    try {
      void this.storageService.set(WELCOME_DISMISSED_KEY, '1'); // 2026-08-18 IndexedDB
    } catch { /* ignore */ }
    void this.modalController.dismiss(null, 'dismissed');
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
