import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { InviteService, RolodexInvite } from '../invite/invite.service';
import { RolodexSyncService } from '../rolodex-sync/rolodex-sync.service';
import { AnalyticsService } from '../analytics/analytics.service';

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
  /** 2026-08-27 SHARE VOICES: three i18n'd share messages — the single
   * hardcoded English line ("the 'I should really reach out' list") read as
   * off-target and defeated the multi-language platforming. One of the three
   * is picked at random per send, so the same user's shares vary naturally.
   * Keys live in assets/i18n/*.json under loopkeeper.share.voiceA/B/C with a
   * {{url}} parameter. */
  /* 2026-08-29 BUILD 152 (founder): the three share voices were invisible —
   *  "I notice you put alternative messages, but do not know how to switch
   *  them." Now the voice is a real setting: Auto (rotate per send, the old
   *  behaviour) or a pinned voice, persisted, with a cycle button in
   *  Settings → Share. Every send is tracked by voice + channel so Investors
   *  can compare which phrasing actually converts. */
  private static readonly VOICE_KEY = 'loopkeeper_share_voice'; // 'auto' | 'A' | 'B' | 'C' | 'D'
  private static readonly VOICE_IDS = ['A', 'B', 'C', 'D'] as const;

  getShareVoice(): 'auto' | 'A' | 'B' | 'C' | 'D' {
    try {
      const v = localStorage.getItem(ShareAppService.VOICE_KEY);
      return v === 'A' || v === 'B' || v === 'C' || v === 'D' ? v : 'auto';
    } catch { return 'auto'; }
  }

  setShareVoice(v: 'auto' | 'A' | 'B' | 'C' | 'D'): void {
    try { localStorage.setItem(ShareAppService.VOICE_KEY, v); } catch { /* session only */ }
  }

  /** The voice for this send: the pinned one, or a rotation when Auto. */
  private resolveVoice(): 'A' | 'B' | 'C' | 'D' {
    const pinned = this.getShareVoice();
    if (pinned !== 'auto') return pinned;
    return ShareAppService.VOICE_IDS[Math.floor(Math.random() * ShareAppService.VOICE_IDS.length)];
  }

  private voiceKey(id: 'A' | 'B' | 'C' | 'D'): string {
    return `loopkeeper.share.voice${id}`;
  }

  constructor(
    private readonly inviteService: InviteService,
    private readonly rolodexSync: RolodexSyncService,
    private readonly translate: TranslateService,
    private readonly analytics: AnalyticsService,
  ) {}

  /** 2026-08-29 BUILD 152: every share is a recorded event — voice, channel,
   *  moment. No names, no text, no numbers; just what converts. */
  private trackShare(channel: string, voice: string, moment: ShareMoment): void {
    try { this.analytics.track('app_shared', { channel, voice, moment }); } catch { /* never block a share */ }
  }

  /** 2026-08-27 GENERIC APP SHARE TEXT (three voices, localized). */
  async buildAppShareText(url: string, voice?: 'A' | 'B' | 'C' | 'D'): Promise<string> {
    const id = voice || this.resolveVoice();
    const key = this.voiceKey(id);
    try {
      const text = await this.translate.get(key, { url }).toPromise();
      // ngx-translate returns the KEY itself when missing in every language —
      // fall back to English so a broken locale file never shares garbage.
      if (text && text !== key) return text;
    } catch { /* fall through to English default */ }
    return `LoopKeeper drafts the message you keep meaning to send — context found, words chosen, you hit Send: ${url}`;
  }

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

  /** Create the invite server-side (48h token) and return the RolodexInvite.
   *  2026-08-29 BUILD 152: the chosen voice + moment ride into invite_created,
   *  so the funnel can be compared per voice in Investors. */
  async createInvite(moment: ShareMoment, ctx: ShareAppContext): Promise<RolodexInvite | null> {
    const from = await this.resolveFrom(ctx);
    const voice = this.resolveVoice();
    this.lastVoice = voice;
    return this.inviteService.create(this.invitePayload(moment, { ...ctx, from }), { voice, moment });
  }

  /** The voice actually used by the most recent send (for share tracking). */
  private lastVoice: 'A' | 'B' | 'C' | 'D' = 'A';

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
        return `Hey${to ? ' ' + to : ''} — good meeting you today. I'm bad at following up, so I set myself a reminder — this is it. Let's keep in touch. ${url}`;
      case 'birthday':
        return `Happy birthday${to ? ', ' + to : ''}! I'd have meant to text you anyway — glad the reminder beat me to it. ${url}`;
      case 'anniversary':
        return `${from} sent you a note on this anniversary${quote}. It's waiting on your LoopKeeper card. ${url}`;
      case 'milestone':
        return `${from} marked your milestone on LoopKeeper${quote}. Your card is ready — tap to see it. ${url}`;
      case 'congratulations':
        return `${from} sent you congratulations on LoopKeeper${quote}. Your card is ready. ${url}`;
      case 'follow-up':
        return `Hi${to ? ' ' + to : ''} — checking in like I promised myself I would. No agenda. What's new with you? ${url}`;
      case 'appointment': {
        const title = ctx.title || inv.title || 'An appointment';
        const whenRaw = ctx.when || inv.when || '';
        const when = whenRaw ? this.whenLabel(whenRaw) : '';
        return `${from} invited you to “${title}” on LoopKeeper${when ? ' — ' + when : ''}. It's already on your card. ${url}`;
      }
      case 'casual':
      default:
        return `Hey${to ? ' ' + to : ''} — I've been meaning to text you for weeks, so I finally did. That's the whole message. How've you been? ${url}`;
    }
  }

  /** Native share sheet / copy fallback with the crafted text. */
  async share(moment: ShareMoment, ctx: ShareAppContext): Promise<'shared' | 'copied' | 'failed'> {
    const inv = await this.createInvite(moment, ctx);
    if (!inv) return 'failed';
    const res = await this.inviteService.share(inv, await this.buildText(moment, inv, ctx));
    if (res !== 'failed') this.trackShare(res === 'copied' ? 'clipboard' : 'native', this.lastVoice, moment);
    return res;
  }

  /** Direct WhatsApp send (pre-filled with the crafted text + the OG link). */
  async shareViaWhatsApp(moment: ShareMoment, ctx: ShareAppContext, phone?: string): Promise<void> {
    const inv = await this.createInvite(moment, ctx);
    if (!inv) return;
    const text = await this.buildText(moment, inv, ctx);
    const digits = String(phone || '').replace(/[^\d]/g, '');
    const target = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
    window.open(`${target}?text=${encodeURIComponent(text)}`, '_blank');
    this.trackShare('whatsapp', this.lastVoice, moment);
  }

  /** Direct SMS send (pre-filled with the crafted text + the OG link). */
  async shareViaSms(moment: ShareMoment, ctx: ShareAppContext, phone?: string): Promise<void> {
    const inv = await this.createInvite(moment, ctx);
    if (!inv) return;
    const text = await this.buildText(moment, inv, ctx);
    if (phone) {
      window.location.href = `sms:${phone}?body=${encodeURIComponent(text)}`;
      this.trackShare('sms', this.lastVoice, moment);
    } else {
      const res = await this.inviteService.share(inv, text);
      if (res !== 'failed') this.trackShare(res === 'copied' ? 'clipboard' : 'native', this.lastVoice, moment);
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
      this.trackShare('email', this.lastVoice, moment);
    } else {
      const res = await this.inviteService.share(inv, text);
      if (res !== 'failed') this.trackShare(res === 'copied' ? 'clipboard' : 'native', this.lastVoice, moment);
    }
  }

  /** 2026-08-19 STANDARD SHARE APP (Settings): the plain, always-appropriate
   *  share of LoopKeeper itself — native share sheet first, clipboard fallback. */
  async shareAppStandard(): Promise<'shared' | 'copied' | 'failed'> {
    // 2026-08-25 CACHE-BUSTING: distinct URL so social platforms don't serve the
    // old cached Zyppar preview for the bare /loopkeeper/ path.
    const url = 'https://zyppar.com/loopkeeper/?src=settings';
    // 2026-08-27 SHARE VOICES: one of three localized messages, picked per send.
    const voice = this.resolveVoice();
    const text = await this.buildAppShareText(url, voice);
    const nav: any = navigator;
    try {
      if (nav.share) {
        await nav.share({ title: 'LoopKeeper', text, url });
        this.trackShare('native', voice, 'casual');
        return 'shared';
      }
    } catch { /* user cancelled the sheet */ }
    try {
      if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        this.trackShare('clipboard', voice, 'casual');
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
      this.trackShare('copy', this.lastVoice, moment);
      return true;
    } catch {
      return false;
    }
  }
}
