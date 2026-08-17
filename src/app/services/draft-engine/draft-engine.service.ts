import { Injectable } from '@angular/core';
import { ContactInfo } from '../../models/contacts';
import { environment } from '../../../environments/environment';

export type Occasion = 'birthday' | 'anniversary' | 'milestone' | 'congratulations' | 'follow-up' | 'overdue';
export type AiProvider = 'rolodex' | 'deepseek' | 'grok';

export interface MessageGuide {
  guide: string;   // the user's directive (like bot directives) — may contain {name}/{occasion}
  strict: boolean; // true = deliver the guide AS-IS; false = use it as the agent's guidance
}

const AI_PROVIDER_KEY = 'rolodex_ai_provider';
const PLAN_KEY = 'rolodex_plan';
const INTERVENTIONS_KEY = 'rolodex_interventions';
/** 2026-08-17 FREE TRIAL: 7 days of the Confidante, auto-granted on first AI use. */
const TRIAL_KEY = 'rolodex_trial_until';
const TRIAL_DAYS = 7;
const DAY_MS = 86400_000;
const MONTHLY_QUOTA = 5;
const CONTEXT_CAP = 8;

/**
 * 2026-08-16 THE CONFIDANTE v2 — the confidential secretary that PROFfers
 * the message; the user only hits Send.
 *
 * CONTEXT BANGER: the confidante opens every composition with the user's
 * current view context (the filter select) PLUS the contact's rotating
 * context (a rolling, cycle-augmented property capped at the most recent
 * lines). The agent reads where the user's head is + the relationship's
 * story.
 *
 * AI-AGNOSTIC, SERVICE-DELIVERED: the user picks WHICH AI engine Rolodex
 * uses to deliver the service — Rolodex's own on-device engine, DeepSeek, or
 * Grok. ROLODEX holds the keys (server-side env); the user never brings a
 * key. The briefing passes through the rolodex-server proxy transiently and
 * is never stored. The storage choice (Device / Cloud / Rolodex server) is
 * SEPARATE from the engine in use.
 *
 * ENTITLEMENT: Basic (or no plan) = 5 AI interventions a month (the
 * Assistant taste). Confidante = unlimited. The quota rolls monthly.
 */
@Injectable({ providedIn: 'root' })
export class DraftEngineService {
  private readonly GUIDES_KEY = 'rolodex_message_guides';
  private _currentFilter = 'all';

  /** The confidante's opening context — the user's current view (the filter). */
  set currentFilter(value: string) {
    this._currentFilter = value || 'all';
  }
  get currentFilter(): string {
    return this._currentFilter;
  }

  provider: AiProvider = 'rolodex';

  constructor() {
    try {
      const stored = localStorage.getItem(AI_PROVIDER_KEY) as AiProvider | null;
      this.provider = stored === 'deepseek' || stored === 'grok' || stored === 'rolodex' ? stored : 'rolodex';
      this.plan = (localStorage.getItem(PLAN_KEY) as any) || '';
    } catch { /* defaults */ }
  }

  /** 2026-08-16: the user picks the engine; ROLODEX holds the keys. */
  setProvider(p: AiProvider): void {
    this.provider = p;
    try { localStorage.setItem(AI_PROVIDER_KEY, p); } catch { /* ignore */ }
  }

  // ═══ ENTITLEMENT: Basic = the Assistant (5 AI interventions a month).
  // Confidante = the AI works all month. Rolls monthly. ═══
  plan: 'basic' | 'confidante' | '' = '';

  private monthKey(): string {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1);
  }

  setPlan(p: 'basic' | 'confidante' | ''): void {
    this.plan = p;
    try { localStorage.setItem(PLAN_KEY, p); } catch {}
  }

  /** 2026-08-17 FREE TRIAL — epoch ms the trial runs until (0 = none). */
  trialUntil(): number {
    try { return Number(localStorage.getItem(TRIAL_KEY) || 0) || 0; } catch { return 0; }
  }

  trialDaysLeft(): number {
    const until = this.trialUntil();
    if (!until) return 0;
    return Math.max(0, Math.ceil((until - Date.now()) / DAY_MS));
  }

  trialActive(): boolean {
    return this.trialDaysLeft() > 0;
  }

  trialLabel(): string {
    const d = this.trialDaysLeft();
    return d > 0 ? 'Trial: ' + d + (d === 1 ? ' day' : ' days') + ' of the Confidante left' : '';
  }

  /** Auto-grant once: the first AI use starts the 7-day Confidante trial. */
  ensureTrial(): void {
    if (this.plan === 'confidante') return;
    if (this.trialUntil() > Date.now()) return;
    try { localStorage.setItem(TRIAL_KEY, String(Date.now() + TRIAL_DAYS * DAY_MS)); } catch {}
  }

  interventionsLeft(): number {
    try {
      const raw = localStorage.getItem(INTERVENTIONS_KEY) || '{}';
      const rec = JSON.parse(raw);
      const key = this.monthKey();
      const used = rec[key] || 0;
      if (this.plan === 'confidante' || this.trialActive()) return Number.MAX_SAFE_INTEGER;
      return Math.max(0, MONTHLY_QUOTA - used);
    } catch { return MONTHLY_QUOTA; }
  }

  private consumeIntervention(): void {
    try {
      if (this.plan === 'confidante' || this.trialActive()) return; // the trial/Confidante never burns the monthly count
      const raw = localStorage.getItem(INTERVENTIONS_KEY) || '{}';
      const rec = JSON.parse(raw);
      const key = this.monthKey();
      rec[key] = (rec[key] || 0) + 1;
      localStorage.setItem(INTERVENTIONS_KEY, JSON.stringify(rec));
    } catch {}
  }

  /** Rotating context: append a line to the relationship's rolling story. */
  pushContext(c: any, line: string): void {
    if (!c || !line) return;
    const rotation: string[] = Array.isArray(c.contextRotation) ? [...c.contextRotation] : [];
    rotation.push(line);
    if (rotation.length > CONTEXT_CAP) rotation.splice(0, rotation.length - CONTEXT_CAP);
    c.contextRotation = rotation;
  }

  private loadGuides(): Record<string, MessageGuide> {
    try {
      const raw = localStorage.getItem(this.GUIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  private saveGuides(guides: Record<string, MessageGuide>): void {
    try { localStorage.setItem(this.GUIDES_KEY, JSON.stringify(guides)); } catch { /* ignore */ }
  }

  /** A guide keyed by contact id, group id (groupId:xxx), or 'default'. */
  getGuide(key: string): MessageGuide | null {
    return this.loadGuides()[key] || null;
  }
  setGuide(key: string, guide: MessageGuide): void {
    const g = this.loadGuides();
    if (!guide.guide?.trim()) delete g[key];
    else g[key] = guide;
    this.saveGuides(g);
  }

  contactName(c: ContactInfo): string {
    return String(c?.name || c?.nickname || (c as any)?.firstName || 'friend');
  }

  /** The relationship's rotating context as a compact block. */
  private contextBlock(c: any): string {
    const rotation: string[] = Array.isArray(c?.contextRotation) ? c.contextRotation : [];
    return rotation.length ? rotation.join('\n') : '(no recorded history yet)';
  }

  /** The prompt that goes to any provider — the confidante's briefing. */
  private briefing(c: ContactInfo, occasion: Occasion, guide?: MessageGuide | null): string {
    const name = this.contactName(c);
    const r: any = (c as any)?.rolodex || {};
    const filterLabels: Record<string, string> = {
      all: 'All contacts', business: 'Business contacts', location: 'By location',
      email: 'Contacts with email', name: 'ByName', phone: 'Contacts with phone',
      lastInteraction: 'By last contact', when: 'By when we met', who: 'By who introduced',
      where: 'By where we met', why: 'By why we met',
    };
    const filterLine = `The user is currently viewing: ${filterLabels[this._currentFilter] || this._currentFilter}.`;
    const guideLine = guide?.strict
      ? `DELIVER EXACTLY AS-IS (strict): "${guide.guide}"`
      : guide?.guide
        ? `Style guidance from the user: "${guide.guide}"`
        : '';
    return [
      filterLine,
      `Contact: ${name}`,
      `Context: ${r.where || 'unknown'} (${r.when || 'unknown'}) · topic: ${r.topic || '-'} · follow-up: ${r.followUp || '-'}`,
      `Relationship history:\n${this.contextBlock(c)}`,
      guideLine,
      `Occasion: ${occasion}. Draft a warm, human, one-paragraph message in the user's voice. No emojis unless natural.`,
    ].filter(Boolean).join('\n');
  }

  /**
   * Compose the proffered message — service-delivered and AI-agnostic.
   * Rolodex's engine = the on-device engine. DeepSeek/Grok = the briefing
   * goes through the rolodex-server proxy (ROLODEX's keys, transiently, never
   * stored). Strict guides are returned verbatim. The Assistant quota is
   * gated + consumed on every AI-assisted draft.
   */
  async composeAi(c: ContactInfo, occasion: Occasion, guideKey?: string): Promise<string> {
    const guide = guideKey ? this.getGuide(guideKey) : null;
    if (guide?.strict) return guide.guide;

    // 2026-08-17 FREE TRIAL: the first AI use auto-grants 7 days of the Confidante.
    this.ensureTrial();

    if (this.interventionsLeft() <= 0) {
      return 'Your Assistant taste is used up for this month — upgrade to the Confidante ($5/month) for unlimited AI interventions.';
    }
    this.consumeIntervention();

    if (this.provider === 'deepseek' || this.provider === 'grok') {
      try {
        const draft = await this.callProvider(c, occasion, guide);
        if (draft) return draft;
      } catch {
        /* fall back to the on-device Rolodex engine */
      }
    }
    return this.compose(c, occasion, guideKey);
  }

  /** The Rolodex server proxy — ROLODEX's keys, briefing passes through. */
  private async callProvider(c: ContactInfo, occasion: Occasion, guide: MessageGuide | null): Promise<string | null> {
    const briefing = this.briefing(c, occasion, guide);
    try {
      const res = await fetch(`${environment.rolodexApiBase}/ai/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: this.provider, briefing }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.draft || null;
    } catch {
      return null;
    }
  }

  /** The on-device Rolodex engine (works offline, no server, no key). */
  compose(c: ContactInfo, occasion: Occasion, guideKey?: string): string {
    const name = this.contactName(c);
    const guide = guideKey ? this.getGuide(guideKey) : null;
    const vars: Record<string, string> = { name, occasion, role: (c as any)?.role || '' };

    if (guide?.strict) return guide.guide; // "deliver this as-is for me"
    if (guide?.guide) {
      return guide.guide.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] || m);
    }

    // The confidante's own voice, occasion-aware.
    switch (occasion) {
      case 'birthday': {
        const age = (c as any)?.birthday?.year ? new Date().getFullYear() - Number((c as any).birthday.year) : null;
        return `Happy birthday, ${name}${age ? ` — ${age}!` : '!'} I hope your day is as bright as you are. Let's catch up properly soon. 🎂`;
      }
      case 'anniversary':
        return `${name}, thinking of you on this anniversary — here's to many more. Would love to hear how you're doing.`;
      case 'milestone':
        return `Huge congratulations on the milestone, ${name}! So proud of what you've achieved. Let's celebrate properly — name the time.`;
      case 'congratulations':
        return `Congratulations, ${name}! Really happy for you. Let's catch up when things settle.`;
      case 'overdue':
        return `Hi ${name}, it's been too long — I've been meaning to reach out. How are you, and what's new on your side?`;
      case 'follow-up':
      default:
        return `Hi ${name}, just checking in as promised. Hope all is well — let me know how things went.`;
    }
  }
}
