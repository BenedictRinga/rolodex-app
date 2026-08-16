import { Injectable } from '@angular/core';
import { ContactInfo } from '../../models/contacts';
import { environment } from '../../../environments/environment';

/**
 * 2026-08-16 DEMO SYNC — the one-chance proof: the app talks to the fresh
 * `rolodex` database the moment it launches and after every contact change.
 * The investor "peek" view (zyppar.com/api/rolodex/live) shows the device
 * appear LIVE. Fire-and-forget — a demo sync failure must never break the app.
 *
 * Also the "rolodex-server" STORAGE LOCATION (the B2B-style three-way choice:
 * Device / Cloud / Rolodex Server): restore() pulls the device's full contact
 * list back from the server, so the server is a real home, not a mirror.
 * The `room` code links Tom's device to yours live (the shared demo space).
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
    return environment.rolodexApiBase || 'https://zyppar.com/api/rolodex';
  }

  /** The demo room code (persisted) — links devices into one live space. */
  get room(): string {
    try { return localStorage.getItem('rolodex_room') || ''; } catch { return ''; }
  }
  setRoom(code: string): void {
    try { localStorage.setItem('rolodex_room', String(code || '').trim().toUpperCase().slice(0, 24)); } catch { /* ignore */ }
  }

  /** Push the current state — full contacts + follow-up counts + room. Never blocks. */
  push(contacts: ContactInfo[], followUps?: any[]): void {
    try {
      void fetch(`${this.apiBase()}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.deviceId,
          deviceName: typeof navigator !== 'undefined' ? String(navigator.userAgent).slice(0, 40) : this.deviceId,
          room: this.room,
          contacts: (contacts || []).slice(0, 500),
          followUps: (followUps || []).slice(0, 200),
        }),
        keepalive: true,
      }).catch(() => undefined);
    } catch { /* ignore */ }
  }

  /** Restore the device's full contact list from the Rolodex server.
   *  Returns null when the server has nothing (or is unreachable) — the
   *  caller keeps its local list. */
  async restore(): Promise<ContactInfo[] | null> {
    try {
      const res = await fetch(`${this.apiBase()}/state/${encodeURIComponent(this.deviceId)}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data?.contacts)) return null;
      return data.contacts as ContactInfo[];
    } catch { return null; }
  }
}
