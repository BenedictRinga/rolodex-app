import { Injectable, OnDestroy } from '@angular/core';
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
    this.socket = io(base, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1500,
    });
    this.socket.on('connect', () => {
      this.socket?.emit('chat:join', { room: this.room, name: this.name });
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
