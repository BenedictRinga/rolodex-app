import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from '../storage/storage.service';

/**
 * 2026-08-18 IN-APP NOTIFICATIONS (the London-bus fix).
 *
 * Browser/system notifications can stack and nag; ours are Ionic-rendered,
 * live INSIDE the app, auto-dismiss, and the whole dock can be dragged to a
 * convenient corner of the screen and stays there for the session. The
 * component renders the dock; this service is the state + timer brain.
 *
 * 2026-09-14 BUILD 200 THE BLANKET SNOOZE (founder: forcing item-by-item
 * dismissal "is a notional form of false imprisonment — more polite to allow
 * blanket manual dismissal or snooze"): dismiss-all exists via clear(), and
 * snoozeAll() lifts the WHOLE pile out of the way for a chosen window —
 * 30m, 1h, or until 9AM — returning it intact (sticky items stay sticky).
 * Alerts that arrive DURING the window join the pile silently; nothing is
 * lost, nothing nags. The snooze survives a reload (persisted pile + until).
 */
export interface InAppNotification {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
  duration: number; // ms, 0 = sticky until dismissed
  /** 2026-08-29 BUILD 143: optional tap-through payload. A notification that
   *  carries data.action is TAPPABLE — tapping it fires tapped$ so the page
   *  can act (e.g. a "Check in with John Doe" nudge escalates into Loops). */
  data?: { action?: string; contactId?: string; [k: string]: any };
}

@Injectable({
  providedIn: 'root',
})
export class InAppNotificationService {
  private notifications: InAppNotification[] = [];
  private readonly subject = new BehaviorSubject<InAppNotification[]>([]);
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  /** 2026-08-29 BUILD 143: the tap-through channel — the dock emits, the
   *  home page listens and escalates the nudge into an armed loop. */
  private readonly tapSubject = new BehaviorSubject<InAppNotification | null>(null);
  readonly tapped$ = this.tapSubject.asObservable();

  readonly notifications$ = this.subject.asObservable();

  // ── BUILD 200: the blanket snooze ────────────────────────────────────────
  private snoozed: InAppNotification[] = [];
  private snoozedUntil = 0;
  private snoozeTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly SNOOZE_KEY = 'lk_notif_snooze';

  constructor(private readonly storage: StorageService) {
    // A reload during a snooze window must not lose the pile.
    void this.storage.get<{ until: number; pile: InAppNotification[] }>(InAppNotificationService.SNOOZE_KEY).then((saved) => {
      if (saved?.until && saved.until > Date.now()) {
        this.snoozed = Array.isArray(saved.pile) ? saved.pile : [];
        this.snoozedUntil = saved.until;
        this.armSnoozeTimer(saved.until - Date.now());
      } else if (saved?.pile?.length) {
        // The window passed while the tab was closed — hand the pile back.
        for (const n of saved.pile) {
          this.notifications = [...this.notifications, n];
          if (n.duration > 0) {
            const t = setTimeout(() => this.dismiss(n.id), n.duration);
            this.timers.set(n.id, t);
          }
        }
        this.snoozed = [];
        void this.storage.remove(InAppNotificationService.SNOOZE_KEY);
        this.subject.next(this.notifications);
      }
    });
  }

  notify(
    message: string,
    opts?: { kind?: 'info' | 'success' | 'error'; duration?: number; data?: InAppNotification['data'] },
  ): number {
    const id = this.nextId++;
    const notification: InAppNotification = {
      id,
      message,
      kind: opts?.kind || 'info',
      duration: opts?.duration ?? 3500,
      data: opts?.data,
    };
    // Snoozed? The alert joins the waiting pile silently — it is not lost.
    if (this.snoozedUntil > Date.now()) {
      this.snoozed = [...this.snoozed, notification];
      void this.storage.set(InAppNotificationService.SNOOZE_KEY, { until: this.snoozedUntil, pile: this.snoozed });
      return id;
    }
    this.notifications = [...this.notifications, notification];
    this.subject.next(this.notifications);
    if (notification.duration > 0) {
      const timer = setTimeout(() => this.dismiss(id), notification.duration);
      this.timers.set(id, timer);
    }
    return id;
  }

  /** 2026-08-29 BUILD 143: the dock calls this when a tappable notification is
   *  tapped — announce it, then take the toast away. */
  tap(n: InAppNotification): void {
    this.tapSubject.next(n);
    this.dismiss(n.id);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.subject.next(this.notifications);
  }

  clear(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.notifications = [];
    this.subject.next([]);
  }

  // ── BUILD 200: the blanket snooze ────────────────────────────────────────

  /** Lift the whole pile out of the way for `ms`. Nothing is lost: sticky and
   *  timed items alike return intact when the window ends (timers re-arm). */
  snoozeAll(ms: number): void {
    if (!this.notifications.length || ms <= 0) return;
    for (const n of this.notifications) {
      const t = this.timers.get(n.id);
      if (t) { clearTimeout(t); this.timers.delete(n.id); }
    }
    this.snoozed = [...this.snoozed, ...this.notifications];
    this.snoozedUntil = Date.now() + ms;
    this.notifications = [];
    this.subject.next([]);
    void this.storage.set(InAppNotificationService.SNOOZE_KEY, { until: this.snoozedUntil, pile: this.snoozed });
    this.armSnoozeTimer(ms);
  }

  /** Is the blanket down? (The dock shows a quiet "snoozed" state when true.) */
  get snoozeActive(): boolean {
    return this.snoozedUntil > Date.now();
  }

  private armSnoozeTimer(ms: number): void {
    if (this.snoozeTimer) clearTimeout(this.snoozeTimer);
    this.snoozeTimer = setTimeout(() => this.liftSnooze(), Math.min(ms, 2_147_000_000));
  }

  private liftSnooze(): void {
    this.snoozedUntil = 0;
    this.snoozeTimer = null;
    const pile = this.snoozed;
    this.snoozed = [];
    void this.storage.remove(InAppNotificationService.SNOOZE_KEY);
    if (!pile.length) return;
    this.notifications = [...this.notifications, ...pile];
    for (const n of this.notifications) {
      if (n.duration > 0) {
        const t = setTimeout(() => this.dismiss(n.id), n.duration);
        this.timers.set(n.id, t);
      }
    }
    this.subject.next(this.notifications);
  }
}
