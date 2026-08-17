import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { RolodexInvite } from '../../services/invite/invite.service';

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

  constructor(private readonly modalController: ModalController) {}

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
        void this.modalController.dismiss({ picked: { name: String(raw.name || ''), tel: Array.isArray(raw.tel) ? raw.tel[0] || '' : '' } }, 'picked');
      }
    } catch {
      void this.modalController.dismiss(null, 'cancel');
    }
  }

  /** Hook 2 — the Play Store nudge (the 7-day trial begins there). */
  getApp(): void {
    void this.modalController.dismiss('get-app', 'close');
  }

  close(): void {
    void this.modalController.dismiss(null, 'cancel');
  }
}
