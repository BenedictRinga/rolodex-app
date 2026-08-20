import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { StorageService } from '../../services/storage/storage.service';
import { StudioPlaybackService } from '../../services/studio-playback/studio-playback.service';
import { TextsplitterService } from '../../services/textsplitter/textsplitter.service';
import { Capacitor } from '@capacitor/core';


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
      title: 'RolodexAI — your contacts, in motion',
      copy: 'The rolodex that closes the tiny loops: flip a card, keep in touch, and let the confidential secretary do the hard 90%.',
      surprise: 'SURPRISE — a surprise is waiting at the end of this demo.',
    },
    {
      id: 'card',
      kicker: '01 · The card',
      title: 'The card is everything',
      copy: 'Every person is a card. Tap it and it flips — chat, call, email, reminders and the Confidante live right there on the person.',
    },
    {
      id: 'loopmotto',
      kicker: '02 · The promise',
      title: 'No more "I keep meaning to"',
      copy: 'Every missed reply starts the same way: "I keep meaning to." RolodexAI catches that thought before it cools — it reads the deep context, surfaces the person you owe, and hands you the words while the moment is still warm. The loop closes before the fire goes cold.',
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
      id: 'signal',
      kicker: '05 · The signal',
      title: 'They always know',
      copy: 'Send a message and the other card badges it. Fix an appointment and the other card catches it — with a toast and receipts: sent → delivered → read, live across devices.',
    },
    {
      id: 'confidante',
      kicker: '06 · The confidante',
      title: 'The AI drafts — you hit Send',
      copy: 'The confidential secretary digs up your context and writes the message in your own voice. No more drafting at midnight, no more wondering what to say. Pick the engine Rolodex uses - its own, DeepSeek or Grok - in Settings. All you do is hit Send.',
    },
    {
      id: 'pods',
      kicker: '07 · Pods',
      title: 'Pods, not chatrooms',
      copy: 'Group threads grow straight from your groups — one pod for the people who share your life, with a shared schedule and reminders.',
    },
    {
      id: 'storage',
      kicker: '08 · Your data',
      title: 'Where your contacts live',
      copy: 'Device, Cloud (Dropbox · Drive · OneDrive), or the Rolodex Server — your trust level, your choice. Demo room codes link devices live.',
    },
    {
      id: 'pricing',
      kicker: '09 · The tiers',
      title: 'Basic $1 · Confidante $5',
      copy: 'Basic gives you the Assistant — 5 AI interventions a month, a taste. Confidante lets the AI work all month. Billing lives in Settings.',
    },
    {
      id: 'outro',
      kicker: 'You\u2019re set',
      title: 'That\u2019s the tour — it\u2019s all live',
      copy: 'You never forget again. You never delay again. You never postpone again. Tap through the app, or replay this demo any time from Settings → Welcome Again.',
    },
    {
      id: 'taste',
      kicker: 'The surprise',
      title: 'Let us solve a real LOOP problem — right now',
      copy: 'Pick three of your most difficult, postponed communications. We work through the first one, together. We compose the message, and once ready, you send.',
    },
  ];

  stepIndex = 0;
  autoPlay = true;
  /** 2026-08-20 BROWSER TTS: narrate each card while it is on screen.
   *  DEFAULT OFF: browsers block speech without a user gesture. Starting muted
   *  makes the user notice the 🔊 control and tap it — the tap is the gesture
   *  that unlocks audio reliably on mobile. */
  narrate = false;
  get speechSupported(): boolean {
    return Capacitor.isNativePlatform() ||
      (typeof window !== 'undefined' && 'speechSynthesis' in window);
  }
  currentStepMs = this.STEP_MS;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly modalController: ModalController,
    private readonly storageService: StorageService,
    private readonly playback: StudioPlaybackService,
    private readonly textsplitter: TextsplitterService,
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
    this.restartTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.stopSpeech();
  }

  next(): void {
    if (!this.isLast) {
      this.stepIndex++;
      this.restartTimer();
    }
  }

  prev(): void {
    if (!this.isFirst) {
      this.stepIndex--;
      this.restartTimer();
    }
  }

  goTo(i: number): void {
    this.stepIndex = Math.min(this.steps.length - 1, Math.max(0, i));
    this.restartTimer();
  }

  toggleAuto(): void {
    this.autoPlay = !this.autoPlay;
    if (this.autoPlay) {
      this.restartTimer();
    } else {
      this.clearTimer();
    }
  }

  /** 2026-08-20 One full show, then stop on the last slide so it never loops
   *  forever. Each step's dwell is sized to its narration (longer copy → more
   *  time to absorb), not a fixed metronome. */
  private restartTimer(): void {
    this.clearTimer();
    if (!this.autoPlay) return;
    const step = this.steps[this.stepIndex];
    this.currentStepMs = this.stepMsFor(step);
    this.speakStep(step);
    this.timer = setTimeout(() => {
      if (this.isLast) {
        this.autoPlay = false;
        this.clearTimer();
        return;
      }
      this.stepIndex++;
      this.restartTimer();
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

  /** Narrates the current card using the transplanted Studio device-TTS path
   *  (speakDeviceFirst — Capacitor native → chunked web speech, NO remote),
   *  with the transplanted TextsplitterService handling pronunciation. */
  private speakStep(step: WelcomeDemoStep): void {
    if (!this.narrate || !this.speechSupported) return;
    const raw = `${step.kicker}. ${step.title}. ${step.copy}${step.emphasis ? ' ' + step.emphasis : ''}`;
    const text = this.textsplitter.preprocessForTTS(raw, 'All');
    void this.playback.speakDeviceFirst(text, 'en-US');
  }

  private stopSpeech(): void {
    this.playback.stopSpeech();
  }

  toggleNarrate(): void {
    this.narrate = !this.narrate;
    this.restartTimer();
  }

  /** Primary CTA — dismiss with role 'start'; HomePage opens the live tour.
   *  2026-08-19 FIX: dismiss(data, role) — the role must be the SECOND arg,
   *  or HomePage's onDidDismiss() sees role='close' and the navigation dies. */
  start(): void {
    void this.modalController.dismiss(null, 'start');
  }

  /** 2026-08-19 THE TASTE: Let's go → HomePage opens Chat with RolodexAI in
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
