import type { ContactInfo } from '../../models/contacts';
import type { CalendarEvent } from '../event/event.service';
import type { RelationshipScore } from '../relationship-monitor/relationship-monitor.service';

// ---------------------------------------------------------------------------
// Shared sync types — used by all cloud providers and the sync orchestrator.
// ---------------------------------------------------------------------------

/** The complete data bundle that gets encrypted and pushed to the cloud. */
export interface SyncBundle {
  /** Schema version — bump when the bundle shape changes. */
  version: number;
  /** ISO 8601 timestamp of when this bundle was created. */
  createdAt: string;
  /** Device name / identifier so user can see where it came from. */
  deviceName: string;
  /** All Rolodex contacts. */
  contacts: ContactInfo[];
  /** Calendar / follow-up events. */
  events: CalendarEvent[];
  /** Cached relationship health scores. */
  relationshipScores?: RelationshipScore[];
  /** Upcoming birthday reminders snapshot. */
  upcomingBirthdays?: Array<{ name: string; date: string; daysAway: number }>;
  /** Engine state so follow-ups resume across devices. */
  followUpEngineState?: any;
}

/** The encrypted form that gets written to the cloud provider's storage. */
export interface EncryptedBundle {
  /** Base64-encoded IV (nonce). */
  iv: string;
  /** Base64-encoded AES-GCM ciphertext. */
  ciphertext: string;
  /** PBKDF2 salt, base64-encoded. */
  salt: string;
  /** PBKDF2 iteration count. */
  iterations: number;
}

/** What each cloud provider must implement. */
export interface CloudProvider {
  readonly name: string;
  readonly displayName: string;
  /** Is the user currently authenticated with this provider? */
  isAuthenticated(): boolean;
  /** Begin the OAuth (or equivalent) flow. */
  authorize(): Promise<void>;
  /** Sign out / disconnect. */
  disconnect(): Promise<void>;
  /** Upload the encrypted bundle. */
  push(bundle: EncryptedBundle): Promise<void>;
  /** Download the encrypted bundle, or null if none exists. */
  pull(): Promise<EncryptedBundle | null>;
  /** Get the last-modified timestamp of the remote file, or null. */
  getLastModified(): Promise<Date | null>;
}

/** Persisted sync state for conflict resolution. */
export interface SyncState {
  provider: string | null;
  lastPushedAt: string | null;  // ISO 8601
  lastPulledAt: string | null;  // ISO 8601
  deviceName: string;
}
