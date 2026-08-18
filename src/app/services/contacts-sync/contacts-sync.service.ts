import { Injectable } from '@angular/core';
import { ContactInfo } from '../../models/contacts';
import { PhonePayload, EmailPayload, PermissionStatus, Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';
import { StorageService } from '../storage/storage.service';
import { EventService } from '../event/event.service';
import { FollowUpEngine } from '../followup-engine/followup-engine.service';
import { BirthdayReminderService } from '../birthday-reminder/birthday-reminder.service';

const CACHE_KEY = 'rolodex_device_contacts';

@Injectable({
  providedIn: 'root',
})
export class ContactsSyncService {
  constructor(
    private storage: StorageService,
    private eventService: EventService,
    private followUpEngine: FollowUpEngine,
    private birthdayReminder: BirthdayReminderService,
  ) {}

  /**
   * Checks (and optionally forces a request for) contact read permissions.
   * On PWA / non-native platforms, returns 'granted' immediately.
   */
  async checkContactPermissions(forceRequest?: boolean): Promise<'granted' | 'denied'> {
    // PWA fallback — no real contacts permission model
    if (!Capacitor.isNativePlatform() || this.isPwa()) {
      return 'granted';
    }

    try {
      const status: PermissionStatus = await Contacts.checkPermissions();

      if (status.contacts === 'granted') {
        return 'granted';
      }

      if (forceRequest) {
        const requested: PermissionStatus = await Contacts.requestPermissions();
        return requested.contacts === 'granted' ? 'granted' : 'denied';
      }

      return 'denied';
    } catch {
      return 'denied';
    }
  }

  /**
   * Fetches all device contacts via the Capacitor Contacts plugin.
   * Maps each raw contact to a ContactInfo object.
   */
  async fetchDeviceContacts(): Promise<ContactInfo[]> {
    const permission = await this.checkContactPermissions(true);
    if (permission !== 'granted') {
      return [];
    }

    try {
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
          postalAddresses: true,
          organization: true,
          birthday: true,
          note: true,
          urls: true,
        },
      });

      const contacts = result.contacts.map((c) => this.deviceToContactInfo(c));
      await this.storage.set(CACHE_KEY, contacts);
      return contacts;
    } catch {
      return [];
    }
  }

  /**
   * Syncs all available contacts. Fetches device contacts, then runs the
   * full automation pipeline: follow-up scheduling, relationship scoring,
   * and birthday reminders.
   */
  async syncAllContacts(): Promise<ContactInfo[]> {
    try {
      const deviceContacts = await this.fetchDeviceContacts();
      if (deviceContacts.length > 0) {
        await this.automateContactSetup(deviceContacts);
      }
      return deviceContacts;
    } catch {
      return [];
    }
  }

  /**
   * Run the automation pipeline on a set of contacts.
   * - Schedules recurring follow-up events via FollowUpEngine
   * - Creates birthday reminders
   * - (RelationshipMonitorService scoring runs on-demand in the UI)
   */
  async automateContactSetup(contacts: ContactInfo[]): Promise<void> {
    // Run the follow-up engine — auto-schedules check-in reminders
    await this.followUpEngine.run(contacts);

    // Process upcoming birthdays
    await this.birthdayReminder.processUpcomingBirthdays(contacts);
    await this.birthdayReminder.cleanupOldEntries();
  }

  /**
   * Maps a raw device contact (from Capacitor Contacts plugin) to a
   * ContactInfo object with empty Rolodex-specific defaults.
   */
  deviceToContactInfo(contact: any): ContactInfo {
    const name = contact.name || {};
    const displayName =
      name.displayName ||
      [name.given, name.middle, name.family].filter(Boolean).join(' ') ||
      (contact.nickname || '');

    return {
      contactId: contact.contactId || '',
      displayName,
      name: {
        display: displayName,
        given: name.given || '',
        middle: name.middle || '',
        family: name.family || '',
        prefix: name.prefix || '',
        suffix: name.suffix || '',
      },
      nickname: contact.nickname || '',
      organization: contact.organization || null,
      jobTitle: contact.organization?.jobTitle || '',
      birthday: contact.birthday
        ? { day: contact.birthday.day, month: contact.birthday.month, year: contact.birthday.year }
        : null,
      note: contact.note || '',

      phones: contact.phones || [],
      emails: contact.emails || [],
      postalAddresses: (contact.postalAddresses || []).map((a: any) => this.safeAddress(a)).filter((x: any) => x.street || x.city || x.country),
      urls: contact.urls || [],

      // Rolodex-specific defaults
      rolodex: {
        when: '',
        where: '',
        who: '',
        why: '',
        how: '',
        topic: '',
        followUp: '',
        personalTidbits: '',
        outcome: '',
        priority: 'low',
        contactFrequency: 'never',
        references: [],
      },
      socialProfiles: {},
      tags: [],
      groups: [],
      privacy: { level: 'private' },
      sharedBy: [],
      lastInteraction: null,
      nextInteraction: null,
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: { refreshContacts: true },
    };
  }

  // ---- helpers ----

  /** 2026-08-18 ADDRESS SAFETY: flatten any Capacitor/ContactAddress shape to a
   *  plain typed object; object-valued fields are dropped, never stringified. */
  private safeAddress(a: any): any {
    if (a == null) return {};
    if (typeof a === 'string') return { type: 'home', label: '', isPrimary: false, street: a.trim(), neighborhood: '', city: '', region: '', postcode: '', country: '' };
    const s = (v: any) => (typeof v === 'string' ? v.trim() : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '');
    return {
      type: a?.type || 'home',
      label: s(a?.label),
      isPrimary: !!a?.isPrimary,
      street: s(a?.street || a?.streetAddress || a?.formattedAddress || a?.address || a?.line1 || ''),
      neighborhood: s(a?.neighborhood || ''),
      city: s(a?.city || ''),
      region: s(a?.region || a?.state || ''),
      postcode: s(a?.postalCode || a?.postcode || ''),
      country: s(a?.country || ''),
    };
  }

  private isPwa(): boolean {
    try {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      );
    } catch {
      return false;
    }
  }
}
