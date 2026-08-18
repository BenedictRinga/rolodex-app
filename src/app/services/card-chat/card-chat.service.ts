import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { Subject } from 'rxjs';
import { SocketChatService } from '../socket-chat/socket-chat.service';
import { DraftEngineService } from '../draft-engine/draft-engine.service';

export type ReceiptStatus = 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  from: 'me' | 'them' | 'system';
  text: string;
  at: string; // ISO
  status?: ReceiptStatus; // 2026-08-17 READ RECEIPTS: my messages only
  reactions?: string[]; // 2026-08-17 emoji reactions (👍 ❤️ 😂 🎉 🤝)
}

export interface ChatThread {
  key: string;          // contactId | pod:<group>
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

const PREFIX = 'rolodex-chat-v1:';

/**
 * 2026-08-16 CHAT OFF THE CARD + PODS: comms becomes SMS, email AND in-app
 * chat. Threads are local-first (Capacitor Preferences + localStorage
 * fallback), keyed by contactId for card threads and `pod:<group>` for pods.
 * The demo seeds each thread from the contact's rolodex context so it reads
 * like real history, and the auto-reply stands in for the peer's device until
 * the network layer lands.
 */
@Injectable({
  providedIn: 'root',
})
export class CardChatService {
  private lastSentKey = '';
  private unread: Record<string, number> = {};
  private readonly UNREAD_KEY = 'rolodex-chat-unread';
  /** 2026-08-17: fires when a remote message/appointment arrives (badge + toast). */
  arrival$ = new Subject<{ key: string; label: string }>();


  constructor(
    private readonly storage: StorageService,
    private readonly socketChat: SocketChatService,
    private readonly draftEngine: DraftEngineService,
  ) {
    try {
      const raw = this.storage.getSync<string>(this.UNREAD_KEY); // 2026-08-18 IndexedDB memory cache
      if (raw) this.unread = JSON.parse(raw);
    } catch { /* fresh */ }
    // 2026-08-16 SOCKET: incoming cross-device messages land in their thread
    // (contactId or pod:<group> via the `key` the sender attached).
    this.socketChat.onMessage((msg) => {
      const key = (msg as any).key || '';
      if (!key) return;
      void this.appendRemote(key, msg.name || 'Them', msg.text, new Date(msg.ts || Date.now()).toISOString());
    });
    // 2026-08-17 READ RECEIPTS: the server ack flips my sent message to
    // 'delivered'; the peer opening the thread flips my messages to 'read'.
    this.socketChat.onAck(() => {
      void this.markLatestDelivered();
    });
    this.socketChat.onRead((key) => {
      if (!key) return;
      void this.markThreadRead(key);
    });
    // 2026-08-17 REACTIONS: the peer's emoji lands on the matching message.
    this.socketChat.onReact((payload) => {
      if (!payload?.key || !payload?.messageId) return;
      void this.applyReaction(payload.key, payload.messageId, payload.emoji);
    });
    // 2026-08-17 THE INVITE: an appointment set on the other side arrives here.
    this.socketChat.onAppointment((payload) => {
      if (!payload?.key) return;
      this.appointment$.next(payload);
      this.arrival$.next({ key: payload.key, label: payload.from + ' invited you: ' + payload.title });
    });
  }

  /** 2026-08-17 REACTIONS: toggle the emoji on a thread's message + persist. */
  async toggleReaction(key: string, messageId: string, emoji: string): Promise<void> {
    try {
      const t = await this.loadThread(key);
      if (!t) return;
      const m = t.messages.find((x) => x.id === messageId);
      if (!m) return;
      const list = Array.isArray(m.reactions) ? [...m.reactions] : [];
      const at = list.indexOf(emoji);
      if (at >= 0) list.splice(at, 1); else list.push(emoji);
      m.reactions = list;
      await this.saveThread(t);
      this.messageChanged$.next(key);
      try { this.socketChat.emitReact(key, messageId, emoji); } catch { /* offline */ }
    } catch { /* best effort */ }
  }

  /** The peer's reaction applied to my copy of the message. */
  private async applyReaction(key: string, messageId: string, emoji: string): Promise<void> {
    try {
      const t = await this.loadThread(key);
      if (!t) return;
      const m = t.messages.find((x) => x.id === messageId);
      if (!m) return;
      const list = Array.isArray(m.reactions) ? [...m.reactions] : [];
      const at = list.indexOf(emoji);
      if (at >= 0) list.splice(at, 1); else list.push(emoji);
      m.reactions = list;
      await this.saveThread(t);
      this.messageChanged$.next(key);
    } catch { /* best effort */ }
  }

  /** 2026-08-17 THE INVITE: fix an appointment on my side; the other card catches it. */
  sendAppointment(key: string, title: string, when: string): void {
    try { this.socketChat.sendAppointment(key, title, when); } catch { /* offline */ }
  }

  /** 2026-08-17 INVITES: fires when the other party sets an appointment with me. */
  appointment$ = new Subject<{ key: string; title: string; when: string; from: string }>();
  /** 2026-08-17 REACTIONS: fires whenever a reaction lands (mine or theirs). */
  messageChanged$ = new Subject<string>();

  /** Mark the newest 'me' message 'delivered' when the server acks. */
  private async markLatestDelivered(): Promise<void> {
    try {
      const t = await this.loadThread(this.lastSentKey);
      if (!t) return;
      const me = [...t.messages].reverse().find((m) => m.from === 'me' && (m.status || 'sent') === 'sent');
      if (me) {
        me.status = 'delivered';
        await this.saveThread(t);
      }
    } catch { /* best effort */ }
  }

  /** The peer read the thread - flip my messages in it to 'read'. */
  private async markThreadRead(key: string): Promise<void> {
    try {
      const t = await this.loadThread(key);
      if (!t) return;
      let changed = false;
      for (const m of t.messages) {
        if (m.from === 'me' && (m.status || 'sent') !== 'read') {
          m.status = 'read';
          changed = true;
        }
      }
      if (changed) await this.saveThread(t);
    } catch { /* best effort */ }
  }

  /** 2026-08-17 READ RECEIPTS: the chat opens -> tell the peer I read it. */
  markRead(key: string): void {
    try { this.socketChat.emitRead(key); } catch { /* offline */ }
    try {
      if (this.unread[key]) {
        delete this.unread[key];
        this.storage.setSync(this.UNREAD_KEY, this.unread);
      }
    } catch { /* ignore */ }
  }

  /** 2026-08-17 THE 'HOW DO THEY KNOW' LAYER: per-thread unread counts. */
  unreadFor(key: string): number {
    return this.unread[key] || 0;
  }

  /** 2026-08-17 PRESENCE: how many other devices are in the room. */
  get peersOnline(): number {
    return (this.socketChat as any)?.peerCount || 0;
  }

  /** 2026-08-17 THE DROPBOX MOMENT: the demo room, for invite links. */
  get room(): string {
    return (this.socketChat as any)?.room || '';
  }

  /** The thread title for arrival toasts. */
  threadTitle(key: string): string {
    return key.startsWith('pod:') ? key.slice(4) : key;
  }

  private async appendRemote(key: string, name: string, text: string, at: string): Promise<void> {
    try {
      const thread = await this.loadThread(key);
      if (!thread) return;
      thread.messages = [...thread.messages, { id: 'r' + Date.now() + Math.random().toString(36).slice(2, 6), from: 'them', text, at, status: 'read' as const }];
      await this.saveThread(thread);
      // 2026-08-17 AWARENESS: bump the badge + announce the arrival.
      this.unread[key] = (this.unread[key] || 0) + 1;
      try { this.storage.setSync(this.UNREAD_KEY, this.unread); } catch { /* ignore */ }
      this.arrival$.next({ key, label: name || this.threadTitle(key) });
    } catch {
      /* local-only best effort */
    }
  }

  async loadThread(key: string): Promise<ChatThread | null> {
    try {
      return await this.storage.get<ChatThread>(PREFIX + key);
    } catch {
      return null;
    }
  }

  async saveThread(thread: ChatThread): Promise<void> {
    thread.updatedAt = new Date().toISOString();
    try {
      await this.storage.set(PREFIX + thread.key, thread);
    } catch {
      /* local-only best effort */
    }
  }

  /** Seed a contextual thread from the contact's rolodex history. */
  async seedThread(contact: any): Promise<ChatThread> {
    const key = String(contact?.contactId || 'anon');
    const existing = await this.loadThread(key);
    if (existing?.messages?.length) return existing;
    const name = contact?.name?.display || 'Contact';
    const r = contact?.rolodex || {};
    const when = r.when ? new Date(r.when).toLocaleDateString() : 'recently';
    const where = r.where || 'Rolodex';
    const topic = r.topic || 'general';
    const followUp = r.followUp;
    const thread: ChatThread = {
      key,
      title: name,
      messages: [
        {
          id: 's1',
          from: 'system',
          text: `You met at ${where} (${when}). ${r.how || 'In-person meeting'}.`,
          at: new Date(r.when || Date.now()).toISOString(),
        },
        {
          id: 's2',
          from: 'them',
          text: `Hi! Great connecting about ${topic}. ${r.personalTidbits ? `By the way — ${r.personalTidbits}.` : ''}`,
          at: new Date((r.when ? Date.parse(r.when) : Date.now()) + 3600_000).toISOString(),
        },
        {
          id: 's3',
          from: 'me',
          text: `Good to hear from you! ${followUp ? `Next step: ${followUp}.` : 'Looking forward to our next step.'}`,
          at: new Date((r.when ? Date.parse(r.when) : Date.now()) + 7200_000).toISOString(),
          status: 'read',
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    await this.saveThread(thread);
    return thread;
  }

  /** Pod thread from a group name (shared across the group's members). */
  async podThread(group: string, memberNames: string[]): Promise<ChatThread> {
    const key = 'pod:' + group;
    const existing = await this.loadThread(key);
    if (existing?.messages?.length) return existing;
    const names = memberNames.length ? memberNames.join(', ') : group + ' members';
    const thread: ChatThread = {
      key,
      title: group,
      messages: [
        {
          id: 'p1',
          from: 'system',
          text: `Pod "${group}" — ${names}. Group threads carry the schedule, reminders and shared notes for everyone in the pod.`,
          at: new Date().toISOString(),
        },
        {
          id: 'p2',
          from: 'them',
          text: 'Anyone free this week? Let’s sync on the next steps.',
          at: new Date(Date.now() - 86_400_000).toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    await this.saveThread(thread);
    return thread;
  }

  /** Append a message (local send) + a demo auto-reply. */
  async send(thread: ChatThread, text: string): Promise<ChatThread> {
    const clean = text.trim();
    if (!clean) return thread;
    const me: ChatMessage = {
      id: 'm' + Date.now(),
      from: 'me',
      text: clean,
      at: new Date().toISOString(),
      status: 'sent',
    };
    const them: ChatMessage = {
      id: 't' + Date.now(),
      from: 'them',
      text: `Got it — I'll respond properly when I'm back online. (Rolodex chat: delivered to ${thread.title}'s device.)`,
      at: new Date(Date.now() + 1500).toISOString(),
    };
    thread.messages = [...thread.messages, me, them];
    // 2026-08-16 ROTATING CONTEXT: the chat exchange feeds the relationship story.
    try {
      const rot = Array.isArray((thread as any).contextRotation) ? (thread as any).contextRotation : [];
      rot.push('Chat: "' + clean.slice(0, 60) + '" (' + new Date().toLocaleDateString() + ')');
      if (rot.length > 8) rot.splice(0, rot.length - 8);
      (thread as any).contextRotation = rot;
    } catch {}
    await this.saveThread(thread);
    this.lastSentKey = thread.key;
    // 2026-08-16 SOCKET: push to the demo room so the peer device sees it live.
    try { this.socketChat.send(clean, thread.key); } catch { /* offline demo still works */ }
    return thread;
  }

  /** Distinct groups across contacts for the pods list. */
  groupsFrom(contacts: any[]): Array<{ name: string; members: number }> {
    const map = new Map<string, number>();
    for (const c of contacts || []) {
      for (const g of c?.groups || []) {
        const n = String(g);
        map.set(n, (map.get(n) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, members]) => ({ name, members }))
      .sort((a, b) => b.members - a.members);
  }
}
