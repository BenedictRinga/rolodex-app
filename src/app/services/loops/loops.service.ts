import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from '../storage/storage.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { environment } from '../../../environments/environment';
import { userLang } from '../lang/user-lang';

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
  whySittingSource?: 'suggested' | 'user'; // F13: agent suggestion vs the user's own words
  stance: LoopStance;             // warm / brief / overdue-apology
  direction: LoopDirection;       // 17
  introNoteB?: string;            // F21: the second intro note (UI gated, REVEAL-LATER)
  introBDone?: boolean;
  sourceContactId?: string;       // device-only provenance: which card fed this loop

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
    private translate: TranslateService,
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

  parseCapture(sentence: string, contact?: any): Partial<Loop> {
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

    // ── 2026-08-25 DEEPEN SIX: enrich from the resolved card (F11/F12/F13) ──
    const enriched: Partial<Loop> = {
      person: person || 'Unnamed',
      kind,
      summary,
      direction: theirs ? 'theirs' : 'mine',
      stance: kind === 'owed-reply' ? 'overdue-apology' : 'warm',
      waitCondition,
      lastTouchAt: undefined,
    };
    if (contact) {
      const disp = String(contact?.name?.display || '').trim();
      if (disp) enriched.person = disp;
      enriched.sourceContactId = String(contact?.contactId || '') || undefined;
      enriched.relation = String(contact?.rolodex?.where || contact?.rolodex?.who || contact?.rolodex?.topic || '').trim() || undefined;
      const li = contact?.lastInteraction;
      enriched.lastTouchAt = li instanceof Date ? li.getTime()
        : typeof li === 'number' ? li
        : (typeof li === 'string' && li ? new Date(li).getTime() : undefined);
      const promise = this.extractPromiseFromContact(contact);
      if (promise) { enriched.promise = promise; enriched.kind = 'promise'; }   // F12 precedence
      if (enriched.kind !== 'promise') {
        if (this.cardSaysIOweReply(contact)) {                                   // F11 card-truth override
          enriched.kind = 'owed-reply'; enriched.direction = 'mine'; enriched.stance = 'overdue-apology';
        } else if (this.cardSaysTheyOweUs(contact)) {
          enriched.direction = 'theirs';                                         // F17 routing
        }
      }
    }
    // F13: SUGGESTED friction — provisional by construction; the user's edit wins.
    const cand = { ...enriched, createdAt: Date.now() } as Loop;
    const why = this.suggestWhySitting(cand);
    if (why) { enriched.whySitting = why; enriched.whySittingSource = 'suggested'; }
    return enriched;
  }

  // ===== Deepen-Six: F11/F12/F13/F21/F23 device intelligence (2026-08-25) ====

  /** F12 — verbatim promise from a card's own-text fields. */
  extractPromiseFromContact(contact: any): string | undefined {
    if (!contact) return undefined;
    const fields = [
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
      for (const re of patterns) { const m = s.match(re); if (m) return m[0].trim(); }
    }
    return undefined;
  }

  /** F11 — the card says YOU owe THEM (factual signals only, never shaming). */
  private cardSaysIOweReply(contact: any): boolean {
    const fu = String(contact?.rolodex?.followUp || '');
    if (/^\s*(reply|respond|answer|owe)\b/i.test(fu)) return true;
    if (/\b(asked me|wants? me to|waiting on me|my reply)\b/i.test(fu)) return true;
    const msgs = contact?.thread?.messages || contact?.cardChat?.messages || contact?.messages;
    if (Array.isArray(msgs) && msgs.length) {
      const f = String(msgs[msgs.length - 1]?.from || '').toLowerCase();
      if (f === 'them' || f === 'inbound') return true;
    }
    return false;
  }

  /** F17 companion — the card says THEY owe US (no-guilt pile). */
  private cardSaysTheyOweUs(contact: any): boolean {
    if (/waiting for reply/i.test(String(contact?.rolodex?.followUp || ''))) return true;
    const msgs = contact?.thread?.messages || contact?.cardChat?.messages || contact?.messages;
    if (Array.isArray(msgs) && msgs.length) {
      const f = String(msgs[msgs.length - 1]?.from || '').toLowerCase();
      return f === 'user' || f === 'me' || f === 'outbound';
    }
    return false;
  }

  /**
   * F13 — NAME THE FRICTION. Chain per brief:
   * missing reply > money/decision > no hook > tone-avoidance > forgot.
   * Returns a SUGGESTION; caller marks whySittingSource='suggested'.
   */
  suggestWhySitting(l: Pick<Loop, 'kind' | 'summary' | 'pretext' | 'lastTouchAt' | 'createdAt'>): string | undefined {
    const d = Math.max(0, Math.floor((Date.now() - (l.lastTouchAt || l.createdAt || Date.now())) / DAY));
    const s = (l.summary || '').toLowerCase();
    if (l.kind === 'owed-reply') return 'the reply is still unwritten';
    if (/(pric|cost|quote|invoice|budget|fee|pay|discount)/.test(s)) return 'it touches money — the number is unsent';
    if (/(decide|decision|choose|option|offer|approve|sign)/.test(s)) return 'it waits on a decision nobody has made yet';
    if (l.kind === 'coffee') return '“sometime” was never turned into a date';
    if (!l.pretext || l.pretext.startsWith('a real hello')) return 'there was no natural hook to reopen with';
    if (d >= 21) return 'long silences feel heavier the longer they sit';
    if (l.kind === 'social') return 'the right tone felt hard to find';
    if (d >= 10) return 'it simply slipped past the busy weeks';
    return undefined;
  }

  /** F21 — BOTH sides of the intro, drafted from ONE context, ONE loop. */
  generateIntroNotes(l: Loop): { noteA: string; noteB: string } {
    const noteA = this.generateDraft(l, l.tone);
    const b = (l.secondPerson || 'them').split(' ')[0];
    const a = l.person.split(' ')[0];
    const topic = (l.summary || '').replace(/^about\s+/i, '');
    const noteB =
`Hi ${b} — ${a} suggested we connect.${topic ? ` Context: ${topic}.` : ''} ${a}'s one-liner on you goes here — [what makes you worth ${b}'s time]. Worth a conversation?

No pressure either way — replying here connects you directly.`;
    return { noteA, noteB };
  }

  /** F23 — MANUAL trigger (auto-open ships gated OFF in the Keeper). */
  openMeetingFollowUp(contact: any, eventTitle?: string): Loop {
    const person = String(contact?.name?.display || 'Someone');
    const title = String(eventTitle || contact?.rolodex?.topic || 'our meeting');
    const li = contact?.lastInteraction;
    const touched = li instanceof Date ? li.getTime() : (typeof li === 'number' ? li : Date.now());
    this.create({
      person,
      kind: 'meeting',
      summary: `Recap ${title} + promised next step`,
      relation: contact?.rolodex?.who || contact?.rolodex?.where || undefined,
      lastTouchAt: touched,
      channel: 'email',
      stance: 'brief',
      sourceContactId: contact?.contactId,
    });
    const loop = this.cache![0];
    const why = this.suggestWhySitting(loop);
    if (why) this.update(loop.id, { whySitting: why, whySittingSource: 'suggested' });
    return this.getLoop(loop.id)!;
  }

  /** Dedupe key for signal ingestion + auto-open. */
  hasOpenLoop(person: string, kind?: LoopKind): boolean {
    const p = person.trim().toLowerCase();
    return (this.cache || []).some(l =>
      l.person.trim().toLowerCase() === p &&
      l.status !== 'closed' && l.status !== 'dropped' &&
      (!kind || l.kind === kind));
  }

  /** F11/F17 ingestion — deck signals become loop skeletons, deduped per person+kind. */
  async ingestSignals(signals: Array<{ person: string; contactId?: string; cls: string; summary: string; lastTouchAt?: number; promise?: string }>): Promise<Loop[]> {
    await this.all();
    const created: Loop[] = [];
    for (const sig of signals || []) {
      const person = String(sig.person || '').trim();
      if (!person || this.hasOpenLoop(person)) continue;
      if (sig.cls === 'awaiting-them') {
        created.push(this.create({
          person, kind: sig.promise ? 'promise' : 'check-in',
          summary: sig.summary, direction: 'theirs',
          lastTouchAt: sig.lastTouchAt, promise: sig.promise,
          sourceContactId: sig.contactId,
        }));
      } else if (sig.cls === 'owed-reply') {
        created.push(this.create({
          person, kind: 'owed-reply', summary: sig.summary,
          direction: 'mine', stance: 'overdue-apology',
          lastTouchAt: sig.lastTouchAt, sourceContactId: sig.contactId,
        }));
      } else if (sig.cls === 'stale-promise' && sig.promise) {
        created.push(this.create({
          person, kind: 'promise', summary: sig.summary, promise: sig.promise,
          direction: 'mine', lastTouchAt: sig.lastTouchAt,
          sourceContactId: sig.contactId,
        }));
      }
    }
    return created;
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

  /**
   * 2026-08-27 DRAFT LANGUAGES: the deterministic engine was English-only —
   * an Arabic-UI user's first draft arrived in English. The wedge kinds now
   * draft in the user's language via loopkeeper.draft.* keys (hand-translated
   * for the major locales; every other locale carries the EN value as a safe
   * fallback, so instant() NEVER leaks a raw key). Returns null → English
   * template below. En route: missing key → instant returns the key → null.
   */
  private localizedShort(l: Loop): string | null {
    const lang = this.translate?.currentLang;
    if (!lang || lang === 'en' || lang.startsWith('en-')) return null;
    const f = l.person.split(' ')[0];
    const topic = (l.summary || 'our last thread').replace(/^about\s+/i, '');
    const t = (k: string, params: Record<string, unknown>): string | null => {
      const s = this.translate.instant(k, params);
      return s === k ? null : s;
    };
    switch (l.kind) {
      case 'owed-reply':
        return l.whySitting
          ? t('loopkeeper.draft.owedReply.why', { person: f, topic, why: l.whySitting })
          : t('loopkeeper.draft.owedReply.plain', { person: f, topic });
      case 'check-in':
        return l.pretext
          ? t('loopkeeper.draft.checkIn.pretext', { person: f, pretext: l.pretext })
          : t('loopkeeper.draft.checkIn.plain', { person: f });
      case 'promise':
        return t('loopkeeper.draft.promise', { person: f, promise: l.promise || topic });
      case 'coffee':
        return t('loopkeeper.draft.coffee', { person: f, day: '[day]' });
      default:
        return null;
    }
  }

  generateDraft(l: Loop, tone: LoopTone = l.tone || 'short'): string {
    l.tone = tone;
    // Localized wedge drafts first (short tone only) — see localizedShort.
    if (tone === 'short') {
      const loc = this.localizedShort(l);
      if (loc) return loc;
    }
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
          // 2026-08-27 CHAT LANGUAGE: polish must return the user's language.
          lang: userLang(this.translate),
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

  /** 2026-08-28 BUILD 130 (founder: ZEITGARNIK RESOLUTION — "fired and
   *  forgotten, mind free"): SENDING IS THE CLOSE. The moment the user
   *  dispatches — any channel — the loop closes. No "awaiting reply" limbo
   *  keeping the mind on a dynamic outside their control. If their reply
   *  lands, the signal sweep raises a FRESH loop (the next prompt); this one
   *  rests, silent, with its receipt. */
  markSent(id: string, channel: LoopChannel, snippet: string, doneMeans?: 'reply-needed' | 'closed'): void {
    const l = this.cache?.find(x => x.id === id);
    if (!l) return;
    l.receipt = { sentAt: Date.now(), channel, snippet: snippet.slice(0, 160), doneMeans: 'closed' };
    l.nextNudgeAt = undefined;
    if (l.status !== 'closed') { l.status = 'closed'; l.closedAt = Date.now(); }
    this.touch(l);
    void this.persist();
    this.analytics.track('message_sent');
    this.analytics.track('loop_closed', { mode: 'sent' });
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

  /**
   * Deep-link builders (6). Draft ALWAYS lands on the clipboard too.
   * 2026-08-25 CHANNEL COMPLETION: per-channel handle handling — the old
   * global digits-strip corrupted LinkedIn profile URLs before use.
   */
  buildSend(channel: LoopChannel, l: Loop): { url?: string; copyText: string; label: string } {
    const enc = encodeURIComponent(l.draft);
    const raw = (l.handle || '').trim();
    switch (channel) {
      case 'whatsapp': {
        const digits = raw.replace(/\D/g, '');
        // Known number -> wa.me deep link; none -> share-style link that STILL carries the text.
        return { url: digits ? `https://wa.me/${digits}?text=${enc}` : `https://api.whatsapp.com/send?text=${enc}`, copyText: l.draft, label: 'WhatsApp' };
      }
      case 'sms':
        return { url: `sms:${raw.replace(/[^\d+]/g, '')}?body=${enc}`, copyText: l.draft, label: 'SMS' };
      case 'email':
        return { url: `mailto:${raw}?subject=${encodeURIComponent('Re: ' + (l.summary || 'Hello'))}&body=${enc}`, copyText: l.draft, label: 'Email' };
      case 'linkedin': {
        // LinkedIn exposes NO prefilled-message URL scheme. Honest best path:
        // land on the RIGHT surface with the draft already clipped.
        //   stored profile URL -> open it (Message is one tap away)
        //   otherwise          -> people-search preloaded with the person's name
        const isUrl = /^https?:\/\//i.test(raw);
        return {
          url: isUrl ? raw : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(l.person || '')}`,
          copyText: l.draft,
          label: isUrl ? 'LinkedIn · profile' : 'LinkedIn · find them',
        };
      }
      case 'voice': {
        // Real voice sends go through the RECORDER (component layer). This
        // branch is only ever the outline fallback for the clipboard.
        return { url: undefined, copyText: l.voiceOutline || this.voiceOutline(l), label: 'Voice note' };
      }
    }
  }
}
