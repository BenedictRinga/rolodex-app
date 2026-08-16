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
// Unified contact type — union of base, custom, and UI-only properties
// ---------------------------------------------------------------------------
export interface ContactInfo extends BaseContactInfo, CustomContactInfo {
  showDetails?: boolean;
  isFlipped?: boolean;
  isMockData?: boolean;
  isContactInfo?: boolean;
}
