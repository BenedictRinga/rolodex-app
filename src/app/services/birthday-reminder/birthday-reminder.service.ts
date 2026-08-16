import { Injectable } from '@angular/core';
import { ContactInfo } from '../../models/contacts';
import { CalendarEvent, EventService } from '../event/event.service';
import { StorageService } from '../storage/storage.service';

// ---------------------------------------------------------------------------
// Birthday reminder automation.
//
// Scans contacts for upcoming birthdays (next 14 days), auto-creates calendar
// events with advance reminders, and tracks which ones have been handled.
// ---------------------------------------------------------------------------

const HANDLED_KEY = 'birthday_reminders_handled';
const LOOKAHEAD_DAYS = 14;
const REMINDER_DAYS_BEFORE = 3;

interface HandledBirthday {
  contactId: string;
  year: number;   // the year we last handled
  eventId: string;
}

@Injectable({
  providedIn: 'root',
})
export class BirthdayReminderService {
  constructor(
    private readonly eventService: EventService,
    private readonly storage: StorageService,
  ) {}

  // ===== Main entry point ==================================================

  /**
   * Scan all contacts for upcoming birthdays and schedule reminders.
   * Returns the number of new reminders scheduled.
   */
  async processUpcomingBirthdays(contacts: ContactInfo[]): Promise<{
    scheduled: number;
    upcoming: Array<{ name: string; date: Date; daysAway: number }>;
  }> {
    const now = new Date();
    const handled = await this.loadHandled();
    const upcoming: Array<{ name: string; date: Date; daysAway: number }> = [];
    let scheduled = 0;

    for (const contact of contacts) {
      const bday = contact.birthday;
      if (!bday?.day || !bday?.month) continue;

      // Calculate this year's birthday
      const thisYear = new Date(now.getFullYear(), bday.month - 1, bday.day);
      const nextYear = new Date(now.getFullYear() + 1, bday.month - 1, bday.day);

      // Choose upcoming occurrence
      const upcomingBday = thisYear >= now ? thisYear : nextYear;
      const daysAway = Math.ceil(
        (upcomingBday.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysAway < 0 || daysAway > LOOKAHEAD_DAYS) continue;

      // Already handled this year?
      const alreadyHandled = handled.some(
        (h) => h.contactId === contact.contactId && h.year === upcomingBday.getFullYear(),
      );
      if (alreadyHandled) continue;

      // Schedule reminder event (3 days before)
      const reminderDate = new Date(upcomingBday);
      reminderDate.setDate(reminderDate.getDate() - REMINDER_DAYS_BEFORE);
      if (reminderDate < now) reminderDate.setTime(now.getTime() + 60 * 60 * 1000);

      const name = contact.displayName ?? contact.name?.display ?? 'Contact';
      const event: CalendarEvent = {
        id: `bday_${contact.contactId}_${upcomingBday.getFullYear()}`,
        title: `Birthday: ${name}`,
        start: reminderDate.toISOString(),
        notes: `${name}'s birthday is on ${upcomingBday.toLocaleDateString()} (${daysAway} days from now)`,
        contactId: contact.contactId,
        reminderBefore: 1440, // 24h before the reminder = 3+1 days before birthday
      };

      await this.eventService.saveEvent(event, true);
      handled.push({
        contactId: contact.contactId,
        year: upcomingBday.getFullYear(),
        eventId: event.id,
      });
      scheduled++;
      upcoming.push({ name, date: upcomingBday, daysAway });
    }

    await this.saveHandled(handled);
    return { scheduled, upcoming };
  }

  /** Clean up old handled entries (older than 2 years). */
  async cleanupOldEntries(): Promise<void> {
    const handled = await this.loadHandled();
    const currentYear = new Date().getFullYear();
    const fresh = handled.filter((h) => h.year >= currentYear - 1);
    await this.saveHandled(fresh);
  }

  // ===== Helpers ===========================================================

  private async loadHandled(): Promise<HandledBirthday[]> {
    return (await this.storage.get<HandledBirthday[]>(HANDLED_KEY)) ?? [];
  }

  private async saveHandled(handled: HandledBirthday[]): Promise<void> {
    await this.storage.set(HANDLED_KEY, handled);
  }
}
