import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { AnalyticsService } from '../analytics/analytics.service'; // 2026-08-29 BUILD 149: lang_switched

/**
 * 2026-08-25 TRANSLATION SERVICE — device-language auto-detect + user-owned
 * translation overrides. Users can fix or improve any string; their version is
 * saved on-device and merged over the shipped locale on every app start.
 */
export interface SupportedLanguage {
  code: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private static readonly LANG_KEY = 'loopkeeper_language';
  private static readonly OVERRIDES_KEY = 'loopkeeper_translation_overrides';

  readonly languages: SupportedLanguage[] = [
    { code: 'en', label: 'English' },
    { code: 'af', label: 'Afrikaans' },
    { code: 'am', label: 'Amharic' },
    { code: 'ar', label: 'Arabic' },
    { code: 'bs', label: 'Bosnian' },
    { code: 'by', label: 'Belarusian' },
    { code: 'da', label: 'Danish' },
    { code: 'de', label: 'German' },
    { code: 'el', label: 'Greek' },
    { code: 'en-US', label: 'English (US)' },
    { code: 'es', label: 'Spanish' },
    { code: 'es-eu', label: 'Spanish (EU)' },
    { code: 'fil', label: 'Filipino' },
    { code: 'fr', label: 'French' },
    { code: 'ha', label: 'Hausa' },
    { code: 'he', label: 'Hebrew' },
    { code: 'hi', label: 'Hindi' },
    { code: 'ig', label: 'Igbo' },
    { code: 'it', label: 'Italian' },
    { code: 'ja', label: 'Japanese' },
    { code: 'nb_NO', label: 'Norwegian' },
    { code: 'nl', label: 'Dutch' },
    { code: 'om', label: 'Oromo' },
    { code: 'pl', label: 'Polish' },
    { code: 'pt-PT', label: 'Portuguese (EU)' },
    { code: 'pt-br', label: 'Portuguese (BR)' },
    { code: 'ru', label: 'Russian' },
    { code: 'sk', label: 'Slovak' },
    { code: 'sl', label: 'Slovenian' },
    { code: 'sn', label: 'Shona' },
    { code: 'so', label: 'Somali' },
    { code: 'sv', label: 'Swedish' },
    { code: 'sw', label: 'Swahili' },
    { code: 'th', label: 'Thai' },
    { code: 'tr', label: 'Turkish' },
    { code: 'ua', label: 'Ukrainian' },
    { code: 'yo', label: 'Yoruba' },
    { code: 'zh-cmn-Hans', label: 'Chinese (Simplified)' },
    { code: 'zh-cmn-Hant', label: 'Chinese (Traditional)' },
  ];

  constructor(
    private readonly translate: TranslateService,
    private readonly analytics: AnalyticsService, // 2026-08-29 BUILD 149: lang_switched
  ) {}

  /** Boot-time init: user choice wins, otherwise follow the device language. */
  init(): void {
    const saved = this.getSavedLanguage();
    const lang = saved || this.detectDeviceLanguage();
    void this.translate.use(lang).subscribe(() => this.applyOverrides(lang));
  }

  getSavedLanguage(): string | null {
    try {
      return localStorage.getItem(TranslationService.LANG_KEY);
    } catch {
      return null;
    }
  }

  setLanguage(code: string): void {
    // 2026-08-29 BUILD 149 (founder: "do they prefer to switch languages?"):
    // every deliberate switch is one anonymous event — language codes only,
    // never anything personal. The app_lang/locale props on app_launch carry
    // the baseline; this carries the delta.
    try { this.analytics.track('lang_switched', { to: code }); } catch { /* never block the switch */ }
    try {
      localStorage.setItem(TranslationService.LANG_KEY, code);
    } catch {
      /* storage unavailable — session only */
    }
    void this.translate.use(code).subscribe(() => this.applyOverrides(code));
  }

  /** Map the browser/device language to one of our supported locale files. */
  detectDeviceLanguage(): string {
    let raw = '';
    try {
      raw = navigator.language || (navigator as any).userLanguage || '';
    } catch {
      raw = '';
    }
    if (!raw) return 'en';
    const lower = raw.toLowerCase().replace('_', '-');
    // Exact file match first.
    if (this.languages.some(l => l.code.toLowerCase() === lower)) {
      return this.languages.find(l => l.code.toLowerCase() === lower)!.code;
    }
    const base = lower.split('-')[0];
    if (base === 'zh') {
      // Traditional markers → Hant, otherwise Simplified.
      if (/tw|hant|hk/i.test(raw)) return 'zh-cmn-Hant';
      return 'zh-cmn-Hans';
    }
    if (base === 'pt') {
      if (/br/i.test(raw)) return 'pt-br';
      return 'pt-PT';
    }
    if (base === 'en') return 'en';
    const hit = this.languages.find(l => l.code.toLowerCase().startsWith(base));
    return hit ? hit.code : 'en';
  }

  // ── Community aggregation ─────────────────────────────────────────────────

  /** Anonymous submission to the LoopKeeper translation aggregator. */
  async submitCommunity(lang: string, keys: Record<string, string>): Promise<boolean> {
    try {
      const res = await fetch(`${environment.rolodexApiBase}/translations/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, keys }),
      });
      if (!res.ok) return false;
      const data = await res.json().catch(() => ({}));
      return !!data?.ok;
    } catch {
      return false;
    }
  }

  // ── User-owned overrides ──────────────────────────────────────────────────

  getOverrides(lang: string): Record<string, string> {
    try {
      const all = JSON.parse(localStorage.getItem(TranslationService.OVERRIDES_KEY) || '{}');
      return all[lang] || {};
    } catch {
      return {};
    }
  }

  saveOverride(lang: string, key: string, value: string): void {
    const all = this.getAllOverrides();
    const per = all[lang] || {};
    const trimmed = value.trim();
    if (trimmed && trimmed !== key) {
      per[key] = trimmed;
    } else {
      delete per[key];
    }
    all[lang] = per;
    this.persistOverrides(all);
    this.applyOverrides(lang);
  }

  clearOverride(lang: string, key: string): void {
    const all = this.getAllOverrides();
    const per = all[lang] || {};
    delete per[key];
    all[lang] = per;
    this.persistOverrides(all);
    this.applyOverrides(lang);
  }

  private getAllOverrides(): Record<string, Record<string, string>> {
    try {
      return JSON.parse(localStorage.getItem(TranslationService.OVERRIDES_KEY) || '{}');
    } catch {
      return {};
    }
  }

  private persistOverrides(all: Record<string, Record<string, string>>): void {
    try {
      localStorage.setItem(TranslationService.OVERRIDES_KEY, JSON.stringify(all));
    } catch {
      /* storage unavailable */
    }
  }

  private applyOverrides(lang: string): void {
    const overrides = this.getOverrides(lang);
    const entries = Object.entries(overrides);
    if (!entries.length) return;
    const merged: Record<string, string> = {};
    for (const [k, v] of entries) {
      if (k.startsWith('loopkeeper.')) merged[k] = v;
    }
    if (Object.keys(merged).length) {
      this.translate.setTranslation(lang, merged, true);
    }
  }
}
