import { Injectable } from '@angular/core';
import { InviteService, RolodexInvite } from '../invite/invite.service';
import { RolodexSyncService } from '../rolodex-sync/rolodex-sync.service';

/**
 * 2026-08-18 THE SHAREAPP DISTRIBUTION MECHANIC.
 *
 * The "casual" send: a crafted, moment-aware share message (chat message,
 * birthday, milestone, congratulations, appointment…) that carries the
 * LoopKeeper logo via the OG-tagged landing + the invite deeplink. The receiver
 * taps once, sees THEIR card ready with the pre-join comms, and the 7-day
 * Assistant trial does the conversion. Every sendee who is NOT a user becomes
 * the next receiver of the app itself.
 *
 * The old WhatsApp/SMS sends were plain sentences with no invite link — a dud.
 * THIS service is the replacement: every share carries the link, every link
 * previews the branded card, and the card is the arrival.
 */
export type ShareMoment =
  | 'chat-message'
  | 'first-meeting'
  | 'birthday'
  | 'anniversary'
  | 'milestone'
  | 'congratulations'
  | 'appointment'
  | 'follow-up'
  | 'casual';

export interface ShareAppContext {
  /** The sender's display name (what the invite says "from"). */
  from?: string;
  /** The receiver's display name — used naturally in the share text. */
  to?: string;
  /** The actual message / wish / draft text. */
  text?: string;
  /** Appointment title (appointment moments). */
  title?: string;
  /** Appointment time — ISO string or already-localized label. */
  when?: string;
  /** Socket/demo room to attach to the invite. */
  room?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ShareAppService {
  constructor(
    private readonly inviteService: InviteService,
    private readonly rolodexSync: RolodexSyncService,
  ) {}

  /** 2026-08-18 REAL SENDER: prefer the caller's explicit `from`, else the
   *  user's My Profile name (async IndexedDB read - never a premature 'Me'). */
  private async resolveFrom(ctx: ShareAppContext): Promise<string> {
    const explicit = String(ctx.from || '').trim();
    if (explicit && explicit !== 'Me') return explicit;
    return this.rolodexSync.senderNameAsync();
  }

  /** The natural default message for a moment when the user has not typed one. */
  defaultMessage(moment: ShareMoment, ctx: ShareAppContext): string {
    const to = ctx.to || '';
    switch (moment) {
      case 'first-meeting':
        return `It was really lovely to meet you${to ? ', ' + to : ''}! I'm glad we crossed paths — let's stay in touch.`;
      case 'birthday':
        return `Happy birthday${to ? ', ' + to : ''}! I hope your day is as bright as you are. 🎂`;
      case 'anniversary':
        return `${to ? to + ', ' : ''}thinking of you on this anniversary — here's to many more.`;
      case 'milestone':
        return `Huge congratulations on the milestone${to ? ', ' + to : ''}! So proud of you.`;
      case 'congratulations':
        return `Congratulations${to ? ', ' + to : ''}! Really happy for you.`;
      case 'follow-up':
        return `Hi${to ? ' ' + to : ''}, just checking in as promised — how are you?`;
      case 'chat-message':
      case 'appointment':
      case 'casual':
      default:
        return '';
    }
  }

  /** Build the invite payload for a moment. */
  private invitePayload(moment: ShareMoment, ctx: ShareAppContext): { from: string; room: string; kind: 'message' | 'appointment'; title?: string; when?: string; text?: string } {
    const from = ctx.from || 'Me';
    const room = ctx.room || 'rolodex';
    if (moment === 'appointment') {
      return { from, room, kind: 'appointment', title: ctx.title || 'An appointment', when: ctx.when || '' };
    }
    const text = (ctx.text || '').trim() || this.defaultMessage(moment, ctx);
    return { from, room, kind: 'message', text };
  }

  /** Create the invite server-side (48h token) and return the RolodexInvite. */
  async createInvite(moment: ShareMoment, ctx: ShareAppContext): Promise<RolodexInvite | null> {
    const from = await this.resolveFrom(ctx);
    return this.inviteService.create(this.invitePayload(moment, { ...ctx, from }));
  }

  private whenLabel(when: string): string {
    try {
      const d = new Date(when);
      return isNaN(d.getTime()) ? when : d.toLocaleString();
    } catch {
      return when;
    }
  }

  /**
   * THE CRAFT: the share text for every occasion. Each line carries the
   * OG-tagged invite URL so the preview itself is the branded card — never a
   * casual link-less sentence.
   */
  async buildText(moment: ShareMoment, inv: RolodexInvite, ctx: ShareAppContext): Promise<string> {
    const url = this.inviteService.shareUrl(inv);
    const from = await this.resolveFrom(ctx);
    const to = ctx.to || '';
    const text = (ctx.text || '').trim();
    const quote = text ? ` — “${text}”` : '';
    switch (moment) {
      case 'chat-message':
        return `${from} sent you a message on LoopKeeper${quote}. It's waiting on your card — tap to open it. ${url}`;
      case 'first-meeting':
        return `${from} sent you a first-meeting note on LoopKeeper${quote}. It was lovely meeting you — the note is waiting on your card. ${url}`;
      case 'birthday':
        return `${from} sent you birthday wishes on LoopKeeper${to ? ' ' + to : ''}${quote}. Your card is ready. ${url}`;
      case 'anniversary':
        return `${from} sent you a note on this anniversary${quote}. It's waiting on your LoopKeeper card. ${url}`;
      case 'milestone':
        return `${from} marked your milestone on LoopKeeper${quote}. Your card is ready — tap to see it. ${url}`;
      case 'congratulations':
        return `${from} sent you congratulations on LoopKeeper${quote}. Your card is ready. ${url}`;
      case 'follow-up':
        return `${from} checked in on LoopKeeper${quote}. It's waiting on your card. ${url}`;
      case 'appointment': {
        const title = ctx.title || inv.title || 'An appointment';
        const whenRaw = ctx.when || inv.when || '';
        const when = whenRaw ? this.whenLabel(whenRaw) : '';
        return `${from} invited you to “${title}” on LoopKeeper${when ? ' — ' + when : ''}. It's already on your card. ${url}`;
      }
      case 'casual':
      default:
        return `I use LoopKeeper for one thing: the people I keep meaning to text but don't. It turns "I should really reach out" into a two-minute send. One person at a time — no address-book takeover. ${url}`;
    }
  }

  /** Native share sheet / copy fallback with the crafted text. */
  async share(moment: ShareMoment, ctx: ShareAppContext): Promise<'shared' | 'copied' | 'failed'> {
    const inv = await this.createInvite(moment, ctx);
    if (!inv) return 'failed';
    return this.inviteService.share(inv, await this.buildText(moment, inv, ctx));
  }

  /** Direct WhatsApp send (pre-filled with the crafted text + the OG link). */
  async shareViaWhatsApp(moment: ShareMoment, ctx: ShareAppContext, phone?: string): Promise<void> {
    const inv = await this.createInvite(moment, ctx);
    if (!inv) return;
    const text = await this.buildText(moment, inv, ctx);
    const digits = String(phone || '').replace(/[^\d]/g, '');
    const target = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
    window.open(`${target}?text=${encodeURIComponent(text)}`, '_blank');
  }

  /** Direct SMS send (pre-filled with the crafted text + the OG link). */
  async shareViaSms(moment: ShareMoment, ctx: ShareAppContext, phone?: string): Promise<void> {
    const inv = await this.createInvite(moment, ctx);
    if (!inv) return;
    const text = await this.buildText(moment, inv, ctx);
    if (phone) {
      window.location.href = `sms:${phone}?body=${encodeURIComponent(text)}`;
    } else {
      await this.inviteService.share(inv, text);
    }
  }

  /** Direct email send (pre-filled with the crafted text + the OG link). */
  async shareViaEmail(moment: ShareMoment, ctx: ShareAppContext, email?: string): Promise<void> {
    const inv = await this.createInvite(moment, ctx);
    if (!inv) return;
    const text = await this.buildText(moment, inv, ctx);
    const subject = 'A note for you on LoopKeeper';
    if (email) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    } else {
      await this.inviteService.share(inv, text);
    }
  }

  /** 2026-08-19 STANDARD SHARE APP (Settings): the plain, always-appropriate
   *  share of LoopKeeper itself — native share sheet first, clipboard fallback. */
  async shareAppStandard(): Promise<'shared' | 'copied' | 'failed'> {
    const url = 'https://zyppar.com/openloop/';
    const text = `LoopKeeper is for the people you keep meaning to text — the ones you don't want to lose to "I should really reach out." One person at a time, no contact-list takeover. ${url}`;
    const nav: any = navigator;
    try {
      if (nav.share) {
        await nav.share({ title: 'LoopKeeper', text, url });
        return 'shared';
      }
    } catch { /* user cancelled the sheet */ }
    try {
      if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        return 'copied';
      }
    } catch { /* clipboard unavailable */ }
    return 'failed';
  }

  /** Copy the crafted text (the user pastes it anywhere). */
  async copy(moment: ShareMoment, ctx: ShareAppContext): Promise<boolean> {
    const inv = await this.createInvite(moment, ctx);
    if (!inv) return false;
    const text = await this.buildText(moment, inv, ctx);
    if (!navigator.clipboard?.writeText) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
