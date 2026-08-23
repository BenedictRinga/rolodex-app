import { Component, Input, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SocketChatService } from '../../services/socket-chat/socket-chat.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { FfmpegService } from '../../services/ffmpeg/ffmpeg.service';

/**
 * 2026-08-19 WEBRTC VIDEO CALL + VIDEO CLIP MESSAGING.
 * Peers in the same demo room exchange offer/answer/ICE through the socket
 * relay; media never touches the server. The same modal can record a short
 * video clip and send it to the room as a reminder/greeting.
 *
 * 2026-08-22 (build 56) LoopKeeper hardening:
 * - Modal is branded LoopKeeper.
 * - Polite-peer join handshake: the caller with the lower callerId sends the
 *   offer, so two devices opening the modal at the same time no longer create
 *   competing offers (glare).
 * - Full ICE candidate objects are relayed (sdpMid/sdpMLineIndex included),
 *   not just the candidate string.
 * - Clear device-permission error messages instead of one generic toast.
 */
@Component({
  selector: 'app-video-call-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title style="font-size: 15px;">
          <img src="assets/loopkeeper/icon.svg" alt="LoopKeeper" class="vc-logo" />
          LoopKeeper Video — {{ contactName }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="end()"><ion-icon name="close-outline"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="vc-stage">
        <video #remoteVideo autoplay playsinline class="vc-remote" [class.hidden]="!remoteActive"></video>
        <div *ngIf="!remoteActive" class="vc-waiting">Waiting for the other side on LoopKeeper…</div>
        <video #localVideo autoplay playsinline muted class="vc-local"></video>
      </div>

      <div class="vc-clip" *ngIf="clipUrl">
        <video [src]="clipUrl" controls class="vc-clip-preview"></video>
        <ion-button expand="block" color="success" (click)="sendClip()" [disabled]="!clipUrl || converting">
          <ion-icon name="paper-plane-outline" slot="start"></ion-icon> {{ converting ? 'Converting on this device…' : 'Send clip to room' }}
        </ion-button>
      </div>

      <div class="vc-controls">
        <ion-button fill="outline" (click)="toggleMute()">
          <ion-icon [name]="muted ? 'mic-off-outline' : 'mic-outline'"></ion-icon>
        </ion-button>
        <ion-button fill="outline" (click)="toggleCamera()">
          <ion-icon [name]="cameraOff ? 'videocam-off-outline' : 'videocam-outline'"></ion-icon>
        </ion-button>
        <ion-button fill="outline" color="warning" (click)="toggleRecord()">
          <ion-icon [name]="recording ? 'stop-outline' : 'radio-button-on-outline'"></ion-icon>
        </ion-button>
        <ion-button fill="outline" color="danger" (click)="end()">
          <ion-icon name="call-outline"></ion-icon>
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `.vc-logo { width: 18px; height: 18px; vertical-align: -3px; margin-right: 6px; }`,
    `.vc-stage { position: relative; width: 100%; height: 55vh; background: #111; border-radius: 14px; overflow: hidden; }`,
    `.vc-remote { width: 100%; height: 100%; object-fit: cover; }`,
    `.vc-local { position: absolute; right: 10px; bottom: 10px; width: 96px; height: 130px; object-fit: cover; border-radius: 10px; border: 2px solid rgba(255,255,255,.6); background:#000; }`,
    `.vc-waiting { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; }`,
    `.vc-controls { display: flex; justify-content: center; gap: 10px; margin-top: 14px; }`,
    `.vc-clip { margin-top: 12px; }`,
    `.vc-clip-preview { width: 100%; border-radius: 10px; max-height: 220px; }`,
    `.hidden { display: none; }`,
  ],
})
export class VideoCallModalComponent implements OnInit, OnDestroy {
  @Input() contact: any = {};
  @Input() contactName = 'this contact';

  @ViewChild('remoteVideo', { static: false }) remoteVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('localVideo', { static: false }) localVideo?: ElementRef<HTMLVideoElement>;

  muted = false;
  cameraOff = false;
  recording = false;
  remoteActive = false;
  clipUrl = '';
  converting = false;

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private clipBlob: Blob | null = null;
  private clipChunks: Blob[] = [];

  private callerId = '';
  private peerCallerId = '';
  private makingOffer = false;
  private gotOffer = false;
  private gotAnswer = false;
  private announced = false;
  private ended = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly socketChat: SocketChatService,
    private readonly alertsService: AlertsService,
    private readonly ffmpegService: FfmpegService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.callerId = `lk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      void this.alertsService.showToast(this.permissionMessage(err), 3500);
      return;
    }

    this.bindLocalVideo();
    this.setupPeerConnection();

    this.socketChat.onWebRtcSignal((p) => void this.handleSignal(p));
    this.socketChat.onWebRtcJoin((p) => this.handleJoin(p));
    this.socketChat.onWebRtcLeave(() => this.handleLeave());
    this.socketChat.onVideoClip((p) => {
      void this.alertsService.showToast(`${p.name} sent you a video clip`, 3000);
      window.open(p.dataUrl, '_blank');
    });

    // Announce this caller; the lower callerId sends the offer (polite-peer).
    this.socketChat.emitWebRtcJoin(this.callerId);
  }

  ngOnDestroy(): void {
    this.ended = true;
    this.recorder?.stop();
    this.pc?.close();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.socketChat.emitWebRtcLeave(this.callerId);
  }

  private bindLocalVideo(): void {
    const el = this.localVideo?.nativeElement || document.querySelector<HTMLVideoElement>('.vc-local');
    if (el && this.localStream) el.srcObject = this.localStream;
  }

  private setupPeerConnection(): void {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.pc = pc;
    this.localStream?.getTracks().forEach((t) => pc.addTrack(t, this.localStream as MediaStream));

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      const c = e.candidate.toJSON
        ? e.candidate.toJSON()
        : {
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
            usernameFragment: e.candidate.usernameFragment,
          };
      this.socketChat.emitWebRtcSignal('candidate', undefined, JSON.stringify(c), this.callerId);
    };

    pc.ontrack = (e) => {
      const el = this.remoteVideo?.nativeElement || document.querySelector<HTMLVideoElement>('.vc-remote');
      if (el) {
        el.srcObject = e.streams[0];
        this.remoteActive = true;
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        if (!this.ended) void this.alertsService.showToast('Call connection lost', 2500);
      }
    };
  }

  private handleJoin(p: { name: string; callerId: string }): void {
    if (!p.callerId || p.callerId === this.callerId || this.ended) return;
    this.peerCallerId = p.callerId;

    // Re-announce once so a peer that joined after our first announcement
    // still learns our callerId and both sides can compare ids.
    if (!this.announced) {
      this.announced = true;
      this.socketChat.emitWebRtcJoin(this.callerId);
    }

    if (!this.makingOffer && !this.gotOffer && !this.gotAnswer && this.callerId < this.peerCallerId) {
      void this.createOffer();
    }
  }

  private async createOffer(): Promise<void> {
    const pc = this.pc;
    if (!pc || this.makingOffer || this.ended) return;
    this.makingOffer = true;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socketChat.emitWebRtcSignal('offer', offer.sdp || '', undefined, this.callerId);
    } catch {
      if (!this.ended) void this.alertsService.showToast('Could not start the call', 2500);
    } finally {
      this.makingOffer = false;
    }
  }

  private async handleSignal(p: { type: string; sdp: string; candidate: string; name: string; callerId: string }): Promise<void> {
    const pc = this.pc;
    if (!pc || !p.type || this.ended) return;
    if (p.callerId && p.callerId === this.callerId) return;
    if (p.callerId) this.peerCallerId = p.callerId;

    try {
      if (p.type === 'offer') {
        this.gotOffer = true;
        await pc.setRemoteDescription({ type: 'offer', sdp: p.sdp } as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socketChat.emitWebRtcSignal('answer', answer.sdp || '', undefined, this.callerId);
      } else if (p.type === 'answer') {
        this.gotAnswer = true;
        await pc.setRemoteDescription({ type: 'answer', sdp: p.sdp } as RTCSessionDescriptionInit);
      } else if (p.type === 'candidate' && p.candidate) {
        const candidate = this.parseCandidate(p.candidate);
        if (candidate) await pc.addIceCandidate(candidate);
      }
    } catch {
      /* signal best-effort */
    }
  }

  private parseCandidate(raw: string): RTCIceCandidateInit | null {
    try {
      const c = JSON.parse(raw);
      return {
        candidate: String(c.candidate || ''),
        sdpMid: typeof c.sdpMid === 'string' ? c.sdpMid : null,
        sdpMLineIndex: typeof c.sdpMLineIndex === 'number' ? c.sdpMLineIndex : 0,
        usernameFragment: typeof c.usernameFragment === 'string' ? c.usernameFragment : undefined,
      };
    } catch {
      return { candidate: raw, sdpMid: '0', sdpMLineIndex: 0 };
    }
  }

  private handleLeave(): void {
    this.remoteActive = false;
    if (!this.ended) {
      void this.alertsService.showToast('The other side left the call', 2500);
    }
  }

  private permissionMessage(err: unknown): string {
    const name = (err as any)?.name || '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Camera/mic blocked — allow access in your browser settings';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No camera or microphone found';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Camera/mic is in use by another app';
    }
    if (name === 'OverconstrainedError') {
      return 'No camera/mic matches the required settings';
    }
    return 'Camera/mic unavailable';
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !this.muted));
  }

  toggleCamera(): void {
    this.cameraOff = !this.cameraOff;
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = !this.cameraOff));
  }

  toggleRecord(): void {
    if (this.recording) { this.stopRecord(); return; }
    this.startRecord();
  }

  private startRecord(): void {
    if (!this.localStream || !('MediaRecorder' in window)) {
      void this.alertsService.showToast('Recording not supported here', 2500);
      return;
    }
    this.clipChunks = [];
    this.recorder = new MediaRecorder(this.localStream, { mimeType: 'video/webm' });
    this.recorder.ondataavailable = (e) => { if (e.data.size) this.clipChunks.push(e.data); };
    this.recorder.onstop = () => {
      this.clipBlob = new Blob(this.clipChunks, { type: 'video/webm' });
      this.clipUrl = URL.createObjectURL(this.clipBlob);
    };
    this.recorder.start();
    this.recording = true;
    void this.alertsService.showToast('Recording — tap stop to finish', 2000);
  }

  private stopRecord(): void {
    this.recorder?.stop();
    this.recording = false;
  }

  async sendClip(): Promise<void> {
    if (!this.clipBlob || !this.clipUrl || this.converting) return;

    // 2026-08-22 FFMPEG.WASM: convert the recorded WebM to MP4 on-device
    // before sending, so recipients get a broadly playable video file.
    if (this.clipBlob.type.includes('webm')) {
      this.converting = true;
      try {
        void this.alertsService.showToast('Converting to MP4 on this device…', 2500);
        const mp4 = await this.ffmpegService.convertToMp4(this.clipBlob);
        if (this.clipUrl) URL.revokeObjectURL(this.clipUrl);
        this.clipBlob = mp4;
        this.clipUrl = URL.createObjectURL(mp4);
      } catch {
        // Fall back to the original WebM if FFmpeg fails to load/convert.
        void this.alertsService.showToast('MP4 conversion unavailable — sending WebM', 2500);
      } finally {
        this.converting = false;
      }
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      this.socketChat.sendVideoClip(String(reader.result || ''));
      void this.alertsService.showToast('Video clip sent to the room', 2000);
    };
    reader.readAsDataURL(this.clipBlob);
  }

  end(): void {
    void this.modalController.dismiss();
  }
}
