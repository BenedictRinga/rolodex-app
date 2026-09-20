import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ContactInfo } from '../../models/contacts';
// 2026-09-01 BUILD 175 (founder: "the parser from way back"): the .vcf door —
// the honest batch import on every device, and THE batch path on iPhone.
import { parseVcf, VcfContact } from '../../../util/vcard';

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
  /** 2026-08-31 FOUNDER DEV ITERATION (unshipped): pick mode — the walk's
   *  "Not this one" opens this sheet to CHOOSE a person; the tap returns the
   *  contact instead of navigating to the card. Same roomy design, new target. */
  @Input() pickMode = false;
  /** The walk's on-screen person is hidden from the pick list. */
  @Input() excludeId = '';
  /**
   * 2026-09-01 BUILD 172 (founder): the ADD ICON joins the Loops interface —
   * one roomy sheet for reaching people everywhere. With addDoors the sheet
   * carries the bring-them-in doors at its foot: the phone picker (only when
   * the device actually offers it — iPhone Safari never does) and typing one
   * in (always). Tapping a row still opens that person's card.
   */
  @Input() addDoors = false;
  /** The Contact Picker API exists on this browser (Android Chromium only). */
  @Input() pickerAvailable = false;
  /**
   * 2026-09-14 BUILD 197 THE TWO-REPOSITORY SEARCH (founder: the search fab
   * "should equally have two columns - so it can also search the device
   * contacts list, not just LoopKeeper's, much like the add Contact applies
   * to both repositories. Be mindful of any qualifications in the add
   * format, such as permissions"): the SEARCH sheet carries the same two-tab
   * architecture as the add sheet, with the SAME qualifications — the web
   * Contact Picker API is pick-only (the OS picker's own search bar searches
   * the device list; no web app can query device contacts directly), so the
   * phone tab is the picker door where the API exists, and on iPhone the
   * honest wall + the .vcf / typed doors. Home matches the picked person
   * against LoopKeeper: found -> their card; not found -> brought in.
   */
  @Input() deviceSearch = false;
  /**
   * 2026-09-01 BUILD 174 (founder: two tabs — device contacts AND the people
   * already here): the sheet's two surfaces. 'people' is the searchable
   * LoopKeeper deck; 'phone' is the device tab — the picker door on Android,
   * and on iPhone the honest explanation with an apology and the typed door.
   */
  tab: 'people' | 'phone' = 'people';

  query = '';

  /** 2026-09-01 BUILD 175: a chosen .vcf file held nothing we could read —
   *  say so quietly in the phone pane instead of a silent dead tap. */
  vcfFail = false;

  constructor(private readonly modalController: ModalController) {}

  /** BUILD 197: search-mode phone-pane copy (the add pane's translated keys
   *  speak ADD; search speaks its own honest EN — the home-chrome precedent).
   *  The doors themselves reuse the same translated labels in both contexts. */
  searchPhoneTitle(): string {
    return this.deviceSearch ? 'Search your phone\'s contacts' : '';
  }

  searchPhoneBody(): string {
    return this.deviceSearch
      ? 'The phone\'s own contact picker opens — its search bar searches your device list (a web app cannot read the device contacts directly). Pick the person and we\'ll find them here — or bring them in.'
      : '';
  }

  searchIosTitle(): string {
    return this.deviceSearch ? 'Apple\'s wall' : '';
  }

  searchIosBody(): string {
    return this.deviceSearch
      ? 'No web app can search an iPhone\'s contacts — not even LoopKeeper. Bring the person in with a .vcf file or by typing them in — then they are searchable here forever.'
      : '';
  }

  pickPhone(): void {
    void this.modalController.dismiss(null, 'phone');
  }

  typeOne(): void {
    void this.modalController.dismiss(null, 'manual');
  }

  /** 2026-09-01 BUILD 175 (founder: batch import — "that parser from way
   *  back"): pick a .vcf file, parse it here on the device, hand the records
   *  home. Nothing is uploaded; the file never leaves the phone. */
  importVcf(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vcf,text/vcard,text/x-vcard';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const cards: VcfContact[] = parseVcf(String(reader.result || ''));
          if (cards.length) {
            void this.modalController.dismiss({ contacts: cards }, 'vcf');
            return;
          }
        } catch { /* fall through to the quiet failure line */ }
        this.vcfFail = true;
      };
      reader.onerror = () => { this.vcfFail = true; };
      reader.readAsText(file);
    };
    input.click();
  }

  get results(): ContactInfo[] {
    const q = this.query.trim().toLowerCase();
    let pool = this.contacts || [];
    if (this.pickMode && this.excludeId) {
      pool = pool.filter((c) => String(c?.contactId || '') !== this.excludeId);
    }
    // 2026-09-20 BUILD 286 THE CLEAN PICK LIST (founder: "Under Add a person,
    // demo contact and task cards are still showing with the DEMO watermark"):
    // an ADD or PICK flow lists REAL cards only — demo cards are for looking,
    // never for adding.
    if (this.addDoors || this.pickMode) {
      pool = pool.filter((c: any) => !(c as any)?.isMockData);
    }
    if (!q) return pool.slice(0, 20);
    return pool.filter((c) => {
      const name = String(c.name?.display || '').toLowerCase();
      const company = String(c.organization?.company || '').toLowerCase();
      const phones = (c.phones || []).map((p) => String(p.number || '')).join(' ').toLowerCase();
      const emails = (c.emails || []).map((e) => String(e.address || '')).join(' ').toLowerCase();
      const tags = (c.tags || []).map((t) => String(t || '')).join(' ').toLowerCase();
      return name.includes(q) || company.includes(q) || phones.includes(q) || emails.includes(q) || tags.includes(q);
    });
  }

  open(contact: ContactInfo): void {
    void this.modalController.dismiss({ contact }, this.pickMode ? 'pick' : 'open');
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
