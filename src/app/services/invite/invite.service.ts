import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface RolodexInvite {
  token: string;
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
 * (zyppar.com/rolodex/?invite=TOKEN) opens the PWA on THEIR device — no
 * install. The landing then correlates the single person via the Contact
 * Picker and offers the Play Store app (where the 7-day trial begins).
 */
@Injectable({
  providedIn: 'root',
})
export class InviteService {
  create(inv: { from: string; room: string; kind: 'message' | 'appointment'; title?: string; when?: string; text?: string }): Promise<RolodexInvite | null> {
    return fetch(`${environment.rolodexApiBase}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inv),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d?.ok ? { token: d.token, url: d.url, from: inv.from, room: inv.room, kind: inv.kind, title: inv.title || '', when: inv.when || '', text: inv.text || '', createdAt: Date.now() } as RolodexInvite : null))
      .catch(() => null);
  }

  fetch(token: string): Promise<RolodexInvite | null> {
    return fetch(`${environment.rolodexApiBase}/invites/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d?.ok ? (d.invite as RolodexInvite) : null))
      .catch(() => null);
  }

  shareUrl(inv: RolodexInvite): string {
    return `https://zyppar.com/rolodex/?invite=${inv.token}`;
  }

  /** The native share sheet (WhatsApp, email, SMS, X, copy…) with a link fallback. */
  async share(inv: RolodexInvite): Promise<'shared' | 'copied' | 'failed'> {
    const url = this.shareUrl(inv);
    const text = inv.kind === 'appointment'
      ? `${inv.from} fixed a meeting with you on Rolodex: ${inv.title || 'An appointment'}${inv.when ? ' — ' + new Date(inv.when).toLocaleString() : ''}. ${url}`
      : `${inv.from} sent you a message on Rolodex: "${inv.text}". ${url}`;
    const nav = navigator as any;
    try {
      if (nav.share) {
        await nav.share({ title: 'Rolodex invite from ' + inv.from, text, url });
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
}
