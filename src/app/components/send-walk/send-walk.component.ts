import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Loop, LoopChannel, LoopKind, LoopsService } from '../../services/loops/loops.service';
import { KeeperAgentService } from '../../services/agents/keeper-agent.service';
import { AnalyticsService } from '../../services/analytics/analytics.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { SoundService } from '../../services/sound/sound.service';
import { DraftEngineService } from '../../services/draft-engine/draft-engine.service';

/**
 * 2026-08-30 BUILD 157 — THE SEND WALK (founder: pack the shelf, don't delete it).
 *
 * Four slides, ONE decision each, for the chronic prevaricator (form-phobic —
 * tap before type; the only typing in the whole walk is one optional line):
 *
 *   1 WHO    — taps into the deck: the deck IS the population. The engine's
 *              due loops float on top as picks; a final choice populates the
 *              loop entry (card linkage, relation, last touch) for future context.
 *   2 THING  — three tap-first intentions + one optional rough line. The loop
 *              is born here (chime #1).
 *   3 WORDS  — already written. Read once. Tones / retry / AI polish / quiet
 *              edit. "Send as is" is the primary (chime #2 answered on entry).
 *   4 TAP    — Call (with the 20-second plan) / WhatsApp / Copy — one tap, and
 *              SEND IS THE CLOSE. Then the breath: "Off your mind."
 *
 * Engine surfaces stay single-source: LoopsService (capture/draft/buildSend/
 * markSent), the Keeper (polish), SoundService (chimes). The glue duplicated
 * here (cardFor/loopPhone/noteCard) is view-layer only — the inbox keeps its
 * copy for the packed shelf.
 */
@Component({
  selector: 'app-send-walk',
  templateUrl: './send-walk.component.html',
  styleUrls: ['./send-walk.component.scss'],
  standalone: false,
})
export class SendWalkComponent implements OnInit {
  @Input() contacts: any[] = [];
  @Output() shelfRequest = new EventEmitter<void>();      // "I'm good" — open the packed shelf
  @Output() loopsChanged = new EventEmitter<void>();      // the badge + lists must follow
  @Output() contactsDirty = new EventEmitter<void>();     // a dispatch wrote into the card
  @Output() loopOpened = new EventEmitter<string>();      // a pick was opened — acknowledge its nudge

  /** 1 who · 2 thing · 3 words · 4 tap · 5 off-your-mind */
  step = 1;
  picks: Loop[] = [];
  armedContact: any = null;
  loop: Loop | null = null;
  private backOfStep3: 1 | 2 = 2; // slide 3's back arrow depends on how we arrived

  whatInput = '';
  busy = false;

  chips: Array<{ kind: LoopKind; key: string; promise?: string }> = [];

  editingWords = false;
  editBuffer = '';
  polishing = false;

  callOpen = false;
  moreOpen = false;

  walkFilter = '';
  showAllPeople = false;

  readonly toneRow: Array<{ id: 'short' | 'honest' | 'light' | 'formal'; key: string }> = [
    { id: 'short', key: 'loopkeeper.walk.toneShort' },
    { id: 'honest', key: 'loopkeeper.walk.toneHonest' },
    { id: 'light', key: 'loopkeeper.walk.toneLight' },
    { id: 'formal', key: 'loopkeeper.walk.toneFormal' },
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
    await this.loadPicks();
  }

  private async loadPicks(): Promise<void> {
    this.picks = await this.loops.todaysThree();
  }

  // ── Slide 1 · WHO ───────────────────────────────────────────────────────────

  /** The engine's whisper under a pick: the loop's own reason, or the quiet days. */
  whisperFor(l: Loop): string {
    return l.whySitting || this.tr('loopkeeper.walk.quietDays', { n: this.loops.daysSitting(l) });
  }

  /** A deck row's one quiet descriptor — where you know them from. */
  whereOf(c: any): string {
    return String(c?.rolodex?.where || c?.rolodex?.who || c?.rolodex?.topic || '').trim();
  }

  get people(): any[] {
    const q = this.walkFilter.trim().toLowerCase();
    const ms = (v: any): number => v instanceof Date ? v.getTime()
      : typeof v === 'number' ? v
      : (typeof v === 'string' && v ? (Date.parse(v) || 0) : 0);
    const list = (this.contacts || []).filter((c: any) => {
      const n = String(c?.name?.display || '').trim();
      return !!n && (!q || n.toLowerCase().includes(q));
    });
    list.sort((a: any, b: any) => ms(b?.lastInteraction) - ms(a?.lastInteraction));
    return this.showAllPeople ? list : list.slice(0, 30);
  }

  get peopleCount(): number {
    const q = this.walkFilter.trim().toLowerCase();
    return (this.contacts || []).filter((c: any) => {
      const n = String(c?.name?.display || '').trim();
      return !!n && (!q || n.toLowerCase().includes(q));
    }).length;
  }

  /** The matcher is the inbox's own cardFor matcher — exact first, then containment. */
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

  /** Picking a loop pick → the words are already there. Straight to slide 3. */
  pickLoop(l: Loop): void {
    this.loop = l;
    this.armedContact = this.cardFor(l);
    this.backOfStep3 = 1;
    this.step = 3;
    this.loopOpened.emit(l.id); // opening IS the answer to a nudge (build 128)
    void this.sounds.playLoopReady();
  }

  /** Picking a deck person → their open loop if one exists, otherwise the thing. */
  pickContact(c: any): void {
    const open = this.openLoopFor(c);
    if (open) { this.pickLoop(open); return; }
    this.armedContact = c || null;
    this.buildChips(c);
    this.whatInput = '';
    this.backOfStep3 = 2;
    this.step = 2;
  }

  /**
   * 2026-08-30 BUILD 157: a nudge (or the chat handoff) arrived while the walk
   * owns the Loops tab. The nudged loop — resolved by id, still open — goes
   * STRAIGHT AT THE WORDS (slide 3); a bare contact arms at the thing
   * (slide 2). Same doors as picking by hand; the nudge just skips the Who.
   */
  armFromNudge(contact: any | null, loopId?: string): void {
    const byId = loopId ? this.loops.getLoop(loopId) : undefined;
    if (byId && byId.status === 'open') { this.pickLoop(byId); return; }
    this.pickContact(contact || null);
  }

  backToWho(): void {
    this.step = 1;
    this.loop = null;
    this.armedContact = null;
    this.whatInput = '';
    this.chips = [];
    void this.loadPicks();
  }

  // ── Slide 2 · THE THING ─────────────────────────────────────────────────────

  /** Tap-first intentions, derived from what the card actually knows. */
  private buildChips(c: any): void {
    const chips: Array<{ kind: LoopKind; key: string; promise?: string }> = [];
    const promise = this.loops.extractPromiseFromContact(c);
    if (promise) chips.push({ kind: 'promise', key: 'loopkeeper.walk.chipPromise', promise });
    if (this.loops.cardSaysIOweReply(c)) chips.push({ kind: 'owed-reply', key: 'loopkeeper.walk.chipReply' });
    chips.push({ kind: 'check-in', key: 'loopkeeper.walk.chipCheckin' });
    this.chips = chips;
  }

  armedName(): string {
    return String(this.armedContact?.name?.display || '').trim() || this.tr('loopkeeper.t.them');
  }

  /** Chip → the loop is born, structured, no parsing needed. Chime #1. */
  chipTap(chip: { kind: LoopKind; promise?: string }): void {
    if (this.busy || !this.armedContact) return;
    const c = this.armedContact;
    this.loop = this.loops.create({
      person: this.armedName(),
      kind: chip.kind,
      summary: '',
      stance: chip.kind === 'owed-reply' ? 'overdue-apology' : 'warm',
      direction: 'mine',
      sourceContactId: String(c?.contactId || '') || undefined,
      relation: this.whereOf(c) || undefined,
      lastTouchAt: this.tsMs(c?.lastInteraction) || undefined,
      promise: chip.promise,
    });
    this.enterWords(true);
  }

  /** The rough line — one sentence, parsed like the shelf capture (armed contact wins). */
  commitWhat(): void {
    const sentence = this.whatInput.trim();
    if (!sentence || this.busy) return;
    this.busy = true;
    try {
      const contact = this.armedContact || undefined;
      const pre = this.loops.parseCapture(sentence);
      this.loop = this.loops.create(contact ? this.loops.parseCapture(sentence, contact) : pre);
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

  /** chime #1 on the birth, chime #2 when the words appear (the app's answer). */
  private enterWords(chimed: boolean): void {
    this.step = 3;
    this.editingWords = false;
    this.callOpen = false;
    this.moreOpen = false;
    if (chimed) void this.sounds.playLoopCapture();
    setTimeout(() => void this.sounds.playLoopReady(), chimed ? 420 : 0);
  }

  // ── Slide 3 · THE WORDS ─────────────────────────────────────────────────────

  sel(): Loop | null { return this.loop ? this.loops.getLoop(this.loop.id) ?? this.loop : null; }

  setTone(t: 'short' | 'honest' | 'light' | 'formal'): void {
    const l = this.sel(); if (!l) return;
    this.loops.update(l.id, { tone: t, draft: this.loops.generateDraft(l, t) });
  }

  retry(): void {
    const l = this.sel(); if (!l) return;
    this.loops.update(l.id, { draft: this.loops.generateDraft(l, l.tone), pretext: this.loops.suggestPretext(l) });
  }

  async polish(): Promise<void> {
    const l = this.sel(); if (!l || this.polishing) return;
    this.polishing = true;
    try {
      void this.analytics.track('loop_draft_ai_polish'); // same act as the shelf's polish (parity)
      const env = await this.keeper.polish(l);
      if (env.ok && env.output) {
        void this.sounds.playLoopReady(); // the Assistant answered — same voice as the shelf
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
    const l = this.sel(); if (!l) return;
    this.step = 4;
    this.callOpen = false;
    this.moreOpen = false;
  }

  backFromWords(): void {
    if (this.backOfStep3 === 1) { this.backToWho(); return; }
    this.step = 2;
  }

  // ── Slide 4 · THE TAP ───────────────────────────────────────────────────────

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

  private tsMs(v: any): number | undefined {
    const ms = v instanceof Date ? v.getTime()
      : typeof v === 'number' ? v
      : (typeof v === 'string' && v ? (Date.parse(v) || 0) : 0);
    return ms > 0 ? ms : undefined;
  }

  /** BUILD 150 parity: the card speaks first — a number is never typed. */
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

  get callPlan(): string {
    const l = this.sel();
    return l ? this.loops.voiceOutline(l) : '';
  }

  toggleMore(): void { this.moreOpen = !this.moreOpen; }
  openCallPlan(): void { this.callOpen = true; }
  closeCallPlan(): void { this.callOpen = false; }

  /** One tap = clipboard-always + the deep link + SEND IS THE CLOSE. */
  async fire(channel: LoopChannel): Promise<void> {
    const l = this.sel(); if (!l || this.busy) return;
    this.busy = true;
    try {
      // remember the handle the card offered (build 150: the card speaks first)
      if (channel === 'email') {
        const em = this.emailOf();
        if (em && em !== l.handle) this.loops.update(l.id, { handle: em });
      } else if (channel !== 'copy') {
        const ph = this.phoneOf();
        if (ph && ph !== l.handle) this.loops.update(l.id, { handle: ph });
      }
      const fresh = this.loops.getLoop(l.id) || l;
      const bundle = this.loops.buildSend(channel, fresh);
      try { await navigator.clipboard.writeText(bundle.copyText); } catch { /* clipboard denied — url still carries text */ }
      if (bundle.url) {
        // tel: must leave via _self (PWA deep-link parity with the shelf's callContact)
        window.open(bundle.url, bundle.url.startsWith('tel:') ? '_self' : '_blank', 'noopener');
      }
      const snippet = channel === 'call' ? 'Phone call'
        : channel === 'copy' ? 'Copied to clipboard'
        : (fresh.draft || '');
      this.loops.markSent(fresh.id, channel, snippet);
      const card = this.cardFor(fresh);
      if (card) {
        this.draftEngine.pushContext(card, `${channel === 'copy' ? 'Copied the words out' : 'Sent via ' + bundle.label} (${new Date().toLocaleDateString()})`);
        card.lastInteraction = new Date();
        this.contactsDirty.emit();
      }
      this.doneLabel = bundle.label;
      this.step = 5;
      void this.sounds.playCompletionChime(0.35);
      this.loopsChanged.emit();
      if (channel === 'copy') void this.alerts.showToast(this.tr('loopkeeper.walk.tCopied'), 3200);
    } finally {
      this.busy = false;
    }
  }

  doneLabel = 'Sent';

  // ── The breath (5) ──────────────────────────────────────────────────────────

  nextOne(): void {
    this.step = 1;
    this.loop = null;
    this.armedContact = null;
    this.whatInput = '';
    this.chips = [];
    this.doneLabel = 'Sent';
    void this.loadPicks();
  }

  imGood(): void {
    this.shelfRequest.emit(); // "I'm good" — the packed shelf, no cues
  }
}
