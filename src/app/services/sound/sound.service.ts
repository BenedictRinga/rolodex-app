import { Injectable } from '@angular/core';

/**
 * 2026-08-23 PORTED FROM ZYPPAR (src/app/services/sound/sound.service.ts):
 * the same proven WebAudio chime pattern — singleton AudioContext, resume on
 * iOS/mobile, bell-like filtered arpeggios. Browser-independent in the sense
 * that it is not tied to an <audio> element or HTMLAudioElement autoplay.
 * Extended with small send/receive ticks for the AI Assistant chat.
 */
@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  /** 2026-08-23: send tick — short rising blip. */
  async playChatSend(volume: number = 0.08): Promise<void> {
    await this.playTone(520, 760, 0.12, volume);
  }

  /** 2026-08-23: receive tick — slightly deeper, slightly longer. */
  async playChatReceive(volume: number = 0.07): Promise<void> {
    await this.playTone(420, 620, 0.16, volume);
  }

  /** Play a celebratory ascending chime (for milestones). */
  async playMilestoneChime(volume: number = 0.6): Promise<void> {
    await this.playArpeggio(
      [523.25, 659.25, 783.99, 1046.50], // C5 → E5 → G5 → C6
      0.85,
      volume,
      0.09
    );
  }

  /** Play a bright, crisp completion chime. */
  async playCompletionChime(volume: number = 0.7): Promise<void> {
    await this.playArpeggio(
      [659.25, 830.61, 987.77], // E5 → G#5 → B5
      0.55,
      volume,
      0.06
    );
  }

  /** Generic method matching Zyppar's original `type` logic. */
  async play(type: 'milestone' | 'completion', volume: number = 0.65): Promise<void> {
    if (type === 'milestone') {
      await this.playMilestoneChime(volume);
    } else {
      await this.playCompletionChime(volume);
    }
  }

  /** Single filtered sine blip with a rising/falling frequency sweep. */
  private async playTone(
    fromFreq: number,
    toFreq: number,
    duration: number,
    volume: number
  ): Promise<void> {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(fromFreq, now);
      osc.frequency.exponentialRampToValueAtTime(toFreq, now + duration * 0.6);
      filter.type = 'lowpass';
      filter.frequency.value = 2200;
      gain.gain.value = 0.001;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch { /* sound is optional */ }
  }

  private async playArpeggio(
    frequencies: number[],
    totalDuration: number,
    volume: number,
    noteSpacing: number
  ): Promise<void> {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const now = ctx.currentTime;
      frequencies.forEach((freq, index) => {
        const startTime = now + index * noteSpacing;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2200;
        const gain = ctx.createGain();
        const peakVolume = volume / (index + 1.2);
        gain.gain.value = 0.001;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(peakVolume, startTime + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + totalDuration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + totalDuration + 0.1);
      });
    } catch { /* sound is optional */ }
  }
}
