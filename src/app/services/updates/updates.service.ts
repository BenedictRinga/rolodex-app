import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * 2026-08-16 AUTOMATIC UPDATES: the app polls the rolodex-server's /version and
 * compares it with its bundled version. A difference = an update is live; the
 * polite notice appears in Settings (and once on boot for critical changes —
 * these are early-stage builds, so no force reloads, just an informed tap).
 */
@Injectable({
  providedIn: 'root',
})
export class UpdatesService {
  appVersion: string = environment.version || '0.0.0';
  serverVersion = '';
  lastResult: { available: boolean; current: string; server: string } | null = null;
  lastCheckAt: number | null = null;
  private checked = false;

  async check(): Promise<{ available: boolean; current: string; server: string }> {
    try {
      const res = await fetch(`${environment.rolodexApiBase}/version`, { cache: 'no-store' });
      if (!res.ok) throw new Error('version fetch failed');
      const data = await res.json();
      this.serverVersion = String(data?.version || '').trim();
      this.lastCheckAt = Date.now();
      this.checked = true;
      // 2026-08-18 REAL SEMVER: an update exists only when the SERVER is NEWER,
      // not merely different (a stale server must never claim an update).
      const available = this.serverVersion !== '' && this.compareVersions(this.serverVersion, this.appVersion) > 0;
      this.lastResult = { available, current: this.appVersion, server: this.serverVersion };
      return this.lastResult;
    } catch {
      return { available: false, current: this.appVersion, server: '' };
    }
  }

  /** Simple semver compare: 0.3.0 > 0.2.10 > 0.2.0. */
  private compareVersions(a: string, b: string): number {
    const pa = String(a).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const da = pa[i] || 0;
      const db = pb[i] || 0;
      if (da > db) return 1;
      if (da < db) return -1;
    }
    return 0;
  }

  /** Polite boot check — one notice per session, only when an update exists. */
  async noticeIfCritical(): Promise<boolean> {
    if (this.checked) return false;
    const { available, server } = await this.check();
    return available && server !== '';
  }
}
