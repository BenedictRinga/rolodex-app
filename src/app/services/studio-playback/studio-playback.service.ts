import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { environment } from '../../../environments/environment';
import { VoiceOptionsService } from '../voice-options/voice-options.service';
import { StudioQwenTtsService } from '../studio-qwen-tts/studio-qwen-tts.service';

/**
 * Isolated audio playback — ported from Zyppar's StudioPlaybackService.
 * Device-first (Capacitor → web speech), optional remote Qwen via rolodex-server.
 * Never touches Zyppar's AudiobriefService or the zyppar database.
 */
@Injectable({ providedIn: 'root' })
export class StudioPlaybackService {

  private studioAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private unlockOverlay: HTMLElement | null = null;

  private _onEndedCallback: (() => void) | null = null;
  private _shouldStop: (() => boolean) | null = null;
  private readonly startedListeners = new Set<() => void>();
  private readonly endedListeners = new Set<() => void>();
  private readonly loadFailedListeners = new Set<() => void>();
  private _isLoading = false;
  private _isPlaying = false;
  private _isSpeaking = false;
  public lastDeliveredMs = 0;
  private _speechStartedAt = 0;
  private _speechPaused = false;
  private _progress = 0;
  private _startedSignaled = false;
  private lastUrl: string | null = null;
  private lastFallbackText: string | null = null;
  private voicesWarmed = false;

  private speechLang = 'en-US';
  private speechRate = 1.0;
  private speechPitch = 1.05;
  private speechVoiceName: string | null = null;
  private speakChunkIdx = 0;
  private speakChunks: string[] = [];
  private speakVoice: SpeechSynthesisVoice | undefined;
  private activeSpeakLang = this.speechLang;

  constructor(
    private readonly voiceOptions: VoiceOptionsService,
    private readonly qwenTts: StudioQwenTtsService,
  ) {
    this.warmVoices();
    this.loadSpeechSettings();
  }

  onEnded(cb: () => void): void { this._onEndedCallback = cb; }
  setCancelPredicate(p: (() => boolean) | null): void { this._shouldStop = p; }
  onStarted(cb: () => void): () => void {
    this.startedListeners.add(cb);
    return () => this.startedListeners.delete(cb);
  }
  addEndedListener(cb: () => void): () => void {
    this.endedListeners.add(cb);
    return () => this.endedListeners.delete(cb);
  }
  onLoadFailed(cb: () => void): () => void {
    this.loadFailedListeners.add(cb);
    return () => this.loadFailedListeners.delete(cb);
  }

  beginLoading(): void { this._isLoading = true; this._startedSignaled = false; }
  endLoadingFailed(): void {
    this._isLoading = false;
    this.loadFailedListeners.forEach((cb) => cb());
  }

  get isLoading(): boolean { return this._isLoading; }
  get isPlaying(): boolean { return this._isPlaying; }
  get isSpeaking(): boolean { return this._isSpeaking; }
  get isActive(): boolean { return this._isPlaying || this._isSpeaking; }
  get isPaused(): boolean {
    if (this.studioAudio && !this.studioAudio.ended && this.studioAudio.paused && this._startedSignaled) return true;
    if (this._isSpeaking && this._speechPaused) return true;
    return false;
  }
  get progress(): number { return this._progress; }
  get hasPausedAudio(): boolean {
    return !!this.studioAudio?.paused && !this.studioAudio.ended && this._startedSignaled;
  }

  async primeGesturePermission(): Promise<void> {
    const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    const prime = new Audio(SILENT_WAV);
    prime.volume = 0;
    prime.muted = true;
    try { await prime.play(); } catch { /* gesture attempt */ }
    prime.pause();
    prime.src = '';
    prime.load();
    // 2026-08-21 iOS PWA: speechSynthesis also needs a gesture-time warm-up or
    // the later chunked speak() can be silently dropped. Speak+cancel an empty
    // utterance inside the same gesture stack.
    if ('speechSynthesis' in window) {
      try {
        const warm = new SpeechSynthesisUtterance(' ');
        warm.volume = 0;
        warm.rate = 1;
        window.speechSynthesis.speak(warm);
        window.speechSynthesis.cancel();
      } catch { /* ignore */ }
    }
  }

  async playUrl(url: string, _loggedIn = true): Promise<void> {
    this.lastUrl = url;
    if (url.startsWith('/media/') || url.includes('/library/media/') || url.startsWith('http')) {
      await this.playAuthenticatedMedia(url);
      return;
    }
    await this.playWebElement(this.resolveMediaUrl(url));
  }

  async playAuthenticatedMedia(audioUrl: string, _loggedIn = true): Promise<void> {
    const resolved = this.resolveMediaUrl(audioUrl);
    const r = await fetch(resolved);
    if (!r.ok) throw new Error('media ' + r.status);
    await this.playBlob(await r.blob());
  }

  async playBlob(blob: Blob): Promise<void> {
    await this.playWebElement(URL.createObjectURL(blob));
  }

  resolveDeviceVoice(
    personaVoiceId?: string,
    lang?: string,
    explicitVoiceName?: string,
  ): { voiceName?: string; lang: string; rate: number; pitch: number } {
    const persona = (this.qwenTts.getLocalPersonalityCatalog() || [])
      .find((v) => v.id === personaVoiceId);
    const gender = persona?.gender === 'male' || persona?.gender === 'female' ? persona.gender : undefined;
    const rate = typeof persona?.speedHint?.default === 'number' ? persona.speedHint.default : this.speechRate;
    const pitch = gender === 'female' ? 1.08 : gender === 'male' ? 0.95 : this.speechPitch;
    const wantLang = (lang || persona?.language || this.speechLang) || 'en-US';
    const chosen = this.voiceOptions.resolveVoice();
    if (explicitVoiceName) return { voiceName: explicitVoiceName, lang: wantLang, rate, pitch };
    if (chosen?.name) return { voiceName: chosen.name, lang: chosen.lang || wantLang, rate, pitch };
    const voices = 'speechSynthesis' in window ? (window.speechSynthesis.getVoices() || []) : [];
    if (!voices.length) return { lang: wantLang, rate, pitch };
    const lp = wantLang.split('-')[0].toLowerCase();
    const pool = voices.filter((v) => String(v.lang || '').toLowerCase().startsWith(lp));
    const candidates = pool.length ? pool : voices;
    const MALE = ['daniel', 'david', 'george', 'james', 'alex', 'fred', 'ryan', 'oliver', 'tom'];
    const FEMALE = ['alice', 'karen', 'samantha', 'zira', 'salli', 'amy', 'emma', 'aria', 'joanna', 'google'];
    const isM = (v: SpeechSynthesisVoice) => MALE.some((n) => v.name.toLowerCase().includes(n));
    const isF = (v: SpeechSynthesisVoice) => FEMALE.some((n) => v.name.toLowerCase().includes(n));
    let best: SpeechSynthesisVoice | undefined;
    if (gender === 'male') best = candidates.find(isM) || candidates.find((v) => !isF(v)) || candidates[0];
    else if (gender === 'female') best = candidates.find(isF) || candidates[0];
    else best = candidates.find((v) => v.localService) || candidates[0];
    return { voiceName: best?.name, lang: best?.lang || wantLang, rate, pitch };
  }

  async speakFallback(text: string, ringaID?: string, lang?: string, personaVoiceId?: string, explicitVoiceName?: string): Promise<boolean> {
    const dv = this.resolveDeviceVoice(personaVoiceId, lang, explicitVoiceName);
    this.activeSpeakLang = dv.lang;
    this.speechRate = dv.rate;
    this.speechPitch = dv.pitch;
    if (dv.voiceName) this.speechVoiceName = dv.voiceName;
    text = stripHtml(text);
    if (!text?.trim()) return false;
    this.lastFallbackText = text;
    this.stopMp3();
    this._speechPaused = false;
    this.lastDeliveredMs = 0;
    this._speechStartedAt = 0;

    if (ringaID) {
      try {
        this._isSpeaking = true;
        this.signalStarted();
        const QWEN_SYNTH_WAIT_MS = 15000;
        const result = await Promise.race([
          this.qwenTts.synthesizeStreaming({ text, ringaID, voice: 'qwen-echo', provider: 'qwen' }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Qwen synthesis queued')), QWEN_SYNTH_WAIT_MS)),
        ]);
        const blob = new Blob([result.audio], { type: 'audio/mpeg' });
        await this.playWebElement(URL.createObjectURL(blob));
        this._isSpeaking = false;
        return true;
      } catch (qwenError: any) {
        !environment.production && console.warn('[StudioPlayback] Qwen fallback failed:', qwenError);
        this._isSpeaking = false;
      }
    }
    return this.speakDeviceTiers(text, this.activeSpeakLang);
  }

  async speakDeviceFirst(text: string, lang?: string, personaVoiceId?: string, explicitVoiceName?: string): Promise<boolean> {
    const dv = this.resolveDeviceVoice(personaVoiceId, lang, explicitVoiceName);
    this.activeSpeakLang = dv.lang;
    this.speechRate = dv.rate;
    this.speechPitch = dv.pitch;
    if (dv.voiceName) this.speechVoiceName = dv.voiceName;
    text = stripHtml(text);
    if (!text?.trim()) return false;
    this.lastFallbackText = text;
    this.stopMp3();
    this._speechPaused = false;
    this.lastDeliveredMs = 0;
    this._speechStartedAt = 0;
    return this.speakDeviceTiers(text, dv.lang);
  }

  private async speakDeviceTiers(text: string, lang: string): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        this._isSpeaking = true;
        const speakTask = TextToSpeech.speak({
          text, rate: this.speechRate, pitch: this.speechPitch, volume: 1.0, lang: lang || this.speechLang,
        });
        this.signalStarted();
        await speakTask;
        this._isSpeaking = false;
        this.signalEnded();
        return true;
      } catch (e) {
        !environment.production && console.warn('[StudioPlayback] Capacitor TTS failed:', e);
        this._isSpeaking = false;
        this.endLoadingFailed();
        return this.speakWebSync(text, lang || this.speechLang);
      }
    }
    return this.speakWebSync(text, lang || this.speechLang);
  }

  pause(): void {
    if (this.studioAudio) this.studioAudio.pause();
    if (this._isSpeaking && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      this._speechPaused = true;
    }
    this._isPlaying = false;
  }

  async resume(): Promise<void> {
    if (this.studioAudio?.paused && !this.studioAudio.ended) {
      try {
        await this.studioAudio.play();
        this._isPlaying = true;
      } catch (e) {
        !environment.production && console.warn('[StudioPlayback] resume failed:', e);
      }
      return;
    }
    if (this._isSpeaking && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      this._speechPaused = false;
      if (!window.speechSynthesis.speaking) this.speakNextChunk();
    }
  }

  stop(): void {
    this.stopMp3();
    this.stopSpeech();
    this._isPlaying = false;
    this._isLoading = false;
    this._progress = 0;
    this._onEndedCallback = null;
    this.releaseWakeLock();
    this.removeUnlockOverlay();
  }

  destroy(): void { this.stop(); }

  stopSpeech(): void {
    this._isSpeaking = false;
    this._speechPaused = false;
    this.speakChunks = [];
    this.speakChunkIdx = 0;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (Capacitor.isNativePlatform()) void TextToSpeech.stop().catch(() => undefined);
  }

  forward(seconds = 10): void {
    if (this.studioAudio) {
      this.studioAudio.currentTime = Math.min(this.studioAudio.duration || 0, this.studioAudio.currentTime + seconds);
    }
  }

  rewind(seconds = 10): void {
    if (this.studioAudio) {
      this.studioAudio.currentTime = Math.max(0, this.studioAudio.currentTime - seconds);
    }
  }

  async toggle(playFn?: () => Promise<void>): Promise<void> {
    if (this.isActive) this.pause();
    else if (this.studioAudio?.paused && this.studioAudio.currentTime > 0) await this.resume();
    else if (playFn) await playFn();
    else if (this.lastUrl) {
      if (this.lastUrl.startsWith('blob:')) await this.playWebElement(this.lastUrl);
      else await this.playUrl(this.lastUrl);
    } else if (this.lastFallbackText) {
      await this.speakFallback(this.lastFallbackText);
    }
  }

  private resolveMediaUrl(url: string): string {
    if (!url) return url;
    if (/^(https?:)?\/\//.test(url) || url.startsWith('blob:') || url.startsWith('data:')) return url;
    const origin = environment.rolodexApiBase.replace(/\/api\/rolodex$/, '');
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private async playWebElement(url: string): Promise<void> {
    if (this.studioAudio) {
      this.studioAudio.pause();
      this.studioAudio.currentTime = 0;
      this.studioAudio.src = '';
      this.studioAudio = null;
    }
    if (this.currentBlobUrl && this.currentBlobUrl !== url) URL.revokeObjectURL(this.currentBlobUrl);
    this.currentBlobUrl = url;
    this.lastUrl = url;
    if (!this._isLoading) this.beginLoading();

    const audio = new Audio(url);
    audio.volume = 1;
    audio.muted = false;
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
    (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    this.studioAudio = audio;

    audio.onplaying = () => {
      this._isPlaying = true;
      if (isFinite(audio.duration) && audio.duration > 0) this.lastDeliveredMs = audio.duration * 1000;
      this.signalStarted();
    };
    audio.ontimeupdate = () => {
      if (audio.duration > 0) this._progress = (audio.currentTime / audio.duration) * 100;
    };
    audio.onended = () => {
      this._isPlaying = false;
      this._progress = 100;
      this.releaseWakeLock();
      this.studioAudio = null;
      this.signalEnded();
    };
    audio.onerror = () => {
      !environment.production && console.warn('[StudioPlayback] audio error for', url);
      this.stopMp3();
      this.endLoadingFailed();
    };

    try {
      if (this._shouldStop?.()) { this._isLoading = false; return; }
      await audio.play();
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (!audio.paused && !audio.ended) {
            this._isPlaying = true;
            if (isFinite(audio.duration) && audio.duration > 0) this.lastDeliveredMs = audio.duration * 1000;
            this.signalStarted();
            resolve();
          } else reject(new Error('Studio playback failed to start (element paused)'));
        }, 400);
      });
      const stopPoll = setInterval(() => {
        if (this._shouldStop?.()) {
          clearInterval(stopPoll);
          try { audio.pause(); } catch { /* ignore */ }
          this._isPlaying = false;
          this._isLoading = false;
          this.studioAudio = null;
        }
      }, 500);
      await this.attemptWakeLock();
    } catch (e) {
      const err = e as { name?: string; message?: string };
      if (err?.name === 'NotAllowedError') {
        this.showUnlockOverlay(() => { void this.playWebElement(url); });
      }
      !environment.production && console.warn('[StudioPlayback] playWebElement failed:', err?.name, err?.message);
      this._isPlaying = false;
      this.studioAudio = null;
      this.endLoadingFailed();
      throw e;
    }
  }

  private async speakWebSync(text: string, lang?: string): Promise<boolean> {
    if (!('speechSynthesis' in window)) { this.endLoadingFailed(); return false; }
    const effectiveLang = lang || this.speechLang;
    this.activeSpeakLang = effectiveLang;
    window.speechSynthesis.cancel();
    this._isSpeaking = false;
    this._speechPaused = false;
    this.speakChunks = [];
    this.speakChunkIdx = 0;
    this._startedSignaled = false;
    this.beginLoading();
    await new Promise((resolve) => setTimeout(resolve, 80));

    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      await new Promise<void>((resolve) => {
        window.speechSynthesis.addEventListener('voiceschanged', () => resolve(), { once: true });
        setTimeout(resolve, 500);
      });
      voices = window.speechSynthesis.getVoices();
    }
    let bestVoice: SpeechSynthesisVoice | undefined;
    if (this.speechVoiceName && voices.length > 0) bestVoice = voices.find((v) => v.name === this.speechVoiceName);
    if (!bestVoice) {
      const lp = effectiveLang.split('-')[0];
      bestVoice = voices.find((v) => v.lang.startsWith(lp) && v.localService)
        || voices.find((v) => v.lang.startsWith(lp))
        || this.voiceOptions.resolveVoice()
        || voices[0];
    }
    this.speakVoice = bestVoice;
    this.speakChunks = text.match(/[^.!?\n]+[.!?]+(\s|$)|[^.!?\n]+$/g) || [text];
    this.speakChunkIdx = 0;
    this._speechPaused = false;
    this.speakNextChunk();
    return true;
  }

  private speakNextChunk(): void {
    if (this._shouldStop?.()) { this.cancelChunkedSpeech(); return; }
    if (this.speakChunkIdx >= this.speakChunks.length) {
      this.lastDeliveredMs = this._speechStartedAt > 0 ? Date.now() - this._speechStartedAt : 0;
      this._speechStartedAt = 0;
      this._isSpeaking = false;
      this._speechPaused = false;
      this.signalEnded();
      return;
    }
    const chunk = this.speakChunks[this.speakChunkIdx].trim();
    if (!chunk) { this.speakChunkIdx++; this.speakNextChunk(); return; }
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.volume = 1.0;
    utterance.rate = this.speechRate;
    utterance.pitch = this.speechPitch;
    utterance.lang = this.activeSpeakLang || this.speechLang;
    if (this.speakVoice) utterance.voice = this.speakVoice;
    if (this.speakChunkIdx === 0) {
      utterance.onstart = () => {
        this._isSpeaking = true;
        this._speechPaused = false;
        if (this._speechStartedAt === 0) this._speechStartedAt = Date.now();
        this.signalStarted();
      };
    }
    utterance.onend = () => {
      if (this._shouldStop?.()) { this.cancelChunkedSpeech(); return; }
      if (!this._speechPaused) { this.speakChunkIdx++; this.speakNextChunk(); }
    };
    utterance.onerror = () => {
      if (this._shouldStop?.()) { this.cancelChunkedSpeech(); return; }
      if (!this._speechPaused) { this.speakChunkIdx++; this.speakNextChunk(); }
    };
    window.speechSynthesis.speak(utterance);
  }

  private cancelChunkedSpeech(): void {
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    this._isSpeaking = false;
    this._speechPaused = false;
    this.speakChunks = [];
    this.speakChunkIdx = 0;
    this._isLoading = false;
  }

  private signalStarted(): void {
    if (this._startedSignaled) return;
    this._startedSignaled = true;
    this._isLoading = false;
    this.startedListeners.forEach((cb) => cb());
  }

  private signalEnded(): void {
    if (this._onEndedCallback) {
      const cb = this._onEndedCallback;
      this._onEndedCallback = null;
      cb();
    }
    this.endedListeners.forEach((cb) => cb());
  }

  private warmVoices(): void {
    if (!('speechSynthesis' in window) || this.voicesWarmed) return;
    window.speechSynthesis.addEventListener('voiceschanged', () => { this.voicesWarmed = true; }, { once: true });
    window.speechSynthesis.getVoices();
  }

  private loadSpeechSettings(): void {
    const apply = () => {
      const v = this.voiceOptions.resolveVoice();
      this.speechLang = v?.lang || 'en-US';
      this.speechVoiceName = v && this.voiceOptions.selectedVoiceId !== this.voiceOptions.CONFIDANTE_ID ? v.name : (v?.name || null);
      this.speechPitch = this.voiceOptions.selectedVoiceId === this.voiceOptions.CONFIDANTE_ID ? 1.05 : 1.0;
    };
    apply();
    this.voiceOptions.voices$.subscribe(() => apply());
  }

  private showUnlockOverlay(retry: () => void): void {
    this.removeUnlockOverlay();
    const overlay = document.createElement('div');
    overlay.id = 'studio-audio-unlock-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(30,35,40,0.72);display:flex;align-items:center;justify-content:center;padding:24px;';
    overlay.innerHTML = `
      <div style="background:#1E2328;color:#fff;border-radius:16px;padding:24px;max-width:320px;text-align:center;font-family:system-ui,sans-serif;">
        <p style="margin:0 0 16px;font-size:15px;">Tap to hear the Confidante</p>
        <button type="button" class="studio-unlock-btn" style="min-width:44px;min-height:44px;padding:12px 24px;background:#FF6B35;color:#fff;border:none;border-radius:999px;font-size:15px;cursor:pointer;">Enable Audio</button>
      </div>`;
    const btn = overlay.querySelector('.studio-unlock-btn') as HTMLButtonElement;
    const unlock = () => { this.removeUnlockOverlay(); retry(); };
    btn?.addEventListener('click', unlock);
    btn?.addEventListener('touchstart', (e) => { e.preventDefault(); unlock(); }, { passive: false });
    document.body.appendChild(overlay);
    this.unlockOverlay = overlay;
  }

  private removeUnlockOverlay(): void {
    if (this.unlockOverlay) {
      this.unlockOverlay.remove();
      this.unlockOverlay = null;
    }
  }

  private stopMp3(): void {
    if (this.studioAudio) {
      this.studioAudio.pause();
      this.studioAudio.currentTime = 0;
      this.studioAudio.src = '';
      this.studioAudio = null;
    }
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  private async attemptWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) return;
    try { this.wakeLock = await navigator.wakeLock.request('screen'); } catch { /* optional */ }
  }

  private releaseWakeLock(): void {
    if (this.wakeLock) {
      void this.wakeLock.release().catch(() => undefined);
      this.wakeLock = null;
    }
  }
}

function stripHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
