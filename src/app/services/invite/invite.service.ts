import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AnalyticsService } from '../analytics/analytics.service';

export interface RolodexInvite {
  token: string;
  /** 2026-08-18: the PWA invite URL (human landing). */
  url?: string;
  /** 2026-08-18: the server-rendered OG landing URL (the share text carries
   *  THIS one - WhatsApp/email/X see the branded preview, then redirect to url). */
  ogUrl?: string;
  from: string;
  room: string;
  kind: 'message' | 'appointment';
  title: string;
  when: string;
  text: string;
  createdAt: number;
}

/**
 * 2026-08-17 THE DROPBOX MOMENT — invites.
 * The counterparty does NOT have Rolodex. So the appointment/message is
 * delivered through the channels they already use: the invite is stored on
 * the rolodex-server with a short token, and the share URL
 * (zyppar.com/loopkeeper/?invite=TOKEN) opens the PWA on THEIR device — no
 * install. The landing then correlates the single person via the Contact
 * Picker and offers the Play Store app (where the 7-day trial begins).
 */
@Injectable({
  providedIn: 'root',
})
export class InviteService {
  constructor(private readonly analytics: AnalyticsService) {}

  create(inv: { from: string; room: string; kind: 'message' | 'appointment'; title?: string; when?: string; text?: string }): Promise<RolodexInvite | null> {
    return fetch(`${environment.rolodexApiBase}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inv),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok) {
          this.analytics.track('invite_created', { kind: inv.kind });
          return { token: d.token, url: d.url, ogUrl: d.ogUrl, from: inv.from, room: inv.room, kind: inv.kind, title: inv.title || '', when: inv.when || '', text: inv.text || '', createdAt: Date.now() } as RolodexInvite;
        }
        return null;
      })
      .catch(() => null);
  }

  fetch(token: string): Promise<RolodexInvite | null> {
    return fetch(`${environment.rolodexApiBase}/invites/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d?.ok ? (d.invite as RolodexInvite) : null))
      .catch(() => null);
  }

  /** 2026-08-18 SHAREAPP: the share text ALWAYS carries the PWA URL
   *  (https://zyppar.com/loopkeeper/?invite=TOKEN) so the link's own header/domain
   *  reads as the app. If a stale server response ever sends a bare
   *  zyppar.com URL, we ignore it and build the /loopkeeper/ path ourselves. */
  shareUrl(inv: RolodexInvite): string {
    const pwa = `https://zyppar.com/loopkeeper/?invite=${inv.token}`;
    return inv?.url?.includes('/loopkeeper/') ? inv.url : pwa;
  }

  /** The native share sheet (WhatsApp, email, SMS, X, copy…) with a link fallback.
   *  `text` is optional - when omitted a plain legacy line is used. */
  async share(inv: RolodexInvite, text?: string): Promise<'shared' | 'copied' | 'failed'> {
    const url = this.shareUrl(inv);
    const fallback = inv.kind === 'appointment'
      ? `${inv.from} fixed a meeting with you on LoopKeeper: ${inv.title || 'An appointment'}${inv.when ? ' — ' + new Date(inv.when).toLocaleString() : ''}. ${url}`
      : `${inv.from} sent you a message on LoopKeeper: "${inv.text}". ${url}`;
    const finalText = text || fallback;
    const nav = navigator as any;
    try {
      if (nav.share) {
        await nav.share({ title: 'LoopKeeper invite from ' + inv.from, text: finalText, url });
        return 'shared';
      }
    } catch { /* user cancelled the sheet */ }
    try {
      if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(finalText);
        return 'copied';
      }
    } catch { /* clipboard unavailable */ }
    return 'failed';
  }
}
