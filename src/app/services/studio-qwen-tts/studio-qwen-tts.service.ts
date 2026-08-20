import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Minimal Qwen-shaped client so StudioPlayback can call the same methods as Zyppar. */
export interface StudioTtsResult {
  audio: ArrayBuffer;
  provider: string;
}

export interface StudioPersonalityVoice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  description?: string;
  archetype?: string;
  defaultEmotion?: string;
  speedHint?: { min: number; max: number; default: number };
  provider?: string;
}

@Injectable({ providedIn: 'root' })
export class StudioQwenTtsService {
  /** POST /tts/stream — same Qwen MP3 path as Zyppar's /library/tts/stream. */
  async synthesizeStreaming(opts: {
    text: string;
    ringaID: string;
    voice?: string;
    provider?: string;
  }): Promise<StudioTtsResult> {
    const r = await fetch(`${environment.rolodexApiBase}/tts/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: String(opts.text || '').slice(0, 4000),
        voice: opts.voice || 'qwen-echo',
        ringaID: opts.ringaID || '',
      }),
    });
    if (!r.ok) throw new Error('Rolodex TTS ' + r.status);
    return { audio: await r.arrayBuffer(), provider: r.headers.get('X-TTS-Provider') || 'qwen' };
  }

  /** GET /tts/voices — backend personality catalog, with local fallback. */
  async listVoices(): Promise<StudioPersonalityVoice[]> {
    try {
      const r = await fetch(`${environment.rolodexApiBase}/tts/voices`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('voices ' + r.status);
      const data = await r.json();
      const providers = Array.isArray(data?.providers) ? data.providers : [];
      const all = providers.flatMap((p: any) =>
        (Array.isArray(p?.voices) ? p.voices : []).map((v: any) => ({ ...v, provider: p.provider }))
      );
      if (all.length) return all as StudioPersonalityVoice[];
    } catch { /* fall through to local */ }
    return this.getLocalPersonalityCatalog();
  }

  /** GET /tts/health — configured + reachable, with local fallback. */
  async healthCheck(): Promise<{ qwen: boolean; google: boolean; configured?: boolean; detail?: string }> {
    try {
      const r = await fetch(`${environment.rolodexApiBase}/tts/health`, { headers: { Accept: 'application/json' } });
      if (!r.ok) return { qwen: false, google: false, configured: false, detail: 'HTTP ' + r.status };
      const data = await r.json();
      return data?.health || { qwen: false, google: false };
    } catch (e: any) {
      return { qwen: false, google: false, configured: false, detail: e?.message || 'unreachable' };
    }
  }

  /** Persona catalog — Confidante first, then a male fallback for resolveDeviceVoice. */
  getLocalPersonalityCatalog(): StudioPersonalityVoice[] {
    return [
      {
        id: 'qwen-echo',
        name: 'Confidante',
        language: 'en-US',
        gender: 'female',
        description: 'The Confidante default — warm, clear, personal.',
        archetype: 'Universal',
        defaultEmotion: 'neutral',
        speedHint: { min: 0.9, max: 1.15, default: 1.0 },
      },
      {
        id: 'qwen-atlas',
        name: 'Atlas',
        language: 'en-US',
        gender: 'male',
        description: 'Warm authority — for business and news.',
        archetype: 'Anchor',
        defaultEmotion: 'neutral',
        speedHint: { min: 0.9, max: 1.2, default: 1.0 },
      },
    ];
  }
}
