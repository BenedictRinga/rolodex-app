import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';
import { RolodexSyncService } from '../rolodex-sync/rolodex-sync.service';
import { NetworkService } from '../network/network.service';

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
 * - 2026-08-29 BUILD 149: plus coarse categorical LOCALE signals (IANA
 *   timezone, language subtags) — shared by millions, collected without IP
 *   or geolocation, to answer "where in the world / which language" in
 *   aggregate only.
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
  private readonly VISITS_KEY = 'loopkeeper_analytics_visits';
  private readonly FIRST_SEEN_KEY = 'loopkeeper_analytics_first_seen';
  private readonly TOTAL_SECONDS_KEY = 'loopkeeper_analytics_total_seconds';
  // 2026-08-31 BUILD 159 (founder): fires once EVER per device — the moment a
  // real person's card is added, whatever door it came through.
  private readonly LIST_STARTED_KEY = 'loopkeeper_list_started';
  // 2026-08-28 CLOSED BETA: the invite deeplink (?t=<6-digit code>) is absorbed
  // once and tags every later event. Numeric only — no name, no phone, no email.
  private readonly TESTER_ID_KEY = 'loopkeeper_tester_id';

  private enabled = true;
  private loaded = false;
  private queue: AnalyticsEventPayload[] = [];
  private sessionId = '';
  private sessionStart = 0;
  private flushTimer: any = null;
  private visibilityBound = false;
  // 2026-08-31 BUILD 159: in-session backstop when storage is unavailable —
  // device_list_started must still fire at most once per session.
  private listStartedSent = false;
  // 2026-08-24 SELF-REPORT: the device tells its OWN anonymous story — how many
  // times it has been here, whether it is returning, and how long it has spent
  // in total. No phone number, no name, no server-side identity needed.
  private visitNumber = 0;
  private firstSeenAt = 0;
  private totalSessionSeconds = 0;
  private testerId = 0;

  constructor(
    private readonly storage: StorageService,
    private readonly rolodexSync: RolodexSyncService,
    private readonly network: NetworkService,
  ) {
    void this.hydrate();
  }

  private async hydrate(): Promise<void> {
    try {
      const stored = await this.storage.get<boolean | string>(this.ENABLED_KEY);
      this.enabled = stored === undefined || stored === null ? true : stored === true || stored === '1' || stored === 'true';
      const q = await this.storage.get<AnalyticsEventPayload[]>(this.QUEUE_KEY);
      this.queue = Array.isArray(q) ? q.slice(-200) : [];
      this.visitNumber = Number(await this.storage.get<number>(this.VISITS_KEY)) || 0;
      this.firstSeenAt = Number(await this.storage.get<number>(this.FIRST_SEEN_KEY)) || 0;
      this.totalSessionSeconds = Number(await this.storage.get<number>(this.TOTAL_SECONDS_KEY)) || 0;
      // 2026-08-28 CLOSED BETA: absorb ?t=<code> from the invite deeplink (or
      // keep the stored one). A fresh code always wins; anything non-numeric
      // is ignored so junk params can never become an identity.
      const storedTester = Number(await this.storage.get<number>(this.TESTER_ID_KEY)) || 0;
      let fromUrl = 0;
      try {
        fromUrl = Number(new URLSearchParams(location.search).get('t')) || 0;
      } catch { /* no location (SSR/test) */ }
      if (fromUrl >= 100000 && fromUrl <= 999999) {
        this.testerId = fromUrl;
        if (fromUrl !== storedTester) await this.storage.set(this.TESTER_ID_KEY, fromUrl);
      } else {
        this.testerId = storedTester;
      }
    } catch {
      this.enabled = true;
      this.queue = [];
    }
    this.loaded = true;
  }

  /** The absorbed closed-beta invite code (0 when this is not a tester device). */
  getTesterId(): number {
    return this.testerId || 0;
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
    const now = Date.now();
    this.visitNumber = (this.visitNumber || 0) + 1;
    if (!this.firstSeenAt) this.firstSeenAt = now;
    try {
      await this.storage.set(this.VISITS_KEY, this.visitNumber);
      await this.storage.set(this.FIRST_SEEN_KEY, this.firstSeenAt);
      await this.storage.set(this.TOTAL_SECONDS_KEY, this.totalSessionSeconds);
    } catch { /* best effort */ }
    const daysSinceFirstUse = Math.max(0, Math.floor((now - this.firstSeenAt) / 86400_000));
    this.track('app_launch', {
      visitNumber: this.visitNumber,
      isReturning: this.visitNumber > 1,
      daysSinceFirstUse,
      totalTimeSpentSeconds: this.totalSessionSeconds,
      ...this.localeProps(), // 2026-08-29 BUILD 149: where in the world, in language terms
    });
    this.startSession();
    this.bindVisibility();
  }

  startSession(): void {
    if (!this.enabled) return;
    this.sessionId = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    this.sessionStart = Date.now();
    const now = Date.now();
    const daysSinceFirstUse = this.firstSeenAt ? Math.max(0, Math.floor((now - this.firstSeenAt) / 86400_000)) : 0;
    this.track('session_start', {
      sessionId: this.sessionId,
      visitNumber: this.visitNumber,
      isReturning: this.visitNumber > 1,
      daysSinceFirstUse,
      totalTimeSpentSeconds: this.totalSessionSeconds,
      ...this.localeProps(), // 2026-08-29 BUILD 149
    });
  }

  /* 2026-08-29 BUILD 149 (founder: "Can we know what part of the world our
   *  users are coming from, languages, culture, and if they prefer to switch
   *  languages?"): privacy-safe locale signals — NO IP, NO geolocation API,
   *  nothing identifying:
   *  - tz: the IANA timezone string (e.g. "Africa/Nairobi") — shared by
   *    millions, it pins country-level region without touching the network
   *    stack; the standard no-IP geography proxy.
   *  - tzRegion: its first segment ("Africa") for coarse continental views.
   *  - deviceLang: the device UI language's primary subtag ("sw", "en").
   *  - appLang: the language LoopKeeper is actually running in (saved choice
   *    wins over device) — the gap between the two IS the preference signal. */
  private localeProps(): Record<string, string> {
    const out: Record<string, string> = {};
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz) { out['tz'] = tz; out['tzRegion'] = tz.split('/')[0]; }
    } catch { /* no Intl — skip geography, keep language */ }
    try {
      out['deviceLang'] = String(navigator.language || '').split('-')[0].toLowerCase();
    } catch { /* ignore */ }
    try {
      const saved = localStorage.getItem('loopkeeper_language');
      out['appLang'] = (saved || out['deviceLang'] || '').split('-')[0].toLowerCase();
    } catch { /* ignore */ }
    return out;
  }

  endSession(): void {
    if (!this.enabled || !this.sessionStart) return;
    const duration = Math.max(0, Math.round((Date.now() - this.sessionStart) / 1000));
    this.totalSessionSeconds += duration;
    try { void this.storage.set(this.TOTAL_SECONDS_KEY, this.totalSessionSeconds); } catch { /* best effort */ }
    this.track('session_end', {
      duration,
      sessionId: this.sessionId,
      totalTimeSpentSeconds: this.totalSessionSeconds,
    });
    this.sessionStart = 0;
    void this.flush();
  }

  track(event: string, props?: Record<string, any>): void {
    if (!this.enabled || !event) return;
    // 2026-08-28 CLOSED BETA: tester devices tag every event with their numeric
    // invite code so the founder roster can measure compliance anonymously.
    const merged = { ...(props || {}), ...(this.testerId ? { testerId: this.testerId } : {}) };
    this.queue.push({
      event,
      props: merged,
      sessionId: this.sessionId,
      ts: Date.now(),
    });
    if (this.queue.length >= 20) void this.flush();
    else this.scheduleFlush();
  }

  /**
   * 2026-08-31 BUILD 159 (founder): device_list_started — the moment a real
   * person's card is added, however it arrives (walk confirm, device pick,
   * manual entry, contact share accepted). Fires ONCE EVER per device: the
   * flag lives in storage, so it marks the beginning of the list, not an
   * action repeat. Investors: the Activation table's first row, "Started
   * their list". Anonymous — a categorical door name only, no card data.
   */
  async trackListStartedOnce(source: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const done = await this.storage.get<boolean | string>(this.LIST_STARTED_KEY);
      if (done === true || done === '1' || done === 'true') return;
      await this.storage.set(this.LIST_STARTED_KEY, true);
    } catch {
      // storage unavailable: still send once per session rather than never —
      // the server dedupes nothing here, but activation counts distinct
      // devices, so repeats never inflate the number.
      if (this.listStartedSent) return;
    }
    this.listStartedSent = true;
    this.track('device_list_started', { source: String(source || '').slice(0, 24) });
  }

  async flush(): Promise<void> {
    if (!this.enabled || !this.queue.length || typeof navigator === 'undefined' || !navigator.onLine) return;
    const batch = this.queue.splice(0, 50);
    try {
      const res = await this.network.safeFetch(`${environment.rolodexApiBase}/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: this.rolodexSync.getDeviceId(), events: batch }),
        keepalive: true,
      });
      if (!res || !res.ok) {
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
