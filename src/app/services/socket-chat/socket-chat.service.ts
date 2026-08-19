import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface SocketChatMessage {
  room: string;
  name: string;
  text: string;
  ts: number;
}

/**
 * 2026-08-16 SOCKET CHAT: real-time text chat across devices. The demo room
 * code (from the home page) is the socket room — a message sent on one device
 * appears on the other immediately. The Zyppar-descended socket service was
 * detached to Zyppar; this is the Rolodex-native, room-based rewire.
 */
@Injectable({
  providedIn: 'root',
})
export class SocketChatService implements OnDestroy {
  private socket: Socket | null = null;
  private room = '';
  private name = 'Guest';
  private listeners: Array<(msg: SocketChatMessage) => void> = [];

  get connected(): boolean {
    return !!this.socket?.connected;
  }

  get currentRoom(): string {
    return this.room;
  }

  connect(room: string, name?: string): void {
    const clean = String(room || '').trim();
    if (!clean) return;
    if (this.room === clean && this.socket?.connected) return;
    this.room = clean;
    this.name = name || this.name;
    try {
      this.socket?.disconnect();
    } catch {
      /* ignore */
    }
    const base = environment.rolodexApiBase.replace(/\/api\/rolodex$/, '');
    // 2026-08-16: /socket-rolodex/ - Zyppar's socket owns /socket.io on this
    // droplet; a shared path would clash.
    this.socket = io(base, {
      path: '/socket-rolodex/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1500,
    });
    this.socket.on('connect', () => {
      this.socket?.emit('chat:join', { room: this.room, name: this.name });
    });
    this.socket.on('chat:joined', () => {
      this.peerCount = Math.max(1, this.peerCount + 1);
      this.presence$.next(this.peerCount);
    });
    this.socket.on('chat:left', () => {
      this.peerCount = Math.max(0, this.peerCount - 1);
      this.presence$.next(this.peerCount);
    });
    this.socket.on('chat:present', (payload: { count?: number }) => {
      this.peerCount = Math.max(0, Number(payload?.count) || 0);
      this.presence$.next(this.peerCount);
    });
    this.socket.on('chat:ack', (payload: { ts?: number }) => {
      for (const cb of this.ackListeners) { try { cb(Number(payload?.ts) || Date.now()); } catch {} }
    });
    this.socket.on('chat:read', (payload: { key?: string }) => {
      for (const cb of this.readListeners) { try { cb(String(payload?.key || '')); } catch {} }
    });
    this.socket.on('chat:react', (payload: { key?: string; messageId?: string; emoji?: string; name?: string }) => {
      for (const cb of this.reactListeners) { try { cb({ key: String(payload?.key || ''), messageId: String(payload?.messageId || ''), emoji: String(payload?.emoji || ''), name: String(payload?.name || '') }); } catch {} }
    });
    this.socket.on('appointment:invite', (payload: { key?: string; title?: string; when?: string; from?: string }) => {
      for (const cb of this.appointmentListeners) { try { cb({ key: String(payload?.key || ''), title: String(payload?.title || ''), when: String(payload?.when || ''), from: String(payload?.from || '') }); } catch {} }
    });
    this.socket.on('webrtc:signal', (payload: { type?: string; sdp?: string; candidate?: string; name?: string }) => {
      for (const cb of this.webrtcListeners) { try { cb({ type: String(payload?.type || ''), sdp: String(payload?.sdp || ''), candidate: String(payload?.candidate || ''), name: String(payload?.name || '') }); } catch {} }
    });
    this.socket.on('webrtc:leave', (payload: { name?: string }) => {
      for (const cb of this.webrtcLeaveListeners) { try { cb(String(payload?.name || '')); } catch {} }
    });
    this.socket.on('video-clip', (payload: { name?: string; dataUrl?: string; note?: string; ts?: number }) => {
      for (const cb of this.videoClipListeners) { try { cb({ name: String(payload?.name || ''), dataUrl: String(payload?.dataUrl || ''), note: String(payload?.note || ''), ts: Number(payload?.ts) || Date.now() }); } catch {} }
    });
    this.socket.on('chat:typing', (payload: { room?: string; name?: string }) => {
      this.typing$.next({ room: payload?.room || '', name: payload?.name || '' });
    });
    this.socket.on('chat:message', (payload: SocketChatMessage) => {
      for (const cb of this.listeners) {
        try {
          cb(payload);
        } catch {
          /* listener isolation */
        }
      }
    });
  }

  onMessage(cb: (msg: SocketChatMessage) => void): void {
    this.listeners.push(cb);
  }

  /** 2026-08-17: typing indicators - the Teams/Zoom touch. */
  typing$ = new Subject<{ room: string; name: string }>();
  /** 2026-08-17 PRESENCE: how many OTHER devices are in the room right now. */
  peerCount = 0;
  presence$ = new Subject<number>();
  private ackListeners: Array<(ts: number) => void> = [];
  private readListeners: Array<(key: string) => void> = [];
  private reactListeners: Array<(payload: { key: string; messageId: string; emoji: string; name?: string }) => void> = [];
  private appointmentListeners: Array<(payload: { key: string; title: string; when: string; from: string }) => void> = [];
  private webrtcListeners: Array<(payload: { type: string; sdp: string; candidate: string; name: string }) => void> = [];
  private webrtcLeaveListeners: Array<(name: string) => void> = [];
  private videoClipListeners: Array<(payload: { name: string; dataUrl: string; note: string; ts: number }) => void> = [];

  emitTyping(): void {
    if (!this.room || !this.socket?.connected) return;
    this.socket.emit('chat:typing', { room: this.room, name: this.name });
  }

  /** 2026-08-17 READ RECEIPTS: delivered (the ack) + read (the peer opened the thread). */
  onAck(cb: (ts: number) => void): void { this.ackListeners.push(cb); }

  onRead(cb: (key: string) => void): void { this.readListeners.push(cb); }

  emitRead(key: string): void {
    if (!this.room || !this.socket?.connected) return;
    this.socket.emit('chat:read', { room: this.room, key });
  }

  onReact(cb: (payload: { key: string; messageId: string; emoji: string; name?: string }) => void): void {
    this.reactListeners.push(cb);
  }

  emitReact(key: string, messageId: string, emoji: string): void {
    if (!this.room || !this.socket?.connected) return;
    this.socket.emit('chat:react', { room: this.room, key, messageId, emoji, name: this.name });
  }

  onAppointment(cb: (payload: { key: string; title: string; when: string; from: string }) => void): void {
    this.appointmentListeners.push(cb);
  }

  /** 2026-08-17 THE INVITE: fix an appointment here, the other card catches it. */
  sendAppointment(key: string, title: string, when: string): void {
    if (!this.room || !this.socket?.connected) return;
    this.socket.emit('appointment:invite', { room: this.room, key, title, when, name: this.name });
  }

  // ===== 2026-08-19 WEBRTC + VIDEO CLIP ======================================

  emitWebRtcSignal(type: string, sdp?: string, candidate?: string): void {
    if (!this.room || !this.socket?.connected) return;
    this.socket.emit('webrtc:signal', { room: this.room, type, sdp: sdp || '', candidate: candidate || '' });
  }

  emitWebRtcLeave(): void {
    if (!this.room || !this.socket?.connected) return;
    this.socket.emit('webrtc:leave', { room: this.room });
  }

  onWebRtcSignal(cb: (payload: { type: string; sdp: string; candidate: string; name: string }) => void): void {
    this.webrtcListeners.push(cb);
  }

  onWebRtcLeave(cb: (name: string) => void): void {
    this.webrtcLeaveListeners.push(cb);
  }

  sendVideoClip(dataUrl: string, note?: string): void {
    if (!this.room || !this.socket?.connected) return;
    this.socket.emit('video-clip', { room: this.room, dataUrl, note: note || '' });
  }

  onVideoClip(cb: (payload: { name: string; dataUrl: string; note: string; ts: number }) => void): void {
    this.videoClipListeners.push(cb);
  }

  send(text: string, key?: string): void {
    if (!this.room || !this.socket?.connected) return;
    this.socket.emit('chat:message', { room: this.room, text, key: key || '' });
  }

  ngOnDestroy(): void {
    try {
      this.socket?.disconnect();
    } catch {
      /* ignore */
    }
    this.listeners = [];
  }
}
