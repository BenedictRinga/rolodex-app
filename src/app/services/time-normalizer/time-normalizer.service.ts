import { Injectable } from '@angular/core';

// ---------------------------------------------------------------------------
// 2026-08-18 THE TIME NORMALIZER - app-wide time display that ALWAYS derives
// the device/network timezone (Intl), never forces UTC. The same formatter
// is used everywhere a time/date is shown, so the app clock can never drift
// from what the user's device + provider actually say.
// ---------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class TimeNormalizerService {
  /** The device/network timezone (e.g. 'Africa/Nairobi'), '' when unknown. */
  tz(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return '';
    }
  }

  /** The device's local now - the app clock. */
  now(): Date {
    return new Date();
  }

  /**
   * Format a timestamp in the DEVICE timezone (no UTC enforcement).
   * style: 'time' (HH:mm), 'date' (MMM d, yyyy), 'datetime' (both), 'short' (HH:mm on MMM d).
   */
  format(at: string | Date | number | null | undefined, style: 'time' | 'date' | 'datetime' | 'short' = 'datetime'): string {
    if (at === null || at === undefined || at === '') return '';
    try {
      const d = typeof at === 'string' || typeof at === 'number' ? new Date(at) : at;
      if (isNaN(d.getTime())) return '';
      const opts: Intl.DateTimeFormatOptions =
        style === 'time'
          ? { hour: 'numeric', minute: '2-digit' }
          : style === 'date'
            ? { year: 'numeric', month: 'short', day: 'numeric' }
            : style === 'short'
              ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
              : { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
      return new Intl.DateTimeFormat(undefined, opts).format(d);
    } catch {
      return '';
    }
  }
}
