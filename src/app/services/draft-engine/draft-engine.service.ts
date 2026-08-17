import { Injectable } from '@angular/core';
import { ContactInfo } from '../../models/contacts';

export type Occasion = 'birthday' | 'anniversary' | 'milestone' | 'congratulations' | 'follow-up' | 'overdue';
export type AiProvider = 'template' | 'deepseek' | 'grok';

export interface MessageGuide {
  guide: string;   // the user's directive (like bot directives) — may contain {name}/{occasion}
  strict: boolean; // true = deliver the guide AS-IS; false = use it as the agent's guidance
}

const AI_PROVIDER_KEY = 'rolodex_ai_provider';
const AI_KEY_KEY = 'rolodex_ai_api_key';
const CONTEXT_CAP = 8;

/**
 * 2026-08-16 THE CONFIDANTE v1 — the confidential secretary that PROFfers
 * the message; the user only hits Send.
 *
 * CONTEXT BANGER: the confidante opens every composition with the user's
 * current view context (the filter select — All/Business/Location/Email/
 * Name/Phone/LastContact/When/Who/Where/Why) PLUS the contact's rotating
 * context: a rolling, cycle-augmented property appended over the life of the
 * relationship (reminders set, chats sent, follow-ups, interactions), capped
 * at the most recent lines. The agent reads where the user's head is + the
 * relationship's own story.
 *
 * AI-AGNOSTIC + PRIVACY: the provider is chosen in Settings (Template /
 * DeepSeek / Grok) with the user's OWN API key stored on the device. The
 * composition request goes DIRECTLY from the device to the chosen provider —
 * only the needed context leaves the device, and nothing is stored on the
 * Rolodex backend. Users who keep contacts fully local still get the
 * template confidante.
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

  provider: AiProvider = 'template';
  private providerKey = '';

  constructor() {
    try {
      this.provider = (localStorage.getItem(AI_PROVIDER_KEY) as AiProvider) || 'template';
      this.providerKey = localStorage.getItem(AI_KEY_KEY) || '';
    } catch { /* defaults */ }
  }

  setProvider(p: AiProvider, key: string): void {
    this.provider = p;
    this.providerKey = key || '';
    try {
      localStorage.setItem(AI_PROVIDER_KEY, p);
      if (key) localStorage.setItem(AI_KEY_KEY, key);
    } catch { /* ignore */ }
  }

  get hasProviderKey(): boolean {
    return !!this.providerKey;
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
   * Compose the proffered message — AI-agnostic.
   * Strict guide → returned verbatim. Template → deterministic drafts.
   * DeepSeek/Grok → the briefing goes DIRECTLY to the provider (the user's
   * own key, device-side), so contacts never touch the Rolodex backend.
   */
  async composeAi(c: ContactInfo, occasion: Occasion, guideKey?: string): Promise<string> {
    const guide = guideKey ? this.getGuide(guideKey) : null;
    if (guide?.strict) return guide.guide;

    if (this.provider !== 'template' && this.providerKey) {
      try {
        const draft = await this.callProvider(c, occasion, guide);
        if (draft) return draft;
      } catch {
        /* fall back to the template engine */
      }
    }
    return this.compose(c, occasion, guideKey);
  }

  private async callProvider(c: ContactInfo, occasion: Occasion, guide: MessageGuide | null): Promise<string | null> {
    const briefing = this.briefing(c, occasion, guide);
    const system = 'You are RolodexAI, a confidential secretary. You proffer messages; the user hits Send.';
    if (this.provider === 'deepseek') {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.providerKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'system', content: system }, { role: 'user', content: briefing }],
          max_tokens: 220,
          temperature: 0.7,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || null;
    }
    if (this.provider === 'grok') {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.providerKey}` },
        body: JSON.stringify({
          model: 'grok-2-latest',
          messages: [{ role: 'system', content: system }, { role: 'user', content: briefing }],
          max_tokens: 220,
          temperature: 0.7,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || null;
    }
    return null;
  }

  /** The deterministic template engine (works fully offline, no key needed). */
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
