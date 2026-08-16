import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { EventService, type CalendarEvent } from '../event/event.service';
import { EncryptionService } from './encryption.service';
import { LocalExportService } from './local-export.service';
import { GoogleDriveProvider } from './google-drive.provider';
import { DropboxProvider } from './dropbox.provider';
import { OneDriveProvider } from './onedrive.provider';
import type { CloudProvider, EncryptedBundle, SyncBundle, SyncState } from './sync.types';
import type { ContactInfo } from '../../models/contacts';

// ---------------------------------------------------------------------------
// Cloud sync orchestrator.
//
// Coordinates push/pull across any registered provider, handles encryption,
// conflict resolution, and persists sync state for delta tracking.
// ---------------------------------------------------------------------------

const SYNC_STATE_KEY = 'cloud_sync_state';
const SYNC_PASSPHRASE_KEY = 'cloud_sync_passphrase_hash';

@Injectable({
  providedIn: 'root',
})
export class CloudSyncService {
  private providers: Map<string, CloudProvider> = new Map();
  private state: SyncState = {
    provider: null,
    lastPushedAt: null,
    lastPulledAt: null,
    deviceName: 'Unknown',
  };

  constructor(
    private readonly storage: StorageService,
    private readonly eventService: EventService,
    private readonly encryption: EncryptionService,
    private readonly localExport: LocalExportService,
    private readonly googleDrive: GoogleDriveProvider,
    private readonly dropbox: DropboxProvider,
    private readonly oneDrive: OneDriveProvider,
  ) {
    this.registerProvider(googleDrive);
    this.registerProvider(dropbox);
    this.registerProvider(oneDrive);
    this.loadState();
  }

  // ===== Provider registry =================================================

  registerProvider(provider: CloudProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProviders(): CloudProvider[] {
    return Array.from(this.providers.values());
  }

  getProvider(name: string): CloudProvider | undefined {
    return this.providers.get(name);
  }

  getActiveProvider(): CloudProvider | null {
    if (!this.state.provider) return null;
    return this.providers.get(this.state.provider) ?? null;
  }

  // ===== State management ==================================================

  getSyncState(): SyncState {
    return { ...this.state };
  }

  isPassphraseSet(): boolean {
    return this.storage.getSync<string>(SYNC_PASSPHRASE_KEY) !== null;
  }

  setPassphrase(passphrase: string): void {
    // Store a hash of the passphrase for verification (not the passphrase itself)
    const hash = this.hashPassphraseSync(passphrase);
    this.storage.setSync(SYNC_PASSPHRASE_KEY, hash);
  }

  verifyPassphrase(passphrase: string): boolean {
    const stored = this.storage.getSync<string>(SYNC_PASSPHRASE_KEY);
    if (!stored) return false;
    const hash = this.hashPassphraseSync(passphrase);
    return hash === stored;
  }

  clearPassphrase(): void {
    localStorage.removeItem(SYNC_PASSPHRASE_KEY);
  }

  // ===== Provider selection =================================================

  async selectProvider(providerName: string): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Unknown provider: ${providerName}`);

    // Sign out of previous provider
    const previous = this.getActiveProvider();
    if (previous && previous.name !== providerName) {
      await previous.disconnect();
    }

    // Authorize new provider
    if (!provider.isAuthenticated()) {
      await provider.authorize();
    }

    this.state.provider = providerName;
    await this.persistState();
  }

  async disconnectProvider(): Promise<void> {
    const provider = this.getActiveProvider();
    if (provider) {
      await provider.disconnect();
    }
    this.state.provider = null;
    this.state.lastPushedAt = null;
    this.state.lastPulledAt = null;
    await this.persistState();
  }

  // ===== Push ==============================================================

  /**
   * Encrypt current contacts + events and push to the active provider.
   * Requires a passphrase to be set first.
   */
  async push(contacts: ContactInfo[], events: CalendarEvent[]): Promise<void> {
    const provider = this.requireActiveProvider();
    const passphrase = await this.requirePassphrase();

    const bundle: SyncBundle = {
      version: 1,
      createdAt: new Date().toISOString(),
      deviceName: this.state.deviceName,
      contacts,
      events,
    };

    const encrypted = await this.encryption.encrypt(bundle, passphrase);
    await provider.push(encrypted);

    this.state.lastPushedAt = new Date().toISOString();
    await this.persistState();
  }

  // ===== Pull ==============================================================

  /**
   * Pull encrypted bundle from the active provider, decrypt, and return the
   * bundle. Returns null if nothing exists remotely or decryption fails.
   */
  async pull(): Promise<SyncBundle | null> {
    const provider = this.requireActiveProvider();
    const passphrase = await this.requirePassphrase();

    const encrypted = await provider.pull();
    if (!encrypted) return null;

    const bundle = await this.encryption.decrypt<SyncBundle>(encrypted, passphrase);
    if (!bundle) return null;

    this.state.lastPulledAt = new Date().toISOString();
    await this.persistState();

    return bundle;
  }

  // ===== Conflict-aware sync ===============================================

  /**
   * Full two-way sync:
   * 1. Pull remote bundle
   * 2. Merge with local contacts (newest wins per contactId)
   * 3. Push merged result back
   * Returns the merged contacts.
   */
  async sync(contacts: ContactInfo[], events: CalendarEvent[]): Promise<{
    contacts: ContactInfo[];
    events: CalendarEvent[];
    pulled: boolean;
    pushed: boolean;
  }> {
    const provider = this.requireActiveProvider();
    const passphrase = await this.requirePassphrase();

    let pulled = false;

    // 1. Pull remote
    const remoteEncrypted = await provider.pull();
    let remoteBundle: SyncBundle | null = null;

    if (remoteEncrypted) {
      remoteBundle = await this.encryption.decrypt<SyncBundle>(remoteEncrypted, passphrase);
      if (remoteBundle) pulled = true;
    }

    // 2. Merge: newest version of each contact wins
    const mergedContacts = this.mergeContacts(
      contacts,
      remoteBundle?.contacts ?? [],
    );

    // Merge events similarly
    const mergedEvents = this.mergeEvents(
      events,
      remoteBundle?.events ?? [],
    );

    // 3. Push merged result
    const mergedBundle: SyncBundle = {
      version: 1,
      createdAt: new Date().toISOString(),
      deviceName: this.state.deviceName,
      contacts: mergedContacts,
      events: mergedEvents,
    };

    const encrypted = await this.encryption.encrypt(mergedBundle, passphrase);
    await provider.push(encrypted);

    const now = new Date().toISOString();
    this.state.lastPushedAt = now;
    this.state.lastPulledAt = now;
    await this.persistState();

    return { contacts: mergedContacts, events: mergedEvents, pulled, pushed: true };
  }

  /** Check if a remote bundle exists and when it was last modified. */
  async getRemoteStatus(): Promise<{ exists: boolean; lastModified: Date | null }> {
    const provider = this.getActiveProvider();
    if (!provider || !provider.isAuthenticated()) {
      return { exists: false, lastModified: null };
    }

    try {
      const lastModified = await provider.getLastModified();
      return { exists: lastModified !== null, lastModified };
    } catch {
      return { exists: false, lastModified: null };
    }
  }

  // ===== Local export/import shortcuts =====================================

  /** Trigger local .rolodex file export (download). */
  exportLocal(contacts: ContactInfo[], events: CalendarEvent[]): void {
    this.localExport.exportToFile(contacts, events);
  }

  /** Open a file picker and import a .rolodex file. */
  async importLocal(): Promise<SyncBundle | null> {
    return this.localExport.importFromFile();
  }

  // ===== Conflict resolution ===============================================

  /**
   * Merge two contact arrays. For each contactId, keep the one with the
   * most recent updatedAt timestamp. Contacts present in only one array are
   * preserved.
   */
  private mergeContacts(local: ContactInfo[], remote: ContactInfo[]): ContactInfo[] {
    const merged = new Map<string, ContactInfo>();

    for (const c of local) {
      merged.set(c.contactId, c);
    }

    for (const c of remote) {
      const existing = merged.get(c.contactId);
      if (!existing) {
        merged.set(c.contactId, c);
      } else {
        // Keep newest
        const localTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const remoteTime = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          merged.set(c.contactId, c);
        }
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Merge event arrays. Events with the same id keep the newest version.
   */
  private mergeEvents(local: CalendarEvent[], remote: CalendarEvent[]): CalendarEvent[] {
    const merged = new Map<string, CalendarEvent>();

    for (const e of local) {
      merged.set(e.id, e);
    }

    for (const e of remote) {
      const existing = merged.get(e.id);
      if (!existing || new Date(e.start) > new Date(existing.start)) {
        merged.set(e.id, e);
      }
    }

    return Array.from(merged.values());
  }

  // ===== Helpers ===========================================================

  private async loadState(): Promise<void> {
    const saved = await this.storage.get<SyncState>(SYNC_STATE_KEY);
    if (saved) {
      this.state = saved;
    }
    this.state.deviceName = this.getDeviceName();
  }

  private async persistState(): Promise<void> {
    await this.storage.set(SYNC_STATE_KEY, this.state);
  }

  private requireActiveProvider(): CloudProvider {
    const provider = this.getActiveProvider();
    if (!provider || !provider.isAuthenticated()) {
      throw new Error('No active cloud provider. Please connect one in Settings.');
    }
    return provider;
  }

  private async requirePassphrase(): Promise<string> {
    const hash = this.storage.getSync<string>(SYNC_PASSPHRASE_KEY);
    if (!hash) {
      throw new Error('No sync passphrase set. Please set one in Settings.');
    }
    // Note: we can't recover the passphrase from the hash — the user must
    // re-enter it. The caller (HomePage) handles prompting the user.
    // For the push/pull flow, we request it fresh each time.
    const passphrase = (await this.promptPassphrase?.()) ?? '';
    if (!passphrase) throw new Error('Passphrase required for sync.');
    return passphrase;
  }

  /**
   * Callback set by the UI layer so the orchestrator can request the
   * passphrase from the user without importing Ionic dependencies.
   */
  promptPassphrase?: () => Promise<string | null>;

  private hashPassphraseSync(passphrase: string): string {
    // Simple deterministic hash — we only need to verify, not secure against offline attacks
    let hash = 0;
    const str = 'rolodex_salt_' + passphrase;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return 'rolo_' + Math.abs(hash).toString(36);
  }

  private getDeviceName(): string {
    const ua = navigator.userAgent;
    if (/Android/.test(ua)) return 'Android';
    if (/iPhone|iPad/.test(ua)) return 'iOS';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'Mac';
    return 'Web';
  }
}
