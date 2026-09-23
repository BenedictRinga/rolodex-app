import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { environment } from '../../../environments/environment';
// 2026-08-28 BUILD 125: view on/off for password alert inputs.
import { attachPasswordPeek } from '../../services/alerts/alert-peek';
import { UsersApiService } from '../../services/users-api/users-api.service';
import { TimeNormalizerService } from '../../services/time-normalizer/time-normalizer.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { DraftEngineService } from '../../services/draft-engine/draft-engine.service';
import { NetworkService } from '../../services/network/network.service';
import { StorageService } from '../../services/storage/storage.service';
import { InvestorGateService } from '../../services/investor-gate/investor-gate.service';
// 2026-09-14 BUILD 190: TranslationReviewComponent moved with the Translations
// section into command-center/ (that component presents it itself).

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

  // BUILD 263 THE VERSION THAT TICKS: the portal's version composes from the
  // build counter (0.3.<build>) — the static environment.version ("0.3.1")
  // never ruled a display anywhere.
  version: string = `0.3.${Number(environment.build) || 0}`;

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

  // 2026-09-14 BUILD 190 THE COMMAND CENTER: the operations console
  // (Reliability · Timeline · Rooms · Translations) moved into its own
  // component (command-center/), opened by the portal button/chip through the
  // in-template ion-modal below. The portal keeps the growth story.
  commandCenterOpen = false;

  // 2026-09-14 BUILD 196 THE LIVE YARDSTICK: the portal's yardstick leads
  // with a real 14-day series (Opens / Arrivals / Loops closed), toggleable,
  // pinch-zoomable, expandable into the Command Center. Data comes from the
  // same summary object as everything else — dailyEvents + deviceGrowth.
  yardstickSeries: 'opens' | 'arrivals' | 'closed' = 'opens';

  yardstickPoints(): Array<{ day: string; count: number }> {
    const a = (this.investorStats as any)?.analytics;
    const de = a?.dailyEvents;
    if (this.yardstickSeries === 'arrivals') {
      const g = a?.deviceGrowth;
      if (!g?.days?.length) return [];
      return g.days.map((day: string, i: number) => ({ day, count: Number(g.counts?.[i]) || 0 }));
    }
    const event = this.yardstickSeries === 'closed' ? 'loop_closed' : 'app_launch';
    const row = de?.rows?.find((r: any) => r.event === event);
    return (de?.days || []).map((day: string, i: number) => ({ day, count: Number(row?.counts?.[i]) || 0 }));
  }

  yardstickLabel(): string {
    return this.yardstickSeries === 'arrivals' ? 'Arrivals' : this.yardstickSeries === 'closed' ? 'Loops closed' : 'Opens';
  }

  yardstickColor(): string {
    return this.yardstickSeries === 'arrivals' ? '#00A896' : this.yardstickSeries === 'closed' ? '#FFB300' : '#00C853';
  }

  openYardstickInCenter(): void {
    this.commandCenterOpen = true; // ⤢ the same console, full-size
  }

  // 2026-09-02 BUILD 181 (founder directive): the contactless redesign framework
  // (loopkeeper redesign.txt) joins the investors portal as a segmented panel.
  redesignTab = 'why';
  redesignTabs = [
    { id: 'why', label: 'Why' },
    { id: 'threat', label: 'Threat' },
    { id: 'loop', label: 'The Loop' },
    { id: 'product', label: 'Zero-contact product' },
    { id: 'wilder', label: 'Wilder' },
    { id: 'ship', label: 'Ship' },
  ];
  // 2026-08-24 WHAT CHANGED: snapshot of the last portal visit, compared on load.
  private readonly SNAPSHOT_KEY = 'loopkeeper_investor_snapshot';
  /** 2026-09-23 BUILD 314 THE ENTRY RE-BASELINE: the first successful fetch
   *  of each unlock re-baselines (device last-entry first, the server's
   *  Time Capsule as a first-visit fallback) and writes the new snapshot;
   *  hourly in-session refreshes never move the baseline. */
  private entryBaselined = false;
  statsDelta: any = null;
  // 2026-09-18 BUILD 273 THE LIVE COMPASS (founder: "can we see percentage
  // changes between visits or refresh Sections 03, 05, and 06, like we do in
  // 01?"): the same snapshot comparison, KEYED — sections 03/05/06 look up
  // their own metric ('dau', 'activation.loopclosed', 'event.app_launch'…)
  // and render the change chip beside the value. One baseline, every section.
  statsDeltaMap: Record<string, { prev: number; curr: number; diff: number; pct: number }> = {};

  /** The keyed delta for a metric path, or null when no baseline covers it. */
  deltaFor(key: string): { prev: number; curr: number; diff: number; pct: number } | null {
    return this.statsDeltaMap?.[key] || null;
  }

  /** "▲ +5 (12.5%)" — the section-01 change cell, compressed for inline use. */
  deltaText(key: string): string {
    const d = this.deltaFor(key);
    if (!d) return '';
    const sign = d.diff > 0 ? '▲ +' : d.diff < 0 ? '▼ ' : '● ';
    return `${sign}${d.diff} (${d.pct}%)`;
  }

  /** Color class for the chip: up green, down red, unchanged grey. */
  deltaClass(key: string): string {
    const d = this.deltaFor(key);
    if (!d) return '';
    return d.diff > 0 ? 'delta-up' : d.diff < 0 ? 'delta-down' : 'delta-flat';
  }

  // 2026-08-24 READER MODE: tired-eyes controls (font size + soft contrast),
  // same spirit as Zyppar's AudioTextReader.
  readerFontSize = 15;
  readerMode = false;
  readerSoft = false;

  // 2026-08-28 BUILD 136: the ten cohorts — collapsed behind a page-wide pill;
  // only the curious pay the scroll. See about-rolodex.component.html.
  cohortsOpen = false;

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
    private readonly investorGate: InvestorGateService, // BUILD 191: the sessional aperture signal
  ) {}

  ngOnInit(): void {
    // Legacy compatibility: openInvestors=true means the Investors portal.
    if (this.openInvestors) this.portalMode = 'investors';
    // The portal stays LOCKED. The word is NorthStar (case-insensitive).
    this.unlocked = false;
    // 2026-09-23 BUILD 314: each app session re-baselines at its first
    // unlock-fetch — an app reload is a new entry, never a pinned baseline.
    this.entryBaselined = false;
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
      if (prev) this.applyDelta(prev);
    } catch { /* first visit */ }
  }

  // ── 2026-09-20 BUILD 287 THE PORTAL MIRROR ── the recent-doors lens, in
  // the portal body: the same helpers the Command Center uses.
  recentOpen = new Set<string>();
  toggleRecent(id: string): void {
    if (this.recentOpen.has(id)) this.recentOpen.delete(id);
    else this.recentOpen.add(id);
  }
  shortId(id: string): string {
    return String(id || '').length > 22 ? `${String(id).slice(0, 14)}…${String(id).slice(-6)}` : String(id || '');
  }
  seenLabel(ts: any): string {
    if (!ts) return '—';
    const ms = new Date(ts).getTime();
    if (!Number.isFinite(ms)) return '—';
    const days = Math.floor((Date.now() - ms) / 86_400_000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  }
  formatTime(v: any): string {
    return this.time.format(v, 'datetime') || '—';
  }
  /** BUILD 273: one unpack — the section-01 rows AND the keyed map together. */
  private applyDelta(prev: any): void {
    const result = this.computeStatsDelta(prev, this.investorStats);
    this.statsDelta = result?.items || null;
    this.statsDeltaMap = result?.map || {};
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
      // 2026-09-23 BUILD 314 THE ENTRY RE-BASELINE (founder: "the records
      // percentages persist between last entry/sessions, even an app reload.
      // It defeats the whole idea of current contrasted against previous"):
      // since 281 the baseline preferred the SERVER's prior CALENDAR DAY —
      // entering twice in one day showed the same chips. The baseline is now
      // THIS DEVICE'S LAST ENTRY (the stored snapshot, written at the first
      // fetch of each unlock and refreshed at exit); the server's prior-day
      // Time Capsule stays as the fallback for a device's FIRST visit only.
      // The hourly in-session refreshes do not move the baseline — only a
      // real entry does.
      if (!this.entryBaselined) {
        this.entryBaselined = true;
        let devicePrev: any = null;
        try { devicePrev = await this.storage.get<any>(this.SNAPSHOT_KEY); } catch { /* first visit */ }
        if (devicePrev) this.applyDelta(devicePrev);
        else if (data?.prev) this.applyDelta(data.prev); // the Time Capsule, first visit only
        // Re-baseline NOW: the next entry contrasts against THIS entry —
        // whatever way the session ends (exit, reload, kill).
        try { void this.storage.set(this.SNAPSHOT_KEY, data); } catch { /* best effort */ }
      }
    } catch (e: any) {
      this.statsError = e?.message || 'could not reach the live record';
    } finally {
      this.statsLoading = false;
    }
  }

  /** 2026-08-24 WHAT CHANGED: numeric deltas between two investor summaries.
   *  BUILD 273: also returns the KEYED map that sections 03/05/06 read —
   *  the section-01 table keeps its exact rows, the map adds every metric
   *  those sections render (presence KPIs, activation milestones, top events). */
  private computeStatsDelta(prev: any, curr: any): { items: any[]; map: Record<string, { prev: number; curr: number; diff: number; pct: number }> } | null {
    if (!prev || !curr) return null;
    const n = (v: any) => Number(v) || 0;
    const map: Record<string, { prev: number; curr: number; diff: number; pct: number }> = {};
    const row = (label: string, p: any, c: any) => {
      // BUILD 282: a chip needs a REAL baseline — an undefined/null prev field
      // (a reconstructed or first-day ledger) is NO chip, never a fake +100%.
      if (p === undefined || p === null) return null;
      const prevV = n(p);
      const currV = n(c);
      if (prevV === 0 && currV === 0) return null;
      const diff = currV - prevV;
      const pct = prevV ? Math.round((diff / prevV) * 1000) / 10 : (currV ? 100 : 0);
      return { label, prev: prevV, curr: currV, diff, pct };
    };
    const put = (key: string, p: any, c: any) => {
      const r = row('', p, c);
      if (r) map[key] = r;
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
      // 2026-08-29 BUILD 143 (founder #3): the funnel's leak gets its own line —
      // invitees tapping "Something didn't work?" on the landing.
      row('Invite issues (7d)', prev?.analytics?.inviteIssues?.last7d, curr?.analytics?.inviteIssues?.last7d),
    ].filter(Boolean);
    // BUILD 273 — the keyed extension (never rendered in 01, read by 03/05/06).
    put('dau', prev?.analytics?.dau, curr?.analytics?.dau);
    put('wau', prev?.analytics?.wau, curr?.analytics?.wau);
    put('mau', prev?.analytics?.mau, curr?.analytics?.mau);
    put('ownFleet', prev?.analytics?.ownFleet?.devices, curr?.analytics?.ownFleet?.devices);
    put('sessions7d', prev?.analytics?.sessions?.last7d, curr?.analytics?.sessions?.last7d);
    put('avgSessionSeconds', prev?.analytics?.avgSessionSeconds, curr?.analytics?.avgSessionSeconds);
    put('inviteIssues24h', prev?.analytics?.inviteIssues?.last24h, curr?.analytics?.inviteIssues?.last24h);
    put('inviteIssues7d', prev?.analytics?.inviteIssues?.last7d, curr?.analytics?.inviteIssues?.last7d);
    put('inviteIssues30d', prev?.analytics?.inviteIssues?.last30d, curr?.analytics?.inviteIssues?.last30d);
    put('shares30d', prev?.analytics?.shares?.total30d, curr?.analytics?.shares?.total30d);
    put('invites30d', prev?.analytics?.inviteFunnel?.invites30d, curr?.analytics?.inviteFunnel?.invites30d);
    for (const k of Object.keys(curr?.analytics?.activation || {})) {
      put('activation.' + k, prev?.analytics?.activation?.[k], curr?.analytics?.activation?.[k]);
    }
    for (const e of curr?.analytics?.topEvents || []) {
      const matched = (prev?.analytics?.topEvents || []).find((x: any) => x?._id === e?._id);
      put('event.' + e?._id, matched?.count, e?.count);
    }
    return { items: items.length ? items : [], map };
  }

  /* 2026-08-29 BUILD 149: pairs the top regions with the top app languages
   * into one compact table for the portal — aggregate locale signals only. */
  localeRows(): Array<{ region: string; regionDevices: number; lang: string; langDevices: number }> {
    const loc = (this.investorStats as any)?.analytics?.locales;
    if (!loc) return [];
    const regions = (loc.topRegions || []).slice(0, 5);
    const langs = (loc.appLanguages || []).slice(0, 5);
    const len = Math.max(regions.length, langs.length);
    const rows: Array<{ region: string; regionDevices: number; lang: string; langDevices: number }> = [];
    for (let i = 0; i < len; i++) {
      rows.push({
        region: regions[i]?.region || '',
        regionDevices: regions[i]?.devices ?? 0,
        lang: langs[i]?.lang || '',
        langDevices: langs[i]?.devices ?? 0,
      });
    }
    return rows;
  }

  /** 2026-08-29 BUILD 152 (founder: "have comparative reporting to compare in
   *  Investors"): which share voice converts — sends vs invites vs funnel. */
  voiceRows(): Array<{ voice: string; sends: number; invites: number; landed: number; accepted: number }> {
    const shares = (this.investorStats as any)?.analytics?.shares;
    if (!shares) return [];
    const funnel: Record<string, any> = {};
    for (const f of shares.funnelByVoice || []) funnel[f.voice] = f;
    const sends: Record<string, number> = {};
    for (const v of shares.byVoice || []) sends[v.voice] = v.count;
    const voices = new Set<string>([...Object.keys(sends), ...Object.keys(funnel)]);
    return Array.from(voices).sort().map((voice) => ({
      voice,
      sends: sends[voice] || 0,
      invites: funnel[voice]?.invites ?? 0,
      landed: funnel[voice]?.landed ?? 0,
      accepted: funnel[voice]?.accepted ?? 0,
    }));
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

  // 2026-09-14 BUILD 190: hourLabel/keysCount/formatTime/openTranslationReview/
  // barWidth MOVED with their sections into command-center/ (the Command
  // Center component carries its own copies) — no dead helpers here.

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
    attachPasswordPeek(alert); // 2026-08-28 BUILD 125: view on/off
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
    attachPasswordPeek(alert); // 2026-08-28 BUILD 125: view on/off
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
              // 2026-09-14 BUILD 191 THE SESSIONAL APERTURE: a successful
              // unlock raises the RolodexPage's aperture icon for THIS session
              // (in-memory only — a fresh app start re-locks it).
              this.investorGate.unlock();
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
