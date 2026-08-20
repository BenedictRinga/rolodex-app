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
  speedHint?: { min: number; max: number; default: number };
}

@Injectable({ providedIn: 'root' })
export class StudioQwenTtsService {
  async synthesizeStreaming(opts: {
    text: string;
    ringaID: string;
    voice?: string;
    provider?: string;
  }): Promise<StudioTtsResult> {
    const r = await fetch(`${environment.rolodexApiBase}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: String(opts.text || '').slice(0, 4000),
        voice: opts.voice || 'qwen-echo',
        ringaID: opts.ringaID || '',
      }),
    });
    if (!r.ok) throw new Error('Rolodex TTS ' + r.status);
    return { audio: await r.arrayBuffer(), provider: 'qwen' };
  }

  /** Persona catalog — Confidante first, then a male fallback for resolveDeviceVoice. */
  getLocalPersonalityCatalog(): StudioPersonalityVoice[] {
    return [
      {
        id: 'qwen-echo',
        name: 'Confidante',
        language: 'en-US',
        gender: 'female',
        speedHint: { min: 0.9, max: 1.15, default: 1.0 },
      },
      {
        id: 'qwen-atlas',
        name: 'Atlas',
        language: 'en-US',
        gender: 'male',
        speedHint: { min: 0.9, max: 1.2, default: 1.0 },
      },
    ];
  }
}
