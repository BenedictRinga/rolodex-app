import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { StorageService } from '../storage/storage.service';

/** 2026-08-22 LOOPKEEPER PERSONAS — the Piper voice catalog (mirrors the
 *  backend listVoices). Selecting one sends its qwen-* id to /tts so Piper
 *  picks the mapped voice. */
const PERSONAS: { id: string; name: string; language: string; description: string }[] = [
  { id: 'qwen-echo', name: 'Echo', language: 'en', description: 'Clean universal — the default' },
  { id: 'qwen-atlas', name: 'Atlas', language: 'en', description: 'Warm anchor — business and news' },
  { id: 'qwen-orion', name: 'Orion', language: 'en', description: 'Energetic guide — motivation and tutorials' },
  { id: 'qwen-morgan', name: 'Morgan', language: 'en', description: 'Deep storyteller — documentary and epic narration' },
  { id: 'qwen-onyx', name: 'Onyx', language: 'en', description: 'Noir detective — thrillers and intimate podcasts' },
  { id: 'qwen-luna', name: 'Luna', language: 'en', description: 'Gentle companion — wellness and bedtime' },
  { id: 'qwen-aria', name: 'Aria', language: 'en', description: 'Crisp presenter — podcasts and education' },
  { id: 'qwen-sage', name: 'Sage', language: 'en', description: 'Warm mentor — advice and reflection' },
  { id: 'qwen-ember', name: 'Ember', language: 'en', description: 'Firebrand — conviction and passion' },
  { id: 'qwen-fr-lumiere', name: 'Lumière', language: 'fr', description: 'French artist — poetry and romance' },
  { id: 'qwen-es-fuego', name: 'Fuego', language: 'es', description: 'Spanish storyteller — vibrant narratives' },
  { id: 'qwen-de-stern', name: 'Stern', language: 'de', description: 'German authority — technical and formal' },
  { id: 'qwen-pt-rio', name: 'Rio', language: 'pt', description: 'Portuguese anchor — community and briefs' },
  { id: 'qwen-it-roma', name: 'Roma', language: 'it', description: 'Italian storyteller' },
  { id: 'qwen-nl-amstel', name: 'Amstel', language: 'nl', description: 'Dutch presenter' },
  { id: 'qwen-sw-sauti', name: 'Sauti', language: 'sw', description: 'Swahili storyteller' },
  { id: 'qwen-zh-dragon', name: 'Dragon', language: 'zh', description: 'Chinese scholar (English fallback voice)' },
  { id: 'qwen-zh-lotus', name: 'Lotus', language: 'zh', description: 'Chinese companion (English fallback voice)' },
  { id: 'qwen-ja-sakura', name: 'Sakura', language: 'ja', description: 'Japanese companion (English fallback voice)' },
  { id: 'qwen-ko-seoul', name: 'Seoul', language: 'ko', description: 'Korean presenter (English fallback voice)' },
  { id: 'qwen-ar-sahara', name: 'Sahara', language: 'ar', description: 'Arabic scholar (English fallback voice)' },
  { id: 'qwen-hi-ganga', name: 'Ganga', language: 'hi', description: 'Hindi companion (English fallback voice)' },
];

/**
 * 2026-08-20 VOICE OPTIONS SERVICE — brought over from Zyppar's audiobrief
 * voice system: browser voices + Capacitor native TTS voices, merged.
 *
 * The default is "Assistant": a female, highly-competent-secretary voice.
 * We cannot manufacture a gender from the browser/device, so we pick the best
 * female-named / female-typed voice available and label it Assistant.
 */
@Injectable({ providedIn: 'root' })
export class VoiceOptionsService {
  private readonly VOICE_KEY = 'rolodex_tts_voice';
  /** Sentinel id for the default Assistant voice. */
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
    return Capacitor.isNativePlatform() ||
      (typeof window !== 'undefined' && 'speechSynthesis' in window);
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

  /** Load browser + Capacitor voices (Zyppar pattern). */
  loadVoices(): Promise<void> {
    if (!this.supported) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>(async (resolve) => {
      let combined: SpeechSynthesisVoice[] = [];

      // Tier 1: browser voices (web + native WebView fallback)
      if ('speechSynthesis' in window) {
        const loadBrowser = () => {
          const list = window.speechSynthesis.getVoices() || [];
          if (list.length) {
            combined = list;
            this._voices = combined;
            this._voicesLoaded = true;
            this.voicesSubject.next(combined);
          }
        };
        loadBrowser();
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => loadBrowser();
        setTimeout(loadBrowser, 500);
        setTimeout(loadBrowser, 1500);
        setTimeout(loadBrowser, 3000);
      }

      // Tier 2: Capacitor native TTS voices (device-only audio in production)
      if (Capacitor.isNativePlatform()) {
        try {
          const result = await TextToSpeech.getSupportedVoices().catch(() => ({ voices: [] as any[] }));
          const capVoices = (result?.voices || []) as any[];
          if (capVoices.length) {
            const existing = new Set(combined.map((v) => v.name));
            for (const cv of capVoices) {
              if (!existing.has(cv.name)) {
                combined.push({
                  name: cv.name || 'Device voice',
                  lang: cv.lang || 'en-US',
                  voiceURI: cv.value || cv.identifier || cv.name || 'cap-' + combined.length,
                  localService: true,
                  default: false,
                } as SpeechSynthesisVoice);
              }
            }
            this._voices = combined;
            this._voicesLoaded = true;
            this.voicesSubject.next(combined);
          }
        } catch { /* browser voices remain */ }
      }

      // Final fallback (mobile browsers with late voice lists)
      setTimeout(() => {
        if (!this._voices.length) {
          this._voicesLoaded = true;
          this.voicesSubject.next([]);
        }
        resolve();
      }, 3500);
    });

    return this.loadPromise;
  }

  /** Display list for the Settings picker. */
  getVoiceOptions(): { id: string; label: string; detail: string }[] {
    const opts: { id: string; label: string; detail: string }[] = [
      {
        id: this.CONFIDANTE_ID,
        label: 'Assistant',
        detail: 'Default — warm, clear, personal secretary',
      },
      ...PERSONAS.map((p) => ({
        id: p.id,
        label: p.name,
        detail: `${p.language.toUpperCase()} · ${p.description}`,
      })),
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
   * Assistant = best female voice available, else first English voice.
   */
  resolveVoice(): SpeechSynthesisVoice | undefined {
    if (!this._voices.length) return undefined;

    if (this._selectedVoiceId === this.CONFIDANTE_ID) {
      return this.findAssistantVoice();
    }

    return this._voices.find(
      (v) => v.voiceURI === this._selectedVoiceId || v.name === this._selectedVoiceId
    );
  }

  private findAssistantVoice(): SpeechSynthesisVoice | undefined {
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
