import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Loop } from '../../services/loops/loops.service';
import { KeeperAgentService } from '../../services/agents/keeper-agent.service';
import { TranslateService } from '@ngx-translate/core';

/**
 * ═════════════════════════════════════════════════════════════════════
 * 2026-08-27 THE LOOP CONSULT — the APEX DISTILLED FORMAT (USE_NOW.txt).
 *
 * The primary deck is an IRS filing by design; the chat threads distill;
 * this card is the GP's FIRST CONSULTATION — fun-like, one tap away any
 * time, derived live from the persisted loop (nothing new to store).
 * WHO / WHAT / WHERE / WHEN are bolded and visually flagged so both the
 * deterministic engine and a tapped-in AI polish can harness them at a
 * glance for exactly ONE draft — never an A/B menu (the founder's rule).
 *
 * 2026-08-28 BUILD 124 GROUND-ZERO DOCTRINE: the WHERE and WHEN of the
 * 4 W's are RECOLLECTIVE — where and under what circumstances the user
 * FIRST met this person — never appointive. The consult therefore reads
 * them from the matched deck card's Memory-Joggers (rolodex.where/when)
 * when the loop maps to a card, and falls back to loop-state timing
 * (quiet days / parked) only when no recollection exists. The channel
 * (prospectively "where the send lands") keeps its honest place in the
 * verdict line — it is no longer dressed up as the WHERE vital.
 * ═════════════════════════════════════════════════════════════════════
 */
@Component({
  selector: 'app-loop-consult',
  templateUrl: './loop-consult.component.html',
  styleUrls: ['./loop-consult.component.scss'],
})
export class LoopConsultComponent {
  /** The persisted loop under consultation (injected via componentProps). */
  c!: Loop;
  /** 2026-08-28 BUILD 124: the matched deck card (optional) — carries the
   *  recollective ground zero (rolodex.where / rolodex.when). */
  card?: any;

  busy = false;
  polishing = false;

  private readonly DAY = 86_400_000;

  constructor(
    private modalCtrl: ModalController,
    private keeper: KeeperAgentService,
    private translate: TranslateService,
  ) {}

  // ── Vitals (who/what/where/when, pre-chewed for the harness) ──────────

  get quietDays(): number {
    const last = this.c.lastTouchAt || this.c.createdAt;
    return Math.max(0, Math.floor((Date.now() - last) / this.DAY));
  }

  get whatText(): string {
    return this.c.promise || this.c.summary || '';
  }

  get whenKey(): string {
    if (this.c.waitUntil) return 'loopkeeper.consult.whenParked';
    if (this.quietDays <= 0) return 'loopkeeper.consult.whenToday';
    return 'loopkeeper.consult.whenQuiet';
  }

  get whenParams(): Record<string, unknown> {
    if (this.c.waitUntil) return { date: new Date(this.c.waitUntil).toLocaleDateString() };
    if (this.quietDays <= 0) return {};
    return { n: this.quietDays };
  }

  get whereLabel(): string {
    const ch = this.c.receipt?.channel || this.c.channel;
    switch (ch) {
      case 'whatsapp': return 'WhatsApp';
      case 'sms': return 'SMS';
      case 'email': return 'Email';
      case 'linkedin': return 'LinkedIn';
      case 'voice': return this.tr('loopkeeper.consult.chVoice');
      default: return '';
    }
  }

  // ── 2026-08-28 BUILD 124 GROUND ZERO (recollective W's) ──────────────
  /** WHERE the user FIRST met this person — from the deck card's W's. */
  get whereMet(): string {
    return String(this.card?.rolodex?.where || '').trim();
  }

  /** WHEN the user FIRST met this person — circumstances welcome. Legacy
   *  ISO timestamps (old date-picker values) are softened to a readable
   *  date; free text like "Mar 2024 · her book launch" shows verbatim. */
  get whenMet(): string {
    const raw = String(this.card?.rolodex?.when || '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return raw;
  }

  /** The GP's one-line verdict — matches the loop's real state machine. */
  get verdictKey(): string {
    if (this.c.status === 'waiting') {
      return this.c.waitCondition
        ? 'loopkeeper.consult.verdictParkedCond'
        : 'loopkeeper.consult.verdictParked';
    }
    if (this.c.receipt?.doneMeans === 'closed') return 'loopkeeper.consult.verdictDone';
    if (this.c.receipt) return 'loopkeeper.consult.verdictAwaiting';
    return this.c.stance === 'overdue-apology'
      ? 'loopkeeper.consult.verdictOwed'
      : 'loopkeeper.consult.verdictOpen';
  }

  get verdictParams(): Record<string, unknown> {
    const p = { person: this.c.person || '', channel: this.whereLabel };
    if (this.c.status === 'waiting' && this.c.waitCondition) {
      return { ...p, cond: this.c.waitCondition };
    }
    return p;
  }

  tr(key: string): string {
    return this.translate.instant(key);
  }

  /** LoopKind is already human ("owed-reply", "coffee", …) — just soften dashes. */
  kindOf(): string {
    return String(this.c.kind || '').replace('-', ' ');
  }

  // ── The single-draft harness ─────────────────────────────────────────

  /** ONE draft. Device-first; the result REPLACES nothing else — there is no B. */
  async draftIt(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try { this.keeper.draft(this.c); } finally { this.busy = false; }
  }

  /** Backend AI touch-up — swaps THE draft in place. Still never two options. */
  async makeBetter(): Promise<void> {
    if (this.polishing) return;
    this.polishing = true;
    try { await this.keeper.polish(this.c); } finally { this.polishing = false; }
  }

  /** Hand off to the row's full send machinery — no duplicate channel logic. */
  openRowToSend(): void {
    void this.modalCtrl.dismiss({ action: 'open-row', loopId: this.c.id });
  }

  close(): void {
    void this.modalCtrl.dismiss();
  }

  daysSince(ts?: number): string {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString();
  }
}
