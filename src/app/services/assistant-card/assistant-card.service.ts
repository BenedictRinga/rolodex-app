import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AnalyticsService } from '../analytics/analytics.service';

/**
 * 2026-08-22 THE ROLODEX THAT REMEMBERS: a tiny event bus so any send path
 * (SMS / Email / WhatsApp / in-app chat) can tell HomePage "this card just got
 * used" — HomePage then updates the card on device (lastInteraction, followUp,
 * nextInteraction, a tidbit) and persists it. No server round-trip needed.
 */
export interface AssistantCardUpdate {
  contactId: string;
  medium: string;
  text?: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantCardService {
  readonly updates$ = new Subject<AssistantCardUpdate>();

  constructor(private readonly analytics: AnalyticsService) {}

  push(contactId: string, medium: string, text?: string): void {
    if (!contactId) return;
    this.analytics.track('message_sent', { medium });
    this.analytics.track('loop_closed', { medium });
    this.updates$.next({ contactId, medium, text });
  }
}
