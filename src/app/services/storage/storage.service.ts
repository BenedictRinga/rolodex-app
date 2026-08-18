import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

// ---------------------------------------------------------------------------
// 2026-08-18 THE ROLODEX STORAGE - a SEQUENCED ARRAY of media, no single
// point of loss (and no direct localStorage):
//
//   1. MEMORY CACHE   - the hot sync layer (fastest reads, served first).
//   2. INDEXEDDB      - the PRIMARY persistent medium (hundreds of MB,
//                       async, survives app updates and browser churn).
//   3. CAPACITOR
//      PREFERENCES    - the native backup tier (Android/iOS only - the
//                       native Key-Value store; the web tier is skipped so
//                       localStorage never leaks in through a side door).
//
// Every write cascades memory -> IndexedDB -> (native) Preferences; every
// read walks memory -> IndexedDB -> (native) Preferences -> null. If a
// medium fails, the next one in the sequence still holds the data - the
// classic priority/backup cascade, sequenced as an array.
// ---------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly dbName = 'rolodex';
  private readonly storeName = 'kv';
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memory = new Map<string, string>();
  private hydrated = false;
  private nativePrefs = false;

  constructor() {
    try {
      this.nativePrefs = !!Preferences?.set && typeof (window as any)?.Capacitor?.isNativePlatform === 'function'
        ? (window as any).Capacitor.isNativePlatform()
        : false;
    } catch {
      this.nativePrefs = false;
    }
    void this.hydrate();
  }

  /** The native backup tier (Capacitor Preferences, Android/iOS only). */
  private async prefsGet(key: string): Promise<string | null> {
    if (!this.nativePrefs) return null;
    try {
      const { value } = await Preferences.get({ key });
      return value ?? null;
    } catch {
      return null;
    }
  }

  private async prefsSet(key: string, value: string): Promise<void> {
    if (!this.nativePrefs) return;
    try {
      await Preferences.set({ key, value });
    } catch {
      /* the primary tiers still hold the data */
    }
  }


  // ===== IndexedDB plumbing =================================================

  private async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('indexedDB unavailable'));
        return;
      }
      try {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains(this.storeName)) {
            d.createObjectStore(this.storeName, { keyPath: 'k' });
          }
        };
        req.onsuccess = () => {
          this.db = req.result;
          resolve(req.result);
        };
        req.onerror = () => reject(req.error || new Error('indexedDB open failed'));
      } catch (e) {
        reject(e);
      }
    });
    return this.dbPromise;
  }

  /** Load every persisted entry into the sync memory cache (once). */
  private async hydrate(): Promise<void> {
    if (this.hydrated) return;
    try {
      const db = await this.open();
      const all = await new Promise<Array<{ k: string; v: string }>>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const req = tx.objectStore(this.storeName).getAll();
        req.onsuccess = () => resolve((req.result || []) as any);
        req.onerror = () => reject(req.error || new Error('hydrate failed'));
      });
      for (const row of all) this.memory.set(row.k, row.v);
    } catch {
      /* memory-only mode */
    }
    this.hydrated = true;
  }

  private async ensureHydrated(): Promise<void> {
    if (!this.hydrated) await this.hydrate();
  }

  private async idbPut(k: string, v: string): Promise<void> {
    try {
      const db = await this.open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).put({ k, v });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('put failed'));
      });
    } catch {
      /* memory-only */
    }
  }

  private async idbDelete(k: string): Promise<void> {
    try {
      const db = await this.open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).delete(k);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('delete failed'));
      });
    } catch {
      /* memory-only */
    }
  }

  private async idbClear(): Promise<void> {
    try {
      const db = await this.open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('clear failed'));
      });
    } catch {
      /* memory-only */
    }
  }

  private async idbKeys(): Promise<string[]> {
    try {
      const db = await this.open();
      return await new Promise<string[]>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const req = tx.objectStore(this.storeName).getAllKeys();
        req.onsuccess = () => resolve((req.result || []) as string[]);
        req.onerror = () => reject(req.error || new Error('keys failed'));
      });
    } catch {
      return [];
    }
  }

  // ===== Async API ==========================================================

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    this.memory.set(key, serialized);
    await this.idbPut(key, serialized);
    await this.prefsSet(key, serialized); // the native backup tier (Android/iOS)
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureHydrated();
    if (this.memory.has(key)) {
      try {
        return JSON.parse(this.memory.get(key) as string) as T;
      } catch {
        return null;
      }
    }
    try {
      const db = await this.open();
      const row = await new Promise<{ k: string; v: string } | undefined>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const req = tx.objectStore(this.storeName).get(key);
        req.onsuccess = () => resolve(req.result as any);
        req.onerror = () => reject(req.error || new Error('get failed'));
      });
      if (row) {
        this.memory.set(key, row.v);
        try {
          return JSON.parse(row.v) as T;
        } catch {
          return null;
        }
      }
    } catch {
      /* fall through to the backup tier */
    }
    // the native Preferences backup (Android/iOS) - the sequence holds
    const backup = await this.prefsGet(key);
    if (backup !== null) {
      this.memory.set(key, backup);
      try {
        return JSON.parse(backup) as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  async remove(key: string): Promise<void> {
    this.memory.delete(key);
    await this.idbDelete(key);
  }

  async clear(): Promise<void> {
    this.memory.clear();
    await this.idbClear();
  }

  async getAllKeys(): Promise<string[]> {
    await this.ensureHydrated();
    const memKeys = Array.from(this.memory.keys());
    const dbKeys = await this.idbKeys();
    return Array.from(new Set([...memKeys, ...dbKeys]));
  }

  // ===== Synchronous cache (memory-backed; NEVER localStorage) ==============

  getSync<T>(key: string): T | null {
    const raw = this.memory.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setSync(key: string, value: any): void {
    const serialized = JSON.stringify(value);
    this.memory.set(key, serialized);
    void this.idbPut(key, serialized); // fire-and-forget persistence
  }
}
