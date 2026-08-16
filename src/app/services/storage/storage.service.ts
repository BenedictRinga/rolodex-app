import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

// ---------------------------------------------------------------------------
// Lightweight key-value store backed by Capacitor Preferences, with a
// synchronous localStorage fallback for time-critical reads.
// ---------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  // ---- Async (persistent) API -------------------------------------------

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    await Preferences.set({ key, value: serialized });
  }

  async get<T>(key: string): Promise<T | null> {
    const { value } = await Preferences.get({ key });
    if (value === null || value === undefined) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  async clear(): Promise<void> {
    await Preferences.clear();
  }

  async getAllKeys(): Promise<string[]> {
    const { keys } = await Preferences.keys();
    return keys;
  }

  // ---- Synchronous (localStorage) fallback -------------------------------

  getSync<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setSync(key: string, value: any): void {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    // Fire-and-forget async backup — don't block the caller
    Preferences.set({ key, value: serialized }).catch(() => {});
  }
}
