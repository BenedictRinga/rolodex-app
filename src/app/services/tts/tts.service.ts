import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { VoiceOptionsService } from '../voice-options/voice-options.service';

/**
 * 2026-08-20 BROWSER TTS SERVICE — reusable narration for Welcome Again and
 * anywhere else in RolodexAI later.
 *
 * Besides the thin speechSynthesis wrapper, it fixes context-dependent words:
 *   - "live across devices" / "it's all live" → laɪv (broadcast/live)
 *   - "where your contacts live" → lɪv (to reside)
 *   - "sent · delivered · read" → red (past tense)
 *
 * The trick is phonetic spellings that speech engines pronounce reliably:
 *   lyve → laɪv, lihv → lɪv, redd → red.
 */
@Injectable({ providedIn: 'root' })
export class TtsService {
  get supported(): boolean {
    return this.voiceOptions.supported;
  }

  constructor(private readonly voiceOptions: VoiceOptionsService) {}

  /** Speak a line of narration, stopping anything already playing.
   *  DEVICE-FIRST (Zyppar Studio pattern): Capacitor native TTS on Android/iOS,
   *  browser speechSynthesis as the web/fallback tier. */
  speak(text: string, rate = 0.95): void {
    if (!this.supported) return;
    const out = this.disambiguate(text);
    const voice = this.voiceOptions.resolveVoice();
    const confidanteDefault = !this.voiceOptions.selectedVoiceId ||
      this.voiceOptions.selectedVoiceId === this.voiceOptions.CONFIDANTE_ID;
    const pitch = confidanteDefault ? 1.05 : 1.0;

    if (Capacitor.isNativePlatform()) {
      void TextToSpeech.speak({
        text: out,
        rate,
        pitch,
        volume: 1.0,
        lang: voice?.lang || 'en-US',
      }).catch(() => this.speakWeb(out, rate, voice, pitch));
      return;
    }
    this.speakWeb(out, rate, voice, pitch);
  }

  private speakWeb(
    text: string,
    rate: number,
    voice: SpeechSynthesisVoice | undefined,
    pitch: number,
  ): void {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.voice = voice ?? null;
      window.speechSynthesis.speak(utterance);
    } catch { /* narration is best-effort */ }
  }

  /** Stop all speech immediately (native + web). */
  stop(): void {
    if (Capacitor.isNativePlatform()) {
      void TextToSpeech.stop().catch(() => undefined);
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch { /* ignore */ }
    }
  }

  /**
   * Public so any future Rolodex screen can narrate with the same fixes.
   * Rewrites ambiguous homographs based on surrounding context.
   */
  disambiguate(text: string): string {
    if (!text) return text;

    let out = text;

    // ---- live (laɪv: broadcast / happening now) ----
    // "live across devices", "live demo", "live stream", "live from", "live at", "live on stage"
    out = out.replace(
      /\blive\b(?=\s+(?:across|demo|room|stream|from|show|broadcast|event|performance|album|on\s+stage|at\s+\d))/gi,
      'lyve'
    );

    // "devices live" (e.g. "link devices live") and "loves live" (She loves live)
    out = out.replace(/\bdevices\s+live\b/gi, 'devices lyve');
    out = out.replace(/\bloves\s+live\b/gi, 'loves lyve');

    // "it's all live" / "is live" — the tour is happening live, not residing
    out = out.replace(/\ball\s+live\b/gi, 'all lyve');
    out = out.replace(/\bis\s+live\b/gi, 'is lyve');

    // ---- live (lɪv: to reside / dwell / exist) ----
    out = out.replace(
      /\b(live|lives|lived)\b(?=\s+(?:in|on|at|near|with|here|there|right|where|inside|among))/gi,
      (m) => (m.toLowerCase() === 'lives' ? 'lihvs' : m.toLowerCase() === 'lived' ? 'lihvd' : 'lihv')
    );

    // "where your contacts live" / "you live" / "they live" — verb form
    out = out.replace(
      /\b(?:where\s+your\s+)?contacts\s+live\b/gi,
      'contacts lihv'
    );

    // ---- read (red: past tense, as in "sent · delivered · read") ----
    out = out.replace(
      /\bread\b(?=\s*(?:receipt|badge|notification|checkmark|status))/gi,
      'redd'
    );
    out = out.replace(/(?:sent|delivered)\s*[·•]\s*read\b/gi, (m) => m.replace(/\bread\b/i, 'redd'));

    // ---- read (reed: present tense, "it reads the deep context") ----
    out = out.replace(/\breads\b/gi, 'reedz');

    return out;
  }
}
