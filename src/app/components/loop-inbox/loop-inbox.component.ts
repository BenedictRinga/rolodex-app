import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import {
  LoopsService, Loop, LoopTone, LoopChannel,
} from '../../services/loops/loops.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { AnalyticsService } from '../../services/analytics/analytics.service';
import { KeeperAgentService } from '../../services/agents/keeper-agent.service';
import { StorageService } from '../../services/storage/storage.service';
import { LoopConsultComponent } from '../loop-consult/loop-consult.component';
// 2026-08-28 BUILD 130: the loop meets the card — in-app chat + video embeds
// that already live on every contact, and the rolling-context writer so a
// dispatch leaves the relationship richer than it found it.
import { CardChatModalComponent } from '../card-chat-modal/card-chat-modal.component';
import { VideoCallModalComponent } from '../video-call-modal/video-call-modal.component';
import { DraftEngineService } from '../../services/draft-engine/draft-engine.service';
import { CardChatService } from '../../services/card-chat/card-chat.service';
import { capSentences } from '../../util/cap';
// 2026-08-28 BUILD 124: ONE language list for the whole app — the Inbox had
// drifted to an 11-entry copy (Russian/Hebrew/Spanish/pt-BR missing) and its
// popover never received the scroll-cap class. See app-languages.ts.
import { APP_LANGUAGES, LANG_POPOVER_OPTS } from '../../services/lang/app-languages';

/**
 * 2026-08-24 LOOPKEEPER INBOX — Chat | Loops | Reminders.
 * One row = one closeable thing. Decision chips force the decision.
 * The Chat tab is PROJECTED content from home.page.html — untouched legacy.
 * The Reminders tab POURS the Settings -> Reminders content directly in.
 */
@Component({
  selector: 'app-loop-inbox',
  templateUrl: './loop-inbox.component.html',
  styleUrls: ['./loop-inbox.component.scss'],
  standalone: false,
})
export class LoopInboxComponent implements OnInit, OnDestroy {
  @Input() contacts: any[] = [];
  @Output() closeRequest = new EventEmitter<void>();
  // 2026-08-28 BUILD 130: dispatch persists the relationship — the inbox
  // writes the contact's rolling context and asks HomePage to persist the deck.
  @Output() contactsDirty = new EventEmitter<void>();

  tab: 'loops' | 'chat' | 'reminders' = 'loops';

  // 2026-08-28 BUILD 124: shared 15-entry list (was a private 11-entry copy —
  // the drift that hid Russian/Hebrew/Spanish/Portuguese-Brazil here).
  readonly languages = APP_LANGUAGES;
  /** Cap + internally scroll the language popover (same as Settings). */
  readonly langPopoverOpts = LANG_POPOVER_OPTS;
  currentLang = 'en';

  todaysThree: Loop[] = [];
  mine: Loop[] = [];
  theirs: Loop[] = [];
  closed: Loop[] = [];
  counts = { mine: 0, theirs: 0, closedThisWeek: 0 };
  nudgesDue = 0;
  /** 2026-08-28 BUILD 128: the ids of loops the algo is prompting RIGHT NOW —
   *  rows glow, the bar counts them, and opening one is the answer. */
  nudgeIds = new Set<string>();
  flashId: string | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  /** 2026-08-28 BUILD 129: the CULMINATION — when a loop truly closes, the
   *  inbox pauses for one breath: big ✓, the person freed, and the freed
   *  count counting UP. This is the dopamine beat the whole arc earns. */
  celebrating: { name: string; count: number; cardLine: boolean } | null = null;
  private celebrateTimer: ReturnType<typeof setTimeout> | null = null;

  captureInput = '';
  busy = false;
  selectedId: string | null = null;
  showVoiceFor: string | null = null;

  // 2026-08-27 FOUNDER RELOCATION: the app-level Loop-O-meter getters that
  // lived here were removed — the inbox was "just another increase in data
  // points". The meter now shows per-card on the BACK of every contact card
  // (see contact-card.component.ts meterFor), which is where the user's power
  // is visible: fill the card manually, or let the Keeper glean from
  // interactions. The welcome storyboard still teaches the ladder via the
  // shared loopkeeper.meter.* keys.

  waitEditingId: string | null = null;
  waitDate = '';
  waitCond = '';
  dropEditingId: string | null = null;

  // ── 2026-08-25 VOICE NOTE STUDIO (F16 completion) — MediaRecorder, fully
  // on-device: the clip lives in memory/object-URLs until shared or discarded.
  // Nothing uploads anywhere; the share sheet hands the file to the REAL app.
  recordingFor: string | null = null;
  recordingSeconds = 0;
  lastClipByLoop: Record<string, { url: string; blob: Blob; ext: string; seconds: number }> = {};
  private recorder: MediaRecorder | null = null;
  private recStream: MediaStream | null = null;
  private recTimer: any = null;
  private recChunks: Blob[] = [];
  private recMime = '';
  private recCancelled = false;

  // REVEAL-LATER: intro B-note — data model + drafts ship NOW; flip to surface.
  readonly INTRO_B_NOTE_REVEALED = false;
  // REVEAL-LATER: birthday inbox rows — per-person opt-in lives in the
  // Reminders tab until card-edit lands; flip to surface inbox rows.
  readonly BIRTHDAY_ROWS_REVEALED = false;
  showIntroBFor: string | null = null;

  readonly tones: LoopTone[] = ['short', 'honest', 'light', 'formal'];
  readonly channels: { id: LoopChannel; icon: string; label: string }[] = [
    { id: 'whatsapp', icon: 'chatbubble-ellipses-outline', label: 'WhatsApp' },
    { id: 'sms', icon: 'phone-portrait-outline', label: 'SMS' },
    { id: 'email', icon: 'mail-outline', label: 'Email' },
    { id: 'linkedin', icon: 'logo-linkedin', label: 'LinkedIn' },
    // 2026-08-28 BUILD 132: telegram joins — the send flow asks for the
    // handle if the card never held one, exactly like the other channels.
    { id: 'telegram', icon: 'paper-plane-outline', label: 'Telegram' },
    { id: 'voice', icon: 'mic-outline', label: 'Voice' },
  ];
  // 2026-08-27 i18n: every user-facing string now flows through the locale
  // files (loopkeeper.* keys) — the presets were English-only and defeated the
  // multi-language platforming. Templates render via | translate.
  readonly sampleCaptureKeys = [
    'loopkeeper.capture.sample1',
    'loopkeeper.capture.sample2',
    'loopkeeper.capture.sample3',
  ];
  // ── 2026-08-28 BUILD 125 ROTATING PLACEHOLDER (founder) ────────────────────
  // The capture placeholder cycles: the primary instruction holds the LARGER
  // dwell (two ticks), then the three samples pass through as complementary /
  // substitute / intermittent whispers (one tick each). Placeholders are
  // display-only — no tap path can move them into the input, they never
  // survive the first keystroke, and rotation only resumes after the box has
  // REMAINED blank for a full quiet interval.
  private static readonly PH_TICK_MS = 3500;
  private phTimer: ReturnType<typeof setInterval> | null = null;
  private phIdx = 0;        // current slot in the sequence
  private phHold = 0;       // ticks served in the current slot
  private phQuiet = 0;      // blank intervals since the box last emptied
  private get phSequence(): string[] {
    return ['loopkeeper.capture.placeholder', ...this.sampleCaptureKeys];
  }
  get composerPlaceholder(): string {
    return this.tr(this.phSequence[this.phIdx]);
  }
  private startPhRotation(): void {
    if (this.phTimer) return;
    this.phTimer = setInterval(() => this.tickPh(), LoopInboxComponent.PH_TICK_MS);
  }
  private tickPh(): void {
    // Non-blank box: the placeholder is hidden natively; freeze and forget
    // the quiet count so resumption always costs one full blank interval.
    if (this.captureInput.trim()) { this.phQuiet = 0; return; }
    this.phQuiet++;
    if (this.phQuiet === 1) return; // just (re)blanked — sit quiet one interval
    const holds = this.phIdx === 0 ? 2 : 1; // primary keeps the larger slot
    this.phHold++;
    if (this.phHold < holds) return;
    this.phHold = 0;
    this.phIdx = (this.phIdx + 1) % this.phSequence.length;
  }
  readonly dropReasonKeys = [
    'loopkeeper.drop.reason1',
    'loopkeeper.drop.reason2',
    'loopkeeper.drop.reason3',
    'loopkeeper.drop.reason4',
  ];
  /** Text for template iterations that also feed actions with the string. */
  tr(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  constructor(
    private loops: LoopsService,
    private alerts: AlertsService,
    private analytics: AnalyticsService,
    private alertCtrl: AlertController,
    private translate: TranslateService,
    private keeper: KeeperAgentService,
    private storage: StorageService,
    // 2026-08-27 APEX CONSULT: presents the GP-style distilled card per loop.
    private modalCtrl: ModalController,
    // 2026-08-28 BUILD 130: card tie-in — the rolling-context writer plus the
    // card's own chat/video comms, opened straight from a loop.
    private draftEngine: DraftEngineService,
    private cardChat: CardChatService,
  ) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
  }

  /** 2026-08-27 THE LOOP CONSULT — apex distilled format (USE_NOW.txt).
   *  One tap = who/what/where/when vitals + verdict + ONE draft. When the
   *  card hands back 'open-row', expand that row so the send machinery
   *  (the only channel path) is right there with the fresh draft.
   *  2026-08-28 BUILD 124: the matched deck card rides along so the WHERE /
   *  WHEN vitals can recollect the FIRST meeting (ground-zero doctrine). */
  async openConsult(l: Loop): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: LoopConsultComponent,
      componentProps: { c: l, card: this.cardFor(l) },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.9],
      initialBreakpoint: 0.9,
      keyboardClose: false,
    });
    await modal.present();
    const res = await modal.onDidDismiss();
    if (res?.data?.action === 'open-row' && res.data.loopId) {
      this.selectedId = res.data.loopId;
    }
  }

  setLanguage(code: string): void {
    this.currentLang = code;
    void this.translate.use(code);
  }

  requestClose(): void {
    this.closeRequest.emit();
  }

  async ngOnInit(): Promise<void> {
    // 2026-08-28 BUILD 125: the capture placeholder rotation starts with the tab.
    this.startPhRotation();
    // F11/F12: sweep the deck silently — owed replies + stale promises become
    // loops BEFORE the lists paint. No toast unless something was created.
    if (this.contacts?.length) void this.keeper.scanInboxSignals(this.contacts);
    // 2026-08-28 BUILD 128: wake expired snoozes FIRST, then one census —
    // woken loops arm nextNudgeAt = now and are already inside dueNudges(),
    // so the old `due.length + woke.length` double-counted them.
    await this.loops.resumeExpiredWaits();
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    this.todaysThree = await this.loops.todaysThree();
    this.mine = this.loops.openMine().filter(l => !this.todaysThree.includes(l));
    this.theirs = this.loops.waitingOnThem();
    this.closed = this.loops.recentlyClosed();
    this.counts = this.loops.counts();
    // 2026-08-28 BUILD 128: one truthful nudge census — which loops are the
    // algo prompting right now (woken snoozes included; they arm
    // nextNudgeAt = now and land here naturally). The bar counts prompts not
    // yet heard, the rows glow, and opening one is the answer.
    const due = this.loops.dueNudges();
    this.nudgeIds = new Set(due.map(l => l.id));
    this.nudgesDue = this.nudgeIds.size;
  }

  /** 2026-08-28 BUILD 128: is this loop one the algo is prompting right now? */
  isDue(l: Loop): boolean {
    return this.nudgeIds.has(l.id);
  }

  /** 2026-08-28 BUILD 128: opening a nudged loop IS the answer — the user
   *  heard the prompt, so its escalation advances (2d → 4d → 7d, never spam),
   *  the amber glow calms, and the bar count drops live. */
  toggle(id: string): void {
    const opening = this.selectedId !== id;
    this.selectedId = opening ? id : null;
    if (opening && this.nudgeIds.has(id)) {
      this.loops.registerNudgeSent(id);
      this.nudgeIds.delete(id);
      this.nudgesDue = this.nudgeIds.size;
    }
  }

  /** 2026-08-28 BUILD 128: the nudge bar is now the POINTER — tap it and the
   *  view travels to the first loop still nudging, flashing it once. */
  revealNudges(): void {
    const first = this.nudgeIds.values().next();
    if (first.done) return;
    this.flashId = first.value;
    document.querySelector(`[data-loop-id="${first.value}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => { this.flashId = null; }, 1600);
  }

  // ── Capture (10) ────────────────────────────────────────────────────────────
  /** 2026-08-28 BUILD 121 SAMPLE GUARD (founder): the three demo lines
   *  ("Promised Tunde I'd send the deck"…) are inspiration, never activity.
   *  If the capture text still contains one verbatim (current language,
   *  case/punctuation-tolerant), the capture FAILS with a hint and nothing is
   *  registered — no loop, no loop_captured event, no nudges downstream. */
  private isSampleText(sentence: string): boolean {
    const norm = (s: string): string => s
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\u2026/g, '...')
      .replace(/\s+/g, ' ')
      .trim();
    const target = norm(sentence);
    if (!target) return false;
    return this.sampleCaptureKeys.some((k) => {
      const sample = norm(this.tr(k));
      return sample.length > 0 && target.includes(sample);
    });
  }

  /** 2026-08-28 BUILD 125/126: sample sentences live in the rotating placeholder
   *  AND in the visual-only pill row — they can never enter the input from a
   *  tap. The isSampleText() guard above stays as the safety net for a user who
   *  retypes a sample verbatim. */

  /** 2026-08-28 BUILD 126: Enter captures in the 3-line textarea; Shift+Enter
   *  keeps its default (a second line of room). */
  onCaptureEnter(ev: KeyboardEvent): void {
    if (ev.shiftKey) return;
    ev.preventDefault();
    void this.addCapture();
  }

  /** 2026-08-28 BUILD 127: the ✕ clears the whole capture box in one tap. */
  clearCapture(): void {
    this.captureInput = '';
  }

  /** 2026-08-28 BUILD 137: sentence starts cap themselves — no more painfully
   *  pressing CAPS at the start of every intended sentence. ASCII-only, length-
   *  preserving, caret-restoring; caseless scripts pass through untouched. */
  capCapture(ev: CustomEvent): void {
    const comp = ev.target as unknown as { value?: string; getInputElement?: () => Promise<HTMLInputElement | HTMLTextAreaElement> };
    const raw = comp?.value || '';
    const capped = capSentences(raw);
    if (capped === raw) return;
    this.captureInput = capped;
    comp.value = capped;
    const fix = (): Promise<void> | undefined => comp.getInputElement?.().then((native) => {
      const pos = native.selectionStart ?? capped.length;
      native.value = capped;
      const p = Math.min(pos, capped.length);
      native.setSelectionRange(p, p);
    }).catch(() => { /* native not ready — the next keystroke retries */ });
    void fix();
    setTimeout(() => { void fix(); }, 0); // after Angular's writeValue settles
  }

  async addCapture(text?: string): Promise<void> {
    const sentence = (text ?? this.captureInput).trim();
    if (!sentence || this.busy) return;
    if (this.isSampleText(sentence)) {
      void this.alerts.showToast(this.tr('loopkeeper.t.sampleBlocked'), 2800);
      return;
    }
    this.busy = true;
    try {
      const envelope = this.keeper.capture(sentence, this.contacts);
      if (!envelope.ok || !envelope.output) {
        void this.alerts.showToast(this.tr('loopkeeper.t.openErr'), 2200);
        return;
      }
      const loop = envelope.output;
      // 2026-08-28 CLOSED BETA: the daily habit starts with a capture — track
      // it (tester devices carry their numeric code automatically).
      this.analytics.track('loop_captured');
      this.captureInput = '';
      this.selectedId = loop.id;
      await this.refresh();
      // 2026-08-27 FIRST-LOOP ONBOARDING: the product wins the moment loop #1
      // is open — celebrate it once, then keep receipts ordinary.
      const firstDone = await this.storage.get<boolean>('loopkeeper_first_loop_done');
      if (!firstDone) {
        await this.storage.set('loopkeeper_first_loop_done', true);
        void this.alerts.showToast(this.tr('loopkeeper.t.firstLoop', { person: loop.person }), 3600);
      } else {
        void this.alerts.showToast(this.tr('loopkeeper.t.opened', { person: loop.person }), 2600);
      }
    } finally {
      this.busy = false;
    }
  }

  // ── Selection / editing ────────────────────────────────────────────────────
  // 2026-08-28 BUILD 128: toggle() moved up next to the nudge engine — opening
  // a nudged loop is the answer, so selection and acknowledgment are one act.
  sel(): Loop | null { return this.selectedId ? this.loops.getLoop(this.selectedId) ?? null : null; }

  setTone(l: Loop, t: LoopTone): void {
    this.loops.update(l.id, { tone: t, draft: this.loops.generateDraft(l, t) });
  }
  regenerate(l: Loop): void { this.loops.update(l.id, { draft: this.loops.generateDraft(l, l.tone), pretext: this.loops.suggestPretext(l) }); }
  saveWhy(l: Loop, why: string): void {
    // The user's own words beat any suggestion — and lock the source.
    this.loops.update(l.id, { whySitting: why.trim() || undefined, whySittingSource: why.trim() ? 'user' : undefined });
  }
  saveRelation(ev: any, l: Loop): void { this.loops.update(l.id, { relation: String(ev.target.value || '').trim() || undefined }); }
  setStance(l: Loop, s: Loop['stance']): void { this.loops.update(l.id, { stance: s, draft: this.loops.generateDraft({ ...l, stance: s }, l.tone) }); }
  newPretext(l: Loop): void { this.loops.update(l.id, { pretext: this.loops.suggestPretext(l) }); }

  // ── Deepen-Six (F13 clear · F21 intro B) ────────────────────────────────────
  clearSuggestedWhy(l: Loop): void { this.loops.update(l.id, { whySitting: undefined, whySittingSource: undefined }); }
  saveSecondPerson(ev: any, l: Loop): void {
    this.loops.update(l.id, { secondPerson: String(ev.target.value || '').trim() || undefined });
  }
  makeIntroB(l: Loop): void {
    const env = this.keeper.draftIntroNotes(l);
    if (env.ok) { this.showIntroBFor = l.id; void this.alerts.showToast(this.tr('loopkeeper.t.introDrafted'), 2600); }
    else void this.alerts.showToast(this.tr('loopkeeper.t.introErr'), 2200);
  }
  async copyIntroB(l: Loop): Promise<void> {
    try {
      await navigator.clipboard.writeText(l.introNoteB || '');
      void this.alerts.showToast(this.tr('loopkeeper.t.introCopied', { who: l.secondPerson || this.tr('loopkeeper.t.them') }), 2400);
    } catch { void this.alerts.showToast(this.tr('loopkeeper.t.copyErr'), 2500); }
  }
  markIntroDone(l: Loop): void {
    this.loops.closeFully(l.id); // the intro HAPPENED — one loop, celebrated once
    void this.refresh();
    // 2026-08-28 BUILD 129: the intro made two strangers into one story —
    // that is a true close, so it earns the culmination too.
    this.celebrate(l);
  }
  toggleVoice(l: Loop): void {
    this.showVoiceFor = this.showVoiceFor === l.id ? null : l.id;
    if (this.showVoiceFor && !l.voiceOutline) this.loops.update(l.id, { voiceOutline: this.loops.voiceOutline(l) });
  }
  setChannel(l: Loop, c: LoopChannel): void { this.loops.update(l.id, { channel: c }); }

  async polishAi(l: Loop): Promise<void> {
    void this.analytics.track('loop_draft_ai_polish');
    const env = await this.keeper.polish(l);
    const better = env.output ?? null;
    if (better) this.loops.update(l.id, { draft: better });
    else void this.alerts.showToast(this.tr('loopkeeper.t.polishErr'), 2200);
  }

  // ── Decision chips (4) ──────────────────────────────────────────────────────
  openWait(l: Loop): void {
    this.dropEditingId = null;
    this.waitEditingId = l.id;
    const d = new Date(Date.now() + 7 * 86400000);
    this.waitDate = d.toISOString().slice(0, 10);
    this.waitCond = l.waitCondition || '';
  }
  saveWait(l: Loop): void {
    if (!this.waitDate) return;
    this.loops.waitUntil(l.id, this.waitDate, this.waitCond);
    this.waitEditingId = null;
    void this.refresh();
    void this.alerts.showToast(this.waitCond
      ? this.tr('loopkeeper.t.parkedCond', { date: this.waitDate, cond: this.waitCond })
      : this.tr('loopkeeper.t.parked', { date: this.waitDate }), 2400);
  }

  openDrop(l: Loop): void { this.waitEditingId = null; this.dropEditingId = l.id; }
  confirmDrop(l: Loop, reason: string): void {
    this.loops.dropWithDignity(l.id, reason);
    this.dropEditingId = null;
    void this.refresh();
    void this.alerts.showToast(this.tr('loopkeeper.t.dropped'), 2800);
  }

  /** One-tap send (6) → receipt (8) */
  async send(l: Loop): Promise<void> {
    const channel = l.channel || 'sms';

    // ═══ VOICE: the recorder owns this path — never a fake-send. ═══
    if (channel === 'voice') {
      if (this.lastClipByLoop[l.id]) {
        this.showVoiceFor = l.id; // clip already recorded — finish it in the studio
        void this.alerts.showToast(this.tr('loopkeeper.t.takeReady'), 2400);
        return;
      }
      await this.startRecording(l);
      return;
    }

    // ═══ LINKEDIN: resolve the right landing surface FIRST. ═══
    if (channel === 'linkedin') {
      let target = l.handle || '';
      const ask = await this.alertCtrl.create({
        header: this.tr('loopkeeper.t.liTitle', { person: l.person }),
        message: this.tr('loopkeeper.t.liMsg'),
        inputs: [{ name: 'u', type: 'url', placeholder: 'https://www.linkedin.com/in/…' }],
        buttons: [
          { text: this.tr('loopkeeper.t.btnCancel'), role: 'cancel', handler: () => { target = '__cancel__'; return true; } },
          { text: this.tr('loopkeeper.t.liSearch'), handler: () => { target = ''; return true; } },
          { text: this.tr('loopkeeper.t.btnOpen'), handler: (d: any) => { target = String(d?.u || '').trim(); return true; } },
        ],
      });
      await ask.present();
      if (target === '__cancel__') return;
      if (target && target !== l.handle) this.loops.update(l.id, { handle: target }); // remembered for next time
      const bundle = this.loops.buildSend('linkedin', l);
      try { await navigator.clipboard.writeText(bundle.copyText); } catch { /* belt-and-suspenders */ }
      window.open(bundle.url!, '_blank', 'noopener');
      this.loops.markSent(l.id, 'linkedin', l.draft);
      // 2026-08-28 BUILD 130: the LinkedIn handoff closes its loop too —
      // fired and forgotten; the card's story gains the line.
      this.noteCard(l, 'Sent via LinkedIn');
      await this.refresh();
      this.celebrate(l);
      void this.alerts.showToast(
        bundle.label === 'LinkedIn · profile'
          ? this.tr('loopkeeper.t.liCopiedProfile')
          : this.tr('loopkeeper.t.liCopiedOther'), 3600);
      return;
    }

    // ═══ TELEGRAM: same honesty as LinkedIn — no prefilled web URL, so ask
    // for the @handle once (remembered on the loop), draft rides the
    // clipboard into the chat that opens. ═══
    if (channel === 'telegram' && !l.handle) {
      let target = '';
      const ask = await this.alertCtrl.create({
        header: this.tr('loopkeeper.t.tgTitle', { person: l.person }),
        message: this.tr('loopkeeper.t.tgMsg'),
        inputs: [{ name: 'u', type: 'text', placeholder: '@handle' }],
        buttons: [
          { text: this.tr('loopkeeper.t.btnCancel'), role: 'cancel', handler: () => { target = '__cancel__'; return true; } },
          { text: this.tr('loopkeeper.t.btnSaveSend'), handler: (d: any) => { target = String(d?.u || '').trim(); return !!target; } },
        ],
      });
      await ask.present();
      if (target === '__cancel__') return;
      if (target) this.loops.update(l.id, { handle: target }); // remembered for next time
    }

    let handle = l.handle || '';
    if (!handle) {
      const ask = await this.alertCtrl.create({
        header: this.tr('loopkeeper.t.contactTitle', {
          ch: this.tr(channel === 'email' ? 'loopkeeper.t.chEmail' : 'loopkeeper.t.chPhone'),
          person: l.person,
        }),
        message: this.tr('loopkeeper.t.contactMsg'),
        inputs: [{ name: 'h', type: channel === 'email' ? 'email' : 'tel', placeholder: channel === 'email' ? 'name@example.com' : '+234…' }],
        buttons: [
          { text: this.tr('loopkeeper.t.btnCancel'), role: 'cancel' },
          { text: this.tr('loopkeeper.t.btnSaveSend'), handler: (d: any) => { handle = String(d?.h || '').trim(); return !!handle; } },
        ],
      });
      await ask.present();
      if (!handle) return;
      this.loops.update(l.id, { handle });
    }
    const bundle = this.keeper.send(l);
    try { await navigator.clipboard.writeText(bundle.copyText); } catch { /* clipboard denied — url still carries text */ }
    if (bundle.url) window.open(bundle.url, '_blank', 'noopener');
    // 2026-08-28 BUILD 130: SENDING IS THE CLOSE. Dispatch = deed done = mind
    // free. The loop closes with its receipt, the card's story gains the line,
    // and the culmination plays — no "awaiting reply" limbo, no anxiety held
    // on a dynamic outside the user's control. A reply arriving later raises
    // a FRESH loop (the next autonomous prompt).
    this.loops.markSent(l.id, channel, l.draft || '');
    this.noteCard(l, `Sent via ${bundle.label}`);
    await this.refresh();
    this.celebrate(l);
  }

  // ═══ 2026-08-27 TIMED CLOSER — the pat on the back ═══════════════════════
  // Founder directive: completing a loop is proof the user's power works —
  // "you did this. Closed a loop. Enhanced a contact card." Celebrated ONLY
  // when the loop actually maps to a card in the deck (data was gleaned back
  // INTO LoopKeeper); copying outward away from the app keeps the standard
  // receipt toast. Drops keep their dignity line — a drop gleans nothing.
  private cardFor(l: Loop): any | null {
    const target = String(l.person || '').trim().toLowerCase();
    if (!target) return null;
    return (this.contacts || []).find((c: any) => {
      const name = String(c?.name?.display || '').trim().toLowerCase();
      if (!name) return false;
      return name === target || name.includes(target) || target.includes(name);
    }) || null;
  }

  // ═══ 2026-08-28 BUILD 130: THE LOOP MEETS THE CARD ════════════════════════
  // A nudge is never an orphan prompt — every expanded loop that matches a
  // deck card shows that card's own comms (in-app chat, video, phone) and
  // every dispatch writes back into the relationship's rolling context.

  /** Write a line into the matched card's rolling story and ask HomePage to
   *  persist the deck. Same channel as the card's own follow-ups use. */
  private noteCard(l: Loop, line: string): void {
    const card = this.cardFor(l);
    if (!card) return;
    this.draftEngine.pushContext(card, `${line} (${new Date().toLocaleDateString()})`);
    card.lastInteraction = new Date(); // 2026-08-28 BUILD 131: the structured field, not just the story
    this.contactsDirty.emit();
  }

  /** The matched card's first phone, if the deck knows one. */
  loopPhone(l: Loop): string {
    const card = this.cardFor(l);
    return card?.phones?.[0]?.number || card?.phone || '';
  }

  /** In-app chat, straight from the loop — the card's own thread, seeded and
   *  carrying the loop's draft as the opening composer payload. */
  async openLoopChat(l: Loop): Promise<void> {
    const card = this.cardFor(l);
    if (!card) return;
    const thread = await this.cardChat.seedThread(card);
    const modal = await this.modalCtrl.create({
      component: CardChatModalComponent,
      componentProps: {
        thread,
        sendeePhone: card?.phones?.[0]?.number || '',
        sendeePhones: (card?.phones || []).map((p: any) => p.number).filter(Boolean),
        prefill: l.draft || '',
      },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95, 1],
      initialBreakpoint: 1,
      keyboardClose: false,
    });
    await modal.present();
  }

  /** WebRTC video call + clip, straight from the loop — the card's own embed. */
  async openLoopVideo(l: Loop): Promise<void> {
    const card = this.cardFor(l);
    if (!card) return;
    const modal = await this.modalCtrl.create({
      component: VideoCallModalComponent,
      componentProps: {
        contact: card,
        contactName: card?.name?.display || l.person,
      },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95, 1],
      initialBreakpoint: 0.95,
      keyboardClose: false,
    });
    await modal.present();
  }

  /** Plain phone call — the most human channel, one tap from the loop. */
  callContact(l: Loop): void {
    const phone = this.loopPhone(l);
    if (phone) window.open(`tel:${phone}`, '_self');
  }

  /** 2026-08-28 BUILD 129: the reply landed — the receipt line becomes the
   *  close tap. This is the step "Mark closed when it lands" always promised
   *  (t.sentOut) but never offered. Kept for legacy open rows that still
   *  carry a receipt; fresh sends now close on dispatch (build 130). */
  closeFromReceipt(l: Loop): void {
    this.loops.closeFully(l.id);
    this.noteCard(l, 'Their reply came in');
    void this.refresh();
    this.celebrate(l);
  }

  /** 2026-08-28 BUILD 129: the culmination, shown on EVERY true close —
   *  reply landed, intro happened, coffee taken, their reply arrived. One
   *  breath: the ✓ pops, the person is named, the freed count counts UP.
   *  Card matches add the pat on the back (data gleaned back into LoopKeeper). */
  private celebrate(l: Loop): void {
    this.celebrating = { name: l.person, count: this.counts.closedThisWeek, cardLine: !!this.cardFor(l) };
    if (this.celebrateTimer) clearTimeout(this.celebrateTimer);
    this.celebrateTimer = setTimeout(() => { this.celebrating = null; }, 3600);
  }

  markThemReplied(l: Loop): void {
    this.loops.closeFully(l.id);
    // 2026-08-28 BUILD 130: their reply is relationship data — the card learns.
    this.noteCard(l, 'They replied');
    void this.refresh();
    // 2026-08-28 BUILD 129: the overlay IS the celebration now — one moment,
    // not a toast racing the refresh.
    this.celebrate(l);
  }

  // ═══ 2026-08-25 VOICE NOTE STUDIO ═══════════════════════════════════════════

  private pickVoiceMime(): string {
    const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
    for (const m of candidates) {
      try { if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m; } catch { /* keep probing */ }
    }
    return '';
  }

  /** Arm + start the mic. Outline is ensured first so the speaker plan is visible. */
  async startRecording(l: Loop): Promise<void> {
    if (this.recordingFor) return;
    if (!this.loops.getLoop(l.id)?.voiceOutline) {
      this.loops.update(l.id, { voiceOutline: this.loops.voiceOutline(l) });
    }
    this.showVoiceFor = l.id;
    const md = (navigator as any)?.mediaDevices;
    if (!md?.getUserMedia || typeof MediaRecorder === 'undefined') {
      // Graceful degradation: outline to clipboard, loop stays open, nothing faked.
      try { await navigator.clipboard.writeText(this.loops.getLoop(l.id)?.voiceOutline || ''); } catch { /* ignore */ }
      void this.alerts.showToast(this.tr('loopkeeper.t.recUnsupported'), 3400);
      return;
    }
    try {
      const stream = await md.getUserMedia({ audio: true });
      this.recStream = stream;
      this.recMime = this.pickVoiceMime();
      this.recorder = new MediaRecorder(stream, this.recMime ? { mimeType: this.recMime } : undefined);
      this.recChunks = [];
      this.recCancelled = false;
      this.recorder.ondataavailable = (e) => { if (e.data?.size) this.recChunks.push(e.data); };
      this.recorder.onstop = () => this.finalizeRecording();
      this.recorder.start();
      this.recordingFor = l.id;
      this.recordingSeconds = 0;
      this.recTimer = setInterval(() => { this.recordingSeconds++; }, 1000);
    } catch {
      void this.alerts.showToast(this.tr('loopkeeper.t.recDenied'), 2800);
    }
  }

  stopRecording(): void {
    if (!this.recorder || this.recorder.state === 'inactive') return;
    try { this.recorder.stop(); } catch { /* finalize guards */ }
    clearInterval(this.recTimer);
  }

  cancelRecording(): void {
    this.recCancelled = true;
    this.stopRecording();
  }

  private finalizeRecording(): void {
    const loopId = this.recordingFor;
    const seconds = this.recordingSeconds;
    this.recordingFor = null;
    this.recordingSeconds = 0;
    clearInterval(this.recTimer);
    this.recStream?.getTracks().forEach(t => t.stop());
    this.recStream = null;
    this.recorder = null;
    if (this.recCancelled || !loopId || !this.recChunks.length) {
      this.recChunks = []; this.recCancelled = false;
      return; // cancelled takes are NEVER kept
    }
    const type = this.recMime || 'audio/webm';
    const blob = new Blob(this.recChunks, { type });
    this.recChunks = [];
    const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
    const old = this.lastClipByLoop[loopId];
    if (old) URL.revokeObjectURL(old.url);
    this.lastClipByLoop[loopId] = { url: URL.createObjectURL(blob), blob, ext, seconds };
    void this.alerts.showToast(this.tr('loopkeeper.t.recCaptured', { s: seconds }), 2400);
  }

  discardClip(l: Loop): void {
    const clip = this.lastClipByLoop[l.id];
    if (clip) { URL.revokeObjectURL(clip.url); delete this.lastClipByLoop[l.id]; }
  }

  /** Share the take into the REAL app (WhatsApp/Mail/… via the OS share sheet).
   *  Receipt fires ONLY on a genuine share — a mere download never marks sent. */
  async sendVoiceNote(l: Loop): Promise<void> {
    const clip = this.lastClipByLoop[l.id];
    if (!clip) return;
    const filename = `loopkeeper-${(l.person || 'note').replace(/\W+/g, '-').toLowerCase()}.${clip.ext}`;
    const file = new File([clip.blob], filename, { type: clip.blob.type });
    const nav: any = navigator;
    if (nav.canShare?.files && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: `For ${l.person}` });
        // 2026-08-28 BUILD 130: a voice note DISPATCHED is a loop closed —
        // fired and forgotten, the card's story gains the line.
        this.loops.markSent(l.id, 'voice', `Voice note (${clip.seconds}s)`);
        this.noteCard(l, 'Sent a voice note');
        this.discardClip(l);
        await this.refresh();
        this.celebrate(l);
        return;
      } catch { return; /* user dismissed the share sheet — nothing sent */ }
    }
    // Share-API-less browsers: save locally, attach manually. Loop stays OPEN.
    const a = document.createElement('a');
    a.href = clip.url; a.download = filename; a.click();
    void this.alerts.showToast(this.tr('loopkeeper.t.attachSaved'), 3600);
  }

  ngOnDestroy(): void {
    // 2026-08-28 BUILD 125: stop the placeholder rotation with the tab.
    if (this.phTimer) { clearInterval(this.phTimer); this.phTimer = null; }
    // 2026-08-28 BUILD 128: stop the reveal flash with the tab.
    if (this.flashTimer) { clearTimeout(this.flashTimer); this.flashTimer = null; }
    // 2026-08-28 BUILD 129: stop the culmination overlay with the tab.
    if (this.celebrateTimer) { clearTimeout(this.celebrateTimer); this.celebrateTimer = null; }
    // Mid-recording navigation: stop cleanly, release the mic, drop the take.
    if (this.recordingFor) this.cancelRecording();
    this.recStream?.getTracks().forEach(t => t.stop());
    Object.values(this.lastClipByLoop).forEach(c => URL.revokeObjectURL(c.url));
  }

  /** 2026-08-28 BUILD 128: batch escape hatch — snooze every prompt at once.
   *  The glow calms and the bar drops to zero with the refresh below. */
  dismissNudges(): void {
    for (const l of this.loops.dueNudges()) this.loops.registerNudgeSent(l.id);
    this.nudgeIds.clear();
    this.nudgesDue = 0;
    void this.refresh();
  }

  // ── View helpers ───────────────────────────────────────────────────────────
  rel(ts?: number): string {
    if (!ts) return 'unknown';
    const d = Math.floor((Date.now() - ts) / 86400000);
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 30) return `${d}d ago`;
    return `${Math.floor(d / 30)}mo ago`;
  }
  sitting(l: Loop): number { return this.loops.daysSitting(l); }
  kindLabel(k: string): string { return k.replace('-', ' '); }
}
