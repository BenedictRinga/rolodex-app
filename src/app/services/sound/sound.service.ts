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

  /** 2026-08-29 BUILD 144 (founder): the Loops conversation gets its own voice.
   *  Chime #1 — a soft falling pluck the instant the LOOP tap lands: captured,
   *  held, safe. Deliberately unlike the Assistant's rising send tick. */
  async playLoopCapture(volume: number = 0.09): Promise<void> {
    await this.playTone(300, 180, 0.14, volume);
  }

  /** 2026-08-29 BUILD 144 (founder): Chime #2 — the app's ANSWER. A warm
   *  two-note resolve (C5 → G5) the moment the context packet + draft appear:
   *  a different character from the capture pluck, so the conversation has a
   *  call and a response you can hear. */
  async playLoopReady(volume: number = 0.09): Promise<void> {
    await this.playArpeggio([523.25, 783.99], 0.32, volume, 0.11);
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

  // ===== 2026-09-29 BUILD 345: THE SIGN-OFF PAD =====
  // The visitor's own time (founder: after the narrated rotation has played
  // at most two passes, inject ambient music at the end of which the app
  // says 'signing off for now' - says, not exits; just waits till the user
  // comes back at their own time). A synthesized pad: four detuned voices
  // on an open fifth (A2 / E3 / A3 / the shimmer twin), a breathing
  // lowpass, a slow inhale and a long exhale - no asset, works offline, cancelable mid-breath by any action.
  private padNodes: { oscs: OscillatorNode[]; master: GainNode } | null = null;
  private padCancelled = false;

  async playAmbientPad(seconds: number = 24): Promise<'played' | 'cancelled'> {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.stopAmbient(); // never two pads at once
      this.padCancelled = false;
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(0.04, now + 2.5);        // the slow inhale
      master.gain.setValueAtTime(0.04, now + Math.max(2.5, seconds - 4));
      master.gain.linearRampToValueAtTime(0.0001, now + seconds);  // the long exhale
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.6;
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.linearRampToValueAtTime(560, now + seconds * 0.5); // breathe open
      filter.frequency.linearRampToValueAtTime(320, now + seconds);       // and close
      const voices: Array<[number, OscillatorType, number]> = [
        [110.0, 'sine', 1.0],      // A2 - the floor
        [164.81, 'triangle', 0.5], // E3 - the fifth, quieter
        [220.0, 'sine', 0.35],     // A3 - the octave ghost
        [110.7, 'sine', 0.4],      // the detune twin - the shimmer
      ];
      const oscs: OscillatorNode[] = [];
      for (const [freq, type, v] of voices) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = v;
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + seconds + 0.2);
        oscs.push(osc);
      }
      filter.connect(master);
      master.connect(ctx.destination);
      this.padNodes = { oscs, master };
      return await new Promise<'played' | 'cancelled'>((resolve) => {
        oscs[oscs.length - 1].onended = () => {
          this.padNodes = null;
          resolve(this.padCancelled ? 'cancelled' : 'played');
        };
      });
    } catch {
      this.padNodes = null;
      return 'cancelled';
    }
  }

  /** The ritual's door shuts: any action stops the pad mid-breath - a quick,
   *  polite dip, never a click. */
  stopAmbient(): void {
    if (!this.padNodes) return;
    this.padCancelled = true;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const master = this.padNodes.master;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value || 0.0001, 0.0001), now);
      master.gain.linearRampToValueAtTime(0.0001, now + 0.4);
      for (const o of this.padNodes.oscs) {
        try { o.stop(now + 0.45); } catch { /* already stopped */ }
      }
    } catch { /* already gone */ }
    this.padNodes = null;
  }
}
