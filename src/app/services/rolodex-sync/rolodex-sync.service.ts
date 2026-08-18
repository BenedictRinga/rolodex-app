import { Injectable } from '@angular/core';
import { ContactInfo } from '../../models/contacts';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';


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

  private ownerPhone = '';
  private ownerName = '';
  /** 2026-08-18 PROFILE HYDRATION promise: the IndexedDB read is async, so
   *  callers must await senderNameAsync() before composing invites/shares. */
  private profileReady: Promise<void>;

  /** 2026-08-18: register the device's identity for the Users DB. */
  setOwnerIdentity(phone: string, name: string): void {
    this.ownerPhone = String(phone || '').trim();
    this.ownerName = String(name || '').trim();
  }

  /** 2026-08-18: the sender's display name for invites/shares - from the My
   *  Profile settings, never the socket's 'Guest' default. */
  get senderName(): string {
    return this.ownerName || 'Me';
  }

  /** Await this before composing an invite/share so the real profile name is
   *  loaded from IndexedDB instead of the 'Me' fallback. */
  async senderNameAsync(): Promise<string> {
    await this.profileReady;
    return this.senderName;
  }

  constructor(
    private readonly storage: StorageService,
    ) {
    this.deviceId = this.loadDeviceId();
    this.profileReady = this.hydrateProfile();
  }

  private async hydrateProfile(): Promise<void> {
    try {
      // 2026-08-18 FIX: getSync() only reads the in-memory cache which is empty
      // at service construction - use the real async IndexedDB read.
      const p = await this.storage.get<any>('rolodex_profile');
      if (p && typeof p === 'object') {
        this.ownerName = String(p?.name || '').trim();
        this.ownerPhone = String(p?.phone || '').trim();
      }
    } catch { /* fresh profile */ }
  }

  private loadDeviceId(): string {
    try {
      const stored = this.storage.getSync<string>('rolodex_device_id'); // 2026-08-18 IndexedDB memory cache
      if (stored) return stored;
      const id = 'rolodex-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      this.storage.setSync('rolodex_device_id', id);
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
    try { return this.storage.getSync<string>('rolodex_room') || ''; } catch { return ''; }
  }
  setRoom(code: string): void {
    try { this.storage.setSync('rolodex_room', String(code || '').trim().toUpperCase().slice(0, 24)); } catch { /* ignore */ }
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
          // 2026-08-18 THE USERS DB: the sync registers the owner's identity so
          // the chat can tell a sender whether a sendee is reachable in-app.
          ownerPhone: this.ownerPhone,
          ownerName: this.ownerName,
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
