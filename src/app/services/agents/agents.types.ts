import type { Loop } from '../loops/loops.service';

/** 2026-08-25 AGENT LAYER TYPES — the data contracts for the Keeper hierarchy.
 *  Every specialist returns an AgentEnvelope so artifacts record HOW they were
 *  made ('device' deterministic vs 'llm' escalated) — we measure LLM value honestly. */

export type AgentId =
  | 'keeper' | 'intake' | 'owed-reply' | 'promise-extract' | 'packet'
  | 'composer' | 'pretext' | 'channel' | 'voice-outline' | 'decision'
  | 'nudge' | 'receipt' | 'reminders-bridge';

export type AgentSource = 'device' | 'llm';

export interface AgentDirective {
  id: AgentId;
  name: string;
  parent: AgentId | null;
  role: string;
  inputs: string[];
  outputs: string[];
  decisionRules: string[];
  toneGuardrails: string[];
  privacyGuardrails: string[];
  deferWhen: string[];
  successSignal: string;
}

export interface AgentEnvelope<T = unknown> {
  agent: AgentId;
  at: number;
  source: AgentSource;
  ok: boolean;
  error?: string;
  output?: T;
}

export type LoopDecision =
  | { action: 'send'; channel: NonNullable<Loop['channel']> }
  | { action: 'wait'; isoDay: string; condition?: string }
  | { action: 'drop'; reason: string };

export interface LoopAgentEvent {
  type:
    | 'loop:captured' | 'loop:packet:built' | 'loop:draft:ready'
    | 'loop:tone:changed' | 'loop:decision' | 'loop:sent'
    | 'loop:closed' | 'loop:dropped' | 'nudge:fired' | 'signal:detected';
  loopId: string;
  source: AgentSource;
  at: number;
}
