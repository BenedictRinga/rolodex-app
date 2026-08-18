import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
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
import { HelpModalComponent } from '../components/help-modal/help-modal.component';
import { ContactSurfaceModalComponent } from '../components/contact-surface-modal/contact-surface-modal.component';
import { WelcomeModalComponent, WELCOME_DISMISSED_KEY } from '../components/welcome-modal/welcome-modal.component';
import { InviteLandingComponent } from '../components/invite-landing/invite-landing.component';
import { InviteService } from '../services/invite/invite.service';
import { DraftEngineService } from '../services/draft-engine/draft-engine.service';
import type { CloudProvider } from '../services/cloud-sync/sync.types';
import { mockContacts } from '../data/mock-contacts';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  contacts: ContactInfo[] = [];
  displayedContacts: ContactInfo[] = [];
  sortedContacts: ContactInfo[] = [];
  searchQuery: string = '';
  autoSortStarted: boolean = false;
  selectedFilter: string = 'all';
  selectedGroup: string = 'all';
  mockEnabled: boolean = true;
  loading: boolean = false;
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
  syncHasPassphrase: boolean = false;
  syncLastPushed: string | null = null;
  syncLastPulled: string | null = null;
  syncBusy: boolean = false;

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
    private socketChat: SocketChatService,
    private draftEngine: DraftEngineService,
    private inviteService: InviteService,
    private cardChat: CardChatService,
  ) {
    // 2026-08-16: after a Stripe checkout return, grant the plan.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('checkout') === 'success') {
        const plan = url.searchParams.get('plan');
        if (plan === 'basic' || plan === 'confidante') this.draftEngine.setPlan(plan);
      }
    } catch { /* ignore */ }
  }

  /** 2026-08-16 WELCOME AGAIN: demos Rolodex on init unless turned off
   *  (Settings > Welcome Again > Stop, or 'Don't show this again' inside).
   *  2026-08-17: 'Start exploring' in the demo hands off to the live tour. */
  async presentWelcome(isReplay = false) {
    try {
      if (localStorage.getItem(WELCOME_DISMISSED_KEY)) return;
      const modal = await this.modalController.create({
        component: WelcomeModalComponent,
        componentProps: { isReplay },
        cssClass: 'card-chat-modal-sheet',
        breakpoints: [0, 0.7, 0.95],
        initialBreakpoint: 0.9,
      });
      await modal.present();
      const res = await modal.onDidDismiss();
      if (res?.role === 'start') void this.openHelp();
    } catch { /* quiet */ }
  }

  /** The Settings 'Show' side of Welcome Again: clear the dismissal + replay. */
  showWelcomeAgain() {
    try { localStorage.removeItem(WELCOME_DISMISSED_KEY); } catch { /* ignore */ }
    void this.presentWelcome(true);
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
        componentProps: { invite: inv },
        cssClass: 'card-chat-modal-sheet',
        breakpoints: [0, 0.7, 0.95],
        initialBreakpoint: 0.9,
      });
      await modal.present();
      const res = await modal.onDidDismiss();
      const role = res?.role;
      const picked = res?.data?.picked;
      if (picked?.name) {
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
          thread.messages = [...thread.messages, { id: 'inv' + Date.now(), from: 'them', text: inv.text, at: new Date().toISOString(), status: 'read' as any }];
          await this.cardChat.saveThread(thread);
        }
        void this.alertsService.showToast(picked.name + "'s card is ready — " + (appt.length ? 'the appointment is on it.' : 'the message is in their thread.'), 5000);
      } else if (role === 'get-app') {
        window.open('https://play.google.com/store/apps/details?id=com.zyppar.rolodexai', '_blank');
      } else if (role === 'pick-unavailable') {
        void this.alertsService.showToast('Contact picking needs Android Chrome — the app does the correlation everywhere.', 4500);
      }
    } catch { /* the invite link may be dead — the app still loads */ }
  }

  async ngOnInit() {
    // 2026-08-17 THE DROPBOX MOMENT: an invite link opened us.
    void this.presentInviteLanding();
    // 2026-08-16 WELCOME AGAIN: the demo tour on init (unless dismissed).
    void this.presentWelcome();
    // Wire passphrase prompt callback for CloudSyncService
    this.cloudSync.promptPassphrase = () => this.promptForPassphrase();
    this.refreshSyncState();

    // 2026-08-16 STORAGE LOCATION + demo room (persisted).
    try {
      const loc = localStorage.getItem('rolodex_storage');
      if (loc === 'cloud' || loc === 'rolodex-server' || loc === 'device') this.storageLocation = loc;
      this.demoRoom = this.rolodexSync.room;
    } catch { /* ignore */ }

    await this.loadContacts();
    await this.runAutomation();

    // 2026-08-16: when the server is the chosen home, restore the full list
    // from it (fall back to the local list when the server has nothing).
    if (this.storageLocation === 'rolodex-server') {
      const restored = await this.rolodexSync.restore();
      if (restored && restored.length) {
        this.contacts = restored;
        this.loading = false;
        this.rolodexSync.push(this.contacts);
      }
    }
  }

  /** B2B-style storage picker — where the user keeps their contacts. */
  async onStorageChange(event: any): Promise<void> {
    const loc = event?.detail?.value as 'device' | 'cloud' | 'rolodex-server';
    if (!loc) return;
    this.storageLocation = loc;
    try { localStorage.setItem('rolodex_storage', loc); } catch { /* ignore */ }
    if (loc === 'rolodex-server') {
      const restored = await this.rolodexSync.restore();
      if (restored && restored.length) {
        this.contacts = restored;
        this.loading = false;
        this.rolodexSync.push(this.contacts);
      }
    }
  }

  onRoomInput(event: any): void {
    const code = String(event?.detail?.value || '').trim();
    this.rolodexSync.setRoom(code);
    this.rolodexSync.push(this.contacts);
    // 2026-08-16 SOCKET CHAT: joining the room joins the live chat too.
    if (code) {
      try {
        this.socketChat.connect(code, 'Rolodex demo');
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
    });
    const inst = modal.componentRef?.instance as HelpModalComponent | null;
    inst?.navigate?.subscribe?.((featureId: string) => this.onHelpNavigate(featureId));
    await modal.present();
  }

  /** A help "Go" tap — transport the user to the feature's section. */
  onHelpNavigate(featureId: string): void {
    switch (featureId) {
      case 'cards':
        // Flip the first contact's card open so the demo lands on a card.
        if (this.contacts.length) {
          const first = this.contacts[0];
          first.showDetails = !first.showDetails;
        }
        break;
      case 'search':
        this.alertsService.showToast('Use the search bar above the cards', 2500);
        break;
      case 'merge':
        this.alertsService.showToast('Duplicates merge automatically as you add contacts', 2500);
        break;
      case 'overdue':
        this.applyHelpFilter('overdue');
        break;
      case 'birthdays':
        this.applyHelpFilter('birthdays');
        break;
      case 'health':
        this.applyHelpFilter('dormant');
        break;
      case 'reminders':
        this.alertsService.showToast('Flip a card → add a reminder right there', 2500);
        break;
      case 'storage':
        this.storageLocation = 'rolodex-server';
        try { localStorage.setItem('rolodex_storage', 'rolodex-server'); } catch { /* ignore */ }
        this.onStorageChange({ detail: { value: 'rolodex-server' } });
        break;
      case 'sync':
        this.refreshSyncState();
        this.alertsService.showToast('Cloud sync — push/pull with a passphrase', 2500);
        break;
      default:
        break;
    }
  }

  private applyHelpFilter(filter: string): void {
    this.selectedFilter = filter as any;
    try {
      const el = document.querySelector('app-rolodex');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch { /* ignore */ }
    this.alertsService.showToast(`Showing ${filter} — tap any card for details`, 2500);
  }

  async loadContacts() {
    this.loading = true;
    try {
      // 2026-08-18: real data is always preferred; the demo deck is ONLY the
      // filler when there is nothing real yet, and it never blocks actual
      // contacts when syncAllContacts returns them (or when a later sync/
      // restore delivers them - those replace this array wholesale).
      this.contacts = await this.contactsSyncService.syncAllContacts();
      if (this.contacts.length === 0) {
        this.contacts = mockContacts;
        // Also run automation on mock data for demo purposes
        await this.contactsSyncService.automateContactSetup(this.contacts);
      }
    } catch {
      this.contacts = mockContacts;
      await this.contactsSyncService.automateContactSetup(this.contacts);
    }
    this.loading = false;
    // 2026-08-16 DEMO SYNC: the moment contacts are ready, talk to the fresh
    // rolodex database — the investor peek view shows this device LIVE.
    this.rolodexSync.push(this.contacts);
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

    console.log('[HomePage] Automation complete:', {
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

  /** Connect to a cloud provider by name (e.g. 'google-drive', 'dropbox'). */
  async onSyncConnect(providerName: string) {
    this.syncBusy = true;
    try {
      await this.cloudSync.selectProvider(providerName);
      this.refreshSyncState();
      this.alertsService.showToast('Connected to cloud');
    } catch (err: any) {
      console.error('[HomePage] Sync connect failed:', err);
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
      console.error('[HomePage] Sync disconnect failed:', err);
    } finally {
      this.syncBusy = false;
    }
  }

  /** Prompt user to set (or change) their encryption passphrase. */
  async onSyncSetPassphrase() {
    const alert = await this.alertController.create({
      header: 'Sync Passphrase',
      message: 'Enter a strong passphrase to encrypt your Rolodex data in the cloud. You\'ll need this on every device.',
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
      console.error('[HomePage] Push failed:', err);
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
      console.error('[HomePage] Pull failed:', err);
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
      console.error('[HomePage] Export failed:', err);
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
      console.error('[HomePage] Import failed:', err);
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
      }).then(alert => alert.present());
    });
  }

  // ===== Event handlers ====================================================

  onChatContact(contact: ContactInfo) {
    console.log('Chat with:', contact.name?.display);
  }

  onAudioCallContact(contact: ContactInfo) {
    console.log('Audio call:', contact.name?.display);
  }

  onVideoCallContact(contact: ContactInfo) {
    console.log('Video call:', contact.name?.display);
  }

  onScheduleEvent(event: { contact: ContactInfo; event: any }) {
    console.log('Schedule event:', event);
  }

  onToggleDetails(contact: ContactInfo) {
    contact.showDetails = !contact.showDetails;
  }

  onEditContact(contact: ContactInfo) {
    console.log('Edit contact:', contact.name?.display);
  }

  onRemoveContact(contact: ContactInfo) {
    this.contacts = this.contacts.filter(c => c.contactId !== contact.contactId);
    this.rolodexSync.push(this.contacts); // 2026-08-16: the server home updates live
  }

  onContactTap(contact: ContactInfo) {
    // 2026-08-16: the card tap opens the FULL feature surface - flip it for
    // chat, reminders, the confidante, edit, call, email, map, remove.
    void this.modalController.create({
      component: ContactSurfaceModalComponent,
      componentProps: { contact },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95],
      initialBreakpoint: 0.92,
    }).then((m) => m.present());
  }

  onContactsChange(contacts: ContactInfo[]) {
    this.contacts = contacts;
    this.rolodexSync.push(this.contacts); // 2026-08-16: the server home updates live
  }

  onAutoSort() {
    console.log('Auto sort triggered');
  }

  onLoadMoreAutoSort() {
    console.log('Load more auto sort');
  }

  onApplyFilter() {
    console.log('Apply filter:', this.selectedFilter);
  }

  onApplyGroupFilter(event: any) {
    console.log('Apply group filter:', event);
  }

  onToggleWelcome() {
    this.mockEnabled = !this.mockEnabled;
    if (!this.mockEnabled) {
      this.contacts = [];
    } else {
      this.contacts = mockContacts;
    }
    this.onContactsChange(this.contacts); // 2026-08-18: propagate so the deck + sync change state
  }

  onMockDataRepeat() {
    this.contacts = this.contacts.length ? [] : mockContacts;
    this.onContactsChange(this.contacts); // 2026-08-18: propagate so the deck + sync change state
  }

  onInitMap(mapElement: HTMLElement) {
    console.log('Map initialized');
  }

  /** 2026-08-17 ADD CONTACTS, like the big web apps: pick from the phone
   *  (Contact Picker API - Android Chrome) or add the demo deck back. */
  async onCreateContact() {
    const sheet = await this.alertController.create({
      header: 'Add contacts',
      message: 'How do you want to bring people in?',
      buttons: [
        { text: 'Pick from my phone contacts', handler: () => { void this.addFromPhoneContacts(); } },
        { text: 'Add the demo contacts', handler: () => { const fresh = mockContacts.filter((m) => !this.contacts.some((c) => c.contactId === m.contactId)); this.contacts = [...fresh, ...this.contacts]; this.onContactsChange(this.contacts); } },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
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
    const display = String(raw?.name || '').trim() || 'Picked contact ' + (index + 1);
    const parts = display.trim().split(/\s+/);
    const tel = Array.isArray(raw?.tel) ? raw.tel.filter(Boolean) : [];
    const emails = Array.isArray(raw?.email) ? raw.email.filter(Boolean) : [];
    const addr = String(raw?.address || '').trim();
    return {
      contactId: 'picked-' + when + '-' + index,
      name: {
        display,
        given: parts[0] || '',
        middle: '',
        family: parts.slice(1).join(' ') || '',
        prefix: '',
        suffix: '',
      },
      phoneNumbers: tel.map((n: string) => ({ type: 'mobile' as any, number: n })),
      emailAddresses: emails.map((a: string) => ({ type: 'email' as any, address: a })),
      postalAddresses: addr ? [{ type: 'home' as any, street: addr }] : [],
      organization: { company: '', jobTitle: '' },
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

  async addFromPhoneContacts(): Promise<void> {
    const picker = (navigator as any)?.contacts;
    if (!picker?.select) {
      void this.alertsService.showToast('Contact picking needs Android Chrome — the app (Play Store) has full contact sync.', 5000);
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
      void this.alertsService.showToast(mapped.length + ' contact' + (mapped.length === 1 ? '' : 's') + ' added from your phone.', 4000);
    } catch {
      /* user cancelled the picker */
    }
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
    console.log('Notifications:', enabled ? 'on' : 'off');
  }

  onChangeLanguage(lang: string) {
    this.selectedLanguage = lang;
  }

  onChangeFontSize(size: string) {
    this.selectedFontSize = size;
  }

  onGoToPrivacySettings() {
    console.log('Privacy settings');
  }

  onShowAbout() {
    console.log('About Rolodex');
  }
}
