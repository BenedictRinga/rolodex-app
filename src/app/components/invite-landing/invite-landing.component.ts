import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { RolodexInvite } from '../../services/invite/invite.service';
import { StorageService } from '../../services/storage/storage.service';
import { AnalyticsService } from '../../services/analytics/analytics.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { WelcomeModalComponent, WELCOME_DISMISSED_KEY } from '../welcome-modal/welcome-modal.component';

/**
 * 2026-08-17 THE DROPBOX MOMENT — the invite landing.
 * Someone WITHOUT Rolodex clicked the share link. The PWA opens, fetches the
 * invite, and shows this card: WHO invited them and WHAT it is (appointment or
 * message), then the hooks — confirm you know them (Contact Picker, the pick
 * lands on their deck + Welcome package), see more (the Welcome tour), or
 * report that something didn't work (anonymous invite_issue event).
 * 2026-08-29 BUILD 142: fully i18n'd (was hardcoded English — the #4 answer);
 * Get-the-app commented out pending the tester process.
 */
@Component({
  selector: 'app-invite-landing',
  templateUrl: './invite-landing.component.html',
  styleUrls: ['./invite-landing.component.scss'],
  standalone: false,
})
export class InviteLandingComponent {
  @Input() invite!: RolodexInvite;

  constructor(
    private readonly modalController: ModalController,
    private readonly storageService: StorageService,
    // 2026-08-29 BUILD 142: the failure catch (#5) + the confirmation toast.
    private readonly analytics: AnalyticsService,
    private readonly translateRef: TranslateService,
    private readonly alerts: AlertsService,
  ) {}

  get whenLabel(): string {
    if (!this.invite?.when) return '';
    try { return new Date(this.invite.when).toLocaleString(); } catch { return this.invite.when; }
  }

  /** Hook 1 — the Contact Picker correlation: find {from} in MY phone. */
  async findInContacts(): Promise<void> {
    const picker = (navigator as any)?.contacts;
    if (!picker?.select) {
      void this.modalController.dismiss(null, 'pick-unavailable');
      return;
    }
    try {
      const picked = await picker.select(['name', 'tel'], { multiple: false });
      const raw = picked?.[0];
      if (raw) {
        void this.modalController.dismiss({ picked: { name: this.contactName(raw), tel: Array.isArray(raw.tel) ? raw.tel[0] || '' : '' } }, 'picked');
      }
    } catch {
      void this.modalController.dismiss(null, 'cancel');
    }
  }

  /** 2026-08-18 FIX: the picker's name can be a string, a structured object
   *  ({formatted, givenName, familyName, …}) or an array — never String() it. */
  private contactName(raw: any): string {
    const n = raw?.name;
    if (typeof n === 'string') return n;
    if (Array.isArray(n)) {
      return n
        .map((x: any) => (typeof x === 'string' ? x : (x?.formatted || x?.displayName || x?.display || [x?.givenName, x?.familyName].filter(Boolean).join(' ') || '')))
        .filter(Boolean)
        .join(' ')
        .trim();
    }
    if (n && typeof n === 'object') {
      return String(n.formatted || n.displayName || n.display || [n.givenName, n.familyName].filter(Boolean).join(' ') || raw.nickname || raw.displayName || '');
    }
    return String(raw?.nickname || raw?.displayName || '');
  }

  /** Hook 2 — the Play Store nudge (the 7-day trial begins there).
   *  2026-08-29 BUILD 142: the button is commented out (tester process
   *  pending) but the method stays for the day it returns. */
  getApp(): void {
    void this.modalController.dismiss(null, 'get-app');
  }

  /** 2026-08-29 BUILD 142 (founder, #5): "a button which when pressed returns
   *  a failure notification caught in Investors" — the invitee finally has a
   *  voice. Anonymous event (no contact data), tagged testerId when the device
   *  is one; the investors portal's event roll-up picks it up server-side. */
  reportIssue(): void {
    this.analytics.track('invite_issue', { where: 'invite_landing', kind: this.invite?.kind || 'message' });
    void this.alerts.showToast(this.instant('loopkeeper.invite.reportThanks'), 2600);
  }

  /** Flat-key instant read (the landing renders before app locals fully bind). */
  private instant(key: string, params?: Record<string, unknown>): string {
    try { return this.translateRef.instant(key, params); } catch { return key; }
  }

  /** 2026-08-18 WHAT IS ROLODEXAI ABOUT?: opens the Welcome demo. A first-time
   *  guest (no dismissal stored) sees 'Karibu sana!'; a returning guest sees
   *  'Welcome Again'.
   *  2026-08-29 BUILD 142: this IS the See-more door now (founder #3) — the
   *  curious invitee is pulled deeper instead of shown a dead end.
   *  2026-08-29 BUILD 143 (founder #1): See more hosts the SAME FULL Welcome
   *  package as Confirm, WITHOUT interruption — always the first-time tour
   *  (isReplay: false), never the abbreviated "Welcome Again" variant. */
  async whatIsRolodex(): Promise<void> {
    try {
      const modal = await this.modalController.create({
        component: WelcomeModalComponent,
        componentProps: { isReplay: false },
        cssClass: 'card-chat-modal-sheet',
        breakpoints: [0, 0.7, 0.95, 1],
        initialBreakpoint: 0.95,
        keyboardClose: false,
      });
      await modal.present();
    } catch { /* demo is best-effort */ }
  }

  close(): void {
    void this.modalController.dismiss(null, 'cancel');
  }
}
