import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { RolodexInvite } from '../../services/invite/invite.service';
import { StorageService } from '../../services/storage/storage.service';
import { WelcomeModalComponent, WELCOME_DISMISSED_KEY } from '../welcome-modal/welcome-modal.component';

/**
 * 2026-08-17 THE DROPBOX MOMENT — the invite landing.
 * Someone WITHOUT Rolodex clicked the share link. The PWA opens, fetches the
 * invite, and shows this card: WHO invited them, WHAT it is (appointment or
 * message), and the two hooks — correlate the single person into their phone
 * contacts via the Contact Picker, or get the app (where the 7-day trial
 * begins).
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
  ) {}

  get whenLabel(): string {
    if (!this.invite?.when) return '';
    try { return new Date(this.invite.when).toLocaleString(); } catch { return this.invite.when; }
  }

  /** Hook 1 — the Contact Picker correlation: find {from} in MY phone. */
  async findInContacts(): Promise<void> {
    const picker = (navigator as any)?.contacts;
    if (!picker?.select) {
      void this.modalController.dismiss('pick-unavailable', 'close');
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

  /** Hook 2 — the Play Store nudge (the 7-day trial begins there). */
  getApp(): void {
    void this.modalController.dismiss('get-app', 'close');
  }

  /** 2026-08-18 WHAT IS ROLODEXAI ABOUT?: opens the Welcome demo. A first-time
   *  guest (no dismissal stored) sees 'Karibu sana!'; a returning guest sees
   *  'Welcome Again'. */
  async whatIsRolodex(): Promise<void> {
    try {
      const dismissed = await this.storageService.get<string>(WELCOME_DISMISSED_KEY);
      const modal = await this.modalController.create({
        component: WelcomeModalComponent,
        componentProps: { isReplay: !!dismissed },
        cssClass: 'card-chat-modal-sheet',
        breakpoints: [0, 0.7, 0.95],
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
