import { Injectable } from '@angular/core';
import { ContactInfo } from '../../models/contacts';

export type Occasion = 'birthday' | 'anniversary' | 'milestone' | 'congratulations' | 'follow-up' | 'overdue';

export interface MessageGuide {
  guide: string;   // the user's directive (like bot directives) — may contain {name}/{occasion}
  strict: boolean; // true = deliver the guide AS-IS; false = use it as the agent's guidance
}

/**
 * 2026-08-16 THE CONFIDANTE v0 — the confidential secretary that does NOT
 * merely remind: it PROFfers the message, so the user only hits Send.
 *
 * The user may preset messages/congratulations per contact or per group as
 * GUIDES for the agent (the bot-directive pattern), or mark one STRICT —
 * "deliver this as-is for me." With no preset, the engine composes a warm,
 * context-aware draft from the contact's own fields (name, birthday, role,
 * last interaction, notes).
 *
 * v0 is a deterministic template engine (incomplete-but-real, per directive):
 * the same surface will later call a real model for open-ended composition.
 * The "Rolodex AI agent of one user's comms to another / a group" is the
 * network layer that grows from this per-card engine.
 */
@Injectable({ providedIn: 'root' })
export class DraftEngineService {
  private readonly GUIDES_KEY = 'rolodex_message_guides';

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

  /**
   * Compose the proffered message.
   * Strict guide → returned verbatim. Guided guide → template-interpolated.
   * No guide → the confidante's own draft from the contact's context.
   */
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
