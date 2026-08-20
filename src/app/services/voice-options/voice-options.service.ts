import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from '../storage/storage.service';

/**
 * 2026-08-20 VOICE OPTIONS SERVICE — brought over from Zyppar's audiobrief
 * voice system (browser + Capacitor-shaped structure, browser-first here).
 *
 * The default is "Confidante": a female, highly-competent-secretary voice.
 * We cannot manufacture a gender from the browser, so we pick the best
 * female-named / female-typed voice available and label it Confidante.
 */
@Injectable({ providedIn: 'root' })
export class VoiceOptionsService {
  private readonly VOICE_KEY = 'rolodex_tts_voice';
  /** Sentinel id for the default Confidante voice. */
  readonly CONFIDANTE_ID = 'confidante';

  private voicesSubject = new BehaviorSubject<SpeechSynthesisVoice[]>([]);
  voices$ = this.voicesSubject.asObservable();

  private _voices: SpeechSynthesisVoice[] = [];
  private _selectedVoiceId: string = this.CONFIDANTE_ID;
  private _voicesLoaded = false;
  private loadPromise: Promise<void> | null = null;

  get voices(): SpeechSynthesisVoice[] {
    return this._voices;
  }

  get selectedVoiceId(): string {
    return this._selectedVoiceId;
  }

  get voicesLoaded(): boolean {
    return this._voicesLoaded;
  }

  get supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  constructor(private readonly storage: StorageService) {
    if (this.supported) {
      this.loadVoices().then(async () => {
        try {
          const saved = await this.storage.get<string>(this.VOICE_KEY);
          if (saved) this._selectedVoiceId = saved;
        } catch { /* default */ }
      });
    }
  }

  /** Load browser voices, retry on the voiceschanged event (Zyppar pattern). */
  loadVoices(): Promise<void> {
    if (!this.supported) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve) => {
      const load = () => {
        const list = window.speechSynthesis.getVoices() || [];
        if (list.length) {
          this._voices = list;
          this._voicesLoaded = true;
          this.voicesSubject.next(list);
          resolve();
        }
      };

      load();
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        load();
      };

      // Retry ladder for mobile browsers that load voices late.
      setTimeout(load, 500);
      setTimeout(load, 1500);
      setTimeout(load, 3000);
    });

    return this.loadPromise;
  }

  /** Display list for the Settings picker. */
  getVoiceOptions(): { id: string; label: string; detail: string }[] {
    const opts: { id: string; label: string; detail: string }[] = [
      {
        id: this.CONFIDANTE_ID,
        label: 'Confidante',
        detail: 'Default — female, highly competent secretary',
      },
    ];

    for (const v of this._voices) {
      opts.push({
        id: v.voiceURI || v.name,
        label: v.name,
        detail: `${v.lang}${v.localService ? ' · device' : ''}`,
      });
    }
    return opts;
  }

  async selectVoice(id: string): Promise<void> {
    this._selectedVoiceId = id || this.CONFIDANTE_ID;
    try {
      await this.storage.set(this.VOICE_KEY, this._selectedVoiceId);
    } catch { /* best effort */ }
  }

  /**
   * Resolve the active SpeechSynthesisVoice.
   * Confidante = best female voice available, else first English voice.
   */
  resolveVoice(): SpeechSynthesisVoice | undefined {
    if (!this._voices.length) return undefined;

    if (this._selectedVoiceId === this.CONFIDANTE_ID) {
      return this.findConfidanteVoice();
    }

    return this._voices.find(
      (v) => v.voiceURI === this._selectedVoiceId || v.name === this._selectedVoiceId
    );
  }

  private findConfidanteVoice(): SpeechSynthesisVoice | undefined {
    const femaleHints = [
      'female', 'woman', 'girl', 'samantha', 'victoria', 'karen', 'moira',
      'tessa', 'fiona', 'serena', 'zira', 'aria', 'jenny', 'hazel', 'susan',
      'libby', 'corinna', 'google us english', 'google uk english female',
      'microsoft aria', 'microsoft zira', 'microsoft jenny', 'microsoft hazel',
      'microsoft susan', 'microsoft libby', 'microsoft corinna',
    ];

    const byHint = this._voices.find((v) =>
      femaleHints.some((hint) => v.name.toLowerCase().includes(hint))
    );
    if (byHint) return byHint;

    const english = this._voices.find((v) => v.lang?.toLowerCase().startsWith('en'));
    return english || this._voices[0];
  }
}
