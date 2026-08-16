import { Injectable } from '@angular/core';
import { ContactInfo } from '../../models/contacts';
import { environment } from '../../../environments/environment';

/**
 * 2026-08-16 DEMO SYNC — the one-chance proof: the app talks to the fresh
 * `rolodex` database the moment it launches and after every contact change.
 * The investor "peek" view (zyppar.com/api/rolodex/live) shows the device
 * appear LIVE. Fire-and-forget — a demo sync failure must never break the app.
 */
@Injectable({ providedIn: 'root' })
export class RolodexSyncService {
  private deviceId = '';

  constructor() {
    this.deviceId = this.loadDeviceId();
  }

  private loadDeviceId(): string {
    try {
      const stored = localStorage.getItem('rolodex_device_id');
      if (stored) return stored;
      const id = 'rolodex-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem('rolodex_device_id', id);
      return id;
    } catch {
      return 'rolodex-' + Date.now().toString(36);
    }
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  /** The demo API base (see environment.prod.ts). */
  private apiBase(): string {
    return (window as any)?.__rolodexApiBase || 'https://zyppar.com/api/rolodex';
  }

  /** Push the current state — contacts + follow-up counts. Never blocks. */
  push(contacts: ContactInfo[], followUps?: any[]): void {
    try {
      const names = (contacts || []).map((c) => c?.name).filter(Boolean);
      void fetch(`${this.apiBase()}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.deviceId,
          deviceName: typeof navigator !== 'undefined' ? String(navigator.userAgent).slice(0, 40) : this.deviceId,
          contacts: (contacts || []).slice(0, 200),
          followUps: (followUps || []).slice(0, 200),
        }),
        keepalive: true,
      }).catch(() => undefined);
    } catch { /* ignore */ }
  }
}
