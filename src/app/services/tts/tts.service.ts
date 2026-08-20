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
      // Mobile Chrome/WebView quirk: speech can be left in a paused state and
      // silently refuses to start. Resume before every speak (Zyppar pattern).
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1.0;
      utterance.lang = voice?.lang || 'en-US';
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
    // PHRASE-FIRST: replace the whole ambiguous phrase with an unambiguous
    // spoken paraphrase. Device TTS engines routinely read "lyve" as lɪv, so
    // we no longer rely on spelling tricks for the phrases that actually appear.
    out = out.replace(/\blive across devices\b/gi, 'in real time across devices');
    out = out.replace(/\bdevices link live\b/gi, 'devices link in real time');
    out = out.replace(/\blink devices live\b/gi, 'link devices in real time');
    out = out.replace(/\bdevices live\b/gi, 'devices in real time');
    out = out.replace(/\blink live\b/gi, 'link in real time');
    out = out.replace(/\ball live\b/gi, 'all in real time');
    out = out.replace(/\bis live\b/gi, 'is in real time');
    out = out.replace(/\bgo live\b/gi, 'go in real time');
    out = out.replace(/\blive demo\b/gi, 'real-time demo');
    out = out.replace(/\blive stream\b/gi, 'real-time stream');
    out = out.replace(/\blive broadcast\b/gi, 'real-time broadcast');
    out = out.replace(/\blive on stage\b/gi, 'in real time on stage');
    out = out.replace(/\bloves live\b/gi, 'loves live music');

    // Remaining laɪv "live" followed by a noun/context word — use the phonetic
    // fallback only for phrases we have not paraphrased above.
    out = out.replace(
      /\blive\b(?=\s+(?:across|from|show|event|performance|album|at\s+\d|room))/gi,
      'lyve'
    );

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
    out = out.replace(
      /\b(?:you|they|we|people|i|he|she|my\s+friend|friends|family)\s+live\b/gi,
      (m) => m.replace(/\blive\b/i, 'lihv')
    );

    // ---- live (laɪv) at END OF SENTENCE: "devices link live." / "it's all live."
    // In this app's copy, sentence-final "live" is almost always the real-time
    // meaning; the verb-form cases above have already been converted to lihv.
    out = out.replace(/\blive\b(?=[.!?]|$)/gi, 'lyve');

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
