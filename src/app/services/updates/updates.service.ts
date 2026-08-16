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
      const available = this.serverVersion !== '' && this.serverVersion !== this.appVersion;
      this.lastResult = { available, current: this.appVersion, server: this.serverVersion };
      return this.lastResult;
    } catch {
      return { available: false, current: this.appVersion, server: '' };
    }
  }

  /** Polite boot check — one notice per session, only when an update exists. */
  async noticeIfCritical(): Promise<boolean> {
    if (this.checked) return false;
    const { available, server } = await this.check();
    return available && server !== '';
  }
}
