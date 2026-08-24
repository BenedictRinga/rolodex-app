import { Injectable } from '@angular/core';

/**
 * 2026-08-24 NETWORK SERVICE — one quiet door for every background fetch.
 *
 * Why: poll calls (update checks, AI status, investor summary) were throwing
 * raw `net::ERR_NETWORK_CHANGED` / offline rejections into the console. The
 * browser devtools will still list failed requests, but the app no longer
 * turns those into unhandled rejections, retry storms, or console noise.
 *
 * Rules:
 * - safeFetch() never throws for offline / aborted / network-changed.
 * - It returns null so callers can fall back quietly.
 * - It skips immediately when navigator.onLine is false.
 * - A timeout aborts hung requests (default 12s, override per call).
 */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  async safeFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    opts?: { timeoutMs?: number },
  ): Promise<Response | null> {
    if (!this.isOnline()) return null;
    const timeoutMs = opts?.timeoutMs ?? 12000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...(init || {}), signal: controller.signal });
    } catch {
      // Offline, network changed, aborted, or server unreachable — silent.
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
