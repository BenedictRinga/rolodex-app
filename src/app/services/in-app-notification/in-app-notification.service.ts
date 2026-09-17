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
 *
 * 2026-09-17 BUILD 249 THE THREE-SEAT RULE (founder policy: in reducing
 * procrastination and relieving the Zeigarnik effect, NO alert/prompt surface
 * ever hosts more than THREE items at the same time; overflow waits in a
 * serving engine that dedupes, sifts, and paces servings so the potential for
 * feeling overwhelmed is de-minimis and the sense of accomplishment is
 * heightened by using LoopKeeper).
 *
 * THE INVARIANT: the dock holds AT MOST THREE SEATS, and only STICKY prompts
 * (duration 0 — nudges, reminders, the digest) occupy them. Transient
 * confirmations (duration > 0) are never seats — they self-clear in seconds.
 * A fourth subject NEVER pushes anything down: it waits in this service's
 * back-stack, sift-ranked, and is served when a seat OPENS (a tap, a
 * dismissal, an expiry, the snooze lifting, the app resuming, or the
 * engine's quiet 10-minute heartbeat).
 *
 * THE ENGINES:
 *  - DEDUPE: one subject, one seat. The subject key is the contact/loop the
 *    prompt is about (falling back to the message text), so "Call Ma" and
 *    "Check in with Ma" are ONE subject, and a re-fired event never doubles
 *    into a second line.
 *  - SIFT: time-bound reminders (rank 0) serve before check-in nudges
 *    (rank 1) before digest/system; FIFO within a rank.
 *  - PACING: check-in servings are attuned — at most ONE new serving per 2
 *    waking hours and ≤3 per day (the seated batch is the morning's
 *    allowance); the digest serves once per day. The pacing ledger persists
 *    through the app's StorageService, so a reload never resets the rhythm.
 *  - ACCOMPLISHMENT: seats open by CLOSURE, and each opening serves the next
 *    subject — the pile is structurally finishable.
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

export type NotificationGroup = 'checkin' | 'reminder' | 'digest' | 'system';

/** The pacing table — psychologically attuned servings per group. */
const GROUP_POLICY: Record<NotificationGroup, { rank: number; refractoryMs: number; daily: number }> = {
  reminder: { rank: 0, refractoryMs: 0, daily: Number.MAX_SAFE_INTEGER },          // user-scheduled: serve at their time
  checkin: { rank: 1, refractoryMs: 2 * 3_600_000, daily: 3 },                     // the engine: one per 2 waking hours, ≤3/day
  digest: { rank: 2, refractoryMs: 20 * 3_600_000, daily: 1 },                     // the morning digest: once per day
  system: { rank: 3, refractoryMs: 0, daily: Number.MAX_SAFE_INTEGER },            // rare system notes: seat-capped only
};

const MAX_SEATS = 3;
const HEARTBEAT_MS = 10 * 60_000; // the engine's quiet sweep — a lapsed refractory serves at the next beat

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

  // ── BUILD 249: THE THREE-SEAT RULE — the serving engine ──────────────────
  /** Overflow: sift-ranked subjects waiting for a seat. */
  private backStack: Array<{ n: InAppNotification; group: NotificationGroup; identity: string; rank: number; at: number; snoozeUntil?: number }> = [];
  /** The dedupe layer: identities currently holding a seat. */
  private seatedIdentities = new Set<string>();
  /** THE QUIET MOMENT: the last whole-alert clear — new sticky servings are
   *  held for ~90s after it, so the closure beat stays quiet. */
  private lastClearedAt = 0;
  /** The pacing ledger — persisted so a reload never resets the rhythm. */
  private serveLedger: { day: string; checkinsServed: number; lastCheckinServe: number } = { day: '', checkinsServed: 0, lastCheckinServe: 0 };
  private static readonly SERVE_LEDGER_KEY = 'lk_serve_ledger_v1';

  constructor(private readonly storage: StorageService) {
    // THE PACING LEDGER lives in the app's StorageService (founder standard —
    // never localStorage). notify() is a synchronous gate, so the ledger is
    // PRELOADED once here and cached in memory; every write goes back THROUGH
    // the StorageService (write-behind). Same pattern as the analytics
    // service's consent + counters.
    void this.storage.get<typeof this.serveLedger>(InAppNotificationService.SERVE_LEDGER_KEY).then((saved) => {
      if (saved && typeof saved === 'object') {
        this.serveLedger = {
          day: saved.day || '',
          checkinsServed: saved.checkinsServed || 0,
          lastCheckinServe: saved.lastCheckinServe || 0,
        };
        this.rollLedgerDay();
      }
    }).catch(() => { /* fresh rhythm */ });

    // A reload during a snooze window must not lose the pile.
    void this.storage.get<{ until: number; pile: InAppNotification[] }>(InAppNotificationService.SNOOZE_KEY).then((saved) => {
      if (saved?.until && saved.until > Date.now()) {
        this.snoozed = Array.isArray(saved.pile) ? saved.pile : [];
        this.snoozedUntil = saved.until;
        this.armSnoozeTimer(saved.until - Date.now());
      } else if (saved?.pile?.length) {
        // The window passed while the tab was closed — hand the pile back,
        // through the seats: at most three, surplus waits in the back-stack.
        this.snoozed = [];
        void this.storage.remove(InAppNotificationService.SNOOZE_KEY);
        for (const n of saved.pile) this.admitSticky(n, this.groupOf(n), this.identityOf(n));
        this.emit();
        this.serveNext();
      }
    });

    // The engine's heartbeat: a lapsed refractory serves at the next beat,
    // and a returning user is served before they can navigate into a stale
    // pile. Both are quiet no-ops unless a seat is open and someone waits.
    setInterval(() => this.serveNext(), HEARTBEAT_MS);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.serveNext(); });
    }
  }

  notify(
    message: string,
    opts?: { kind?: 'info' | 'success' | 'error'; duration?: number; data?: InAppNotification['data'] },
  ): { id: number; seated: boolean } {
    const id = this.nextId++;
    const notification: InAppNotification = {
      id,
      message,
      kind: opts?.kind || 'info',
      duration: opts?.duration ?? 3500,
      data: opts?.data,
    };
    // Transient confirmations are never seats — they self-clear; pass through.
    if (notification.duration > 0) {
      this.pushAndArm(notification);
      return { id, seated: true };
    }
    // Snoozed? The alert joins the waiting pile silently — it is not lost.
    if (this.snoozedUntil > Date.now()) {
      this.snoozed = [...this.snoozed, notification];
      void this.storage.set(InAppNotificationService.SNOOZE_KEY, { until: this.snoozedUntil, pile: this.snoozed });
      return { id, seated: false };
    }
    // THE THREE-SEAT GATE: dedupe, then seats, then the group's rhythm.
    const group = this.groupOf(notification);
    const identity = this.identityOf(notification);
    const seated = this.admitSticky(notification, group, identity);
    return { id, seated };
  }

  private admitSticky(n: InAppNotification, group: NotificationGroup, identity: string): boolean {
    // ONE SUBJECT, ONE SEAT. The dedupe has two cases:
    //  - the SAME prompt re-fired (identical message) → drop; exactly-once.
    //  - a DIFFERENT task about the same subject ("Renew the insurance" while
    //    "Call Ma" is seated) → held as the subject's NEXT serving in the
    //    back-stack — a deadline never vanishes, and the person never holds
    //    two seats at once.
    if (this.seatedIdentities.has(identity) || this.backStack.some((b) => b.identity === identity)) {
      const identical = this.notifications.some((x) => this.identityOf(x) === identity && x.message === n.message)
        || this.backStack.some((b) => b.identity === identity && b.n.message === n.message);
      if (identical) return false;
      this.enqueue({ n, group, identity, rank: GROUP_POLICY[group].rank, at: Date.now(), snoozeUntil: 0 });
      return false;
    }
    // THE QUIET MOMENT (BUILD 249): for ~90s after a whole-alert clear (the
    // 245 takeover owns the screen), a new sticky serving is HELD, not shown —
    // the closure moment stays quiet, and the engine serves it at the next
    // heartbeat/seat-open. The founder's accomplishment beat is not
    // interrupted by the machinery noting the deed it just enabled.
    const quietUntil = this.lastClearedAt + 90_000;
    if (Date.now() < quietUntil) {
      this.enqueue({ n, group, identity, rank: GROUP_POLICY[group].rank, at: Date.now(), snoozeUntil: quietUntil });
      return false;
    }
    if (this.stickySeats >= MAX_SEATS || !this.groupAllows(group)) {
      this.enqueue({ n, group, identity, rank: GROUP_POLICY[group].rank, at: Date.now(), snoozeUntil: 0 });
      return false;
    }
    this.seat(n, group, identity);
    return true;
  }

  private enqueue(item: { n: InAppNotification; group: NotificationGroup; identity: string; rank: number; at: number; snoozeUntil: number }): void {
    this.backStack.push(item);
    this.backStack.sort((a, b) => (a.snoozeUntil || 0) - (b.snoozeUntil || 0) || a.rank - b.rank || a.at - b.at);
    this.emit(); // the panel's waiting count is transparency, not a serving
  }

  private seat(n: InAppNotification, group: NotificationGroup, identity: string): void {
    this.notifications = [...this.notifications, n];
    this.seatedIdentities.add(identity);
    if (group === 'checkin') {
      this.rollLedgerDay();
      this.serveLedger.checkinsServed++;
      this.serveLedger.lastCheckinServe = Date.now();
      void this.storage.set(InAppNotificationService.SERVE_LEDGER_KEY, this.serveLedger);
    }
    this.emit();
    if (n.duration > 0) {
      const timer = setTimeout(() => this.dismiss(n.id), n.duration);
      this.timers.set(n.id, timer);
    }
  }

  /** Seat opening → serve the next eligible subject (paced, sift-ranked). */
  private serveNext(): void {
    if (this.snoozedUntil > Date.now()) return; // the blanket is down
    let guard = 0;
    while (this.stickySeats < MAX_SEATS && this.backStack.length && guard++ < 12) {
      const now = Date.now();
      const idx = this.backStack.findIndex((b) => (!b.snoozeUntil || b.snoozeUntil <= now) && !this.seatedIdentities.has(b.identity) && this.groupAllows(b.group));
      if (idx < 0) return; // everyone waiting is paced out — the rhythm holds
      const [next] = this.backStack.splice(idx, 1);
      this.seat(next.n, next.group, next.identity);
    }
  }

  /** The group's rhythm: refractory since the last serving, and the daily budget. */
  private groupAllows(group: NotificationGroup): boolean {
    const policy = GROUP_POLICY[group];
    if (policy.refractoryMs === 0 && policy.daily === Number.MAX_SAFE_INTEGER) return true;
    this.rollLedgerDay();
    if (group === 'checkin') {
      if (this.serveLedger.checkinsServed > 0 && Date.now() - this.serveLedger.lastCheckinServe < policy.refractoryMs) return false;
      if (this.serveLedger.checkinsServed >= policy.daily) return false;
    }
    if (group === 'digest') {
      // One digest serving per day: the identity 'digest:today' seats once.
      if (this.seatedIdentities.has('digest:today')) return false;
    }
    return true;
  }

  private rollLedgerDay(): void {
    const day = new Date().toISOString().slice(0, 10);
    if (this.serveLedger.day !== day) {
      this.serveLedger = { day, checkinsServed: 0, lastCheckinServe: 0 };
    }
  }

  /** The subject key: what the prompt is ABOUT (the contact/loop), not the words. */
  private identityOf(n: InAppNotification): string {
    const action = n.data?.action || '';
    if (action === 'loopDigest') return 'digest:today';
    const cid = n.data?.contactId || '';
    if (cid) return `${action || 'sys'}:${cid}`;
    return `m:${(n.message || '').slice(0, 80)}`;
  }

  private groupOf(n: InAppNotification): NotificationGroup {
    const action = n.data?.action;
    if (action === 'loopDigest') return 'digest';
    if (action === 'checkin') return /^Check in with/i.test(n.message || '') ? 'checkin' : 'reminder';
    return 'system';
  }

  private get stickySeats(): number {
    return this.notifications.filter((n) => n.duration === 0).length;
  }

  private pushAndArm(n: InAppNotification): void {
    this.notifications = [...this.notifications, n];
    this.emit();
    if (n.duration > 0) {
      const timer = setTimeout(() => this.dismiss(n.id), n.duration);
      this.timers.set(n.id, timer);
    }
  }

  private emit(): void {
    this.subject.next(this.notifications);
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
    const gone = this.notifications.find((n) => n.id === id);
    this.notifications = this.notifications.filter((n) => n.id !== id);
    if (gone && gone.duration === 0) {
      this.seatedIdentities.delete(this.identityOf(gone));
      this.emit();
      this.serveNext(); // a seat opened — the engine may serve the next subject
    } else {
      this.emit();
    }
  }

  /** BUILD 245: the check-in takeover clears the WHOLE pile — the escalation
   *  owns the screen. Deliberately NOT a serveNext trigger: refills wait for
   *  the next natural beat (the heartbeat, a resume, an arrival), so the
   *  moment stays quiet. */
  clear(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.notifications = [];
    this.seatedIdentities.clear();
    this.lastClearedAt = Date.now(); // THE QUIET MOMENT begins
    this.emit();
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
    this.seatedIdentities.clear();
    this.emit();
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
    for (const n of pile) this.admitSticky(n, this.groupOf(n), this.identityOf(n));
    this.emit();
    this.serveNext();
  }

  // ── BUILD 249: transparency for the surfaces ─────────────────────────────
  /** Sticky seats currently held (the dock's "N of 3"). */
  get seatCount(): number { return this.stickySeats; }
  get maxSeats(): number { return MAX_SEATS; }
  /** Subjects waiting in the engine — a count, never a serving. */
  get waitingCount(): number { return this.backStack.length; }
}
