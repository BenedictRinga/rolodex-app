import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TimeNormalizerService } from '../../services/time-normalizer/time-normalizer.service';
import { TranslationReviewComponent } from '../translation-review/translation-review.component';

/**
 * 2026-09-14 BUILD 190 — THE COMMAND CENTER (founder: "much of the current
 * Investor portal analytics in a dedicated command center component via a
 * button inside Investor, so that this portal does not get too cluttered").
 *
 * The portal keeps the growth story (Delta, Live, Presence, Retention,
 * Activation, Events); THIS component is the operations console one tap away:
 * 01 Reliability (chat/draft failures, app_error + the crash ledger, ingest
 * counter), 02 Timeline (hourly sync bars), 03 Rooms, 04 Community
 * translations. All data arrives via the same `investorStats` summary the
 * portal already renders — no second fetch, no new permissions.
 */
@Component({
  selector: 'app-command-center',
  templateUrl: './command-center.component.html',
  styleUrls: ['./command-center.component.scss'],
  standalone: false,
})
export class CommandCenterComponent {
  @Input() stats: any = null;
  @Output() closed = new EventEmitter<void>();

  constructor(
    private readonly modalController: ModalController,
    private readonly time: TimeNormalizerService,
  ) {}

  close(): void {
    this.closed.emit();
  }

  /** Hour label for a timeline bucket — always through the TimeNormalizer. */
  hourLabel(iso: string): string {
    return this.time.format(iso, 'time') || '—';
  }

  /** 2026-08-25 Community translations helpers. */
  keysCount(t: any): number {
    return t?.keys && typeof t.keys === 'object' ? Object.keys(t.keys).length : 0;
  }

  formatTime(v: any): string {
    return this.time.format(v, 'datetime') || '—';
  }

  /** 2026-08-25 REVIEW VIEW: maintainer approves/rejects community translations. */
  async openTranslationReview(): Promise<void> {
    const modal = await this.modalController.create({
      component: TranslationReviewComponent,
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.6, 0.85, 0.95],
      initialBreakpoint: 0.85,
    });
    await modal.present();
  }

  /** Bar width as a percentage of the busiest hour in the timeline. */
  barWidth(count: number): number {
    const counts = (this.stats?.timeline || []).map((b: any) => Number(b?.count) || 0);
    const max = Math.max(0, ...counts);
    if (!max) return 0;
    return Math.max(2, Math.round(((Number(count) || 0) / max) * 100));
  }
}
