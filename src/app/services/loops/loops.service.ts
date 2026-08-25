import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { environment } from '../../../environments/environment';

/**
 * 2026-08-24 LOOPKEEPER INBOX (Isenberg wedge first take) — the open-loops
 * engine. Device-first via StorageService (IndexedDB cascade); no new backend.
 *
 * Build rule this service implements:
 *   context packet → decision → draft → send → closed receipt.
 * Anything that does not shorten that path does not belong here.
 */

export type LoopKind =
  | 'owed-reply' | 'promise' | 'check-in' | 'favor' | 'intro'
  | 'social' | 'meeting' | 'birthday' | 'coffee';

export type LoopTone = 'short' | 'honest' | 'light' | 'formal';
export type LoopChannel = 'whatsapp' | 'sms' | 'email' | 'linkedin' | 'voice';
export type LoopStance = 'warm' | 'brief' | 'overdue-apology';
export type LoopDirection = 'mine' | 'theirs'; // waiting-on-you vs waiting-on-them
export type LoopStatus = 'open' | 'waiting' | 'closed' | 'dropped';

export interface Loop {
  id: string;
  createdAt: number;
  updatedAt: number;

  // ── Context packet (feature 3) ──
  person: string;
  secondPerson?: string;          // intro loops (21): the B side
  relation?: string;              // how you know them
  kind: LoopKind;
  summary: string;                // one-line what
  promise?: string;               // open promise text (12)
  lastTouchAt?: number;           // epoch ms
  whySitting?: string;            // staleness reason (13)
  stance: LoopStance;             // warm / brief / overdue-apology
  direction: LoopDirection;       // 17

  // ── State ──
  status: LoopStatus;
  waitUntil?: number;             // snooze date (18)
  waitCondition?: string;         // snooze with a condition (18)
  escalateIfNoReplyBy?: number;
  closeReason?: string;           // drop with dignity (19)

  // ── The draft layer (features 5/14/15/16) ──
  tone: LoopTone;
  draft: string;
  pretext?: string;
  channel?: LoopChannel;
  voiceOutline?: string;

  // ── Recipient (captured lazily at first send; stays on device) ──
  handle?: string;                // phone digits or email

  // ── Habit engine (7) + receipt (8) ──
  nudgesSent: number;
  nextNudgeAt?: number;
  receipt?: {
    sentAt: number;
    channel: LoopChannel;
    snippet: string;
    doneMeans: 'reply-needed' | 'closed';
  };
  closedAt?: number;
  optInReminder?: boolean;        // birthdays: per-person opt-in only (24)
}

const STORE_KEY = 'loopkeeper_loops_v1';
const DAY = 86_400_000;
const RISING_NUDGE_DAYS = [2, 4, 7]; // rises, then holds — never spam

@Injectable({ providedIn: 'root' })
export class LoopsService {
  private cache: Loop[] | null = null;

  constructor(
    private storage: StorageService,
    private analytics: AnalyticsService,
  ) {}

  // ===== Persistence ========================================================

  async all(): Promise<Loop[]> {
    if (this.cache) return this.cache;
    try {
      const saved = await this.storage.get<Loop[]>(STORE_KEY);
      this.cache = Array.isArray(saved) ? saved : [];
    } catch {
      this.cache = [];
    }
    return this.cache;
  }

  private async persist(): Promise<void> {
    if (!this.cache) return;
    try { await this.storage.set(STORE_KEY, this.cache); } catch { /* memory holds */ }
  }

  private touch(l: Loop): void { l.updatedAt = Date.now(); }

  create(partial: Partial<Loop>): Loop {
    const now = Date.now();
    const loop: Loop = {
      id: now.toString(36) + Math.random().toString(36).slice(2, 7),
      createdAt: now,
      updatedAt: now,
      person: partial.person || 'Someone',
      kind: partial.kind || 'check-in',
      summary: partial.summary || '',
      stance: partial.stance || 'warm',
      direction: partial.direction || 'mine',
      status: 'open',
      tone: partial.tone || 'short',
      nudgesSent: 0,
      optInReminder: partial.optInReminder ?? false,
      ...partial,
      draft: partial.draft || '',
    };
    loop.draft = loop.draft || this.generateDraft(loop);
    loop.pretext = loop.pretext || this.suggestPretext(loop);
    loop.channel = loop.channel || this.suggestChannel(loop);
    loop.nextNudgeAt = now + RISING_NUDGE_DAYS[0] * DAY;
    this.cache!.unshift(loop);
    void this.persist();
    this.analytics.track('loop_captured');
    return loop;
  }

  update(id: string, patch: Partial<Loop>): Loop | undefined {
    const l = this.cache?.find(x => x.id === id);
    if (!l) return undefined;
    Object.assign(l, patch, { updatedAt: Date.now() });
    void this.persist();
    return l;
  }

  remove(id: string): void {
    this.cache = this.cache?.filter(l => l.id !== id) || [];
    void this.persist();
  }

  /** Public accessor — components should never touch cache directly. */
  getLoop(id: string): Loop | undefined {
    return this.cache?.find(l => l.id === id);
  }

  // ===== Inbox views (features 1 / 9 / 17) ==================================

  /** TODAY'S 3 — hard cap. The 47 is the enemy; the app shows three. */
  async todaysThree(): Promise<Loop[]> {
    await this.all();
    return this.openMine()
      .sort((a, b) => this.score(b) - this.score(a))
      .slice(0, 3);
  }

  openMine(): Loop[] {
    return (this.cache || []).filter(l => l.status !== 'dropped' && l.status !== 'closed' && l.direction === 'mine')
      .filter(l => l.status === 'open' || this.waitExpired(l));
  }

  waitingOnThem(): Loop[] {
    return (this.cache || []).filter(l => l.direction === 'theirs' && l.status !== 'closed' && l.status !== 'dropped');
  }

  recentlyClosed(limit = 6): Loop[] {
    return (this.cache || [])
      .filter(l => l.status === 'closed' || (l.status !== 'dropped' && !!l.receipt))
      .sort((a, b) => (b.receipt?.sentAt || b.updatedAt) - (a.receipt?.sentAt || a.updatedAt))
      .slice(0, limit);
  }

  counts(): { mine: number; theirs: number; closedThisWeek: number } {
    const weekAgo = Date.now() - 7 * DAY;
    return {
      mine: this.openMine().length,
      theirs: this.waitingOnThem().length,
      closedThisWeek: (this.cache || []).filter(l => l.status === 'closed' && (l.closedAt || 0) > weekAgo).length,
    };
  }

  /** Urgency score: owed replies and dying social debts float up. */
  score(l: Loop): number {
    const days = this.daysSitting(l);
    const base: Record<LoopKind, number> = {
      'owed-reply': 100, 'social': 110, 'promise': 85, 'meeting': 75,
      'intro': 70, 'favor': 65, 'coffee': 55, 'check-in': 45 + days * 2, 'birthday': 95,
    };
    return (base[l.kind] || 50) + days * 4 + l.nudgesSent * 5;
  }

  daysSitting(l: Loop): number {
    const from = l.lastTouchAt || l.createdAt;
    return Math.max(0, Math.floor((Date.now() - from) / DAY));
  }

  private waitExpired(l: Loop): boolean {
    return l.status === 'waiting' && !!l.waitUntil && l.waitUntil <= Date.now();
  }

  /** Snoozes whose date passed wake back up; conditioned escalation arms. */
  resumeExpiredWaits(): Loop[] {
    const woke: Loop[] = [];
    for (const l of this.cache || []) {
      if (this.waitExpired(l)) {
        l.status = 'open';
        l.nextNudgeAt = Date.now();
        woke.push(l);
      }
    }
    if (woke.length) void this.persist();
    return woke;
  }

  /** Due rising nudges (7). Closed loops are SILENT — that is the reward. */
  dueNudges(): Loop[] {
    return (this.cache || []).filter(
      l => (l.status === 'open') && !!l.nextNudgeAt && l.nextNudgeAt <= Date.now(),
    );
  }

  registerNudgeSent(id: string): void {
    const l = this.cache?.find(x => x.id === id);
    if (!l) return;
    l.nudgesSent++;
    const step = RISING_NUDGE_DAYS[Math.min(l.nudgesSent, RISING_NUDGE_DAYS.length - 1)];
    l.nextNudgeAt = Date.now() + step * DAY;
    void this.persist();
  }

  // ===== Capture in one sentence (feature 10) ===============================

  parseCapture(sentence: string): Partial<Loop> {
    const s = String(sentence || '').trim();
    const lower = s.toLowerCase();

    // Person: quoted name, or after to/for/with/from, or leading capitalized pair.
    let person = '';
    const quoted = s.match(/["“']([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)?)["”']/);
    const afterPrep = s.match(/\b(?:to|for|with|from)\s+([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)?)/);
    const leadingCaps = s.match(/(?:^|,\s*)\b([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)?)\b/);
    person = (quoted?.[1] || afterPrep?.[1] || leadingCaps?.[1] || '').trim();

    // Direction: waiting-on-them phrasing.
    const theirs = /\b(waiting on|awaiting|they (have )?(not )?(replied|answered)|haven'?t heard|their reply|on them)\b/i.test(s)
      || /\bwaiting\b.{0,12}\bon\b.{0,12}\b(them|him|her)\b/i.test(lower);

    // Kind detection.
    let kind: LoopKind = 'check-in';
    if (/\b(repl(y|ies)|respond|answer(ed)? (him|her|them)|owe (him|her|them) a)\b/i.test(lower)) kind = 'owed-reply';
    else if (/\b(intro|introduce|connect (you|her|him)|introduction)\b/i.test(lower)) kind = 'intro';
    else if (/\b(birthday|congratulat|condolence|thank|sympath)\b/i.test(lower)) kind = 'social';
    else if (/\b(coffee|lunch|drinks|catch up over)\b/i.test(lower)) kind = 'coffee';
    else if (/\b(promis|said i('| i)?( would|'d|ll)|i'?ll (send|ping|share|intro)|told (him|her|them) i'?d)\b/i.test(lower)) kind = 'promise';
    else if (/\b(favor|favour|borrowed|lend|owes me|invoice)\b/i.test(lower)) kind = 'favor';
    else if (/\b(follow(-| )?up|after (the|our) (call|meeting)|recap)\b/i.test(lower)) kind = 'meeting';
    else if (/\bbirthday\b/i.test(lower)) kind = 'birthday';

    // Summary: strip filler prefixes.
    const summary = s.replace(
      /^(need to|i should|i keep meaning to|i must|remember to|don'?t forget to|todo:?)\s*/i, '',
    ).trim();

    // Deadline sniff → wait-until hint embedded in condition (18).
    let waitCondition = '';
    const wd = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayHit = lower.match(new RegExp(`\\b(${wd.join('|')})\\b`));
    if (dayHit) waitCondition = `By ${dayHit[1][0].toUpperCase() + dayHit[1].slice(1)}`;
    else if (/\btomorrow\b/i.test(lower)) waitCondition = 'Tomorrow';
    else if (/\bthis week\b/i.test(lower)) waitCondition = 'This week';

    return {
      person: person || 'Unnamed',
      kind,
      summary,
      direction: theirs ? 'theirs' : 'mine',
      stance: kind === 'owed-reply' ? 'overdue-apology' : 'warm',
      waitCondition,
      lastTouchAt: undefined,
    };
  }

  // ===== Agent layer: pretext / channel / voice (14/15/16) ===================

  suggestPretext(l: Loop): string {
    if (l.promise) return `you promised: “${l.promise}”`;
    if (l.relation) return `how you met — ${l.relation}`;
    if (l.summary) return `the open thread: ${l.summary}`;
    const d = this.daysSitting(l);
    if (d > 21) return `an honest note about the ${d}-day gap`;
    return `a real hello — not “just circling back”`;
  }

  suggestChannel(l: Loop): LoopChannel {
    if (l.tone === 'formal' || l.kind === 'meeting' || l.kind === 'intro') return 'email';
    if (l.kind === 'social' || l.kind === 'coffee') return 'sms';
    return 'sms';
  }

  voiceOutline(l: Loop): string {
    const f = l.person.split(' ')[0];
    return [
      `20-second voice note — ${l.kind}`,
      `1. Say hi: “${f}! It's [your name].”`,
      `2. Hook: ${l.pretext || 'why them, why now'}.`,
      `3. The one thing: ${l.summary || 'what you need or offer'}.`,
      `4. Land it soft: “No rush — whenever you get a sec.”`,
    ].join('\n');
  }

  // ===== Uncomfortable-message drafter (feature 5) ===========================

  generateDraft(l: Loop, tone: LoopTone = l.tone || 'short'): string {
    l.tone = tone;
    const f = l.person.split(' ')[0];
    const topic = (l.summary || 'our last thread').replace(/^about\s+/i, '');
    const why = l.whySitting ? `It sat because ${l.whySitting}.` : '';
    const d = this.daysSitting(l);

    const P: Record<LoopKind, Record<LoopTone, string>> = {
      'owed-reply': {
        short: `Hi ${f} — sorry for the slow reply on “${topic}”. ${why ? why + ' ' : 'No good excuse — I kept meaning to get back to you.'}Here's where I've landed:\n\n`,
        honest: `Hi ${f} — the honest version: I put off answering “${topic}” because ${l.whySitting || 'doing it properly felt heavy'}. That was on me. Doing it now:\n\n`,
        light: `Hey ${f}! Your “${topic}” message got buried under my life — dug it out. 😄\n\n`,
        formal: `Dear ${l.person},\n\nThank you for your patience regarding ${topic}. I apologise for the delayed response.\n\n`,
      },
      'check-in': {
        short: `Hi ${f} — ${l.pretext || 'crossed my mind today'}. How have you been?\n\n`,
        honest: `Hi ${f} — it's been about ${d} days and I didn't want the silence to become a year. ${l.pretext ? l.pretext[0].toUpperCase() + l.pretext.slice(1) + '.' : ''} How are things?\n\n`,
        light: `Hey ${f}! 👋 ${l.pretext ? l.pretext[0].toUpperCase() + l.pretext.slice(1) : 'Random thought'} — how's life treating you?\n\n`,
        formal: `Dear ${l.person},\n\nI hope this finds you well. It has been some time since we last spoke, and I wanted to reconnect.\n\n`,
      },
      'promise': {
        short: `Hi ${f} — following through on what I said: ${l.promise || topic}. Here it is:\n\n`,
        honest: `Hi ${f} — I said I'd ${l.promise || 'send this'}, and it's late. Here it is, finally:\n\n`,
        light: `Hey ${f}! Remember ${l.promise || topic}? It exists! 😅\n\n`,
        formal: `Dear ${l.person},\n\nFurther to our conversation, please find the promised ${topic} below.\n\n`,
      },
      'favor': {
        short: `Hi ${f} — small favour to ask about ${topic}. Totally fine to say no.\n\n`,
        honest: `Hi ${f} — I need a hand with ${topic}, and you're the person I trust with it. No pressure either way.\n\n`,
        light: `Hey ${f}! Need a tiny hero moment re: ${topic} 🙏 Say no freely.\n\n`,
        formal: `Dear ${l.person},\n\nI am writing to ask a small favour concerning ${topic}. Please feel free to decline.\n\n`,
      },
      'intro': {
        short: `Hi ${f} — I promised an intro.${l.secondPerson ? ` Meet ${l.secondPerson}: ` : ' '}[one line on why they're great]. Making the connection because it should happen.\n\n`,
        honest: `Hi ${f} — the intro I owe you (${l.secondPerson || 'the connection'}) slipped. Fixing that now: [one line on each of you].\n\n`,
        light: `Hey ${f}! You + ${l.secondPerson || "someone you'll love"} need to know each other. 🤝\n\n`,
        formal: `Dear ${l.person},${l.secondPerson ? `\n\nAllow me to introduce ${l.secondPerson}. ` : '\n\n'}[Context for the introduction.]\n\n`,
      },
      'social': {
        short: `Hi ${f} — ${l.summary || 'thinking of you today'}. It mattered.\n\n`,
        honest: `Hi ${f} — I won't pretend perfect words exist. ${l.summary || 'I am here, thinking of you.'}\n\n`,
        light: `Hey ${f}! ${l.summary || 'Congratulations!!'} 🎉 Well deserved.\n\n`,
        formal: `Dear ${l.person},\n\n${l.summary || 'Please accept my heartfelt congratulations.'}\n\n`,
      },
      'meeting': {
        short: `Hi ${f} — good speaking today. Recap: ${topic}. My next step: [x]. Yours: [y]?\n\n`,
        honest: `Hi ${f} — straight recap of today: ${topic}. To keep momentum: [decide x].\n\n`,
        light: `Hey ${f}! Great session 👍 Quick recap + next steps below.\n\n`,
        formal: `Dear ${l.person},\n\nThank you for your time today. Summarising ${topic} and agreed next steps below.\n\n`,
      },
      'birthday': {
        short: `Happy birthday, ${f}! 🎉 Hope this year is generous to you.`,
        honest: `Happy birthday, ${f}. You crossed my mind today — genuinely glad you're in my life.`,
        light: `HAPPY BIRTHDAY ${f.toUpperCase()}!! 🎂🎉`,
        formal: `Dear ${l.person},\n\nWarm wishes on your birthday.\n\nKind regards,\n`,
      },
      'coffee': {
        short: `Hi ${f} — we keep saying coffee, so let's kill the maybe: does [day] work? I'll book it.`,
        honest: `Hi ${f} — “let's grab coffee” has been pending too long. Proposing a real date: [day/time]?\n\n`,
        light: `Hey ${f}! Coffee debt collection ☕ — name a day, I'm there.\n\n`,
        formal: `Dear ${l.person},\n\nMight you have time for coffee in the coming weeks? I would value catching up.\n\n`,
      },
    };
    return (P[l.kind] || P['check-in'])[tone];
  }

  /** Optional AI polish — best-effort through the EXISTING chat proxy. */
  async polishWithAi(l: Loop): Promise<string | null> {
    try {
      const res = await fetch(`${environment.rolodexApiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'deepseek',
          messages: [{
            role: 'user',
            content: `Rewrite this message in a ${l.tone} tone. Keep it under 80 words, human, no corporate filler. Message:\n"""${l.draft}"""`,
          }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      return data?.reply ? String(data.reply) : null;
    } catch { return null; }
  }

  // ===== Decisions (features 4 / 8 / 18 / 19) ================================

  waitUntil(id: string, isoDay: string, condition?: string): void {
    const l = this.cache?.find(x => x.id === id);
    if (!l) return;
    l.status = 'waiting';
    l.waitUntil = new Date(isoDay + 'T09:00:00').getTime();
    l.waitCondition = condition || l.waitCondition;
    if (/repl(y|ies)|friday.*escalat/i.test(condition || '')) l.escalateIfNoReplyBy = l.waitUntil;
    this.touch(l);
    void this.persist();
  }

  dropWithDignity(id: string, reason: string): void {
    const l = this.cache?.find(x => x.id === id);
    if (!l) return;
    l.status = 'dropped';
    l.closeReason = reason;
    l.closedAt = Date.now();
    l.nextNudgeAt = undefined; // dropping IS closing — silence afterwards
    this.touch(l);
    void this.persist();
    this.analytics.track('loop_closed', { mode: 'dropped' });
  }

  /** One-tap send → receipt. "Sent" ≠ "closed": reply-needed is tracked. */
  markSent(id: string, channel: LoopChannel, snippet: string, doneMeans: 'reply-needed' | 'closed'): void {
    const l = this.cache?.find(x => x.id === id);
    if (!l) return;
    l.receipt = { sentAt: Date.now(), channel, snippet: snippet.slice(0, 160), doneMeans };
    l.nextNudgeAt = undefined;
    if (doneMeans === 'closed') { l.status = 'closed'; l.closedAt = Date.now(); }
    this.touch(l);
    void this.persist();
    this.analytics.track('message_sent');
  }

  /** Reply arrived / thing truly done → THE celebration moment. */
  closeFully(id: string): void {
    const l = this.cache?.find(x => x.id === id);
    if (!l) return;
    l.status = 'closed';
    l.closedAt = Date.now();
    l.nextNudgeAt = undefined;
    this.touch(l);
    void this.persist();
    this.analytics.track('loop_closed');
  }

  /** Deep-link builders (6). Draft ALWAYS lands on the clipboard too. */
  buildSend(channel: LoopChannel, l: Loop): { url?: string; copyText: string; label: string } {
    const handle = (l.handle || '').replace(/[^\d+@.\-]/g, '');
    const enc = encodeURIComponent(l.draft);
    switch (channel) {
      case 'whatsapp': return { url: `https://wa.me/${handle.replace(/\D/g, '')}?text=${enc}`, copyText: l.draft, label: 'WhatsApp' };
      case 'sms': return { url: `sms:${handle}?body=${enc}`, copyText: l.draft, label: 'SMS' };
      case 'email': return { url: `mailto:${handle}?subject=${encodeURIComponent('Re: ' + (l.summary || 'Hello'))}&body=${enc}`, copyText: l.draft, label: 'Email' };
      case 'linkedin': return { url: 'https://www.linkedin.com/messaging/thread/new/', copyText: l.draft, label: 'LinkedIn' };
      case 'voice': return { url: undefined, copyText: l.voiceOutline || this.voiceOutline(l), label: 'Voice note' };
    }
  }
}
