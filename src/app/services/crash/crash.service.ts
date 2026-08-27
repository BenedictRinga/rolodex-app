import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';
import { NetworkService } from '../network/network.service';
import { StorageService } from '../storage/storage.service';

/**
 * 2026-08-27 CRASH REPORTING — the audit gap "you cannot fix what you never
 * see" closed without an external vendor (no Sentry account needed).
 *
 * Catches window.onerror + unhandledrejection, batches them, and POSTs to the
 * server's /crashes intake (one JSON line per event in data/crashes.jsonl).
 *
 * Privacy contract (mirrors AnalyticsService):
 * - gated by the SAME consent flag (`loopkeeper_analytics_enabled`) — a user
 *   who opted out of anonymous analytics sends no crash reports either;
 * - no query strings are ever sent (invite tokens can't leak into the log);
 * - only the page PATH, language, app build, platform and the error itself.
 */

interface CrashEvent {
  ts: number;
  type: 'error' | 'unhandledrejection';
  msg: string;
  stack: string;
  ver: string;
  plat: string;
  lang: string;
  page: string;
  ua: string;
}

/** Typed one-shot guard so the crash hooks install exactly once per page load. */
declare global {
  interface Window {
    __loopkeeperCrashWired?: boolean;
  }
}

@Injectable({ providedIn: 'root' })
export class CrashReporterService {
  private static readonly QUEUE_KEY = 'loopkeeper_crash_queue';
  private static readonly MAX_QUEUE = 60;
  private readonly queue: CrashEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private draining = false;
  private consented: boolean | null = null; // null = not yet resolved

  constructor(
    private readonly network: NetworkService,
    private readonly storage: StorageService,
  ) {
    if (typeof window === 'undefined' || window.__loopkeeperCrashWired) return;
    window.__loopkeeperCrashWired = true;

    window.addEventListener('error', (ev: ErrorEvent) => {
      this.record('error', ev?.message, ev?.error);
    });
    window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
      const r = ev?.reason;
      this.record(
        'unhandledrejection',
        typeof r === 'string' ? r : r?.message || String(r ?? 'unknown rejection'),
        r instanceof Error ? r : undefined,
      );
    });
    // Flush when the page goes away — last chance before the WebView dies.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void this.flush();
    });
    window.addEventListener('pagehide', () => { void this.flush(); });

    this.timer = setInterval(() => { void this.flush(); }, 30_000);
  }

  /** Resolve + cache the analytics consent flag once per session. */
  private async isConsented(): Promise<boolean> {
    if (this.consented !== null) return this.consented;
    try {
      const stored = await this.storage.get<boolean | string>('loopkeeper_analytics_enabled');
      this.consented = stored !== false && stored !== 'false';
    } catch {
      this.consented = true; // fail-open like AnalyticsService default-on
    }
    return this.consented;
  }

  record(type: CrashEvent['type'], message: string, error?: unknown): void {
    if (!message && !error) return;
    // Never report our own HTTP failures from reporting itself, or benign aborts.
    const msg = String(message || '').slice(0, 500);
    if (/AbortError|NetworkError|Failed to fetch/i.test(msg)) return;
    if (this.queue.length >= CrashReporterService.MAX_QUEUE) this.queue.shift();
    let stack = '';
    if (error instanceof Error) stack = String(error.stack || '').slice(0, 2000);
    this.queue.push({
      ts: Date.now(),
      type,
      msg,
      stack,
      ver: `${environment.version || ''}/b${environment.build}`,
      plat: Capacitor.isNativePlatform() ? `native:${Capacitor.getPlatform()}` : 'web',
      lang: (typeof navigator !== 'undefined' && navigator.language) || '',
      page: this.safePage(),
      ua: (typeof navigator !== 'undefined' && navigator.userAgent) || '',
    });
  }

  /** PATH ONLY — strip any ?query (invite tokens must never be reported). */
  private safePage(): string {
    try { return window.location.pathname.slice(0, 120); } catch { return ''; }
  }

  async flush(): Promise<void> {
    if (this.draining || !this.queue.length || !this.network.isOnline()) return;
    if (!(await this.isConsented())) { this.queue.length = 0; return; }
    // Also send anything persisted from a previous session first.
    let backlog: CrashEvent[] = [];
    try {
      const stored = await this.storage.get<CrashEvent[]>(CrashReporterService.QUEUE_KEY);
      if (Array.isArray(stored)) backlog = stored;
    } catch { /* ignore */ }
    const batch = [...backlog, ...this.queue].slice(-40); // cap request size
    if (!batch.length) return;
    this.draining = true;
    try {
      const res = await this.network.safeFetch(`${environment.rolodexApiBase}/crashes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      }, { timeoutMs: 10000 });
      if (res && res.ok) {
        this.queue.length = 0;
        await this.storage.remove(CrashReporterService.QUEUE_KEY);
      } else {
        // Offline/intake down: persist merged backlog, retry next cycle.
        this.queue.length = 0;
        await this.storage.set(CrashReporterService.QUEUE_KEY, batch);
      }
    } finally {
      this.draining = false;
    }
  }
}

