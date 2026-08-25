import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoopsService, Loop, LoopTone, LoopChannel } from '../loops/loops.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AgentEnvelope, AgentSource, LoopAgentEvent, LoopDecision } from './agents.types';
import { AGENT_DIRECTIVES } from './directives';

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
  ) {}

  /** STAGE 1 — capture. intake → owed-reply → promise-extract (inside parseCapture). */
  capture(sentence: string): AgentEnvelope<Loop> {
    const t0 = Date.now();
    try {
      const loop = this.loops.create(this.loops.parseCapture(sentence));
      this.emit('loop:captured', loop.id, 'device');
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
    const doneMeans: 'reply-needed' | 'closed' = (loop.kind === 'coffee' || loop.kind === 'social') ? 'closed' : 'reply-needed';
    this.loops.markSent(loop.id, channel, loop.draft, doneMeans);
    this.emit('loop:sent', loop.id, 'device');
    if (doneMeans === 'closed') this.emit('loop:closed', loop.id, 'device');
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

  private emit(type: LoopAgentEvent['type'], loopId: string, source: AgentSource): void {
    this.events$.next({ type, loopId, source, at: Date.now() });
  }
}
