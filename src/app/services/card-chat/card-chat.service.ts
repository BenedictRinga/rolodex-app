import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { SocketChatService } from '../socket-chat/socket-chat.service';
import { DraftEngineService } from '../draft-engine/draft-engine.service';

export interface ChatMessage {
  id: string;
  from: 'me' | 'them' | 'system';
  text: string;
  at: string; // ISO
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
  constructor(
    private readonly storage: StorageService,
    private readonly socketChat: SocketChatService,
    private readonly draftEngine: DraftEngineService,
  ) {
    // 2026-08-16 SOCKET: incoming cross-device messages land in their thread
    // (contactId or pod:<group> via the `key` the sender attached).
    this.socketChat.onMessage((msg) => {
      const key = (msg as any).key || '';
      if (!key) return;
      void this.appendRemote(key, msg.name || 'Them', msg.text, new Date(msg.ts || Date.now()).toISOString());
    });
  }

  private async appendRemote(key: string, name: string, text: string, at: string): Promise<void> {
    try {
      const thread = await this.loadThread(key);
      if (!thread) return;
      thread.messages = [...thread.messages, { id: 'r' + Date.now() + Math.random().toString(36).slice(2, 6), from: 'them', text, at }];
      await this.saveThread(thread);
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
