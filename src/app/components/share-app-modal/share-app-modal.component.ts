import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ShareAppService } from '../../services/share-app/share-app.service';
import { LinkPreviewService, LinkPreview } from '../../services/link-preview/link-preview.service';

/**
 * 2026-08-22 LOOPKEEPER SHAREAPP — the branded share sheet, modeled on
 * Zyppar's ShareApp component. Shows the loop mark + wedge + link, then
 * hands the user a platform choice. The preview URL always carries
 * https://zyppar.com/openloop/ so the OG card reads LoopKeeper, never
 * the old /rolodex + R-icon combo.
 */
@Component({
  selector: 'app-share-app-modal',
  templateUrl: './share-app-modal.component.html',
  styleUrls: ['./share-app-modal.component.scss'],
})
export class ShareAppModalComponent implements OnInit {
  readonly shareUrl = 'https://zyppar.com/openloop/';
  readonly shareText = `I use LoopKeeper for one thing: the 'I should really reach out' list. It nudges me until I actually do. Worth a look if you have the same list: https://zyppar.com/openloop/`;
  readonly shareImage = 'assets/loopkeeper/tile.svg';
  preview: LinkPreview | null = null;

  constructor(
    private readonly modalController: ModalController,
    private readonly shareApp: ShareAppService,
    private readonly linkPreview: LinkPreviewService,
  ) {}

  ngOnInit(): void {
    // 2026-08-22 LINK PREVIEW: show what the recipient will actually see when
    // the link unfurls — the LoopKeeper OG card, not a Zyppar favicon.
    void this.linkPreview.fetchPreview(this.shareUrl).then((p) => {
      if (p?.image || p?.title) this.preview = p;
    });
  }

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
