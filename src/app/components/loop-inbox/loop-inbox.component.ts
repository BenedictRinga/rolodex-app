import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import {
  LoopsService, Loop, LoopTone, LoopChannel,
} from '../../services/loops/loops.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { AnalyticsService } from '../../services/analytics/analytics.service';
import { KeeperAgentService } from '../../services/agents/keeper-agent.service';

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
export class LoopInboxComponent implements OnInit {
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
  readonly dropReasons = [
    'Wrong time — revisit later',
    'Not worth it, honestly',
    'The relationship cooled',
    'Handled outside the app',
  ];

  readonly sampleCaptures = [
    'Need to reply to Priya about the Thursday slot',
    'Promised Tunde I\'d send the deck',
    'We should grab coffee with Amara',
  ];

  constructor(
    private loops: LoopsService,
    private alerts: AlertsService,
    private analytics: AnalyticsService,
    private alertCtrl: AlertController,
    private translate: TranslateService,
    private keeper: KeeperAgentService,
  ) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
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
        void this.alerts.showToast('Could not open that loop — try again.', 2200);
        return;
      }
      const loop = envelope.output;
      this.captureInput = '';
      this.selectedId = loop.id;
      await this.refresh();
      void this.alerts.showToast(`Loop opened with ${loop.person} — draft ready.`, 2600);
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
    if (env.ok) { this.showIntroBFor = l.id; void this.alerts.showToast('Both intro notes drafted — A is live below.', 2600); }
    else void this.alerts.showToast('Could not draft the pair — try again.', 2200);
  }
  async copyIntroB(l: Loop): Promise<void> {
    try {
      await navigator.clipboard.writeText(l.introNoteB || '');
      void this.alerts.showToast('B-note copied — send it to ' + (l.secondPerson || 'them'), 2400);
    } catch { void this.alerts.showToast('Could not copy — select the text manually', 2500); }
  }
  markIntroDone(l: Loop): void {
    this.loops.closeFully(l.id); // the intro HAPPENED — one loop, celebrated once
    void this.refresh();
    void this.alerts.showToast(`✅ Intro made: ${l.person} ↔ ${l.secondPerson || 'them'}. Closed.`, 3000);
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
    else void this.alerts.showToast('AI polish unavailable — local draft stands.', 2200);
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
    void this.alerts.showToast(`Parked until ${this.waitDate}${this.waitCond ? ' — ' + this.waitCond : ''}`, 2400);
  }

  openDrop(l: Loop): void { this.waitEditingId = null; this.dropEditingId = l.id; }
  confirmDrop(l: Loop, reason: string): void {
    this.loops.dropWithDignity(l.id, reason);
    this.dropEditingId = null;
    void this.refresh();
    void this.alerts.showToast('Dropped with dignity. Closing by dropping is still closing.', 2800);
  }

  // ── One-tap send (6) → receipt (8) ─────────────────────────────────────────
  async send(l: Loop): Promise<void> {
    const channel = l.channel || 'sms';
    let handle = l.handle || '';
    if (channel !== 'linkedin' && channel !== 'voice' && !handle) {
      const ask = await this.alertCtrl.create({
        header: `${channel === 'email' ? 'Email' : 'Phone'} for ${l.person}`,
        message: 'Stored on this device only — used to open the right app.',
        inputs: [{ name: 'h', type: channel === 'email' ? 'email' : 'tel', placeholder: channel === 'email' ? 'name@example.com' : '+234…' }],
        buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save & send', handler: (d: any) => { handle = String(d?.h || '').trim(); return !!handle; } }],
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
        ? `✅ Loop CLOSED with ${l.person}. ${left} open left.`
        : `📤 Sent via ${bundle.label}. Done means: their reply. Mark closed when it lands.`,
      3400,
    );
  }

  markThemReplied(l: Loop): void {
    this.loops.closeFully(l.id);
    void this.refresh();
    void this.alerts.showToast(`✅ ${l.person} replied — loop closed. ${this.counts.mine} open left.`, 3000);
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
