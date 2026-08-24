import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { UsersApiService } from '../../services/users-api/users-api.service';
import { TimeNormalizerService } from '../../services/time-normalizer/time-normalizer.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { DraftEngineService } from '../../services/draft-engine/draft-engine.service';
import { NetworkService } from '../../services/network/network.service';
import { StorageService } from '../../services/storage/storage.service';

// 2026-08-16 THE PADLOCK: the Investors section opens with this word.
// Change it here — exclusivity is the point.
const INVESTOR_PASSWORD = 'northstar';

@Component({
  selector: 'app-about-rolodex',
  templateUrl: './about-rolodex.component.html',
  styleUrls: ['./about-rolodex.component.scss'],
  standalone: false,
})
export class AboutRolodexComponent implements OnInit, OnDestroy {
  /** 2026-08-19 DIRECT INVESTOR PORTAL: when opened from Settings > Investors,
   *  the modal is the portal (locked, password NorthStar) - NOT the About tour. */
  @Input() portalMode: 'about' | 'investors' = 'about';
  @Input() openInvestors = false;
  @Input() unlocked = false;

  version: string = environment.version || '0.1.0';

  /** 2026-08-23 LIGHTBOX: click any era/hero image for a full-screen view. */
  lightboxUrl: string | null = null;
  lightboxAlt = '';

  openLightbox(url: string, alt: string): void {
    this.lightboxUrl = url;
    this.lightboxAlt = alt || 'Enlarged historical image';
  }

  closeLightbox(): void {
    this.lightboxUrl = null;
    this.lightboxAlt = '';
  }

  // 2026-08-19 LIVE RECORD ANALYSIS: charts live inside the Investor page,
  // refreshed hourly (not every 5 seconds) so the investor sees the state of
  // the live record without leaving the app.
  investorStats: any = null;
  statsLoading = false;
  statsError = '';
  statsUpdatedLabel = '';
  private statsTimer: any = null;
  // 2026-08-24 WHAT CHANGED: snapshot of the last portal visit, compared on load.
  private readonly SNAPSHOT_KEY = 'loopkeeper_investor_snapshot';
  statsDelta: any = null;

  // 2026-08-24 READER MODE: tired-eyes controls (font size + soft contrast),
  // same spirit as Zyppar's AudioTextReader.
  readerFontSize = 15;
  readerMode = false;
  readerSoft = false;

  // 2026-08-19 THE EXTENDED ROOM: user suggestions from Chat with LoopKeeper,
  // locked behind the regular password extended with "-x2" (northstar-x2).
  x2Unlocked = false;
  feedbackList: any[] = [];
  feedbackLoading = false;
  /** 2026-08-23 INNER VAULT: Ox Alpha analyses served from app assets. */
  analyses: { file: string; title: string; text: string; open: boolean }[] = [
    { file: 'assets/analyses/01-playback-core.md', title: 'Playback core deep review', text: '', open: false },
    { file: 'assets/analyses/02-stock-photos.md', title: 'Era stock-photo spec', text: '', open: false },
    { file: 'assets/analyses/03-card-evolution.md', title: 'Five-era evolution timeline', text: '', open: false },
    { file: 'assets/analyses/04-listen-feedback.md', title: 'Listen silent-player diagnosis', text: '', open: false },
    { file: 'assets/analyses/05-about-refine.md', title: 'About copy refinement', text: '', open: false },
    { file: 'assets/analyses/06-rolodex-impl.md', title: 'Rolodex animation implementation', text: '', open: false },
    { file: 'assets/analyses/07-grok-video.md', title: 'Grok video completion path', text: '', open: false },
    { file: 'assets/analyses/08-isenberg-roadmap.md', title: 'Isenberg wedge roadmap — LoopKeeper next months', text: '', open: false },
  ];
  analysesLoading = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly usersApi: UsersApiService,
    private readonly time: TimeNormalizerService,
    private readonly alerts: AlertsService,
    private readonly draftEngine: DraftEngineService,
    private readonly network: NetworkService,
    private readonly storage: StorageService,
  ) {}

  ngOnInit(): void {
    // Legacy compatibility: openInvestors=true means the Investors portal.
    if (this.openInvestors) this.portalMode = 'investors';
    // The portal stays LOCKED. The word is NorthStar (case-insensitive).
    this.unlocked = false;
    // 2026-08-24 WHAT CHANGED: load the snapshot from the investor's last exit.
    void this.loadSnapshot();
  }

  ngOnDestroy(): void {
    if (this.statsTimer) clearInterval(this.statsTimer);
    // 2026-08-24 WHAT CHANGED: retain a snapshot on exit so the next visit can
    // say "what changed" — without any identity, just the numbers.
    if (this.investorStats) {
      try { void this.storage.set(this.SNAPSHOT_KEY, this.investorStats); } catch { /* best effort */ }
    }
  }

  private async loadSnapshot(): Promise<void> {
    try {
      const prev = await this.storage.get<any>(this.SNAPSHOT_KEY);
      if (prev) this.statsDelta = this.computeStatsDelta(prev, this.investorStats);
    } catch { /* first visit */ }
  }

  /** Start hourly refresh of the live-record analysis once the portal opens. */
  private startInvestorStats(): void {
    void this.loadInvestorStats();
    if (!this.statsTimer) {
      this.statsTimer = setInterval(() => {
        if (this.unlocked) void this.loadInvestorStats();
      }, 3600_000);
    }
  }

  /** Fetch the raw, captioned investor summary from the Rolodex server. */
  async loadInvestorStats(): Promise<void> {
    if (this.statsLoading) return;
    this.statsLoading = true;
    this.statsError = '';
    try {
      const res = await this.network.safeFetch(`${environment.rolodexApiBase}/investor/summary`, { cache: 'no-store' });
      if (!res) throw new Error('offline — summary skipped quietly');
      if (!res.ok) throw new Error('summary fetch failed');
      const data = await res.json();
      this.investorStats = data;
      this.statsUpdatedLabel = this.time.format(data?.generatedAt || new Date(), 'datetime');
      // 2026-08-24 WHAT CHANGED: compare current with the snapshot from last exit.
      try {
        const prev = await this.storage.get<any>(this.SNAPSHOT_KEY);
        if (prev) this.statsDelta = this.computeStatsDelta(prev, data);
      } catch { /* first visit */ }
    } catch (e: any) {
      this.statsError = e?.message || 'could not reach the live record';
    } finally {
      this.statsLoading = false;
    }
  }

  /** 2026-08-24 WHAT CHANGED: numeric deltas between two investor summaries. */
  private computeStatsDelta(prev: any, curr: any): any {
    if (!prev || !curr) return null;
    const n = (v: any) => Number(v) || 0;
    const row = (label: string, p: any, c: any) => {
      const prevV = n(p);
      const currV = n(c);
      if (prevV === 0 && currV === 0) return null;
      const diff = currV - prevV;
      const pct = prevV ? Math.round((diff / prevV) * 1000) / 10 : (currV ? 100 : 0);
      return { label, prev: prevV, curr: currV, diff, pct };
    };
    const items = [
      row('Devices synced', prev?.totals?.devices, curr?.totals?.devices),
      row('Contacts recorded', prev?.totals?.contacts, curr?.totals?.contacts),
      row('Follow-ups recorded', prev?.totals?.followUps, curr?.totals?.followUps),
      row('Active last 24h', prev?.totals?.activeLast24h, curr?.totals?.activeLast24h),
      row('DAU', prev?.analytics?.dau, curr?.analytics?.dau),
      row('WAU', prev?.analytics?.wau, curr?.analytics?.wau),
      row('MAU', prev?.analytics?.mau, curr?.analytics?.mau),
      row('Sessions (7d)', prev?.analytics?.sessions?.last7d, curr?.analytics?.sessions?.last7d),
      row('Avg session (s)', prev?.analytics?.avgSessionSeconds, curr?.analytics?.avgSessionSeconds),
    ].filter(Boolean);
    return items.length ? items : null;
  }

  /** 2026-08-24 READER MODE: bigger text for tired eyes. */
  increaseFont(): void {
    this.readerFontSize = Math.min(22, this.readerFontSize + 1);
    this.readerMode = true;
  }

  decreaseFont(): void {
    this.readerFontSize = Math.max(13, this.readerFontSize - 1);
    this.readerMode = true;
  }

  toggleReaderSoft(): void {
    this.readerSoft = !this.readerSoft;
    this.readerMode = true;
  }

  /** 2026-08-24 INVESTOR INDEX: jump to a section inside the modal. */
  scrollToSection(id: string): void {
    try {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch { /* ignore */ }
  }

  /** Hour label for a timeline bucket — always through the TimeNormalizer. */
  hourLabel(iso: string): string {
    return this.time.format(iso, 'time') || '—';
  }

  /** Bar width as a percentage of the busiest hour in the timeline. */
  barWidth(count: number): number {
    const counts = (this.investorStats?.timeline || []).map((b: any) => Number(b?.count) || 0);
    const max = Math.max(0, ...counts);
    if (!max) return 0;
    return Math.max(2, Math.round(((Number(count) || 0) / max) * 100));
  }

  /** 2026-08-19 EXTENDED ROOM PASSWORD: northstar-x2 (case-insensitive). */
  async promptX2(): Promise<void> {
    if (this.x2Unlocked) return;
    const alert = await this.alertCtrl.create({
      header: 'Investor suggestions room',
      subHeader: 'A word with a twist.',
      inputs: [{ name: 'pass', type: 'password', placeholder: 'Password' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Enter',
          handler: (data: any) => {
            const pass = String(data?.pass || '').trim();
            if (pass.toLowerCase() === (INVESTOR_PASSWORD + '-x2').toLowerCase()) {
              this.x2Unlocked = true;
              void this.loadFeedback();
              void this.loadAnalyses();
              return true;
            }
            void alert.dismiss();
            setTimeout(() => {
              void this.alertCtrl
                .create({ header: 'Not yet', message: 'That word does not open this room.', buttons: ['OK'] })
                .then((a) => a.present());
            }, 150);
            return false;
          },
        },
      ],
    });
    await alert.present();
  }

  /** Fetch the user suggestions from Chat with LoopKeeper. */
  async loadFeedback(): Promise<void> {
    if (this.feedbackLoading) return;
    this.feedbackLoading = true;
    try {
      const res = await fetch(`${environment.rolodexApiBase}/feedback`, { cache: 'no-store' });
      const data = await res.json();
      this.feedbackList = Array.isArray(data?.items) ? data.items : [];
    } catch {
      this.feedbackList = [];
    } finally {
      this.feedbackLoading = false;
    }
  }

  /** 2026-08-23 INNER VAULT: load the Ox Alpha analysis texts from assets. */
  async loadAnalyses(): Promise<void> {
    if (this.analysesLoading) return;
    this.analysesLoading = true;
    try {
      await Promise.all(this.analyses.map(async (a) => {
        if (a.text) return;
        try {
          const res = await fetch(a.file, { cache: 'no-store' });
          a.text = await res.text();
        } catch {
          a.text = '(Analysis file not found in this build.)';
        }
      }));
    } finally {
      this.analysesLoading = false;
    }
  }

  toggleAnalysis(index: number): void {
    const a = this.analyses[index];
    if (!a) return;
    a.open = !a.open;
    if (a.open && !a.text) void this.loadAnalyses();
  }

  /** The current device's trial status for the investor control. */
  trialStatusLabel(): string {
    const days = this.draftEngine.trialDaysLeft();
    if (days > 0) return `7-day Assistant trial: ${days} day${days === 1 ? '' : 's'} left.`;
    if (this.draftEngine.trialStartedAt() > 0) return 'Trial used on this device — it can be re-opened.';
    return 'Trial starts on first use.';
  }

  /** Re-open the 7-day trial on this device (owner/investor control). */
  async reopenTrial(): Promise<void> {
    const ok = await this.draftEngine.reopenTrial();
    await this.alerts.showToast(ok ? '7-day trial re-opened on this device.' : 'Trial re-opened locally — server will adopt it on next sync.', 3200);
  }

  /**
   * 2026-08-18 HOW AN INVESTOR GETS THE WORD: the padlock gate has a
   * 'Request access' path - they leave their name + email, the request is
   * recorded at the backend, and the access is dispensed on the spot.
   */
  async requestAccess(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Request investor access',
      message: 'Leave your details - the door opens for you right here.',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Your name' },
        { name: 'email', type: 'email', placeholder: 'Your email' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Request access',
          handler: async (data: any) => {
            const email = String(data?.email || '').trim();
            if (!email) return false;
            const name = String(data?.name || '').trim();
            const access = await this.usersApi.requestInvestorAccess(name, email, '');
            if (access) {
              this.unlocked = true;
              this.startInvestorStats();
              void this.alertCtrl.create({
                header: 'Welcome in',
                message: 'Your request is recorded. The roadmap is open for you.',
                buttons: ['OK'],
              }).then((a) => a.present());
              return true;
            }
            void this.alertCtrl.create({ header: 'Not yet', message: 'The request could not be recorded - try again when online.', buttons: ['OK'] }).then((a) => a.present());
            return false;
          },
        },
      ],
    });
    await alert.present();
  }

  async promptPassword(): Promise<void> {
    if (this.unlocked) return;
    const alert = await this.alertCtrl.create({
      header: 'Investors only',
      subHeader: 'Some doors are opened with a word.',
      inputs: [{ name: 'pass', type: 'password', placeholder: 'Password' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Request access', handler: () => { void this.requestAccess(); return true; } },
        {
          text: 'Enter',
          handler: (data: any) => {
            const pass = String(data?.pass || '').trim();
            if (pass.toLowerCase() === INVESTOR_PASSWORD.toLowerCase()) {
              this.unlocked = true;
              this.startInvestorStats();
              return true;
            }
            // Wrong word: close the prompt, then the denial — one alert at a time.
            void alert.dismiss();
            setTimeout(() => {
              void this.alertCtrl
                .create({ header: 'Not yet', message: 'That word does not open this door.', buttons: ['OK'] })
                .then((a) => a.present());
            }, 150);
            return false;
          },
        },
      ],
    });
    await alert.present();
  }

  /** 2026-08-18 THE INVESTOR GATEWAY: one tap opens the read-only live peek.
   *  2026-08-19 EXPLICIT NEW TAB: the button says "new tab" and the app says
   *  so out loud, so nobody wonders where the Rolodex app went. */
  openLive(): void {
    void this.alerts.showToast('Opening the live dashboard in a new tab — this page stays open here.', 3500);
    window.open(`${environment.rolodexApiBase}/live`, '_blank', 'noopener');
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
