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

  // 2026-09-15 BUILD 214 THE DEVICE CATCHER: the noise-list builder — tick the
  // devices that are yours or your testers', copy the env line for the droplet.
  noiseSelected = new Set<string>();
  noiseCopied = false;

  // 2026-09-20 APP 276 / SERVER 97 THE LAST THREE: which recent devices are
  // tapped open (component-local — the server payload stays pure).
  recentOpen = new Set<string>();

  toggleRecent(id: string): void {
    if (this.recentOpen.has(id)) this.recentOpen.delete(id);
    else this.recentOpen.add(id);
  }

  toggleNoise(id: string): void {
    if (this.noiseSelected.has(id)) this.noiseSelected.delete(id);
    else this.noiseSelected.add(id);
  }

  /** rolodex-<random><ts> is long — head + tail keeps rows single-line. */
  shortId(id: string): string {
    return String(id || '').length > 22 ? `${String(id).slice(0, 14)}…${String(id).slice(-6)}` : String(id || '');
  }

  /** 2026-09-24 BUILD 327: the inbox row's last-line preview. */
  shortLast(msgs: Array<{ from: string; text: string }>): string {
    const last = msgs?.[msgs.length - 1];
    if (!last) return '—';
    const t = String(last.text || '');
    return t.length > 60 ? t.slice(0, 60) + '…' : t;
  }

  seenLabel(ts: any): string {
    // 2026-09-20 BUILD 290 THE NaN FIX (founder: "last seen NaNd ago"): the
    // server sends ISO STRINGS — string minus number is NaN. Parse first.
    if (!ts) return '—';
    const ms = new Date(ts).getTime();
    if (!Number.isFinite(ms)) return '—';
    const days = Math.floor((Date.now() - ms) / 86_400_000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  }

  // 2026-09-20 BUILD 290 THE WRITE COMMAND (founder: "why must I copy and
  // paste it to .env when a command should do it. Write it into the .env."):
  // one tap — the server registers the devices in its noise file AND writes
  // the .env line itself; the meters exclude immediately, no restart. The
  // admin key is asked once and held for the session.
  noiseWriting = false;
  noiseWritten = '';
  private noiseAdminKey: string | null = null;

  async writeNoiseEnv(): Promise<void> {
    const ids = [...this.noiseSelected];
    if (!ids.length || this.noiseWriting) return;
    if (!this.noiseAdminKey) {
      // 2026-09-20 BUILD 293 THE ONE KEY (founder: the admin key and the
      // portal word are "completely different" — the portal word is a
      // device-local gate, never an admin credential): the write takes the
      // server's TESTER_ADMIN_KEY, gated server-side through config.
      // BUILD 311: trim — a pasted trailing space must not 401.
      const key = (window.prompt('Admin key — the server\'s TESTER_ADMIN_KEY (asked once this session)', '') || '').trim();
      if (!key) return;
      this.noiseAdminKey = key;
    }
    this.noiseWriting = true;
    try {
      const res = await this.network.safeFetch(`${environment.rolodexApiBase}/ownfleet/noise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: this.noiseAdminKey, deviceIds: ids }),
      });
      if (res && res.ok) {
        this.noiseWritten = `${ids.length} device(s) written to the server's .env — excluded immediately`;
      } else if (res && res.status === 401) {
        this.noiseAdminKey = null;
        this.noiseWritten = 'Admin key rejected — it must equal the server\'s TESTER_ADMIN_KEY';
      } else if (res && res.status === 404) {
        // 2026-09-20 BUILD 293: a 404 means the RUNNING server predates the
        // write endpoint — deploy server build 106 first.
        this.noiseWritten = 'The server does not know this command yet — deploy server build 106, then try again';
      } else if (res && (res.status === 500 || res.status === 400)) {
        // The server's own words — a missing gate config names the env vars.
        try {
          const body = await res.json();
          this.noiseWritten = body?.error || `The write did not land (HTTP ${res.status})`;
        } catch {
          this.noiseWritten = `The write did not land (HTTP ${res.status})`;
        }
      } else {
        this.noiseWritten = `The write did not land (HTTP ${res?.status ?? '?'}) — try again`;
      }
    } catch {
      this.noiseWritten = 'Offline — the write needs a connection';
    } finally {
      this.noiseWriting = false;
      setTimeout(() => { this.noiseWritten = ''; }, 4200);
    }
  }

  constructor(
    private readonly modalController: ModalController,
    private readonly time: TimeNormalizerService,
    private readonly network: NetworkService,
  ) {}

  /** ══ 2026-09-24 BUILD 327 THE TESTER CHANNEL — the founder's inbox ══
   *  (server 128): every tester thread (features, bugs, suggestions), the
   *  reply door per thread. TESTER_ADMIN_KEY gated, asked once this session
   *  (the same key the write command holds). */
  tcThreads: Array<{ chatId: string; deviceId: string; msgs: Array<{ from: string; text: string; at: string }> }> = [];
  tcOpen = new Set<string>();
  tcReplyFor = '';
  tcReplyText = '';
  tcStatus = '';
  private tcKey: string | null = null;

  async loadTcInbox(): Promise<void> {
    if (!this.tcKey) {
      const key = (window.prompt('Admin key — the server\'s TESTER_ADMIN_KEY (asked once this session)', '') || '').trim();
      if (!key) return;
      this.tcKey = key;
    }
    try {
      const res = await this.network.safeFetch(`${environment.rolodexApiBase}/tester-chat/inbox?key=${encodeURIComponent(this.tcKey)}`);
      if (res && res.ok) {
        const j = await res.json().catch(() => null);
        this.tcThreads = Array.isArray(j?.threads) ? j.threads : [];
        this.tcStatus = this.tcThreads.length ? '' : 'No tester reports yet.';
      } else if (res && res.status === 401) {
        this.tcKey = null;
        this.tcStatus = 'Admin key rejected.';
      } else if (res && res.status === 404) {
        this.tcStatus = 'The server does not know the inbox yet — deploy server build 128.';
      } else {
        this.tcStatus = 'The inbox did not load — try again.';
      }
    } catch {
      this.tcStatus = 'Offline — the inbox needs a connection.';
    }
  }

  tcToggle(chatId: string): void {
    if (this.tcOpen.has(chatId)) this.tcOpen.delete(chatId);
    else this.tcOpen.add(chatId);
  }

  async tcSendReply(chatId: string): Promise<void> {
    const text = this.tcReplyText.trim();
    if (!text || !this.tcKey) return;
    try {
      const res = await this.network.safeFetch(`${environment.rolodexApiBase}/tester-chat/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: this.tcKey, chatId, text }),
      });
      if (res && res.ok) {
        const j = await res.json().catch(() => null);
        const th = this.tcThreads.find((t) => t.chatId === chatId);
        if (th && Array.isArray(j?.msgs)) th.msgs = j.msgs;
        this.tcReplyFor = '';
        this.tcReplyText = '';
        this.tcStatus = 'Reply sent — it reaches the tester on their next read.';
      } else if (res && res.status === 401) {
        this.tcKey = null;
        this.tcStatus = 'Admin key rejected.';
      } else {
        this.tcStatus = `The reply did not land (HTTP ${res?.status ?? '?'})`;
      }
    } catch {
      this.tcStatus = 'Offline — the reply needs a connection.';
    }
    setTimeout(() => { this.tcStatus = ''; }, 4200);
  }

  ngOnInit(): void {
    void this.ensureStats();
  }

  /** The view path re-runs on every open — refresh the console each time. */
  ngOnChanges(): void {
    void this.ensureStats();
  }

  /**
   * BUILD 273 THE CONSOLE UNSTUCK (founder: the Command Center "does not
   * act normal, does not scroll, or show all its content, and is static"):
   * the STATIC half is fixed here — a refresh icon in the console's own
   * header forces a fresh /investor/summary no matter which host supplied
   * the first stats (portal binding or self-fetch). The console is no
   * longer a prisoner of whatever data it was born with.
   */
  async refresh(): Promise<void> {
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

  /**
   * BUILD 191: the aperture path arrives with no [stats] — fetch the summary
   * directly (same endpoint the portal reads; quiet via safeFetch).
   * 2026-09-23 BUILD 314 REFRESH ON ENTRY (founder: the console "no longer
   * reflects changes on entry ... percentages persist between last entry/
   * sessions"): a pre-bound [stats] is whatever the portal fetched HOURS ago
   * — opening the console must fetch the CURRENT record, not short-circuit
   * on the birth gift. The header's refresh icon stays for in-session
   * refreshes.
   */
  private async ensureStats(): Promise<void> {
    await this.refresh();
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
