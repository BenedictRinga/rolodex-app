import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ContactInfo } from '../../models/contacts';

/**
 * 2026-08-19 SEARCH MODAL — the missing Search control.
 * The rolodex list had no search UI; this FAB-launched sheet gives a real
 * search field, live results, and opens the full card surface on tap.
 */
@Component({
  selector: 'app-search-modal',
  templateUrl: './search-modal.component.html',
  styleUrls: ['./search-modal.component.scss'],
  standalone: false,
})
export class SearchModalComponent {
  @Input() contacts: ContactInfo[] = [];

  query = '';

  constructor(private readonly modalController: ModalController) {}

  get results(): ContactInfo[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return (this.contacts || []).slice(0, 20);
    return (this.contacts || []).filter((c) => {
      const name = String(c.name?.display || '').toLowerCase();
      const company = String(c.organization?.company || '').toLowerCase();
      const phones = (c.phones || []).map((p) => String(p.number || '')).join(' ').toLowerCase();
      const emails = (c.emails || []).map((e) => String(e.address || '')).join(' ').toLowerCase();
      const tags = (c.tags || []).map((t) => String(t || '')).join(' ').toLowerCase();
      return name.includes(q) || company.includes(q) || phones.includes(q) || emails.includes(q) || tags.includes(q);
    });
  }

  open(contact: ContactInfo): void {
    void this.modalController.dismiss({ contact }, 'open');
  }

  clear(): void {
    this.query = '';
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }

  uniquePhones(c: ContactInfo): any[] {
    const seen = new Set<string>();
    return (c?.phones || []).filter((p: any) => {
      const key = String(p?.number || '').replace(/[^\d]/g, '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  uniqueEmails(c: ContactInfo): any[] {
    const seen = new Set<string>();
    return (c?.emails || []).filter((e: any) => {
      const key = String(e?.address || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  avatarFor(c: ContactInfo): string {
    const name = String(c?.name?.display || '?');
    const initials = name.split(/\s+/).map((p) => p?.[0] || '').join('').slice(0, 2).toUpperCase();
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="16" fill="#00A896"/><text x="32" y="41" font-family="sans-serif" font-size="22" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`
    );
  }

  avatarFailed(event: Event): void {
    (event.target as HTMLImageElement).src = this.avatarFor({} as ContactInfo);
  }
}
