import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StudioPlaybackService } from '../studio-playback/studio-playback.service';

/**
 * Studio audio orchestrator — ported from Zyppar's StudioAudioBridgeService.
 * Plays Assistant drafts / card notes through StudioPlaybackService.
 * Device-first; optional MP3 from rolodex-server POST /tts. Never talks to
 * Zyppar's library API or the zyppar database.
 */

export interface PlayProductionResult {
  usedRealAudio: boolean;
  audioUrl?: string;
  provider?: 'qwen' | 'google' | 'capacitor' | 'web-speech';
}

@Injectable({ providedIn: 'root' })
export class StudioAudioBridgeService {

  /** cacheKey → object URL of a previously synthesized blob */
  private demoCache = new Map<string, { id: string; audioUrl?: string }>();

  async playDemo(
    text: string,
    title: string,
    studioId: string,
    ringaID: string,
    studioPlayback: StudioPlaybackService,
    options: {
      jwtToken?: string;
      audioUrl?: string;
      loggedIn?: boolean;
      onProgress?: (attempt: number, maxAttempts: number, delaySec: number) => void;
      isTemplate?: boolean;
    } = {},
  ): Promise<PlayProductionResult> {
    if (!text?.trim()) return { usedRealAudio: false };

    if (options.isTemplate) {
      await studioPlayback.speakDeviceFirst(text);
      return { usedRealAudio: false, provider: 'web-speech' };
    }

    if (options.audioUrl) {
      try {
        await studioPlayback.playAuthenticatedMedia(options.audioUrl, !!options.loggedIn);
        return { usedRealAudio: true, audioUrl: options.audioUrl, provider: 'qwen' };
      } catch (e) {
        !environment.production && console.warn('[StudioBridge] audioUrl play failed, TTS fallback:', e);
        await studioPlayback.speakFallback(text, ringaID);
        return { usedRealAudio: false };
      }
    }

    try {
      const demo = await this.ensureDemoAudio(text, title, studioId, ringaID);
      if (demo.audioUrl) {
        await studioPlayback.playUrl(demo.audioUrl);
        return { usedRealAudio: true, audioUrl: demo.audioUrl, provider: 'qwen' };
      }
    } catch (e) {
      !environment.production && console.warn('[StudioBridge] playDemo MP3 path failed, TTS fallback:', e);
    }

    const ok = ringaID
      ? await studioPlayback.speakFallback(text, ringaID)
      : await studioPlayback.speakDeviceFirst(text);
    return { usedRealAudio: false, provider: ok ? 'web-speech' : undefined };
  }

  async playProduction(
    audioTextId: string,
    content: string,
    ringaID: string,
    studioPlayback: StudioPlaybackService,
    options: { loggedIn?: boolean; audioUrl?: string } = {},
  ): Promise<PlayProductionResult> {
    if (options.audioUrl) {
      try {
        await studioPlayback.playAuthenticatedMedia(options.audioUrl, !!options.loggedIn);
        return { usedRealAudio: true, audioUrl: options.audioUrl, provider: 'qwen' };
      } catch { /* fall through */ }
    }
    if (content?.trim()) {
      await studioPlayback.speakFallback(content, ringaID || audioTextId);
    }
    return { usedRealAudio: false };
  }

  async resolveAudioUrl(_audioTextId: string, content: string, _loggedIn: boolean): Promise<string | undefined> {
    const r = await fetch(`${environment.rolodexApiBase}/tts/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(content || '').slice(0, 4000) }),
    });
    if (!r.ok) return undefined;
    const blob = await r.blob();
    return URL.createObjectURL(blob);
  }

  stopSpeech(): void { /* pages call studioPlayback.stop() directly */ }

  clearCache(): void {
    for (const v of this.demoCache.values()) {
      if (v.audioUrl?.startsWith('blob:')) URL.revokeObjectURL(v.audioUrl);
    }
    this.demoCache.clear();
  }

  private async ensureDemoAudio(
    text: string,
    _title: string,
    studioId: string,
    ringaID: string,
  ): Promise<{ id: string; audioUrl?: string }> {
    const cacheKey = `${studioId}:${text.length}:${text.slice(0, 80)}`;
    const cached = this.demoCache.get(cacheKey);
    if (cached) return cached;

    const r = await fetch(`${environment.rolodexApiBase}/tts/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: String(text).slice(0, 4000),
        voice: 'qwen-echo',
        ringaID: ringaID || '',
        studioId,
      }),
    });
    if (!r.ok) throw new Error('TTS ' + r.status);
    const blob = await r.blob();
    const audioUrl = URL.createObjectURL(blob);
    const demoData = { id: cacheKey, audioUrl };
    this.demoCache.set(cacheKey, demoData);
    return demoData;
  }
}

export { StudioAudioBridgeService as StudioBridgeService };
