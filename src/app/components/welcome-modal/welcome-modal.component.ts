import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
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
  kicker: string;
  title: string;
  copy: string;
  /** 2026-08-19 optional bold "SURPRISE" callout, separated from the main copy. */
  surprise?: string;
  /** 2026-08-20 optional bold/larger emphasis line, detached from the copy. */
  emphasis?: string;
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
      kicker: 'Karibu sana!',
      title: 'LoopKeeper — close the loop you keep meaning to close',
      copy: 'Start with one person you keep meaning to text. Set the rhythm. Close the loop.',
      surprise: 'SURPRISE — a surprise is waiting at the end of this demo.',
    },
    {
      id: 'card',
      kicker: '01 · The card',
      title: 'The card is everything',
      copy: 'Every person you keep meaning to reach is a card. Tap it — everything for that one person lives there. Start with the few who matter most; add more as you close the current.',
    },
    {
      id: 'loopmotto',
      kicker: '02 · The promise',
      title: 'No more "I keep meaning to"',
      copy: 'Every missed reply starts the same way: "I keep meaning to." LoopKeeper catches that thought before it cools — it reads the deep context, surfaces the person you owe, and hands you the words while the moment is still warm. The loop closes before the fire goes cold.',
    },
    {
      id: 'fourws',
      kicker: '03 · The 4 W\u2019s',
      title: 'The deep context',
      copy: 'Who, What, Where, When — the story behind every card, the briefing that powers everything after this: the follow-ups, the signals, the drafts.',
    },
    {
      id: 'followup',
      kicker: '04 · The loop',
      title: 'The follow-up engine',
      copy: 'It reads the deep context and schedules the check-ins you keep meaning to make, surfacing who you owe a reply — the small loops caught before they go cold.',
      emphasis: 'You no longer forget. You no longer delay. You no longer postpone.',
    },
    {
      id: 'confidante',
      kicker: '05 · The assistant',
      title: 'The AI drafts — you hit Send',
      copy: 'The Assistant digs up your context and writes the message in your own voice. No more drafting at midnight, no more wondering what to say. Pick the engine LoopKeeper uses - its own, DeepSeek or Grok - in Settings. All you do is hit Send.',
    },
    {
      id: 'storage',
      kicker: '06 · Your data',
      title: 'Where your essentials live',
      copy: 'Your cards stay where you put them.',
    },
    {
      id: 'pricing',
      kicker: '07 · The tiers',
      title: 'Basic $1 · Assistant $5',
      copy: 'Basic catches five loops a month. Assistant catches them all. Billing lives in Settings.',
    },
    {
      id: 'outro',
      kicker: 'You\u2019re set',
      title: 'That\u2019s the tour — it\u2019s all live',
      copy: "You're set. Pick your first person — we'll start there. Replay this demo any time from Settings → Welcome Again.",
    },
    {
      id: 'taste',
      kicker: 'The surprise',
      title: 'Let us solve a real LOOP problem — right now',
      copy: 'Pick the first person you keep meaning to text. We work through that one, together. We compose the message, and once ready, you send.',
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
    ) {}

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
    if (this.isReplay) this.steps[0].kicker = 'Welcome Again';
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
    this.currentStepMs = this.stepMsFor(step);
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
    const raw = `${step.kicker}. ${step.title}. ${step.copy}${step.emphasis ? ' ' + step.emphasis : ''}`;
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
        allowDeviceFallback ? 'Audio hiccup — trying device voice…' : 'Narration audio failed — tap Play to retry',
        3500
      );
    }
    if (this.backendTtsOk === false && allowDeviceFallback) {
      await this.playback.speakDeviceFirst(text, 'en-US');
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
