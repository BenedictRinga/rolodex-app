import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SocketChatService } from '../../services/socket-chat/socket-chat.service';
import { AlertsService } from '../../services/alerts/alerts.service';

/**
 * 2026-08-19 WEBRTC VIDEO CALL + VIDEO CLIP MESSAGING.
 * Peers in the same demo room exchange offer/answer/ICE through the socket
 * relay; media never touches the server. The same modal can record a short
 * video clip and send it to the room as a reminder/greeting.
 */
@Component({
  selector: 'app-video-call-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title style="font-size: 15px;">Video — {{ contactName }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="end()"><ion-icon name="close-outline"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="vc-stage">
        <video #remoteVideo autoplay playsinline class="vc-remote" [class.hidden]="!remoteActive"></video>
        <div *ngIf="!remoteActive" class="vc-waiting">Waiting for the other side…</div>
        <video #localVideo autoplay playsinline muted class="vc-local"></video>
      </div>

      <div class="vc-clip" *ngIf="clipUrl">
        <video [src]="clipUrl" controls class="vc-clip-preview"></video>
        <ion-button expand="block" color="success" (click)="sendClip()" [disabled]="!clipUrl">
          <ion-icon name="paper-plane-outline" slot="start"></ion-icon> Send clip to room
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

  muted = false;
  cameraOff = false;
  recording = false;
  remoteActive = false;
  clipUrl = '';

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private clipBlob: Blob | null = null;
  private clipChunks: Blob[] = [];

  constructor(
    private readonly modalController: ModalController,
    private readonly socketChat: SocketChatService,
    private readonly alertsService: AlertsService,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.bindLocalVideo();
      this.setupPeerConnection();
      this.socketChat.onWebRtcSignal((p) => void this.handleSignal(p));
      this.socketChat.onWebRtcLeave(() => this.remoteActive = false);
      this.socketChat.onVideoClip((p) => {
        void this.alertsService.showToast(`${p.name} sent you a video clip`, 3000);
        window.open(p.dataUrl, '_blank');
      });
      // Caller offers first.
      this.socketChat.emitWebRtcSignal('offer');
    } catch {
      void this.alertsService.showToast('Camera/mic unavailable', 2500);
    }
  }

  ngOnDestroy(): void {
    this.recorder?.stop();
    this.pc?.close();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.socketChat.emitWebRtcLeave();
  }

  private bindLocalVideo(): void {
    const el = document.querySelector<HTMLVideoElement>('.vc-local');
    if (el && this.localStream) el.srcObject = this.localStream;
  }

  private setupPeerConnection(): void {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.pc = pc;
    this.localStream?.getTracks().forEach((t) => pc.addTrack(t, this.localStream as MediaStream));
    pc.onicecandidate = (e) => {
      if (e.candidate) this.socketChat.emitWebRtcSignal('candidate', undefined, e.candidate.candidate);
    };
    pc.ontrack = (e) => {
      const el = document.querySelector<HTMLVideoElement>('.vc-remote');
      if (el) { el.srcObject = e.streams[0]; this.remoteActive = true; }
    };
  }

  private async handleSignal(p: { type: string; sdp: string; candidate: string; name: string }): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    try {
      if (p.type === 'offer') {
        await pc.setRemoteDescription({ type: 'offer', sdp: p.sdp } as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socketChat.emitWebRtcSignal('answer', answer.sdp || '');
      } else if (p.type === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: p.sdp } as RTCSessionDescriptionInit);
      } else if (p.type === 'candidate' && p.candidate) {
        await pc.addIceCandidate({ candidate: p.candidate, sdpMid: '0', sdpMLineIndex: 0 } as RTCIceCandidateInit);
      }
    } catch { /* signal best-effort */ }
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

  sendClip(): void {
    if (!this.clipBlob || !this.clipUrl) return;
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
