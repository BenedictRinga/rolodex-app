import { Injectable } from '@angular/core';
import { ContactInfo } from '../../models/contacts';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';
import { RolodexSyncService } from '../rolodex-sync/rolodex-sync.service';
import { NetworkService } from '../network/network.service';

export type Occasion = 'first-meeting' | 'birthday' | 'anniversary' | 'milestone' | 'congratulations' | 'follow-up' | 'overdue';
export type AiProvider = 'rolodex' | 'deepseek' | 'grok' | 'glm';

export interface MessageGuide {
  guide: string;   // the user's directive (like bot directives) — may contain {name}/{occasion}
  strict: boolean; // true = deliver the guide AS-IS; false = use it as the agent's guidance
}

const AI_PROVIDER_KEY = 'rolodex_ai_provider';
const PLAN_KEY = 'rolodex_plan';
const INTERVENTIONS_KEY = 'rolodex_interventions';
/** 2026-08-17 FREE TRIAL: 7 days of the Assistant, auto-granted on first use.
 *  2026-08-19 NOW ONE-TIME: the start is recorded; only reopenTrial() can reset. */
const TRIAL_KEY = 'rolodex_trial_until';
const TRIAL_START_KEY = 'rolodex_trial_started_at';
const TRIAL_DAYS = 7;
const DAY_MS = 86400_000;
const MONTHLY_QUOTA = 5;
const CONTEXT_CAP = 8;

/**
 * 2026-08-26 PRE-RELEASE RENEWAL — while payments are not yet wired, an expired
 * trial is silently renewed on the next visit with a visible thank-you. Flip to
 * false the day real billing goes live.
 */
const PRE_RELEASE_RENEWAL = true;

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
 * Assistant taste). Assistant = unlimited. The quota rolls monthly.
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

  /**
   * 2026-08-26 DRAFT SHAPE: strip the Assistant's framing/commentary away from
   * the promised draft so Copy / Card / composer always get the message itself,
   * never the chatter around it. Heuristic, conservative: when no obvious draft
   * framing is present the original reply is returned untouched.
   */
  extractDraftText(reply: string): string {
    let text = String(reply || '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';

    // Remove markdown code fences that models sometimes wrap drafts in.
    text = text.replace(/^```[a-z]*\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    // Drop the common leading draft markers, e.g. "Draft:" / "Here is your draft:".
    const markers = [
      /^draft\s*[:：]\s*/i,
      /^here(?:'s| is)?\s+(?:a |the )?draft\s*[:：]?\s*/i,
      /^here(?:'s| is)?\s+(?:a |the )?message\s*[:：]?\s*/i,
      /^here(?:'s| is)?\s+the\s+composed\s+message\s*[:：]?\s*/i,
      /^this\s+is\s+(?:your )?draft\s*[:：]?\s*/i,
      /^your\s+draft\s*[:：]\s*/i,
      /^message\s*[:：]\s*/i,
    ];
    for (const re of markers) {
      if (re.test(text)) text = text.replace(re, '').trimStart();
    }

    // Remove obvious scaffolding lines before the real message begins.
    const scaffolding = [
      /^sure[,!]?$/i,
      /^absolutely[,!]?$/i,
      /^of course[,!]?$/i,
      /^here(?:'s| is).*(?:draft|message|idea).*[:—:-]?\s*$/i,
      /^(?:(?:i'|i )?ve|i have) (?:put|written|composed|made).*draft.*$/i,
      /^(?:i\s+)?hope this (?:helps|finds you well).*$/i,
      /^hope (?:that )?this (?:helps|finds you well).*$/i,
      /^feel free to (?:adjust|edit|tweak|change).*$/i,
      /^if you(?:'d like| would like) (?:me to|to).*$/i,
      /^let me know if.*$/i,
      /^happy to (?:adjust|change|tweak).*$/i,
      /^you can (?:adjust|edit|tweak|change).*$/i,
      /^i (?:can|could) (?:adjust|change|tweak|refine).*$/i,
    ];
    const lines = text.split('\n');
    const kept: string[] = [];
    let startedDraft = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (kept.length) kept.push(''); // keep blank lines between real paragraphs
        continue;
      }
      if (!startedDraft && scaffolding.some((re) => re.test(trimmed))) {
        continue; // this line is assistant chat, not the message
      }
      startedDraft = true;
      kept.push(line);
    }
    text = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    // Drop trailing "Hope that helps…" / "Let me know…" commentary if present.
    text = text.replace(
      /\n?(?:(?:i\s+)?hope (?:that )?this (?:helps|finds you well)|let me know if.*|if you(?:'d| would).*|feel free to.*|happy to.*)[.!]?\s*$/i,
      ''
    ).trim();

    return text || String(reply || '').trim();
  }

  /** 2026-08-18 DEEPSEEK FIRST: the demo defaults to DeepSeek (server proxy
   *  holds the key); if the server has no key yet it falls back to on-device. */
  provider: AiProvider = 'deepseek';

  /** 2026-08-18 all persistence via the IndexedDB StorageService (no localStorage). */
  constructor(
    private readonly storage: StorageService,
    private readonly rolodexSync: RolodexSyncService,
    private readonly network: NetworkService,
  ) {
    // async hydrate of the persisted preferences into the sync fields.
    // 2026-08-20 FIX: exposed as a promise so ensureTrial() can AWAIT it —
    // otherwise HomePage calls ensureTrial() before hydration finishes, and
    // every launch re-grants a fresh 7 days (the counter never counts down).
    this.hydrateReady = (async () => {
      try {
        const stored = await this.storage.get<AiProvider>(AI_PROVIDER_KEY);
        // 2026-08-28 GLM (build 120): third cloud engine via OpenRouter.
        if (stored === 'deepseek' || stored === 'grok' || stored === 'glm' || stored === 'rolodex') this.provider = stored;
        this.plan = (await this.storage.get<'basic' | 'confidante' | ''>(PLAN_KEY)) || '';
        this.interventionsRecord = (await this.storage.get<Record<string, number>>(INTERVENTIONS_KEY)) || {};
        this.trialUntilMs = (await this.storage.get<number>(TRIAL_KEY)) || 0;
        this.trialStartedAtMs = (await this.storage.get<number>(TRIAL_START_KEY)) || 0;
      } catch { /* defaults */ }
    })();
  }

  private hydrateReady: Promise<void>;

  /** 2026-08-16: the user picks the engine; ROLODEX holds the keys. */
  setProvider(p: AiProvider): void {
    this.provider = p;
    void this.storage.set(AI_PROVIDER_KEY, p);
  }

  // ═══ ENTITLEMENT: Basic = the Assistant (5 AI interventions a month).
  // Assistant = the AI works all month. Rolls monthly. ═══
  plan: 'basic' | 'confidante' | '' = '';

  private monthKey(): string {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1);
  }

  setPlan(p: 'basic' | 'confidante' | ''): void {
    this.plan = p;
    void this.storage.set(PLAN_KEY, p);
  }

  /** 2026-08-17 FREE TRIAL — epoch ms the trial runs until (0 = none). */
  private trialUntilMs = 0;
  private trialStartedAtMs = 0;
  private renewedPreRelease = false;

  /** 2026-08-26 True once when an expired trial was renewed on this launch. */
  consumePreReleaseRenewal(): boolean {
    const v = this.renewedPreRelease;
    this.renewedPreRelease = false;
    return v;
  }

  trialUntil(): number {
    return this.trialUntilMs;
  }

  trialStartedAt(): number {
    return this.trialStartedAtMs;
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
    return d > 0 ? 'Trial: ' + d + (d === 1 ? ' day' : ' days') + ' of the Assistant left' : '';
  }

  /** 2026-08-19 ONE-TIME GRANT: first use starts the 7-day Assistant trial.
   *  Once started (even after expiry) it is never auto-renewed — only
   *  reopenTrial() can reset it, deliberately. The existence of the until-key
   *  also covers devices that started under the older client (no start key).
   *  2026-08-26 PRE-RELEASE: while PRE_RELEASE_RENEWAL is true, an EXPIRED trial
   *  is renewed on the next visit with a visible thank-you (see HomePage). */
  async ensureTrial(): Promise<void> {
    await this.hydrateReady;
    if (this.plan === 'confidante') return;
    if (this.trialUntil() > 0) {
      // Granted before. If it has expired and pre-release renewal is on, reset
      // it NOW so the user lands on a fresh 7 days with the thank-you toast.
      if (PRE_RELEASE_RENEWAL && this.trialUntil() <= Date.now()) {
        const now = Date.now();
        this.trialStartedAtMs = now;
        this.trialUntilMs = now + TRIAL_DAYS * DAY_MS;
        await this.storage.set(TRIAL_START_KEY, this.trialStartedAtMs);
        await this.storage.set(TRIAL_KEY, this.trialUntilMs);
        this.renewedPreRelease = true;
        // Best-effort server sync so the device record matches.
        void this.reopenTrial();
      }
      return;
    }
    const now = Date.now();
    this.trialStartedAtMs = now;
    this.trialUntilMs = now + TRIAL_DAYS * DAY_MS;
    await this.storage.set(TRIAL_START_KEY, this.trialStartedAtMs);
    await this.storage.set(TRIAL_KEY, this.trialUntilMs);
  }

  /** 2026-08-19 REOPEN THE TRIAL: owner/investor control. Resets both the
   *  client and the server record for this device. */
  async reopenTrial(): Promise<boolean> {
    const now = Date.now();
    this.trialStartedAtMs = now;
    this.trialUntilMs = now + TRIAL_DAYS * DAY_MS;
    await this.storage.set(TRIAL_START_KEY, this.trialStartedAtMs);
    await this.storage.set(TRIAL_KEY, this.trialUntilMs);
    try {
      const res = await fetch(`${environment.rolodexApiBase}/trial/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: this.rolodexSync.getDeviceId() }),
      });
      const data = await res.json();
      const ends = data?.trial?.endsAt ? new Date(data.trial.endsAt).getTime() : 0;
      if (ends > 0 && !isNaN(ends)) {
        this.trialUntilMs = ends;
        await this.storage.set(TRIAL_KEY, ends);
      }
      return true;
    } catch {
      return false; // local reset still applied; server will adopt on next sync
    }
  }

  private interventionsRecord: Record<string, number> = {};

  interventionsLeft(): number {
    const key = this.monthKey();
    const used = this.interventionsRecord[key] || 0;
    if (this.plan === 'confidante' || this.trialActive()) return Number.MAX_SAFE_INTEGER;
    return Math.max(0, MONTHLY_QUOTA - used);
  }

  private consumeIntervention(): void {
    if (this.plan === 'confidante' || this.trialActive()) return; // the trial/Assistant never burns the monthly count
    const key = this.monthKey();
    this.interventionsRecord[key] = (this.interventionsRecord[key] || 0) + 1;
    void this.storage.set(INTERVENTIONS_KEY, this.interventionsRecord);
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
    return this.storage.getSync<Record<string, MessageGuide>>(this.GUIDES_KEY) || {}; // 2026-08-18 IndexedDB memory cache
  }
  private saveGuides(guides: Record<string, MessageGuide>): void {
    this.storage.setSync(this.GUIDES_KEY, guides);
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
    // 2026-08-18: the name is a NamePayload OBJECT - never String() it
    // (that leaked '[object Object]' into every appointment/draft header).
    const n = c?.name as any;
    const display = typeof n === 'string'
      ? n
      : (n?.display || n?.formatted || [n?.given, n?.middle, n?.family].filter(Boolean).join(' '));
    return String(display || c?.nickname || (c as any)?.firstName || 'friend');
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

    // 2026-08-28 BUILD 131 DEEP FIELDS: the briefing used to carry only
    // where/when/topic/followUp — the rest of the card sat unread. Now every
    // gleaned field travels: who/why/how, personalTidbits, outcome, role,
    // cadence, birthday, nickname, tags. The backend AI reasons over the
    // whole card, not a sliver of it.
    const org = (c as any)?.organization || {};
    const roleBits = [org.jobTitle, org.company, org.department].filter(Boolean).join(' at ');
    const last = c?.lastInteraction
      ? `last touched ${new Date(c.lastInteraction).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
      : '';
    const socials = Object.entries((c as any)?.socialProfiles || {})
      .filter(([, v]: any) => v && String(v).trim())
      .map(([k, v]: any) => `${k}:${v}`)
      .slice(0, 4)
      .join(' · ');
    const dossier = [
      `Called: ${name}${c?.nickname && c.nickname !== name ? ` (goes by ${c.nickname})` : ''}`,
      roleBits ? `Role: ${roleBits}` : '',
      `How they met: ${r.where || 'unknown'} (${r.when || 'unknown'})` +
        `${r.who ? ` · introduced/shared by ${r.who}` : ''}` +
        `${r.how ? ` · via ${r.how}` : ''}`,
      `Why they matter: ${r.why || '-'}`,
      `Thread: topic ${r.topic || '-'} · follow-up ${r.followUp || '-'}` +
        `${r.outcome ? ` · last outcome: ${r.outcome}` : ''}`,
      r.personalTidbits ? `Personal: ${r.personalTidbits}` : '',
      `Cadence: wants ${r.contactFrequency || 'unspecified'} touch · priority ${r.priority || 'medium'}${last ? ` · ${last}` : ''}`,
      c?.birthday ? `Birthday: ${JSON.stringify(c.birthday)}` : '',
      socials ? `Reachable: ${socials}` : '',
      Array.isArray((c as any)?.tags) && (c as any).tags.length ? `Tags: ${(c as any).tags.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    return [
      filterLine,
      `Contact dossier:\n${dossier}`,
      `Relationship history:\n${this.contextBlock(c)}`,
      guideLine,
      `Occasion: ${occasion}. Draft a warm, human, one-paragraph message in the user's voice. Use the dossier and history — reference only what feels natural, never dump it. No emojis unless natural.`,
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

    // 2026-08-17 FREE TRIAL: the first AI use auto-grants 7 days of the Assistant.
    await this.ensureTrial();

    if (this.interventionsLeft() <= 0) {
      return 'Your Assistant taste is used up for this month — upgrade to the Assistant ($5/month) for unlimited AI interventions.';
    }
    this.consumeIntervention();

    if (this.provider === 'deepseek' || this.provider === 'grok' || this.provider === 'glm') {
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

  /** 2026-08-18 AI LIVE LIGHT: what the Rolodex server can actually deliver.
   *  The on-device engine always works; DeepSeek/Grok/GLM depend on server keys. */
  async aiStatus(): Promise<{ onDevice: boolean; deepseekConfigured: boolean; grokConfigured: boolean; glmConfigured: boolean }> {
    try {
      const res = await this.network.safeFetch(`${environment.rolodexApiBase}/ai/status`, { cache: 'no-store' });
      if (!res) return { onDevice: true, deepseekConfigured: false, grokConfigured: false, glmConfigured: false };
      const data = await res.json();
      return {
        onDevice: data?.onDevice !== false,
        deepseekConfigured: !!data?.deepseekConfigured,
        grokConfigured: !!data?.grokConfigured,
        glmConfigured: !!data?.glmConfigured,
      };
    } catch {
      return { onDevice: true, deepseekConfigured: false, grokConfigured: false, glmConfigured: false };
    }
  }

  /** 2026-08-19 CONFIDANTE COMPOSER: back-and-forth refinement. Sends the
   *  user's instruction + current draft to the chosen engine; falls back to
   *  the current draft on failure (the on-device engine cannot refine yet). */
  async refine(instruction: string, current: string): Promise<string> {
    if (this.provider === 'deepseek' || this.provider === 'grok' || this.provider === 'glm') {
      try {
        const res = await fetch(`${environment.rolodexApiBase}/ai/compose`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engine: this.provider,
            briefing: `The user wants to refine their outgoing message.\nUser instruction: ${String(instruction || '').slice(0, 1500)}\nCurrent draft:\n${String(current || '').slice(0, 1500)}\nReturn only the improved message.`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.draft) return String(data.draft).trim();
        }
      } catch { /* fall through */ }
    }
    return current;
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
      case 'first-meeting':
        return `It was really lovely to meet you${name ? ', ' + name : ''}! I'm glad we crossed paths — let's stay in touch.`;
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
