import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ContactInfo } from '../../models/contacts';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';


/**
 * 2026-08-16 DEMO SYNC — the one-chance proof: the app talks to the fresh
 * `rolodex` database the moment it launches and after every contact change.
 * The investor "peek" view (zyppar.com/api/loopkeeper/live) shows the device
 * appear LIVE. Fire-and-forget — a demo sync failure must never break the app.
 *
 * Also the "rolodex-server" STORAGE LOCATION (the B2B-style three-way choice:
 * Device / Cloud / Rolodex Server): restore() pulls the device's full contact
 * list back from the server, so the server is a real home, not a mirror.
 * The `room` code links Tom's device to yours live (the shared demo space).
 */
@Injectable({ providedIn: 'root' })
export class RolodexSyncService {
  /** 2026-08-20 PRIVACY GATE: nothing leaves the device unless the user
   *  explicitly flips this ON in Settings → Cloud Sync. Default OFF. */
  private readonly BACKEND_SYNC_KEY = 'rolodex_backend_sync_enabled';
  private backendSyncEnabled = false;
  private backendSyncLoaded = false;

  private deviceId = '';
  /** 2026-08-18 THE AGENT SPEAKS FIRST: emitted when the server sends the
   *  first-connection courtesy welcome (new device only). */
  welcome$ = new Subject<string>();

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
    // 2026-09-14 BUILD 205 THE PHANTOM-ID FIX (Grok audit, verified): on a
    // cold start that lost the IndexedDB-hydration race, loadDeviceId() minted
    // a FRESH rolodex-<random> id and setSync() PERSISTED it - overwriting the
    // device's true identity. Every losing cold start minted a phantom device;
    // DAU 172 with D1 0 was that machine. Now: the provisional id is never
    // persisted by loadDeviceId; hydration ADOPTS the stored id (or finalizes
    // the provisional only when none exists), and analytics awaits the final
    // identity before queueing app_launch.
    this.deviceReady = this.hydrateDeviceId();
  }

  /** Resolves once the device id is FINAL (stored id adopted, or provisional
   *  finalized). Analytics init awaits this before queueing app_launch. */
  readonly deviceReady: Promise<void>;

  private async hydrateDeviceId(): Promise<void> {
    try {
      const stored = await this.storage.get<string>('rolodex_device_id');
      if (stored && stored !== this.deviceId) {
        // The true identity wins; the provisional (never persisted) is dropped.
        this.deviceId = stored;
        this.storage.setSync('rolodex_device_id', stored);
      } else if (!stored) {
        // Genuinely first run - finalize the provisional as the real id.
        await this.storage.set('rolodex_device_id', this.deviceId);
      }
    } catch { /* keep the provisional; next launch retries */ }
  }

  /** BUILD 205: the final device id, after hydration. */
  async getDeviceIdFinal(): Promise<string> {
    await this.deviceReady;
    return this.deviceId;
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
      // BUILD 205: PROVISIONAL ONLY - setSync removed (it wrote through to
      // IndexedDB and clobbered the true stored id during the hydration race -
      // the phantom machine). hydrateDeviceId() adopts or finalizes.
      return 'rolodex-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    } catch {
      return 'rolodex-' + Date.now().toString(36);
    }
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  /** 2026-08-20 PRIVACY: has the user explicitly allowed backend sync? */
  async isBackendSyncEnabled(): Promise<boolean> {
    if (!this.backendSyncLoaded) {
      try {
        const stored = await this.storage.get<boolean | string>(this.BACKEND_SYNC_KEY);
        this.backendSyncEnabled = stored === true || stored === '1' || stored === 'true';
      } catch { /* default false */ }
      this.backendSyncLoaded = true;
    }
    return this.backendSyncEnabled;
  }

  /** 2026-08-20 PRIVACY: explicit opt-in/out for ANY data leaving the device. */
  async setBackendSyncEnabled(enabled: boolean): Promise<void> {
    this.backendSyncEnabled = !!enabled;
    this.backendSyncLoaded = true;
    try {
      await this.storage.set(this.BACKEND_SYNC_KEY, this.backendSyncEnabled);
    } catch { /* best effort */ }
  }

  /** The demo API base (see environment.prod.ts). */
  private apiBase(): string {
    return environment.rolodexApiBase || 'https://zyppar.com/api/loopkeeper';
  }

  /** The demo room code (persisted) — links devices into one live space. */
  get room(): string {
    try { return this.storage.getSync<string>('rolodex_room') || ''; } catch { return ''; }
  }
  setRoom(code: string): void {
    try { this.storage.setSync('rolodex_room', String(code || '').trim().toUpperCase().slice(0, 24)); } catch { /* ignore */ }
  }

  /** A short, human-readable device label — not a truncated user-agent. */
  private deviceLabel(): string {
    try {
      const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
      let os = 'Web';
      if (/Android/i.test(ua)) os = 'Android';
      else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
      else if (/Windows/i.test(ua)) os = 'Windows';
      else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
      else if (/Linux/i.test(ua)) os = 'Linux';
      let browser = 'Browser';
      if (/Edg\//i.test(ua)) browser = 'Edge';
      else if (/Chrome\//i.test(ua)) browser = 'Chrome';
      else if (/Safari\//i.test(ua)) browser = 'Safari';
      else if (/Firefox\//i.test(ua)) browser = 'Firefox';
      return `Rolodex — ${os} · ${browser}`;
    } catch {
      return 'Rolodex device';
    }
  }

  /** Push the current state — full contacts + follow-up counts + room. Never blocks.
   *  2026-08-18 THE AGENT: if the server welcomes a brand-new device, the
   *  message is emitted on welcome$ so the UI can greet the user.
   *  2026-08-19 THE TRIAL: the client sends its local trial timestamps so a
   *  first sync can adopt them; the server's authoritative trial comes back in
   *  the response and is persisted when the client has none yet.
   *  2026-09-16 BUILD 231 PHASE D THE SYNC CONTRACT (verified, do not break):
   *  this push sends the RAW contact objects — there is NO field whitelist,
   *  by design. That is why the additive card fields ride for free: kind,
   *  task {due, cadence, done, doneAt, checklist} and coverEmoji serialize
   *  without a line of sync code. The server stores contacts as
   *  [mongoose.Schema.Types.Mixed] (DeviceState) and /state/:deviceId
   *  returns them untouched. IF YOU EVER ADD A SERIALIZER/SANITIZER HERE,
   *  you MUST carry kind + task + coverEmoji across, or task cards will
   *  silently degrade to person cards on restore (missing kind reads as
   *  person everywhere). Demo cards never ride: home pushes realContacts()
   *  only (the 209 exclusion).
   *  2026-09-18 BUILD 93/262 THE LOOPS RIDE TOO (founder: "I want to backup
   *  my loops so the date transfers to any other device"): the tray's loops
   *  join the payload behind the SAME consent gate and restore beside the
   *  deck — device-local until consent, never after. */
  async push(contacts: ContactInfo[], followUps?: any[], loops?: any[]): Promise<{ ok: boolean; stored: number; error?: string; coversStripped?: boolean }> {
    // 2026-08-20 PRIVACY GATE: no contact data leaves the device unless the
    // user has explicitly enabled backend sync. Default OFF.
    // 2026-09-18 BUILD 262 THE TRUTHFUL PUSH (founder: "Push says success,
    // but pull says nothing was pushed"): the gate and every failure now
    // SPEAK — the caller knows whether anything left the device.
    if (!(await this.isBackendSyncEnabled())) return { ok: false, stored: 0, error: 'consent-off' };
    try {
      const trialStartedAt = (await this.storage.get<number>('rolodex_trial_started_at')) || 0;
      const trialEndsAt = (await this.storage.get<number>('rolodex_trial_until')) || 0;
      // BUILD 270 THE SIZE-AWARE PUSH (measured: the server's nginx cap
      // rejects bodies over ~1 MB with HTTP 413 — an 84-card deck with
      // base64 photo/video covers is far over it, so EVERY push from a real
      // deck died at the door while small test payloads sailed through).
      // Heavy device-local media (base64 photos, video covers) is shed from
      // the payload when it would blow the cap — the text, tasks, dates and
      // loops still ride; the covers stay on the device.
      const makeBody = (list: any[]) => JSON.stringify({
        deviceId: this.deviceId,
        deviceName: this.deviceLabel(),
        room: this.room,
        // 2026-08-18 THE USERS DB: the sync registers the owner's identity so
        // the chat can tell a sender whether a sendee is reachable in-app.
        ownerPhone: this.ownerPhone,
        ownerName: this.ownerName,
        contacts: (list || []).slice(0, 500),
        followUps: (followUps || []).slice(0, 200),
        // 2026-09-18 BUILD 93: the loops ride beside the deck (same consent).
        loops: (loops || []).slice(0, 500),
        trial: { startedAt: trialStartedAt || null, endsAt: trialEndsAt || null },
      });
      // BUILD 271 THE COMPRESSED PUSH (founder: "is there any way to also
      // compress the push payload before it arrives at backend?"): YES —
      // gzip via the browser's CompressionStream, sent as
      // Content-Encoding: gzip; the server's body-parser inflates it
      // natively (inflate defaults on). ORDER: small decks ride plain;
      // big decks gzip WITH covers first (the founder's deck rides whole
      // after the nginx cap is raised); covers are shed only as the LAST
      // resort when gzip is unavailable. keepalive is GONE — Chromium caps
      // keepalive bodies at 64 KB, another silent killer for a real deck
      // (this is a user-initiated push, not an unload flush).
      const gzipBody = async (body: string): Promise<Uint8Array | null> => {
        try {
          if (typeof CompressionStream === 'undefined') return null;
          const stream = new Blob([body]).stream().pipeThrough(new CompressionStream('gzip'));
          return new Uint8Array(await new Response(stream).arrayBuffer());
        } catch { return null; }
      };
      const LIMIT = 900_000;   // plain-text margin under the measured ~1 MB cap
      const WIRE_LIMIT = 3_500_000; // safe under the server's 32 MB / 5 MB decode
      let payloadContacts = contacts || [];
      let coversStripped = false;
      let plain = makeBody(payloadContacts);
      let wireBody: Uint8Array | string = plain;
      let wireHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (plain.length > LIMIT) {
        const gz = await gzipBody(plain);
        if (gz && gz.length <= WIRE_LIMIT) {
          wireBody = gz;
          wireHeaders = { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' };
        } else {
          // gzip unavailable or still enormous — shed covers as the last resort
          payloadContacts = payloadContacts.map((c: any) => {
            if (!c || (!c.image && !c.coverVideo)) return c;
            const { image, coverVideo, ...rest } = c;
            return rest;
          });
          coversStripped = true;
          plain = makeBody(payloadContacts);
        }
      }
      const res = await fetch(`${this.apiBase()}/sync`, {
        method: 'POST',
        headers: wireHeaders,
        body: wireBody,
      });
      if (!res.ok) return { ok: false, stored: 0, error: 'server-' + res.status, coversStripped };
      const data = await res.json().catch(() => null);
      if (data?.welcome) this.welcome$.next(String(data.welcome));
      // 2026-08-19 server trial is the source of truth on first contact
      if (data?.trial) {
        const existingStart = (await this.storage.get<number>('rolodex_trial_started_at')) || 0;
        const existingEnd = (await this.storage.get<number>('rolodex_trial_until')) || 0;
        const serverStart = data.trial.startedAt ? new Date(data.trial.startedAt).getTime() : 0;
        const serverEnd = data.trial.endsAt ? new Date(data.trial.endsAt).getTime() : 0;
        if (!existingStart && serverStart > 0) await this.storage.set('rolodex_trial_started_at', serverStart);
        if (!existingEnd && serverEnd > 0) await this.storage.set('rolodex_trial_until', serverEnd);
      }
      return { ok: true, stored: (contacts || []).length + (loops || []).length, coversStripped };
    } catch (e: any) {
      return { ok: false, stored: 0, error: e?.message ? String(e.message).slice(0, 80) : 'network' };
    }
  }

  /** 2026-09-18 BUILD 265 THE TRANSFER PULL (founder: "I want to backup my
   *  loops so the date transfers to any other device"): the sync slot is
   *  DEVICE-KEYED — a second device pulling its OWN slot reads nothing. The
   *  transfer pull reads ANY device's slot by its anonymous id (Settings ->
   *  This device shows and copies it). Same consent gate, same discriminated
   *  result as restore(). */
  async restoreFrom(deviceId: string): Promise<{ status: 'ok' | 'empty' | 'off' | 'error'; contacts: ContactInfo[]; loops: any[] }> {
    if (!(await this.isBackendSyncEnabled())) return { status: 'off', contacts: [], loops: [] };
    const id = String(deviceId || '').trim();
    if (!id) return { status: 'empty', contacts: [], loops: [] };
    try {
      const res = await fetch(`${this.apiBase()}/state/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return { status: 'empty', contacts: [], loops: [] };
      const data = await res.json();
      const contacts = Array.isArray(data?.contacts) ? data.contacts as ContactInfo[] : [];
      const loops = Array.isArray(data?.loops) ? data.loops : [];
      return { status: contacts.length || loops.length ? 'ok' : 'empty', contacts, loops };
    } catch { return { status: 'error', contacts: [], loops: [] }; }
  }

  /** Restore the device's full state (deck + loops) from the Rolodex server.
   *  2026-09-18 BUILD 262 THE HONEST PULL: the result SPEAKS — 'ok' with the
   *  contacts and loops, 'empty' (the server genuinely has nothing for this
   *  device), 'off' (consent is off), 'error' (the server did not answer).
   *  The caller can tell the founder the truth instead of one vague line. */
  async restore(): Promise<{ status: 'ok' | 'empty' | 'off' | 'error'; contacts: ContactInfo[]; loops: any[] }> {
    if (!(await this.isBackendSyncEnabled())) return { status: 'off', contacts: [], loops: [] };
    try {
      const res = await fetch(`${this.apiBase()}/state/${encodeURIComponent(this.deviceId)}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return { status: 'empty', contacts: [], loops: [] }; // 404 = nothing stored yet
      const data = await res.json();
      const contacts = Array.isArray(data?.contacts) ? data.contacts as ContactInfo[] : [];
      const loops = Array.isArray(data?.loops) ? data.loops : [];
      return { status: contacts.length || loops.length ? 'ok' : 'empty', contacts, loops };
    } catch { return { status: 'error', contacts: [], loops: [] }; }
  }
}
