import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Router } from '@angular/router';
import { InAppNotificationService } from '../in-app-notification/in-app-notification.service';
import { StorageService } from '../storage/storage.service';

/**
 * 2026-09-13 BUILD 189 — THE LOOP WAKE PING (founder: the post-sync journey
 * had no return driver — a snoozed loop sat silent in the Waiting pile until
 * the user's own memory opened the app, and even calendar reminders died the
 * moment the tab closed because they ran on in-memory setTimeout).
 *
 * Pattern ported from Zyppar Soliloquy's NotificationAlarmService (the "I,
 * Algorithm" scheduler): LocalNotifications.schedule() accepts any future
 * Date, so the OS itself holds the alarm — it survives app background, kill,
 * sleep and reboot. Deterministic numeric IDs (the same 32-bit hash trick)
 * mean re-scheduling and cancelling are idempotent, and a startup resync can
 * rebuild the whole schedule from the loop ledger.
 *
 * Two platforms, two honest paths:
 * - NATIVE (Capacitor android): OS-level schedule with allowWhileIdle —
 *   fires at the wake moment even with LoopKeeper closed.
 * - WEB/PWA: the browser cannot schedule future notifications, so the wake
 *   rides the in-app dock while a tab is open (setTimeout), and the startup
 *   resync catches wakes that passed while closed with a single catch-up
 *   dock nudge pointing at the Waiting pile. Same trade Soliloquy makes.
 *
 * Privacy: the notification is scheduled ON THE DEVICE and never leaves it —
 * a loop's handle (the user's own nickname) may appear in the text and stays
 * local, exactly like the deck itself. Nothing here sends anything anywhere.
 */

const CHANNEL_ID = 'loop-wake';
/** BUILD 199: the day the PWA morning digest last caught up (once per day). */
const DIGEST_KEY = 'lk_wake_digest_day';

@Injectable({ providedIn: 'root' })
export class LoopWakeService {
  /** wake time → in-page timers (web path only; native uses the OS). */
  private webTimers = new Map<string, any>();

  constructor(
    private readonly router: Router,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly storage: StorageService,
  ) {
    // Soliloquy pattern: a tap on a wake ping lands on the home deck, where
    // the Loops inbox (and its Waiting pile) is one glance away.
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
        LocalNotifications.addListener('localNotificationActionPerformed', (action: any) => {
          try {
            if (action?.notification?.extra?.type === 'loopWake') {
              void this.router.navigateByUrl('/home');
            }
          } catch { /* best-effort navigation */ }
        });
      }).catch(() => { /* plugin unavailable — web path serves instead */ });
    }
  }

  /** Zyppar's deterministic 32-bit id — same key → same id → idempotent. */
  private genId(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const chr = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash % 2147483647);
  }

  /** Best-effort Android channel (importance HIGH so it surfaces on lock). */
  private async ensureChannel(): Promise<void> {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Loop wake-ups',
        description: 'A snoozed loop is ready to walk back',
        importance: 5,
        visibility: 1,
      });
    } catch { /* iOS / web / older Android — no channel needed */ }
  }

  /**
   * 2026-09-14 BUILD 199 THE MORNING DIGEST (founder, adopting the Pocket FM
   * playbook's habit lever: "one 9AM LoopWake notification listing the day's
   * waiting loops — instead of per-loop pings"). ONE notification per day, at
   * the next 9AM local, naming the waiting loops by their handles. Replaces
   * the per-loop pings: every resync cancels the previous schedule (legacy
   * per-loop ids + the digest) and re-arms a single alarm while anything is
   * waiting. Native = the OS holds the alarm (fires with the app closed);
   * PWA = a same-day catch-up dock nudge (sticky) if the 9AM slot already
   * passed today, plus the in-page timer for tomorrow.
   */
  async resyncDigest(loops: Array<{ id: string; status: string; waitUntil?: number; handle?: string }> | null | undefined): Promise<void> {
    const waiting = (loops || []).filter((l) => l.status === 'waiting' && !!l.waitUntil);
    const handles = waiting.map((l) => (l.handle || '').trim()).filter(Boolean).slice(0, 3);
    const body = waiting.length === 0 ? ''
      : `${waiting.length} loop${waiting.length === 1 ? '' : 's'} waiting` +
        (handles.length ? `: ${handles.join(', ')}${waiting.length > handles.length ? ` +${waiting.length - handles.length} more` : ''}` : '.');

    // Cancel every previous schedule — legacy per-loop ids AND the digest.
    try {
      if (Capacitor.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const ids = [this.genId('loop-wake-digest'), ...(loops || []).map((l) => this.genId(`loop-wake-${l.id}`))];
        await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
      }
    } catch { /* best effort */ }
    this.clearWebTimer('digest');

    if (!waiting.length) return; // nothing waiting — silence until one arrives

    const at = this.nextNineAm();

    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== 'granted') return; // the Waiting pile still shows
        await this.ensureChannel();
        await LocalNotifications.schedule({
          notifications: [{
            id: this.genId('loop-wake-digest'),
            title: '⏰ LoopKeeper',
            body,
            schedule: { at, allowWhileIdle: true }, // fires through Doze, app closed
            channelId: CHANNEL_ID,
            autoCancel: true,
            extra: { type: 'loopWake', count: waiting.length },
          }],
        });
      } catch { /* plugin hiccup — the Waiting pile still shows */ }
      return;
    }

    // PWA path: if today's 9AM already passed (the alarm is for TOMORROW),
    // catch up NOW — once per day (persisted day key). Then arm tomorrow.
    const delay = at.getTime() - Date.now();
    const now = new Date();
    if (at.getDate() !== now.getDate()) {
      try {
        const last = await this.storage.get<string>(DIGEST_KEY);
        const today = now.toISOString().slice(0, 10);
        if (last !== today) {
          await this.storage.set(DIGEST_KEY, today);
          this.inAppNotifications.notify(`⏰ ${body}`, { kind: 'info', duration: 0, data: { action: 'loopDigest' } });
        }
      } catch { /* best effort */ }
    }
    this.armWebDigest(body, delay);
  }

  /** Arm the PWA in-page digest timer for the next 9AM. */
  private armWebDigest(body: string, delay: number): void {
    this.clearWebTimer('digest');
    const timer = setTimeout(() => {
      try {
        this.inAppNotifications.notify(`⏰ ${body}`, { kind: 'info', duration: 0, data: { action: 'loopDigest' } });
      } catch { /* dock is best-effort */ }
    }, Math.min(delay, 2_147_000_000));
    this.webTimers.set('digest', timer);
  }

  /** The next 9AM local — today if still ahead, otherwise tomorrow. */
  private nextNineAm(): Date {
    const at = new Date();
    at.setHours(9, 0, 0, 0);
    if (at.getTime() <= Date.now() + 60_000) at.setDate(at.getDate() + 1);
    return at;
  }

  private clearWebTimer(key: string): void {
    const t = this.webTimers.get(key);
    if (t) {
      clearTimeout(t);
      this.webTimers.delete(key);
    }
  }
}
