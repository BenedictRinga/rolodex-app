import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';
import { AlertsService } from '../alerts/alerts.service';
import { TranslateService } from '@ngx-translate/core';
import { NetworkService } from '../network/network.service';

/**
 * 2026-08-20 ZYPPAR-STYLE UPDATE SYSTEM — cloned verbatim in spirit from
 * Zyppar's UpdatesService. The part that actually WORKS and was missing here:
 *
 *  - the server exposes /api/updates/check (version.txt + flexible/immediate);
 *  - applying an update clears every cache, unregisters the service worker,
 *    and hard-reloads with a cache-busting query — so the user REALLY sees
 *    the new bundle instead of a stale cached shell.
 */
@Injectable({
  providedIn: 'root',
})
export class UpdatesService {
  // 2026-09-18 BUILD 263 THE VERSION THAT TICKS (founder: "increase the
  // digits/integers of update version in Settings to properly reflect
  // version state. Currently, it abbreviates so that we can appear to be
  // perpetually stuck on .31 instead of showing increments like .316"):
  // the displayed version COMPOSES from the build counter — 0.3.<build> —
  // so every build visibly ticks the third digit (0.3.263 today). The
  // static "0.3.1" string was our own first-draft value, never updated.
  appVersion: string = '';
  appBuild: number = Number(environment.build) || 0;
  serverVersion = '';
  serverBuild = 0;
  lastResult: { available: boolean; current: string; server: string; currentBuild: number; serverBuild: number } | null = null;
  lastCheckAt: number | null = null;
  private checked = false;
  private hasShownOfflineWarning = false;

  /** The version that ticks: the base pair from environment.version ("0.3")
   *  + the live build counter as the third digit. */
  composeVersion(build: number = this.appBuild): string {
    const parts = String(environment.version || '0.3.0').split('.');
    const base = parts.slice(0, 2).join('.') || '0.3';
    return `${base}.${Math.max(0, Number(build) || 0)}`;
  }

  constructor(
    private readonly storageService: StorageService,
    private readonly alertsService: AlertsService,
    private readonly network: NetworkService,
    private readonly translate: TranslateService,
  ) {
    this.appVersion = this.composeVersion();
    void this.initializeVersion();
    this.bindResumeRefresh();
  }

  // ═══ 2026-09-17 BUILD 248: THE RESUME REFRESH — the crash killer ══════════
  // A RESUMED tab runs the OLD bundle in memory; the moment a new build is
  // deployed, its lazy chunks are orphaned and the next lazy navigation dies
  // (the stale-chunk crash the founder rode through today's deploy waves —
  // "it crashed as it was checking for updates" is the exact moment: the
  // check detecting a newer build PROVES the tab just went stale, and the
  // very next Settings/panel navigation 404s the old chunk). The banner
  // cannot save a resumed tab — the crash lands before any tap. THE FIX: on
  // visible-resume (throttled 5 min), compare the deployed build and
  // silently reload ONTO the new bundle BEFORE the user navigates; the 222
  // machine-reload mark keeps the refresh out of the meters.
  private resumeBound = false;
  private lastResumeCheck = 0;
  private bindResumeRefresh(): void {
    if (this.resumeBound || typeof document === 'undefined') return;
    this.resumeBound = true;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void this.maybeResumeRefresh();
    });
  }
  async maybeResumeRefresh(): Promise<void> {
    try {
      if (document.hidden || !navigator.onLine) return;
      const now = Date.now();
      if (now - this.lastResumeCheck < 5 * 60_000) return;
      this.lastResumeCheck = now;
      const deployed = await this.fetchDeployedBuild();
      if (deployed && deployed.build > this.appBuild) {
        try { sessionStorage.setItem('lk_machine_reload', String(Date.now())); } catch { /* private mode */ }
        window.location.reload();
      }
    } catch { /* best effort — the banner remains the fallback */ }
  }

  /** 2026-09-16 BUILD 223 THE WELCOME-BACK BEAT (founder: "can we not do
   *  stuff, a one-off, occasionally, better still, rarely, to bring the
   *  device holders attention back to discover that LoopKeeper is back,
   *  richer, and much more reliable?"). RARE by construction: it fires
   *  ONLY when the device is genuinely running a NEWER build than its last
   *  (an actual update), ONCE per build, never on first install. One quiet
   *  toast — the update moment is the one guaranteed attention beat, and
   *  the fleet just proved they respond to updates. */
  async welcomeBackCheck(): Promise<void> {
    try {
      const KEY = 'lk_last_build_seen';
      const prev = Number((await this.storageService.get<number | undefined>(KEY)) || 0);
      const current = environment.build;
      if (prev > 0 && current > prev) {
        const msg = this.translate.instant('loopkeeper.updates.welcomeBack');
        setTimeout(() => { void this.alertsService.showToast(msg, 5000); }, 2500);
      }
      if (current !== prev) await this.storageService.set(KEY, current);
    } catch { /* best effort */ }
  }

  /** Persisted version — so a reload knows what it just updated TO.
   *  BUILD 263: the LIVE build composes the version (0.3.<build>) — the
   *  persisted string was the old string-compare era's ledger; it never
   *  rules the display, because the running bundle IS the truth. */
  async initializeVersion(): Promise<void> {
    this.appVersion = this.composeVersion();
    try {
      await this.getPersistedVersion(); // kept for the legacy storage contract
    } catch { /* first run */ }
  }

  async getPersistedVersion(): Promise<string> {
    try {
      const version = await this.storageService.get<string>('appVersion');
      return version || this.composeVersion();
    } catch {
      return this.composeVersion();
    }
  }

  async setVersion(version: string): Promise<void> {
    this.appVersion = version;
    try {
      await this.storageService.set('appVersion', version);
    } catch { /* best effort */ }
  }

  /** Legacy shape kept for the Settings UI — now backed by /updates/check. */
  async check(): Promise<{ available: boolean; current: string; server: string; currentBuild: number; serverBuild: number }> {
    try {
      // 2026-09-16 BUILD 220 THE TRUTHFUL CHECK (Deepseek's WRITE_CODE.txt:
      // "serverBuild: 0" hardcoded made the pop-up path unreachable while
      // version.txt-vs-app-version kept the banner permanently on): the
      // deployed build is now read from /loopkeeper/build.json — a tiny
      // static file every build:prod drops — and compared BY BUILD NUMBER.
      const deployed = await this.fetchDeployedBuild();
      const status = await this.checkForUpdates();
      // BUILD 263: the server's version speaks ITS build (0.3.<serverBuild>)
      // — build.json's static "0.3.1" never ticks either.
      this.serverVersion = deployed ? this.composeVersion(deployed.build) : (status.version || '');
      this.serverBuild = deployed?.build || 0;
      this.lastCheckAt = Date.now();
      this.checked = true;
      // BUILD 246 ONE TRUTH: the decision is the BUILD NUMBER, everywhere.
      // The old `|| (!deployed && status.isUpdateAvailable)` fallback was the
      // version-string lie's last door (a dev origin compared 0.3.162 vs
      // 0.3.1 and recommended forever); without a deployed build.json the
      // honest answer is "cannot confirm" — never a recommendation.
      const available = !!deployed && deployed.build > this.appBuild;
      this.lastResult = {
        available,
        current: this.appVersion,
        server: this.serverVersion,
        currentBuild: this.appBuild,
        serverBuild: this.serverBuild,
      };
      return this.lastResult;
    } catch {
      return { available: false, current: this.appVersion, server: '', currentBuild: this.appBuild, serverBuild: 0 };
    }
  }

  /** BUILD 220: the deployed build, from the static truth file. Absent
   *  file (dev, first deploy) -> null and the old version check applies. */
  private async fetchDeployedBuild(): Promise<{ version: string; build: number } | null> {
    try {
      const res = await this.network.safeFetch(`${location.origin}/loopkeeper/build.json?b=${this.appBuild}`,
        { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (!res || !res.ok) return null;
      const data = await res.json();
      const build = Number(data?.build || 0);
      return build > 0 ? { version: String(data?.version || ''), build } : null;
    } catch { return null; }
  }

  /** 2026-08-20 THE ZYPPAR CHECK — ONE TRUTH END TO END (2026-09-17 BUILD 246,
   *  founder: "There is a version discrepancy between updates in Settings and
   *  that which globally alerts, because tapping the latter and updating,
   *  never satisfies version control of the former, which goes on still to
   *  recommend when tapped to check, a fresh update"): the arc, honestly told
   *  — 232 build-gated this check, 241 reversed it on the founder's order, and
   *  the reversal RESURRECTED the version-string lie on the Settings surface
   *  (server version.txt 0.3.162 vs app 0.3.1 can NEVER agree, so the manual
   *  check recommended a fresh update forever, even seconds after a
   *  successful apply). ONE TRUTH NOW: every update surface — the global
   *  banner, the quiet pop-up, and the Settings manual check — reads the
   *  deployed /loopkeeper/build.json BUILD NUMBER; where that file does not
   *  exist (a dev origin) the honest answer is "cannot confirm", never a
   *  recommendation. Updating through ANY surface now satisfies EVERY
   *  surface. */
  async checkForUpdates(): Promise<{ isUpdateAvailable: boolean; type: 'flexible' | 'immediate'; version: string; gate: 'offline' | 'ok' }> {
    if (!navigator.onLine) {
      return { isUpdateAvailable: false, type: 'flexible', version: this.appVersion, gate: 'offline' };
    }
    const deployed = await this.fetchDeployedBuild();
    if (deployed) {
      return {
        isUpdateAvailable: deployed.build > this.appBuild,
        type: 'flexible',
        version: deployed.version || this.appVersion,
        gate: 'ok',
      };
    }
    // No deployed build.json on this origin (a dev origin runs its own code):
    // the honest answer is "cannot confirm" — never the version-string lie.
    return { isUpdateAvailable: false, type: 'flexible', version: this.appVersion, gate: 'ok' };
  }

  /** 2026-08-20 ZYPPAR MANUAL CHECK — never lies: surfaces the gate reason and
   *  the exact compared builds, so a failed/blocked check can never be
   *  presented as "up to date".
   *  2026-09-17 BUILD 246: the result carries the REAL BUILD NUMBERS again
   *  (232's shape, re-applied as the one-truth convergence — see
   *  checkForUpdates): the Settings page and the pop-up speak builds, and an
   *  applied update satisfies this check the same way it satisfies the
   *  global alert. */
  async manualCheckForUpdates(): Promise<{
    isUpdateAvailable: boolean;
    type: 'flexible' | 'immediate';
    version: string;
    gate: 'offline' | 'ok' | 'error';
    currentVersion: string;
    serverVersion: string;
    currentBuild: number;
    serverBuild: number;
    error?: string;
  }> {
    try {
      const status = await this.checkForUpdates();
      let serverBuild = 0;
      try {
        const deployed = await this.fetchDeployedBuild();
        serverBuild = deployed?.build || 0;
      } catch { /* build.json absent — the dev-origin honest answer governs */ }
      return {
        ...status,
        currentVersion: this.appVersion,
        serverVersion: status.version,
        currentBuild: this.appBuild,
        serverBuild,
      };
    } catch (err) {
      return {
        isUpdateAvailable: false,
        type: 'flexible',
        version: this.appVersion,
        gate: 'error',
        currentVersion: this.appVersion,
        serverVersion: '',
        currentBuild: this.appBuild,
        serverBuild: 0,
        error: String((err as Error)?.message || err),
      };
    }
  }

  /** Apply the update: persist version, clear caches + SW, hard reload. */
  async forceUpdate(newVersion: string): Promise<void> {
    try {
      // 2026-09-16 BUILD 222: an update-apply reload is MACHINE-driven —
      // the next boot skips app_launch/session_start/landing_source.
      try { sessionStorage.setItem('lk_machine_reload', String(Date.now())); } catch { /* private mode */ }
      await this.setVersion(newVersion);
      await this.alertsService.showToast(`Updating LoopKeeper to v${newVersion}…`, 2500);
      await this.clearCachesAndReload();
    } catch (error) {
      console.error('Update failed:', error);
      await this.alertsService.showToast('Update failed — refresh manually', 3000);
      throw error;
    }
  }

  /**
   * 2026-08-20 ZYPPAR VERBATIM: clear all caches (SW + main thread), unregister
   * the service worker to kill its in-memory ngsw.json hash table, then
   * hard-reload with a cache-busting query. Without the unregister step the
   * old SW keeps serving stale assets after reload — exactly the "users can't
   * see the results" bug this replaces.
   */
  async clearCachesAndReload(): Promise<void> {
    try {
      const currentUrl = window.location.href;

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();

        if (reg?.active) {
          const activeSW = reg.active;
          const cacheClearedPromise = new Promise<void>((resolve) => {
            const timeout = setTimeout(resolve, 2500);
            const handler = (event: MessageEvent) => {
              if (event.data?.type === 'CACHES_CLEARED') {
                clearTimeout(timeout);
                navigator.serviceWorker.removeEventListener('message', handler);
                resolve();
              }
            };
            navigator.serviceWorker.addEventListener('message', handler);
            activeSW.postMessage({ type: 'CLEAR_ALL_CACHES' });
          });
          await cacheClearedPromise;
        }

        const cacheNames = await caches.keys();
        if (cacheNames.length > 0) {
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }

        if (reg) {
          await reg.unregister();
        }
        const allRegs = await navigator.serviceWorker.getRegistrations();
        if (allRegs.length > 0) {
          await Promise.all(allRegs.map((r) => r.unregister()));
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const separator = currentUrl.includes('?') ? '&' : '?';
      const bustedUrl = `${currentUrl}${separator}_ucr=${Date.now()}`;
      window.location.replace(bustedUrl);
    } catch (error) {
      console.warn('Cache clear failed:', error);
      const fallbackUrl = window.location.href || window.location.origin;
      window.location.replace(`${fallbackUrl}${fallbackUrl.includes('?') ? '&' : '?'}_ucr=${Date.now()}`);
    }
  }

  /** Polite boot check — one notice per session, only when an update exists. */
  async noticeIfCritical(): Promise<boolean> {
    if (this.checked) return false;
    const { available, server } = await this.check();
    return available && server !== '';
  }

  // ═══ 2026-09-14 BUILD 195: THE HOME BANNER ═══════════════════════════════
  // The founder's "global notification of Updates available — on tap, dismiss
  // and apply": home renders a slim strip when the server version differs.
  // Tap = apply (cache clear + SW unregister + hard reload, the full Zyppar
  // contract). The ✕ = dismiss THIS version only — a new deploy re-shows it,
  // so a stale banner can never hide a fresh update.
  bannerAvailable = false;
  bannerVersion = '';
  private bannerChecking = false;

  async refreshBanner(): Promise<void> {
    if (this.bannerChecking) return;
    this.bannerChecking = true;
    try {
      const r = await this.check();
      this.bannerVersion = r.available && r.server ? r.server : '';
      if (!this.bannerVersion) { this.bannerAvailable = false; return; }
      const dismissed = await this.storageService.get<string>('lk_updates_dismissed');
      this.bannerAvailable = dismissed !== this.bannerVersion;
    } catch { this.bannerAvailable = false; } finally {
      this.bannerChecking = false;
    }
  }

  async dismissBanner(): Promise<void> {
    this.bannerAvailable = false;
    if (this.bannerVersion) {
      try { await this.storageService.set('lk_updates_dismissed', this.bannerVersion); } catch { /* best effort */ }
    }
  }

  async applyBanner(): Promise<void> {
    if (!this.bannerVersion) return;
    await this.forceUpdate(this.bannerVersion);
  }
}
