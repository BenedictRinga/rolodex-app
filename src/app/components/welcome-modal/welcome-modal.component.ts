import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

export const WELCOME_DISMISSED_KEY = 'rolodex_welcome_dismissed';

export interface WelcomeDemoStep {
  id: string;
  kicker: string;
  title: string;
  copy: string;
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
    },
    {
      id: 'card',
      kicker: '01 · The card',
      title: 'The card is everything',
      copy: 'Every person is a card. Tap it and it flips — chat, call, email, reminders and the confidante live right there on the person.',
    },
    {
      id: 'fourws',
      kicker: '02 · The 4 W\u2019s',
      title: 'The deep context',
      copy: 'Who, What, Where, When — the story behind every card, the briefing that powers everything after this: the follow-ups, the signals, the drafts.',
    },
    {
      id: 'followup',
      kicker: '03 · The loop',
      title: 'The follow-up engine',
      copy: 'It reads the deep context and schedules the check-ins you keep meaning to make, surfacing who you owe a reply — the small loops caught before they go cold.',
    },
    {
      id: 'signal',
      kicker: '04 · The signal',
      title: 'They always know',
      copy: 'Send a message and the other card badges it. Fix an appointment and the other card catches it — with a toast and receipts: sent → delivered → read, live across devices.',
    },
    {
      id: 'confidante',
      kicker: '05 · The confidante',
      title: 'The AI drafts — you hit Send',
      copy: 'The confidential secretary digs up your context and writes the message in your own voice. Pick the engine Rolodex uses - its own, DeepSeek or Grok - in Settings. All you do is hit Send.',
    },
    {
      id: 'pods',
      kicker: '06 · Pods',
      title: 'Pods, not chatrooms',
      copy: 'Group threads grow straight from your groups — one pod for the people who share your life, with a shared schedule and reminders.',
    },
    {
      id: 'storage',
      kicker: '07 · Your data',
      title: 'Where your contacts live',
      copy: 'Device, Cloud (Dropbox · Drive · OneDrive), or the Rolodex Server — your trust level, your choice. Demo room codes link devices live.',
    },
    {
      id: 'pricing',
      kicker: '08 · The tiers',
      title: 'Basic $1 · Confidante $5',
      copy: 'Basic gives you the Assistant — 5 AI interventions a month, a taste. Confidante lets the AI work all month. Billing lives in Settings.',
    },
    {
      id: 'outro',
      kicker: 'You\u2019re set',
      title: 'That\u2019s the tour — it\u2019s all live',
      copy: 'Tap through the app, or replay this demo any time from Settings → Welcome Again.',
    },
  ];

  stepIndex = 0;
  autoPlay = true;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly modalController: ModalController) {}

  get isFirst(): boolean {
    return this.stepIndex === 0;
  }

  get isLast(): boolean {
    return this.stepIndex === this.steps.length - 1;
  }

  ngOnInit(): void {
    // 2026-08-17: first visit greets Karibu sana!; the replay says Welcome Again.
    if (this.isReplay) this.steps[0].kicker = 'Welcome Again';
    this.restartTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
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

  /** One full show, then stop on the last slide so it never loops forever. */
  private restartTimer(): void {
    this.clearTimer();
    if (!this.autoPlay) return;
    this.timer = setInterval(() => {
      if (this.isLast) {
        this.autoPlay = false;
        this.clearTimer();
        return;
      }
      this.stepIndex++;
    }, this.STEP_MS);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Primary CTA — dismiss with role 'start'; HomePage opens the live tour. */
  start(): void {
    void this.modalController.dismiss('start', 'close');
  }

  /** The off-switch: persists the dismissal key so the demo never shows again. */
  dontShowAgain(): void {
    try {
      localStorage.setItem(WELCOME_DISMISSED_KEY, '1');
    } catch { /* ignore */ }
    void this.modalController.dismiss('dismissed', 'close');
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
