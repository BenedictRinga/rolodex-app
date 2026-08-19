import { Component, DestroyRef, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { ContactInfo } from '../../models/contacts';
import { CalendarEvent } from '../../services/event/event.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { EventService } from '../../services/event/event.service';
import { PagemanagerService, RolodexView } from '../../services/pagemanager/pagemanager.service';
import { StorageService } from '../../services/storage/storage.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Capacitor } from '@capacitor/core';
import type { CloudProvider } from '../../services/cloud-sync/sync.types';
import { ModalController, AlertController } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardChatService } from '../../services/card-chat/card-chat.service';
import { PhotoService } from '../../services/photo/photo.service';
import { RolodexSyncService } from '../../services/rolodex-sync/rolodex-sync.service';
import { SecurityService } from '../../services/security/security.service';
import { PodsModalComponent } from '../pods-modal/pods-modal.component';
import { RemindersModalComponent } from '../reminders-modal/reminders-modal.component';
import { AboutRolodexComponent } from '../about-rolodex/about-rolodex.component';
import { BillingModalComponent } from '../billing-modal/billing-modal.component';
import { AiSettingsModalComponent } from '../ai-settings-modal/ai-settings-modal.component';
import { DraftEngineService } from '../../services/draft-engine/draft-engine.service';
import { UpdatesService } from '../../services/updates/updates.service';
import { AppInstallService } from '../../services/app-install/app-install.service';
import { TimeNormalizerService } from '../../services/time-normalizer/time-normalizer.service';
import { ShareAppService } from '../../services/share-app/share-app.service';
import { ChatWithRolodexModalComponent } from '../chat-with-rolodex/chat-with-rolodex.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-rolodex',
  templateUrl: './rolodex.component.html',
  styleUrls: ['./rolodex.component.scss'],
  animations: [
    trigger('openClose', [
      state('open', style({ height: 'auto', opacity: 1 })),
      state('closed', style({ height: '0px', opacity: 0 })),
      transition('open <=> closed', [animate('0.3s')]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class RolodexComponent implements OnInit {
  @ViewChild('map', { static: true }) mapElement!: ElementRef;

  @Input() contacts: ContactInfo[] = [];
  @Input() sortedcontacts: ContactInfo[] = [];
  @Input() displayedContacts: ContactInfo[] = [];
  @Input() viewMode: string = 'default';
  @Input() searchQuery: string = '';
  @Input() autoSortStarted: boolean = false;
  @Input() selectedFilter: string = 'all';
  @Input() selectedGroup: string = 'all';
  @Input() mockEnabled: boolean = true;
  @Input() groups: { id: string; name: string }[] = [];

  @Output() sendVoiceMessageEvent = new EventEmitter<{ contact: ContactInfo, message: string }>();
  @Output() scheduleReminderEvent = new EventEmitter<ContactInfo>();
  @Output() sendEmojiEvent = new EventEmitter<{ contact: ContactInfo, emoji: string }>();

  @Output() chatContact = new EventEmitter<ContactInfo>();
  @Output() audioCallContact = new EventEmitter<ContactInfo>();
  @Output() videoCallContact = new EventEmitter<ContactInfo>();
  @Output() scheduleEvent = new EventEmitter<{ contact: ContactInfo, event: CalendarEvent }>();

  @Output() toggleDetails = new EventEmitter<ContactInfo>();
  @Output() editContact = new EventEmitter<ContactInfo>();
  @Output() removeContact = new EventEmitter<ContactInfo>();
  @Output() contactTap = new EventEmitter<ContactInfo>();
  @Output() contactsChange = new EventEmitter<ContactInfo[]>();
  @Output() autoSort = new EventEmitter<void>();
  @Output() loadMoreAutoSort = new EventEmitter<void>();
  @Output() applyFilter = new EventEmitter<void>();
  @Output() applyGroupFilter = new EventEmitter<any>();
  @Output() toggleWelcome = new EventEmitter<void>();
  @Output() showWelcome = new EventEmitter<void>();
  @Output() mockDataRepeat = new EventEmitter<void>();
  @Output() initMap = new EventEmitter<HTMLElement>();
  @Output() createContact = new EventEmitter<void>();

  @Output() acceptAutoSort = new EventEmitter<void>();
  @Output() restartAutoSort = new EventEmitter<void>();
  @Output() cancelAutoSort = new EventEmitter<void>();
  @Output() resetFilters = new EventEmitter<void>();

  @Input() loading: boolean = false;

  @Input() selectedLanguage: string = 'en';
  @Input() selectedFontSize: string = 'medium';

  // Automation insights from HomePage
  @Input() dormantCount: number = 0;
  @Input() overdueCount: number = 0;
  @Input() upcomingBirthdayCount: number = 0;
  @Output() runAutomation = new EventEmitter<void>();

  // Cloud sync state (passed from HomePage)
  @Input() syncProviders: CloudProvider[] = [];
  @Input() syncProviderName: string | null = null;
  @Input() syncConnected: boolean = false;
  @Input() syncHasPassphrase: boolean = false;
  @Input() syncLastPushed: string | null = null;
  @Input() syncLastPulled: string | null = null;
  @Input() syncBusy: boolean = false;

  // Cloud sync actions (emitted up to HomePage)
  @Output() syncConnect = new EventEmitter<string>();
  @Output() syncDisconnect = new EventEmitter<void>();
  @Output() syncSetPassphrase = new EventEmitter<void>();
  @Output() syncPush = new EventEmitter<void>();
  @Output() syncPull = new EventEmitter<void>();
  @Output() syncExportLocal = new EventEmitter<void>();
  @Output() syncImportLocal = new EventEmitter<void>();

  @Output() toggleTheme = new EventEmitter<boolean>();
  @Output() toggleNotifications = new EventEmitter<boolean>();
  @Output() changeLanguage = new EventEmitter<string>();
  @Output() changeFontSize = new EventEmitter<string>();
  @Output() goToPrivacySettings = new EventEmitter<void>();
  @Output() openFaq = new EventEmitter<void>();
  @Output() showAbout = new EventEmitter<void>();

  public RolodexView = RolodexView;
  currentView: string = RolodexView.Regular;
  filterState = 'closed';
  showFilters = false;
  searchResultsVisible = false;

  constructor(
    public pageManager: PagemanagerService,
    private storageService: StorageService,
    private alertService: AlertsService,
    private eventService: EventService,
    private modalController: ModalController,
    private alertController: AlertController,
    private cardChat: CardChatService,
    private destroyRef: DestroyRef,
    private photoService: PhotoService,
    private rolodexSync: RolodexSyncService,
    private security: SecurityService,
    private updatesService: UpdatesService,
    private draftEngine: DraftEngineService,
    private appInstall: AppInstallService,
    private readonly time: TimeNormalizerService,
    private readonly shareAppService: ShareAppService,
  ) { }

  /** 2026-08-16 AI PROVIDER: DeepSeek / Grok / on-device template. */
  async openAiSettings(): Promise<void> {
    const modal = await this.modalController.create({
      component: AiSettingsModalComponent,
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.6, 0.9],
      initialBreakpoint: 0.7,
    });
    await modal.present();
  }

  /** 2026-08-16 THE CONTEXT BANGER: every filter change feeds the Confidante. */
  onApplyFilterContext(): void {
    this.draftEngine.currentFilter = String(this.selectedFilter || 'all');
  }

  /** 2026-08-16 BILLING: the two tiers + Stripe checkout. */
  async openBilling(): Promise<void> {
    const modal = await this.modalController.create({
      component: BillingModalComponent,
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95],
      initialBreakpoint: 0.9,
    });
    await modal.present();
  }

  /** 2026-08-16 SETTINGS MAP: jump to any section - no scrolling in ignorance. */
  scrollTo(id: string): void {
    try {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch { /* ignore */ }
  }

  /** 2026-08-19 HELP DEMO: open Settings and jump straight to a section. */
  openSettingsSection(id: string): void {
    this.showSettingsView();
    setTimeout(() => this.scrollTo(id), 300);
  }

  settingsMapHint(): string {
    return 'Updates · FAQ · Card View · Demo · Reminders · Welcome · AI · Billing · About · Privacy · Cloud Sync · Backup';
  }

  /** 2026-08-16 ABOUT: the app story + the padlocked Investors section. */
  async openAbout(): Promise<void> {
    const modal = await this.modalController.create({
      component: AboutRolodexComponent,
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95],
      initialBreakpoint: 0.9,
    });
    await modal.present();
  }

  /** 2026-08-19 THE INVESTORS PORTAL: dedicated, locked, password NorthStar. */
  async openInvestors(): Promise<void> {
    const modal = await this.modalController.create({
      component: AboutRolodexComponent,
      componentProps: { portalMode: 'investors' },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95, 1],
      initialBreakpoint: 0.95,
    });
    await modal.present();
  }

  /** 2026-08-16 REMINDERS: the section — alarms, follow-ups, birthdays. */
  async openReminders(): Promise<void> {
    const modal = await this.modalController.create({
      component: RemindersModalComponent,
      componentProps: { contacts: this.contacts },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.6, 0.8, 0.9],
      initialBreakpoint: 0.8,
    });
    await modal.present();
  }

  /** 2026-08-16 UPDATES: polite automatic check + critical notice. */
  private readonly UPDATE_ACK_KEY = 'rolodex_update_ack_build';
  updateCurrent: string = this.updatesService.appVersion;
  updateCurrentBuild: number = this.updatesService.appBuild;
  updateServer = '';
  updateServerBuild = 0;
  updateAvailable = false;
  updateChecked = false;
  checkingUpdates = false;
  applyingUpdate = false;
  lastCheckedLabel = '';
  private updateTimer: any = null;
  private promptedBuild = 0;

  /** 2026-08-19: load the acknowledged build BEFORE the first check, so a
   *  user who already tapped "Update now" is not nagged again after reload. */
  private async initUpdates(): Promise<void> {
    try {
      const ack = await this.storageService.get<number>(this.UPDATE_ACK_KEY);
      this.promptedBuild = Number(ack) || 0;
    } catch { /* first run */ }
    await this.refreshUpdatesQuietly();
  }

  /** 2026-08-16: quiet re-check - updates the counter, no alert. */
  async refreshUpdatesQuietly(): Promise<void> {
    this.checkingUpdates = true;
    try {
      const result = await this.updatesService.check();
      this.updateCurrent = result.current;
      this.updateCurrentBuild = result.currentBuild;
      this.updateServer = result.server || '';
      this.updateServerBuild = result.serverBuild || 0;
      this.updateAvailable = result.available;
      this.updateChecked = true;
      this.lastCheckedLabel = 'checked ' + this.time.format(new Date(), 'time');
      // 2026-08-19 UNILATERAL NOTICE: when a new build appears, the app says
      // so itself - no waiting for the user to tap Check. The ack is
      // persistent, so tapping Update now stops the popup for this build.
      if (result.available && result.serverBuild > this.promptedBuild) {
        this.promptedBuild = result.serverBuild;
        await this.presentUpdatePrompt();
      }
    } catch { /* quiet */ } finally {
      this.checkingUpdates = false;
    }
  }

  async checkForUpdates(): Promise<void> {
    this.checkingUpdates = true;
    try {
      const result = await this.updatesService.check();
      this.updateCurrent = result.current;
      this.updateCurrentBuild = result.currentBuild;
      this.updateServer = result.server || '';
      this.updateServerBuild = result.serverBuild || 0;
      this.updateAvailable = result.available;
      this.updateChecked = true;
      this.lastCheckedLabel = 'checked ' + this.time.format(new Date(), 'time');
      if (result.available) {
        await this.presentUpdatePrompt();
      } else {
        await this.alertService.alertPrompt({
          header: 'Up to date',
          message: `You're on v${result.current} (build ${result.currentBuild}) — the latest${result.server ? ` (server v${result.server} build ${result.serverBuild})` : ''}.`,
        });
      }
    } finally {
      this.checkingUpdates = false;
    }
  }

  /** 2026-08-18: the update notification says TAP, and the tap does the work —
   *  the app reloads itself; the user never has to know about refresh mechanics. */
  async presentUpdatePrompt(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Update available',
      message: `RolodexAI v${this.updateServer} (build ${this.updateServerBuild}) is live — you're on v${this.updateCurrent} (build ${this.updateCurrentBuild}). Tap Update now and the app will apply it. Your contacts are safe.`,
      buttons: [
        { text: 'Later', role: 'cancel' },
        { text: 'Update now', handler: () => { this.applyUpdate(); } },
      ],
    });
    await alert.present();
  }

  /** Direct tap on the Settings "Update vX" button: apply immediately.
   *  2026-08-19 PERSISTENT ACK: remember the build we tried to install so the
   *  popup does not come straight back after the reload. */
  async applyUpdate(): Promise<void> {
    if (this.applyingUpdate) return;
    this.applyingUpdate = true;
    try {
      if (this.updateServerBuild > 0) {
        await this.storageService.set(this.UPDATE_ACK_KEY, this.updateServerBuild);
        this.promptedBuild = this.updateServerBuild;
      }
    } catch { /* the reload still happens */ }
    setTimeout(() => window.location.reload(), 350);
  }

  /** 2026-08-19 INSTALL: automated Zyppar-style PWA installer. */
  installPwa(): void {
    void this.appInstall.encourageAppInstall('RolodexAI');
  }

  /** 2026-08-19 INSTALL: Google Play is INCOMING - no store link yet. */
  openPlayStore(): void {
    void this.alertService.showToast('Google Play — incoming', 2500);
  }

  /** 2026-08-19 INSTALL: App Store is INCOMING - no store link yet. */
  openAppStore(): void {
    void this.alertService.showToast('App Store — incoming', 2500);
  }

  /** 2026-08-19 SHARE APP: the standard native share sheet (clipboard fallback). */
  async shareApp(): Promise<void> {
    const result = await this.shareAppService.shareAppStandard();
    if (result === 'shared') return;
    if (result === 'copied') {
      void this.alertService.showToast('RolodexAI link copied — paste it anywhere', 2500);
    } else {
      void this.alertService.showToast('Sharing is not available on this browser', 2500);
    }
  }

  /** 2026-08-19 CHAT WITH ROLODEXAI: the suggestion channel with the banner,
   *  minimum exchanges, and the free DeepSeek/Grok handoff. */
  async openRolodexChat(): Promise<void> {
    const modal = await this.modalController.create({
      component: ChatWithRolodexModalComponent,
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95, 1],
      initialBreakpoint: 0.95,
    });
    await modal.present();
  }

  /** 2026-08-16 PODS: group threads derived from the contacts' groups. */
  async openPods(): Promise<void> {
    const pods = this.cardChat.groupsFrom(this.contacts as any[]);
    const modal = await this.modalController.create({
      component: PodsModalComponent,
      componentProps: { pods, contacts: this.contacts },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.6, 0.7, 0.9],
      initialBreakpoint: 0.7,
    });
    await modal.present();
  }

  /** 2026-08-18 SECURITY: the app lock toggle. */
  lockEnabled = false;

  async toggleLock(ev: any): Promise<void> {
    const enable = !!(ev?.detail?.checked);
    if (enable) {
      const pin = window.prompt('Set your app-lock PIN (4-6 digits)', '');
      const clean = String(pin || '').trim();
      if (clean.length < 4) {
        void this.alertService.showToast('A PIN needs at least 4 digits', 2500);
        this.lockEnabled = false;
        return;
      }
      await this.security.setPin(clean);
      this.lockEnabled = true;
      void this.alertService.showToast('App locked - it will ask for the PIN on every cold start', 3000);
    } else {
      await this.security.disableLock();
      this.lockEnabled = false;
      void this.alertService.showToast('App lock off', 1800);
    }
  }

  /** 2026-08-17 MY PROFILE: the user's own identity — name + photo. */
  profile: { name: string; photo: string; phone: string } = { name: '', photo: '', phone: '' };
  private readonly PROFILE_KEY = 'rolodex_profile';

  private loadProfile(): void {
    void (async () => {
      try {
        // 2026-08-18 FIX: StorageService already JSON-parses - never parse twice.
        const p = await this.storageService.get<any>(this.PROFILE_KEY);
        if (p && typeof p === 'object') this.profile = { name: '', photo: '', phone: '', ...p };
      } catch { /* fresh */ }
    })();
  }

  profileFallback(): string {
    const ch = (this.profile.name || 'Me').trim().charAt(0).toUpperCase() || 'M';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='48' fill='#4f6df5'/><text x='48' y='61' font-size='42' text-anchor='middle' fill='#fff' font-family='sans-serif'>${ch}</text></svg>`);
  }

  /** 2026-08-18 PROFILE GUIDANCE: a complete profile makes every greeting
   *  polished. No distribution language here - that stays invisible. */
  profileCompletionLabel(): string {
    const done = [this.profile.name, this.profile.phone, this.profile.photo].filter(Boolean).length;
    if (done === 3) return `Profile complete — every greeting carries your name and face.`;
    const missing = 3 - done;
    return `${missing} more to go for polished greetings.`;
  }

  async changeProfilePhoto(): Promise<void> {
    const dataUrl = await this.photoService.pick();
    if (!dataUrl) return;
    this.profile.photo = dataUrl;
    this.saveProfile();
  }

  changeProfilePhone(): void {
    const phone = window.prompt('Your phone number - how contacts reach you, and how the chat knows you are on Rolodex', this.profile.phone || '');
    if (phone == null) return;
    this.profile.phone = phone.trim().slice(0, 20) || this.profile.phone;
    this.saveProfile();
  }

  changeProfileName(): void {
    const name = window.prompt('Your name - how you appear to your contacts', this.profile.name || '');
    if (name == null) return;
    this.profile.name = name.trim().slice(0, 40) || this.profile.name;
    this.saveProfile();
  }

  private saveProfile(): void {
    void this.storageService.set(this.PROFILE_KEY, this.profile); // 2026-08-18 IndexedDB, no localStorage
    try {
      // 2026-08-18 THE USERS DB: the device's identity (phone + name + room)
      this.rolodexSync.setOwnerIdentity(this.profile.phone || '', this.profile.name || '');
      const sc: any = this.cardChat as any;
      if (sc?.socketChat?.name) sc.socketChat.name = this.profile.name || sc.socketChat.name;
      // re-push so the backend registers the identity now
      try { this.rolodexSync.push(this.contacts || []); } catch { /* ignore */ }
    } catch { /* ignore */ }
  }

  ngOnInit() {
    this.loadProfile();
    // 2026-08-17 AWARENESS: a new message / appointment invite toasts immediately.
    this.cardChat.arrival$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((ev) => {
      void this.alertService.showToast((ev.label || "New message") + " (" + this.cardChat.threadTitle(ev.key) + ")", 4500);
    });
    this.loadViewMode();
    // 2026-08-16: the Updates counter re-checks every 5 minutes.
    this.updateTimer = setInterval(() => { void this.refreshUpdatesQuietly(); }, 300000);
    // 2026-08-16 UPDATES: boot check — an update is a POP-UP now, not a toast
    // that can be missed during rapid dev iteration. refreshUpdatesQuietly
    // auto-prompts once per new build; initUpdates first restores the
    // acknowledged build so a tapped update stays acknowledged.
    void this.initUpdates();
    // 2026-08-16: capture the PWA install prompt (Chrome) so the web install
    // path can offer it later (mirrors Zyppar's appInstaller pattern).
    if (typeof window !== 'undefined') {
      (window as any).addEventListener?.('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        (window as any).__rolodexInstallPrompt = e;
      });
    }
  }

  onChatContact(contact: ContactInfo) {
    this.chatContact.emit(contact);
  }

  onAudioCallContact(contact: ContactInfo) {
    this.audioCallContact.emit(contact);
  }

  onVideoCallContact(contact: ContactInfo) {
    this.videoCallContact.emit(contact);
  }

  async onScheduleEvent(contact: ContactInfo) {
    const event: CalendarEvent = {
      id: `event_${contact.contactId}_${Date.now()}`,
      title: `Catch up with ${contact.name?.display}`,
      start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      location: typeof contact.postalAddresses?.[0]?.city === 'string' ? contact.postalAddresses[0].city : 'Online',
      notes: 'Plan some time to connect!',
      url: '',
    };
    await this.eventService.saveEvent(event);
    this.scheduleEvent.emit({ contact, event });
  }

  async handleVoiceCommand(command: string, contact: ContactInfo) {
    if (command.includes('chat')) this.onChatContact(contact);
    else if (command.includes('call')) this.onAudioCallContact(contact);
    else if (command.includes('video')) this.onVideoCallContact(contact);
    else if (command.includes('schedule')) this.onScheduleEvent(contact);
    else { !environment.production && console.log('Voice command not recognized:', command); }
  }

  onResetFilters() { this.resetFilters.emit(); this.showRegularView(); }
  onAcceptAutoSort() { this.acceptAutoSort.emit(); this.showRegularView(); }
  onRestartAutoSort() { this.restartAutoSort.emit(); this.showAutoSortView(); }
  onCancelAutoSort() { this.cancelAutoSort.emit(); this.showRegularView(); }
  async loadViewMode() { if (this.viewMode === 'map') { this.showLocationsView(); } }
  refreshViewMode(mode: string) { if (mode === 'map') { this.showLocationsView(); } }

  saveViewMode(event: string) {
    if (event === 'map') { this.showLocationsView(); }
    this.pageManager.currentViewMode = event;
    this.storageService.set('contact-cardViewMode', event);
    this.showRegularView();
  }

  showRegularView() { this.currentView = RolodexView.Regular; this.autoSortStarted = false; this.searchResultsVisible = false; }

  async showAutoSortView() {
    if (!Capacitor.isNativePlatform()) {
      // 2026-08-16: not a raw "Mobile devices only" dead-end — real choices:
      // install the app (native contacts + auto-sort) or run the pipeline on
      // the sample contacts (the automation engine works fully on mock data).
      const action = await this.alertService.presentActionSheet({
        header: 'Auto-sort your contacts',
        message: 'Full device contacts + the auto-sort engine live in the installed app (Android/iOS). On the web you can run the same engine on the sample contacts — or install the app for your real ones.',
        buttons: [
          { text: 'Install the app (real contacts)', role: 'install', icon: 'download-outline' },
          { text: 'Run on sample contacts', role: 'sample', icon: 'people-outline' },
          { text: 'Cancel', role: 'cancel', icon: 'close-outline' },
        ],
      });
      if (action === 'install') {
        await this.offerAppInstall();
      } else if (action === 'sample') {
        this.currentView = RolodexView.AutoSort; this.autoSortStarted = true; this.searchResultsVisible = false; this.autoSort.emit();
      }
      return;
    }
    this.currentView = RolodexView.AutoSort; this.autoSortStarted = true; this.searchResultsVisible = false; this.autoSort.emit();
  }

  /** 2026-08-16: the web install path — PWA install prompt (Chrome) or the
   *  Android/iOS guidance, mirroring Zyppar's appInstaller pattern. */
  private async offerAppInstall(): Promise<void> {
    const anyWindow = window as any;
    const deferredPrompt = anyWindow.__rolodexInstallPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const outcome = await deferredPrompt.userChoice;
      if (outcome?.outcome === 'accepted') {
        anyWindow.__rolodexInstallPrompt = null;
        this.alertService.alertPrompt({ header: 'Installing Rolodex', message: 'Once installed, open it from your home screen — the auto-sort engine gains access to your real contacts.' });
      }
      return;
    }
    // Generic guidance (Android Chrome PWA / iOS Safari Add to Home Screen).
    this.alertService.alertPrompt({
      header: 'Install Rolodex',
      message: 'Chrome: tap the browser menu → "Install app" / "Add to Home screen". iOS Safari: Share → "Add to Home Screen". After install, relaunch Rolodex from the home screen — device contacts + auto-sort become available. (A Play Store build is on the way — then full native access on Android and iOS.)',
    });
  }

  showSearchView() { this.currentView = RolodexView.Search; this.searchResultsVisible = true; this.autoSortStarted = false; }
  toggleFilters() { this.currentView = this.currentView === RolodexView.Filters ? RolodexView.Regular : RolodexView.Filters; this.filterState = this.filterState === 'closed' ? 'open' : 'closed'; }
  showLocationsView() { this.currentView = RolodexView.Locations; this.autoSortStarted = true; this.searchResultsVisible = false; this.initMap.emit(this.mapElement.nativeElement); }
  showSettingsView() { this.currentView = RolodexView.Settings; this.autoSortStarted = true; this.searchResultsVisible = false; }
  closeSearchView() { this.pageManager.finderQuery = ''; this.showRegularView(); }
  openCardSelect() { const select = document.querySelector('ion-select'); if (select) { (select as any).open(); } }
  onToggleDetails(contact: ContactInfo) { this.toggleDetails.emit(contact); }
  onEditContact(contact: ContactInfo) { this.editContact.emit(contact); }
  onRemoveContact(contact: ContactInfo) { this.removeContact.emit(contact); }
  onContactTap(contact: ContactInfo) { this.contactTap.emit(contact); }
  onAutoSortScroll() { this.loadMoreAutoSort.emit(); }
  /** 2026-08-17 THE 4 W'S: the Confidante's deep-context lens - Who, What,
   *  Where, When - the whole deck through the relationship story. */
  onApplyFilter() {
    if (this.selectedFilter === 'fourws') {
      this.currentView = RolodexView.FourWs;
      this.autoSortStarted = false;
      this.searchResultsVisible = false;
      return;
    }
    if (this.selectedFilter === 'all' && this.currentView === RolodexView.FourWs) {
      this.showRegularView();
      return;
    }
    this.applyFilter.emit();
  }

  fourWsOf(contact: any): { who: string; what: string; where: string; when: string } {
    const r = contact?.rolodex || {};
    const when = r.when
      ? new Date(r.when).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
      : (contact?.lastInteraction ? 'Last: ' + new Date(contact.lastInteraction).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—');
    const next = contact?.nextInteraction
      ? ' · next ' + new Date(contact.nextInteraction).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '';
    const what = [r.topic, r.why].filter(Boolean).join(' — ') || (contact?.organization?.company || '—');
    return {
      who: (contact?.name?.display || '—') + (contact?.organization?.jobTitle ? ', ' + contact.organization.jobTitle : ''),
      what,
      where: r.where || '—',
      when: when + next,
    };
  }

  onApplyGroupFilter(event: any) { this.applyGroupFilter.emit(event); }
  onToggleWelcome() { this.toggleWelcome.emit(); }

  /** 2026-08-16: the Show side of Welcome Again re-runs the demo tour. */
  onShowWelcome() { this.showWelcome.emit(); }
  onMockDataRepeat() { this.mockDataRepeat.emit(); this.showRegularView(); }
  onCreateContact() { this.createContact.emit(); }
  onToggleTheme(event: any) { this.toggleTheme.emit(event.detail.checked); }
  onToggleNotifications(event: any) { this.toggleNotifications.emit(event.detail.checked); }
  onChangeLanguage(event: any) { this.changeLanguage.emit(event.detail.value); }
  onChangeFontSize(event: any) { this.changeFontSize.emit(event.detail.value); }
  onGoToPrivacySettings() { this.goToPrivacySettings.emit(); }
  onShowAbout() { this.showAbout.emit(); }
}
