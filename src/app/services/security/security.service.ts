import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';

// ---------------------------------------------------------------------------
// 2026-08-18 THE APP LOCK: a PIN gate so only the authorized user opens the
// app. The PIN is stored HASHED (SHA-256 via SubtleCrypto when available,
// with a deterministic fallback) - never in plaintext. Once unlocked, the
// session stays open until the browser/app is fully restarted.
// ---------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private readonly PIN_KEY = 'rolodex_pin_hash';
  private readonly LOCK_ENABLED_KEY = 'rolodex_lock_enabled';
  private unlocked = false;

  constructor(private readonly storage: StorageService) {}

  private async sha256(text: string): Promise<string> {
    try {
      const data = new TextEncoder().encode(text);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // deterministic fallback (no SubtleCrypto - old webviews)
      let h = 5381;
      for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
      return 'h' + (h >>> 0).toString(16);
    }
  }

  async lockEnabled(): Promise<boolean> {
    try { return !!(await this.storage.get<boolean>(this.LOCK_ENABLED_KEY)); } catch { return false; }
  }

  async hasPin(): Promise<boolean> {
    try { return !!(await this.storage.get<string>(this.PIN_KEY)); } catch { return false; }
  }

  /** Set (or replace) the lock PIN. */
  async setPin(pin: string): Promise<void> {
    const clean = String(pin || '').trim();
    if (clean.length < 4) return;
    await this.storage.set(this.PIN_KEY, await this.sha256(clean));
    await this.storage.set(this.LOCK_ENABLED_KEY, true);
    this.unlocked = true;
  }

  async disableLock(): Promise<void> {
    await this.storage.remove(this.PIN_KEY);
    await this.storage.remove(this.LOCK_ENABLED_KEY);
    this.unlocked = true;
  }

  async verifyPin(pin: string): Promise<boolean> {
    const stored = await this.storage.get<string>(this.PIN_KEY);
    if (!stored) return true; // no pin = no lock
    const ok = stored === (await this.sha256(String(pin || '').trim()));
    if (ok) this.unlocked = true;
    return ok;
  }

  /** The session gate: true when the app must show the lock screen. */
  async needsUnlock(): Promise<boolean> {
    if (this.unlocked) return false;
    try {
      const enabled = await this.lockEnabled();
      if (!enabled) { this.unlocked = true; return false; }
      const has = await this.hasPin();
      if (!has) { this.unlocked = true; return false; }
      return true;
    } catch {
      return false;
    }
  }
}
