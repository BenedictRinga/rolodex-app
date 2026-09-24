import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { AlertController, ModalController, ActionSheetController, IonContent } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SecurityService } from '../services/security/security.service';
import { SoundService } from '../services/sound/sound.service';
import { ContactInfo } from '../models/contacts';
import { ContactsSyncService } from '../services/contacts-sync/contacts-sync.service';
import { FollowUpEngine } from '../services/followup-engine/followup-engine.service';
import { RelationshipMonitorService, RelationshipScore } from '../services/relationship-monitor/relationship-monitor.service';
import { BirthdayReminderService } from '../services/birthday-reminder/birthday-reminder.service';
import { CloudSyncService } from '../services/cloud-sync/cloud-sync.service';
import { EventService, CalendarEvent } from '../services/event/event.service';
import { AlertsService } from '../services/alerts/alerts.service';
import { RolodexSyncService } from '../services/rolodex-sync/rolodex-sync.service';
import { SocketChatService } from '../services/socket-chat/socket-chat.service';
import { CardChatService } from '../services/card-chat/card-chat.service';
import { CalendarService } from '../services/calendar/calendar.service';
import { HelpModalComponent } from '../components/help-modal/help-modal.component';
import { PrivacySettingsModalComponent } from '../components/privacy-settings-modal/privacy-settings-modal.component';
import { ContactSurfaceModalComponent } from '../components/contact-surface-modal/contact-surface-modal.component';
import { ContactCardComponent } from '../components/contact-card/contact-card.component';
import { RolodexComponent } from '../components/rolodex/rolodex.component';
import { RemindersModalComponent } from '../components/reminders-modal/reminders-modal.component';
import { SearchModalComponent } from '../components/search-modal/search-modal.component';
import { WelcomeModalComponent, WELCOME_DISMISSED_KEY } from '../components/welcome-modal/welcome-modal.component';
import { ChatWithRolodexModalComponent } from '../components/chat-with-rolodex/chat-with-rolodex.component';
import { ConfidanteComposerModalComponent } from '../components/confidante-composer-modal/confidante-composer-modal.component';
import { InviteLandingComponent } from '../components/invite-landing/invite-landing.component';
import { InviteService } from '../services/invite/invite.service';
import { DraftEngineService } from '../services/draft-engine/draft-engine.service';
import type { CloudProvider } from '../services/cloud-sync/sync.types';
import { mockContacts, shuffledMockContacts } from '../data/mock-contacts';
import { StorageService } from '../services/storage/storage.service';
import { ChatIdService } from '../services/chat-id/chat-id.service';
import { WriteAuthService } from '../services/write-auth/write-auth.service';
import { InvestorGateService } from '../services/investor-gate/investor-gate.service';
import { AnalyticsService } from '../services/analytics/analytics.service';
import { AssistantCardService, AssistantCardUpdate } from '../services/assistant-card/assistant-card.service';
import { environment } from 'src/environments/environment';
// 2026-08-28 BUILD 125: view on/off for every password/passphrase alert input.
import { attachPasswordPeek } from '../services/alerts/alert-peek';
import { capSentences } from '../util/cap';
import { Subscription } from 'rxjs'; // BUILD 143: nudge-tap channel handles
// 2026-08-29 BUILD 143 (founder #2): tapped nudges escalate into Loops.
import { KeeperAgentService } from '../services/agents/keeper-agent.service';
import { InAppNotificationService } from '../services/in-app-notification/in-app-notification.service';
import { LoopInboxComponent } from '../components/loop-inbox/loop-inbox.component';
import { SendWalkComponent } from '../components/send-walk/send-walk.component';
// 2026-09-22 BUILD 299 THE SUNNY DAY: the full page that follows a user's
// drop - the quiet after the drop; the armed logo at base returns, and the
// tap is the user's own act (never a timer, never the app dragging them back).
import { SunnyDayComponent } from '../components/sunny-day/sunny-day.component';
// 2026-09-14 BUILD 199 THE ACHIEVEMENT SHARE + THE TRIAL STITCH: the dock's
// celebration tap and the trial-end stitch both open the share sheet.
import { ShareAppModalComponent } from '../components/share-app-modal/share-app-modal.component';
// 2026-09-16 BUILD 237 THE CHECK-INS PANEL: the escalator list on demand.
import { CheckinsPanelComponent } from '../components/checkins-panel/checkins-panel.component';
// 2026-09-15 BUILD 206 MANAGING CARDS: the first add attempt passes through it.
import { ManagingCardsModalComponent } from '../components/managing-cards-modal/managing-cards-modal.component';
// 2026-08-30 BUILD 155 (founder: demo contacts must be excluded from every process when Demo is off).
import { LoopsService, Loop } from '../services/loops/loops.service';
import { UpdatesService } from '../services/updates/updates.service';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  /** 2026-08-19 HELP DEMO: direct access to rolodex view/settings navigation. */
  @ViewChild('rolodex') rolodexComp?: RolodexComponent;
  @ViewChild('chatThread') chatThread?: ElementRef<HTMLDivElement>;
  /** 2026-08-29 BUILD 143 (founder #2): the inbox instance — tapped nudges
   *  escalate THROUGH it (armed loop + destination pill + open Loops tab).
   *  2026-09-17 BUILD 247 THE INBOX ATTACH HOOK (the founder-approved fix for
   *  the stranded-escalation diagnosis): the inbox's ATTACHMENT is the
   *  delivery trigger — no timers, no lost signals. The diagnosis measured
   *  the strand: inboxReady (the child's ngAfterViewInit) fires BEFORE this
   *  plain @ViewChild property populated, so deliverPendingEscalation saw a
   *  null inboxRef and the held payload never had a second trigger. As a
   *  SETTER, the reference's attach moment IS the consume moment: whatever
   *  is held is delivered the instant the inbox exists. Idempotent with the
   *  inboxReady path — the pending slot clears on first delivery. */
  private _inboxRef: LoopInboxComponent | null = null;
  @ViewChild('inboxRef') set inboxRef(v: LoopInboxComponent | null) {
    this._inboxRef = v;
    if (v) this.deliverPendingEscalation();
  }
  get inboxRef(): LoopInboxComponent | null { return this._inboxRef; }
  /** BUILD 310: the walk cloned onto the blank page. The setter is the
   *  boot — the dialog opens the moment the blank page mounts it. */
  private _ftWalk: SendWalkComponent | null = null;
  @ViewChild('ftWalk') set ftWalkRef(v: SendWalkComponent | null) {
    this._ftWalk = v;
    // After the walk's own init, so the dialog open is not eaten by it
    // and does not trip a view-check error.
    if (v) setTimeout(() => this.runFtBoot(), 0);
  }
  /** 2026-08-30 BUILD 153 (founder): a tapped nudge takes the viewport — the
   *  home scroller is pulled to the top so the opened inbox leads the screen,
   *  whatever scroll position or view (Settings included) the user was in. */
  @ViewChild('homeContent') homeContent?: IonContent;

  contacts: ContactInfo[] = [];
  displayedContacts: ContactInfo[] = [];
  sortedContacts: ContactInfo[] = [];
  searchQuery: string = '';
  autoSortStarted: boolean = false;
  selectedFilter: string = 'all';
  selectedGroup: string = 'all';
  mockEnabled: boolean = true;
  /** 2026-09-01 BUILD 178 (founder: in-template ion-modal, the Zyppar
   *  pattern): the manual create form is DECLARED in the home template and
   *  raised by this flag - the sheet's "I'll type one in" never fights the
   *  ModalController again. */
  manualAddOpen = false;
  manualDraft: ContactInfo = {} as ContactInfo;
  /** 2026-09-16 BUILD 228 PHASE B: what the manual create form builds — the
   *  walk's New Task door raises it as a TASK card, every other door as a
   *  person. Bound to the create modal as [createKind]. */
  manualKind: 'person' | 'task' = 'person';
  loading: boolean = false;
  /** 2026-08-21 OPENLOOP CHAT: the AI Assistant above the deck — the first face. */
  rolodexAiChatOpen = true;
  /** 2026-08-29 BUILD 145 (founder): true while the inbox shell is expanded —
   *  the deck's View toolbar sits up as a footer for the duration. */
  inboxExpanded = false;
  /** 2026-09-16 BUILD 236 THE MOUNT CONTRACT: an escalation whose inbox has
   *  not mounted yet is HELD here and delivered on the inbox's inboxReady
   *  signal — no fixed timers, no silent drops.
   *  2026-09-17 BUILD 244 THE DETERMINISTIC PAYLOAD (founder: "Rather than be
   *  hostage to time, adopt deterministic coding"): the payload carries the
   *  CONTACT and the LOOP OBJECT resolved ONCE here, at the tap — everything
   *  downstream (inbox hold, walk arm) consumes data, never re-resolves ids
   *  against a cache whose hydration timing could change the outcome. */
  private pendingEscalation: { contact: any; loop?: Loop | null } | null = null;
  /** 2026-08-26 SETTINGS/INBOX SWAP: remember the Inbox was open so it can be
   *  restored the moment Settings closes. */
  private inboxWasOpenBeforeSettings = false;
  rolodexAiBusy = false;
  rolodexAiTyping = false;
  rolodexAiInput = '';
  rolodexAiMessages: { from: 'user' | 'assistant'; text: string }[] = [
    { from: 'assistant', text: 'Hello — who\'s the one you keep meaning to text?' },
  ];
  /** 2026-08-19 HEADER: alternates with the live pulse + AI Assistant label. */
  headerLine = 'One loop at a time.';
  private headerTimer: ReturnType<typeof setInterval> | null = null;
  /** 2026-09-14 BUILD 195 THE UPDATE BANNER: state + lifecycle. */
  private updateBannerTimer: ReturnType<typeof setInterval> | null = null;
  get updateBannerVisible(): boolean { return this.updates.bannerAvailable; }
  async applyUpdateBanner(): Promise<void> { await this.updates.applyBanner(); }
  async dismissUpdateBanner(ev?: Event): Promise<void> {
    ev?.stopPropagation();
    await this.updates.dismissBanner();
  }
  groups: { id: string; name: string }[] = [
    { id: 'all', name: 'All Contacts' },
    { id: 'family', name: 'Family' },
    { id: 'business', name: 'Business' },
    { id: 'friends', name: 'Friends' },
  ];
  selectedLanguage: string = 'en';
  selectedFontSize: string = 'medium';

  // Automation state
  relationshipScores: RelationshipScore[] = [];
  followUpOverdue: ContactInfo[] = [];
  followUpReport: { scheduled: number; skipped: number; overdue: ContactInfo[] } | null = null;
  upcomingBirthdays: Array<{ name: string; date: Date; daysAway: number }> = [];

  // Cloud sync state
  syncProviders: CloudProvider[] = [];
  syncProviderName: string | null = null;
  syncConnected: boolean = false;

  // 2026-08-16 STORAGE LOCATION (B2B-style three-way choice) + demo room:
  // 'device' | 'cloud' | 'rolodex-server' — where the user keeps contacts.
  storageLocation: 'device' | 'cloud' | 'rolodex-server' = 'device';
  demoRoom: string = '';
  // 2026-08-27 FOUNDER COLLAPSE: the whole storage panel (tabs + panes) hides
  // behind a top-right storage icon — first sight is the LoopKeeper Inbox,
  // not three panels. Ephemeral by design: every fresh session starts
  // collapsed; Settings → Cloud Sync may open it temporarily.
  storagePanelOpen: boolean = false;
  // 2026-08-18 AI LIVE LIGHT: always green (on-device engine is always ready),
  // but the label tells whether DeepSeek is live on the server too.
  aiLive = true;
  aiLiveLabel = 'AI ready';
  private aiNudgeShownFor = 0;
  syncHasPassphrase: boolean = false;
  syncLastPushed: string | null = null;
  syncLastPulled: string | null = null;
  syncBusy: boolean = false;

  // 2026-08-27 HONEST STORAGE TABS: the LoopKeeper Server pane shows REAL
  // state - the same consent the Settings toggle writes, the device's sync
  // slot, and evidence-backed last push/pull times (persisted, never faked).
  serverSyncEnabled: boolean = false;
  serverDeviceId: string = '';
  serverLastPushed: string | null = null;
  serverLastPulled: string | null = null;
  serverBusy: boolean = false;
  // BUILD 262: the Server pane's consent step points at Settings like the
  // Cloud pane does; it starts not-done and the pane is replaced wholesale
  // once consent exists.
  backendSyncConsentSeen: boolean = false;

  constructor(
    private contactsSyncService: ContactsSyncService,
    private followUpEngine: FollowUpEngine,
    private relationshipMonitor: RelationshipMonitorService,
    private birthdayReminder: BirthdayReminderService,
    private cloudSync: CloudSyncService,
    private eventService: EventService,
    private alertsService: AlertsService,
    private rolodexSync: RolodexSyncService,
    private modalController: ModalController,
    private alertController: AlertController,
    private actionSheet: ActionSheetController,
    // 2026-08-27 CHOICE-FIRST CALENDAR: received invites ask before pushing.
    private translate: TranslateService,
    private socketChat: SocketChatService,
    private draftEngine: DraftEngineService,
    private inviteService: InviteService,
    private cardChat: CardChatService,
    private readonly storageService: StorageService,
    private readonly chatIdService: ChatIdService,
    private readonly writeAuth: WriteAuthService,
    private readonly investorGate: InvestorGateService,
    private readonly security: SecurityService,
    private readonly assistantCard: AssistantCardService,
    private readonly sound: SoundService,
    private readonly analytics: AnalyticsService,
    // 2026-08-27 CALENDAR SYNC: received appointment invites write through
    // to the device calendar too (appointment$ had NO consumers before —
    // invites only toasted, never landed on the card or calendar).
    private readonly calendar: CalendarService,
    // 2026-08-29 BUILD 143 (founder #2): tapped nudges escalate into Loops —
    // the page creates the loop on the user's behalf and arms the capture.
    private keeper: KeeperAgentService,
    private inAppNotifications: InAppNotificationService,
    // 2026-08-30 BUILD 155: demo-fed loops are purged when Demo turns off.
    private readonly loops: LoopsService,
    private readonly updates: UpdatesService, // BUILD 195: the home update banner
    ) {
    // 2026-08-16: after a Stripe checkout return, grant the plan.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('checkout') === 'success') {
        const plan = url.searchParams.get('plan');
        if (plan === 'basic' || plan === 'confidante') this.draftEngine.setPlan(plan);
        this.analytics.track('billing_succeeded', { plan: plan || 'unknown', gateway: url.searchParams.get('gateway') || '' });
      }
    } catch { /* ignore */ }
  }

  /** 2026-08-16 WELCOME AGAIN: demos Rolodex on init unless turned off
   *  (Settings > Welcome Again > Stop, or 'Don't show this again' inside).
   *  2026-08-17: 'Start exploring' in the demo hands off to the live tour.
   *  2026-09-15 BUILD 210 THE WALK-FIRST ORDER (founder's word on Grok's
   *  Walk-vs-Welcome overview): splash -> walk. The walk IS the home's front
   *  surface by default (loopsSurface 'walk'), so on the FIRST open the tour
   *  is DEFERRED — the deed is the first screen and the boot reveal begins
   *  immediately. The six-slide tour is then offered ONCE, on the second
   *  open (lk_open_count + lk_welcome_offered) — never auto-nagged again;
   *  Settings -> Welcome Again replays it on demand. The show boolean (208)
   *  still drives the reveal for every caller. */
  async presentWelcome(isReplay = false): Promise<boolean> {
    try {
      const dismissed = await this.storageService.get<string>(WELCOME_DISMISSED_KEY);
      if (dismissed) {
        // BUILD 207/208: no Welcome this session — the Inbox boot reveal
        // begins right away.
        this.inboxRef?.beginReveal();
        return false; // 2026-08-18 IndexedDB
      }
      // 2026-09-20 BUILD 279 THE REDUNDANT LECTURE, RETIRED (founder: "You
      // mistakenly reinjected the Welcome modal/slides. If our current work
      // is efficient, that becomes redundant"): the first-minute panel IS
      // the welcome now — the six-slide modal NEVER auto-opens again. The
      // Settings replay door stays (an explicit choice, never an injection);
      // isReplay only reaches here through Settings → Welcome Again.
      if (!isReplay) {
        this.inboxRef?.beginReveal();
        setTimeout(() => this.inboxRef?.beginReveal(), 1500);
        return false;
      }
      const modal = await this.modalController.create({
        component: WelcomeModalComponent,
        componentProps: { isReplay },
        cssClass: 'card-chat-modal-sheet',
        breakpoints: [0, 0.7, 0.95, 1],
        initialBreakpoint: 0.95,
        keyboardClose: false,
      });
      await modal.present();
      const res = await modal.onDidDismiss();
      this.inboxRef?.beginReveal();
      if (res?.role === 'taste') void this.openTasteFlow();
      else if (res?.role === 'start') void this.openHelp();
      return true;
    } catch {
      this.inboxRef?.beginReveal();
      return false;
    }
  }

  // ═══ 2026-09-20 BUILD 278 THE FIRST MINUTE, IN THE FLOW ══════════════════
  // HOW WE KNOW IT IS A FIRST-TIMER — storage is the truth (266/267): the
  // flag arms ONLY when the device holds ZERO real cards and ZERO open loops
  // (a wiped device via Exiting LoopKeeper qualifies by construction). One
  // real deed disarms it forever; a loaded device never sees it.
  // THE TRANSITION, WITHOUT REGRESSION — the first-minute panel lives INSIDE
  // the walk's slide 1 (send-walk [firstMinute]); the ambience is the regular
  // one byte-for-byte. At the first deed (contactsDirty from either the 257
  // task draft or the device-pick card), the panel vanishes, the flag flips
  // to done, and the per-device demo deck retires — the walk is armed with
  // THEIR card. There is no skip door by design (the founder's "Finito").
  firstMinuteActive = false;
  /** BUILD 279: the demo view is open — the lower sections (the LoopKeeper
   *  icon panel + the deck) hide so the Inbox takes the full screen. */
  firstMinuteDemo = false;
  /** BUILD 279b: the real-card count baseline — an ARRIVAL above it flips
   *  the demo off, persisted (the founder's demo default). */
  private lastRealCount: number | null = null;
  /** BUILD 278: a panel door was tapped — the panel retires; the deed's
   *  contactsDirty then flips the done flag and retires the demo deck. */
  private firstMinuteTapped = false;
  private firstMinuteRetired = false;
  /** 2026-09-22 BUILD 308 THE TWO PHASES (founder, restating the settled
   *  laws after 307's sweeping drift): the first-timer UX has TWO phases.
   *  PHASE RING — the two avoidance doors, sealed, on EVERY visit until the
   *  user taps one AND continues (no matter how often they come back).
   *  PHASE PANEL — the original first view (the welcome title, TASK ||
   *  PERSON, Show me first) INTACT, reached only when the ring has been
   *  surmounted. The flags as agreed: lk_cover_engaged (the ring
   *  surmounted — tap and continue), lk_firstminute_done (the panel's deed
   *  done — the regular walk). The 297 return nullifies a bare tap — the
   *  user is back at the ring as if never past the gate. */
  fmPhase: 'ring' | 'panel' = 'ring';

  // ── 2026-09-22 BUILD 309 THE FIRST-TIMER CANVAS (founder): the home page
  //  splits into TWO VIEWS. THE FIRST-TIMER VIEW: a blank slate — the two
  //  gates side by side in the middle, the Welcome below. 'The reply I owe'
  //  transforms the slate to 'From my phone' (with the return arrow); the
  //  pick opens the dialog IN SITU — all the way to success. 'The decision
  //  I keep not making' ditto, straight to the dialog. Once concluded and
  //  the congratulations play, the ORIGINAL panel and the surroundings open
  //  (a first-timer otherwise gets distracted). '' = the not-first-timer
  //  home. */
  /** 'pending' is the boot blank — the full home is not painted while we
   *  learn whether this device is still a first-timer. */
  ftView: '' | 'pending' | 'gates' | 'phone' | 'card' | 'steps' | 'remind' | 'done' | 'flow' = 'pending';
  /** ── 2026-09-23 BUILD 319 THE COCOON LEDGER ── the first-timer journey is
   *  ITS OWN view at Home level (the cocoon), and its analysis is its own
   *  stream: how the visitor responded to the UI, continued or churned, how
   *  long they were there, whether they entered a gate and retracted. Every
   *  ft_* event carries cohort 'ft' — materially separate from the
   *  non-first-timer stream, readable as one funnel in the portal. */
  private ftEnteredAt = 0;
  private ftDwellMs(): number {
    return this.ftEnteredAt ? Date.now() - this.ftEnteredAt : 0;
  }
  private ftLog(event: string, props: Record<string, unknown> = {}): void {
    void this.analytics.track(event, { cohort: 'ft', ...props });
  }
  private ftEnter(view: 'gates' | 'phone' | 'card' | 'flow'): void {
    if (view === 'gates' && !this.ftEnteredAt) this.ftEnteredAt = Date.now();
    this.ftLog('ft_cocoon', { view, dwellMs: this.ftDwellMs() });
  }
  /** Which gate opened the dialog — return walks back one step, not out. */
  private ftPath: 'reply' | 'decide' = 'reply';
  private ftBoot: '' | 'card' | 'later' | 'decide' = '';
  private ftBootContact: any = null;
  /** The first-close share waits until the panel is actually open. */
  private ftSharePending = false;

  /** Back is on every step except the congratulations themselves. */
  get ftShowBack(): boolean {
    // 2026-09-24 BUILD 324: every phased card clip carries its return.
    if (this.ftView === 'phone' || this.ftView === 'card' || this.ftView === 'steps' || this.ftView === 'remind') return true;
    if (this.ftView !== 'flow') return false;
    const w = this._ftWalk;
    if (!w) return true;
    return !(w.step === 5 && (!w.copyAsk || w.copyAnswer === 'left'));
  }

  /** The gates' reply door — the slate transforms to the two phone doors. */
  ftReply(): void { this.ftLog('ft_gate', { gate: 'reply' }); this.ftPath = 'reply'; this.ftView = 'phone'; this.ftEnter('phone'); }

  /** From my phone — stay on this page until a person is actually picked.
   *  Cancelling the picker leaves the two doors standing. */
  ftPhone(): void { this.ftLog('ft_choice', { choice: 'phone' }); void this.addFromPhoneContacts(true); }

  /** I will add later — the owed-reply words, no card, still on the blank page. */
  ftLater(): void { this.ftLog('ft_choice', { choice: 'later' }); this.ftPath = 'reply'; this.openFtFlow('later'); }

  /** 2026-09-24 BUILD 323 THE SECOND TRACK, NOT A DUPLICATION (founder: the
   *  decide gate "should open visitor to a first step - document a goal/task
   *  or whatever, and hand-off for now... the LoopKeeper algo then continues
   *  it later with our 9am track"): the decide door opens the EMPTY TASK
   *  CARD — cloned into this canvas (never exported to a component). */
  ftDecide(): void { this.ftLog('ft_gate', { gate: 'decide' }); this.ftLog('ft_choice', { choice: 'card' }); this.ftPath = 'decide'; this.ftView = 'card'; this.ftEnter('card'); }

  /** 2026-09-24 BUILD 324 THE PHASED SECOND TRACK — state above; the clips:
   *  01c the blank card face + "name it"; 02c the flipped card, one thing at
   *  a time; the two cards (Remind me || I schedule); the flourish. */
  ftCardTitle = '';
  ftCardSteps: string[] = ['', '', ''];
  ftCardStepIdx = 1;
  ftCardDue = '';
  ftCardTime = '09:00';
  // 2026-09-24 BUILD 325 (founder: the calendar needs "a default or option
  // for no frequency - just 'None', to Daily, Weekly, Monthly, Quarterly,
  // Yearly"): None leads, and it is the default — the reminder needs no
  // rhythm to be kept.
  ftCardCadence = 'none';
  ftScheduleOpen = false;
  readonly ftCardCadences: Array<'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'> = ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
  ftCadenceLabel(c: string): string { return this.translate.instant('loopkeeper.task.' + c); }

  /** 01c → 02c: the name is said — the card flips. */
  ftCardOk(): void {
    if (this.ftCardTitle.trim().length < 2) return;
    this.ftLog('ft_choice', { choice: 'named' });
    this.ftView = 'steps';
  }

  /** The card's phase-one commit: the name becomes a thing to do about. */
  ftStepDone(): void {
    if (this.ftCardSteps.slice(0, this.ftCardStepIdx).every((s) => !s.trim())) return;
    this.ftLog('ft_choice', { choice: 'steps', n: this.ftCardStepIdx });
    this.ftView = 'remind';
  }

  /** The hand-off: a REAL deck card (kind task, the steps riding it) + the
   *  loop the 9am algo continues (kind decide, the friction named by the
   *  visitor's own door tap) — then the flourish, then the cocoon opens.
   *  BUILD 325: the loops cache is hydrated FIRST — the cocoon commits can
   *  run before the service ever loaded (the null-unshift crash the founder
   *  hit on Remind me and on I schedule). */
  async ftCardCommit(): Promise<void> {
    const title = this.ftCardTitle.trim();
    if (title.length < 2) return;
    await this.loops.all();
    const steps = this.ftCardSteps.map((s) => s.trim()).filter(Boolean);
    const card: any = {
      contactId: 'task-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: { display: title },
      kind: 'task',
      ...(steps.length ? { steps } : {}),
      task: {
        cadence: this.ftCardCadence,
        ...(this.ftCardDue ? { due: new Date(this.ftCardDue + 'T' + (this.ftCardTime || '09:00') + ':00').getTime() } : {}),
      },
      isMockData: false,
    };
    this.contacts.unshift(card);
    this.onContactsDirty();
    // The hand-off: the loop the 9am algo continues — one open mental tab,
    // already named, the draft standing. QUIET_NUDGE_DAYS decides when it
    // returns; the digest brings ONE loop, never a list.
    const why = this.loops.suggestWhySitting({ kind: 'decide', summary: '', pretext: undefined, lastTouchAt: undefined, createdAt: Date.now() });
    this.loops.create({
      person: title,
      kind: 'decide',
      summary: '',
      stance: 'warm',
      direction: 'mine',
      whySitting: why,
      whySittingSource: 'user' as const,
    });
    void this.analytics.track('task_card_saved', { source: 'ft-cocoon' });
    // The flourish — the same beat the reply earns: one breath, then the
    // cocoon opens to the settled home.
    this.ftView = 'done';
    setTimeout(() => this.onFtConcluded(), 2600);
  }

  /** Remind me — LoopKeeper owns the when; the two cards collapse into the
   *  conclusion. */
  async ftRemindMe(): Promise<void> {
    this.ftLog('ft_choice', { choice: 'remind' });
    this.ftCardDue = '';
    await this.ftCardCommit();
  }

  /** I schedule — the calendar opens on the same view. */
  ftOpenSchedule(): void {
    this.ftLog('ft_choice', { choice: 'schedule' });
    this.ftScheduleOpen = true;
  }

  /** ══ 2026-09-24 BUILD 327 THE TESTER CHANNEL ══ (founder: "a reporting
   *  channel on features, bugs and suggestions... Tapping opens the
   *  CommandCenter's chat Inbox (first open auto-generates its own ChatID).
   *  They can then drop messages to which I or any other CommandCenter
   *  accessed user can reply to. Only users in the array of testers can see
   *  this button or use the service"): the icon rides ONLY for tester
   *  devices (the absorbed testerId tag); the sheet mints the ChatID on
   *  first open, drops reports, and reads HQ's replies home. */
  /* BUILD 332 THE LIVE APERTURE (founder: the icon never showed despite the
   *  Investor unlock, while the CommandCenter aperture did): the flag was a
   *  BOOT-TIME SNAPSHOT in ngOnInit - the portal unlock happens minutes
   *  later and nothing re-runs ngOnInit, so the icon stayed dead all
   *  session. A LIVE GETTER now: the template re-reads it every change
   *  detection, exactly like the CommandCenter's aperture icon. */
  get testerChannelOn(): boolean {
    return this.analytics.getTesterId() > 0 || this.investorGate.unlockedThisSession;
  }
  testerChatOpen = false;
  testerChatLoading = false;
  testerChatMsgs: Array<{ from: string; text: string; at: string }> = [];
  testerChatText = '';
  testerChatId = '';
  private testerChatTimer: any = null;

  formatTime(at: string): string {
    const t = at ? new Date(at) : null;
    if (!t || isNaN(t.getTime())) return '';
    return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async openTesterChat(): Promise<void> {
    if (!this.testerChannelOn) return;
    this.testerChatOpen = true;
    void this.analytics.track('tester_chat_opened');
    try { this.testerChatId = await this.chatIdService.request(); } catch { /* the sheet still opens */ }
    await this.fetchTesterChat();
    // HQ's replies come home while the sheet stands — a gentle 15s read.
    this.testerChatTimer = setInterval(() => void this.fetchTesterChat(), 15000);
  }

  closeTesterChat(): void {
    this.testerChatOpen = false;
    if (this.testerChatTimer) { clearInterval(this.testerChatTimer); this.testerChatTimer = null; }
  }

  private async fetchTesterChat(): Promise<void> {
    if (!this.testerChatId) return;
    this.testerChatLoading = true;
    try {
      const url = `${environment.rolodexApiBase}/tester-chat?deviceId=${encodeURIComponent(this.rolodexSync.getDeviceId())}&chatId=${encodeURIComponent(this.testerChatId)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) this.testerChatMsgs = Array.isArray(j.msgs) ? j.msgs : [];
    } catch { /* the channel is quiet offline */ }
    this.testerChatLoading = false;
  }

  async sendTesterChat(): Promise<void> {
    const text = this.testerChatText.trim();
    if (!text) return;
    // 2026-09-24 BUILD 333 THE MINT-IF-MISSING (the founder's report: the
    // first chat did not go, despite several attempts): a failed ChatID mint
    // left the sheet id-less and every send silently returned. If the id is
    // missing, mint NOW (the service self-heals a stale token) — then send.
    if (!this.testerChatId) {
      try { this.testerChatId = await this.chatIdService.request(); } catch { /* the guard below still applies */ }
    }
    if (!this.testerChatId) return;
    try {
      const res = await fetch(`${environment.rolodexApiBase}/tester-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await this.writeAuth.authHeaders(this.rolodexSync.getDeviceId())) },
        body: JSON.stringify({ deviceId: this.rolodexSync.getDeviceId(), chatId: this.testerChatId, text }),
      });
      if (res.status === 401 || res.status === 403) this.writeAuth.invalidate(this.rolodexSync.getDeviceId());
      const j = await res.json().catch(() => null);
      if (j?.ok && Array.isArray(j.msgs)) {
        this.testerChatMsgs = j.msgs;
        this.testerChatText = '';
        void this.analytics.track('tester_report_sent');
      } else {
        // 2026-09-24 BUILD 334 NO SILENT DROPS (the founder rode three silent
        // 403s before the cause surfaced): a failed report now SAYS so - the
        // server's own words in one quiet toast. The text stays in the field.
        void this.alertsService.showToast(
          'The report did not go — ' + (j?.error || `HTTP ${res.status}`), 4200);
      }
    } catch { /* offline — the report stays in the field */ }
  }

  /** The return arrow. Phone → gates. Dialog → one step back inside the
   *  words, or out to the previous blank page if the words are showing. */
  ftBack(): void {
    if (this.ftView === 'phone') { this.ftLog('ft_retract', { from: 'phone', to: 'gates', dwellMs: this.ftDwellMs() }); this.ftView = 'gates'; return; }
    if (this.ftView === 'card') { this.ftLog('ft_retract', { from: 'card', to: 'gates', dwellMs: this.ftDwellMs() }); this.ftView = 'gates'; return; }
    // 2026-09-24 BUILD 324: every phased clip returns ONE step back.
    if (this.ftView === 'steps') { this.ftLog('ft_retract', { from: 'steps', to: 'card', dwellMs: this.ftDwellMs() }); this.ftView = 'card'; return; }
    if (this.ftView === 'remind') {
      // BUILD 325: the calendar returns to the pair first, the pair to the steps.
      if (this.ftScheduleOpen) { this.ftLog('ft_retract', { from: 'calendar', to: 'remind', dwellMs: this.ftDwellMs() }); this.ftScheduleOpen = false; return; }
      this.ftLog('ft_retract', { from: 'remind', to: 'steps', dwellMs: this.ftDwellMs() });
      this.ftView = 'steps';
      return;
    }
    const w = this._ftWalk;
    if (!w || w.step <= 3) {
      w?.abandonFt();
      this.ftLog('ft_retract', { from: 'flow', to: this.ftPath === 'reply' ? 'phone' : 'gates', dwellMs: this.ftDwellMs() });
      this.onFtDialogReturn();
      return;
    }
    if (w.step === 4 || (w.step === 5 && w.copyAsk && !w.copyAnswer)) {
      w.copyAsk = false;
      w.copyAnswer = '';
      w.backFromTap();
      return;
    }
    this.ftLog('ft_retract', { from: 'flow', to: this.ftPath === 'reply' ? 'phone' : 'gates', dwellMs: this.ftDwellMs() });
    this.onFtDialogReturn();
  }

  /** The walk's own back (from the words) — same landing as the arrow. */
  onFtDialogReturn(): void {
    this.ftView = this.ftPath === 'reply' ? 'phone' : 'gates';
  }

  private openFtFlow(boot: 'card' | 'later' | 'decide', contact?: any): void {
    this.ftBoot = boot;
    this.ftBootContact = contact || null;
    this.ftView = 'flow';
    this.ftEnter('flow');
    if (this._ftWalk) this.runFtBoot();
  }

  private runFtBoot(): void {
    const w = this._ftWalk;
    if (!w || !this.ftBoot) return;
    const boot = this.ftBoot;
    const contact = this.ftBootContact;
    this.ftBoot = '';
    this.ftBootContact = null;
    const bootNow = () => {
      if (boot === 'card' && contact) w.openFtCard(contact);
      else if (boot === 'later') w.openFtLater();
      else if (boot === 'decide') w.selfTap('decide', true);
      // 2026-09-23 BUILD 320 THE FIRST-TAP GUARANTEE: the boot must LAND on
      // the cocoon's first flow entry — a swallowed boot left the dialog
      // blank until reverse-and-repeat. Verify, then one second chance.
      setTimeout(() => {
        if (this._ftWalk === w && (!w.loop || w.step !== 3)) {
          if (boot === 'card' && contact) w.openFtCard(contact);
          else if (boot === 'later') w.openFtLater();
          else if (boot === 'decide') w.selfTap('decide', true);
        }
      }, 180);
    };
    bootNow();
  }

  private async maybeFirstMinute(): Promise<void> {
    try {
      // BUILD 310: the blank page holds until a loop is concluded. A card
      // picked mid-flow must not admit them (lk_ft_open survives the
      // reload). An existing device — real cards, and this canvas was
      // never opened — never sees it. A concluded loop opens the original
      // panel, not the gates.
      const done = await this.storageService.get<boolean>('lk_firstminute_done');
      if (done) { this.ftView = ''; return; }
      const engaged = await this.storageService.get<boolean>('lk_cover_engaged');
      const ftOpen = await this.storageService.get<boolean>('lk_ft_open');
      if (engaged) {
        this.ftView = '';
        this.firstMinuteActive = true;
        this.fmPhase = 'panel';
        void this.storageService.remove('lk_ft_open').catch(() => { /* best effort */ });
        return;
      }
      if (this.realContacts().length > 0 && !ftOpen) { this.ftView = ''; return; }
      this.fmPhase = 'ring';
      this.firstMinuteActive = true;
      this.ftView = 'gates';
      this.ftEnter('gates');
      // 2026-09-23 BUILD 320 THE COCOON QUIET: no loop counts before the
      // first completion — the slot encourages instead (the founder's law).
      this.inAppNotifications.setCocoonQuiet(true, this.translate.instant('loopkeeper.ft.encourage'));
      void this.storageService.set('lk_ft_open', true).catch(() => { /* best effort */ });
      void this.analytics.track('firstminute_shown', { phase: 'gates' });
    } catch { this.ftView = ''; /* the gate must never block the app */ }
  }

  /** BUILD 278/281: a tap on the PANEL phase's doors retires the panel for
   *  THIS VISIT only — the next visit greets with the panel again until a
   *  real deed lands (lk_firstminute_done). */
  onFirstMinuteDeed(): void {
    this.firstMinuteActive = false;
    this.firstMinuteTapped = true;
  }

  /** 2026-09-22 BUILD 295 THE GATE HELD (restored): a real send persists the
   *  engagement — the ring is surmounted and the panel's deed is done; no
   *  reload resurrects either phase. */
  onFirstMinuteEntry(): void {
    // BUILD 310: the send is real, so a reload will not resurrect the gates.
    // The blank page STAYS for the congratulations. The panel opens from
    // onFtConcluded, when that screen has actually played.
    void this.storageService.set('lk_cover_engaged', true).catch(() => { /* best effort */ });
  }

  /** The congratulations have played. Now — and only now — the original
   *  panel and the surroundings. */
  onFtConcluded(): void {
    // BUILD 319: the journey succeeded — the dwell closes as a conclusion.
    this.ftLog('ft_concluded', { dwellMs: this.ftDwellMs() });
    this.ftEnteredAt = 0;
    // BUILD 320: the cocoon opens — the regular track's notifications return,
    // and the first completion is celebrated WITHOUT asking for anything
    // (founder: the share ask after one completed loop is too aggressive,
    // too soon — the congratulations is purely the achievement).
    this.inAppNotifications.setCocoonQuiet(false);
    this.ftSharePending = false;
    this.ftView = '';
    this.firstMinuteActive = true;
    this.fmPhase = 'panel';
    this.firstMinuteTapped = true;
    void this.storageService.set('lk_cover_engaged', true).catch(() => { /* best effort */ });
    void this.storageService.remove('lk_ft_open').catch(() => { /* best effort */ });
  }

  /** 2026-09-20 BUILD 279 CLOSE DEMO (founder: "close demo returns to home
   *  screen (regular now)"): the demo deck retires and the regular home —
   *  empty or real, never demo — is what they see. */
  onExitDemo(): void {
    // BUILD 281: Close demo retires the DEMO DECK (the regular home for this
    // visit) but is NOT engagement — the next visit still greets, until a
    // real card lands (the founder's every-visit rule).
    this.firstMinuteActive = false;
    this.firstMinuteDemo = false;
    this.firstMinuteTapped = true;
    this.mockEnabled = false;
    void this.storageService.set('rolodex_demo_enabled', false).catch(() => { /* best effort */ });
  }
  // 2026-09-20 BUILD 278: onFirstMinuteCaptured/onFirstMinuteSkipped are
  // RETIRED with the veil — the deed flip lives in onContactsDirty (either
  // door's flow lands there). The parked Chat implementation lives in git
  // history (build 276) and returns when the flow's obstacles are measured.

  /** 2026-08-19 THE TASTE: the welcome demo's surprise — a guided real-loop
   *  session in Chat with RolodexAI (situation mode). */
  async openTasteFlow(): Promise<void> {
    const modal = await this.modalController.create({
      component: ChatWithRolodexModalComponent,
      componentProps: { startMode: 'situation' },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95, 1],
      initialBreakpoint: 0.95,
      keyboardClose: false,
    });
    await modal.present();
  }

  /** The Settings 'Show' side of Welcome Again: clear the dismissal + replay. */
  async showWelcomeAgain() {
    try { await this.storageService.remove(WELCOME_DISMISSED_KEY); } catch { /* ignore */ }
    void this.presentWelcome(true).then((shown) => { if (!shown) this.inboxRef?.beginReveal(); });
  }

  /** 2026-08-29 BUILD 143: the invite hand-off hosted the FULL Welcome package.
   *  2026-09-15 BUILD 210 (Grok's sharpest point, founder's word): an invitee
   *  who CONFIRMED has declared intent — the reward is the WALK (the home's
   *  front surface, already mounted with the boot reveal waiting), never the
   *  six-slide lecture. The dismissal key stays untouched, so the tour is
   *  still offered once on their second open. */
  async presentFullWelcome(): Promise<void> {
    this.inboxRef?.beginReveal();
    setTimeout(() => this.inboxRef?.beginReveal(), 1500);
  }

  /** 2026-08-17 THE DROPBOX MOMENT: a shared invite link opened the app. */
  async presentInviteLanding(): Promise<void> {
    try {
      const token = new URLSearchParams(location.search).get('invite');
      if (!token) return;
      const inv = await this.inviteService.fetch(token);
      if (!inv) return;
      // clear the param so a reload doesn't re-show it
      history.replaceState(null, '', location.pathname + location.hash);
      const modal = await this.modalController.create({
        component: InviteLandingComponent,
        componentProps: { invite: inv, token }, // BUILD 152: token rides for the funnel
        cssClass: 'card-chat-modal-sheet',
        breakpoints: [0, 0.7, 0.95],
        initialBreakpoint: 0.95,
        keyboardClose: false,
      });
      await modal.present();
      const res = await modal.onDidDismiss();
      const role = res?.role;
      const picked = res?.data?.picked;
      if (picked?.name) {
        // 2026-08-29 BUILD 152: the funnel's last door — the invitee confirmed
        // they know the sender. Timed against invite_created by token in
        // Investors ("how soon after invite, new users respond").
        try { this.analytics.track('invite_accepted', { token, kind: inv.kind }); } catch { /* analytics optional */ }
        // 2026-08-31 BUILD 159 (founder): their list has begun — once ever.
        void this.analytics.trackListStartedOnce('invite');
        // the WOW: their card is born with the invite already on it
        const appt = inv.kind === 'appointment' ? [{ title: inv.title, when: inv.when, from: inv.from }] : [];
        const c = {
          contactId: 'invite-' + Date.now(),
          name: { display: picked.name, given: String(picked.name).split(' ')[0] || '', middle: '', family: String(picked.name).split(' ').slice(1).join(' ') || '', prefix: '', suffix: '' },
          phoneNumbers: picked.tel ? [{ type: 'mobile' as any, number: picked.tel }] : [],
          emailAddresses: [] as any[],
          image: { base64String: null },
          appointments: appt,
          isMockData: false,
          isContactInfo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          preferences: { refreshContacts: false, notificationPreference: 'email' as any },
        };
        this.contacts = [c as any, ...this.contacts];
        this.onContactsChange(this.contacts);
        if (inv.kind === 'message') {
          const thread = await this.cardChat.seedThread(c as any);
          // 2026-08-27 [object Object] FIX: coerce the invite text — a non-string
          // payload from any server vintage must never seed a thread bubble.
          thread.messages = [...thread.messages, { id: 'inv' + Date.now(), from: 'them', text: String(inv?.text ?? ''), at: new Date().toISOString(), status: 'read' as any }];
          await this.cardChat.saveThread(thread);
        }
        void this.alertsService.showToast(picked.name + "'s card is ready — " + (appt.length ? 'the appointment is on it.' : 'the message is in their thread.'), 5000);
        // 2026-08-29 BUILD 142 → 143 (founder, #1): the CONFIRM tap no longer
        // just drops them on the home deck — the FULL Welcome package takes
        // over immediately (the first-time tour, not the replay variant).
        void this.presentFullWelcome();
      } else if (role === 'get-app') {
        // 2026-08-26: store id follows the brand migration (com.zyppar.loopkeeper).
        window.open('https://play.google.com/store/apps/details?id=com.zyppar.loopkeeper', '_blank');
      } else if (role === 'pick-unavailable') {
        void this.alertsService.showToast('Pick from your phone needs Android Chrome — or add the one person manually.', 4500);
      }
    } catch { /* the invite link may be dead — the app still loads */ }
  }

  async ngOnInit() {
    // 2026-09-23 BUILD 319: the cocoon's churn beacon rides from boot — it
    // only ever speaks while the cocoon stands.
    this.bindFtHidden();
    // 2026-09-24 BUILD 327 THE TESTER CHANNEL: the icon rides ONLY for the
    // roster — the absorbed testerId tag is the array membership proof.
    // (BUILD 332: the assignment moved OUT of ngOnInit — it was a boot-time
    // snapshot, so a same-session Investor unlock never reached it. The
    // template now reads the LIVE getter testerChannelOn above.)
    // 2026-09-20 BUILD 279b THE WIPE VERIFICATION PASS (founder: "this time,
    // we are stuck in a 7 minutes wait"): if a wipe left its pending mark,
    // the fresh boot FINISHES the job — clear everything again (one capped
    // retry) and reload — before a single byte of old state can resurrect.
    void this.finishPendingWipe();
    // 2026-08-18 THE APP LOCK: gate the app for the authorized user.
    void this.enforceAppLock();
    // 2026-08-19 THE 7-DAY TRIAL: first use starts it on the client too (the
    // server starts it on the first sync). One-time; reopenTrial() resets it.
    // 2026-08-26 PRE-RELEASE: expired trials auto-renew with a visible thanks.
    await this.draftEngine.ensureTrial();
    if (this.draftEngine.consumePreReleaseRenewal()) {
      void this.alertsService.showToast('Thank you for supporting LoopKeeper during pre-release — your 7-day trial has been renewed.', 5200);
    }
    // 2026-08-23 ANONYMOUS ANALYTICS: app_launch + session_start + visibility tracking.
    void this.analytics.init();
    // 2026-09-19 BUILD 275 THE FIRST MINUTE: an untouched device (zero real
    // cards, zero loops, never seen/skipped) meets its OWN capture box before
    // anything else — the regular home stays mounted beneath and takes over
    // at the first deed or the skip. Current users never see it.
    void this.maybeFirstMinute().then(() => {
      // 2026-08-17 THE DROPBOX MOMENT: an invite link opened us.
      void this.presentInviteLanding();
      // 2026-08-16 WELCOME AGAIN: the demo tour on init (unless dismissed).
      // 2026-09-22 BUILD 309: the first-timer CANVAS carries its own Welcome
      // line below the gates — the modal is skipped there (one Welcome, not
      // two), and the reveal runs for the walk beneath.
      if (this.ftView) { this.inboxRef?.beginReveal(); }
      else void this.presentWelcome().then((shown) => { if (!shown) this.inboxRef?.beginReveal(); });
    });
    // 2026-08-22 THE ROLODEX THAT REMEMBERS: any send path updates the card on device.
    this.assistantCard.updates$.subscribe((ev) => this.applyAssistantCardUpdate(ev));
    // 2026-09-16 BUILD 216 THE FIRST-CLOSE SHARE BEAT: the first close of any
    // kind invites the user to become the channel (voice E/F, ?src=share).
    this.loops.firstCloseShare.subscribe(() => this.onFirstCloseShare());
    // 2026-09-14 BUILD 195 THE UPDATE BANNER: check now, then every 30 minutes.
    // A tap applies (cache clear + SW unregister + hard reload); the ✕ hides
    // THIS version only — a new deploy re-shows it.
    void this.updates.refreshBanner();
    void this.updates.welcomeBackCheck(); // BUILD 223: the rare welcome-back beat
    this.updateBannerTimer = setInterval(() => { void this.updates.refreshBanner(); }, 30 * 60_000);
    // 2026-08-27 CALENDAR SYNC: a received card-to-card appointment invite
    // lands ON THE CARD (appointments[]) and on the device calendar. This
    // subscription is the only consumer appointment$ ever had — before it,
    // invites arrived, toasted, and evaporated.
    this.cardChat.appointment$.subscribe((inv) => this.landIncomingAppointment(inv));
    // Wire passphrase prompt callback for CloudSyncService
    this.cloudSync.promptPassphrase = () => this.promptForPassphrase();
    this.refreshSyncState();
    // 2026-08-27 HONEST STORAGE TABS: read the real consent + device slot so
    // the Server pane opens truthful, never assumed.
    void this.refreshServerTabState();

    // 2026-08-18 AI LIVE LIGHT + THE AGENT SPEAKS FIRST.
    void this.refreshAiStatus();
    // 2026-08-19 HEADER: "One loop at a time." ↔ "Close the loop."
    this.headerTimer = setInterval(() => {
      this.headerLine = this.headerLine === 'One loop at a time.'
        ? 'Close the loop.'
        : 'One loop at a time.';
    }, 6000);
    this.rolodexSync.welcome$.subscribe((msg) => {
      void this.alertController.create({ header: 'AI Assistant', message: msg, buttons: ['OK'] }).then((a) => a.present());
    });

    // 2026-08-16 STORAGE LOCATION + demo room (persisted).
    try {
      const loc = await this.storageService.get<string>('rolodex_storage'); // 2026-08-18 IndexedDB
      if (loc === 'cloud' || loc === 'rolodex-server' || loc === 'device') this.storageLocation = loc;
      this.demoRoom = this.rolodexSync.room;
    } catch { /* ignore */ }

    // 2026-08-19 DEMO TOGGLE STATE: remember whether the demo deck is shown,
    // so a reload does not silently resurrect demo cards the user stopped.
    try {
      const demo = await this.storageService.get<boolean>('rolodex_demo_enabled');
      if (demo !== null) this.mockEnabled = !!demo;
    } catch { /* default true */ }

    // 2026-08-29 BUILD 143 (founder #2): "Check in with John Doe..." nudges
    // are no longer dead ends. Native system-notification taps and PWA-dock
    // taps both land HERE and escalate into an armed open loop in Loops.
    void this.eventService.wireNativeNotificationTaps();
    this.notifTapSub = this.eventService.notificationTap$.subscribe((extra) => {
      if (extra?.type === 'event' || extra?.action === 'checkin') this.escalateCheckIn(extra);
      // 2026-09-16 BUILD 230/235: the NATIVE MORNING-DIGEST tap (the 9AM
      // loop-wake ping, extra.type loopWake) opens the Loops surface too —
      // it was a dead end like the dock's. (The "Check in with ..." nudges
      // are a DIFFERENT dock item — they ride action 'checkin' above, into
      // escalateCheckIn, which arms the walk with the item as the payload.)
      else if (extra?.type === 'loopWake' || extra?.action === 'loopDigest') this.openLoopsSurface();
    });
    this.dockTapSub = this.inAppNotifications.tapped$.subscribe((n) => {
      if (n?.data?.action === 'checkin') this.escalateCheckIn(n.data);
      // 2026-09-14 BUILD 199: the achievement share tap opens the share sheet.
      if (n?.data?.action === 'shareAchievement') void this.openShareApp();
      // 2026-09-16 BUILD 230/235 THE DIGEST OPENS: the MORNING DIGEST item
      // ("⏰ N loops waiting" — the loop-wake ping) opens the Loops surface —
      // the inbox's Loops tab. It used to be an explicit no-op. NOTE THE
      // DISTINCTION (founder, after we crossed wires): the "Check in with
      // [name/task] (Recurrence #N)" items are a DIFFERENT dock item — the
      // follow-up engine's CHECK-IN NUDGES — and they ride action 'checkin'
      // above into escalateCheckIn, which arms the WALK with that item as
      // the payload — and the walk's CARD becomes that item first (BUILD 242:
      // the selection takes over from the default/current card; the words are
      // one tap away on the card, never skipped over).
      // The dock item still dismisses on tap (its own behavior); the tab
      // does the talking.
      if (n?.data?.action === 'loopDigest') this.openLoopsSurface();
    });

    await this.loadContacts();
    await this.runAutomation();
    // 2026-09-14 BUILD 199 THE TRIAL STITCH (founder: trial exhaustion "should
    // be re-fillable at user's instance"): an expired trial now MEETS the user
    // — the free path (re-fill the 7 days on demand, or invite a friend)
    // instead of the silent pre-release auto-renew.
    if (this.draftEngine.plan !== 'confidante' && this.draftEngine.trialDaysLeft() <= 0) {
      void this.presentTrialStitch();
    }

    // 2026-08-16: when the server is the chosen home, restore the full list
    // from it (fall back to the local list when the server has nothing).
    if (this.storageLocation === 'rolodex-server') {
      const out = await this.rolodexSync.restore();
      if (out.status === 'ok' && out.contacts.length) {
        this.contacts = out.contacts;
        this.loops.mergeRestored(out.loops as any);
        this.loading = false;
        this.rolodexSync.push(this.realContacts(), undefined, this.loops.exportLoops());
      }
    }
  }

  /** 2026-09-23 BUILD 319 THE COCOON CHURN BEACON: when the app hides while the
   *  first-timer cocoon still stands, the visit closes UNCONCLUDED — the
   *  churn candidate. ft_hidden carries the view and the dwell; the portal
   *  reads churn as ft_cocoon/ft_hidden without a later ft_concluded, per
   *  device. The legacy meters never see this stream (cohort 'ft'). */
  private ftHiddenBound = false;
  private bindFtHidden(): void {
    if (this.ftHiddenBound || typeof document === 'undefined') return;
    this.ftHiddenBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.ftView) {
        this.ftLog('ft_hidden', { view: this.ftView, dwellMs: this.ftDwellMs() });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.headerTimer) clearInterval(this.headerTimer);
    if (this.updateBannerTimer) clearInterval(this.updateBannerTimer); // BUILD 195
    // 2026-08-29 BUILD 143: release the nudge-tap channels.
    this.notifTapSub?.unsubscribe();
    this.dockTapSub?.unsubscribe();
    // 2026-09-24 BUILD 327: the tester channel's read timer stands down.
    this.closeTesterChat();
  }

  /** 2026-08-29 BUILD 143 (founder #2): the nudge-tap subscription handles. */
  private notifTapSub: Subscription | null = null;
  private dockTapSub: Subscription | null = null;

  /**
   * 2026-08-29 BUILD 143 (founder #2): the TAPPED NUDGE ESCALATION.
   * "Check in with John Doe..." is tapped → the loop arrives in Loops ALREADY
   * OPEN and ALREADY ARMED with its destination — the pill under the capture
   * box reads "reaching out to John Doe". The user never starts from nothing.
   */
  private escalateCheckIn(extra: { contactId?: string; action?: string; [k: string]: any }): void {
    try {
      // 2026-09-17 BUILD 245 THE UNIFIED RULE (founder: "There are two
      // notifications - the one manually activated from Settings => Check-ins,
      // and that which the app displays involuntarily... either medium, my
      // request is that card is replaced with the item, Settings closed, alert
      // dismissed"): EVERY check-in medium converges HERE, so the rule lives
      // HERE, once. The escalation takes the screen — the notification alert
      // closes WHOLE (the service's own tap() only removed the tapped line;
      // the remaining lines are stale the moment the card takes over). The
      // dock tap, the native notification tap, and the Check-ins panel's live
      // row all ride this one point; the card takeover + the Settings exit
      // follow below (244's deterministic chain + 239's showRegularView).
      this.inAppNotifications.clear();
      // 2026-08-29 BUILD 152 (founder: "good to know what features people
      // respond to"): a tapped nudge is engagement on the feature itself.
      try { this.analytics.track('nudge_tapped', { matched: !!extra?.contactId || !!extra?.['name'] }); } catch { /* analytics optional */ }
      const id = extra?.contactId;
      const contact = (id ? this.contacts.find((c) => c.contactId === id) : null)
        || this.contacts.find((c) => (c.name?.display || '').toLowerCase() === String(extra?.['name'] || '').toLowerCase())
        || null;
      // Create the open loop on the user's behalf — armed with the card when
      // one matches, so it lands on that person's loop with history intact.
      const name = contact?.name?.display || extra?.['name'] || '';
      const sentence = name ? `Check in with ${name}` : 'Check in';
      const envelope = this.keeper.capture(sentence, this.contacts, contact || undefined);
      // 2026-09-17 BUILD 244 THE DETERMINISTIC PAYLOAD: the loop OBJECT is
      // resolved HERE, once, at the tap — capture just created it, so it is
      // in the loops cache with certainty; no downstream step ever re-looks
      // it up against hydration timing (the old chain carried only the id
      // and made the walk re-resolve it at arm time).
      const loop = envelope.ok && envelope.output ? envelope.output : undefined;

      // 2026-08-29 BUILD 151 (founder: "I tap, and it is not evident that
      // anything happens immediately"): the tap now ANSWERS — a chime at the
      // instant of the tap, a toast naming the destination, and after the
      // inbox opens the view travels to the armed loop. Silence was the bug.
      void this.sound.playLoopCapture();
      void this.alertsService.showToast(
        name ? this.translate.instant('loopkeeper.capture.reachingOut', { name }) : 'Loops',
        2600);

      // Open the inbox on the Loops tab, arm the destination, select the loop.
      // 2026-08-30 BUILD 153: the escalation TAKES the screen — it leaves
      // Settings, pulls the home scroller to the top, and opens the inbox.
      // 2026-09-16 BUILD 236 THE MOUNT CONTRACT (founder: "there is a chime
      // now but still panel/modal is not opening"): the old two fixed-timer
      // passes were a race — if the *ngIf'd inbox (or the walk inside it) had
      // not mounted by 800ms, the arm SILENTLY DROPPED: chime played, nothing
      // opened. Now the escalation is HELD (pendingEscalation) and delivered
      // on the inbox's OWN inboxReady signal (its ngAfterViewInit), with an
      // immediate delivery when the inbox is already open. The walk-side hold
      // (pendingNudge in the inbox) covers the deeper mount the same way.
      try { this.rolodexComp?.showRegularView(); } catch { /* deck not mounted */ }
      void this.homeContent?.scrollToTop(0);
      window.scrollTo({ top: 0, behavior: 'auto' }); // native scroller parity
      this.pendingEscalation = { contact: contact || null, loop: loop || undefined };
      this.rolodexAiChatOpen = true;
      this.inboxExpanded = false; // BUILD 161: fresh instance starts collapsed
      this.deliverPendingEscalation();
    } catch { /* a dead nudge is still better than a crash */ }
  }

  /** 2026-09-16 BUILD 236/239: the escalation delivery — called immediately
   *  when the inbox is already open, and again from its inboxReady signal
   *  when it has just mounted. Idempotent: the pending slot clears on
   *  delivery. BUILD 239: delivery goes through the inbox's armEscalation,
   *  which FORCES the walk surface — a session left on the shelf no longer
   *  swallows the item into the default list. BUILD 244: the payload is the
   *  resolved contact + loop OBJECT — data end to end, no re-resolution. */
  private deliverPendingEscalation(): void {
    if (!this.pendingEscalation || !this.inboxRef) return;
    const { contact, loop } = this.pendingEscalation;
    this.pendingEscalation = null;
    this.inboxRef.armEscalation(contact, loop);
    void this.sound.playLoopReady();
  }

  /** 2026-09-16 BUILD 237 THE CHECK-INS PANEL (founder: "I wanted that
   *  escalator list presented at will from within the Settings sections, so I
   *  could then test the tap or just regular use when not wanting to wait for
   *  its scheduled appearance"): the panel IS the dock's list — Escalated now
   *  (live items, the identical tap path) + Coming up (scheduled check-ins,
   *  escalatable NOW). A 'Coming up' tap hands back through the modal's
   *  'escalate' role and runs the SAME escalateCheckIn the dock item runs —
   *  one chain, two entrances, no conflation with the morning digest. */
  async openCheckinsPanel(): Promise<void> {
    try {
      const modal = await this.modalController.create({
        component: CheckinsPanelComponent,
        cssClass: 'checkins-panel-modal',
      });
      await modal.present();
      const res = await modal.onWillDismiss();
      if (res?.role === 'escalate' && (res.data?.contactId || res.data?.name)) {
        this.escalateCheckIn({ action: 'checkin', contactId: res.data.contactId, name: res.data.name });
      }
    } catch { /* the panel is best-effort */ }
  }

  /** 2026-09-14 BUILD 199: open the share sheet (the achievement tap and the
   *  trial stitch's invite door both land here). */
  /** BUILD 216: shareSrc tags the outbound link (?src=settings | share); the
   *  first-close beat pins voice E/F — the secretary lines. */
  private async openShareApp(shareSrc: 'settings' | 'share' = 'settings'): Promise<void> {
    try {
      const modal = await this.modalController.create({
        component: ShareAppModalComponent,
        componentProps: {
          shareSrc,
          voice: shareSrc === 'share' ? (Math.random() < 0.5 ? 'E' : 'F') : undefined,
        },
        cssClass: 'card-chat-modal-sheet',
        breakpoints: [0, 0.7, 0.95, 1],
        initialBreakpoint: 0.95,
      });
      await modal.present();
    } catch { /* best effort */ }
  }

  /** 2026-09-16 BUILD 216: the first close invites the user to become the
   *  channel — the celebration breathes first, then the sheet opens once.
   *  2026-09-23 BUILD 320 THE SHARE STANDS DOWN (founder: "I see in
   *  congratulating them we are already saying they should share the app -
   *  after just one completed loop. That is too aggressive and unnecessary.
   *  Too soon."): the first completion is celebrated purely — the share
   *  lives only where the user CHOOSES it (Settings, the invite doors). */
  private onFirstCloseShare(): void {
    if (this.ftView) return;
  }

  /**
   * 2026-09-14 BUILD 199 THE TRIAL STITCH (founder: trial exhaustion "should
   * be re-fillable at user's instance" — the original /trial/reopen policy,
   * restored as a user-facing door). At expiry the user MEETS the free path:
   * re-fill the 7 days on demand (reopenTrial), or invite a friend. At most
   * once per 48h per expiry, so it waits without nagging.
   */
  private async presentTrialStitch(): Promise<void> {
    try {
      const last = await this.storageService.get<number>('lk_trial_stitch_at');
      if (last && Date.now() - last < 48 * 3600_000) return;
      await this.storageService.set('lk_trial_stitch_at', Date.now());
      const alert = await this.alertController.create({
        header: 'Your full-access week has ended',
        message: 'LoopKeeper stays yours — your people live on your phone. Re-fill your 7 days on demand, or invite a friend to keep theirs warm too.',
        buttons: [
          { text: 'Later', role: 'cancel' },
          {
            text: 'Invite a friend',
            handler: () => { void this.openShareApp(); },
          },
          {
            text: 'Re-fill my 7 days',
            handler: () => {
              void this.draftEngine.reopenTrial().then((ok) => {
                void this.alertsService.showToast(ok ? 'Your 7 days are re-filled — welcome back' : 'Week re-filled on this device', 2800);
              });
            },
          },
        ],
      });
      await alert.present();
    } catch { /* the stitch is best-effort */ }
  }

  /** 2026-08-18 AI LIVE LIGHT: ask the server which engines are configured. */
  async refreshAiStatus(): Promise<void> {
    try {
      const s = await this.draftEngine.aiStatus();
      this.aiLive = s.onDevice || s.deepseekConfigured || s.grokConfigured;
      // 2026-08-18 per owner: the label beside the green glow is just
      // "RolodexAI" - no engine names, no second "live".
      this.aiLiveLabel = 'AI Assistant';
    } catch {
      this.aiLive = true; // on-device engine is always available
      this.aiLiveLabel = 'AI Assistant';
    }
  }

  /** B2B-style storage picker — where the user keeps their contacts.
   *  2026-08-27 HONEST STORAGE TABS: every switch re-reads the real backend
   *  consent + slot so a pane can never show stale truth. */
  async onStorageChange(event: any): Promise<void> {
    const loc = event?.detail?.value as 'device' | 'cloud' | 'rolodex-server';
    if (!loc) return;
    this.storageLocation = loc;
    try { await this.storageService.set('rolodex_storage', loc); } catch { /* ignore */ }
    void this.refreshServerTabState();
    if (loc === 'rolodex-server') {
      const out = await this.rolodexSync.restore();
      if (out.status === 'ok' && out.contacts.length) {
        this.contacts = out.contacts;
        this.loops.mergeRestored(out.loops as any);
        this.loading = false;
        this.rolodexSync.push(this.realContacts(), undefined, this.loops.exportLoops());
      }
    }
  }

  onRoomInput(event: any): void {
    const code = String(event?.detail?.value || '').trim();
    this.rolodexSync.setRoom(code);
    this.rolodexSync.push(this.realContacts());
    // 2026-08-16 SOCKET CHAT: joining the room joins the live chat too.
    if (code) {
      try {
        this.socketChat.connect(code, 'LoopKeeper demo');
      } catch {
        /* live chat is best-effort; the local demo still works */
      }
    }
  }

  // ================================================================
  // 2026-08-16 THE DEMO — help modal: the product explains itself.
  // ================================================================
  async openHelp(): Promise<void> {
    const modal = await this.modalController.create({
      component: HelpModalComponent,
      cssClass: 'help-modal',
      componentProps: {
        onNavigate: (featureId: string) => this.onHelpNavigate(featureId),
      },
    });
    await modal.present();
  }

  /** 2026-08-19 SEARCH: the FAB-launched search sheet over the real deck. */
  async openSearchModal(): Promise<void> {
    // 2026-09-14 BUILD 197 THE TWO-REPOSITORY SEARCH (founder: the search fab
    // should reach the device contacts list too, "much like the add Contact
    // applies to both repositories. Be mindful of any qualifications in the
    // add format, such as permissions"): the sheet now carries the same
    // two tabs as the add sheet, with the SAME qualifications — the picker
    // door only where the Contact Picker API exists, the honest Apple-wall
    // ladder (.vcf + typed) where it doesn't.
    const modal = await this.modalController.create({
      component: SearchModalComponent,
      componentProps: {
        contacts: this.contacts,
        deviceSearch: true,
        pickerAvailable: !!((navigator as any)?.contacts?.select),
      },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95, 1],
      initialBreakpoint: 0.95,
      keyboardClose: false,
    });
    await modal.present();
    // Doors that need WARM user activation (the picker, the .vcf file dialog)
    // are answered on onWillDismiss (the build-175/177 lesson); the typed door
    // flips the declared create-form modal (build 178). A row tap — open the
    // card — waits for onDidDismiss: never present a card into a dying
    // overlay.
    const will = await modal.onWillDismiss();
    if (will?.role === 'phone') { void this.searchPhoneContacts(); return; }
    if (will?.role === 'vcf') { this.importVcfContacts(will.data?.contacts || []); return; }
    if (will?.role === 'manual') {
      this.manualKind = 'person';
      this.manualDraft = {} as ContactInfo;
      this.manualAddOpen = true;
      return;
    }
    const res = await modal.onDidDismiss();
    // 2026-09-16 BUILD 218 (founder: "our selection from the Contacts/Tasks
    // will land at the next phase of interaction, instead of switching first
    // the initial card... Important visual for user to mentally see 'Yes,
    // this one'"): the pick relays into the WALK as the Who — slide 1, the
    // card on show — instead of the full card surface or a phase jump.
    // BUILD 224: the pick arms the walk DIRECTLY (inboxRef.armWalkPick ->
    // walkRef.armFromPick) — no @Input relay to lose to CD timing.
    if (res?.data?.contact) this.inboxRef?.armWalkPick?.(res.data.contact);
  }

  /** BUILD 218: the walk's New Task card door — the manual add sheet.
   *  BUILD 228 PHASE B: it opens the create form as a TASK card (kind flows
   *  through manualKind -> [createKind] -> the task form fields). */
  openManualTaskCard(): void {
    this.manualKind = 'task';
    this.manualDraft = {} as ContactInfo;
    this.manualAddOpen = true;
  }

  /** 2026-09-16 BUILD 229 PHASE C: the walk's Note-to-self door — home opens
   *  the card's OWN surface (its rolling story), exactly like a deck tap.
   *  The walk waits on slide 4 beneath the surface; Done/Snooze still there. */
  openCardNoteFromWalk(card: ContactInfo | null | undefined): void {
    if (card) this.onContactTap(card);
  }

  /** 2026-09-16 BUILD 230/235 THE LOOPS SURFACE OPENER: raises the inbox ON
   *  the Loops tab. Callers: the morning-digest dock/native taps, and the
   *  Settings => Loops section. (A CHECK-IN nudge tap does NOT come here —
   *  it goes through escalateCheckIn, which arms the walk with the item as
   *  the payload.) The inbox is *ngIf'd, so one tick lets it mount before
   *  the tab is set; an already-open inbox lands immediately. */
  openLoopsSurface(): void {
    this.rolodexAiChatOpen = true;
    setTimeout(() => {
      const ib: any = this.inboxRef;
      if (ib) ib.tab = 'loops';
    }, 80);
  }

  /**
   * 2026-09-14 BUILD 197: the search-context device door. The web Contact
   * Picker API is PICK-ONLY — the OS picker's own search bar is how a device
   * list is searched, and this call needs the tap still warm. The picked
   * person is MATCHED against LoopKeeper (phone digits, then name): found ->
   * their card opens; not found -> they are brought in from the phone and
   * their new card opens. Every device search is also a signal-detector exit.
   */
  private async searchPhoneContacts(): Promise<void> {
    const picker = (navigator as any)?.contacts?.select;
    if (!picker) return; // the door only renders where the API exists
    try { this.analytics.track('send_exit', { channel: 'device-contacts', surface: 'search' }); } catch { /* analytics optional */ }
    try {
      const picked = await picker(['name', 'tel', 'email'], { multiple: false });
      if (!picked?.length) return; // user cancelled the OS picker
      const raw = picked[0];
      const match = this.matchDeviceContact(raw);
      if (match) { this.onContactTap(match); return; }
      // Not in LoopKeeper yet — bring them in (the AI device path's shape).
      const c = this.mapPickedContact(raw, Date.now(), 0);
      if (raw?.icon instanceof Blob) {
        try {
          c.image.base64String = await new Promise<string | null>((res) => {
            const fr = new FileReader();
            fr.onload = () => res(typeof fr.result === 'string' ? fr.result : null);
            fr.onerror = () => res(null);
            fr.readAsDataURL(raw.icon);
          });
        } catch { /* keep the generated avatar */ }
      }
      this.contacts = [c, ...this.contacts];
      this.onContactsChange(this.contacts);
      void this.analytics.trackListStartedOnce('picker');
      void this.alertsService.showToast('Added from your phone', 2200);
      this.onContactTap(c);
    } catch { /* user cancelled the picker */ }
  }

  /** Match a picked device contact against the deck: phone digits (last 9,
   *  tolerant of country codes) then exact display name. */
  private matchDeviceContact(raw: any): ContactInfo | undefined {
    const digits = String(raw?.tel?.[0] || '').replace(/\D/g, '');
    const name = String(raw?.name?.[0] || '').trim().toLowerCase();
    return (this.contacts || []).find((c) => {
      if (digits && (c.phones || []).some((p) => {
        const d = String(p.number || '').replace(/\D/g, '');
        return !!d && (d.endsWith(digits.slice(-9)) || digits.endsWith(d.slice(-9)));
      })) return true;
      return !!name && String(c.name?.display || '').trim().toLowerCase() === name;
    });
  }

  /** 2026-08-19 A help "Go" tap now DEMONSTRATES the feature with real data
   *  or real navigation — not a toast that disappears. */
  onHelpNavigate(featureId: string): void {
    switch (featureId) {
      case 'cards':
        // Real demo: open the first contact's full card surface.
        if (this.contacts.length) this.onContactTap(this.contacts[0]);
        else this.alertsService.showToast('Add a contact first, then flip its card', 2500);
        break;
      case 'search':
        void this.openSearchModal();
        break;
      case 'merge':
        void this.demoMerge();
        break;
      case 'overdue':
        void this.demoList('overdue');
        break;
      case 'birthdays':
        void this.demoList('birthdays');
        break;
      case 'health':
        void this.demoList('health');
        break;
      case 'reminders':
        // Real demo: the actual Reminders & follow-ups modal.
        void this.rolodexComp?.openReminders();
        break;
      case 'storage':
      case 'sync':
        // Real demo: open Settings and jump straight to Cloud Sync.
        this.rolodexComp?.openSettingsSection('settings-cloudsync');
        break;
      default:
        break;
    }
  }

  /** Search demo: a real prompt → real filter → opens the first match. */
  private async demoSearch(): Promise<void> {
    if (!this.contacts.length) {
      await this.alertsService.showToast('Add a contact first, then search', 2500);
      return;
    }
    const alert = await this.alertController.create({
      header: 'Find anyone instantly',
      message: 'Type a name, phone or email — we will open the matching card.',
      inputs: [{ name: 'q', type: 'text', placeholder: 'Search contacts…' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Search',
          handler: (data: any) => {
            const q = String(data?.q || '').trim().toLowerCase();
            if (!q) return;
            const found = this.contacts.find((c) => {
              const name = String(c.name?.display || '').toLowerCase();
              const phone = (c.phones || []).map((p) => String(p.number || '')).join(' ').toLowerCase();
              const email = (c.emails || []).map((e) => String(e.address || '')).join(' ').toLowerCase();
              return name.includes(q) || phone.includes(q) || email.includes(q);
            });
            if (found) this.onContactTap(found);
            else void this.alertsService.showToast('No match — try a different word', 2500);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  /** Merge demo: scans the real deck for duplicate phones/emails. */
  private async demoMerge(): Promise<void> {
    const seen = new Map<string, string>();
    const dupNames = new Set<string>();
    for (const c of this.contacts) {
      const name = String(c.name?.display || 'Unknown');
      const keys: string[] = [];
      for (const p of c.phones || []) {
        const k = String(p.number || '').replace(/[^\d]/g, '');
        if (k) keys.push('p:' + k);
      }
      for (const e of c.emails || []) {
        const k = String(e.address || '').trim().toLowerCase();
        if (k) keys.push('e:' + k);
      }
      for (const key of keys) {
        const owner = seen.get(key);
        if (owner && owner !== name) dupNames.add(`${owner} ↔ ${name}`);
        else if (!owner) seen.set(key, name);
      }
    }
    if (dupNames.size) {
      const alert = await this.alertController.create({
        header: 'Duplicates found — they merge automatically',
        message: Array.from(dupNames).join('\n'),
        buttons: ['Got it'],
      });
      await alert.present();
    } else {
      await this.alertsService.showToast('No duplicates — your cards are already one person, one card', 2800);
    }
  }

  /** Overdue / birthdays / health demo: lists the real items in a dialog. */
  private async demoList(kind: 'overdue' | 'birthdays' | 'health'): Promise<void> {
    if (kind === 'overdue') {
      if (!this.followUpOverdue.length) {
        await this.alertsService.showToast('Nothing overdue — you are caught up', 2500);
        return;
      }
      const names = this.followUpOverdue.map((c) => String(c.name?.display || 'Unknown')).join('\n');
      const alert = await this.alertController.create({
        header: 'You owe these people a reply',
        message: names,
        buttons: ['Got it'],
      });
      await alert.present();
    } else if (kind === 'birthdays') {
      if (!this.upcomingBirthdays.length) {
        await this.alertsService.showToast('No upcoming birthdays in the next 30 days', 2500);
        return;
      }
      const lines = this.upcomingBirthdays
        .slice(0, 8)
        .map((b) => `${b.name} — in ${b.daysAway} day${b.daysAway === 1 ? '' : 's'}`)
        .join('\n');
      const alert = await this.alertController.create({
        header: 'Upcoming birthdays',
        message: lines,
        buttons: ['Got it'],
      });
      await alert.present();
    } else {
      if (!this.relationshipScores.length) {
        await this.alertsService.showToast('No relationship scores yet — add contacts and keep in touch', 2500);
        return;
      }
      const lines = this.relationshipScores
        .slice()
        .sort((a, b) => (a.score || 0) - (b.score || 0))
        .slice(0, 5)
        .map((s) => `${s.displayName}: ${Math.round(s.score * 100)}%`)
        .join('\n');
      const alert = await this.alertController.create({
        header: 'Relationship health — most dormant first',
        message: lines,
        buttons: ['Got it'],
      });
      await alert.present();
    }
  }

  /**
   * 2026-08-18 REAL CONTACTS SURVIVE A RELOAD: only REAL contacts are ever
   * persisted. Demo/mock contacts are transient filler and must never be able
   * to overwrite the user's deck.
   * 2026-08-19 CRITICAL FIX: the old "persist EVERYTHING" behaviour let the
   * Demo toggle write an empty/mock list over real contacts. Now:
   *   - persistContacts() filters out isMockData before writing;
   *   - an empty write only happens when the caller explicitly asks
   *     ({ allowEmpty: true }, e.g. removing the last real contact);
   *   - demo toggles never call persist at all.
   */
  private async persistContacts(contacts: ContactInfo[], opts?: { allowEmpty?: boolean }): Promise<void> {
    try {
      const real = (contacts || []).filter((c: any) => !(c as any)?.isMockData);
      if (!real.length && !opts?.allowEmpty) return; // never overwrite real deck with empty/mock
      await this.storageService.set('rolodex_contacts', real); // 2026-08-18 IndexedDB
    } catch { /* storage unavailable - the in-memory list still works */ }
  }

  /** 2026-08-28 BUILD 130: a loop dispatch wrote into a matched card's rolling
   *  context (Sent via WhatsApp / voice note / their reply). The Inbox mutated
   *  the contact object in place; persist the deck so the relationship data
   *  survives. Fired-and-forgotten for the user, remembered for the app. */
  onContactsDirty(): void {
    // 2026-08-28 BUILD 131: upgrade the flush — persist AND sync-push AND
    // nudge, via the same full path a card save takes (onContactsChange).
    this.onContactsChange(this.contacts);
    // 2026-09-20 BUILD 278 THE FIRST MINUTE, IN THE FLOW: the deed has
    // landed (a task draft saved, or a device-pick card created — both walk
    // the same persist path). The done flag flips and the per-device demo
    // deck retires with the deed (Settings' demo toggle still works).
    if (this.firstMinuteTapped && !this.firstMinuteRetired) {
      this.firstMinuteRetired = true;
      // BUILD 307: the deed no longer closes any gate — the ring is the
      // standing front door. The per-device demo deck still retires with
      // the deed (Settings' demo toggle still works).
      this.mockEnabled = false;
      void this.storageService.set('rolodex_demo_enabled', false).catch(() => { /* best effort */ });
    }
  }

  private async readPersistedContacts(): Promise<ContactInfo[] | null> {
    try {
      const parsed = await this.storageService.get<ContactInfo[]>('rolodex_contacts');
      return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }

  /** The real deck — demo entries are never part of it. */
  private realContacts(): ContactInfo[] {
    return (this.contacts || []).filter((c: any) => !(c as any)?.isMockData);
  }

  /** The deck as shown: real contacts + demo filler when enabled. */
  private deckWithDemo(): ContactInfo[] {
    const real = this.realContacts();
    const deck = this.mockEnabled ? [...real, ...shuffledMockContacts()] : real;
    // 2026-09-20 BUILD 282 THE EQUAL CLASSES (founder: "Neither type is
    // inferior to the other, so unless alphabetical, sorting order should
    // treat both classes as equal"): the deck's default order is the card's
    // own MOMENT — lastInteraction, falling back to updatedAt/createdAt —
    // persons and tasks interleaved by activity, never grouped by kind.
    // The alphabetical mode keeps its own grouping.
    const moment = (c: any): number => {
      const t = c?.lastInteraction ? new Date(c.lastInteraction as any).getTime()
        : c?.updatedAt ? new Date(c.updatedAt as any).getTime()
        : c?.createdAt ? new Date(c.createdAt as any).getTime() : 0;
      return Number.isFinite(t) ? t : 0;
    };
    return deck.sort((a: any, b: any) => moment(b) - moment(a));
  }

  // ==========================================================================
  // 2026-09-01 BUILD 168 (founder: "once user has real contacts, Demo should
  // stop factoring into operational features") — THE ONE GATE, stated once:
  //
  //   Demo factors operationally ONLY while it is the whole show — Demo ON
  //   and not a single real contact on board. The moment one real person
  //   exists, or Demo is off, every engine, prompt, event, score, AI nudge
  //   and walk pick sees REAL contacts only.
  //
  // The DISPLAY deck (deckWithDemo) still shows the tour while Demo is on;
  // nothing below ever mints an artifact from a demo card outside the tour.
  // ==========================================================================

  /** True only in the pure-demo tour state: Demo ON, zero real contacts. */
  private demoIsTheShow(): boolean {
    return this.mockEnabled && this.realContacts().length === 0;
  }

  /** The deck the ENGINES may see. Display keeps the tour; operations do not. */
  private operationContacts(): ContactInfo[] {
    const real = this.realContacts();
    return this.demoIsTheShow() ? this.contacts : real;
  }

  /**
   * BUILD 168: the demo artifact sweep. The engines minted calendar events
   * (recurring "Check in with <sample>", bday_<demoId>_<year> reminders) in
   * earlier builds whenever the mixed deck reached them, and those events
   * OUTLIVED the Demo toggle — the old purge removed demo LOOPS but let the
   * minted events sit (and the empty-deck early-return in runAutomation
   * skipped the re-sweep entirely). This removes every event owned by a
   * demo contactId and prunes the birthday handled-ledger. Idempotent —
   * safe to run at every boot and toggle.
   */
  private async purgeDemoArtifacts(): Promise<void> {
    try {
      const demoIds = new Set(mockContacts.map((c: any) => String(c.contactId)).filter(Boolean));
      for (const id of demoIds) {
        await this.eventService.deleteEventsForContact(id);
      }
      await this.birthdayReminder.purgeHandledFor(demoIds);
    } catch { /* best effort — the engines re-sweep on the next run */ }
  }

  async loadContacts() {
    this.loading = true;
    try {
      // 2026-08-18: the persisted REAL contacts win (they include the user's
      // picks - they must survive a reload). The demo deck is ONLY the filler
      // when there is nothing real anywhere yet, and real data (persisted or
      // freshly synced) always takes precedence over it.
      const persisted = await this.readPersistedContacts();
      if (persisted !== null) {
        // 2026-08-19 DEDUPE: old storage may still contain mock entries from
        // before the real/demo separation. Only REAL persisted contacts are
        // loaded; demo filler is added exactly once from mockContacts.
        const realPersisted = (persisted || []).filter((c: any) => !(c as any)?.isMockData);
        this.contacts = this.mockEnabled ? [...realPersisted, ...shuffledMockContacts()] : realPersisted;
      } else {
        // 2026-08-20 PRIVACY: never auto-read the device address book. The user
        // must explicitly pick contacts (Add from phone) or enable device sync.
        // Demo contacts still appear for the tour, but no real contact data is
        // ever silently imported — and nothing leaves the device unless the
        // user has enabled backend sync in Settings → Cloud Sync.
        // 2026-08-31 BUILD 160 (founder: "kill this once and for all"): an
        // empty persisted deck is EMPTY when Demo is off — the two lines below
        // used to seed mockContacts unconditionally, so demo cards fed every
        // prompt and the engines minted "Check in with <sample>" events on
        // EVERY boot of a Demo-off device with nothing real yet.
        this.contacts = this.mockEnabled ? mockContacts : [];
        await this.contactsSyncService.automateContactSetup(this.operationContacts());
      }
    } catch {
      this.contacts = this.mockEnabled ? mockContacts : [];
      await this.contactsSyncService.automateContactSetup(this.operationContacts());
    }
    // 2026-09-16 BUILD 227 PHASE A THE CARD KIND: the boot-time lazy
    // normalizer — any card without a kind IS a person. Additive, no
    // migration: the field rides the additive serialize-merge from here on.
    // The 8 demo task cards carry kind:'task' in the fixtures themselves.
    for (const c of this.contacts) { if (c && !c.kind) c.kind = 'person'; }
    this.loading = false;
    // 2026-08-16 DEMO SYNC: the moment contacts are ready, talk to the fresh
    // rolodex database — the investor peek view shows this device LIVE.
    // 2026-08-27 HONEST STORAGE TABS: real cards only — demo filler never
    // leaves the device, matching the pane's promise verbatim.
    this.rolodexSync.push(this.realContacts());
    // 2026-09-01 BUILD 168: whenever demo is NOT the whole show, clear every
    // artifact it ever minted (boot-time safety sweep — the third strike on
    // this leak, so the sweep runs whether or not anything leaked).
    if (!this.demoIsTheShow()) await this.purgeDemoArtifacts();
  }

  /** Run the full automation pipeline — follow-ups, birthdays, health scoring. */
  async runAutomation() {
    // 2026-09-01 BUILD 168 (founder): the engines see the OPERATIONAL deck —
    // never the display deck. With Demo ON + real people aboard, this used to
    // mint "Check in with <sample>" events and demo birthday reminders on
    // every boot, every contact change and every toggle.
    const ops = this.operationContacts();
    if (!ops.length) {
      // Nothing operational to schedule. The old early-return let demo-minted
      // events sit forever on a Demo-off empty deck — sweep them instead.
      await this.purgeDemoArtifacts();
      this.followUpReport = { scheduled: 0, skipped: 0, overdue: [] };
      this.followUpOverdue = [];
      this.relationshipScores = [];
      this.upcomingBirthdays = [];
      return;
    }

    // Follow-up engine: schedule recurring check-ins
    this.followUpReport = await this.followUpEngine.run(ops);
    this.followUpOverdue = this.followUpReport.overdue;

    // Relationship health scoring
    this.relationshipScores = this.relationshipMonitor.suggestReachOut(ops, 5);
    await this.relationshipMonitor.scheduleHealthCheck();

    // Birthday reminders
    const bdayReport = await this.birthdayReminder.processUpcomingBirthdays(ops);
    this.upcomingBirthdays = bdayReport.upcoming;
    await this.birthdayReminder.cleanupOldEntries();

    !environment.production && console.log('[HomePage] Automation complete:', {
      followUp: this.followUpReport,
      topScores: this.relationshipScores.slice(0, 3),
      birthdays: bdayReport.scheduled,
    });
  }

  /** Manual trigger: re-run relationship scoring on current contacts. */
  refreshRelationshipScores() {
    // 2026-09-01 BUILD 168: scores are operational prompts — real deck only.
    this.relationshipScores = this.relationshipMonitor.suggestReachOut(this.operationContacts(), 5);
  }

  getDormantCount(): number {
    return this.relationshipMonitor.findDormant(this.operationContacts()).length;
  }

  // ===== Cloud Sync ========================================================

  /** Refresh local sync state display from CloudSyncService. */
  refreshSyncState() {
    const state = this.cloudSync.getSyncState();
    const provider = this.cloudSync.getActiveProvider();
    this.syncProviders = this.cloudSync.getProviders();
    this.syncProviderName = state.provider;
    this.syncConnected = provider?.isAuthenticated() ?? false;
    this.syncHasPassphrase = this.cloudSync.isPassphraseSet();
    this.syncLastPushed = state.lastPushedAt;
    this.syncLastPulled = state.lastPulledAt;
  }

  // ===== Honest storage tabs (2026-08-27) ==================================
  // Every path a pane offers is the REAL path - the same handlers Settings
  // uses (onSyncSetPassphrase/onSyncConnect/onSyncPush/onSyncPull and the
  // consent toggle's service call). No dummies for testers to meet.

  /** The deck only ducks when a storage pane that EXPLAINS the absence is on
   *  screen (un-setup Cloud/Server). Panel collapsed = deck always visible —
   *  the Inbox leads, the deck follows, nothing hides without a word.
   *  2026-08-27 FOUNDER COLLAPSE. */
  get deckHiddenForTab(): boolean {
    if (!this.storagePanelOpen) return false;
    if (this.storageLocation === 'cloud') return !this.syncConnected;
    if (this.storageLocation === 'rolodex-server') return !this.serverSyncEnabled;
    return false;
  }

  /** Display name of the connected provider ('Google Drive', ...). */
  get syncProviderLabel(): string {
    const p = this.syncProviders.find((x) => x.name === this.syncProviderName);
    return p?.displayName || this.syncProviderName || '';
  }

  /** Real (non-demo) card count for the Device strip. */
  realContactCount(): number {
    return this.realContacts().length;
  }

  get syncLastPushedShort(): string {
    return this.syncLastPushed ? this.fmtTime(this.syncLastPushed) : '';
  }
  get serverLastPushedShort(): string {
    return this.serverLastPushed ? this.fmtTime(this.serverLastPushed) : '';
  }
  get serverLastPulledShort(): string {
    return this.serverLastPulled ? this.fmtTime(this.serverLastPulled) : '';
  }

  /** Locale-aware short timestamp for the status strips. */
  private fmtTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch { return iso || ''; }
  }

  /** Read the REAL server-sync state: consent, device slot, last push/pull. */
  async refreshServerTabState(): Promise<void> {
    this.serverSyncEnabled = await this.rolodexSync.isBackendSyncEnabled();
    this.serverDeviceId = this.rolodexSync.getDeviceId();
    try {
      this.serverLastPushed = await this.storageService.get<string>('loopkeeper_server_last_push');
      this.serverLastPulled = await this.storageService.get<string>('loopkeeper_server_last_pull');
    } catch { /* fresh device - no evidence yet, and the pane says so */ }
  }

  /** The Server pane's enable action - flips the SAME consent the Settings
   *  toggle writes, then optionally pushes immediately. Real cards only. */
  async enableServerSync(pushToo: boolean): Promise<void> {
    await this.rolodexSync.setBackendSyncEnabled(true);
    this.serverSyncEnabled = true;
    await this.alertsService.showToast('Backend sync on — real cards sync; demo cards never leave.', 3600);
    if (pushToo) await this.serverPush();
  }

  /** Push the real deck + the loops to the LoopKeeper server — and SPEAK the
   *  truth: what left, or exactly why nothing did (BUILD 262; the founder's
   *  "Push says success, but pull says nothing was pushed" dies here). */
  /** BUILD 269 THE READABLE DIAGNOSTIC: long push/pull messages are ALERT
   *  DIALOGS, never toasts — the founder's letter-stack toast (each letter
   *  vertically stacked at the page border) dies here. An alert is a fixed
   *  dialog: wrapped, centered, every word readable. */
  private async alertDialog(header: string, message: string): Promise<void> {
    try {
      const dialog = await this.alertController.create({ header, message, buttons: ['OK'] });
      await dialog.present();
    } catch { /* never break the flow on a dialog failure */ }
  }

  async serverPush(): Promise<void> {
    this.serverBusy = true;
    try {
      // BUILD 267 THE PERSISTED DECK IS THE BACKUP SOURCE (founder: "certainly
      // it is not in-memory that should be backing up to cloud or server -
      // that was, in itself, bad code"): the push reads the deck from STORAGE
      // FIRST — the same persisted deck every checkpoint counts — and only
      // falls back to memory if the storage read comes back empty. The
      // in-memory array is a cache, never the backup's source of truth.
      let stored = (await this.readPersistedContacts() || []).filter((c: any) => !c?.isMockData);
      if (!stored.length) stored = this.realContacts();
      const cards = stored;
      if (cards.length) {
        // keep the live deck in step with what we just proved storage holds
        this.contacts = this.mockEnabled ? [...cards, ...mockContacts] : cards;
      }
      const loops = this.loops.exportLoops();
      // BUILD 265/266/268/269 THE EMPTY PUSH IS NOT A PUSH — AS A DIALOG, NOT
      // A TOAST (founder: "the notification in case of failure appears... but
      // is wrongly formatted as it is running as a single thread, each letter
      // vertically stacked at the page border, and beyond"): the long
      // diagnostics are now ALERT DIALOGS — always formatted properly, every
      // word readable. The message shows BOTH meters (the Device tab's count
      // vs what the push read) and answers the Export-File question.
      if (!cards.length && !loops.length) {
        const total = (this.contacts || []).length;
        const deviceTabSays = this.realContactCount();
        const msg = deviceTabSays > 0
          ? 'The stored deck this push read holds 0 real cards, while this panel\'s Device tab counts ' + deviceTabSays + '. The two must agree; if they still disagree after reopening the app, that is an app bug — tell the founder.\n\nExport File is NOT needed for push — push reads the deck directly.'
          : total > 0
            ? 'All ' + total + ' cards in THIS app\'s stored deck are demo cards, and demo cards never leave the device. If you can see real cards elsewhere, that is a different app window or profile — open LoopKeeper there and push from it.'
            : 'This app has no cards stored yet. Create one card, then push.';
        await this.alertDialog('Nothing to push', msg);
        return;
      }
      const out = await this.rolodexSync.push(cards, undefined, loops);
      const now = new Date().toISOString();
      if (out.ok) {
        this.serverLastPushed = now;
        try { await this.storageService.set('loopkeeper_server_last_push', now); } catch { /* best effort */ }
        // BUILD 266/267 THE SELF-EVIDENCING SUCCESS: the toast carries the
        // slot id and the deck source, so "success" is checkable.
        const slot = String(this.rolodexSync.getDeviceId() || '').slice(0, 22);
        await this.alertsService.showToast('Pushed ' + cards.length + ' cards + ' + loops.length + ' loops (from the stored deck) — server slot ' + slot + '… updated just now' + (out.coversStripped ? ' — photo/video covers stayed on this device (payload cap)' : ''), 4600);
      } else {
        // BUILD 269: failures speak as DIALOGS too — the letter-stack toast
        // class is retired for every long diagnostic in this pane.
        const why = out.error === 'consent-off'
          ? 'Backend-sync consent is OFF. Enable it above (or Settings → Backend sync consent), then push again.'
          : out.error === 'network'
            ? 'The server did not answer. Nothing left the device — check your connection and push again.'
            : out.error === 'server-413' || out.error === 'server-413-even-light'
              ? 'The server rejected the deck as too large (HTTP 413). Even with photo/video covers shed, the deck exceeds the server\'s upload cap — the nginx body limit (client_max_body_size) needs raising to 32M on the droplet.'
              : 'The push failed (' + (out.error || 'unknown') + '). Nothing left the device.';
        await this.alertDialog('Push failed', why);
      }
    } finally {
      this.serverBusy = false;
    }
  }

  /** Pull this device's state (deck + loops) from the server — every outcome
   *  speaks its truth: restored counts, genuinely empty, consent off, or the
   *  server unreachable (BUILD 262). */
  async serverPull(): Promise<void> {
    this.serverBusy = true;
    try {
      const out = await this.rolodexSync.restore();
      if (out.status === 'ok') {
        this.contacts = out.contacts;
        const arrived = this.loops.mergeRestored(out.loops as any);
        const now = new Date().toISOString();
        this.serverLastPulled = now;
        try { await this.storageService.set('loopkeeper_server_last_pull', now); } catch { /* best effort */ }
        await this.alertsService.showToast('Restored ' + out.contacts.length + ' cards + ' + arrived + ' loops from the server', 3400);
        await this.runAutomation();
      } else if (out.status === 'empty') {
        await this.alertsService.showToast('The server has nothing for this device yet — push first', 3200);
      } else if (out.status === 'off') {
        await this.alertsService.showToast('Nothing pulled — backend-sync consent is OFF. Enable it above.', 3600);
      } else {
        await this.alertsService.showToast('The server did not answer — try again', 3200);
      }
    } finally {
      this.serverBusy = false;
    }
  }

  /** 2026-09-18 BUILD 265 THE TRANSFER PULL — the founder's December-card
   *  goal ("the date transfers to any other device I use"): the sync slot is
   *  DEVICE-KEYED, so a second device's own pull reads nothing. Paste the
   *  OTHER device's anonymous id (Settings → This device shows and copies
   *  it) and its deck + loops merge in — nothing local is ever deleted. */
  async pullFromOtherDevice(): Promise<void> {
    const dialog = await this.alertController.create({
      header: 'Pull from another device',
      message: 'On your OTHER device: Settings → This device (anonymous id) → copy. Paste that id here — its cards and loops merge into this device.',
      inputs: [{ name: 'id', type: 'text', placeholder: 'rolodex-…' }],
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Pull', role: 'confirm' }],
    });
    await dialog.present();
    const { data } = await dialog.onDidDismiss();
    const id = String(data?.values?.id || '').trim();
    if (!id) return;
    this.serverBusy = true;
    try {
      const out = await this.rolodexSync.restoreFrom(id);
      if (out.status === 'ok') {
        const have = new Set((this.contacts || []).map((c: any) => String(c?.contactId || c?.id || '')));
        let added = 0;
        for (const c of out.contacts) {
          const key = String((c as any)?.contactId || (c as any)?.id || '');
          if (key && have.has(key)) continue;
          this.contacts = [c, ...this.contacts];
          if (key) have.add(key);
          added++;
        }
        const arrived = this.loops.mergeRestored(out.loops as any);
        try { await this.persistContacts(this.contacts); } catch { /* best effort */ }
        const now = new Date().toISOString();
        this.serverLastPulled = now;
        try { await this.storageService.set('loopkeeper_server_last_pull', now); } catch { /* best effort */ }
        await this.alertsService.showToast('Pulled from ' + id.slice(0, 18) + '…: ' + added + ' new cards + ' + arrived + ' loops merged in', 4200);
        await this.runAutomation();
      } else if (out.status === 'empty') {
        await this.alertsService.showToast('That device has nothing stored yet — open LoopKeeper there, enable sync, and Push first (its id is under Settings → This device).', 4800);
      } else if (out.status === 'off') {
        await this.alertsService.showToast('Nothing pulled — backend-sync consent is OFF. Enable it above first.', 3600);
      } else {
        await this.alertsService.showToast('The server did not answer — try again', 3200);
      }
    } finally {
      this.serverBusy = false;
    }
  }

  /** 2026-09-18 BUILD 265 THE RETURN TO PRISTINE (founder: "I am stuck in
   *  that phase, not able to return to the pristine"): the enabled strip
   *  gains a reset — consent goes OFF and the pane walks back to the setup
   *  card (the consent step + enable actions). Nothing stored is erased. */
  async resetServerSetup(): Promise<void> {
    await this.rolodexSync.setBackendSyncEnabled(false);
    this.serverSyncEnabled = false;
    this.backendSyncConsentSeen = false;
    this.serverLastPushed = null;
    this.serverLastPulled = null;
    await this.alertsService.showToast('Server sync reset — consent off. The setup card is back; nothing stored was erased.', 3600);
  }

  /** 2026-08-27 FOUNDER: one storage icon (top right of the viewport) owns
   *  the storage chrome. Collapsed at the start of every session — the
   *  LoopKeeper Inbox becomes the first panel; the deck follows. Toggling it
   *  open brings back the CLOUD | DEVICE | LOOPKEEPER SERVER tabs and their
   *  honest panes. */
  toggleStoragePanel(): void {
    this.storagePanelOpen = !this.storagePanelOpen;
  }

  /** Deep link into Settings > Cloud Sync (the full control surface).
   *  2026-08-27: Settings lives inside the deck surface — if the current tab
   *  hides it (un-setup Cloud/Server pane), return to Device first so the
   *  jump is never into a display:none component. Also reveals the storage
   *  panel TEMPORARILY (not persisted) — Settings may surface it, and it
   *  collapses again next session. */
  openStorageSettings(): void {
    this.storagePanelOpen = true;
    if (this.deckHiddenForTab) {
      this.storageLocation = 'device';
      void this.storageService.set('rolodex_storage', 'device');
    }
    this.rolodexComp?.openSettingsSection('settings-cloudsync');
  }

  /** Connect to a cloud provider by name (e.g. 'google-drive', 'dropbox'). */
  async onSyncConnect(providerName: string) {
    this.syncBusy = true;
    try {
      await this.cloudSync.selectProvider(providerName);
      this.refreshSyncState();
      this.alertsService.showToast('Connected to cloud');
    } catch (err: any) {
      !environment.production && console.error('[HomePage] Sync connect failed:', err);
      this.alertsService.showToast(err.message ?? 'Failed to connect');
    } finally {
      this.syncBusy = false;
    }
  }

  /** Disconnect current provider. */
  async onSyncDisconnect() {
    this.syncBusy = true;
    try {
      await this.cloudSync.disconnectProvider();
      this.refreshSyncState();
      this.alertsService.showToast('Disconnected from cloud');
    } catch (err: any) {
      !environment.production && console.error('[HomePage] Sync disconnect failed:', err);
    } finally {
      this.syncBusy = false;
    }
  }

  /** Prompt user to set (or change) their encryption passphrase. */
  async onSyncSetPassphrase() {
    const alert = await this.alertController.create({
      header: 'Sync Passphrase',
      message: 'Enter a strong passphrase to encrypt your LoopKeeper data in the cloud. You\'ll need this on every device.',
      inputs: [
        {
          name: 'passphrase',
          type: 'password',
          placeholder: 'Your passphrase',
        },
        {
          name: 'confirm',
          type: 'password',
          placeholder: 'Confirm passphrase',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data: any) => {
            if (!data.passphrase || data.passphrase.length < 4) {
              this.alertsService.showToast('Passphrase must be at least 4 characters');
              return false; // keep alert open
            }
            if (data.passphrase !== data.confirm) {
              this.alertsService.showToast('Passphrases do not match');
              return false;
            }
            this.cloudSync.setPassphrase(data.passphrase);
            this.refreshSyncState();
            this.alertsService.showToast('Passphrase saved');
            return true;
          },
        },
      ],
    });
    attachPasswordPeek(alert); // 2026-08-28 BUILD 125: view on/off
    await alert.present();
  }

  /** Push current contacts + events to the cloud. */
  async onSyncPush() {
    if (!this.syncHasPassphrase) {
      this.alertsService.showToast('Set a passphrase first');
      return;
    }
    this.syncBusy = true;
    try {
      const events = await this.eventService.getEvents();
      await this.cloudSync.push(this.contacts, events);
      this.refreshSyncState();
      this.alertsService.showToast('Pushed to cloud');
    } catch (err: any) {
      !environment.production && console.error('[HomePage] Push failed:', err);
      this.alertsService.showToast('Push failed: ' + (err.message ?? 'Unknown error'));
    } finally {
      this.syncBusy = false;
    }
  }

  /** Pull contacts + events from the cloud and merge locally. */
  async onSyncPull() {
    if (!this.syncHasPassphrase) {
      this.alertsService.showToast('Set a passphrase first');
      return;
    }
    this.syncBusy = true;
    try {
      const events = await this.eventService.getEvents();
      const result = await this.cloudSync.sync(this.contacts, events);
      this.contacts = result.contacts;
      this.refreshSyncState();

      // Persist pulled events
      for (const ev of result.events) {
        await this.eventService.saveEvent(ev, true);
      }

      const msg = result.pulled ? 'Synced — remote data merged' : 'Pushed to cloud (no remote data)';
      this.alertsService.showToast(msg);

      // Re-run automation on merged contacts
      await this.runAutomation();
    } catch (err: any) {
      !environment.production && console.error('[HomePage] Pull failed:', err);
      this.alertsService.showToast('Pull failed: ' + (err.message ?? 'Unknown error'));
    } finally {
      this.syncBusy = false;
    }
  }

  /** Export contacts as a .rolodex file. */
  async onSyncExportLocal() {
    try {
      const events = await this.eventService.getEvents();
      this.cloudSync.exportLocal(this.contacts, events);
      this.alertsService.showToast('Exported .rolodex file');
    } catch (err: any) {
      !environment.production && console.error('[HomePage] Export failed:', err);
    }
  }

  /** Import contacts from a .rolodex file. */
  async onSyncImportLocal() {
    try {
      const bundle = await this.cloudSync.importLocal();
      if (!bundle) return; // user cancelled or invalid file

      // Merge imported contacts with local (newest wins)
      const mergedMap = new Map<string, ContactInfo>();
      for (const c of this.contacts) mergedMap.set(c.contactId, c);
      for (const c of bundle.contacts) {
        const existing = mergedMap.get(c.contactId);
        if (!existing || (c.updatedAt && (!existing.updatedAt || c.updatedAt > existing.updatedAt))) {
          mergedMap.set(c.contactId, c);
        }
      }
      this.contacts = Array.from(mergedMap.values());

      // Import events
      for (const ev of bundle.events ?? []) {
        await this.eventService.saveEvent(ev, true);
      }

      this.alertsService.showToast(`Imported ${bundle.contacts.length} contacts`);
      await this.runAutomation();
    } catch (err: any) {
      !environment.production && console.error('[HomePage] Import failed:', err);
      this.alertsService.showToast('Import failed');
    }
  }

  /** Callback used by CloudSyncService to request the passphrase at sync time. */
  private async promptForPassphrase(): Promise<string | null> {
    return new Promise((resolve) => {
      this.alertController.create({
        header: 'Enter Passphrase',
        message: 'Enter your sync passphrase to encrypt/decrypt your data.',
        inputs: [{ name: 'passphrase', type: 'password', placeholder: 'Passphrase' }],
        buttons: [
          { text: 'Cancel', role: 'cancel', handler: () => resolve(null) },
          { text: 'OK', handler: (data: any) => resolve(data.passphrase ?? null) },
        ],
      }).then(alert => { attachPasswordPeek(alert); alert.present(); }); // BUILD 125: view on/off
    });
  }

  // ===== Event handlers ====================================================

  onChatContact(contact: ContactInfo) {
    !environment.production && console.log('Chat with:', contact.name?.display);
  }

  onAudioCallContact(contact: ContactInfo) {
    !environment.production && console.log('Audio call:', contact.name?.display);
  }

  onVideoCallContact(contact: ContactInfo) {
    !environment.production && console.log('Video call:', contact.name?.display);
  }

  onScheduleEvent(event: { contact: ContactInfo; event: any }) {
    !environment.production && console.log('Schedule event:', event);
  }

  onToggleDetails(contact: ContactInfo) {
    contact.showDetails = !contact.showDetails;
  }

  /** 2026-08-27 FULL-SCREEN EDIT: the edit form is the ONE place where a
   *  draggable sheet actively fights the user (long form + keyboard + footer
   *  inside breakpoint-drag). Present it as a true full-screen modal instead.
   *  ContactCardComponent's ngOnInit editContact path prefills the form from
   *  the `contact` prop, and onSubmit dismisses with {mode, contact} — the
   *  same contract the create modal already relies on. */
  async openEditContact(contact: ContactInfo): Promise<void> {
    const modal = await this.modalController.create({
      component: ContactCardComponent,
      componentProps: {
        selectedMode: 'editContact',
        contact,
      },
      cssClass: 'contact-edit-fullscreen',
      keyboardClose: false,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.mode === 'editContact' && data?.contact) {
      this.onEditContact(data.contact);
    }
  }

  onEditContact(contact: ContactInfo) {
    // 2026-08-18 CRUD: persist the edited contact back into the deck + the server
    if (!contact?.contactId) return;
    // 2026-08-18 FIX: replace IMMUTABLY - mutating this.contacts[i] kept the
    // same array reference, so the OnPush card never re-rendered after save.
    const exists = this.contacts.some((c: any) => c.contactId === contact.contactId);
    this.contacts = exists
      ? this.contacts.map((c: any) => (c.contactId === contact.contactId ? contact : c))
      : [contact, ...this.contacts];
    void this.persistContacts(this.contacts);
    this.rolodexSync.push(this.realContacts());
    this.analytics.track('card_edited');
    void this.alertsService.showToast('Card updated — loop intact.', 1800);
  }

  /** 2026-08-27 CALENDAR SYNC — the receiver's side of the card-to-card
   *  appointment. The invite (key=contactId, title, when, from) lands on the
   *  matching card (appointments[]) and on the device calendar. Persists
   *  inline (not via onEditContact) so the arrival never toasts "Card
   *  updated" — the user didn't edit anything. */
  private landIncomingAppointment(inv: { key?: string; title?: string; when?: string; from?: string }): void {
    const key = String(inv?.key || '');
    const title = String(inv?.title || '').trim();
    if (!key || !title) return;
    const when = String(inv?.when || '');
    const c: any = this.contacts.find((x: any) => String(x?.contactId) === key);
    if (!c) return; // no local card for that thread — nothing to land on
    const appts = Array.isArray(c.appointments) ? c.appointments : [];
    // Dedupe: same title+when already caught (socket reconnects re-emit).
    if (appts.some((a: any) => a?.title === title && String(a?.when) === when)) return;
    c.appointments = [...appts, { title, when, from: String(inv?.from || 'Them') }];
    c.updatedAt = new Date();
    void this.persistContacts(this.contacts);
    this.rolodexSync.push(this.realContacts());
    // 2026-08-27 CHOICE-FIRST CALENDAR (founder): the invite lands on the
    // CARD always (LoopKeeper-side storage is ours) — but the device calendar
    // is joined only if the user says so, right here at arrival. Dismissal
    // and "Keep" mean the same thing: LoopKeeper only. Nothing auto-writes.
    const from = String(inv?.from || 'Them');
    void this.alertController
      .create({
        header: this.translate.instant('loopkeeper.cal.pushAsk'),
        message: this.translate.instant('loopkeeper.cal.inviteAsk', { from, title }),
        buttons: [
          { text: this.translate.instant('loopkeeper.cal.keepAction'), role: 'cancel' },
          {
            text: this.translate.instant('loopkeeper.cal.pushAction'),
            handler: () => {
              void this.calendar.addEvent({
                title,
                person: c?.name?.display || 'them',
                start: when ? new Date(when) : new Date(),
                localKey: 'appt:' + key + ':' + when,
              });
              void this.calendar.rememberPushChoice(true);
            },
          },
        ],
      })
      .then((a) => a.present());
  }

  async onRemoveContact(contact: ContactInfo) {
    this.contacts = this.contacts.filter(c => c.contactId !== contact.contactId);
    this.analytics.track('card_removed');
    // 2026-08-18 FIX: persist the filtered list AWAITED - a reload right
    // after the tap must find the write already in IndexedDB.
    // 2026-08-19 allowEmpty: removing the LAST real contact must persist the
    // empty list (otherwise the demo/mock filler would come back as "real").
    await this.persistContacts(this.contacts, { allowEmpty: true });
    this.rolodexSync.push(this.realContacts()); // 2026-08-16: the server home updates live
  }

  /** 2026-08-18 SECURITY: the PIN gate on every cold start. */
  private async enforceAppLock(): Promise<void> {
    try {
      const needs = await this.security.needsUnlock();
      if (!needs) return;
      const alert = await this.alertController.create({
        header: 'LoopKeeper is locked',
        message: 'Enter your PIN to open the app.',
        inputs: [{ name: 'pin', type: 'password', placeholder: 'PIN' }],
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Forgot PIN?',
            handler: () => {
              void alert.dismiss();
              setTimeout(() => { void this.showLockRecovery(); }, 150);
              return false;
            },
          },
          {
            text: 'Unlock',
            handler: async (data: any) => {
              const ok = await this.security.verifyPin(String(data?.pin || ''));
              if (ok) return true;
              void alert.dismiss();
              setTimeout(() => { void this.enforceAppLock(); }, 200);
              return false;
            },
          },
        ],
      });
      attachPasswordPeek(alert); // 2026-08-28 BUILD 125: view on/off
      await alert.present();
    } catch { /* lock is best-effort */ }
  }

  /** 2026-08-18 FAQ: the inevitable "what if I forget my PIN?" answer, also on
   *  the lock screen itself - not only buried in Settings. */
  private async showLockRecovery(): Promise<void> {
    const a = await this.alertController.create({
      header: 'Forgot your PIN?',
      message: 'Your PIN is hashed on this device and cannot be recovered — by us or anyone. The clean reset is to clear LoopKeeper app data (Settings → Apps → LoopKeeper → Clear storage) or reinstall. If your contacts are synced to the LoopKeeper Server / cloud, they come back after you sign in again. Full Q&A lives in Settings → FAQ & Help.',
      buttons: ['OK'],
    });
    await a.present();
  }

  onContactTap(contact: ContactInfo) {
    // 2026-09-20 BUILD 281 THE DINNER-TABLE DOOR (founder: demo cards "most
    // importantly tappable to any investor at a moment's notice, even across
    // a dinner table for the first time LoopKeeper is introduced to them"):
    // a demo card tap does NOT open the card surface — it raises the WALK
    // with the card armed, where the demo door, the words and the send
    // reminder play the full show. The surface stays the real cards' home.
    if ((contact as any)?.isMockData) {
      try { this.rolodexComp?.showRegularView(); } catch { /* deck not mounted */ }
      void this.homeContent?.scrollToTop(0);
      this.pendingEscalation = { contact: contact as any, loop: undefined };
      this.rolodexAiChatOpen = true;
      this.inboxExpanded = false;
      this.deliverPendingEscalation();
      return;
    }
    // 2026-08-16: the card tap opens the FULL feature surface - flip it for
    // chat, reminders, the confidante, edit, call, email, map, remove.
    // 2026-08-18: edits/removals made INSIDE the surface come back on dismiss.
    void this.modalController.create({
      component: ContactSurfaceModalComponent,
      componentProps: { contact },
      cssClass: 'card-chat-modal-sheet',
      // 2026-08-18 CERTAINTY: the surface opens FULL and cannot slip - the
      // edit footer is never trapped below the fold again.
      breakpoints: [0, 0.7, 0.95, 1],
      initialBreakpoint: 1,
      keyboardClose: false,
    }).then((m) => {
      void m.onDidDismiss().then((res: any) => {
        const data = res?.data;
        if (data?.action === 'edit' && data?.contact) this.onEditContact(data.contact);
        else if (data?.action === 'remove' && data?.contact) this.onRemoveContact(data.contact);
        // 2026-08-27 FULL-SCREEN EDIT: the embedded card's pencil now comes up
        // as a request — dismiss the sheet, then open the dedicated full-screen
        // edit modal (no breakpoints, no drag-vs-scroll fight while typing).
        else if (data?.action === 'request-edit' && data?.contact) void this.openEditContact(data.contact);
      });
      void m.present();
    });
  }

  /** 2026-09-20 BUILD 279b THE WIPE VERIFICATION PASS: the fresh boot
   *  finishes a wipe whose deletions were blocked by a dying page — clear
   *  everything again and reload once; attempt 2 stands down (no loops). */
  private finishPendingWipe(): void {
    try {
      const attempt = Number(localStorage.getItem('lk_wipe_pending') || '0');
      if (!attempt) return;
      localStorage.removeItem('lk_wipe_pending');
      if (attempt >= 2) return; // two passes is the cap — never a loop
      // 2026-09-23 BUILD 312: the web-storage stage goes through the ONE
      // door (clearWebStorage), keeping the attempt mark that drives THIS
      // verification pass.
      try { sessionStorage.clear(); } catch { /* private mode */ }
      this.storageService.clearWebStorage(StorageService.WIPE_KEEP);
      try { localStorage.setItem('lk_wipe_pending', String(attempt + 1)); } catch { /* private mode */ }
      try {
        const anyIdx = indexedDB as unknown as { databases?: () => Promise<Array<{ name?: string }>> };
        if (typeof anyIdx.databases === 'function') {
          void anyIdx.databases().then((dbs) => {
            for (const d of (dbs || [])) {
              try { indexedDB.deleteDatabase(String(d?.name || 'rolodex')); } catch { /* fire and reload */ }
            }
          }).catch(() => { /* the reload carries it */ });
        } else {
          try { indexedDB.deleteDatabase('rolodex'); } catch { /* fire and reload */ }
        }
      } catch { /* the reload carries it */ }
      const sep = location.href.includes('?') ? '&' : '?';
      window.location.replace(`${location.href}${sep}_wipe2=${Date.now()}`);
    } catch { try { localStorage.removeItem('lk_wipe_pending'); } catch { /* ignore */ } }
  }

  onContactsChange(contacts: ContactInfo[]) {
    this.contacts = contacts;
    // 2026-09-20 BUILD 279b THE DEMO DEFAULT (founder: "once real cards, or
    // tasks, come on into LoopKeeper Contacts, demo contacts default to
    // false. persisted, they stop showing, unless Settings => Demo calls for
    // them to return showing"): a real-card ARRIVAL flips the demo off,
    // persisted — Settings can always call it back.
    const realCount = (contacts || []).filter((c: any) => !(c as any)?.isMockData).length;
    if (!this.ftView && this.lastRealCount !== null && realCount > this.lastRealCount) {
      this.mockEnabled = false;
      void this.storageService.set('rolodex_demo_enabled', false).catch(() => { /* best effort */ });
      // A card added from the ORIGINAL panel (not the blank page) is that
      // panel's deed for this visit. A pick on the blank page does NOT
      // admit — the canvas holds until the loop is concluded.
      this.firstMinuteTapped = true;
      this.fmPhase = 'panel';
      void this.storageService.set('lk_cover_engaged', true).catch(() => { /* best effort */ });
      this.firstMinuteActive = false;
    } else if (this.ftView && this.lastRealCount !== null && realCount > this.lastRealCount) {
      this.mockEnabled = false;
      void this.storageService.set('rolodex_demo_enabled', false).catch(() => { /* best effort */ });
    }
    this.lastRealCount = realCount;
    this.persistContacts(contacts); // 2026-08-18: real contacts survive a reload
    this.rolodexSync.push(this.realContacts()); // 2026-08-16: the server home updates live
    if (!this.ftView) void this.rolodexAiNudge(contacts); // never a toast over the blank page
  }

  /** 2026-08-18 THE ALGORITHMIC AGENT NUDGE: when contacts are added without
   *  the 4 W's, RolodexAI says so instead of silently filing them. */
  private async rolodexAiNudge(contacts: ContactInfo[]): Promise<void> {
    try {
      // 2026-09-01 BUILD 168 (founder): the nudge counts the OPERATIONAL deck
      // — demo cards never inflate (or become) the "no context" prompt once a
      // real person exists.
      const deck = this.operationContacts();
      const noContext = (deck || []).filter((c: any) => !(c?.rolodex?.where || c?.rolodex?.why || c?.rolodex?.topic));
      if (!noContext.length || noContext.length === this.aiNudgeShownFor) return;
      this.aiNudgeShownFor = noContext.length;
      const noun = noContext.length === 1 ? 'contact has' : 'contacts have';
      void this.alertsService.showToast(`AI Assistant: ${noContext.length} ${noun} no context yet — open a card and add the 4 W's so I can draft for you.`, 6000);
    } catch { /* ignore */ }
  }

  onAutoSort() {
    !environment.production && console.log('Auto sort triggered');
  }

  onLoadMoreAutoSort() {
    !environment.production && console.log('Load more auto sort');
  }

  onApplyFilter() {
    !environment.production && console.log('Apply filter:', this.selectedFilter);
  }

  onApplyGroupFilter(event: any) {
    !environment.production && console.log('Apply group filter:', event);
  }

  /** 2026-08-19 CRITICAL FIX: the demo toggle only adds/removes DEMO cards.
   *  Real contacts are never touched, never replaced, never persisted-over. */
  private async applyDemoToggle(): Promise<void> {
    this.mockEnabled = !this.mockEnabled;
    this.contacts = this.deckWithDemo();
    void this.storageService.set('rolodex_demo_enabled', this.mockEnabled); // 2026-08-19 persisted state
    // 2026-08-30 BUILD 155 (founder: demo contacts must be excluded from every
    // process when Demo is off): sync pushes REAL cards only - demo never
    // leaves the device, matching the honest-storage doctrine.
    this.rolodexSync.push(this.realContacts());
    // 2026-08-30 BUILD 155: when demo drops, every artifact it fed must go -
    // loops minted from demo cards would keep nudging a person who no longer
    // exists on the deck. The engine re-run below clears managed demo events.
    if (!this.mockEnabled) {
      const demoIds = new Set(mockContacts.map((c: any) => String(c.contactId)));
      const all = await this.loops.all();
      for (const l of all) {
        if (l.sourceContactId && demoIds.has(String(l.sourceContactId))) this.loops.remove(l.id);
      }
      this.relationshipScores = [];
      this.upcomingBirthdays = [];
    }
    // 2026-09-01 BUILD 168: both toggle directions sweep the minted artifacts.
    // Turning demo OFF: its old events must die. Turning demo ON while real
    // people exist: demo must not re-mint anything (the re-run below now uses
    // the operational deck, and the sweep clears whatever older builds left).
    if (!this.demoIsTheShow()) await this.purgeDemoArtifacts();
    void this.rolodexAiNudge(this.contacts);
    await this.runAutomation(); // re-sweep clears managed demo events, reschedules real ones
  }

  onToggleWelcome() {
    this.applyDemoToggle();
  }

  onMockDataRepeat() {
    this.applyDemoToggle();
  }

  onInitMap(mapElement: HTMLElement) {
    !environment.production && console.log('Map initialized');
  }

  /** 2026-08-21 ADD CONTACTS: from the phone (Contact Picker, Android Chrome)
   *  or the manual entry form — the created contact lands at the TOP of the
   *  deck, exactly like a device import. 2026-08-31 BUILD 159: the sheet speaks
   *  the user's language (it now also answers the walk's MINE door). */
  async onCreateContact() {
    // 2026-09-15 BUILD 206 MANAGING CARDS (founder: Welcome slides 5-8 leave
    // the tour and become THIS modal): the user's FIRST attempt to add a
    // contact or build a card passes through it — the material answers the
    // question they are asking at that moment (what happens to a card once it
    // exists; reminder/notes/task kinds are coming). Once per device.
    try {
      const seen = await this.storageService.get<boolean>('lk_cards_modal_seen');
      if (!seen) {
        await this.storageService.set('lk_cards_modal_seen', true);
        const mc = await this.modalController.create({
          component: ManagingCardsModalComponent,
          cssClass: 'card-chat-modal-sheet',
          breakpoints: [0, 0.7, 0.95, 1],
          initialBreakpoint: 0.95,
        });
        await mc.present();
        await mc.onDidDismiss();
      }
    } catch { /* the gate must never block the add flow */ }
    // 2026-09-01 BUILD 172 (founder: "apply the interface used for accessing
    // the contacts in Loops, for contacts via the add icon also"): the cramped
    // three-button alert is RETIRED. The add icon - on the deck AND behind the
    // walk's MINE door - opens the SAME roomy sheet the Loops chooser uses:
    // the searchable list of people already here, with the bring-them-in
    // doors at the foot. The phone-picker door only renders where the device
    // actually offers the Contact Picker API (Android Chromium); iPhone
    // Safari never does, so the dead door never shows and "I'll type one in"
    // leads. A row tap still opens that person's card.
    const modal = await this.modalController.create({
      component: SearchModalComponent,
      componentProps: {
        contacts: this.contacts,
        addDoors: true,
        pickerAvailable: !!((navigator as any)?.contacts?.select),
      },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95, 1],
      // 2026-09-01 BUILD 177 (founder: "does not open with a firm initial
      // anchor, so the ion-footers are mostly hiding at the bottom"): the
      // add sheet opens FULL - the doors stand on the true viewport bottom,
      // and the search field no longer autofocuses (no keyboard sliding the
      // footer out of view before the user even looks).
      initialBreakpoint: 1,
      keyboardClose: false,
    });
    await modal.present();
    // 2026-09-01 BUILD 175 (founder: "the I'll add from my phone does not open
    // anything - just closes the interface"): onDidDismiss resolves AFTER the
    // closing animation, and the Contact Picker API demands fresh user
    // activation at the call. onWillDismiss fires the instant the dismissal
    // BEGINS - the picker opens while the tap is still warm. The sheet's own
    // phone tab already showed the preface copy, so the second preface alert
    // is skipped on this path (skipPreface). The .vcf door hands its parsed
    // records over as the 'vcf' role.
    // 2026-09-01 BUILD 178 (founder: "'I'll type one in' still only closes the
    // modal - proper thing is an in-template ion-modal, the Zyppar pattern"):
    // the create form is NOT presented by the controller anymore. The sheet's
    // dismissal flips manualAddOpen, which raises the DECLARED ion-modal in
    // the home template - no controller.present() into a dying overlay, no
    // timing to juggle. Native OS doors (picker, .vcf file dialog) keep the
    // warm onWillDismiss they need for user activation.
    const res = await modal.onWillDismiss();
    if (res?.role === 'phone') {
      void this.addFromPhoneContacts(true);
      return;
    }
    if (res?.role === 'vcf') {
      this.importVcfContacts(res.data?.contacts || []);
      return;
    }
    if (res?.role === 'manual') {
      this.manualDraft = {} as ContactInfo;
      this.manualAddOpen = true;
      return;
    }
    if (res?.data?.contact) this.onContactTap(res.data.contact);
  }

  /** 2026-09-01 BUILD 178: the declared create-form modal answered. Same
   *  post-processing as the old controller path (normalize, bump to top,
   *  once-ever list marker, receipt). */
  manualAddClosed(ev?: CustomEvent): void {
    this.manualAddOpen = false;
    const data = (ev as any)?.detail?.data;
    if (data?.mode === 'createContact' && data?.contact) {
      const contact = this.normalizeManualContact(data.contact);
      this.contacts = [contact, ...this.contacts];
      this.onContactsChange(this.contacts);
      void this.analytics.trackListStartedOnce('manual');
      void this.alertsService.showToast(this.translate.instant('loopkeeper.add.addedToast'), 2000);
    }
  }

  /** 2026-09-01 BUILD 175 (founder: batch import — "that parser from way
   *  back"): the sheet parsed a .vcf on the device; these are the records.
   *  Same card shape as the picker path, prepended at the top of the deck. */
  private importVcfContacts(cards: any[]): void {
    const when = Date.now();
    const mapped: any[] = [];
    for (let i = 0; i < (cards || []).length; i++) {
      const v = cards[i] || {};
      const parts = String(v.display || '').trim().split(/\s+/);
      mapped.push({
        contactId: 'vcf-' + when + '-' + i,
        name: {
          display: String(v.display || '').trim() || 'Imported contact ' + (i + 1),
          given: String(v.given || '').trim() || parts[0] || '',
          middle: '',
          family: String(v.family || '').trim() || parts.slice(1).join(' ') || '',
          prefix: String(v.prefix || '').trim(),
          suffix: String(v.suffix || '').trim(),
        },
        phones: (v.phones || []).map((n: string, j: number) => ({
          number: String(n || ''), type: 'mobile' as any, isPrimary: j === 0, label: null,
        })),
        emails: (v.emails || []).map((a: string, j: number) => ({
          address: String(a || ''), type: 'personal' as any, isPrimary: j === 0, label: null,
        })),
        postalAddresses: [],
        organization: { company: String(v.company || ''), jobTitle: '', department: '' },
        birthday: null,
        note: String(v.note || ''),
        urls: [],
        image: { base64String: v.photo || null },
        rolodex: {
          when: '',
          where: '',
          who: '',
          why: '',
          how: '',
          topic: '',
          followUp: '',
          personalTidbits: '',
          outcome: '',
          priority: 'medium' as const,
          contactFrequency: 'weekly' as const, // so the follow-up engine adopts them
          references: [],
        },
        socialProfiles: {},
        tags: (v.tags || []).map((t: any) => String(t)).filter(Boolean).slice(0, 6),
        groups: [],
        sharedBy: [],
        lastInteraction: null,
        nextInteraction: null,
        reminders: [],
        appointments: [],
        isMockData: false,
        isContactInfo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: { refreshContacts: false, notificationPreference: 'email' as any },
      });
    }
    if (!mapped.length) return;
    this.contacts = [...mapped, ...this.contacts];
    this.onContactsChange(this.contacts);
    // the list has begun (or grown) — once ever per device
    void this.analytics.trackListStartedOnce('vcf');
    void this.alertsService.showToast(
      this.translate.instant('loopkeeper.add.importedToast', { n: mapped.length }),
      4200);
  }

  /** Manual entry: reuse the ContactCardComponent create form in a modal, then
   *  capture the saved contact at the TOP as if it came from device contacts. */
  async openManualContactEntry(): Promise<void> {
    const modal = await this.modalController.create({
      component: ContactCardComponent,
      componentProps: {
        selectedMode: 'createContact',
        contact: {} as ContactInfo,
      },
      // 2026-08-27 FULL-SCREEN EDIT: same treatment as edit — typing into a
      // long form inside a draggable sheet is jerky; go full screen.
      cssClass: 'contact-edit-fullscreen',
      keyboardClose: false,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.mode === 'createContact' && data?.contact) {
      const contact = this.normalizeManualContact(data.contact);
      this.contacts = [contact, ...this.contacts]; // bump to top like a device import
      this.onContactsChange(this.contacts);
      // 2026-08-31 BUILD 159 (founder): their list has begun — once ever.
      void this.analytics.trackListStartedOnce('manual');
      void this.alertsService.showToast(this.translate.instant('loopkeeper.add.addedToast'), 2000);
    }
  }

  /** Make the manual form output a full ContactInfo with the same defaults as
   *  a device-picked contact (isMockData false, rolodex engine adopted, etc.). */
  private normalizeManualContact(raw: any): ContactInfo {
    const now = new Date();
    const nameRaw = raw?.name || {};
    const phones = Array.isArray(raw?.phones)
      ? raw.phones.map((p: any, i: number) => ({ ...p, isPrimary: i === 0, label: p?.label ?? null }))
      : [];
    const emails = Array.isArray(raw?.emails)
      ? raw.emails.map((e: any, i: number) => ({ ...e, isPrimary: i === 0, label: e?.label ?? null }))
      : [];
    const display = String(nameRaw.display || [nameRaw.given, nameRaw.middle, nameRaw.family].filter(Boolean).join(' ') || 'New contact').trim();
    return {
      contactId: 'manual-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      name: {
        display, given: nameRaw.given || '', middle: nameRaw.middle || '', family: nameRaw.family || '',
        prefix: nameRaw.prefix || '', suffix: nameRaw.suffix || '',
      } as any,
      organization: raw?.organization || { company: '', jobTitle: '', department: '' },
      birthday: raw?.birthday || null,
      note: raw?.note || '',
      phones,
      emails,
      postalAddresses: Array.isArray(raw?.postalAddresses) ? raw.postalAddresses : [],
      image: raw?.image || undefined,
      rolodex: {
        when: raw?.rolodex?.when || '', where: raw?.rolodex?.where || '', who: raw?.rolodex?.who || '',
        why: raw?.rolodex?.why || '', how: raw?.rolodex?.how || '', topic: raw?.rolodex?.topic || '',
        followUp: raw?.rolodex?.followUp || '', personalTidbits: raw?.rolodex?.personalTidbits || '',
        outcome: raw?.rolodex?.outcome || '', priority: raw?.rolodex?.priority || 'medium' as const,
        contactFrequency: raw?.rolodex?.contactFrequency || 'weekly' as const,
        references: Array.isArray(raw?.rolodex?.references) ? raw.rolodex.references : [],
      },
      socialProfiles: raw?.socialProfiles || {},
      tags: Array.isArray(raw?.tags) ? raw.tags : [],
      groups: Array.isArray(raw?.groups) ? raw.groups : [],
      privacy: raw?.privacy || { level: 'private' as const, sharedWith: [] },
      sharedBy: [],
      lastInteraction: null,
      nextInteraction: null,
      reminders: [],
      appointments: [],
      // BUILD 228 PHASE B: the rebuilt card keeps its kind, task payload and
      // cover — the old rebuild SILENTLY DROPPED them (and the emoji: a latent
      // build-217 leak on the manual-create path).
      kind: raw?.kind === 'task' ? 'task' : 'person',
      task: raw?.task || undefined,
      coverEmoji: raw?.coverEmoji || undefined,
      isMockData: false,
      isContactInfo: true,
      createdAt: now,
      updatedAt: now,
      preferences: { refreshContacts: false, notificationPreference: 'email' as const },
    } as any as ContactInfo;
  }

  /** 2026-08-23: no auto-injected message on focus — the placeholder intro
   *  already greets; typing is the user's move. */

  /** 2026-08-28 BUILD 126: the ✕ clears the whole Assistant composer in one tap. */
  clearRolodexAiInput(): void {
    this.rolodexAiInput = '';
  }

  /** 2026-08-28 BUILD 137: sentence starts cap themselves — no more painfully
   *  pressing CAPS at the start of every intended message. ASCII-only, length-
   *  preserving, caret-restoring; caseless scripts pass through untouched. */
  capRolodexAi(ev: CustomEvent): void {
    const comp = ev.target as unknown as { value?: string; getInputElement?: () => Promise<HTMLInputElement | HTMLTextAreaElement> };
    const raw = comp?.value || '';
    const capped = capSentences(raw);
    if (capped === raw) return;
    this.rolodexAiInput = capped;
    comp.value = capped;
    const fix = (): Promise<void> | undefined => comp.getInputElement?.().then((native) => {
      const pos = native.selectionStart ?? capped.length;
      native.value = capped;
      const p = Math.min(pos, capped.length);
      native.setSelectionRange(p, p);
    }).catch(() => { /* native not ready — the next keystroke retries */ });
    void fix();
    setTimeout(() => { void fix(); }, 0); // after Angular's writeValue settles
  }

  /** 2026-08-21 OPENLOOP CHAT: send to the real chat proxy and render the reply.
   *  2026-09-13 BUILD 187 (founder: the home chat is the PRIMARY assistant
   *  surface yet it reported nothing): every send now rides confidante_message
   *  with surface:'home' (the modal Confidante keeps its own), and a dead
   *  backend — network error, non-OK status, empty reply — lands in
   *  ai_chat_failed with the stage that broke. Event names + a categorical
   *  stage ONLY; never the message text, never a name, per the privacy rules. */
  async sendRolodexAi(): Promise<void> {
    const text = this.rolodexAiInput.trim();
    if (!text || this.rolodexAiBusy) return;
    this.rolodexAiInput = '';
    this.rolodexAiMessages.push({ from: 'user', text });
    try { this.analytics.track('confidante_message', { surface: 'home' }); } catch { /* analytics optional */ }
    void this.sound.playChatSend();
    this.rolodexAiBusy = true;
    this.rolodexAiTyping = true;
    this.scrollChatToBottom();
    // 2026-08-29 BUILD 143 (founder #2): PROACTIVE ASSISTANT. The user typed a
    // person's name — the Assistant doesn't wait for the backend: it throws up
    // a perfunctory draft from the card, and when the card is thin it shows
    // the loop-o-meter and a polite "I told ya". History below is built
    // BEFORE these lines so they never leak into the backend AI's context.
    try { this.proactiveAssist(text); } catch { /* never block the reply */ }
    try {
      // 2026-09-13 BUILD 189 (founder: CALIBRATION): the engine pre-flight
      // cost a full aiStatus roundtrip before EVERY message, while the
      // backend ladder already falls back deepseek → glm → grok — so the
      // choice is cached per session now (at most one check ever). And the
      // chat fetch gets a 30s AbortSignal: a hanging upstream used to hold
      // the typing dots forever; now it lands as ai_chat_failed 'timeout'
      // and the input unlocks with the honest "could not reply" line.
      const engine = await this.chatEngine();
      const history = this.rolodexAiMessages
        .map((m) => ({ role: m.from === 'user' ? 'user' as const : 'assistant' as const, content: m.text }));
      const res = await fetch(`${environment.rolodexApiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine, messages: history }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.reply) {
        try { this.analytics.track('ai_chat_failed', { surface: 'home', stage: res.ok ? 'empty' : 'http' + res.status }); } catch { /* analytics optional */ }
      }
      const reply = String(data?.reply || 'AI Assistant could not reply right now — try again.');
      this.rolodexAiMessages.push({ from: 'assistant', text: reply });
      void this.sound.playChatReceive();
    } catch (err) {
      const stage = (err as any)?.name === 'TimeoutError' ? 'timeout' : 'network';
      try { this.analytics.track('ai_chat_failed', { surface: 'home', stage }); } catch { /* analytics optional */ }
      this.rolodexAiMessages.push({ from: 'assistant', text: 'AI Assistant could not reply right now — try again.' });
      void this.sound.playChatReceive();
    } finally {
      this.rolodexAiTyping = false;
      this.rolodexAiBusy = false;
      this.scrollChatToBottom();
    }
  }

  /** 2026-09-13 BUILD 189: engine choice cached per session — the pre-flight
   *  used to cost a roundtrip before EVERY message; the backend ladder
   *  handles fallbacks anyway, so one check per session is plenty. */
  private chatEngineCache: string | null = null;
  private async chatEngine(): Promise<string> {
    if (this.chatEngineCache) return this.chatEngineCache;
    try {
      const s = await this.draftEngine.aiStatus();
      this.chatEngineCache = s.grokConfigured && !s.deepseekConfigured ? 'grok' : 'deepseek';
    } catch { this.chatEngineCache = 'deepseek'; }
    return this.chatEngineCache;
  }

  /** 2026-08-23: Enter sends; Shift+Enter makes a new line in the auto-grow box. */
  onChatEnter(event: Event): void {
    const kbd = event as KeyboardEvent;
    if (!kbd.shiftKey) {
      kbd.preventDefault();
      void this.sendRolodexAi();
    }
  }

  /**
   * 2026-08-29 BUILD 143 (founder #2): the PROACTIVE ASSISTANT. When the user
   * mentions a person in the Assistant, it does not just sit waiting for the
   * backend — it checks the card's context and throws up a few lines itself:
   * a perfunctory starter draft when the card knows the story, and when the
   * card is thin, the loop-o-meter plus a polite "I told ya" — the alibi is
   * the user's own missing background. (Called before the history is built;
   * these lines stay out of the backend AI's context.)
   */
  private proactiveAssist(text: string): void {
    const needle = text.toLowerCase();
    const mentioned = this.contacts.find((c) => {
      if ((c as any).isMockData) return false;
      const name = String(c?.name?.display || '').toLowerCase();
      return name.length > 2 && needle.includes(name);
    });
    if (!mentioned) return;
    const name = mentioned.name?.display || 'them';
    const r = (mentioned as any).rolodex || {};
    const filled = [r.where, r.when, r.who, r.why, r.topic, r.personalTidbits]
      .filter((v: any) => v && String(v).trim()).length;
    // The perfunctory starter — always something, per the founder.
    const draft = this.draftEngine.compose(mentioned, 'follow-up');
    this.rolodexAiMessages.push({ from: 'assistant', text: `${draft}` });
    if (filled < 2) {
      // The card is thin: show the loop-o-meter and the polite "I told ya".
      const meter = ['where', 'when', 'who', 'why', 'topic']
        .map((k) => `${r[k] && String(r[k]).trim() ? '\u25CF' : '\u25CB'} ${k}`)
        .join('  ');
      this.rolodexAiMessages.push({
        from: 'assistant',
        text: `Loop-o-meter for ${name}: ${meter}\nFill the card's W's and I'll write like I've actually met them. I told ya — the background was mine to ask for.`,
      });
    }
    this.scrollChatToBottom();
  }

  /** 2026-08-23: keep the latest message in view. */
  private scrollChatToBottom(): void {
    requestAnimationFrame(() => {
      const el = this.chatThread?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  /** 2026-08-23: send a good reply to a card — LoopKeeper search, device, or copy. */
  async sendRolodexAiToCard(rawText: string): Promise<void> {
    // 2026-08-26 DRAFT SHAPE: the copy/card path must never carry the
    // Assistant's framing — only the promised message.
    const text = this.draftEngine.extractDraftText(rawText);
    if (!text?.trim()) {
      void this.alertsService.showToast('Oops, AI Assistant is waiting for you before it can respond.', 2500);
      return;
    }
    const sheet = await this.actionSheet.create({
      header: 'Send this draft?',
      subHeader: 'To a LoopKeeper card, your device contacts, or copy it into another app.',
      buttons: [
        { text: 'COPY', icon: 'copy-outline', handler: () => this.copyRolodexAi(text) },
        { text: 'LoopKeeper card', icon: 'search-outline', handler: () => void this.openAiCardSearch(text) },
        { text: 'Device contacts', icon: 'phone-portrait-outline', handler: () => void this.openAiDeviceContact(text) },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  /** 2026-08-23: LoopKeeper path — the home search bar/sheet picks the card. */
  async openAiCardSearch(text: string): Promise<void> {
    if (!text?.trim()) {
      void this.alertsService.showToast('Oops, AI Assistant is waiting for you before it can respond.', 2500);
      return;
    }
    const modal = await this.modalController.create({
      component: SearchModalComponent,
      componentProps: { contacts: this.contacts },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95, 1],
      initialBreakpoint: 0.95,
      keyboardClose: false,
    });
    await modal.present();
    const res = await modal.onDidDismiss();
    if (res?.data?.contact) this.openComposerForAiDraft(res.data.contact, text);
  }

  /** 2026-08-23: DEVICE path — the browser contact picker chooses the person. */
  async openAiDeviceContact(text: string): Promise<void> {
    if (!text?.trim()) {
      void this.alertsService.showToast('Oops, AI Assistant is waiting for you before it can respond.', 2500);
      return;
    }
    const picker = (navigator as any)?.contacts;
    if (!picker?.select) {
      void this.alertsService.showToast('Pick from your phone on Android Chrome — or choose LoopKeeper.', 5000);
      return;
    }
    try {
      const props = ['name', 'email', 'tel', 'address', 'icon'];
      const picked = await picker.select(props, { multiple: false });
      if (!picked?.length) return; // user cancelled
      const raw = picked[0];
      const c = this.mapPickedContact(raw, Date.now(), 0);
      if (raw?.icon instanceof Blob) {
        try {
          c.image.base64String = await new Promise<string | null>((res) => {
            const fr = new FileReader();
            fr.onload = () => res(typeof fr.result === 'string' ? fr.result : null);
            fr.onerror = () => res(null);
            fr.readAsDataURL(raw.icon);
          });
        } catch { /* keep the generated avatar */ }
      }
      this.contacts = [c, ...this.contacts];
      this.onContactsChange(this.contacts);
      this.openComposerForAiDraft(c, text);
    } catch { /* user cancelled the picker */ }
  }

  /** 2026-08-26 PICK CARD → READY TO SEND: opens the chosen contact in the
   *  Confidante composer with the clean draft preloaded. The user can edit it,
   *  tap SEND (SMS / Email / WhatsApp / in-app), or copy it. The draft is also
   *  parked on the card so the card itself knows it was promised. */
  private openComposerForAiDraft(contact: any, text: string): void {
    const clean = this.draftEngine.extractDraftText(text);
    if (!clean?.trim()) {
      void this.alertsService.showToast('Oops, AI Assistant is waiting for you before it can respond.', 2500);
      return;
    }
    const idx = this.contacts.findIndex((c) => c.contactId === contact.contactId);
    if (idx >= 0) {
      const updated: any = {
        ...this.contacts[idx],
        rolodex: { ...(this.contacts[idx].rolodex || {}), draftMessage: clean, draftAt: new Date().toISOString() },
      };
      this.contacts[idx] = updated;
    }
    void this.modalController.create({
      component: ConfidanteComposerModalComponent,
      componentProps: {
        contact,
        occasion: 'follow-up',
        initialDraft: clean,
        initialInstruction: 'Refine it if you like — then choose how to send it.',
      },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95, 1],
      initialBreakpoint: 0.95,
      keyboardClose: false,
    }).then((m) => m.present());
  }

  /** Copy the draft (never the Assistant commentary around it). */
  async copyRolodexAi(rawText: string): Promise<void> {
    const text = this.draftEngine.extractDraftText(rawText);
    if (!text?.trim()) {
      void this.alertsService.showToast('Oops, AI Assistant is waiting for you before it can respond.', 2500);
      return;
    }
    // 2026-09-14 BUILD 194 THE SIGNAL DETECTOR: the chat's copy door is one of
    // the ENDS of the user-AI conversation — the words leaving the chat are a
    // measurable outcome, whether or not a send ever follows.
    try { this.analytics.track('send_exit', { channel: 'copy', surface: 'chat' }); } catch { /* analytics optional */ }
    try {
      await navigator.clipboard.writeText(text);
      await this.alertsService.showToast('Draft copied', 1800);
    } catch {
      await this.alertsService.showToast('Could not copy — select the text manually', 2500);
    }
  }

  /** 2026-08-21: the header R icon re-opens the inline AI Assistant chat.
   *  2026-08-31 BUILD 161 (founder: the Search fab must come back): closing
   *  the inbox DESTROYS it — a destroyed component can no longer emit its
   *  retract, so the expanded mirror resets at every close/reopen here. */
  openRolodexAiChat(): void {
    this.rolodexAiChatOpen = !this.rolodexAiChatOpen;
    this.inboxExpanded = false;
  }

  /** 2026-08-26 SETTINGS/INBOX SWAP: Settings is about to open. If the Inbox is
   *  open, remember that and close it so Settings gets an unimpeded viewport. */
  onRolodexSettingsWillOpen(): void {
    this.inboxWasOpenBeforeSettings = this.rolodexAiChatOpen;
    if (this.rolodexAiChatOpen) {
      this.rolodexAiChatOpen = false;
      this.inboxExpanded = false; // BUILD 161: destroyed inbox cannot emit its retract
    }
  }

  /** 2026-08-26 SETTINGS/INBOX SWAP: Settings closed. Restore the Inbox if it
   *  was open before Settings interrupted it. */
  onRolodexSettingsClosed(): void {
    if (this.inboxWasOpenBeforeSettings) {
      this.rolodexAiChatOpen = true;
      this.inboxExpanded = false; // BUILD 161: fresh instance starts collapsed
    }
    this.inboxWasOpenBeforeSettings = false;
  }

  closeRolodexAiChat(): void {
    this.rolodexAiChatOpen = false;
    this.inboxExpanded = false; // BUILD 161: same leak — reset at every close
  }

  /** 2026-08-22 THE ROLODEX THAT REMEMBERS: after any send, update the card on
   *  device so next time is easier — no user effort, no server round-trip. */
  private applyAssistantCardUpdate(ev: AssistantCardUpdate): void {
    const idx = this.contacts.findIndex((c) => c.contactId === ev.contactId);
    if (idx < 0) return;
    const now = new Date();
    const old = this.contacts[idx];
    const updated: any = {
      ...old,
      rolodex: { ...(old.rolodex || {}) },
      lastInteraction: now,
      updatedAt: now,
      nextInteraction: new Date(now.getTime() + 7 * 86400000),
    };
    updated.rolodex.when = now.toISOString().slice(0, 10);
    updated.rolodex.outcome = 'Message sent via ' + ev.medium;
    updated.rolodex.followUp = updated.rolodex.followUp || 'Waiting for reply — nudge if silence.';
    if (ev.text) {
      const tidbits = Array.isArray(updated.rolodex.personalTidbits) ? updated.rolodex.personalTidbits : [];
      updated.rolodex.personalTidbits = [ev.text.slice(0, 140), ...tidbits].slice(0, 3);
    }
    this.contacts = this.contacts.map((c, i) => (i === idx ? updated : c));
    this.onContactsChange(this.contacts);
    void this.alertsService.showToast('Card updated for next time', 1600);
  }

  /** The Contact Picker API (navigator.contacts) - browser-level, consent-based,
   *  exactly how Teams/Zoom handle contacts on the web. One-by-one picking. */
  /**
   * 2026-08-18 FULL ANDROID/iOS -> ROLODEX MAPPING: the Contact Picker's raw
   * shape ({ name, tel[], email[], address, icon }) is mapped into a COMPLETE
   * ContactInfo - every field the app functions read gets a value or a sane
   * default, so a device contact is fully subject to the follow-up engine,
   * the relationship monitor, the 4 W's, the reminders and the chat - never
   * a partial stub (the legacy Zyppar mapper did exactly this; this is its
   * Rolodex counterpart, including the picker's address + photo icon).
   */
  private mapPickedContact(raw: any, index: number, when: number): any {
    // 2026-08-18: the picker's canonical ContactName shape is
    // { formatted, givenName, familyName, middleName, honorificPrefix,
    //   honorificSuffix } - map through the EXISTING NamePayload fields
    // (display/given/middle/family/prefix/suffix), never invent new keys.
    // 2026-08-18 HARDENED: the name can arrive as a string, a structured
    // object, OR an array of either (some Android/WebKit builds). Also fall
    // back to raw displayName/nickname and finally to the phone/email so a
    // real contact never degrades to 'Picked contact N'.
    const rawName = raw?.name;
    const nameSources: any[] = Array.isArray(rawName) ? rawName : (rawName ? [rawName] : []);
    const nameObj = nameSources.find((n: any) => typeof n === 'object' && n !== null) || null;
    const nameString = nameSources
      .map((n: any) => (typeof n === 'string' ? n : (n?.formatted || n?.displayName || n?.display || n?.fullName || n?.name || '')))
      .filter(Boolean)
      .join(' ')
      .trim();
    const namePrefix = nameObj ? String(nameObj.honorificPrefix || nameObj.prefix || '').trim() : '';
    const nameGiven = nameObj ? String(nameObj.givenName || nameObj.given || '').trim() : '';
    const nameMiddle = nameObj ? String(nameObj.middleName || nameObj.middle || '').trim() : '';
    const nameFamily = nameObj ? String(nameObj.familyName || nameObj.family || '').trim() : '';
    const nameSuffix = nameObj ? String(nameObj.honorificSuffix || nameObj.suffix || '').trim() : '';
    const nameFormatted = nameObj ? String(nameObj.formatted || nameObj.displayName || nameObj.display || nameObj.fullName || nameObj.name || '').trim() : '';
    const joined = [namePrefix, nameGiven, nameMiddle, nameFamily, nameSuffix].filter(Boolean).join(' ');
    // phones/emails are needed for the nameless fallback, so normalize them first.
    const tel = Array.isArray(raw?.tel)
      ? raw.tel.filter(Boolean).map((n: any) => (typeof n === 'object' && n !== null ? String(n?.number || n?.value || '') : String(n))).filter(Boolean)
      : [];
    const emails = Array.isArray(raw?.email)
      ? raw.email.filter(Boolean).map((a: any) => (typeof a === 'object' && a !== null ? String(a?.address || a?.value || '') : String(a))).filter(Boolean)
      : [];
    const fallbackName = String(raw?.displayName || raw?.nickname || raw?.formattedName || '').trim();
    const display = (nameFormatted || nameString || joined || fallbackName || tel[0] || emails[0] || 'Picked contact ' + (index + 1)).trim();
    const parts = display.trim().split(/\s+/);
    // 2026-08-18: the picker can hand back the address as a STRING or an
    // ARRAY of address objects - normalize to a typed postalAddresses list
    // (never a leaked '[object ContactAddress]').
    const rawAddr = raw?.address;
    const addrList = Array.isArray(rawAddr) ? rawAddr : rawAddr ? [rawAddr] : [];
    const addr = addrList
      .filter(Boolean)
      .map((a: any) => {
        const isObj = typeof a === 'object' && a !== null;
        return {
          type: 'home' as any,
          street: isObj ? this.pickAddressPart(a?.street || a?.streetAddress || a?.formattedAddress || a?.address || a?.line1 || '') : this.pickAddressPart(a),
          neighborhood: isObj ? this.pickAddressPart(a?.neighborhood || '') : '',
          city: isObj ? this.pickAddressPart(a?.city || '') : '',
          region: isObj ? this.pickAddressPart(a?.region || a?.state || '') : '',
          country: isObj ? this.pickAddressPart(a?.country || '') : '',
          postcode: isObj ? this.pickAddressPart(a?.postalCode || a?.postcode || '') : '',
        };
      })
      .filter((x: any) => x.street);
    return {
      contactId: 'picked-' + when + '-' + index,
      name: {
        display,
        // the picker's structured names fill the model fields directly;
        // the split-of-display remains only as the string-name fallback
        given: nameGiven || parts[0] || '',
        middle: nameMiddle,
        family: nameFamily || parts.slice(1).join(' ') || '',
        prefix: namePrefix,
        suffix: nameSuffix,
      },
      // 2026-08-18 the legacy Zyppar deviceToContactInfo used phones/emails
      // (the Capacitor payload names the model + card render) - NOT
      // phoneNumbers/emailAddresses. The card shows phones[0]/emails[0].
      phones: tel.map((n: string, i: number) => ({
        number: n,
        type: 'mobile' as any,
        isPrimary: i === 0,
        label: null,
      })),
      emails: emails.map((a: string, i: number) => ({
        address: a,
        type: 'personal' as any,
        isPrimary: i === 0,
        label: null,
      })),
      postalAddresses: addr, // 2026-08-18: addr is already the typed list
      organization: { company: '', jobTitle: '', department: '' },
      birthday: null,
      note: '',
      urls: [],
      image: { base64String: null },
      rolodex: {
        when: '',
        where: '',
        who: '',
        why: '',
        how: '',
        topic: '',
        followUp: '',
        personalTidbits: '',
        outcome: '',
        priority: 'medium' as const,
        contactFrequency: 'weekly' as const, // so the follow-up engine adopts them
        references: [],
      },
      socialProfiles: {},
      tags: [],
      groups: [],
      privacy: { level: 'private' as any, sharedWith: [] },
      sharedBy: [],
      lastInteraction: null,
      nextInteraction: null,
      reminders: [],
      appointments: [],
      isMockData: false,
      isContactInfo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: { refreshContacts: false, notificationPreference: 'email' as any },
    };
  }

  /** 2026-08-18 ADDRESS SAFETY: only strings/numbers become visible text;
   *  an object-valued field is dropped, never stringified into "[object …]". */
  private pickAddressPart(v: any): string {
    if (v == null) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return '';
  }

  /** 2026-09-01 BUILD 175: skipPreface — when the caller is the add sheet's
   *  phone tab, that tab already showed the honest preface copy; a second
   *  alert before the picker would be a stutter (and it costs user
   *  activation, which the Contact Picker API insists on). */
  async addFromPhoneContacts(skipPreface = false): Promise<void> {
    const picker = (navigator as any)?.contacts;
    if (!picker?.select) {
      void this.alertsService.showToast(this.translate.instant('loopkeeper.add.pickToast'), 5000);
      return;
    }
    // 2026-09-01 BUILD 169: speak BEFORE the OS picker. Startups don't get
    // Google's pass on the address book — the sentence belongs at the ask.
    if (!skipPreface) {
      const PREFACE_KEY = 'loopkeeper_picker_preface_seen';
      try {
        const seen = await this.storageService.get<boolean>(PREFACE_KEY);
        if (!seen) {
          const go = await this.presentPickerPreface();
          if (!go) return;
          await this.storageService.set(PREFACE_KEY, true);
        }
      } catch { /* if storage fails, still offer the picker */ }
    }
    try {
      const props = ['name', 'email', 'tel', 'address', 'icon'];
      const picked = await picker.select(props, { multiple: true });
      const when = Date.now();
      const mapped: any[] = [];
      for (let i = 0; i < (picked || []).length; i++) {
        const raw = picked[i];
        const c = this.mapPickedContact(raw, i, when);
        // the picker may supply a photo blob (icon) - read it into the card image
        if (raw?.icon instanceof Blob) {
          try {
            c.image.base64String = await new Promise<string | null>((res) => {
              const fr = new FileReader();
              fr.onload = () => res(typeof fr.result === 'string' ? fr.result : null);
              fr.onerror = () => res(null);
              fr.readAsDataURL(raw.icon);
            });
          } catch { /* keep the generated avatar */ }
        }
        mapped.push(c);
      }
      if (!mapped.length) return; // user cancelled
      const fromCanvas = this.ftView === 'phone';
      this.contacts = [...mapped, ...this.contacts]; // 2026-08-18 prepend: the deck's first batch shows the new card
      this.onContactsChange(this.contacts);
      // BUILD 310: the pick opens the words on the blank page. It does not
      // reveal the home, and it does not stop on a Who card.
      if (fromCanvas) this.openFtFlow('card', mapped[0]);
      // 2026-08-31 BUILD 159 (founder): their list has begun — once ever.
      void this.analytics.trackListStartedOnce('picker');
      if (!fromCanvas) void this.alertsService.showToast(
        this.translate.instant('loopkeeper.add.stayToast', { n: mapped.length }),
        4200);
    } catch {
      /* user cancelled the picker */
    }
  }

  /** One screen before the OS contact picker — why, what stays, what never happens.
   *  2026-09-01 BUILD 180 (founder): the phone's own picker dialog then says the
   *  contacts "will be shared with zyppar.com" - the browser's standard wording,
   *  which reads as a false claim and contradicts our assurances. We cannot
   *  reword or restyle that dialog, so the preface defuses it before it shows. */
  private async presentPickerPreface(): Promise<boolean> {
    const a = await this.alertController.create({
      header: this.translate.instant('loopkeeper.add.prefaceTitle'),
      message: this.translate.instant('loopkeeper.add.prefaceBody')
        + '\n\n' + this.translate.instant('loopkeeper.add.sysNote'),
      buttons: [
        { text: this.translate.instant('loopkeeper.t.btnCancel'), role: 'cancel' },
        { text: this.translate.instant('loopkeeper.add.pickPhone'), role: 'ok' },
      ],
    });
    await a.present();
    const { role } = await a.onDidDismiss();
    return role === 'ok';
  }

  /**
   * 2026-08-31 BUILD 159 (founder): the walk's MINE door. A first-timer walked
   * a demo name to the Send stage and tapped MINE — their own people, post
   * haste. One tap where the device offers it: the Contact Picker opens
   * directly. Without the picker (desktop, denied) the add sheet answers in
   * the user's language. Any pick lands back on the walk's Who card (the walk
   * snapshots its deck before we open the picker and absorbs what is new).
   */
  async channelAddFromWalk(): Promise<void> {
    const picker = (navigator as any)?.contacts;
    if (picker?.select) {
      await this.addFromPhoneContacts();
      return;
    }
    await this.onCreateContact();
  }

  /**
   * 2026-09-01 BUILD 179 (founder): the walk's "Not this one" — "Who's on
   * your mind" — presents the SAME agnostic interface as the add icon, all
   * the way to the iPhone mitigations. One sheet, two tabs, every deck:
   * the people tab (whatever the deck holds, demos included, full search),
   * the phone tab (Contact Picker on Android; the honest iPhone ladder —
   * one-at-a-time typing plus the 3-step .vcf visual — where Apple walls
   * the address book off). Every outcome arms the walk's Who card:
   * - row tap      -> nudgeArrived routes the contact into the walk
   * - picker/.vcf  -> the contact joins the deck; the walk's own watcher
   *                    fronts the fresh arrival as the Who (build 159)
   * - type one in  -> the declared create form; same absorption on save
   */
  async channelWhoFromWalk(): Promise<void> {
    const modal = await this.modalController.create({
      component: SearchModalComponent,
      componentProps: {
        contacts: this.contacts,
        addDoors: true,
        pickerAvailable: !!((navigator as any)?.contacts?.select),
      },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95, 1],
      initialBreakpoint: 1,
      keyboardClose: false,
    });
    await modal.present();
    const res = await modal.onWillDismiss();
    if (res?.role === 'phone') { void this.addFromPhoneContacts(true); return; }
    if (res?.role === 'vcf') { this.importVcfContacts(res.data?.contacts || []); return; }
    if (res?.role === 'manual') {
      this.manualDraft = {} as ContactInfo;
      this.manualAddOpen = true;
      return;
    }
    // A row tap in the people tab: this person is the next Who — same doors
    // as arming by hand (BUILD 242: an open loop's card takes over and the walk
    // lands on it; a bare contact's card takes over too). Not the add-icon's
    // open-a-card behavior.
    if (res?.data?.contact) this.inboxRef?.nudgeArrived(res.data.contact);
  }

  onAcceptAutoSort() {
    this.autoSortStarted = false;
  }

  onRestartAutoSort() {
    this.autoSortStarted = true;
  }

  onCancelAutoSort() {
    this.autoSortStarted = false;
  }

  onResetFilters() {
    this.selectedFilter = 'all';
    this.selectedGroup = 'all';
  }

  onToggleTheme(dark: boolean) {
    document.body.classList.toggle('dark', dark);
  }

  onToggleNotifications(enabled: boolean) {
    !environment.production && console.log('Notifications:', enabled ? 'on' : 'off');
  }

  onChangeLanguage(lang: string) {
    this.selectedLanguage = lang;
  }

  onChangeFontSize(size: string) {
    this.selectedFontSize = size;
  }

  async onGoToPrivacySettings() {
    // 2026-08-18 REAL PRIVACY CENTER (was a console.log dummy).
    const modal = await this.modalController.create({
      component: PrivacySettingsModalComponent,
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95],
      initialBreakpoint: 0.95,
      keyboardClose: false,
    });
    await modal.present();
  }

  onShowAbout() {
    !environment.production && console.log('About Rolodex');
  }
}
