import { Injectable } from '@angular/core';

/**
 * 2026-08-25 LOOP SIGNAL SCOUT (Deepen-Six: F11 owed-reply, F12 promises).
 * Pure DEVICE scanner over contact cards + local threads. Nothing here
 * touches the network; findings stay in StorageService land.
 *
 * Detection doctrine (factual, never shaming):
 *  R1 THREAD TAIL      — the card-chat thread's LAST message decides the ball:
 *                        from 'them' → you owe a reply; from 'user' → waiting on them.
 *  R2 SEND FINGERPRINT — AssistantCardUpdate stamps followUp
 *                        "Waiting for reply — nudge if silence." → awaiting-them.
 *  R3 FOLLOW-UP DEBT   — followUp starting reply/respond/answer/owe → owed-reply.
 *  R4 STALE PROMISE    — "I'll…"-shaped commitments in followUp/note/tidbits,
 *                        untouched ≥7 days → stale-promise signal.
 */
export type SignalClass = 'owed-reply' | 'awaiting-them' | 'stale-promise';

export interface LoopSignal {
  contactId: string;
  person: string;
  cls: SignalClass;
  summary: string;
  evidence: string;
  lastTouchAt?: number;
  promise?: string;
}

@Injectable({ providedIn: 'root' })
export class LoopSignalsService {

  /** Verbatim promise hunt across the card's own-text surfaces. Never paraphrases. */
  extractPromise(contact: any): { text: string; where: string } | null {
    const fields: Array<any> = [
      contact?.rolodex?.followUp,
      contact?.note,
      Array.isArray(contact?.rolodex?.personalTidbits) ? contact.rolodex.personalTidbits.join(' ') : contact?.rolodex?.personalTidbits,
      contact?.rolodex?.topic,
    ];
    const patterns: RegExp[] = [
      /\bi'?ll\s+[a-z][^.;!\n]{3,90}/i,
      /\bi will\s+[a-z][^.;!\n]{3,90}/i,
      /\bpromis(?:ed|ing)?\s+(?:to\s+)?[a-z][^.;!\n]{3,90}/i,
      /\bsaid i'?d\s+[a-z][^.;!\n]{3,90}/i,
    ];
    for (const raw of fields) {
      const s = typeof raw === 'string' ? raw : '';
      if (!s.trim()) continue;
      for (const re of patterns) {
        const m = s.match(re);
        if (m) return { text: m[0].trim(), where: 'card' };
      }
    }
    return null;
  }

  /** F11 core: does THIS card say you owe them a reply? */
  owesReply(contact: any): boolean {
    const fu = String(contact?.rolodex?.followUp || '');
    if (/^\s*(reply|respond|answer|owe)\b/i.test(fu)) return true;                       // R3
    if (/\b(asked me|wants? me to|waiting on me|my reply)\b/i.test(fu)) return true;
    return this.tailFrom(contact) === 'them';                                            // R1
  }

  /** F17 complement: are WE waiting on THEM? (routes to the no-guilt pile) */
  awaitingThem(contact: any): boolean {
    if (/waiting for reply/i.test(String(contact?.rolodex?.followUp || ''))) return true; // R2
    return this.tailFrom(contact) === 'user';
  }

  /** Scan the whole deck → classified signals. Demo cards NEVER create real loops. */
  scanDeck(contacts: any[], now = Date.now()): LoopSignal[] {
    const out: LoopSignal[] = [];
    for (const c of contacts || []) {
      if (!c || (c as any)?.isMockData) continue;
      const person = String(c?.name?.display || '').trim();
      if (!person) continue;
      const lastTouchAt = this.lastTouchMs(c);
      const days = lastTouchAt ? Math.floor((now - lastTouchAt) / 86_400_000) : 999;

      const prom = this.extractPromise(c);
      if (prom && days >= 7) {                                                            // R4
        out.push({ contactId: c.contactId, person, cls: 'stale-promise',
          summary: `Deliver on “${prom.text}”`, evidence: prom.where, lastTouchAt, promise: prom.text });
        continue; // strongest signal wins the row
      }
      if (this.owesReply(c)) {
        const topic = String(c?.rolodex?.topic || c?.note || 'their last message').slice(0, 60);
        out.push({ contactId: c.contactId, person, cls: 'owed-reply',
          summary: `Reply to ${person} about ${topic}`, evidence: 'their last message sits unanswered', lastTouchAt });
      } else if (this.awaitingThem(c)) {
        out.push({ contactId: c.contactId, person, cls: 'awaiting-them',
          summary: `${person} has your message — waiting on them`, evidence: 'your send is the latest touch', lastTouchAt });
      }
    }
    return out;
  }

  /** Defensive thread-tail read — shape varies across builds; absence is fine. */
  private tailFrom(contact: any): 'them' | 'user' | null {
    const msgs = contact?.thread?.messages || contact?.cardChat?.messages || contact?.messages;
    if (!Array.isArray(msgs) || !msgs.length) return null;
    const f = String(msgs[msgs.length - 1]?.from || '').toLowerCase();
    if (f === 'them' || f === 'inbound') return 'them';
    if (f === 'user' || f === 'me' || f === 'outbound') return 'user';
    return null;
  }

  private lastTouchMs(c: any): number | undefined {
    const li = c?.lastInteraction;
    if (li instanceof Date) return li.getTime();
    if (typeof li === 'number') return li;
    if (typeof li === 'string' && li) { const t = new Date(li).getTime(); return isNaN(t) ? undefined : t; }
    return undefined;
  }
}
