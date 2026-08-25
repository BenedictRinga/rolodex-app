import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ModalController } from '@ionic/angular';
import { TranslationService } from '../../services/translation/translation.service';

interface KeyRow {
  key: string;
  group: string;
  english: string;
  current: string;
  overridden: boolean;
}

@Component({
  selector: 'app-translate-portal',
  templateUrl: 'translate-portal.component.html',
  styleUrls: ['translate-portal.component.scss'],
})
export class TranslatePortalComponent {
  lang = 'en';
  languages = this.translation.languages;
  search = '';
  loading = false;
  savedFlash = false;

  en: Record<string, string> = {};
  file: Record<string, string> = {};
  rows: KeyRow[] = [];
  draft: Record<string, string> = {};

  constructor(
    private readonly modalController: ModalController,
    private readonly http: HttpClient,
    private readonly translation: TranslationService,
  ) {}

  async ionViewWillEnter(): Promise<void> {
    await this.loadLanguage(this.translation.getSavedLanguage() || this.translation.detectDeviceLanguage());
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }

  async selectLanguage(code: string): Promise<void> {
    await this.loadLanguage(code);
  }

  async loadLanguage(code: string): Promise<void> {
    this.lang = code;
    this.loading = true;
    this.search = '';
    try {
      const [enData, fileData] = await Promise.all([
        this.http.get<Record<string, any>>('assets/i18n/en.json').toPromise(),
        this.http.get<Record<string, any>>(`assets/i18n/${code}.json`).toPromise(),
      ]);
      this.en = enData?.['loopkeeper'] || {};
      this.file = fileData?.['loopkeeper'] || {};
      const overrides = this.translation.getOverrides(code);
      this.rows = Object.keys(this.en)
        .filter(k => !k.startsWith('__'))
        .map(k => {
          const current = overrides[k] ?? this.file[k] ?? this.en[k] ?? '';
          return {
            key: k,
            group: k.split('.')[0],
            english: this.en[k] ?? '',
            current,
            overridden: Object.prototype.hasOwnProperty.call(overrides, k),
          };
        })
        .sort((a, b) => a.group.localeCompare(b.group) || a.key.localeCompare(b.key));
      this.draft = {};
    } finally {
      this.loading = false;
    }
  }

  get groups(): { name: string; rows: KeyRow[] }[] {
    const q = this.search.trim().toLowerCase();
    const filtered = this.rows.filter(r => !q || r.key.toLowerCase().includes(q) || r.current.toLowerCase().includes(q) || r.english.toLowerCase().includes(q));
    const map = new Map<string, KeyRow[]>();
    for (const r of filtered) {
      const arr = map.get(r.group) || [];
      arr.push(r);
      map.set(r.group, arr);
    }
    return [...map.entries()].map(([name, rows]) => ({ name, rows }));
  }

  get translatedCount(): number {
    return this.rows.filter(r => r.current && r.current !== r.english).length;
  }

  get totalCount(): number {
    return this.rows.length;
  }

  get pendingCount(): number {
    return this.totalCount - this.translatedCount;
  }

  updateDraft(key: string, value: string): void {
    this.draft[key] = value;
  }

  hasDraft(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.draft, key) && !!this.draft[key]?.trim();
  }

  async saveAll(): Promise<void> {
    const entries = Object.entries(this.draft).filter(([, v]) => v?.trim());
    for (const [k, v] of entries) {
      this.translation.saveOverride(this.lang, k, v);
    }
    this.savedFlash = true;
    setTimeout(() => (this.savedFlash = false), 2200);
    await this.loadLanguage(this.lang);
  }

  resetKey(row: KeyRow): void {
    this.translation.clearOverride(this.lang, row.key);
    void this.loadLanguage(this.lang);
  }

  async copyShare(): Promise<void> {
    const payload: Record<string, string> = {};
    for (const r of this.rows) {
      if (this.draft[r.key]?.trim()) payload[r.key] = this.draft[r.key].trim();
    }
    const text = JSON.stringify({ lang: this.lang, loopkeeper: payload }, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      this.savedFlash = true;
      setTimeout(() => (this.savedFlash = false), 2200);
    } catch {
      /* clipboard unavailable */
    }
  }
}
