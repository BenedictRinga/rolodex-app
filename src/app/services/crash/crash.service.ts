import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';
import { NetworkService } from '../network/network.service';
import { StorageService } from '../storage/storage.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { WriteAuthService } from '../write-auth/write-auth.service';
import { RolodexSyncService } from '../rolodex-sync/rolodex-sync.service';

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
  /** BUILD 190: last `app_error` track time per type|page — 5s flood valve. */
  private readonly lastErrorTrack = new Map<string, number>();
  /** 2026-09-15 BUILD 213: the queue persists as it fills (debounced) — a HARD
   *  death (renderer gone, WebView killed) used to lose the in-memory queue,
   *  which is exactly why today's crashes never reached the ledger
   *  (crashes7d=1 while the founder sat through several). The next boot now
   *  ships the evidence as backlog. */
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly network: NetworkService,
    private readonly storage: StorageService,
    private readonly analytics: AnalyticsService,
    private readonly writeAuth: WriteAuthService,
    private readonly rolodexSync: RolodexSyncService,
  ) {
    if (typeof window === 'undefined' || window.__loopkeeperCrashWired) return;
    window.__loopkeeperCrashWired = true;

    // 2026-09-16 BUILD 220 THE HEAL, MADE REAL (Deepseek's WRITE_CODE.txt:
    // "the heal is dead code in production" — with module scripts a failed
    // chunk arrives as a RESOURCE error whose message is EMPTY, the
    // ChunkLoadError text only ever shows in console.error, and record()
    // discarded empty-message events. All three are fixed below.)
    // (a) bubble-phase JS errors (as before);
    window.addEventListener('error', (ev: ErrorEvent) => {
      const msg = String(ev?.message || '');
      this.record('error', msg, ev?.error);
      this.maybeHeal(msg);
    });
    // (b) CAPTURE-phase resource errors: a <script>/<link> that fails to
    //     load fires here with an EMPTY message — the stale-chunk signature
    //     this reporter was blind to. Record it with the URL as the label.
    window.addEventListener('error', (ev: Event) => {
      const tgt = ev?.target as any;
      if (!tgt || !(tgt.tagName === 'SCRIPT' || tgt.tagName === 'LINK' || tgt.tagName === 'IMG')) return;
      const url = String(tgt.src || tgt.href || '');
      if (!url) return;
      const isOurs = url.includes('/loopkeeper/') || url.startsWith(location.origin);
      this.record('error', isOurs ? `resource-error: ${url.slice(0, 200)}` : '', undefined);
      // A missing app script is the stale-chunk death — heal it.
      if (isOurs && /\.(js|mjs)(\?|$)/.test(url)) this.maybeHeal('resource-error ' + url.slice(0, 120));
    }, true);
    // (c) console.error sniff: webpack/Angular route the ChunkLoadError text
    //     and the module-MIME complaint here — the window error never has it.
    const origError = console.error.bind(console);
    console.error = (...args: any[]) => {
      try {
        const text = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ');
        if (/ChunkLoadError|Loading chunk .+ failed|Failed to load module script/i.test(text)) {
          this.record('error', text.slice(0, 300), undefined);
          this.maybeHeal(text.slice(0, 160));
        }
      } catch { /* never break the console */ }
      origError(...args);
    };
    window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
      const r = ev?.reason;
      const msg = typeof r === 'string' ? r : r?.message || String(r ?? 'unknown rejection');
      this.record('unhandledrejection', msg, r instanceof Error ? r : undefined);
      this.maybeHeal(msg); // BUILD 220: a rejected lazy import() is the same death
    });
    // Flush when the page goes away — last chance before the WebView dies.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void this.flush();
    });
    window.addEventListener('pagehide', () => { void this.flush(); });

    this.timer = setInterval(() => { void this.flush(); }, 30_000);
  }

  /** 2026-09-16 BUILD 220: THE HEAL — one gate for every stale-chunk
   *  signature (window error text, resource error, console.error,
   *  unhandledrejection). Reload ONCE per tab (sessionStorage guard — never
   *  a loop; a second failure stays visible and reaches the ledger). */
  private maybeHeal(reason: string): void {
    if (!reason || !/ChunkLoadError|Loading chunk .+ failed|Failed to load module script|resource-error/i.test(reason)) return;
    let reloaded = false;
    try { reloaded = !!sessionStorage.getItem('lk_chunk_reloaded'); } catch { /* private mode */ }
    if (reloaded) return;
    try { sessionStorage.setItem('lk_chunk_reloaded', String(Date.now())); } catch { /* private mode */ }
    // 2026-09-16 BUILD 222: mark this reload MACHINE-DRIVEN — the next boot
    // must not count it as app_launch/session_start/landing_source (the
    // founder's false-positive doubt: the heal fixed the death; the meter
    // must not count the resurrection as a birth).
    try { sessionStorage.setItem('lk_machine_reload', String(Date.now())); } catch { /* private mode */ }
    // 2026-09-17 BUILD 248 THE EVIDENCE SURVIVES THE HEAL: the 220-era heal
    // reloaded at +150ms while the crash evidence's IndexedDB write was
    // debounced at +800ms — the heal destroyed its own evidence (crashes7d
    // read 0 while the founder sat through crashes). Now the queue is
    // written THROUGH and awaited, and the analytics app_error rides its
    // keepalive POST (keepalive survives the unload), before the reload.
    void (async () => {
      try { await this.storage.set(CrashReporterService.QUEUE_KEY, this.queue); } catch { /* best effort */ }
      try { await this.analytics.flush(); } catch { /* best effort */ }
      setTimeout(() => { try { window.location.reload(); } catch { /* ignore */ } }, 60);
    })();
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
    // BUILD 220: resource errors arrive with an empty message — the caller
    // passes the URL as a synthetic label, so only truly-empty records bail.
    if (!message && !error) return;
    // Never report our own HTTP failures from reporting itself, or benign aborts.
    const msg = String(message || '').slice(0, 500);
    if (/AbortError|NetworkError|Failed to fetch/i.test(msg)) return;
    // 2026-09-14 BUILD 190 (founder: global app error analytics is MORE
    // SCALABLE than a file ledger): every crash/rejection also fires the
    // `app_error` analytics event — it rides the same batched, idempotent,
    // hourly-capped ingest as every other event, so the Command Center counts
    // errors without reading a server file. Categorical props ONLY (type +
    // page path — no message text; the detailed msg/stack still go to the
    // /crashes JSONL ledger below). Flood throttle: at most one track per
    // type+page every 5s, so a render-loop error cannot crowd the queue.
    try {
      const page = this.safePage();
      const key = `${type}|${page}`;
      const now = Date.now();
      if ((this.lastErrorTrack.get(key) || 0) < now - 5_000) {
        this.lastErrorTrack.set(key, now);
        this.analytics.track('app_error', { type, page });
      }
    } catch { /* analytics optional by design */ }
    if (this.queue.length >= CrashReporterService.MAX_QUEUE) this.queue.shift();
    let stack = '';
    if (error instanceof Error) stack = String(error.stack || '').slice(0, 2000);
    this.queue.push({
      ts: Date.now(),
      type,
      msg,
      stack,
      // BUILD 263: the crash row's ver composes from the build (0.3.<build>)
      // — the static "0.3.1" never ticked, and the ledger must say which
      // bundle died, in the same version language Settings speaks.
      ver: `0.3.${Number(environment.build) || 0}/b${environment.build}`,
      plat: Capacitor.isNativePlatform() ? `native:${Capacitor.getPlatform()}` : 'web',
      lang: (typeof navigator !== 'undefined' && navigator.language) || '',
      page: this.safePage(),
      ua: (typeof navigator !== 'undefined' && navigator.userAgent) || '',
    });
    // 2026-09-15 BUILD 213: write-through as the queue fills (debounced 800ms)
    // — the evidence survives a hard death even when no flush ever runs.
    this.schedulePersist();
  }

  /** BUILD 213: debounced write-through of the crash queue to IndexedDB. */
  private schedulePersist(): void {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.storage.set(CrashReporterService.QUEUE_KEY, this.queue.slice(-40)).catch(() => { /* best effort */ });
    }, 800);
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
        // 2026-09-23 BUILD 312: the write token rides (server 124's gate).
        headers: { 'Content-Type': 'application/json', ...(await this.writeAuth.authHeaders(this.rolodexSync.getDeviceId())) },
        body: JSON.stringify({ events: batch }),
      }, { timeoutMs: 10000 });
      if (res && (res.status === 401 || res.status === 403)) this.writeAuth.invalidate(this.rolodexSync.getDeviceId());
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

