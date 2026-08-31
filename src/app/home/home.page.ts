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
import { mockContacts } from '../data/mock-contacts';
import { StorageService } from '../services/storage/storage.service';
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
// 2026-08-30 BUILD 155 (founder: demo contacts must be excluded from every process when Demo is off).
import { LoopsService } from '../services/loops/loops.service';


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
   *  escalate THROUGH it (armed loop + destination pill + open Loops tab). */
  @ViewChild('inboxRef') inboxRef?: LoopInboxComponent;
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
  loading: boolean = false;
  /** 2026-08-21 OPENLOOP CHAT: the AI Assistant above the deck — the first face. */
  rolodexAiChatOpen = true;
  /** 2026-08-29 BUILD 145 (founder): true while the inbox shell is expanded —
   *  the deck's View toolbar sits up as a footer for the duration. */
  inboxExpanded = false;
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
   *  2026-08-17: 'Start exploring' in the demo hands off to the live tour. */
  async presentWelcome(isReplay = false) {
    try {
      if (await this.storageService.get<string>(WELCOME_DISMISSED_KEY)) return; // 2026-08-18 IndexedDB
      const modal = await this.modalController.create({
        component: WelcomeModalComponent,
        componentProps: { isReplay },
        cssClass: 'card-chat-modal-sheet',
        // 2026-08-27 SHEET-FIT FIX: add breakpoint 1 — the pledge+copy outgrew
        // the 0.95 fold, so users need a way to expand fully instead of
        // fighting the drag gesture against an unreachable bottom edge.
        breakpoints: [0, 0.7, 0.95, 1],
        initialBreakpoint: 0.95,
        keyboardClose: false,
      });
      await modal.present();
      const res = await modal.onDidDismiss();
      if (res?.role === 'taste') void this.openTasteFlow();
      else if (res?.role === 'start') void this.openHelp();
    } catch { /* quiet */ }
  }

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
    void this.presentWelcome(true);
  }

  /** 2026-08-29 BUILD 143 (founder #1): the invite hand-off hosts the FULL
   *  Welcome package — the first-time tour, never the "Welcome Again" replay
   *  variant. A brand-new invitee who CONFIRMS lands here; certainty, not a
   *  maybe. (Settings' deliberate replay keeps showWelcomeAgain/isReplay.) */
  async presentFullWelcome(): Promise<void> {
    try { await this.storageService.remove(WELCOME_DISMISSED_KEY); } catch { /* ignore */ }
    void this.presentWelcome(false);
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
    // 2026-08-17 THE DROPBOX MOMENT: an invite link opened us.
    void this.presentInviteLanding();
    // 2026-08-16 WELCOME AGAIN: the demo tour on init (unless dismissed).
    void this.presentWelcome();
    // 2026-08-22 THE ROLODEX THAT REMEMBERS: any send path updates the card on device.
    this.assistantCard.updates$.subscribe((ev) => this.applyAssistantCardUpdate(ev));
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
    });
    this.dockTapSub = this.inAppNotifications.tapped$.subscribe((n) => {
      if (n?.data?.action === 'checkin') this.escalateCheckIn(n.data);
    });

    await this.loadContacts();
    await this.runAutomation();

    // 2026-08-16: when the server is the chosen home, restore the full list
    // from it (fall back to the local list when the server has nothing).
    if (this.storageLocation === 'rolodex-server') {
      const restored = await this.rolodexSync.restore();
      if (restored && restored.length) {
        this.contacts = restored;
        this.loading = false;
        this.rolodexSync.push(this.realContacts());
      }
    }
  }

  ngOnDestroy(): void {
    if (this.headerTimer) clearInterval(this.headerTimer);
    // 2026-08-29 BUILD 143: release the nudge-tap channels.
    this.notifTapSub?.unsubscribe();
    this.dockTapSub?.unsubscribe();
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
      const loopId = envelope.ok ? envelope.output?.id : undefined;

      // 2026-08-29 BUILD 151 (founder: "I tap, and it is not evident that
      // anything happens immediately"): the tap now ANSWERS — a chime at the
      // instant of the tap, a toast naming the destination, and after the
      // inbox opens the view travels to the armed loop. Silence was the bug.
      void this.sound.playLoopCapture();
      void this.alertsService.showToast(
        name ? this.translate.instant('loopkeeper.capture.reachingOut', { name }) : 'Loops',
        2600);

      // Open the inbox on the Loops tab, arm the destination, select the loop.
      // 2026-08-30 BUILD 153 (founder: "it must get priority to viewport…
      // in Settings and tap the prompt - it only shuts down Settings, and
      // does no more"): the escalation now TAKES the screen — it leaves
      // Settings (the deck returns to its regular view), pulls the home
      // scroller to the top so the inbox leads the viewport from any scroll
      // position, then travels to the armed loop with a second pass as a
      // safety net for slow first renders.
      try { this.rolodexComp?.showRegularView(); } catch { /* deck not mounted */ }
      void this.homeContent?.scrollToTop(0);
      window.scrollTo({ top: 0, behavior: 'auto' }); // native scroller parity
      this.rolodexAiChatOpen = true;
      const travel = (): void => {
        const inbox = this.inboxRef;
        if (!inbox) return;
        // 2026-08-30 BUILD 157: the escalation routes through nudgeArrived —
        // the walk (default surface) takes the armed loop straight to the
        // words; the packed shelf keeps its own arm-and-select path.
        inbox.tab = 'loops';
        inbox.nudgeArrived(contact || null, loopId || undefined);
        void this.sound.playLoopReady();
      };
      setTimeout(travel, 320); // let *ngIf render the inbox first
      setTimeout(travel, 800); // second pass: first render still settling
    } catch { /* a dead nudge is still better than a crash */ }
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
      const restored = await this.rolodexSync.restore();
      if (restored && restored.length) {
        this.contacts = restored;
        this.loading = false;
        this.rolodexSync.push(this.realContacts());
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
    if (res?.data?.contact) this.onContactTap(res.data.contact);
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
    return this.mockEnabled ? [...real, ...mockContacts] : real;
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
        this.contacts = this.mockEnabled ? [...realPersisted, ...mockContacts] : realPersisted;
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
        await this.contactsSyncService.automateContactSetup(this.contacts);
      }
    } catch {
      this.contacts = this.mockEnabled ? mockContacts : [];
      await this.contactsSyncService.automateContactSetup(this.contacts);
    }
    this.loading = false;
    // 2026-08-16 DEMO SYNC: the moment contacts are ready, talk to the fresh
    // rolodex database — the investor peek view shows this device LIVE.
    // 2026-08-27 HONEST STORAGE TABS: real cards only — demo filler never
    // leaves the device, matching the pane's promise verbatim.
    this.rolodexSync.push(this.realContacts());
  }

  /** Run the full automation pipeline — follow-ups, birthdays, health scoring. */
  async runAutomation() {
    if (this.contacts.length === 0) return;

    // Follow-up engine: schedule recurring check-ins
    this.followUpReport = await this.followUpEngine.run(this.contacts);
    this.followUpOverdue = this.followUpReport.overdue;

    // Relationship health scoring
    this.relationshipScores = this.relationshipMonitor.suggestReachOut(this.contacts, 5);
    await this.relationshipMonitor.scheduleHealthCheck();

    // Birthday reminders
    const bdayReport = await this.birthdayReminder.processUpcomingBirthdays(this.contacts);
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
    this.relationshipScores = this.relationshipMonitor.suggestReachOut(this.contacts, 5);
  }

  getDormantCount(): number {
    return this.relationshipMonitor.findDormant(this.contacts).length;
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

  /** Push the real deck to the LoopKeeper server and record the evidence. */
  async serverPush(): Promise<void> {
    this.serverBusy = true;
    try {
      await this.rolodexSync.push(this.realContacts());
      const now = new Date().toISOString();
      this.serverLastPushed = now;
      try { await this.storageService.set('loopkeeper_server_last_push', now); } catch { /* best effort */ }
      await this.alertsService.showToast('Pushed to the LoopKeeper server', 2800);
    } finally {
      this.serverBusy = false;
    }
  }

  /** Pull this device's list back from the server (or say plainly there is
   *  nothing there - never silently pretend). */
  async serverPull(): Promise<void> {
    this.serverBusy = true;
    try {
      const restored = await this.rolodexSync.restore();
      if (restored && restored.length) {
        this.contacts = restored;
        const now = new Date().toISOString();
        this.serverLastPulled = now;
        try { await this.storageService.set('loopkeeper_server_last_pull', now); } catch { /* best effort */ }
        await this.alertsService.showToast('Restored ' + restored.length + ' cards from the server', 3200);
        await this.runAutomation();
      } else {
        await this.alertsService.showToast('The server has nothing for this device yet — push first', 3200);
      }
    } finally {
      this.serverBusy = false;
    }
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

  onContactsChange(contacts: ContactInfo[]) {
    this.contacts = contacts;
    this.persistContacts(contacts); // 2026-08-18: real contacts survive a reload
    this.rolodexSync.push(this.realContacts()); // 2026-08-16: the server home updates live
    void this.rolodexAiNudge(contacts); // 2026-08-18: the agent never sits comatose
  }

  /** 2026-08-18 THE ALGORITHMIC AGENT NUDGE: when contacts are added without
   *  the 4 W's, RolodexAI says so instead of silently filing them. */
  private async rolodexAiNudge(contacts: ContactInfo[]): Promise<void> {
    try {
      const noContext = (contacts || []).filter((c: any) => !(c?.rolodex?.where || c?.rolodex?.why || c?.rolodex?.topic));
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
    const sheet = await this.alertController.create({
      header: this.translate.instant('loopkeeper.add.title'),
      message: this.translate.instant('loopkeeper.add.msg'),
      buttons: [
        { text: this.translate.instant('loopkeeper.add.pickPhone'), handler: () => { void this.addFromPhoneContacts(); } },
        { text: this.translate.instant('loopkeeper.add.typeOne'), handler: () => { void this.openManualContactEntry(); } },
        { text: this.translate.instant('loopkeeper.t.btnCancel'), role: 'cancel' },
      ],
    });
    await sheet.present();
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

  /** 2026-08-21 OPENLOOP CHAT: send to the real chat proxy and render the reply. */
  async sendRolodexAi(): Promise<void> {
    const text = this.rolodexAiInput.trim();
    if (!text || this.rolodexAiBusy) return;
    this.rolodexAiInput = '';
    this.rolodexAiMessages.push({ from: 'user', text });
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
      let engine = 'deepseek';
      try {
        const s = await this.draftEngine.aiStatus();
        engine = s.grokConfigured && !s.deepseekConfigured ? 'grok' : 'deepseek';
      } catch { /* default deepseek; backend falls back */ }
      const history = this.rolodexAiMessages
        .map((m) => ({ role: m.from === 'user' ? 'user' as const : 'assistant' as const, content: m.text }));
      const res = await fetch(`${environment.rolodexApiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine, messages: history }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = String(data?.reply || 'AI Assistant could not reply right now — try again.');
      this.rolodexAiMessages.push({ from: 'assistant', text: reply });
      void this.sound.playChatReceive();
    } catch {
      this.rolodexAiMessages.push({ from: 'assistant', text: 'AI Assistant could not reply right now — try again.' });
      void this.sound.playChatReceive();
    } finally {
      this.rolodexAiTyping = false;
      this.rolodexAiBusy = false;
      this.scrollChatToBottom();
    }
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
    try {
      await navigator.clipboard.writeText(text);
      await this.alertsService.showToast('Draft copied', 1800);
    } catch {
      await this.alertsService.showToast('Could not copy — select the text manually', 2500);
    }
  }

  /** 2026-08-21: the header R icon re-opens the inline AI Assistant chat. */
  openRolodexAiChat(): void {
    this.rolodexAiChatOpen ? this.rolodexAiChatOpen = false : this.rolodexAiChatOpen = true;
  }

  /** 2026-08-26 SETTINGS/INBOX SWAP: Settings is about to open. If the Inbox is
   *  open, remember that and close it so Settings gets an unimpeded viewport. */
  onRolodexSettingsWillOpen(): void {
    this.inboxWasOpenBeforeSettings = this.rolodexAiChatOpen;
    if (this.rolodexAiChatOpen) this.rolodexAiChatOpen = false;
  }

  /** 2026-08-26 SETTINGS/INBOX SWAP: Settings closed. Restore the Inbox if it
   *  was open before Settings interrupted it. */
  onRolodexSettingsClosed(): void {
    if (this.inboxWasOpenBeforeSettings) {
      this.rolodexAiChatOpen = true;
    }
    this.inboxWasOpenBeforeSettings = false;
  }

  closeRolodexAiChat(): void {
    this.rolodexAiChatOpen = false;
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

  async addFromPhoneContacts(): Promise<void> {
    const picker = (navigator as any)?.contacts;
    if (!picker?.select) {
      void this.alertsService.showToast(this.translate.instant('loopkeeper.add.pickToast'), 5000);
      return;
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
      this.contacts = [...mapped, ...this.contacts]; // 2026-08-18 prepend: the deck's first batch shows the new card
      this.onContactsChange(this.contacts);
      // 2026-08-31 BUILD 159 (founder): their list has begun — once ever.
      void this.analytics.trackListStartedOnce('picker');
      void this.alertsService.showToast(mapped.length + ' contact' + (mapped.length === 1 ? '' : 's') + ' added from your phone.', 4000);
    } catch {
      /* user cancelled the picker */
    }
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
