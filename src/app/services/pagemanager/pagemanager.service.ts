import { Injectable } from '@angular/core';
import type { ContactInfo } from '../../models/contacts';

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
  FourWs = 'FourWs', // 2026-08-17 the Confidante's deep-context lens
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

  constructor() {}
}
