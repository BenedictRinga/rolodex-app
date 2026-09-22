import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalController, AlertController } from '@ionic/angular';
import { CardChatModalComponent } from '../card-chat-modal/card-chat-modal.component';
import { CardChatService } from '../../services/card-chat/card-chat.service';
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
  // 2026-09-20 BUILD 278 THE FIRST MINUTE, IN THE FLOW: when home says this
  // device is untouched, slide 1 carries the first-minute panel instead of
  // the Who card — same ambience, the doors plug into the existing flows.
  @Input() firstMinute = false;
  /** 2026-09-22 BUILD 308 THE TWO PHASES: relayed from home — PHASE RING
   *  (the two avoidance doors, sealed on every visit until tap-and-continue)
   *  then PHASE PANEL (the original first view, intact, after the ring is
   *  surmounted). */
  @Input() fmPhase: 'ring' | 'panel' = 'ring';
  /** The tap on the PANEL phase's doors — the panel retires for the visit
   *  (the 278/281 law); the deed in onContactsDirty flips the done flag. */
  @Output() firstMinuteDeed = new EventEmitter<void>();
  /** 2026-09-22 BUILD 295 THE GATE HELD (founder: 'State must remain same
   *  always, even if page reloads, until first-time user takes action on
   *  that... That is the fundamental entry fee. They must do something at
   *  that first gate - the cover'): the AVOIDANCE door tap IS the
   *  engagement — home PERSISTS the gate-passed state so no reload and no
   *  later visit can resurrect the cover. The per-visit retirement
   *  (firstMinuteDeed) stays for the demoted TASK/PERSON taps only. */
  @Output() firstMinuteEntry = new EventEmitter<void>();
  /** BUILD 279: the demo view opened/closed inside the panel — relayed up so
   *  home can hide the lower sections and give the Inbox the full screen. */
  @Output() demoView = new EventEmitter<boolean>();
  @Output() shelfRequest = new EventEmitter<void>();
  @Output() loopsChanged = new EventEmitter<void>();
  @Output() contactsDirty = new EventEmitter<void>();
  @Output() loopOpened = new EventEmitter<string>();
  @Output() stepChange = new EventEmitter<number>();
  /** 2026-08-31 BUILD 159: the third "Not this one" on demo people channels
   *  the add icon — the inbox re-emits it, home opens the device picker. */
  @Output() addRequest = new EventEmitter<void>();
  /** 2026-09-01 BUILD 179 (founder: "Who's on your mind should present them
   *  the same agnostic interface shown by the add icon, all the way to the
   *  iPhone mitigations"): "Not this one" no longer opens a people-only
   *  chooser — it asks home for the ADD SHEET (two tabs, picker, .vcf, the
   *  iPhone ladder), and whatever comes back arms the walk. */
  @Output() whoRequest = new EventEmitter<void>();
  /** 2026-09-16 BUILD 218: LoopKeeper's own doors, handed to home — the
   *  invite (the OG-carded app link) and the manual Task card. */
  @Output() inviteRequest = new EventEmitter<void>();
  @Output() taskCardRequest = new EventEmitter<void>();
  /** 2026-09-16 BUILD 229 PHASE C: the task's Note-to-self door — the walk
   *  hands the CARD to home, which opens its surface (the contextRotation
   *  story). The walk stays on slide 4 beneath it. */
  @Output() noteRequest = new EventEmitter<any>();

  /** 2026-09-16 BUILD 218: the pick from the Who sheet lands AS the Who.
   *  Home relays it through the inbox; the walk brings it to slide 1 so
   *  the user sees "Yes, this one" before continuing the walk. */
  @Input() set walkArm(v: any) { if (v) this.armFromPick(v); }

  /** 2026-09-16 BUILD 224: the pick lands AS the Who — called DIRECTLY
   *  (home -> inboxRef.armWalkPick -> walkRef.armFromPick), no @Input
   *  relay to lose to change-detection timing. Slide 1, card on show. */
  armFromPick(v: any): void {
    if (!v) return;
    const id = String(v?.contactId || '').trim();
    if (id) this.retiredIds.delete(id);
    // BUILD 244: a fresh pick is a NEW subject — no stale loop or handle from
    // the walk in progress rides with it (242), and the takeover is ONE
    // synchronous field write; no queue surgery for a rebuild to outrank.
    this.loop = null;
    this.armedHandle = '';
    this.select(v, undefined);
    this.queue = [{ contact: v }, ...this.queue.filter((q) => String(q.contact?.contactId || '') !== id)];
    this.whoIndex = 0;
    this.go(1);
  }

  /** BUILD 218: subjects the user sent or rejected this session do not
   *  resurface — the walk advances instead of falling back to the top. */
  private retiredIds = new Set<string>();
  private retiredNames = new Set<string>();

  // ── 2026-09-17 BUILD 257 THE TASK COMPLEMENT (Grok's spec, founder: "we
  // need to see through eyes of first-timer"): Alpha births a task card IN
  // PLACE — the same Who slot, the same .sw-card box, flip to name it, save,
  // tap to start the loop. No modal, no list builder: naming the postponed
  // act, not inventory. The full create form stays Beta's (the add sheet).
  taskDraft: 'off' | 'face' | 'back' = 'off';
  private prevWhoSnap: { contact: any; loop?: Loop } | null = null;
  taskTitle = '';
  taskDue = '';      // yyyy-mm-dd from the native date field
  // 2026-09-18 BUILD 259 THE TIME ELEMENT (founder: "my title was morning
  // run, and I doubt it is convenient if LoopKeeper brings it up at 3 pm"):
  // the when-field gains an hour — default 09:00 (the wake-ping hour), the
  // user's own "morning run" rides the hour they choose.
  taskTime = '09:00';
  taskCadence: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly';
  readonly taskCadences: Array<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'> = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

  get taskDraftOn(): boolean { return this.taskDraft !== 'off'; }

  cadenceLabel(c: string): string { return this.tr('loopkeeper.task.' + c); }

  /** 2026-09-22 BUILD 297 THE RETURN TO COVER: the legacy PERSON door is not
   *  an avoidance door — it clears any pending avoidance branding before it
   *  opens the SAME add sheet, so a bounced reply-door tap can never brand a
   *  later pick owed-reply. The sheet floats OVER the cover; an empty
   *  dismissal leaves the cover standing, untouched. */
  personDoor(): void {
    if (this.firstMinute) this.firstMinuteDeed.emit(); // 307: the door tap lifts the ring
    this.avoidKind = null;
    this.whoRequest.emit();
  }

  /** Remember the previous Who (Cancel restores it) and put the blank card
   *  in the Who slot — no modal, no taskCardRequest, no layout jump. */
  beginTaskDraft(): void {
    if (this.taskDraftOn) return;
    // 2026-09-22 BUILD 297 THE RETURN TO COVER (founder: 'Whichever door they
    // choose... there must be a return to cover in that next phase, which
    // return resets the gate'): the task draft HIDES the cover while it is
    // open (the *ngIf pair: firstMinute && !taskDraftOn / !firstMinute ||
    // taskDraftOn) — no latch at the tap; CANCEL brings the cover back RESET.
    // The legacy TASK door is not an avoidance door — clear the pending one.
    if (this.firstMinute) this.firstMinuteDeed.emit(); // 307: the door tap lifts the ring
    if (this.firstMinute) this.avoidKind = null;
    this.prevWhoSnap = this.selection ? { contact: this.selection.contact, loop: this.selection.loop } : null;
    this.taskTitle = '';
    this.taskDue = '';
    this.taskTime = '09:00';
    this.taskCadence = 'monthly';
    this.taskDraft = 'face';
    void this.analytics.track('task_card_started');
  }

  /** Tap the blank = flip, not start. There is nothing to start until it has
   *  a name — the only behavioural fork on Alpha, and only while unsaved. */
  flipTaskDraft(): void {
    this.taskDraft = this.taskDraft === 'face' ? 'back' : 'face';
  }

  /** Save writes a REAL deck card (kind:'task') and arms it as the Who with
   *  armFromPick (224's deterministic arm). NO auto-start: the saved card
   *  waits on slide 1 like every Who — the tap that starts the loop is the
   *  user's own "Yes, this one" beat (218). */
  saveTaskDraft(): void {
    const title = this.taskTitle.trim();
    if (title.length < 2) return;
    const card: any = {
      contactId: 'task-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: { display: title },
      kind: 'task',
      task: {
        cadence: this.taskCadence,
        // BUILD 259: the due epoch carries the user's own HOUR — a "morning
        // run" comes up in the morning (default 09:00, the wake-ping hour).
        ...(this.taskDue ? { due: new Date(this.taskDue + 'T' + (this.taskTime || '09:00') + ':00').getTime() } : {}),
      },
      isMockData: false,
    };
    this.contacts.unshift(card);
    this.contactsDirty.emit();
    // 2026-09-22 BUILD 297 THE RETURN TO COVER: the SAVED task card is a real
    // card's arrival — the journey has started; the cover retires (home
    // persists the gate state in the arrival path). The 278 deed signal
    // moves here from the tap, where it never belonged.
    if (this.firstMinute) this.firstMinuteDeed.emit();
    void this.analytics.track('task_card_saved', { source: 'alpha-walk' });
    void this.analytics.trackListStartedOnce('task');
    this.taskDraft = 'off';
    this.armFromPick(card);
  }

  /** Cancel (or Not this one while drafting) restores the previous Who —
   *  no half-saved card, nothing written. */
  cancelTaskDraft(): void {
    this.taskDraft = 'off';
    this.selection = this.prevWhoSnap;
    this.prevWhoSnap = null;
    // 2026-09-22 BUILD 294: a deliberate default clears the pending door.
    this.avoidKind = null;
  }

  private retire(c: any): void {
    const id = String(c?.contactId || '').trim();
    if (id) this.retiredIds.add(id);
    const nm = String(c?.name?.display || '').trim().toLowerCase();
    if (nm) this.retiredNames.add(nm);
  }

  private isRetired(c: any): boolean {
    const id = String(c?.contactId || '').trim();
    if (id && this.retiredIds.has(id)) return true;
    const nm = String(c?.name?.display || '').trim().toLowerCase();
    return !!nm && this.retiredNames.has(nm);
  }

  /** 1 who · 2 thing · 3 words · 4 tap · 5 off-your-mind */
  step = 1;

  /** One-at-a-time Who queue: today's three first, then the deck. */
  private queue: Array<{ contact: any; loop?: Loop }> = [];
  whoIndex = 0;

  /** 2026-09-17 BUILD 244 THE SELECTED CARD AS STATE (founder: "When pill is
   *  clicked, card changes immediately. So it is timing. Rather than be
   *  hostage to time, adopt deterministic coding"): the operational card is
   *  this FIELD, not a queue position. A selection (an escalation, a check-in
   *  tap, a garden pill, a sheet pick) sets it ONCE, synchronously, in the
   *  tap chain; the Who getter reads it FIRST; the default queue keeps being
   *  rebuilt underneath for slide-1 browsing and structurally CANNOT take the
   *  card back — no re-application, no rebuild-tail hook, no mount order to
   *  lose. Deliberate default returns clear it (Not this one / Next one /
   *  MINE / a genuinely empty payload); back keeps it (back returns to the
   *  selected card, b242). The pill click already proved the principle: a
   *  synchronous subject set always takes the card — this makes EVERY door
   *  exactly that synchronous. */
  private selection: { contact: any; loop?: Loop } | null = null;

  armedContact: any = null;
  // 2026-09-08 BUILD 182 THE GARDEN PATH: the walk can arm a HANDLE instead of
  // a deck card — a nickname the user invented ("Ma's doctor", "my decision",
  // "the school"), grown from their own loop history or typed fresh. A contact
  // stays first-class; the handle is the door for users who never sync one.
  armedHandle = '';
  garden: Array<{ handle: string; open: number }> = [];
  handleInput = '';
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
    // 2026-09-08 BUILD 181 THE SECRETARY SPREAD: the walk stays person-anchored
    // (slide 1 arms a contact), but two of its five intentions are now
    // task-shaped — the deferred decision, the place to show up. Subject-less
    // tasks (renew the insurance, pay the deposit) live on the shelf's free
    // capture, where no contact is needed at all.
    { kind: 'decide', key: 'loopkeeper.walk.chipDecide' },
    { kind: 'show-up', key: 'loopkeeper.walk.chipShowUp' },
  ];

  constructor(
    private loops: LoopsService,
    private keeper: KeeperAgentService,
    private analytics: AnalyticsService,
    private alerts: AlertsService,
    private sounds: SoundService,
    private translate: TranslateService,
    private draftEngine: DraftEngineService,
    private modalController: ModalController,
    private cardChat: CardChatService,
    private alertCtrl: AlertController,
  ) {}

  /** 2026-09-16 BUILD 219 THE INTERNAL DOOR (founder: "LoopKeeper has its
   *  own internal messaging (a chat interface)"): slide 4 opens the card's
   *  OWN chat thread — the same interface the card surface uses — for the
   *  armed subject, destination or not. It IS the coherent array's
   *  in-house path. */
  async openChat(): Promise<void> {
    const c = this.who?.contact;
    if (!c || this.busy) return;
    try {
      const thread = await this.cardChat.seedThread(c);
      const modal = await this.modalController.create({
        component: CardChatModalComponent,
        componentProps: {
          thread,
          sendeePhone: c?.phones?.[0]?.number || '',
          sendeePhones: (c?.phones || []).map((p: any) => p?.number).filter(Boolean),
          // 2026-09-18 BUILD 259 THE WORDS RIDE ALONG (founder: the "Here are
          // words" text "does not transport into LoopKeeper's chat"): the
          // accepted draft plumps into the chat composer — the modal already
          // had the prefill door; the walk just never passed it.
          prefill: this.scriptBody(),
        },
        cssClass: 'card-chat-modal-sheet',
        breakpoints: [0, 0.7, 0.95, 1],
        initialBreakpoint: 1,
        keyboardClose: false,
      });
      await modal.present();
    } catch { /* best effort */ }
  }

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
    // 2026-09-08 BUILD 182: the garden grows alongside the Who — pills from the
    // user's own loop history, whether or not a deck stands behind them.
    this.garden = this.loops.handleGarden();
    this.handleInput = '';
    const picks = await this.loops.todaysThree();
    const seen = new Set<string>();
    const queue: Array<{ contact: any; loop?: Loop }> = [];

    // 2026-09-01 BUILD 168 (founder): once ONE real person is on the deck,
    // loops minted from demo cards stop prompting in the walk. (Pure-demo
    // tour keeps them — there, demo IS the show.) The deck itself still
    // mixes for display while Demo is on, but a demo loop never leads.
    const realOnDeck = (this.contacts || []).some((c: any) => !(c as any)?.isMockData);
    const demoIds = new Set(
      (this.contacts || []).filter((c: any) => (c as any)?.isMockData)
        .map((c: any) => String(c?.contactId || '')).filter(Boolean),
    );

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
      if (realOnDeck && (
        demoIds.has(String((l as any)?.sourceContactId || '')) ||
        (card as any)?.isMockData
      )) continue;
      if (this.isRetired(card)) continue; // BUILD 218: sent/rejected this session
      queue.push({ contact: card, loop: l });
      mark(card);
    }

    const deck = (this.contacts || []).filter((c: any) => String(c?.name?.display || '').trim());
    deck.sort((a: any, b: any) => this.tsMs(b?.lastInteraction) - this.tsMs(a?.lastInteraction));
    for (const c of deck) {
      // 2026-09-20 BUILD 279b THE ROTATION RULE (founder: "a tap of Not this
      // one when real contacts exist cannot be rotating demo contacts. That
      // logic is somewhere, or was regressed"): with real cards on the deck,
      // demo cards NEVER enter the rotation — the same gate the pills loop
      // already had, now on the deck loop where the hole lived.
      if (realOnDeck && (c as any)?.isMockData) continue;
      if (already(c) || this.isRetired(c)) continue; // BUILD 218: retired skip
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
      // BUILD 242: NO early return — the held selection re-applies below,
      // after whatever the fresh ordering led with. The earlier return was the
      // hole where a pending device pick silently outranked the selection.
    }
    if (this.whoIndex >= this.queue.length) this.whoIndex = 0;
    // BUILD 244: nothing re-applies here — the Who getter reads `selection`
    // first, so the default queue this method builds is BROWSING ONLY. A
    // selection set by any door survives every rebuild by construction; the
    // 241/242 tail-reapplication (an order-dependent patch on this very
    // race) is retired with the race itself.
  }

  get who(): { contact: any; loop?: Loop } | null {
    // BUILD 244: the selected card IS the operational card, always — the
    // queue is only ever the default browsing list beneath it.
    return this.selection || this.queue[this.whoIndex] || null;
  }

  get whoName(): string {
    return String(this.who?.contact?.name?.display || this.who?.loop?.person || '').trim()
      || this.tr('loopkeeper.t.them');
  }

  /** BUILD 182: garden pills for slide 1 — the on-screen Who card is already
   *  offered above, so it never doubles as a pill.
   *  2026-09-17 BUILD 249 THE THREE-SEAT RULE: the garden offers at most
   *  THREE pills — the rest is a muted "+N more" line, not a serving. */
  private gardenCandidates(): Array<{ handle: string; open: number }> {
    const who = String(this.whoName || '').trim().toLowerCase();
    return this.garden.filter(g => g.handle && g.handle.toLowerCase() !== who);
  }

  get gardenPills(): Array<{ handle: string; open: number }> {
    return this.gardenCandidates().slice(0, 3);
  }

  get gardenMore(): number {
    return Math.max(0, this.gardenCandidates().length - 3);
  }

  // ── BUILD 182 · THE GARDEN PATH ────────────────────────────────────────────
  // Arm a handle (a garden pill, or one typed fresh). An open loop for that
  // subject — a PILL is a selection — lands ON its card first (BUILD 242);
  // otherwise the thing slide arms the handle. A handle can be a person, a
  // place, or a thing — "my decision" is as welcome as "Ma's doctor". It never
  // leaves this phone.

  armHandle(handle: string): void {
    const h = String(handle || '').trim();
    if (!h) return;
    void this.analytics.trackListStartedOnce('walk');
    const open = this.loops.openMine().find(l => String(l.person || '').trim().toLowerCase() === h.toLowerCase());
    // BUILD 250/253: a garden pill's walk lands IN THE CHAT DIALOG — the open
    // loop's draft plumps in; with none open, the default loop is born here
    // (the retired slide 2 no longer exists in Alpha).
    if (open) { this.pickLoop(open, undefined); return; }
    this.armedContact = null;
    this.armedHandle = h;
    this.whatInput = '';
    this.lineOpen = false;
    this.editingWords = false;
    this.moreOpen = false;
    this.loop = this.loops.create({
      person: h,
      kind: 'check-in',
      summary: '',
      stance: 'warm',
      direction: 'mine',
    });
    this.enterWords(true);
  }

  onHandleEnter(ev: KeyboardEvent): void {
    ev.preventDefault();
    this.commitHandle();
  }

  commitHandle(): void {
    const h = this.handleInput.trim();
    if (!h) return;
    this.handleInput = '';
    this.armHandle(h);
  }

  /** 2026-09-01 BUILD 179 (founder): the door leads to the add sheet now, not
   *  to a second deck card — so it exists whenever a Who stands armed, even
   *  on a one-card or demo-only deck (that is exactly the first-timer). */
  get canSkip(): boolean { return !!this.who; }

  /** First real person on screen: one whisper, then never again. */
  get showStayHere(): boolean {
    if (!this.who || this.who.contact?.isMockData) return false;
    try { return localStorage.getItem('loopkeeper_stay_here_seen') !== '1'; } catch { return true; }
  }

  private markStaySeen(): void {
    try { localStorage.setItem('loopkeeper_stay_here_seen', '1'); } catch { /* session only */ }
  }

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

  /** Confirm the one person on screen.
   *  2026-09-17 BUILD 250 ALPHA SIMPLICITY (founder: "Alpha is easily rendered
   *  as card, 'Not this one', and chat dialog box… Alpha of Loops must be
   *  usable by my 4 year-old"): the card tap goes STRAIGHT to the chat dialog
   *  — the loop is born here (the default intent: a check-in; a task card
   *  carries its own cadence), no chips phase between the card and the words.
   *  The nuance lives in the user's own edit at the dialog. */
  confirmWho(): void {
    // BUILD 257: an unsaved task draft has nothing to start — the tap FLIPS
    // it (face -> back -> face). Only a saved Who walks on.
    if (this.taskDraft !== 'off') { this.flipTaskDraft(); return; }
    const item = this.who;
    if (!item) return;
    this.markStaySeen();
    if (item.loop) {
      this.pickLoop(item.loop, item.contact); // the card tap PROCEEDS — straight to the words
      return;
    }
    // 2026-09-20 BUILD 279 THE DEMO DOOR (founder: "When we tap demo card the
    // start, the message that comes is 'Install manually.... etc' and that is
    // totally wrong. It is a retention breaker - makes no sense. It should
    // instead point out that 1. use real contact cards... or Continue demo,
    // leading normal current flow until exact point where options for
    // fulfilment mediums are presented"): a demo Who asks FIRST — the real
    // door (their device contacts, via the same add sheet) or the walk-on.
    if (item.contact?.isMockData) { void this.offerDemoCard(item.contact); return; }
    this.birthFromWho(item.contact, false);
  }

  /** BUILD 279: the demo card's ask — the real door or the walk-on. */
  private async offerDemoCard(c: any): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Demo card',
      message: 'This card is a demo — it shows the flow, nothing here is real. Use a real contact card to loop for real, or keep walking the demo.',
      buttons: [
        { text: 'Use real contact card', handler: () => { this.mine(); } },
        { text: 'Continue demo', handler: () => { this.birthFromWho(c, true); } },
      ],
    });
    await alert.present();
  }

  /** BUILD 279: the loop birth, extracted — the demo mark rides the loop so
   *  the inbox's send door can remind at the fulfilment mediums. */
  private birthFromWho(c: any, isDemo: boolean): void {
    // 2026-08-31 BUILD 159: confirming a REAL person is the moment their list
    // has begun — logged once ever per device, whatever door it came through.
    if (!c?.isMockData) void this.analytics.trackListStartedOnce('walk');
    this.armedContact = c;
    this.armedHandle = '';
    this.whatInput = '';
    this.lineOpen = false;
    const isTask = (c as any)?.kind === 'task';
    // 2026-09-22 BUILD 294 THE AVOIDANCE BIRTH: when the loop is born through
    // the first-minute "The reply I owe" door, the KIND is the user's own
    // admission — owed-reply, overdue-apology stance, the friction named by
    // THEM (whySittingSource 'user'), straight from the engine's chain so the
    // copy never forks. Consumed here; a default birth stays a default birth.
    const forced = this.avoidKind;
    this.avoidKind = null;
    const why = forced ? this.loops.suggestWhySitting({ kind: forced, summary: '', pretext: undefined, lastTouchAt: undefined, createdAt: Date.now() }) : undefined;
    this.loop = this.loops.create({
      person: String(c?.name?.display || '').trim(),
      kind: forced === 'owed-reply' ? 'owed-reply' : (isTask ? 'decide' : 'check-in'),
      summary: '',
      stance: forced === 'owed-reply' ? 'overdue-apology' : 'warm',
      direction: 'mine',
      sourceContactId: String(c?.contactId || '') || undefined,
      relation: this.whereOf(c) || undefined,
      lastTouchAt: this.tsMs(c?.lastInteraction) || undefined,
      ...(forced && why ? { whySitting: why, whySittingSource: 'user' as const } : {}),
      ...(isDemo ? { demo: true } : {}),
      ...(isTask ? { cardKind: 'task' as const, taskSeed: { cadence: (c as any).task?.cadence, due: (c as any).task?.due } } : {}),
    });
    this.select(c, this.loop);
    this.enterWords(true);
  }

  /** 2026-09-01 BUILD 179 (founder): the deck-split era is over — "Not this
   *  one" hands every deck to the same agnostic add sheet, so this getter
   *  (cycling's gatekeeper) is retired with it. */

  /**
   * 2026-09-01 BUILD 179 (founder): "Who's on your mind" IS the add-icon
   * interface now — one door for every deck. The old split (real people got
   * a people-only picker, demo decks cycled) failed the first-timer twice:
   * an empty list had nothing to pick, and a demo-only list offered nothing
   * real to reach. The walk asks home for the agnostic add sheet — two tabs,
   * device picker, .vcf, the iPhone ladder — and whatever comes back (a row
   * tap, a picked contact, an import, a typed card) lands as the Who.
   */
  notThisOne(): void {
    // BUILD 257: while a task draft is on, Not this one IS the Cancel —
    // the previous Who returns, nothing retires, nothing saves.
    if (this.taskDraftOn) { this.cancelTaskDraft(); return; }
    // 2026-09-22 BUILD 294: a deliberate default clears the pending
    // avoidance door — the flag brands only the loop the user asked for.
    this.avoidKind = null;
    // 2026-09-16 BUILD 224 THE IN-PLACE SWAP (founder: "app still skips
    // changing in place for user to see new card. Instead, it just skips
    // that first stage"): "Not this one" retires the current card and
    // swaps the NEXT queue card IN PLACE — slide 1, the new card on show,
    // "Not this one" still there to keep walking. The sheet opens ONLY
    // when the queue is exhausted.
    if (this.who?.contact) this.retire(this.who.contact);
    // BUILD 242/244: skipping THIS card is a deliberate move — the selection
    // ends here, and the retired subject cannot resurface (retired + the
    // rebuild excludes it).
    this.selection = null;
    void this.rebuildWho();
    if (!this.who) {
      this.whoRequest.emit(); // queue exhausted — bring the sheet
      return;
    }
    this.go(1);
  }

  /** BUILD 218: LoopKeeper's own door — the invite, handed to home. */
  handThemLoopKeeper(): void {
    this.inviteRequest.emit();
  }

  /** The armed person is a demo identity — the Send stage shows the MINE door. */
  get armedIsDemo(): boolean {
    return !!this.armedContact?.isMockData;
  }

  /** 2026-09-15 BUILD 209 (Grok review gap 1): TRUE when no REAL contact is on
   *  deck — the first-timer's literal state with Demo on by default. Drives the
   *  "Bring in someone real" door on slide 1: the door must exist for the
   *  people we care about, not only when the deck is visually empty. */
  get realDeckEmpty(): boolean {
    return !(this.contacts || []).some((c: any) => !(c as any)?.isMockData);
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
    // 2026-09-20 BUILD 278: from the first-minute panel, the PERSON tap IS
    // the deed signal — home retires the panel and the add sheet (their own
    // Contact Picker) takes over, exactly the empty state's door.
    if (this.firstMinute) this.firstMinuteDeed.emit();
    // 2026-09-22 BUILD 294: a deliberate default clears the pending door.
    this.avoidKind = null;
    this.loop = null;
    this.armedContact = null;
    this.armedHandle = '';
    this.whatInput = '';
    this.lineOpen = false;
    this.editingWords = false;
    this.moreOpen = false;
    // BUILD 241/244: MINE hands the walk back — the selection ends here.
    this.selection = null;
    this.preWalkRealIds = new Set(
      (this.contacts || []).map((c: any) => String(c?.contactId || '')).filter(Boolean),
    );
    void this.rebuildWho();
    this.go(1);
    this.addRequest.emit();
  }

  /**
   * 2026-09-17 BUILD 242 THE CARD TAKEOVER: `landOnCard` is the SELECTION
   * door — an escalation, a check-in tap, a garden pill. Those do not advance
   * the walk over the card; they land ON the card they just displaced, so the
   * selected subject is SEEN taking over from the default/current card (the
   * founder's standing rule: "a selection of contact/task must not proceed to
   * next phase but first replace operational card"). Default false keeps every
   * PROCEEDING caller (the tap on the card, a chip) walking on to the words.
   */
  pickLoop(l: Loop, contact?: any, landOnCard = false): void {
    this.loop = l;
    // 2026-09-08 BUILD 182: a loop with no deck card behind it arms its subject
    // as a HANDLE — "my decision" walks exactly like "Ma's doctor".
    this.armedContact = contact || this.cardFor(l) || null;
    this.armedHandle = this.armedContact ? '' : String(l.person || '').trim();
    // 2026-09-17 BUILD 240 THE SELECTION DISPLACES THE CARD (founder: "a
    // selection of contact/task must not proceed to next phase but first
    // replace operational card"): the armed subject REPLACES the walk's
    // operational card — the queue leads with it — so every phase reads the
    // same subject instead of the default pick, and back-navigation too.
    this.select(this.armedContact || this.ghostFromLoop(l), l);
    this.backOfStep3 = 1;
    this.loopOpened.emit(l.id);
    if (landOnCard) {
      // BUILD 242: the selection STANDS on the card. Nothing is carried over
      // from a walk in progress, the card is the phase, and the subject stays
      // armed (this.loop + the lead) so the user's own tap walks it on with
      // the same card — the phase is never skipped over the selection.
      this.whatInput = '';
      this.lineOpen = false;
      this.editingWords = false;
      this.moreOpen = false;
      this.go(1);
      return;
    }
    this.enterWords(false);
  }

  /** 2026-09-17 BUILD 244 THE SELECTION, WRITTEN ONCE (founder: "adopt
   *  deterministic coding"): one synchronous field write — the operational
   *  card from this moment IS this subject, on every slide, through every
   *  queue rebuild, in every mount order. No queue surgery, no tail hooks,
   *  nothing to race. */
  private select(contact: any, loop?: Loop): void {
    if (!contact && !loop) return;
    this.selection = { contact: contact || null, loop };
    // 2026-09-22 BUILD 298: the copy receipt belongs to ONE loop — a new
    // arm starts clean.
    this.copyAsk = false;
    this.copyAnswer = '';
  }

  /**
   * A nudge (or chat handoff) arrives with a loop armed.
   * 2026-09-17 BUILD 250 THE CONTINUATION (founder: "we plump their message or
   * one derived from it into the chat dialog on arrival back into Loops"):
   * the arrival lands IN THE CHAT DIALOG — the loop's draft (written from the
   * alert's own subject when the loop was born) is already in the box, so the
   * alert's promise continues in two taps: words → send. The selection is
   * still written first (244), so the card behind the dialog is this subject.
   * A bare contact births its default loop here (the same birth confirmWho
   * uses) — the dialog opens with the engine's draft.
   * 2026-09-01 BUILD 179: also the landing for "Not this one" row taps (home
   * routes them here), so the once-ever list marker rides along like it did
   * in the old chooser.
   * 2026-09-17 BUILD 244 THE DETERMINISTIC ARM: the caller hands the LOOP
   * OBJECT it resolved at the tap — zero lookups; the default walk happens
   * ONLY for a genuinely empty payload.
   */
  armFromNudge(contact: any | null, loop?: Loop | null): void {
    if (contact && !contact.isMockData) void this.analytics.trackListStartedOnce('walk');
    if (loop) {
      // The caller's loop, carried — not re-resolved. The continuation IS the
      // dialog: the draft plumps in, the send is one tap away.
      this.pickLoop(loop, contact || this.cardFor(loop));
      return;
    }
    if (contact) {
      const c = contact;
      this.armedContact = c;
      this.armedHandle = '';
      this.whatInput = '';
      this.lineOpen = false;
      const isTask = (c as any)?.kind === 'task';
      this.loop = this.loops.create({
        person: String(c?.name?.display || '').trim(),
        kind: isTask ? 'decide' : 'check-in',
        summary: '',
        stance: 'warm',
        direction: 'mine',
        sourceContactId: String(c?.contactId || '') || undefined,
        relation: this.whereOf(c) || undefined,
        lastTouchAt: this.tsMs(c?.lastInteraction) || undefined,
        ...(isTask ? { cardKind: 'task' as const, taskSeed: { cadence: (c as any).task?.cadence, due: (c as any).task?.due } } : {}),
      });
      this.select(c, this.loop);
      this.enterWords(true);
      return;
    }
    // A genuinely EMPTY payload is the ONLY path to the default walk —
    // a deterministic rule, not a fallback that timing can trigger.
    this.selection = null;
    void this.rebuildWho();
    this.go(1);
  }

  backToWho(): void {
    this.loop = null;
    this.armedContact = null;
    this.armedHandle = '';
    this.whatInput = '';
    this.lineOpen = false;
    this.editingWords = false;
    this.moreOpen = false;
    // BUILD 242: back returns to the CARD the walk is on — and when that card
    // is a SELECTION, the selection is what stands there (BUILD 241's clear
    // here handed the default pick straight back to the founder). Only
    // deliberate moves end a held selection: Not this one, Next one, MINE.
    // BUILD 250: with the chips retired from Alpha, back from the words goes
    // straight to the card — there is no phase between them.
    void this.rebuildWho();
    this.go(1);
  }

  // ── Slide 2 · THE THING ────────────────────────────────────────────────────

  armedName(): string {
    // 2026-09-08 BUILD 182: the thing slide speaks either arming — a deck card
    // OR a garden handle ("my decision" names itself).
    return String(this.armedContact?.name?.display || this.armedHandle || '').trim()
      || this.tr('loopkeeper.t.them');
  }

  openLine(): void { this.lineOpen = true; }

  /**
   * Tap a chip — the loop is born, structured. Chime #1.
   * 2026-09-08 BUILD 182: the counterparty is a CONTACT *or* a HANDLE —
   * "A decision I keep not making" armed at the handle "my decision" walks
   * exactly like a reply owed to a deck card. No deck card is ever required.
   */
  chipTap(kind: LoopKind): void {
    if (this.busy || (!this.armedContact && !this.armedHandle)) return;
    const summary = this.whatInput.trim();
    if (this.armedContact) {
      const c = this.armedContact;
      const promise = kind === 'promise' ? (this.loops.extractPromiseFromContact(c) || summary || undefined) : undefined;
      // 2026-09-16 BUILD 229 PHASE C: a loop born from a TASK card carries
      // the card's kind and its rhythm — the nudge ladder, the words and the
      // snooze all read the task's own cadence/due from here on.
      const isTask = (c as any)?.kind === 'task';
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
        ...(isTask ? { cardKind: 'task' as const, taskSeed: { cadence: (c as any).task?.cadence, due: (c as any).task?.due } } : {}),
      });
    } else {
      // The handle path: no card, no relation — the nickname the user chose
      // IS the subject. A decision or a place arms here as happily as a person.
      this.loop = this.loops.create({
        person: this.armedHandle,
        kind,
        summary,
        stance: kind === 'owed-reply' ? 'overdue-apology' : 'warm',
        direction: 'mine',
        lastTouchAt: undefined,
      });
    }
    this.whatInput = '';
    this.enterWords(true);
  }

  /**
   * 2026-09-08 BUILD 183 SELF LOOPS — the slide-1 door with NO arming at all.
   * "A decision I keep not making" / "Somewhere I must show up" as PURE
   * self-loops: person '' (b181's subject-less loop), straight to the words.
   * The tray's quietest entry — no card, no handle, no sentence needed.
   * 2026-09-22 BUILD 294: `userNamed` — the loop was born from the first-
   * minute AVOIDANCE cover, so the friction is the user's own admission,
   * not the engine's guess (whySittingSource 'user', from the engine's own
   * chain so the copy never forks).
   */
  selfTap(kind: LoopKind, userNamed = false): void {
    if (this.busy) return;
    void this.analytics.trackListStartedOnce('walk');
    this.armedContact = null;
    this.armedHandle = '';
    this.whatInput = '';
    this.lineOpen = false;
    const why = userNamed ? this.loops.suggestWhySitting({ kind, summary: '', pretext: undefined, lastTouchAt: undefined, createdAt: Date.now() }) : undefined;
    this.loop = this.loops.create({
      person: '',
      kind,
      summary: '',
      stance: 'warm',
      direction: 'mine',
      ...(userNamed && why ? { whySitting: why, whySittingSource: 'user' as const } : {}),
    });
    void this.analytics.track('self_loop_started'); // BUILD 184: the no-arming door, measured
    this.enterWords(true);
  }

  /** 2026-09-22 BUILD 294 THE AVOIDANCE DOORS + BUILD 297 THE RETURN TO
   * COVER (founder: 'Whichever door they choose to use of the four
   * available, there must be a return to cover in that next phase, which
   * return resets the gate to untapped/untouched/undecided ie. journey
   * away from procrastination state has not started'): NO door tap latches
   * the gate any more. The cover is the standing face of the first-timer:
   * a door tap opens its flow; the RETURN to slide 1 brings the cover back
   * RESET (untapped/undecided — the *ngIf remounts it). The gate closes
   * ONLY when the journey starts: a real card's arrival (the pick / the
   * saved task draft) or a real send (fire() emits firstMinuteEntry).
   * - 'owed-reply' → the PERSON chain: the add-sheet pick; the avoidKind
   *   rides and BIRTHFROMWHO births the loop OWED-REPLY, stance
   *   overdue-apology, the friction named by the user's own door tap.
   *   The sheet floats OVER the cover — an empty dismissal leaves the
   *   cover standing, untouched.
   * - 'decide' → the 183 pure self-loop, straight to the words; back
   *   returns to the cover. 297: a SECOND decide tap RESUMES the open
   *   cover-decide loop instead of birthing a duplicate.
   * The flag is consumed by the first birth and cleared on every deliberate
   * default (mine / notThisOne / nextOne / cancelTaskDraft) so it can never
   * brand a loop the user did not ask for.
   */
  async avoidDoor(kind: 'owed-reply' | 'decide'): Promise<void> {
    if (this.busy) return;
    this.avoidKind = kind;
    if (kind === 'owed-reply') {
      // 297: the sheet floats OVER the cover — no latch, no retire. An empty
      // dismissal returns the user to the cover, untouched (the tap was
      // logged firstminute_avoid; the gate is still open).
      this.whoRequest.emit();
    } else {
      // 297 THE RETURN TO COVER: a cover-decide loop may already sit open
      // from an earlier tap (the user went to the words and came back) —
      // RESUME it; the door never mints duplicates.
      const existing = (await this.loops.all()).find(l =>
        (!l.status || l.status === 'open') && l.kind === 'decide' && !String(l.person || '').trim());
      if (existing) {
        this.avoidKind = null;
        this.pickLoop(existing);
      } else {
        this.selfTap('decide', true);
        this.avoidKind = null;
      }
    }
  }

  /** The pending avoidance door ('owed-reply' awaiting its pick), if any. */
  private avoidKind: 'owed-reply' | 'decide' | null = null;

  /**
   * Optional line, Enter commits — parseCapture with the armed contact.
   * 2026-09-08 BUILD 182: the handle the user NAMED wins over whatever the
   * sentence re-extracts ("her", "them") — the b182 Garden rule. With nothing
   * armed the parse stands alone: a subject-less capture ("Renew the car
   * insurance") is a first-class loop since BUILD 181.
   */
  commitWhat(): void {
    const sentence = this.whatInput.trim();
    if (!sentence || this.busy) return;
    this.busy = true;
    try {
      const contact = this.armedContact || undefined;
      const parsed = this.loops.parseCapture(sentence, contact);
      if (this.armedHandle) parsed.person = this.armedHandle;
      // BUILD 229 PHASE C: the parsed path carries the card's kind too.
      if ((this.armedContact as any)?.kind === 'task') {
        parsed.cardKind = 'task';
        (parsed as any).taskSeed = { cadence: (this.armedContact as any).task?.cadence, due: (this.armedContact as any).task?.due };
      }
      this.loop = this.loops.create(parsed);
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
    // 2026-09-22 BUILD 303 NINETY SECONDS, THEN THE BUTTONS (the brief's
    // move 4: 'Let me change it can exist. It must not be the main door.
    // Ninety seconds, then the buttons'): the words slide opens with ONLY
    // the draft and the send door; the tones / edit / polish doors stay out
    // of sight for the first ninety seconds — the grimace send first.
    this.wordsShownAt = Date.now();
    this.sideDoorsOpen = false;
    this.armSideDoors();
    this.go(3);
    if (chimed) void this.sounds.playLoopCapture();
    setTimeout(() => void this.sounds.playLoopReady(), chimed ? 420 : 0);
  }

  // ── 2026-09-22 BUILD 303: THE NINETY-SECOND GATE ───────────────────────────
  /** When the words slide opened (epoch ms). */
  wordsShownAt = 0;
  /** The tones / edit / polish doors: hidden until ninety seconds have passed. */
  sideDoorsOpen = false;
  private sideDoorsTimer: any = null;

  /** The timer only REVEALS a UI row — it never drives state, never closes
   *  anything; disarmed the moment the walk leaves the words slide. */
  private armSideDoors(): void {
    this.disarmSideDoors();
    this.sideDoorsTimer = setTimeout(() => { this.sideDoorsOpen = true; }, 90000);
  }

  private disarmSideDoors(): void {
    if (this.sideDoorsTimer) { clearTimeout(this.sideDoorsTimer); this.sideDoorsTimer = null; }
  }

  // ── Slide 3 · THE WORDS ────────────────────────────────────────────────────

  sel(): Loop | null { return this.loop ? this.loops.getLoop(this.loop.id) ?? this.loop : null; }

  async setTone(t: 'short' | 'honest' | 'light'): Promise<void> {
    const l = this.sel(); if (!l) return;
    // 2026-09-17 BUILD 253 THE COMPOSITION SEQUENCE (founder: "After I added
    // my own polish to a message on Loops Alpha, it ignored my input and
    // still sent its own pre-edit message"): a tone tap must never silently
    // overwrite the user's words with a regenerated draft.
    if (l.ownWords) {
      // 2026-09-17 BUILD 254 (founder: "we should treat it as equivalent to
      // asking for AI Assistance by sending the user-modified or initiated
      // words to backend for polish"): the tone tap IS the assist request —
      // the user's OWN words go to the PolishingUserAlpha agent (server 86,
      // /polish-alpha) and come back in the requested tone, meaning intact.
      // Best-effort: on any failure the words stand and the tone is recorded.
      this.polishing = true;
      try {
        void this.analytics.track('loop_draft_ai_polish', { surface: 'alpha-own' });
        const polished = await this.loops.polishUserAlpha(l, t);
        if (polished) {
          this.loops.update(l.id, { tone: t, draft: polished });
          void this.sounds.playLoopReady();
        } else {
          this.loops.update(l.id, { tone: t });
          void this.alerts.showToast(this.tr('loopkeeper.t.polishErr'), 2200);
        }
      } finally {
        this.polishing = false;
      }
      return;
    }
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
    // 2026-09-22 BUILD 303 (the brief's move 4): the edit is the trap —
    // 'editing is procrastination with a keyboard' — so it is MEASURED:
    // edit_opened {surface:'walk'} + the draft length, numeric.
    void this.analytics.track('edit_opened', { surface: 'walk', len: (l.draft || '').length });
    // BUILD 251: the cursor lands IN the dialog — "Let me change it" means the
    // keyboard waits at the words, caret at the end of the draft, ready.
    setTimeout(() => {
      const ta = document.querySelector('.sw-editbox textarea') as HTMLTextAreaElement | null;
      if (!ta) return;
      ta.focus();
      try { const end = (this.editBuffer || '').length; ta.setSelectionRange(end, end); } catch { /* not focusable */ }
    }, 80);
  }

  saveEdit(): void {
    const l = this.sel(); if (!l) return;
    const v = this.editBuffer.trim();
    // BUILD 253: the saved words are the user's OWN — ownership is recorded
    // so no tone tap can silently overwrite them afterwards.
    // BUILD 275 CORRIDOR LIGHT: the user's own edit is a funnel station —
    // capture → draft → EDITED → send. An edit is engagement, not noise.
    if (v) {
      this.loops.update(l.id, { draft: v, ownWords: true });
      void this.analytics.track('draft_edited', { kind: l.cardKind || 'person' });
    }
    this.editingWords = false;
  }

  toTap(): void {
    if (!this.sel()) return;
    this.moreOpen = false;
    this.go(4);
    // 2026-08-31 FOUNDER DEV ITERATION (unshipped): on a demo card the MINE
    // door waits below the fold — bring it into view as the slide opens.
    if (this.armedIsDemo) {
      setTimeout(() => {
        (document.querySelector('.sw-mine') as HTMLElement | null)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 380);
    }
  }

  backFromWords(): void {
    // BUILD 250 ALPHA: back from the words is always the card — the chips
    // phase is retired from Alpha (the machinery stays for Beta).
    // 303: leaving the words disarms the ninety-second reveal.
    this.disarmSideDoors();
    this.sideDoorsOpen = false;
    this.backToWho();
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

  /** 2026-08-31 FOUNDER DEV ITERATION (unshipped): the call door's script IS
   *  the accepted words — no re-derived beats. The old callBeats() preferred
   *  the chip summary over the draft and added template labels ("Say hi",
   *  "The thing", "Land it soft"), so the door ignored what slide 3 accepted.
   *  Now: the person's name, then their words verbatim. */
  callGreeting(): string {
    const l = this.sel();
    const f = (l?.person || '').split(' ')[0] || this.tr('loopkeeper.t.them');
    return `${f} —`;
  }

  /** The words the user accepted on the previous slide, verbatim. */
  scriptBody(): string {
    const l = this.sel();
    return String(l?.draft || l?.summary || '').trim();
  }

  toggleMore(): void { this.moreOpen = !this.moreOpen; }

  async fire(channel: LoopChannel): Promise<void> {
    const l = this.sel(); if (!l || this.busy) return;
    // BUILD 275 CORRIDOR LIGHT: the send hand-off opens — the funnel station
    // between the draft and the deed (message_sent). Paired with send_exit.
    // 303: the draft length rides as a numeric prop (the brief's move 4 —
    // 'long, polished letters are how loops stay open' is now measurable).
    void this.analytics.track('send_opened', { channel, surface: 'walk', len: (l.draft || '').length });
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
      // 2026-09-22 BUILD 298 COPY IS NOT THE CLOSE (the brief's move 2:
      // 'Copy is not the close - receipt asks once "did it leave?"; if not,
      // loop stays open'): a clipboard write is a COPY, not a send. The copy
      // channel stops here — no markSent, no chime, no gate — and the
      // receipt ASKS ONCE. Only the user's own 'Yes - it's gone' closes the
      // loop (confirmCopyLeft); 'Not yet' leaves it open for the 9am digest.
      if (channel === 'copy') {
        const card = this.cardFor(fresh) || this.armedContact;
        if (card) {
          this.draftEngine.pushContext(card, `Copied the words out (${new Date().toLocaleDateString()})`);
          card.lastInteraction = new Date();
          this.contactsDirty.emit();
        }
        this.doneLabel = bundle.label;
        this.copyAsk = true;
        this.copyAnswer = '';
        this.go(5);
        this.loopsChanged.emit();
        void this.alerts.showToast(this.tr('loopkeeper.walk.tCopied'), 3200);
        return;
      }
      this.loops.markSent(fresh.id, channel, snippet);
      // 2026-09-22 BUILD 297 THE RETURN TO COVER (founder: '...return resets
      // the gate... ie. journey away from procrastination state has not
      // started'): a REAL send is the journey starting — the gate passes
      // here (home persists lk_cover_engaged), never at the door tap.
      if (this.firstMinute) this.firstMinuteEntry.emit();
      const card = this.cardFor(fresh) || this.armedContact;
      if (card) {
        // (298: 'copy' never reaches here any more — the early return above
        // takes the copy channel to the receipt question.)
        this.draftEngine.pushContext(card, `Sent via ${bundle.label} (${new Date().toLocaleDateString()})`);
        card.lastInteraction = new Date();
        this.contactsDirty.emit();
      }
      this.doneLabel = bundle.label;
      this.go(5);
      void this.sounds.playCompletionChime(0.35);
      this.loopsChanged.emit();
    } finally {
      this.busy = false;
    }
  }

  // ── 2026-09-22 BUILD 300 THE WHY ON THE FACE (the brief's move 3) ──────────
  /** The four honest frictions, one tap each - the service's own key list,
   *  identical to the inbox face so the copy never forks. */
  readonly whyChipKeys = this.loops.whyChipKeys();

  whyChipText(k: string): string { return this.tr('loopkeeper.why.chip.' + k); }

  /** One tap names the friction: whySittingSource 'user', and the draft
   *  changes with the answer (the service regenerates it with the new why
   *  unless the words are the user's own). The display re-renders because
   *  loops.update() mutates the cached loop in place (the selection's
   *  object IS the cache entry). */
  nameWhyChip(k: string): void {
    const l = this.sel(); if (!l) return;
    this.loops.nameWhy(l.id, this.whyChipText(k));
    void this.analytics.track('why_named', { source: 'chip', surface: 'walk' });
  }

  // ── 2026-09-22 BUILD 298 COPY IS NOT THE CLOSE ─────────────────────────────
  /** The copy receipt asks once: did it leave? '' = unanswered. */
  copyAsk = false;
  copyAnswer: '' | 'left' | 'waiting' = '';

  /** 'Yes - it's gone': the words LEFT — the real close (markSent), the
   *  chime, and the gate passes (297: the journey started). */
  confirmCopyLeft(): void {
    const l = this.sel(); if (!l) return;
    const fresh = this.loops.getLoop(l.id) || l;
    this.loops.markSent(fresh.id, 'copy', 'Copied to clipboard');
    if (this.firstMinute) this.firstMinuteEntry.emit();
    this.copyAnswer = 'left';
    void this.analytics.track('copy_receipt', { left: 1 });
    void this.sounds.playCompletionChime(0.35);
    this.loopsChanged.emit();
  }

  /** 'Not yet': the loop STAYS OPEN — the 9am digest brings it back. No
   *  close, no chime, no gate. The brief's rule, verbatim. */
  copyDidNotLeave(): void {
    this.copyAnswer = 'waiting';
    void this.analytics.track('copy_receipt', { left: 0 });
    this.loopsChanged.emit();
  }

  // ── 2026-09-16 BUILD 229 PHASE C: THE TASK DOORS ──────────────────────────
  // A task subject's slide-4 array is Done / Snooze / Note to self / Delegate
  // — not the person array (WhatsApp/Call/SMS/Email/Copy/Chat/Invite). The
  // doors do not fabricate sends: Done closes via the REAL close path
  // (first-close share and celebration stay), Snooze rides the existing
  // waiting machinery (wake ping + Stack), Note opens the card's own story,
  // Delegate hands the words out through the copy channel (sent IS the close).

  /** BUILD 229/235: the operations doors belong to every NON-PERSON kind —
   *  task, routine, note, place (a subject with no phone still has Done /
   *  Snooze / Note to self / Delegate). */
  isTaskSubject(): boolean {
    const k = (this.sel() as any)?.cardKind;
    return !!k && k !== 'person';
  }

  /** DONE — the task is finished: the card's task flips done, the loop
   *  closes through closeFully (first-close share + celebration stay). */
  async taskDone(): Promise<void> {
    const l = this.sel(); if (!l || this.busy) return;
    this.busy = true;
    try {
      void this.analytics.track('send_exit', { channel: 'task-done', surface: 'walk' });
      const card = this.cardFor(l) || this.armedContact;
      if (card) {
        const t = (card as any).task;
        if (t) { t.done = true; t.doneAt = Date.now(); }
        this.draftEngine.pushContext(card, 'Marked the task done (' + new Date().toLocaleDateString() + ')');
        card.lastInteraction = new Date();
        this.contactsDirty.emit();
      }
      this.doneLabel = 'Done';
      this.loops.closeFully(l.id);
      this.go(5);
      void this.sounds.playCompletionChime(0.35);
      this.loopsChanged.emit();
    } finally {
      this.busy = false;
    }
  }

  /** SNOOZE — the loop waits on the task's OWN rhythm (the wake ping and the
   *  Stack carry it), and the walk's feet keep moving to the next card. */
  taskSnooze(): void {
    const l = this.sel(); if (!l || this.busy) return;
    void this.analytics.track('send_exit', { channel: 'task-snooze', surface: 'walk' });
    const card = this.cardFor(l) || this.armedContact;
    this.loops.snoozeByRhythm(l.id, (card as any)?.task || (this.sel() as any)?.taskRhythm);
    void this.alerts.showToast(this.tr('loopkeeper.walk.tSnoozed'), 3000);
    this.nextOne();
  }

  /** NOTE TO SELF — opens the card's own surface (its rolling story), the
   *  walk waits beneath it. */
  taskNote(): void {
    const l = this.sel(); if (!l) return;
    void this.analytics.track('send_exit', { channel: 'task-note', surface: 'walk' });
    const card = this.cardFor(l) || this.armedContact;
    if (card) this.noteRequest.emit(card);
  }

  /** DELEGATE — the words leave through the copy channel: the task leaves
   *  this tray and rides in someone else's hands (sent IS the close). */
  async taskDelegate(): Promise<void> {
    void this.analytics.track('send_exit', { channel: 'task-delegate', surface: 'walk' });
    await this.fire('copy');
  }

  nextOne(): void {
    // 2026-09-16 BUILD 218 (founder: "after getting the 'loop closed' we
    // fall back to the opening card, and not a next available one"): the
    // sent subject retires for the session, the queue advances to the NEXT
    // available card, and when nothing is left the slide offers the doors
    // (MINE — device contacts — and a New Task card) instead of a rewind.
    if (this.who?.contact) this.retire(this.who.contact);
    this.loop = null;
    this.armedContact = null;
    this.armedHandle = '';
    this.whatInput = '';
    this.lineOpen = false;
    this.editingWords = false;
    this.moreOpen = false;
    this.doneLabel = 'Sent';
    // 2026-09-22 BUILD 294: a deliberate default clears the pending door.
    this.avoidKind = null;
    // 2026-09-22 BUILD 298: the copy receipt belongs to ONE loop — the next
    // arm starts clean.
    this.copyAsk = false;
    this.copyAnswer = '';
    // BUILD 241/244: the walk moves on — the selection ends with it.
    this.selection = null;
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
