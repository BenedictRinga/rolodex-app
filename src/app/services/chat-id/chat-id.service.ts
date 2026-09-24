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
      // 2026-09-24 BUILD 333 THE SELF-HEALING MINT (the founder's report: the
      // first chat to CommandCenter did not go, despite several attempts):
      // a token minted BEFORE the write gate armed carries the old-key
      // signature — the armed server 401s it — and this service, unlike
      // sync/analytics/crashes, never invalidated, so the mint kept failing
      // silently and every send dropped (testerChatId ''). Now: a 401/403
      // invalidates the stale token and the mint retries ONCE with fresh
      // headers — the same self-heal the other writes have.
      if (res.status === 401 || res.status === 403) {
        this.writeAuth.invalidate(deviceId);
        const fresh = { 'Content-Type': 'application/json', ...(await this.writeAuth.authHeaders(deviceId)) };
        const retry = await fetch(`${environment.rolodexApiBase}/chat-id`, {
          method: 'POST',
          headers: fresh,
          body: JSON.stringify({ deviceId, name }),
        });
        if (!retry.ok) return '';
        const data2 = await retry.json().catch(() => null);
        const chatId2 = String(data2?.chatId || '');
        if (!chatId2) return '';
        try {
          await this.storage.set(ChatIdService.KEY, { chatId: chatId2, name: data2?.name || name || '', createdAt: data2?.createdAt || Date.now() });
        } catch { /* memory-only */ }
        return chatId2;
      }
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