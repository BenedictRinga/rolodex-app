import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Router } from '@angular/router';
import { InAppNotificationService } from '../in-app-notification/in-app-notification.service';

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
const MAX_SCHEDULED = 50; // a valve, not a limit anyone should meet

@Injectable({ providedIn: 'root' })
export class LoopWakeService {
  /** wake time → in-page timers (web path only; native uses the OS). */
  private webTimers = new Map<string, any>();

  constructor(
    private readonly router: Router,
    private readonly inAppNotifications: InAppNotificationService,
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
   * Schedule (or replace) the 9AM wake ping for one snoozed loop.
   * `subject` is the loop's handle — the user's own nickname, device-local.
   */
  async scheduleWake(loopId: string, wakeAtMs: number, subject?: string): Promise<void> {
    if (!wakeAtMs || wakeAtMs <= Date.now() + 60_000) return; // past — the Waiting pile owns it
    const at = new Date(wakeAtMs);
    const body = subject
      ? `Your loop with "${subject}" is ready to walk back.`
      : 'A loop you parked is ready to walk back.';

    if (!Capacitor.isNativePlatform()) {
      // PWA path: in-page dock nudge while a tab lives. Same trade Soliloquy
      // makes — the tab-open reminder + the startup catch-up below.
      this.clearWebTimer(loopId);
      const t = setTimeout(() => {
        try {
          this.inAppNotifications.notify(`⏰ ${body}`, { kind: 'info', duration: 8000, data: { action: 'loopWake', loopId } });
        } catch { /* dock is best-effort */ }
        this.webTimers.delete(loopId);
      }, Math.min(at.getTime() - Date.now(), 2_147_000_000));
      this.webTimers.set(loopId, t);
      return;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') return; // user said no — the Waiting pile still shows
      await this.ensureChannel();
      await LocalNotifications.schedule({
        notifications: [{
          id: this.genId(`loop-wake-${loopId}`),
          title: '⏰ LoopKeeper',
          body,
          schedule: { at, allowWhileIdle: true }, // fires through Doze, with the app closed
          channelId: CHANNEL_ID,
          autoCancel: true,
          extra: { type: 'loopWake', loopId },
        }],
      });
    } catch { /* plugin hiccup — the Waiting pile still shows; never block a snooze */ }
  }

  /** Cancel one loop's pending wake (native) + its web timer. Idempotent. */
  async cancelWake(loopId: string): Promise<void> {
    this.clearWebTimer(loopId);
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id: this.genId(`loop-wake-${loopId}`) }] });
    } catch { /* nothing to cancel or plugin unavailable — fine either way */ }
  }

  /**
   * THE SOLILOQUY RESYNC — rebuild the whole wake schedule from the loop
   * ledger. Call once after loops load: cancelled loops stop pinging, future
   * wakes re-arm (survives app kill/reboot because the OS already holds them
   * — this is belt-and-braces), and wakes that passed while the PWA was
   * closed get ONE catch-up dock nudge instead of silence.
   */
  async resyncAll(loops: Array<{ id: string; status: string; waitUntil?: number; handle?: string }>): Promise<void> {
    if (!Array.isArray(loops)) return;
    const waiting = loops.filter((l) => l.status === 'waiting' && !!l.waitUntil).slice(0, MAX_SCHEDULED);
    for (const l of waiting) {
      if ((l.waitUntil as number) > Date.now() + 60_000) {
        await this.scheduleWake(l.id, l.waitUntil as number, l.handle || undefined);
      }
    }
    // Cancel wakes for loops no longer waiting (closed, dropped, woken).
    for (const l of loops) {
      if (!(l.status === 'waiting' && !!l.waitUntil)) {
        await this.cancelWake(l.id);
      }
    }
    // PWA catch-up: wakes that passed while no tab was open → one nudge.
    if (!Capacitor.isNativePlatform()) {
      const due = waiting.filter((l) => (l.waitUntil as number) <= Date.now());
      if (due.length) {
        try {
          this.inAppNotifications.notify(
            due.length === 1
              ? '⏰ A loop you snoozed is ready to walk back.'
              : `⏰ ${due.length} snoozed loops are ready to walk back.`,
            { kind: 'info', duration: 8000, data: { action: 'loopWakeCatchUp', count: due.length } },
          );
        } catch { /* dock is best-effort */ }
      }
    }
  }

  private clearWebTimer(loopId: string): void {
    const t = this.webTimers.get(loopId);
    if (t) {
      clearTimeout(t);
      this.webTimers.delete(loopId);
    }
  }
}
