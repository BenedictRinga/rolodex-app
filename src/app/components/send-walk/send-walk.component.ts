import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Loop, LoopChannel, LoopKind, LoopsService } from '../../services/loops/loops.service';
import { KeeperAgentService } from '../../services/agents/keeper-agent.service';
import { AnalyticsService } from '../../services/analytics/analytics.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { SoundService } from '../../services/sound/sound.service';
import { DraftEngineService } from '../../services/draft-engine/draft-engine.service';

/**
 * 2026-08-31 BUILD 158 — THE SEND WALK.
 *
 * Psychological frame (do not "improve" past this):
 *   Zeigarnik — an unfinished follow-up holds a tab open in the head.
 *   The walk names it, writes it, and SHUTS the tab. Send is the close.
 *   Chronic prevaricator, form-phobic: they postpone calls, replies, promises.
 *   One person. One decision. Tap before type. No field staring at them.
 *   The engine decides; the user confirms. The old Loops shelf is packed,
 *   not deleted, behind "I'm good" / "Smooth".
 */
@Component({
  selector: 'app-send-walk',
  templateUrl: './send-walk.component.html',
  styleUrls: ['./send-walk.component.scss'],
  standalone: false,
})
export class SendWalkComponent implements OnInit, OnChanges {
  @Input() contacts: any[] = [];
  @Output() shelfRequest = new EventEmitter<void>();
  @Output() loopsChanged = new EventEmitter<void>();
  @Output() contactsDirty = new EventEmitter<void>();
  @Output() loopOpened = new EventEmitter<string>();
  @Output() stepChange = new EventEmitter<number>();
  /** 2026-08-31 BUILD 159: the third "Not this one" on demo people channels
   *  the add icon — the inbox re-emits it, home opens the device picker. */
  @Output() addRequest = new EventEmitter<void>();

  /** 1 who · 2 thing · 3 words · 4 tap · 5 off-your-mind */
  step = 1;

  /** One-at-a-time Who queue: today's three first, then the deck. */
  private queue: Array<{ contact: any; loop?: Loop }> = [];
  whoIndex = 0;

  armedContact: any = null;
  loop: Loop | null = null;
  private backOfStep3: 1 | 2 = 2;

  whatInput = '';
  lineOpen = false; // form-phobic: the line does not stare; they ask for it
  busy = false;
  editingWords = false;
  editBuffer = '';
  polishing = false;
  moreOpen = false;
  doneLabel = 'Sent';

  /** 2026-08-31 BUILD 159 (founder): the demo's MINE door. A first-timer's
   *  Who queue is demo names; we let them walk one all the way to the Send
   *  stage — no interruption — and THERE the walk shows the big rounded MINE
   *  tile (styled like the Who card). Tapping it returns to slide 1 elegantly,
   *  then opens their device Contact Picker; the pick lands back as the Who
   *  card, past the sort trap (a fresh pick has no lastInteraction yet, so
   *  the dated demo filler would otherwise outrank it). */
  private preWalkRealIds: Set<string> | null = null;
  private pendingFreshIds: string[] | null = null;

  readonly chips: Array<{ kind: LoopKind; key: string }> = [
    { kind: 'owed-reply', key: 'loopkeeper.walk.chipReply' },
    { kind: 'promise', key: 'loopkeeper.walk.chipPromise' },
    { kind: 'check-in', key: 'loopkeeper.walk.chipCheckin' },
  ];

  constructor(
    private loops: LoopsService,
    private keeper: KeeperAgentService,
    private analytics: AnalyticsService,
    private alerts: AlertsService,
    private sounds: SoundService,
    private translate: TranslateService,
    private draftEngine: DraftEngineService,
  ) {}

  tr(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  async ngOnInit(): Promise<void> {
    await this.rebuildWho();
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['contacts']) {
      this.absorbPicked(); // a channelled pick may have landed
      if (this.step === 1) void this.rebuildWho();
    }
  }

  private go(n: number): void {
    this.step = n;
    this.stepChange.emit(n);
  }

  /**
   * 2026-08-31 BUILD 159: the Contact Picker landed while home held the MINE
   * channel open — find what is NEW (home snapshotted the deck before the
   * picker opened) and let it lead the Who. Runs on every contacts change;
   * a no-op unless a pick actually arrived.
   */
  private absorbPicked(): void {
    if (this.preWalkRealIds === null) return;
    const pre = this.preWalkRealIds;
    this.preWalkRealIds = null;
    const fresh = (this.contacts || [])
      .map((c: any) => String(c?.contactId || ''))
      .filter((id) => id && !pre.has(id));
    if (!fresh.length) return;
    this.pendingFreshIds = fresh;
  }

  // ── Slide 1 · WHO ──────────────────────────────────────────────────────────

  private async rebuildWho(): Promise<void> {
    const picks = await this.loops.todaysThree();
    const seen = new Set<string>();
    const queue: Array<{ contact: any; loop?: Loop }> = [];

    const mark = (c: any) => {
      const id = String(c?.contactId || '').trim();
      const name = String(c?.name?.display || '').trim().toLowerCase();
      if (id) seen.add('id:' + id);
      if (name) seen.add('n:' + name);
    };
    const already = (c: any): boolean => {
      const id = String(c?.contactId || '').trim();
      const name = String(c?.name?.display || '').trim().toLowerCase();
      return (!!id && seen.has('id:' + id)) || (!!name && seen.has('n:' + name));
    };

    for (const l of picks) {
      const card = this.cardFor(l) || this.ghostFromLoop(l);
      queue.push({ contact: card, loop: l });
      mark(card);
    }

    const deck = (this.contacts || []).filter((c: any) => String(c?.name?.display || '').trim());
    deck.sort((a: any, b: any) => this.tsMs(b?.lastInteraction) - this.tsMs(a?.lastInteraction));
    for (const c of deck) {
      if (already(c)) continue;
      queue.push({ contact: c, loop: this.openLoopFor(c) });
      mark(c);
    }

    this.queue = queue;
    if (this.pendingFreshIds?.length) {
      // BUILD 159: the person they pulled from their own device LEADS, whatever
      // the sort says — a fresh pick carries no lastInteraction yet, so the
      // dated demo filler would otherwise outrank them on their own screen.
      const ids = new Set(this.pendingFreshIds);
      const front = queue.filter((q) => ids.has(String(q.contact?.contactId || '')));
      const rest = queue.filter((q) => !ids.has(String(q.contact?.contactId || '')));
      this.queue = [...front, ...rest];
      this.pendingFreshIds = null;
      this.whoIndex = 0;
      return;
    }
    if (this.whoIndex >= this.queue.length) this.whoIndex = 0;
  }

  get who(): { contact: any; loop?: Loop } | null {
    return this.queue[this.whoIndex] || null;
  }

  get whoName(): string {
    return String(this.who?.contact?.name?.display || this.who?.loop?.person || '').trim()
      || this.tr('loopkeeper.t.them');
  }

  get canSkip(): boolean { return this.queue.length > 1; }

  whisper(): string {
    const item = this.who;
    if (!item) return '';
    const l = item.loop;
    const n = l ? this.loops.daysSitting(l) : this.daysSince(item.contact?.lastInteraction);
    if (l?.promise) return this.tr('loopkeeper.walk.promised', { thing: l.promise, n });
    if (l?.whySitting) return this.tr('loopkeeper.walk.whyDays', { why: l.whySitting, n });
    if (n > 0) return this.tr('loopkeeper.walk.quietDays', { n });
    return this.whereOf(item.contact);
  }

  avatarOf(c: any): string {
    if (c?.image?.base64String) return c.image.base64String;
    const name = String(c?.name?.display || c?.nickname || '?');
    const initials = name.split(/\s+/).filter(Boolean).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
    const palette = ['#FFD93D', '#4f6df5', '#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'];
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const color = palette[h % palette.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="18" fill="${color}"/><text x="48" y="60" font-family="system-ui,sans-serif" font-size="34" font-weight="600" fill="#ffffff" text-anchor="middle">${initials}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /** Confirm the one person on screen. */
  confirmWho(): void {
    const item = this.who;
    if (!item) return;
    if (item.loop) {
      this.pickLoop(item.loop, item.contact);
      return;
    }
    // 2026-08-31 BUILD 159: confirming a REAL person is the moment their list
    // has begun — logged once ever per device, whatever door it came through.
    if (!item.contact?.isMockData) void this.analytics.trackListStartedOnce('walk');
    this.armedContact = item.contact;
    this.whatInput = '';
    this.lineOpen = false;
    this.backOfStep3 = 2;
    this.go(2);
  }

  /** Not this one — the next of today's three, then the next contact. One card. */
  notThisOne(): void {
    if (this.queue.length < 2) return;
    this.whoIndex = (this.whoIndex + 1) % this.queue.length;
  }

  /** The armed person is a demo identity — the Send stage shows the MINE door. */
  get armedIsDemo(): boolean {
    return !!this.armedContact?.isMockData;
  }

  /**
   * 2026-08-31 BUILD 159 (founder): MINE. A first-timer has walked a demo name
   * all the way to the Send stage — the walk's last slide holds the big
   * rounded MINE tile. Tapping it returns to slide 1, elegantly — state
   * cleared, the Who rebuilt — and THEN their own device speaks: home opens
   * the Contact Picker, and whatever they pick lands back here as the Who
   * card. The practice loop stays (honest storage); nothing is destroyed.
   */
  mine(): void {
    this.loop = null;
    this.armedContact = null;
    this.whatInput = '';
    this.lineOpen = false;
    this.editingWords = false;
    this.moreOpen = false;
    this.preWalkRealIds = new Set(
      (this.contacts || []).map((c: any) => String(c?.contactId || '')).filter(Boolean),
    );
    void this.rebuildWho();
    this.go(1);
    this.addRequest.emit();
  }

  pickLoop(l: Loop, contact?: any): void {
    this.loop = l;
    this.armedContact = contact || this.cardFor(l);
    this.backOfStep3 = 1;
    this.loopOpened.emit(l.id);
    this.enterWords(false);
  }

  /**
   * A nudge (or chat handoff) arrives with a loop armed — skip Who, land on
   * the words. Same doors as confirming by hand.
   */
  armFromNudge(contact: any | null, loopId?: string): void {
    const byId = loopId ? this.loops.getLoop(loopId) : undefined;
    if (byId && byId.status === 'open') {
      this.pickLoop(byId, contact || this.cardFor(byId));
      return;
    }
    if (contact) {
      const open = this.openLoopFor(contact);
      if (open) { this.pickLoop(open, contact); return; }
      this.armedContact = contact;
      this.whatInput = '';
      this.lineOpen = false;
      this.backOfStep3 = 2;
      this.go(2);
    }
  }

  backToWho(): void {
    this.loop = null;
    this.armedContact = null;
    this.whatInput = '';
    this.lineOpen = false;
    this.editingWords = false;
    this.moreOpen = false;
    void this.rebuildWho();
    this.go(1);
  }

  // ── Slide 2 · THE THING ────────────────────────────────────────────────────

  armedName(): string {
    return String(this.armedContact?.name?.display || '').trim() || this.tr('loopkeeper.t.them');
  }

  openLine(): void { this.lineOpen = true; }

  /** Tap a chip — the loop is born, structured. Chime #1. */
  chipTap(kind: LoopKind): void {
    if (this.busy || !this.armedContact) return;
    const c = this.armedContact;
    const summary = this.whatInput.trim();
    const promise = kind === 'promise' ? (this.loops.extractPromiseFromContact(c) || summary || undefined) : undefined;
    this.loop = this.loops.create({
      person: this.armedName(),
      kind,
      summary,
      stance: kind === 'owed-reply' ? 'overdue-apology' : 'warm',
      direction: 'mine',
      sourceContactId: String(c?.contactId || '') || undefined,
      relation: this.whereOf(c) || undefined,
      lastTouchAt: this.tsMs(c?.lastInteraction) || undefined,
      promise,
    });
    this.whatInput = '';
    this.enterWords(true);
  }

  /** Optional line, Enter commits — parseCapture with the armed contact. */
  commitWhat(): void {
    const sentence = this.whatInput.trim();
    if (!sentence || this.busy) return;
    this.busy = true;
    try {
      const contact = this.armedContact || undefined;
      this.loop = this.loops.create(this.loops.parseCapture(sentence, contact));
      this.whatInput = '';
      this.enterWords(true);
    } finally {
      this.busy = false;
    }
  }

  onWhatEnter(ev: KeyboardEvent): void {
    if (ev.shiftKey) return;
    ev.preventDefault();
    this.commitWhat();
  }

  private enterWords(chimed: boolean): void {
    this.editingWords = false;
    this.moreOpen = false;
    this.go(3);
    if (chimed) void this.sounds.playLoopCapture();
    setTimeout(() => void this.sounds.playLoopReady(), chimed ? 420 : 0);
  }

  // ── Slide 3 · THE WORDS ────────────────────────────────────────────────────

  sel(): Loop | null { return this.loop ? this.loops.getLoop(this.loop.id) ?? this.loop : null; }

  setTone(t: 'short' | 'honest' | 'light'): void {
    const l = this.sel(); if (!l) return;
    this.loops.update(l.id, { tone: t, draft: this.loops.generateDraft(l, t) });
  }

  /** "Try again" is the AI polish — one tap, the device draft stands on failure. */
  async retry(): Promise<void> {
    const l = this.sel(); if (!l || this.polishing) return;
    this.polishing = true;
    try {
      void this.analytics.track('loop_draft_ai_polish');
      const env = await this.keeper.polish(l);
      if (env.ok && env.output) {
        void this.sounds.playLoopReady();
      } else {
        void this.alerts.showToast(this.tr('loopkeeper.t.polishErr'), 2200);
      }
    } finally {
      this.polishing = false;
    }
  }

  startEdit(): void {
    const l = this.sel(); if (!l) return;
    this.editBuffer = l.draft;
    this.editingWords = true;
  }

  saveEdit(): void {
    const l = this.sel(); if (!l) return;
    const v = this.editBuffer.trim();
    if (v) this.loops.update(l.id, { draft: v });
    this.editingWords = false;
  }

  toTap(): void {
    if (!this.sel()) return;
    this.moreOpen = false;
    this.go(4);
  }

  backFromWords(): void {
    if (this.backOfStep3 === 1) { this.backToWho(); return; }
    this.go(2);
  }

  backFromTap(): void { this.go(3); }

  // ── Slide 4 · THE TAP ──────────────────────────────────────────────────────

  phoneOf(): string {
    const l = this.sel();
    const card = l ? this.cardFor(l) : this.armedContact;
    return String(l?.handle || card?.phones?.[0]?.number || card?.phone || '').trim();
  }

  emailOf(): string {
    const l = this.sel();
    const card = l ? this.cardFor(l) : this.armedContact;
    return String(card?.emails?.[0]?.address || card?.email || '').trim();
  }

  get hasPhone(): boolean { return !!this.phoneOf(); }
  get hasEmail(): boolean { return !!this.emailOf(); }

  /** say hi → the thing → land it soft. Same words, spoken shape. */
  callBeats(): { hi: string; thing: string; soft: string } {
    const l = this.sel();
    const f = (l?.person || '').split(' ')[0] || this.tr('loopkeeper.t.them');
    const thing = (l?.summary || l?.draft || '').split('\n')[0].trim()
      || this.tr('loopkeeper.walk.beatThing');
    return {
      hi: `${f}.`,
      thing,
      soft: this.tr('loopkeeper.walk.beatSoftLine'),
    };
  }

  toggleMore(): void { this.moreOpen = !this.moreOpen; }

  async fire(channel: LoopChannel): Promise<void> {
    const l = this.sel(); if (!l || this.busy) return;
    this.busy = true;
    try {
      if (channel === 'email') {
        const em = this.emailOf();
        if (em && em !== l.handle) this.loops.update(l.id, { handle: em });
      } else if (channel !== 'copy') {
        const ph = this.phoneOf();
        if (ph && ph !== l.handle) this.loops.update(l.id, { handle: ph });
      }
      const fresh = this.loops.getLoop(l.id) || l;
      const bundle = this.loops.buildSend(channel, fresh);
      try { await navigator.clipboard.writeText(bundle.copyText); } catch { /* clipboard denied */ }
      if (bundle.url) {
        window.open(bundle.url, bundle.url.startsWith('tel:') ? '_self' : '_blank', 'noopener');
      }
      const snippet = channel === 'call' ? 'Phone call'
        : channel === 'copy' ? 'Copied to clipboard'
        : (fresh.draft || '');
      this.loops.markSent(fresh.id, channel, snippet);
      const card = this.cardFor(fresh) || this.armedContact;
      if (card) {
        this.draftEngine.pushContext(card, `${channel === 'copy' ? 'Copied the words out' : 'Sent via ' + bundle.label} (${new Date().toLocaleDateString()})`);
        card.lastInteraction = new Date();
        this.contactsDirty.emit();
      }
      this.doneLabel = bundle.label;
      this.go(5);
      void this.sounds.playCompletionChime(0.35);
      this.loopsChanged.emit();
      if (channel === 'copy') void this.alerts.showToast(this.tr('loopkeeper.walk.tCopied'), 3200);
    } finally {
      this.busy = false;
    }
  }

  nextOne(): void {
    this.loop = null;
    this.armedContact = null;
    this.whatInput = '';
    this.lineOpen = false;
    this.editingWords = false;
    this.moreOpen = false;
    this.doneLabel = 'Sent';
    this.whoIndex = 0;
    void this.rebuildWho();
    this.go(1);
  }

  imGood(): void {
    this.shelfRequest.emit();
  }

  // ── card glue (view-layer only; inbox keeps its copy for the packed shelf)

  private ghostFromLoop(l: Loop): any {
    return { name: { display: l.person }, contactId: l.sourceContactId || '' };
  }

  private cardFor(l: Loop): any | null {
    if (l.sourceContactId) {
      const byId = (this.contacts || []).find((c: any) => String(c?.contactId || '') === String(l.sourceContactId));
      if (byId) return byId;
    }
    const target = String(l.person || '').trim().toLowerCase();
    if (!target) return null;
    return (this.contacts || []).find((c: any) => {
      const name = String(c?.name?.display || '').trim().toLowerCase();
      if (!name) return false;
      return name === target || name.includes(target) || target.includes(name);
    }) || null;
  }

  private openLoopFor(c: any): Loop | undefined {
    const target = String(c?.name?.display || '').trim().toLowerCase();
    if (!target) return undefined;
    const mine = this.loops.openMine();
    return mine.find(l => String(l.person || '').trim().toLowerCase() === target)
      || mine.find(l => {
        const p = String(l.person || '').trim().toLowerCase();
        return !!p && (p.includes(target) || target.includes(p));
      });
  }

  private whereOf(c: any): string {
    return String(c?.rolodex?.where || c?.rolodex?.who || c?.rolodex?.topic || '').trim();
  }

  private tsMs(v: any): number {
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v) return Date.parse(v) || 0;
    return 0;
  }

  private daysSince(v: any): number {
    const ms = this.tsMs(v);
    if (!ms) return 0;
    return Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));
  }
}
