import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { NetworkService } from '../../services/network/network.service';
import { TimeNormalizerService } from '../../services/time-normalizer/time-normalizer.service';
import { TranslationReviewComponent } from '../translation-review/translation-review.component';

/**
 * 2026-09-14 BUILD 190 — THE COMMAND CENTER (founder: "much of the current
 * Investor portal analytics in a dedicated command center component via a
 * button inside Investor, so that this portal does not get too cluttered").
 *
 * BUILD 191 (founder: the sessional aperture): the console now ALSO lives as
 * a RolodexPage view (RolodexView.CommandCenter) opened by the aperture icon
 * — which appears only after a successful Investor-portal unlock this
 * session (InvestorGateService). Same view contract as Settings: the external
 * Home icon plus this component's own internal Close. Two hosts, one
 * component: when `stats` is passed (the portal modal path) it renders
 * as-is; when not (the aperture view path) it fetches
 * `/investor/summary` itself on init.
 */
@Component({
  selector: 'app-command-center',
  templateUrl: './command-center.component.html',
  styleUrls: ['./command-center.component.scss'],
  standalone: false,
})
export class CommandCenterComponent implements OnInit, OnChanges {
  @Input() stats: any = null;
  @Output() closed = new EventEmitter<void>();
  @Output() home = new EventEmitter<void>(); // BUILD 191: the external Home icon
  loading = false;
  loadError = '';

  constructor(
    private readonly modalController: ModalController,
    private readonly time: TimeNormalizerService,
    private readonly network: NetworkService,
  ) {}

  ngOnInit(): void {
    void this.ensureStats();
  }

  /** The view path re-runs on every open — refresh the console each time. */
  ngOnChanges(): void {
    void this.ensureStats();
  }

  /**
   * BUILD 191: the aperture path arrives with no [stats] — fetch the summary
   * directly (same endpoint the portal reads; quiet via safeFetch).
   */
  private async ensureStats(): Promise<void> {
    if (this.stats) return;
    if (this.loading) return;
    this.loading = true;
    this.loadError = '';
    try {
      const res = await this.network.safeFetch(`${environment.rolodexApiBase}/investor/summary`, { cache: 'no-store' });
      if (res && res.ok) {
        this.stats = await res.json();
      } else {
        this.loadError = res ? `Summary unavailable (HTTP ${res.status}).` : 'Offline — the console needs a connection.';
      }
    } catch {
      this.loadError = 'The summary would not load. Try again in a moment.';
    } finally {
      this.loading = false;
    }
  }

  close(): void {
    this.closed.emit();
  }

  goHome(): void {
    this.home.emit();
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

  /** 2026-09-14 BUILD 193 DISCOVERY: zip the arrival timeline into bars. */
  growthBars(): Array<{ day: string; count: number }> {
    const g = this.stats?.analytics?.deviceGrowth;
    if (!g?.days?.length) return [];
    return g.days.map((day: string, i: number) => ({ day, count: Number(g.counts?.[i]) || 0 }));
  }

  /** Arrival bar width, scaled to the busiest arrival day. */
  growthWidth(count: number): number {
    const g = this.stats?.analytics?.deviceGrowth;
    const counts = (g?.counts || []).map((c: any) => Number(c) || 0);
    const max = Math.max(0, ...counts);
    if (!max) return 0;
    return Math.max(2, Math.round(((Number(count) || 0) / max) * 100));
  }

  /** 2026-09-14 BUILD 196: the full-size live Opens series for the chart. */
  ccOpensPoints(): Array<{ day: string; count: number }> {
    const de = this.stats?.analytics?.dailyEvents;
    const row = de?.rows?.find((r: any) => r.event === 'app_launch');
    return (de?.days || []).map((day: string, i: number) => ({ day, count: Number(row?.counts?.[i]) || 0 }));
  }
}
