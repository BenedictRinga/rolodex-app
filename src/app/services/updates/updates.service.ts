import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';
import { AlertsService } from '../alerts/alerts.service';

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
  ) {
    void this.initializeVersion();
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
      const status = await this.checkForUpdates();
      this.serverVersion = status.version;
      this.serverBuild = 0;
      this.lastCheckAt = Date.now();
      this.checked = true;
      const available = status.isUpdateAvailable;
      this.lastResult = {
        available,
        current: this.appVersion,
        server: status.version,
        currentBuild: this.appBuild,
        serverBuild: 0,
      };
      return this.lastResult;
    } catch {
      return { available: false, current: this.appVersion, server: '', currentBuild: this.appBuild, serverBuild: 0 };
    }
  }

  /** 2026-08-20 THE ZYPPAR CHECK — /api/openloop/updates/check?clientVersion=... */
  async checkForUpdates(): Promise<{ isUpdateAvailable: boolean; type: 'flexible' | 'immediate'; version: string; gate: 'offline' | 'ok' }> {
    if (!navigator.onLine) {
      return { isUpdateAvailable: false, type: 'flexible', version: this.appVersion, gate: 'offline' };
    }
    const res = await fetch(
      `${environment.rolodexApiBase}/updates/check?clientVersion=${encodeURIComponent(this.appVersion)}`,
      { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
    );
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
   *  presented as "up to date". */
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
      await this.setVersion(newVersion);
      await this.alertsService.showToast(`Updating OpenLoop to v${newVersion}…`, 2500);
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
}
