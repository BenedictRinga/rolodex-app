import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { NetworkService } from '../../services/network/network.service';
import { TranslationService } from '../../services/translation/translation.service';
import { environment } from '../../../environments/environment';

interface ReviewItem {
  _id: string;
  lang: string;
  keys: Record<string, string>;
  source: string;
  approved: boolean;
  rejected: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-translation-review',
  templateUrl: 'translation-review.component.html',
  styleUrls: ['translation-review.component.scss'],
})
export class TranslationReviewComponent {
  languages = this.translation.languages;
  lang = '';
  status: 'pending' | 'approved' | 'rejected' = 'pending';
  items: ReviewItem[] = [];
  loading = false;
  busyId = '';
  flash = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly network: NetworkService,
    private readonly translation: TranslationService,
  ) {}

  async ionViewWillEnter(): Promise<void> {
    await this.load();
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }

  async load(): Promise<void> {
    this.loading = true;
    try {
      const params = new URLSearchParams({ status: this.status });
      if (this.lang) params.set('lang', this.lang);
      const res = await this.network.safeFetch(
        `${environment.rolodexApiBase}/translations/suggestions?${params.toString()}`,
        { cache: 'no-store' },
      );
      if (!res || !res.ok) {
        this.items = [];
        return;
      }
      const data = await res.json();
      this.items = Array.isArray(data?.items) ? data.items : [];
    } finally {
      this.loading = false;
    }
  }

  async setStatus(s: 'pending' | 'approved' | 'rejected'): Promise<void> {
    this.status = s;
    await this.load();
  }

  async setLang(code: string): Promise<void> {
    this.lang = code;
    await this.load();
  }

  keysOf(item: ReviewItem): [string, string][] {
    return Object.entries(item.keys || {}).slice(0, 6);
  }

  async approve(id: string): Promise<void> {
    this.busyId = id;
    try {
      await this.network.safeFetch(`${environment.rolodexApiBase}/translations/${id}/approve`, { method: 'POST' });
    } finally {
      this.busyId = '';
      await this.load();
    }
  }

  async reject(id: string): Promise<void> {
    this.busyId = id;
    try {
      await this.network.safeFetch(`${environment.rolodexApiBase}/translations/${id}/reject`, { method: 'POST' });
    } finally {
      this.busyId = '';
      await this.load();
    }
  }

  async exportLang(): Promise<void> {
    const lang = this.lang || '';
    const res = await this.network.safeFetch(
      `${environment.rolodexApiBase}/translations/export${lang ? `?lang=${encodeURIComponent(lang)}` : ''}`,
      { cache: 'no-store' },
    );
    if (!res || !res.ok) return;
    const data = await res.json();
    try {
      await navigator.clipboard.writeText(JSON.stringify(data.keys || {}, null, 2));
      this.flash = true;
      setTimeout(() => (this.flash = false), 2200);
    } catch {
      /* clipboard unavailable */
    }
  }
}
