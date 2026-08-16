import { Injectable } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { AppLauncher } from '@capacitor/app-launcher';
import { EventService, type CalendarEvent } from '../event/event.service';
import { AlertsService } from '../alerts/alerts.service';

// ---------------------------------------------------------------------------
// Thin wrapper around device / platform capabilities: calls, email, maps,
// social links, and calendar events.
// ---------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class DeviceconnectorService {
  constructor(
    private readonly eventService: EventService,
    private readonly alertsService: AlertsService,
  ) {}

  // ---- Phone -------------------------------------------------------------

  /** Open the system dialler pre-filled with the given phone number. */
  async makeCall(phoneNumber: string): Promise<void> {
    await AppLauncher.openUrl({ url: `tel:${phoneNumber}` });
  }

  // ---- Email -------------------------------------------------------------

  /** Open the default email client with a pre-filled compose window. */
  async sendEmail(
    emailAddress: string,
    subject?: string,
    body?: string,
  ): Promise<void> {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (body) params.set('body', body);

    const query = params.toString();
    const url = query ? `mailto:${emailAddress}?${query}` : `mailto:${emailAddress}`;
    await AppLauncher.openUrl({ url });
  }

  // ---- Maps --------------------------------------------------------------

  /** Open Google Maps (or the default map app) searching for the address. */
  async openMaps(address: string): Promise<void> {
    const encoded = encodeURIComponent(address);
    await AppLauncher.openUrl({
      url: `https://www.google.com/maps/search/${encoded}`,
    });
  }

  // ---- Social / web links ------------------------------------------------

  /** Open an arbitrary URL in the in-app browser overlay. */
  async openSocialMedia(url: string): Promise<void> {
    await Browser.open({ url });
  }

  // ---- Calendar ----------------------------------------------------------

  /**
   * Create a calendar event and schedule a local notification for it.
   * Shows a confirmation toast on success.
   */
  async addToCalendar(
    title: string,
    location: string,
    notes: string,
    startDate: string,
    endDate: string,
    url: string,
  ): Promise<void> {
    const event: CalendarEvent = {
      id: Date.now().toString(),
      title,
      location,
      notes,
      start: startDate,
      end: endDate,
      url,
    };

    await this.eventService.saveEvent(event);
    // Notification is now handled automatically by EventService internals
    await this.eventService.publish('eventAdded', event);
    await this.alertsService.showToast('Event added to calendar');
  }
}
