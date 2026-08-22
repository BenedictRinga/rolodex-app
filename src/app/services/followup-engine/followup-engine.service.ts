import { Injectable } from '@angular/core';
import { ContactInfo } from '../../models/contacts';
import { CalendarEvent, EventService } from '../event/event.service';
import { StorageService } from '../storage/storage.service';

// ---------------------------------------------------------------------------
// Follow-up automation engine.
//
// Uses contactFrequency + priority to auto-schedule recurring check-in
// reminders and surface overdue contacts. Runs on app startup and can be
// triggered manually.
// ---------------------------------------------------------------------------

const ENGINE_STATE_KEY = 'followup_engine_state';

interface EngineState {
  lastRun: string; // ISO 8601
  scheduledEventIds: string[]; // events managed by this engine
}

@Injectable({
  providedIn: 'root',
})
export class FollowUpEngine {
  // How many days each frequency equals
  private readonly FREQUENCY_DAYS: Record<string, number> = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    yearly: 365,
    never: 0,
  };

  // Priority multipliers: high = check in more often, low = less often
  private readonly PRIORITY_MULTIPLIER: Record<string, number> = {
    high: 0.75, // 25% more frequent
    medium: 1.0,
    low: 1.5, // 50% less frequent
  };

  constructor(
    private readonly eventService: EventService,
    private readonly storage: StorageService,
  ) {}

  // ===== Main entry point ==================================================

  /**
   * Run the full follow-up engine pass:
   * 1. Clear old auto-generated events
   * 2. Generate new follow-up events for every contact with a frequency
   * 3. Return a report of what was scheduled
   */
  async run(contacts: ContactInfo[]): Promise<{
    scheduled: number;
    skipped: number;
    overdue: ContactInfo[];
  }> {
    const state = await this.loadState();

    // Clean up previous auto-events
    await this.clearManagedEvents(state);

    // 2026-08-18 FIX: contacts picked from the device (or invites) have NO
    // rolodex context - every non-optional c.rolodex.X below would throw and
    // freeze the whole deck (the Settings/Home dead-state). Normalize once.
    const safeContacts = (contacts || []).map((c) => ({
      ...c,
      rolodex: c?.rolodex || {},
    }));

    const active = safeContacts.filter(
      (c) => c.rolodex.contactFrequency !== 'never',
    );

    let scheduled = 0;
    let skipped = 0;
    const overdue: ContactInfo[] = [];

    const newEventIds: string[] = [];

    for (const contact of active) {
      const freqDays = this.FREQUENCY_DAYS[contact.rolodex.contactFrequency];
      if (!freqDays) {
        skipped++;
        continue;
      }

      const priorityMult =
        this.PRIORITY_MULTIPLIER[contact.rolodex.priority] ?? 1.0;
      const intervalDays = Math.round(freqDays * priorityMult);

      // Calculate next check-in date
      const lastInteraction = contact.lastInteraction
        ? new Date(contact.lastInteraction)
        : new Date(contact.createdAt ?? Date.now());

      const dueDate = new Date(lastInteraction);
      dueDate.setDate(dueDate.getDate() + intervalDays);

      const now = new Date();
      if (dueDate <= now) {
        // Overdue — schedule immediately
        overdue.push(contact);
        dueDate.setTime(now.getTime() + 60 * 60 * 1000); // schedule 1h from now
      }

      const event: CalendarEvent = {
        id: this.generateId(),
        title: `Check in with ${contact.displayName ?? contact.name?.display ?? 'Contact'}`,
        start: dueDate.toISOString(),
        notes: this.buildReminderNote(contact),
        repeat: this.mapFrequencyToRepeat(contact.rolodex.contactFrequency),
        reminderBefore: contact.rolodex.priority === 'high' ? 30 : 15,
        contactId: contact.contactId,
      };

      await this.eventService.saveEvent(event, true);
      newEventIds.push(event.id);
      scheduled++;
    }

    // Persist engine state
    const now = new Date();
    await this.saveState({ lastRun: now.toISOString(), scheduledEventIds: newEventIds });

    return { scheduled, skipped, overdue };
  }

  /** Convenience: get contacts that are past their check-in window. */
  findOverdue(contacts: ContactInfo[]): ContactInfo[] {
    const now = new Date();
    return (contacts || []).filter((c) => {
      const r = c?.rolodex || {};
      const freqDays = this.FREQUENCY_DAYS[r.contactFrequency];
      if (!freqDays) return false;
      const priorityMult =
        this.PRIORITY_MULTIPLIER[r.priority] ?? 1.0;
      const interval = Math.round(freqDays * priorityMult);
      const last = c.lastInteraction
        ? new Date(c.lastInteraction)
        : new Date(c.createdAt ?? 0);
      const due = new Date(last);
      due.setDate(due.getDate() + interval);
      return due <= now;
    });
  }

  // ===== State management ==================================================

  private async loadState(): Promise<EngineState> {
    return (
      (await this.storage.get<EngineState>(ENGINE_STATE_KEY)) ?? {
        lastRun: new Date(0).toISOString(),
        scheduledEventIds: [],
      }
    );
  }

  private async saveState(state: EngineState): Promise<void> {
    await this.storage.set(ENGINE_STATE_KEY, state);
  }

  private async clearManagedEvents(state: EngineState): Promise<void> {
    for (const id of state.scheduledEventIds) {
      await this.eventService.deleteEvent(id);
    }
  }

  // ===== Helpers ===========================================================

  private buildReminderNote(contact: ContactInfo): string {
    const parts: string[] = [];
    const name = contact.displayName ?? contact.name?.display ?? 'Contact';

    if (contact.rolodex.topic) parts.push(`Topic: ${contact.rolodex.topic}`);
    if (contact.rolodex.followUp) parts.push(`Follow-up: ${contact.rolodex.followUp}`);
    if (contact.rolodex.personalTidbits)
      parts.push(`Personal: ${contact.rolodex.personalTidbits}`);

    const body = parts.join('\n') || `Touch base with ${name}`;
    return `LoopKeeper auto-reminder: ${body}`;
  }

  private mapFrequencyToRepeat(freq: string): CalendarEvent['repeat'] {
    switch (freq) {
      case 'daily':
        return 'daily';
      case 'weekly':
        return 'weekly';
      case 'monthly':
      case 'quarterly':
      case 'yearly':
        return 'monthly';
      default:
        return 'none';
    }
  }

  private generateId(): string {
    return (
      'followup_' + Math.random().toString(36).slice(2, 11)
    );
  }
}
