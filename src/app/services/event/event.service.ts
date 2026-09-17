import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { StorageService } from '../storage/storage.service';
import { InAppNotificationService } from '../in-app-notification/in-app-notification.service';
import { environment } from 'src/environments/environment';

const EVENTS_KEY = 'calendar_events';
const MAX_RECURRENCE = 30;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Rich calendar event shape — extended from main Zyppar
// ---------------------------------------------------------------------------
export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO 8601
  end?: string;
  location?: string;
  notes?: string;
  url?: string;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  reminderBefore?: number; // minutes before
  contactId?: string; // link back to a Rolodex contact
}

// ---------------------------------------------------------------------------
// Full-featured event service: CRUD, recurrence, notification, pub/sub
// Ported from main Zyppar + enhanced for Rolodex relationship tracking.
// ---------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class EventService implements OnDestroy {
  private channels: { [key: string]: Subject<any> } = {};
  private scheduledNotifications: Set<string> = new Set();
  private scheduledTimeouts: { [key: string]: any } = {};
  private pendingNotifications: CalendarEvent[] = [];
  private notificationDebounceTimeout: any = null;

  /** 2026-08-29 BUILD 143 (founder #2): native notification taps come back
   *  HERE as `localNotificationActionPerformed`; the extra carries
   *  { contactId, type: 'event' }. The home page subscribes and escalates
   *  the "Check in with..." tap into an armed loop — never a dead end. */
  readonly notificationTap$ = new Subject<any>();
  private nativeTapWired = false;

  /** Wire the native tap listener once (call from the home page on init). */
  async wireNativeNotificationTaps(): Promise<void> {
    if (this.nativeTapWired || !Capacitor.isNativePlatform()) return;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.addListener('localNotificationActionPerformed', (action: any) => {
        const extra = action?.notification?.extra || {};
        this.notificationTap$.next(extra);
      });
      this.nativeTapWired = true;
    } catch { /* plugin absent — PWA path covers taps via the dock */ }
  }

  constructor(
    private readonly storage: StorageService,
    private readonly inAppNotifications: InAppNotificationService,
  ) {
    this.initializeScheduledEvents().catch((err) =>
      !environment.production && console.error('[EventService] Init failed:', err),
    );
  }

  ngOnDestroy(): void {
    Object.values(this.scheduledTimeouts).forEach((t) => clearTimeout(t));
    this.scheduledTimeouts = {};
    this.unsubscribeAll();
  }

  // ===== CRUD ==============================================================

  async saveEvent(event: CalendarEvent, skipDuplicateCheck = false): Promise<void> {
    if (!skipDuplicateCheck && (await this.isDuplicate(event))) return;

    const events = await this.getEvents();
    const idx = events.findIndex((e) => e.id === event.id);
    if (idx >= 0) events[idx] = event;
    else events.push(event);

    await this.commitEvents(events);
    this.publish('eventAdded', event);
    await this.scheduleIfImminent(event);
  }

  async getEvents(): Promise<CalendarEvent[]> {
    return (await this.storage.get<CalendarEvent[]>(EVENTS_KEY)) ?? [];
  }

  async deleteEvent(id: string): Promise<void> {
    const events = await this.getEvents();
    this.cleanupTimeout(id);
    await this.commitEvents(events.filter((e) => e.id !== id));
  }

  /** Remove all events linked to a contact. */
  async deleteEventsForContact(contactId: string): Promise<void> {
    const events = await this.getEvents();
    const toRemove = events.filter((e) => e.contactId === contactId);
    toRemove.forEach((e) => this.cleanupTimeout(e.id));
    await this.commitEvents(events.filter((e) => e.contactId !== contactId));
  }

  // ===== Init & Cleanup ====================================================

  private async initializeScheduledEvents(): Promise<void> {
    await this.cleanupOldEvents();
    const events = await this.getEvents();
    for (const event of events) {
      await this.scheduleIfImminent(event);
    }
    await this.catchUpMissedAlerts(events);
  }

  /**
   * 2026-09-14 BUILD 198 THE CATCH-UP (founder: the algo alerts should be
   * "waiting for me" — a reminder that came due while the app was CLOSED used
   * to vanish silently, because the boot scheduler only arms FUTURE timeouts).
   * Anything whose reminder time passed in the last 24 hours and has not been
   * alerted yet fires NOW, sticky, when the user opens the app. A persisted
   * fired-ledger (id -> firedAt, pruned past 24h) keeps it exactly-once — the
   * alert waits for the user, but never nags twice.
   */
  private static readonly FIRED_LEDGER_KEY = 'lk_alert_fired';

  private async catchUpMissedAlerts(events: CalendarEvent[]): Promise<void> {
    try {
      const now = Date.now();
      const ledger = (await this.storage.get<Record<string, number>>(EventService.FIRED_LEDGER_KEY)) || {};
      // Prune the ledger — fired more than 24h ago can never nag again.
      for (const id of Object.keys(ledger)) {
        if (now - Number(ledger[id]) > TWENTY_FOUR_HOURS_MS) delete ledger[id];
      }
      let changed = false;
      for (const event of events) {
        const eventTime = new Date(event.start).getTime();
        const reminderMs = (event.reminderBefore ?? 15) * 60 * 1000;
        const notifyTime = eventTime - reminderMs;
        const age = now - notifyTime;
        if (age < 0 || age > TWENTY_FOUR_HOURS_MS) continue; // not yet due, or long past
        if (ledger[event.id]) continue; // already waited for the user
        // 2026-09-17 BUILD 249 THE THREE-SEAT RULE: the catch-up FEEDS the
        // serving engine — only a SEATED prompt is ledger-marked as waited
        // for. An overflow subject (seats full, or the group's rhythm says
        // not yet) stays un-ledgered, so it can be served later — on the
        // next seat opening, or by the next boot's catch-up within the day's
        // budget. The pile-maker is now a paced server.
        const { seated } = this.inAppNotifications.notify(
          event.title + (event.notes ? ' — ' + event.notes : ''),
          { kind: 'info', duration: 0, data: { action: 'checkin', contactId: event.contactId } },
        );
        if (!seated) continue;
        ledger[event.id] = now;
        changed = true;
      }
      if (changed) await this.storage.set(EventService.FIRED_LEDGER_KEY, ledger);
    } catch { /* the catch-up is best-effort by design */ }
  }

  private async cleanupOldEvents(): Promise<void> {
    const now = Date.now();
    const events = await this.getEvents();
    const valid = events.filter(
      (e) => new Date(e.start).getTime() > now - TWENTY_FOUR_HOURS_MS,
    );
    await this.commitEvents(valid);
  }

  // ===== Recurrence Engine =================================================

  private async scheduleIfImminent(event: CalendarEvent): Promise<void> {
    const now = Date.now();
    const eventTime = new Date(event.start).getTime();
    const reminderMs = (event.reminderBefore ?? 15) * 60 * 1000;
    const notifyTime = eventTime - reminderMs;
    const timeUntil = notifyTime - now;

    if (timeUntil < -TWENTY_FOUR_HOURS_MS) return; // too old

    this.cleanupTimeout(event.id);

    if (timeUntil <= TWENTY_FOUR_HOURS_MS && timeUntil > 0) {
      this.scheduledTimeouts[event.id] = setTimeout(async () => {
        try {
          await this.fireNotification(event);
          if (event.repeat && event.repeat !== 'none') {
            await this.createNextRecurrence(event);
          }
        } finally {
          delete this.scheduledTimeouts[event.id];
        }
      }, timeUntil);
    } else if (timeUntil <= 0 && event.repeat && event.repeat !== 'none') {
      await this.createNextRecurrence(event);
    }
  }

  private async createNextRecurrence(event: CalendarEvent): Promise<void> {
    const count = this.parseRecurrenceCount(event.notes);
    if (count >= MAX_RECURRENCE) return;

    const interval = this.recurrenceMs(event.repeat);
    if (!interval) return;

    const eventStart = new Date(event.start).getTime();
    let nextStart = eventStart + interval;

    // Jump ahead if we're behind
    const now = Date.now();
    if (nextStart < now) {
      const skipped = Math.ceil((now - eventStart) / interval);
      nextStart = eventStart + interval * skipped;
    }

    if (nextStart - now > 7 * TWENTY_FOUR_HOURS_MS) return; // too far ahead

    const nextEvent: CalendarEvent = {
      ...event,
      id: this.generateId(),
      start: new Date(nextStart).toISOString(),
      notes: this.buildRecurrenceNote(event.notes, count + 1),
    };
    if (event.end) {
      const duration = new Date(event.end).getTime() - eventStart;
      nextEvent.end = new Date(nextStart + duration).toISOString();
    }

    await this.saveEvent(nextEvent, true);
  }

  // ===== Notifications =====================================================

  private async fireNotification(event: CalendarEvent): Promise<void> {
    this.pendingNotifications.push(event);
    if (this.notificationDebounceTimeout) clearTimeout(this.notificationDebounceTimeout);

    this.notificationDebounceTimeout = setTimeout(async () => {
      const batch = this.pendingNotifications;
      this.pendingNotifications = [];

      // 2026-08-30 BUILD 155: a deleted event must never ring. The demo purge
      // (or any delete) can land inside this 200ms debounce window, after the
      // timeout already fired - so check liveness against storage first.
      const liveIds = new Set((await this.getEvents()).map((e) => e.id));

      for (const evt of batch) {
        if (!liveIds.has(evt.id)) continue; // deleted mid-debounce - never ring
        try {
          // 2026-08-18 LONDON-BUS FIX: on the web/PWA the reminder lands in the
          // draggable in-app Ionic dock - NOT the obtrusive browser notification
          // stack. Native keeps the real system notification (expected there).
          if (Capacitor.isNativePlatform()) {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            const permission = await LocalNotifications.requestPermissions();
            if (permission.display !== 'granted') continue;

            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Math.abs(this.hashCode(evt.id)) % 2147483647,
                  title: evt.title,
                  body: evt.notes ?? '',
                  schedule: { at: new Date() },
                  extra: { eventId: evt.id, contactId: evt.contactId, type: 'event' },
                },
              ],
            });
          } else {
            // 2026-08-29 BUILD 143 (founder #2): the PWA dock nudge is TAPPABLE —
            // it carries its contact so a tap escalates into Loops (armed).
            // 2026-09-14 BUILD 198 STICKY (founder: the algo alerts were
            // "disappearing at first touch ... of little or no utility"): a
            // 5-second auto-dismiss meant the reminder was gone before the
            // user looked up. Algo alerts are now STICKY — they stay until
            // the user taps them (escalate) or explicitly dismisses (✕).
            this.inAppNotifications.notify(
              evt.title + (evt.notes ? ' — ' + evt.notes : ''),
              { kind: 'info', duration: 0, data: { action: 'checkin', contactId: evt.contactId } },
            );
          }

          this.publish('eventFired', evt);
          this.scheduledNotifications.delete(evt.id);
        } catch {
          // plugin unavailable — silent skip
        }
      }
    }, 200);
  }

  // ===== Pub/Sub ===========================================================

  subscribe(topic: string, observer: (data: any) => void): Subscription {
    if (!this.channels[topic]) this.channels[topic] = new Subject<any>();
    return this.channels[topic].subscribe(observer);
  }

  publish(topic: string, data: any): void {
    this.channels[topic]?.next(data);
  }

  unsubscribeAll(): void {
    Object.values(this.channels).forEach((s) => s.complete());
    this.channels = {};
  }

  // ===== Helpers ===========================================================

  private async commitEvents(events: CalendarEvent[]): Promise<void> {
    await this.storage.set(EVENTS_KEY, events);
  }

  private cleanupTimeout(eventId: string): void {
    if (this.scheduledTimeouts[eventId]) {
      clearTimeout(this.scheduledTimeouts[eventId]);
      delete this.scheduledTimeouts[eventId];
    }
    this.scheduledNotifications.delete(eventId);
  }

  private async isDuplicate(event: CalendarEvent): Promise<boolean> {
    const events = await this.getEvents();
    return events.some(
      (e) =>
        e.contactId === event.contactId &&
        e.start === event.start &&
        e.repeat === event.repeat &&
        e.title === event.title,
    );
  }

  private parseRecurrenceCount(notes?: string): number {
    const m = notes?.match(/Recurrence #(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  private buildRecurrenceNote(base: string | undefined, count: number): string {
    const clean = (base ?? '').replace(/\s*\(Recurrence #\d+\)/, '');
    return `${clean} (Recurrence #${count})`.trim();
  }

  private recurrenceMs(repeat?: string): number | null {
    switch (repeat) {
      case 'daily':
        return TWENTY_FOUR_HOURS_MS;
      case 'weekly':
        return 7 * TWENTY_FOUR_HOURS_MS;
      case 'monthly':
        return 30 * TWENTY_FOUR_HOURS_MS;
      default:
        return null;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 11);
  }

  private hashCode(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
