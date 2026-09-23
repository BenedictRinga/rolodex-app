import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';
import { WriteAuthService } from '../write-auth/write-auth.service';
import { RolodexSyncService } from '../rolodex-sync/rolodex-sync.service';

/**
 * 2026-09-23 BUILD 315 THE CHAT ID (founder: "add to Settings a request chat
 * id which id is sharable to anybody else in place of phone number... one for
 * anonymity and the other for universal recognition if user chooses. The
 * request is voluntary"). THE CLIENT HALF: requests the id from the backend
 * (POST /chat-id — idempotent per device; the backend generates, returns,
 * associates to the device, persists), caches it here (StorageService —
 * IndexedDB, never localStorage), and answers "what is my chat id" for
 * Settings and any surface that wants to show it.
 *
 * VOLUNTARY: nothing is requested until the user taps it. The cache key and
 * the id itself ride the same wipe as every other record (the clean slate).
 */
@Injectable({ providedIn: 'root' })
export class ChatIdService {
  private static readonly KEY = 'lk_chat_id'; // { chatId, name, createdAt }
  private inflight: Promise<string> | null = null;

  constructor(
    private readonly storage: StorageService,
    private readonly writeAuth: WriteAuthService,
    private readonly sync: RolodexSyncService,
  ) {}

  /** The cached id, or '' when none was requested yet (voluntary). */
  cached(): string {
    try {
      const cur = this.storage.getSync<any>(ChatIdService.KEY);
      return String(cur?.chatId || '');
    } catch {
      return '';
    }
  }

  /** Request (or re-read) the device's chat id. One inflight per burst. */
  async request(): Promise<string> {
    const cached = this.cached();
    if (cached) return cached;
    if (!this.inflight) this.inflight = this.requestNow().finally(() => { this.inflight = null; });
    return this.inflight;
  }

  private async requestNow(): Promise<string> {
    const deviceId = await this.sync.getDeviceIdFinal();
    if (!deviceId) return '';
    let name = '';
    try { name = await this.sync.senderNameAsync(); } catch { /* anonymous is fine */ }
    try {
      const headers = { 'Content-Type': 'application/json', ...(await this.writeAuth.authHeaders(deviceId)) };
      const res = await fetch(`${environment.rolodexApiBase}/chat-id`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ deviceId, name }),
      });
      if (!res.ok) return '';
      const data = await res.json().catch(() => null);
      const chatId = String(data?.chatId || '');
      if (!chatId) return '';
      try {
        await this.storage.set(ChatIdService.KEY, { chatId, name: data?.name || name || '', createdAt: data?.createdAt || Date.now() });
      } catch { /* memory-only */ }
      return chatId;
    } catch {
      return '';
    }
  }
}