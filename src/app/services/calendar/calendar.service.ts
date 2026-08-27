import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { TranslateService } from '@ngx-translate/core';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import { AlertsService } from '../alerts/alerts.service';
import { StorageService } from '../storage/storage.service';

/**
 * 2026-08-27 CALENDAR SYNC (founder: "real two-way calendar sync — the app
 * comes across as complete rather than casual").
 *
 * Route chosen: the DEVICE calendar. On Android the phone's calendar IS the
 * Google calendar — the OS syncs it to the user's account automatically — so
 * LoopKeeper gets genuine two-way-ish sync with zero OAuth and zero console
 * setup: we write events into the device provider and read the week's events
 * back into an agenda. On web/PWA there is no calendar provider, so writes
 * fall back to a one-event .ics download the user can import.
 *
 * Write-through (this wave): appointments (created + received card-to-card
 * invites) and reminders become real device events; the week agenda (read)
 * lives in the Reminders tab. Loop park-dates and birthdays stay
 * LoopKeeper-side for now (founder scope decision).
 *
 * Two-way bookkeeping: localKey→deviceId mappings are persisted
 * (loopkeeper_cal_map_v1) so a future wave can update/delete events when the
 * in-app entities change; event creation itself is silent-fail by design —
 * the permission prompt already carries the consent story.
 */

export interface AgendaEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  location?: string;
  /** true when this event was created by LoopKeeper (notes marker). */
  ours: boolean;
}

export type CalendarWriteResult = 'created' | 'ics' | 'off' | 'failed';

const SYNC_FLAG = 'loopkeeper_calendar_sync';
const CAL_MAP_KEY = 'loopkeeper_cal_map_v1';
const OURS_MARKER = 'LoopKeeper ·';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  constructor(
    private storage: StorageService,
    private alerts: AlertsService,
    private translate: TranslateService,
  ) {}

  /** Calendar events only exist natively; web/PWA gets the .ics fallback. */
  nativeAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  /** User-level switch — ON unless explicitly disabled (Settings toggle later). */
  private async syncEnabled(): Promise<boolean> {
    return (await this.storage.get<boolean>(SYNC_FLAG)) !== false;
  }

  /** Ask once when needed; never nag after an OS-level refusal. */
  private async ensurePermissions(): Promise<boolean> {
    if (!this.nativeAvailable()) return false;
    try {
      const current = await CapacitorCalendar.checkAllPermissions();
      const states = Object.values(current || {});
      if (states.length && states.every((s) => s === 'granted')) return true;
      if (states.some((s) => s === 'denied')) return false;
      const after = await CapacitorCalendar.requestAllPermissions();
      return Object.values(after || {}).every((s) => s === 'granted');
    } catch {
      return false;
    }
  }

  /** Write-through: an appointment/reminder becomes a REAL device-calendar
   *  event (Android → Google via the phone's account sync). Web/PWA falls
   *  back to a single-event .ics download + localized toast. */
  async addEvent(opts: {
    title: string;
    person: string;
    start: Date;
    /** Minutes until the event ends; default 60 (30 for reminders). */
    durationMin?: number;
    location?: string;
    localKey?: string;
  }): Promise<CalendarWriteResult> {
    const end = new Date(opts.start.getTime() + (opts.durationMin ?? 60) * 60_000);
    if (!this.nativeAvailable()) {
      this.downloadIcs({
        title: opts.title,
        start: opts.start,
        end,
        notes: OURS_MARKER + ' ' + opts.person,
        location: opts.location,
      });
      return 'ics';
    }
    if (!(await this.syncEnabled()) || !(await this.ensurePermissions())) return 'off';
    try {
      const { result: cal } = await CapacitorCalendar.getDefaultCalendar();
      const { result: id } = await CapacitorCalendar.createEvent({
        title: opts.title,
        calendarId: cal?.id,
        startDate: opts.start.getTime(),
        endDate: end.getTime(),
        notes: OURS_MARKER + ' ' + opts.person + (opts.location ? ' · ' + opts.location : ''),
      });
      if (opts.localKey && id) await this.mapEvent(opts.localKey, id);
      return id ? 'created' : 'failed';
    } catch {
      return 'failed';
    }
  }

  /** The next 7 days, straight from the device provider. Returns 'denied'
   *  when the user refused read access, null when unavailable. */
  async weekAgenda(): Promise<AgendaEvent[] | 'denied' | null> {
    if (!this.nativeAvailable()) return null;
    if (!(await this.ensurePermissions())) return 'denied';
    try {
      const { result } = await CapacitorCalendar.listEventsInRange({
        startDate: Date.now(),
        endDate: Date.now() + 7 * 86_400_000,
      });
      return (result || [])
        .map((e) => ({
          id: e.id,
          title: String(e.title || '').trim() || '—',
          start: e.startDate ?? 0,
          end: e.endDate ?? e.startDate ?? 0,
          location: String(e.location || '').trim() || undefined,
          ours: String(e.description || '').startsWith(OURS_MARKER),
        }))
        .filter((e) => e.start > 0)
        .sort((a, b) => a.start - b.start);
    } catch {
      return null;
    }
  }

  /** LocalKey → device event id. Kept for the future update/delete wave. */
  private async mapEvent(localKey: string, eventId: string): Promise<void> {
    try {
      const m = (await this.storage.get<Record<string, string>>(CAL_MAP_KEY)) || {};
      m[localKey] = eventId;
      await this.storage.set(CAL_MAP_KEY, m);
    } catch {
      /* mapping is best-effort */
    }
  }

  // ═══ Web/PWA fallback: one-event .ics, downloaded into the user's files ═══

  private icsStamp(d: Date): string {
    const p = (n: number): string => String(n).padStart(2, '0');
    return (
      d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
      'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z'
    );
  }

  private icsEsc(v: string): string {
    return v.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  }

  downloadIcs(ev: { title: string; start: Date; end: Date; notes?: string; location?: string }): void {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LoopKeeper//Calendar//EN',
      'BEGIN:VEVENT',
      'UID:' + Date.now() + '@loopkeeper.app',
      'DTSTAMP:' + this.icsStamp(new Date()),
      'DTSTART:' + this.icsStamp(ev.start),
      'DTEND:' + this.icsStamp(ev.end),
      'SUMMARY:' + this.icsEsc(ev.title),
      ev.location ? 'LOCATION:' + this.icsEsc(ev.location) : '',
      ev.notes ? 'DESCRIPTION:' + this.icsEsc(ev.notes) : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');
    try {
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'loopkeeper-' + ev.start.toISOString().slice(0, 10) + '.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      void this.alerts.showToast(
        this.translate.instant('loopkeeper.cal.icsToast'),
        3200,
      );
    } catch {
      /* download refused — silent */
    }
  }
}