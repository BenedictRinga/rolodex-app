import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';

/**
 * 2026-09-23 BUILD 312 THE WRITE TOKEN (founder: "Add jwt middleware to
 * limit writes" — paired with server 124). One module owns the client side
 * of the handshake: mint a 7-day HMAC token for THIS device's anonymous id
 * (the server signs it; it holds no person data — { did, iat, exp }), cache
 * it in the StorageService (IndexedDB-first, no localStorage), and attach
 * it as Authorization: Bearer on the WRITE calls (sync, analytics, crashes).
 *
 * REFRESH: a token is re-minted when missing, expired (client-side check),
 * or when a write answers 401/403 (the server rotated its secret). A mint
 * failure degrades gracefully: the write still fires WITHOUT the header —
 * the server decides (armed server = 401, the queue re-backs-off; open
 * server = the demo lives). No retry storm: one refresh attempt per write.
 */
@Injectable({ providedIn: 'root' })
export class WriteAuthService {
  private static readonly TOKEN_KEY = 'lk_write_token'; // { token, did, exp }
  private inflight: Promise<string> | null = null;

  constructor(private readonly storage: StorageService) {}

  /** The bearer header for a write, minting/refreshing as needed. Never
   *  throws — a failed mint returns an empty header set (fail-open client;
   *  the server's gate has the final word). */
  async authHeaders(deviceId: string): Promise<Record<string, string>> {
    try {
      const token = await this.ensureToken(deviceId);
      return token ? { Authorization: 'Bearer ' + token } : {};
    } catch {
      return {};
    }
  }

  /** A 401/403 on a write invalidates the cached token (server rotated the
   *  secret or revoked). The next write mints afresh. */
  invalidate(deviceId: string): void {
    try {
      const cur = this.storage.getSync<any>(WriteAuthService.TOKEN_KEY);
      if (cur && (!deviceId || cur.did === deviceId)) void this.storage.remove(WriteAuthService.TOKEN_KEY);
    } catch { /* best effort */ }
  }

  /** Cache-first: valid token for THIS device, else mint. One inflight
   *  mint at a time (a burst of writes shares one fetch). */
  private async ensureToken(deviceId: string): Promise<string> {
    if (!deviceId) return '';
    const cur = this.storage.getSync<any>(WriteAuthService.TOKEN_KEY);
    if (cur?.token && cur.did === deviceId && (!cur.exp || cur.exp > Date.now() / 1000 + 3600)) {
      return cur.token as string;
    }
    if (!this.inflight) {
      this.inflight = this.mint(deviceId).finally(() => { this.inflight = null; });
    }
    return this.inflight;
  }

  private async mint(deviceId: string): Promise<string> {
    const res = await fetch(`${environment.rolodexApiBase}/auth/token?deviceId=${encodeURIComponent(deviceId)}`, { cache: 'no-store' });
    if (!res.ok) return '';
    const data = await res.json().catch(() => null);
    const token = String(data?.token || '');
    if (!token) return '';
    try {
      await this.storage.set(WriteAuthService.TOKEN_KEY, { token, did: deviceId, exp: data?.expiresIn ? Math.floor(Date.now() / 1000) + data.expiresIn : 0 });
    } catch { /* memory-only */ }
    return token;
  }
}
