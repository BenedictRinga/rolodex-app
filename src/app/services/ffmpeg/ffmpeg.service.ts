import { Injectable } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';

/**
 * 2026-08-22 FFMPEG.WASM PORT (Zyppar pattern) — client-side video/audio
 * processing for LoopKeeper. The browser downloads the wasm core once from
 * /loopkeeper/assets/ffmpeg/ and runs conversions on-device; no server CPU.
 *
 * Uses @ffmpeg/core (single-threaded) instead of @ffmpeg/core-mt because the
 * PWA is served without COOP/COEP headers, so SharedArrayBuffer is not
 * guaranteed. The API is identical to Zyppar's voice-cloning-wizard usage.
 */
@Injectable({
  providedIn: 'root',
})
export class FfmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loadPromise: Promise<FFmpeg> | null = null;

  get isLoaded(): boolean {
    return !!this.ffmpeg;
  }

  /** Load FFmpeg once and reuse the instance. */
  load(): Promise<FFmpeg> {
    if (this.ffmpeg) return Promise.resolve(this.ffmpeg);
    if (!this.loadPromise) {
      this.loadPromise = this.doLoad();
    }
    return this.loadPromise;
  }

  private async doLoad(): Promise<FFmpeg> {
    // Relative to the document base (/loopkeeper/), same as Zyppar's
    // '/assets/ffmpeg' but base-href aware.
    const basePath = 'assets/ffmpeg';
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      if (!window.console || !window.console.log) return;
      window.console.log('[FFmpeg]', message);
    });

    await ffmpeg.load({
      coreURL: `${basePath}/ffmpeg-core.js`,
      wasmURL: `${basePath}/ffmpeg-core.wasm`,
    });

    this.ffmpeg = ffmpeg;
    return ffmpeg;
  }

  /** Convert a recorded WebM/VP8 clip to an MP4 (H.264 + AAC) blob. */
  async convertToMp4(input: Blob): Promise<Blob> {
    const ffmpeg = await this.load();
    const inputName = 'input.webm';
    const outputName = 'output.mp4';

    await ffmpeg.writeFile(inputName, new Uint8Array(await input.arrayBuffer()));
    await ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName,
    ]);

    const outputData = (await ffmpeg.readFile(outputName)) as Uint8Array;
    const safeOutput = new Uint8Array(outputData);
    const blob = new Blob([safeOutput], { type: 'video/mp4' });

    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    return blob;
  }

  /** Convert an audio/webm blob to MP3 (same as Zyppar's voice-cloning wizard). */
  async convertToMp3(input: Blob): Promise<Blob> {
    const ffmpeg = await this.load();
    const inputName = 'input.webm';
    const outputName = 'output.mp3';

    await ffmpeg.writeFile(inputName, new Uint8Array(await input.arrayBuffer()));
    await ffmpeg.exec(['-i', inputName, '-c:a', 'libmp3lame', '-b:a', '192k', outputName]);

    const outputData = (await ffmpeg.readFile(outputName)) as Uint8Array;
    const safeOutput = new Uint8Array(outputData);
    const blob = new Blob([safeOutput], { type: 'audio/mpeg' });

    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    return blob;
  }
}
