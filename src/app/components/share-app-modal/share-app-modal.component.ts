import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ShareAppService } from '../../services/share-app/share-app.service';

/**
 * 2026-08-22 LOOPKEEPER SHAREAPP — the branded share sheet, modeled on
 * Zyppar's ShareApp component. Shows the loop mark + wedge + link, then
 * hands the user a platform choice. The preview URL always carries
 * https://zyppar.com/loopkeeper/ so the OG card reads LoopKeeper, never
 * the old /rolodex + R-icon combo.
 */
@Component({
  selector: 'app-share-app-modal',
  templateUrl: './share-app-modal.component.html',
  styleUrls: ['./share-app-modal.component.scss'],
})
export class ShareAppModalComponent {
  // 2026-08-25 CACHE-BUSTING URL: the bare /loopkeeper/ URL is cached by social
  // platforms with the old Zyppar preview. ?src=settings is a distinct stable URL
  // so WhatsApp/Telegram fetch the current LoopKeeper OG card (same PWA, same OG tags).
  readonly shareUrl = 'https://zyppar.com/loopkeeper/?src=settings';
  readonly shareText = `I use LoopKeeper for one thing: the 'I should really reach out' list. It nudges me until I actually do. Worth a look if you have the same list: https://zyppar.com/loopkeeper/?src=settings`;
  readonly shareImage = 'assets/loopkeeper/tile.svg';

  // 2026-08-25 STATIC LOOPKEEPER PREVIEW: always shows the branded card.
  // No server fetch — the OG data is known and must never resolve to Zyppar.
  readonly preview = {
    url: this.shareUrl,
    host: 'zyppar.com',
    title: 'LoopKeeper — Close the loop you keep meaning to close',
    image: 'https://zyppar.com/loopkeeper/assets/loopkeeper/og-1200x630.png',
    description: 'Follow-through for the few who matter — nudge, draft, send, streak.',
  };

  constructor(
    private readonly modalController: ModalController,
    private readonly shareApp: ShareAppService,
  ) {}

  close(): void {
    void this.modalController.dismiss();
  }

  whatsapp(): void {
    window.open(`https://wa.me/?text=${encodeURIComponent(this.shareText)}`, '_blank');
  }

  email(): void {
    window.location.href = `mailto:?subject=${encodeURIComponent('LoopKeeper — close the loop you keep meaning to close')}&body=${encodeURIComponent(this.shareText)}`;
  }

  sms(): void {
    window.location.href = `sms:?body=${encodeURIComponent(this.shareText)}`;
  }

  async copy(): Promise<void> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.shareText);
      }
    } catch { /* clipboard unavailable */ }
    await this.modalController.dismiss();
  }

  async native(): Promise<void> {
    await this.shareApp.shareAppStandard();
    await this.modalController.dismiss();
  }
}
