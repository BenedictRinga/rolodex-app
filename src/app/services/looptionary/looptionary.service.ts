import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';

/** One Loop-tionary entry — the AI's strict shape (server 137). */
export interface LooptEntry {
  term: string;
  pos: string;
  meaning: string;
  detail: string;
  example: string;
  etymology: string;
  lang: string;
  inUserLang?: string;
  notFound?: boolean;
}

/**
 * 2026-09-25 BUILD 338 THE LOOP-TIONARY (founder: "an immediate buy-in for
 * tapping AI services... a device level cache of reasonable amount of user's
 * searches/responses that conveniently shows when they open the
 * Loop-tionary"). THE CLIENT HALF: asks POST /looptionary (server 137),
 * caches every lookup through the StorageService (IndexedDB, never
 * localStorage), and answers the modal's history — newest first, capped.
 *
 * THE CACHE: 60 entries (a "reasonable amount"), newest first, keyed by the
 * normalized query (case/trim-folded — "Grace" and "grace" share a slot).
 * Each entry stamps lookedUpAt for the recency label. The cache rides the
 * clean-slate wipe like every record.
 */
@Injectable({ providedIn: 'root' })
export class LooptionaryService {
  private static readonly CACHE_KEY = 'lk_looptionary_cache';
  private static readonly CAP = 60;

  constructor(private readonly storage: StorageService) {}

  /** The device's cached lookups — newest first (the modal's opening view). */
  async history(): Promise<Array<LooptEntry & { lookedUpAt: number; q: string; _k?: string }>> {
    try {
      const cur = await this.storage.get<any[]>(LooptionaryService.CACHE_KEY);
      return Array.isArray(cur) ? cur : [];
    } catch { return []; }
  }

  /** A cached answer for an exact (normalized) query, or null. */
  async cachedFor(q: string): Promise<(LooptEntry & { lookedUpAt: number; q: string; _k?: string }) | null> {
    const key = this.norm(q);
    if (!key) return null;
    const all = await this.history();
    return all.find((e) => e._k === key) || null;
  }

  /** Look a word/sentence up: cache first, then the server. Always resolves
   *  (the modal renders errors as a quiet line, never a throw). */
  async lookup(q: string, lang: string): Promise<{ entry: LooptEntry; cached: boolean }> {
    const key = this.norm(q);
    if (!key) throw new Error('empty');
    const all = await this.history();
    const hit = all.find((e) => e._k === key);
    if (hit) {
      // Recency bump: the re-looked-up term floats to the top.
      hit.lookedUpAt = Date.now();
      await this.save(all);
      return { entry: hit, cached: true };
    }
    const res = await fetch(`${environment.rolodexApiBase}/looptionary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: q.trim().slice(0, 300), lang }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => null);
    const entry = data?.entry as LooptEntry | undefined;
    if (!entry) throw new Error('bad reply');
    const rec = { ...entry, lookedUpAt: Date.now(), q: q.trim(), _k: key } as any;
    all.unshift(rec);
    await this.save(all);
    return { entry: rec, cached: false };
  }

  /** Clear the device's lookup history (the modal's dustbin). */
  async clearHistory(): Promise<void> {
    try { await this.storage.remove(LooptionaryService.CACHE_KEY); } catch { /* best effort */ }
  }

  private async save(all: any[]): Promise<void> {
    try {
      await this.storage.set(LooptionaryService.CACHE_KEY, all.slice(0, LooptionaryService.CAP));
    } catch { /* memory-only fallback: the modal still shows this session's lookups */ }
  }

  private norm(q: string): string {
    return String(q || '').trim().toLowerCase().slice(0, 300);
  }
}
