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
    this.socket.on('chat:ack', (payload: { ts?: number }) => {
      for (const cb of this.ackListeners) { try { cb(Number(payload?.ts) || Date.now()); } catch {} }
    });
    this.socket.on('chat:read', (payload: { key?: string }) => {
      for (const cb of this.readListeners) { try { cb(String(payload?.key || '')); } catch {} }
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
  private ackListeners: Array<(ts: number) => void> = [];
  private readListeners: Array<(key: string) => void> = [];

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
