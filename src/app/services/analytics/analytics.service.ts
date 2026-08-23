import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';
import { RolodexSyncService } from '../rolodex-sync/rolodex-sync.service';

export interface AnalyticsEventPayload {
  event: string;
  props?: Record<string, any>;
  sessionId?: string;
  ts?: number;
}

/**
 * 2026-08-23 ANONYMOUS PRODUCT ANALYTICS.
 *
 * Privacy-first by design:
 * - NO contacts, NO names, NO phone numbers, NO message text ever leave.
 * - Only a stable anonymous deviceId + event names + tiny numeric props.
 * - Separate consent flag from cloud sync (default ON for aggregate product
 *   insight; user can turn it off in Settings → Privacy).
 *
 * Events are queued in IndexedDB-backed storage and flushed in batches so a
 * lost connection never blocks the app.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly ENABLED_KEY = 'loopkeeper_analytics_enabled';
  private readonly QUEUE_KEY = 'loopkeeper_analytics_queue';

  private enabled = true;
  private loaded = false;
  private queue: AnalyticsEventPayload[] = [];
  private sessionId = '';
  private sessionStart = 0;
  private flushTimer: any = null;
  private visibilityBound = false;

  constructor(
    private readonly storage: StorageService,
    private readonly rolodexSync: RolodexSyncService,
  ) {
    void this.hydrate();
  }

  private async hydrate(): Promise<void> {
    try {
      const stored = await this.storage.get<boolean | string>(this.ENABLED_KEY);
      this.enabled = stored === undefined || stored === null ? true : stored === true || stored === '1' || stored === 'true';
      const q = await this.storage.get<AnalyticsEventPayload[]>(this.QUEUE_KEY);
      this.queue = Array.isArray(q) ? q.slice(-200) : [];
    } catch {
      this.enabled = true;
      this.queue = [];
    }
    this.loaded = true;
  }

  async isEnabled(): Promise<boolean> {
    if (!this.loaded) await this.hydrate();
    return this.enabled;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = !!enabled;
    try {
      await this.storage.set(this.ENABLED_KEY, this.enabled);
    } catch { /* best effort */ }
    if (!this.enabled) {
      this.queue = [];
      try { await this.storage.set(this.QUEUE_KEY, []); } catch { /* ignore */ }
    }
  }

  /** Must be called once from HomePage init. Starts a session + launch event. */
  async init(): Promise<void> {
    if (!this.loaded) await this.hydrate();
    if (!this.enabled) return;
    this.track('app_launch');
    this.startSession();
    this.bindVisibility();
  }

  startSession(): void {
    if (!this.enabled) return;
    this.sessionId = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    this.sessionStart = Date.now();
    this.track('session_start', { sessionId: this.sessionId });
  }

  endSession(): void {
    if (!this.enabled || !this.sessionStart) return;
    const duration = Math.max(0, Math.round((Date.now() - this.sessionStart) / 1000));
    this.track('session_end', { duration, sessionId: this.sessionId });
    this.sessionStart = 0;
    void this.flush();
  }

  track(event: string, props?: Record<string, any>): void {
    if (!this.enabled || !event) return;
    this.queue.push({
      event,
      props: props || {},
      sessionId: this.sessionId,
      ts: Date.now(),
    });
    if (this.queue.length >= 20) void this.flush();
    else this.scheduleFlush();
  }

  async flush(): Promise<void> {
    if (!this.enabled || !this.queue.length || typeof navigator === 'undefined' || !navigator.onLine) return;
    const batch = this.queue.splice(0, 50);
    try {
      const res = await fetch(`${environment.rolodexApiBase}/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: this.rolodexSync.getDeviceId(), events: batch }),
        keepalive: true,
      });
      if (!res.ok) {
        // Put the batch back (bounded) on failure.
        this.queue = [...batch, ...this.queue].slice(-200);
      }
    } catch {
      this.queue = [...batch, ...this.queue].slice(-200);
    }
    try {
      await this.storage.set(this.QUEUE_KEY, this.queue);
    } catch { /* memory-only */ }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 5000);
  }

  private bindVisibility(): void {
    if (this.visibilityBound || typeof document === 'undefined') return;
    this.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.endSession();
      else if (document.visibilityState === 'visible') this.startSession();
    });
    window.addEventListener('pagehide', () => this.endSession());
  }
}
