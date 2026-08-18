import { Injectable } from '@angular/core';
import type { ContactInfo } from '../../models/contacts';
import type { CalendarEvent } from '../event/event.service';
import type { SyncBundle } from './sync.types';
import { environment } from 'src/environments/environment';

// ---------------------------------------------------------------------------
// Local file export / import — plain JSON so the user always has a manual
// fallback. Files use the `.rolodex` extension and contain the full SyncBundle
// unencrypted. Users can transfer via email, AirDrop, USB, etc.
// ---------------------------------------------------------------------------

const EXTENSION = '.rolodex';

@Injectable({
  providedIn: 'root',
})
export class LocalExportService {
  /**
   * Export contacts + events as a `.rolodex` JSON file.
   * Triggers a browser download.
   */
  exportToFile(
    contacts: ContactInfo[],
    events: CalendarEvent[],
    options?: { includeScores?: boolean; includeBirthdays?: boolean },
  ): void {
    const bundle: SyncBundle = {
      version: 1,
      createdAt: new Date().toISOString(),
      deviceName: this.getDeviceName(),
      contacts,
      events,
    };

    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = `rolodex-backup-${this.formatDate(new Date())}${EXTENSION}`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import from a `.rolodex` JSON file. Opens a file picker and resolves with
   * the parsed bundle, or null if cancelled.
   */
  importFromFile(): Promise<SyncBundle | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = `.json,${EXTENSION}`;

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          const text = await file.text();
          const bundle = JSON.parse(text) as SyncBundle;

          // Basic validation
          if (!bundle.version || !bundle.contacts || !Array.isArray(bundle.contacts)) {
            !environment.production && console.error('[LocalExport] Invalid .rolodex file: missing version or contacts array');
            resolve(null);
            return;
          }

          resolve(bundle);
        } catch (err) {
          !environment.production && console.error('[LocalExport] Failed to parse .rolodex file:', err);
          resolve(null);
        }
      };

      // Handle user cancelling the picker
      input.oncancel = () => resolve(null);

      input.click();
    });
  }

  // ---- helpers -------------------------------------------------------------

  private getDeviceName(): string {
    const ua = navigator.userAgent;
    if (/Android/.test(ua)) return 'Android';
    if (/iPhone|iPad/.test(ua)) return 'iOS';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'Mac';
    return 'Web';
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
