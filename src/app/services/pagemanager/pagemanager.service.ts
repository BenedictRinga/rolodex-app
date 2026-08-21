import { Injectable } from '@angular/core';
import type { ContactInfo } from '../../models/contacts';
import { StorageService } from '../storage/storage.service';

// ---------------------------------------------------------------------------
// View modes the Rolodex tab can be in
// ---------------------------------------------------------------------------
export enum RolodexView {
  Regular = 'Regular',
  AutoSort = 'AutoSort',
  Search = 'Search',
  Filters = 'Filters',
  Settings = 'Settings',
  Locations = 'Locations',
  Interactive = 'Interactive',
  FourWs = 'FourWs', // 2026-08-17 the Assistant's deep-context lens
}

// ---------------------------------------------------------------------------
// Named contact-card display modes
// ---------------------------------------------------------------------------
export const contactCardModes: Record<string, string> = {
  default: 'Default',
  alphabetical: 'Alphabetical',
  rolodex: 'Rolodex',
  family: 'Family',
  businesscard: 'Business Card',
  social: 'Social',
  grid: 'Grid',
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class PagemanagerService {
  /** Public reference to the contact card display modes for use in templates. */
  readonly contactCardModes = contactCardModes;

  /** Currently selected display mode key (maps into contactCardModes). */
  currentViewMode: string = 'default';

  /** Free-text search / finder query the user typed. */
  finderQuery: string = '';

  /** The working set of contacts being displayed. */
  contacts: ContactInfo[] = [];

  /** Human-readable label for the current card display mode. */
  get upperCardMode(): string {
    return contactCardModes[this.currentViewMode] ?? contactCardModes['default'];
  }

  /** 2026-08-21 PERSISTED VIEW: restore the last card view the user chose
   *  (IndexedDB via StorageService — no localStorage) so the next launch opens
   *  on the same view instead of default. */
  constructor(private readonly storage: StorageService) {
    void this.restoreViewMode();
  }

  private async restoreViewMode(): Promise<void> {
    try {
      const saved = await this.storage.get<string>('contact-cardViewMode');
      if (saved && contactCardModes[saved]) {
        this.currentViewMode = saved;
      }
    } catch { /* fresh profile → default view */ }
  }
}
