import type {
  NamePayload,
  OrganizationPayload,
  BirthdayPayload,
  PhonePayload,
  EmailPayload,
  PostalAddressPayload,
  ImagePayload,
} from '@capacitor-community/contacts';

// ---------------------------------------------------------------------------
// Base contact info — the raw fields from the device contact store
// ---------------------------------------------------------------------------
export interface BaseContactInfo {
  contactId: string;
  displayName?: string;
  name?: NamePayload | null;
  nickname?: string;
  organization?: OrganizationPayload | null;
  jobTitle?: string;
  birthday?: BirthdayPayload | null;
  note?: string;

  phones?: PhonePayload[];
  emails?: EmailPayload[];
  postalAddresses?: PostalAddressPayload[];
  urls?: { label?: string; url?: string }[];

  image?: ImagePayload | null;
  imageData?: string;
  thumbnailData?: string;
}

// ---------------------------------------------------------------------------
// Custom Rolodex extensions — the extra metadata the user adds on top
// ---------------------------------------------------------------------------
export interface CustomContactInfo {
  rolodex: {
    when: string;
    where: string;
    who: string;
    why: string;
    how: string;
    topic: string;
    followUp: string;
    personalTidbits: string;
    outcome: string;
    priority: 'high' | 'medium' | 'low';
    contactFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'never';
    references: string[];
  };

  socialProfiles: {
    x?: string;
    twitter?: string;
    telegram?: string;
    snapchat?: string;
    tiktok?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };

  tags: string[];
  groups: string[];

  privacy: {
    level: 'public' | 'private' | 'friends' | 'custom';
    sharedWith?: string[];
  };

  sharedBy: {
    ringaID: string;
    context: string;
    dateShared: Date;
  }[];

  lastInteraction: Date | null;
  nextInteraction: Date | null;

  /** 2026-08-28 BUILD 131 DEEP FIELDS: the rolling story — one dated line per
   *  interaction (sent WhatsApp, their reply, met at X), written by the card
   *  and the Loops engine, capped by the draft engine, carried in every AI
   *  briefing, persisted with the deck, synced when the user enables cloud. */
  contextRotation?: string[];

  reminders: {
    note: string;
    date: Date;
  }[];

  createdAt: Date;
  updatedAt: Date;

  preferences: {
    refreshContacts: boolean;
    notificationPreference?: 'push' | 'email' | 'sms' | 'none';
    theme?: 'light' | 'dark' | 'system';
  };
}

// ---------------------------------------------------------------------------
// 2026-09-16 BUILD 233 PHASE A — THE CARD KIND (the design constitution):
// a card is a SUBJECT; `kind` is a first-class attribute and nothing else
// changes identity. ADDITIVE ONLY: missing kind reads as 'person' (the boot
// normalizer stamps it — no migration script). Build 235 completes the
// handover's Phase E sketch: note = body, place = address, routine = cadence.
// ---------------------------------------------------------------------------
export type CardKind = 'person' | 'task' | 'note' | 'place' | 'routine';

/** The task payload a kind:'task' card carries. cadence REUSES the
 *  rolodex.contactFrequency union values verbatim (the build-217 TS2322
 *  lesson: one union, one vocabulary). */
export interface TaskPayload {
  due?: number;
  cadence?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'never';
  done?: boolean;
  doneAt?: number;
  checklist?: { text: string; done: boolean }[];
}

// ---------------------------------------------------------------------------
// Unified contact type — union of base, custom, and UI-only properties
// ---------------------------------------------------------------------------
export interface ContactInfo extends BaseContactInfo, CustomContactInfo {
  showDetails?: boolean;
  isFlipped?: boolean;
  /** 2026-09-16 BUILD 217 THE CARD COVER: an optional emoji that rides on
   *  the card's avatar — the quick way to take a card beyond the default
   *  cover and bring it alive (a task card 🚗, a money card 💰, a place 📍).
   *  Device photos stay via the avatar image; video covers are a later
   *  conversation. Set from the card edit sheet's picker. */
  coverEmoji?: string;
  /** 2026-09-16 BUILD 233 PHASE E THE VIDEO COVER: a short clip stands in
   *  the SAME circular cover space — muted, looping, silent. Picking one
   *  clears the emoji AND the photo (media beats emoji; the most recent
   *  explicit choice always wins — the 225 rule extended to video). Size
   *  guarded at pick time (~3MB raw); it rides the additive sync as a
   *  data URL. */
  coverVideo?: string;
  /** 2026-09-16 BUILD 227 PHASE A THE CARD KIND: 'person' | 'task'.
   *  Missing kind = 'person' (boot normalizer in home.loadContacts). */
  kind?: CardKind;
  /** The task payload — only meaningful when kind === 'task'. */
  task?: TaskPayload;
  isMockData?: boolean;
  isContactInfo?: boolean;
}
