import { Injectable } from '@angular/core';
import { ContactInfo } from '../../models/contacts';
import { CalendarEvent, EventService } from '../event/event.service';

// ---------------------------------------------------------------------------
// Relationship health scoring, dormant-contact detection, and reach-out
// suggestions — all driven by the existing contactFrequency / priority /
// lastInteraction fields in the Rolodex data model.
// ---------------------------------------------------------------------------

export interface RelationshipScore {
  contactId: string;
  displayName: string;
  score: number; // 0–100
  status: 'healthy' | 'okay' | 'dormant' | 'critical';
  daysSinceLastInteraction: number;
  suggestedAction: string;
}

@Injectable({
  providedIn: 'root',
})
export class RelationshipMonitorService {
  // How many days past their frequency window before marking dormant
  private readonly DORMANT_MULTIPLIER = 1.5;
  private readonly CRITICAL_MULTIPLIER = 2.5;

  // Frequency → days
  private readonly FREQUENCY_DAYS: Record<string, number> = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    yearly: 365,
    never: Infinity,
  };

  constructor(private readonly eventService: EventService) {}

  // ===== Scoring ===========================================================

  /**
   * Score a single contact's relationship health (0–100).
   * Higher = healthier / more actively maintained.
   */
  scoreContact(contact: ContactInfo): RelationshipScore {
    const now = Date.now();
    const lastInteraction = contact.lastInteraction
      ? new Date(contact.lastInteraction).getTime()
      : 0;
    const daysSince = lastInteraction
      ? Math.floor((now - lastInteraction) / (24 * 60 * 60 * 1000))
      : 999;

    const expectedDays = this.FREQUENCY_DAYS[contact.rolodex.contactFrequency] ?? 365;

    // Proximity score: how close to / past the expected window
    let score = 100;
    if (expectedDays < Infinity) {
      const ratio = daysSince / expectedDays;
      if (ratio > 2.5) score = 0;
      else if (ratio > 1.5) score = 25;
      else if (ratio > 1.0) score = 50;
      else if (ratio > 0.7) score = 75;
      else score = 95 - Math.round(ratio * 25);
    }

    // Priority bonus/penalty
    const priorityMod: Record<string, number> = {
      high: 5,
      medium: 0,
      low: -5,
    };
    score += priorityMod[contact.rolodex.priority] ?? 0;

    // Richness bonus — more Rolodex data = more investment
    if (contact.rolodex.personalTidbits) score += 3;
    if (contact.rolodex.followUp) score += 2;
    if (contact.reminders?.length) score += 3;
    if (contact.tags?.length) score += 2;
    if (contact.rolodex.references?.length) score += 2;

    score = Math.max(0, Math.min(100, score));

    let status: RelationshipScore['status'];
    if (score >= 75) status = 'healthy';
    else if (score >= 50) status = 'okay';
    else if (score >= 25) status = 'dormant';
    else status = 'critical';

    const suggestedAction = this.buildSuggestedAction(contact, status, daysSince);

    return {
      contactId: contact.contactId,
      displayName: contact.displayName ?? contact.name?.display ?? 'Unknown',
      score,
      status,
      daysSinceLastInteraction: daysSince,
      suggestedAction,
    };
  }

  /** Score all contacts, sorted worst-first. */
  scoreAll(contacts: ContactInfo[]): RelationshipScore[] {
    return contacts
      .filter((c) => c.rolodex.contactFrequency !== 'never')
      .map((c) => this.scoreContact(c))
      .sort((a, b) => a.score - b.score);
  }

  // ===== Dormant detection =================================================

  /** Contacts that are past their contact-frequency window. */
  findDormant(contacts: ContactInfo[]): ContactInfo[] {
    const now = Date.now();
    return contacts.filter((c) => {
      const freqDays = this.FREQUENCY_DAYS[c.rolodex.contactFrequency];
      if (freqDays === Infinity) return false;
      const last = c.lastInteraction ? new Date(c.lastInteraction).getTime() : 0;
      const daysSince = Math.floor((now - last) / (24 * 60 * 60 * 1000));
      return daysSince > freqDays * this.DORMANT_MULTIPLIER;
    });
  }

  /** Top N contacts you should reach out to today. */
  suggestReachOut(contacts: ContactInfo[], limit = 5): RelationshipScore[] {
    return this.scoreAll(contacts).slice(0, limit);
  }

  // ===== Digest ============================================================

  /** Generate a weekly relationship digest summary. */
  getDigest(contacts: ContactInfo[]): {
    total: number;
    healthy: number;
    dormant: number;
    critical: number;
    topSuggestions: RelationshipScore[];
    dormantContacts: ContactInfo[];
  } {
    const scored = this.scoreAll(contacts);
    return {
      total: contacts.length,
      healthy: scored.filter((s) => s.status === 'healthy').length,
      dormant: scored.filter((s) => s.status === 'dormant').length,
      critical: scored.filter((s) => s.status === 'critical').length,
      topSuggestions: scored.filter((s) => s.status !== 'healthy').slice(0, 5),
      dormantContacts: this.findDormant(contacts),
    };
  }

  // ===== Auto-schedule health check events =================================

  /**
   * Creates a one-time "relationship health check" calendar event that
   * prompts the user to review their dormant/critical contacts.
   */
  async scheduleHealthCheck(): Promise<void> {
    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + 7);
    nextCheck.setHours(9, 0, 0, 0);

    await this.eventService.saveEvent({
      id: 'rolodex-health-check',
      title: 'Rolodex Relationship Check',
      start: nextCheck.toISOString(),
      notes: 'Review your dormant contacts and reach out to someone you haven\'t spoken to in a while.',
      repeat: 'weekly',
      reminderBefore: 60,
    });
  }

  // ===== Helpers ===========================================================

  private buildSuggestedAction(
    contact: ContactInfo,
    status: string,
    daysSince: number,
  ): string {
    const name = contact.displayName ?? contact.name?.display ?? 'this contact';

    switch (status) {
      case 'critical':
        return `It's been ${daysSince} days — send ${name} a quick message or call today.`;
      case 'dormant':
        return `${name} is due for a check-in. Schedule a call this week.`;
      case 'okay':
        return `You're on track with ${name}. Keep it up.`;
      case 'healthy':
        return `Your relationship with ${name} is well-maintained.`;
      default:
        return `Review ${name}'s contact details.`;
    }
  }
}
