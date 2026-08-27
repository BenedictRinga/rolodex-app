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

  tab: 'loops' | 'chat' | 'reminders' = 'loops';

  readonly languages: { code: string; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'sw', label: 'Swahili' },
    { code: 'am', label: 'Amharic' },
    { code: 'so', label: 'Somali' },
    { code: 'ar', label: 'Arabic' },
    { code: 'ha', label: 'Hausa' },
    { code: 'fr', label: 'French' },
    { code: 'zh-cmn-Hans', label: 'Chinese' },
    { code: 'hi', label: 'Hindi' },
    { code: 'pt-PT', label: 'Portuguese' },
    { code: 'de', label: 'German' },
  ];
  currentLang = 'en';

  todaysThree: Loop[] = [];
  mine: Loop[] = [];
  theirs: Loop[] = [];
  closed: Loop[] = [];
  counts = { mine: 0, theirs: 0, closedThisWeek: 0 };
  nudgesDue = 0;

  captureInput = '';
  busy = false;
  selectedId: string | null = null;
  showVoiceFor: string | null = null;

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
  ) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
  }

  /** 2026-08-27 THE LOOP CONSULT — apex distilled format (USE_NOW.txt).
   *  One tap = who/what/where/when vitals + verdict + ONE draft. When the
   *  card hands back 'open-row', expand that row so the send machinery
   *  (the only channel path) is right there with the fresh draft. */
  async openConsult(l: Loop): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: LoopConsultComponent,
      componentProps: { c: l },
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
    // F11/F12: sweep the deck silently — owed replies + stale promises become
    // loops BEFORE the lists paint. No toast unless something was created.
    if (this.contacts?.length) void this.keeper.scanInboxSignals(this.contacts);
    await this.refresh();
    const woke = await this.loops.resumeExpiredWaits();
    const due = this.loops.dueNudges();
    this.nudgesDue = due.length + woke.length;
  }

  private async refresh(): Promise<void> {
    this.todaysThree = await this.loops.todaysThree();
    this.mine = this.loops.openMine().filter(l => !this.todaysThree.includes(l));
    this.theirs = this.loops.waitingOnThem();
    this.closed = this.loops.recentlyClosed();
    this.counts = this.loops.counts();
  }

  // ── Capture (10) ────────────────────────────────────────────────────────────
  async addCapture(text?: string): Promise<void> {
    const sentence = (text ?? this.captureInput).trim();
    if (!sentence || this.busy) return;
    this.busy = true;
    try {
      const envelope = this.keeper.capture(sentence, this.contacts);
      if (!envelope.ok || !envelope.output) {
        void this.alerts.showToast(this.tr('loopkeeper.t.openErr'), 2200);
        return;
      }
      const loop = envelope.output;
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
  toggle(id: string): void { this.selectedId = this.selectedId === id ? null : id; }
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
    void this.alerts.showToast(this.tr('loopkeeper.t.introMade', { a: l.person, b: l.secondPerson || this.tr('loopkeeper.t.them') }), 3000);
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
      this.loops.markSent(l.id, 'linkedin', l.draft,
        (l.kind === 'coffee' || l.kind === 'social') ? 'closed' : 'reply-needed');
      await this.refresh();
      void this.alerts.showToast(
        bundle.label === 'LinkedIn · profile'
          ? this.tr('loopkeeper.t.liCopiedProfile')
          : this.tr('loopkeeper.t.liCopiedOther'), 3600);
      return;
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
    const doneMeans: 'reply-needed' | 'closed' = (l.kind === 'coffee' || l.kind === 'social') ? 'closed' : 'reply-needed';
    if (bundle.url) window.open(bundle.url, '_blank', 'noopener');
    await this.refresh();
    const left = this.counts.mine;
    void this.alerts.showToast(
      doneMeans === 'closed'
        ? this.tr('loopkeeper.t.sentClosed', { person: l.person, n: left })
        : this.tr('loopkeeper.t.sentOut', { label: bundle.label }),
      3400,
    );
  }

  markThemReplied(l: Loop): void {
    this.loops.closeFully(l.id);
    void this.refresh();
    void this.alerts.showToast(this.tr('loopkeeper.t.replied', { person: l.person, n: this.counts.mine }), 3000);
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
        const doneMeans = (l.kind === 'coffee' || l.kind === 'social') ? 'closed' : 'reply-needed';
        this.loops.markSent(l.id, 'voice', `Voice note (${clip.seconds}s)`, doneMeans as any);
        this.discardClip(l);
        await this.refresh();
        void this.alerts.showToast(doneMeans === 'closed'
          ? this.tr('loopkeeper.t.voiceClosed', { person: l.person })
          : this.tr('loopkeeper.t.voiceSent', { person: l.person }), 3200);
        return;
      } catch { return; /* user dismissed the share sheet — nothing sent */ }
    }
    // Share-API-less browsers: save locally, attach manually. Loop stays OPEN.
    const a = document.createElement('a');
    a.href = clip.url; a.download = filename; a.click();
    void this.alerts.showToast(this.tr('loopkeeper.t.attachSaved'), 3600);
  }

  ngOnDestroy(): void {
    // Mid-recording navigation: stop cleanly, release the mic, drop the take.
    if (this.recordingFor) this.cancelRecording();
    this.recStream?.getTracks().forEach(t => t.stop());
    Object.values(this.lastClipByLoop).forEach(c => URL.revokeObjectURL(c.url));
  }

  dismissNudges(): void {
    for (const l of this.loops.dueNudges()) this.loops.registerNudgeSent(l.id);
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
