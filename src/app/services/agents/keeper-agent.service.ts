import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { LoopsService, Loop, LoopTone, LoopChannel } from '../loops/loops.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AgentEnvelope, AgentSource, LoopAgentEvent, LoopDecision } from './agents.types';
import { AGENT_DIRECTIVES } from './directives';
import { LoopSignalsService } from '../loops/loop-signals.service';
import { userLang } from '../lang/user-lang';

/**
 * 2026-08-25 THE KEEPER — orchestrator of the LoopKeeper agent hierarchy.
 * Wraps LoopsService (the deterministic device engine — single source of truth,
 * never duplicated here) and is the ONLY agent permitted network egress
 * (stateless /chat passthrough, user-initiated only).
 * Pipeline order is structural: capture → packet → draft → decide → send → receipt.
 */
@Injectable({ providedIn: 'root' })
export class KeeperAgentService {
  readonly events$ = new Subject<LoopAgentEvent>();

  constructor(
    private loops: LoopsService,
    private analytics: AnalyticsService,
    private signals: LoopSignalsService,
    private translate: TranslateService,
  ) {}

  /** STAGE 1 — capture. intake → owed-reply → promise-extract, now enriched
   *  from the resolved CARD when one matches (F11/F12/F13). */
  capture(sentence: string, contacts: any[] = []): AgentEnvelope<Loop> {
    const t0 = Date.now();
    try {
      const pre = this.loops.parseCapture(sentence);
      const contact = this.resolveContact(pre.person || '', contacts);
      const loop = this.loops.create(
        contact ? this.loops.parseCapture(sentence, contact) : pre,
      );
      this.emit('loop:captured', loop.id, 'device');
      if (contact) this.emit('signal:detected', loop.id, 'device');
      this.analytics.track('loop_captured');
      return { agent: 'intake', at: t0, source: 'device', ok: true, output: loop };
    } catch (e: any) {
      return { agent: 'intake', at: t0, source: 'device', ok: false, error: String(e?.message || e) };
    }
  }

  /** STAGE 2 — packet (deterministic; packet fields already live on the loop). */
  buildPacket(loop: Loop): AgentEnvelope<Pick<Loop, 'person' | 'relation' | 'lastTouchAt' | 'promise' | 'whySitting' | 'stance'>> {
    this.emit('loop:packet:built', loop.id, 'device');
    const { person, relation, lastTouchAt, promise, whySitting, stance } = loop;
    return { agent: 'packet', at: Date.now(), source: 'device', ok: true,
      output: { person, relation, lastTouchAt, promise, whySitting, stance } };
  }

  /** STAGE 3a — draft (device). */
  draft(loop: Loop, tone: LoopTone = loop.tone): AgentEnvelope<string> {
    const text = this.loops.generateDraft(loop, tone);
    this.loops.update(loop.id, { tone });
    this.emit('loop:draft:ready', loop.id, 'device');
    return { agent: 'composer', at: Date.now(), source: 'device', ok: true, output: text };
  }

  /** STAGE 3b — LLM ESCALATION. The ONLY path loop content may cross the wire.
   *  Stateless /chat passthrough; failure returns null and the DEVICE draft stands. */
  async polish(loop: Loop): Promise<AgentEnvelope<string | null>> {
    const d = AGENT_DIRECTIVES.composer;
    try {
      const res = await fetch(`${environment.rolodexApiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'deepseek',
          // 2026-08-27 CHAT LANGUAGE: the polished draft must come back in the
          // user's language — even when the device draft started English.
          lang: userLang(this.translate),
          messages: [{
            role: 'user',
            content: `${d.role} Rules: ${d.toneGuardrails.join('; ')}. `
              + `Tone: ${loop.tone}. Under 80 words. Message:\n"""${loop.draft}"""`,
          }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      const better = data?.reply ? String(data.reply) : null;
      if (better) this.loops.update(loop.id, { draft: better });
      return { agent: 'composer', at: Date.now(), source: 'llm', ok: !!better, output: better };
    } catch (e: any) {
      return { agent: 'composer', at: Date.now(), source: 'llm', ok: false,
        error: String(e?.message || e), output: null };
    }
  }

  /** STAGE 4 — decision. Dispatches to LoopsService mutators; emits once. */
  decide(loop: Loop, decision: LoopDecision): AgentEnvelope<boolean> {
    switch (decision.action) {
      case 'wait':
        this.loops.waitUntil(loop.id, decision.isoDay, decision.condition);
        break;
      case 'drop':
        this.loops.dropWithDignity(loop.id, decision.reason);
        this.emit('loop:dropped', loop.id, 'device');
        break;
      case 'send':
        // send goes through stage 5; a bare 'send' decision just arms the channel
        this.loops.update(loop.id, { channel: decision.channel });
        break;
    }
    this.emit('loop:decision', loop.id, 'device');
    return { agent: 'decision', at: Date.now(), source: 'device', ok: true, output: true };
  }

  /** STAGE 5+6 — send + receipt (one motion, as shipped). */
  send(loop: Loop): { envelope: AgentEnvelope<boolean>; url?: string; copyText: string; label: string } {
    const channel = (loop.channel || 'sms') as LoopChannel;
    const bundle = this.loops.buildSend(channel, loop);
    // 2026-08-28 BUILD 130: SENDING IS THE CLOSE — every dispatch closes its
    // loop (fired and forgotten); no doneMeans branching anymore.
    this.loops.markSent(loop.id, channel, loop.draft);
    this.emit('loop:sent', loop.id, 'device');
    this.emit('loop:closed', loop.id, 'device');
    return {
      envelope: { agent: 'receipt', at: Date.now(), source: 'device', ok: true },
      url: bundle.url, copyText: bundle.copyText, label: bundle.label,
    };
  }

  /** Nudge tick — called by the inbox on load; returns due loop ids. */
  dueNudges(): string[] {
    return this.loops.dueNudges().map(l => {
      this.emit('nudge:fired', l.id, 'device');
      return l.id;
    });
  }

  // ══ Deepen-Six orchestration (2026-08-25) ═════════════════════════════════

  /** First-name match against the deck — device-only resolution. */
  private resolveContact(person: string, contacts: any[]): any | undefined {
    const first = String(person || '').split(/\s+/)[0].toLowerCase();
    if (!first || first === 'unnamed' || first === 'someone') return undefined;
    return (contacts || []).find((c: any) =>
      !c?.isMockData &&
      String(c?.name?.display || '').split(/\s+/)[0].toLowerCase() === first);
  }

  /** F11/F12 sweep — deck → signals → deduped loops. Called on inbox open. */
  async scanInboxSignals(contacts: any[]): Promise<AgentEnvelope<{ scanned: number; created: number }>> {
    const found = this.signals.scanDeck(contacts || []);
    const made = await this.loops.ingestSignals(found);
    for (const l of made) {
      this.emit('loop:captured', l.id, 'device');
      this.emit('signal:detected', l.id, 'device');
    }
    return { agent: 'intake', at: Date.now(), source: 'device', ok: true,
      output: { scanned: (contacts || []).length, created: made.length } };
  }

  /** F21 — draft BOTH intro notes; the B-side parks until its UI gate lifts. */
  draftIntroNotes(loop: Loop): AgentEnvelope<{ noteA: string; noteB: string }> {
    try {
      const { noteA, noteB } = this.loops.generateIntroNotes(loop);
      this.loops.update(loop.id, { draft: noteA, introNoteB: noteB });
      this.emit('loop:draft:ready', loop.id, 'device');
      return { agent: 'composer', at: Date.now(), source: 'device', ok: true, output: { noteA, noteB } };
    } catch (e: any) {
      return { agent: 'composer', at: Date.now(), source: 'device', ok: false, error: String(e?.message || e) };
    }
  }

  // REVEAL-LATER: calendar auto-open — flip ONLY after manual meeting-loops
  // prove the recap UX for a full week. Hook wired; visibility withheld.
  private static readonly MEETING_AUTO_OPEN_ENABLED = false;

  /** F23 — auto-open meeting follow-ups. GATED: returns [] while disabled. */
  async maybeAutoOpenMeetingFollowUps(events: any[], contacts: any[]): Promise<Loop[]> {
    if (!KeeperAgentService.MEETING_AUTO_OPEN_ENABLED) return [];
    const cutoff = Date.now() - 24 * 3600_000;
    const firstWords = (contacts || [])
      .filter((c: any) => !c?.isMockData)
      .map((c: any) => ({ c, w: String(c?.name?.display || '').split(/\s+/)[0].toLowerCase() }))
      .filter((x: any) => x.w.length > 1);
    const made: Loop[] = [];
    for (const ev of events || []) {
      const end = ev?.end ? new Date(ev.end).getTime() : NaN;
      if (!isFinite(end) || end < cutoff || end > Date.now()) continue;
      const title = String(ev?.title || '').toLowerCase();
      const hit = firstWords.find((x: any) => title.includes(x.w))?.c;
      if (!hit || this.loops.hasOpenLoop(String(hit.name?.display), 'meeting')) continue;
      const l = this.loops.openMeetingFollowUp(hit, String(ev?.title || ''));
      made.push(l);
      this.emit('loop:captured', l.id, 'device');
    }
    return made;
  }

  private emit(type: LoopAgentEvent['type'], loopId: string, source: AgentSource): void {
    this.events$.next({ type, loopId, source, at: Date.now() });
  }
}
