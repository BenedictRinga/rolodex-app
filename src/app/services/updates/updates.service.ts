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
  appVersion: string = environment.version || '0.0.0';
  appBuild: number = Number(environment.build) || 0;
  serverVersion = '';
  serverBuild = 0;
  lastResult: { available: boolean; current: string; server: string; currentBuild: number; serverBuild: number } | null = null;
  lastCheckAt: number | null = null;
  private checked = false;
  private hasShownOfflineWarning = false;

  constructor(
    private readonly storageService: StorageService,
    private readonly alertsService: AlertsService,
    private readonly network: NetworkService,
    private readonly translate: TranslateService,
  ) {
    void this.initializeVersion();
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

  /** Persisted version — so a reload knows what it just updated TO. */
  async initializeVersion(): Promise<void> {
    try {
      const persisted = await this.getPersistedVersion();
      if (persisted) {
        this.appVersion = persisted;
      }
    } catch { /* first run */ }
  }

  async getPersistedVersion(): Promise<string> {
    try {
      const version = await this.storageService.get<string>('appVersion');
      return version || environment.version || '0.0.0';
    } catch {
      return environment.version || '0.0.0';
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
      this.serverVersion = deployed?.version || status.version;
      this.serverBuild = deployed?.build || 0;
      this.lastCheckAt = Date.now();
      this.checked = true;
      const byBuild = !!deployed && deployed.build > this.appBuild;
      const available = byBuild || (!deployed && status.isUpdateAvailable);
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

  /** 2026-08-20 THE ZYPPAR CHECK — /api/loopkeeper/updates/check?clientVersion=...
   *  2026-09-17 BUILD 241: the 232 build-gate here is REVERSED (founder:
   *  "Reverse the updates detection logic altered about 5 commits back. It
   *  has disrupted what works for what does not.") — this check reads the
   *  version endpoint exactly as it did before 232. The build.json truth
   *  machinery stays where 220 put it: check() / the banner / the quiet
   *  pop-up still compare deployed.build there; only what 232 altered is
   *  undone. */
  async checkForUpdates(): Promise<{ isUpdateAvailable: boolean; type: 'flexible' | 'immediate'; version: string; gate: 'offline' | 'ok' }> {
    if (!navigator.onLine) {
      return { isUpdateAvailable: false, type: 'flexible', version: this.appVersion, gate: 'offline' };
    }
    const res = await this.network.safeFetch(
      `${environment.rolodexApiBase}/updates/check?clientVersion=${encodeURIComponent(this.appVersion)}`,
      { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
    );
    if (!res) {
      // Offline / network changed — quiet fallback, never console noise.
      return { isUpdateAvailable: false, type: 'flexible', version: this.appVersion, gate: 'offline' };
    }
    if (!res.ok) throw new Error('update check failed');
    const data = await res.json();
    const version = String(data?.version || '').trim();
    const type: 'flexible' | 'immediate' = data?.type === 'immediate' ? 'immediate' : 'flexible';
    return {
      isUpdateAvailable: version !== '' && version !== this.appVersion,
      type,
      version,
      gate: 'ok',
    };
  }

  /** 2026-08-20 ZYPPAR MANUAL CHECK — never lies: surfaces the gate reason and
   *  the exact compared versions, so a failed/blocked check can never be
   *  presented as "up to date".
   *  2026-09-17 BUILD 241: REVERSED to the pre-232 shape (founder's order) —
   *  the version strings the Settings page always compared. */
  async manualCheckForUpdates(): Promise<{
    isUpdateAvailable: boolean;
    type: 'flexible' | 'immediate';
    version: string;
    gate: 'offline' | 'ok' | 'error';
    currentVersion: string;
    serverVersion: string;
    error?: string;
  }> {
    try {
      const status = await this.checkForUpdates();
      return {
        ...status,
        currentVersion: this.appVersion,
        serverVersion: status.version,
      };
    } catch (err) {
      return {
        isUpdateAvailable: false,
        type: 'flexible',
        version: this.appVersion,
        gate: 'error',
        currentVersion: this.appVersion,
        serverVersion: '',
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
