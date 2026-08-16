import { Component, Input, Output, EventEmitter, SecurityContext, OnInit, ChangeDetectorRef, ElementRef, HostListener, ViewChild, AfterViewInit, ChangeDetectionStrategy, SimpleChanges } from '@angular/core';
import { ContactInfo } from '../../models/contacts';
import { ImageViewerComponent } from '../image-viewer/image-viewer.component';
import { ActionSheetController, AlertController, GestureController, ModalController, SelectCustomEvent } from '@ionic/angular';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AlertsService } from '../../services/alerts/alerts.service';
import { DeviceconnectorService } from '../../services/deviceconnector/deviceconnector.service';
import { DraftEngineService, Occasion } from '../../services/draft-engine/draft-engine.service';
import { PagemanagerService, RolodexView } from '../../services/pagemanager/pagemanager.service';
import { FormvalidationService, atLeastOneContactMethod, atLeastOnePhoneOrEmail, birthdayRangeValidator, convertBirthdayToDate, emailDomainValidator, safeCompose, uniqueTags, validPhoneNumberFormat } from '../../services/formvalidation/formvalidation.service';
import { StorageService } from '../../services/storage/storage.service';
import { CardChatService } from '../../services/card-chat/card-chat.service';
import { CardChatModalComponent } from '../card-chat-modal/card-chat-modal.component';
import { EmailPayload, EmailType, NamePayload, OrganizationPayload, PhonePayload, PhoneType, PostalAddressPayload, PostalAddressType } from '@capacitor-community/contacts';
import { FormArray, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-contact-card',
  templateUrl: './contact-card.component.html',
  styleUrls: ['./contact-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactCardComponent implements OnInit, AfterViewInit {
  @ViewChild('gridcard', { read: ElementRef }) gridcardEl!: ElementRef;
  @Input() contacts: ContactInfo[] = [];
  @Input() sortedcontacts: ContactInfo[] = [];
  @Input() displayedContacts: ContactInfo[] = [];
  @Input() viewMode: string = 'default';
  @Input() zyppars: ContactInfo[] = [];
  @Input() providers: ContactInfo[] = [];
  @Input() searchQuery: string = '';

  @Output() editContact = new EventEmitter<ContactInfo>();
  @Output() removeContact = new EventEmitter<ContactInfo>();
  @Output() createContact = new EventEmitter<ContactInfo>();
  @Output() toggleDetails = new EventEmitter<ContactInfo>();
  @Output() contactTap = new EventEmitter<ContactInfo>();

  trackById(index: number, contact: ContactInfo): string {
    return contact.contactId || index.toString();
  }

  cardPosition = { x: 10, y: 10 };
  @Input() contact: ContactInfo = {} as ContactInfo;
  @ViewChild('gridView') gridView!: ElementRef;
  @Input() selectedMode: string | null = null;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  activeContact: ContactInfo | null = null;
  isFlipped = false;
  screenWidth: number = 0;
  batchSize = 12;
  currentBatchIndex = 0;
  totalBatches: number = 0;
  isFetching = false;
  public RolodexView = RolodexView;
  showDetails: boolean = false;
  avatarImage: string = 'assets/icons/zypparClear.png';

  /** 2026-08-16 DE-STUB: when a contact has no photo, render a deterministic
   *  colored-initial avatar (offline SVG data-URI) instead of the Zyppar logo —
   *  the demo list must look like real people, not a placeholder brand. */
  avatarFor(contact: any): string {
    if (contact?.image?.base64String) return contact.image.base64String;
    const raw = contact?.name?.display || contact?.nickname || (contact as any)?.firstName || '';
    const name = String(raw || '?');
    const initials = name.split(/\s+/).filter(Boolean).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
    const palette = ['#FFD93D', '#FFE670', '#5BA4FC', '#00C853', '#FFB300', '#EF476F', '#9BA1A6', '#EAECF0']; // the app's own hues
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const color = palette[h % palette.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="${color}"/><text x="48" y="60" font-family="system-ui,sans-serif" font-size="34" font-weight="600" fill="#ffffff" text-anchor="middle">${initials}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  editedContact: ContactInfo = {} as ContactInfo;
  contactForm!: FormGroup;
  showNameDetails = false;
  showPhoneDetails = false;
  showEmailDetails = false;
  showAddressDetails = false;
  showCompanyDetails = false;
  showSocialDetails = false;
  showUrlDetails = false;
  showPreferencesDetails = false;
  additionalInfo = false;

  filteredContacts: ContactInfo[] = [];
  filteredSortedContacts: ContactInfo[] = [];
  filteredDisplayedContacts: ContactInfo[] = [];
  groupedContacts: { [key: string]: ContactInfo[] } = {};


  saveEnabled = false;

  constructor(
    private modalController: ModalController,
    private alertCtrl: AlertController,
    private sanitizer: DomSanitizer,
    private actionSheetCtrl: ActionSheetController,
    private alertService: AlertsService,
    public pageManager: PagemanagerService,
    private fb: FormBuilder,
    private fomvalidation: FormvalidationService,
    private cdr: ChangeDetectorRef,
    private storageService: StorageService,
    private deviceConnector: DeviceconnectorService,
    private draftEngine: DraftEngineService,
    private gestureCtrl: GestureController,
    private cardChat: CardChatService
  ) { 
    
      if (this.pageManager.currentViewMode === 'grid') {
      this.screenWidth = window.innerWidth;
      this.checkScreenSize();

    }
  }

  ngOnInit() {
    this.applySearchFilter();
    this.updateDisplayedContacts();

    if (this.pageManager.currentViewMode === 'grid') {
      this.updateDisplayedContacts();
      this.totalBatches = Math.ceil(this.filteredContacts.length / this.batchSize);
      this.loadNextBatch();
    }

    if (this.pageManager.currentViewMode === 'rolodex') {
      this.totalBatches = Math.ceil(this.filteredContacts.length / this.batchSize);
      this.loadNextBatch();
    }

    // If in edit mode, clone the contact for editing
    if (this.selectedMode === 'editContact') {
      // this.editedContact = mockContacts[4];
      // console.log('if this.selectedMode === editContact this.contact"', this.contact);
      // console.log('f this.selectedMode === editContact this.editedContact', this.editedContact);
      this.editedContact = { ...this.contact };
      this.initializeForm();
      this.contactForm.get('privacy.level')?.valueChanges.subscribe((value: any) => {
        this.onPrivacyChange({ detail: { value: value } } as SelectCustomEvent);
      });

      // Moved subscription and initial check here
      this.contactForm.valueChanges.subscribe(() => {
        this.updateSaveEnabled();
      });
      this.updateSaveEnabled();
    }

    // If in create mode, initialize with an empty contact
    else if (this.selectedMode === 'createContact') {
      this.editedContact = {
        contactId: '', // Use `contactId` instead of `id`
        name: { display: '', given: '', middle: '', family: '', prefix: '', suffix: '' } as NamePayload,
        organization: {} as OrganizationPayload, // Use `organization` instead of `company`
        birthday: null, // Use `null` instead of `undefined` for `birthday`
        note: '', // Use `note` instead of `notes`
        phones: [] as PhonePayload[],
        emails: [] as EmailPayload[],
        postalAddresses: [] as PostalAddressPayload[], // Use `postalAddresses` instead of `address`
        image: undefined, // Use `undefined` instead of an empty string for `image`
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
          contactFrequency: 'monthly' as const,
          references: [] // Initialize as an empty array
        },
        socialProfiles: {
          twitter: '',
          linkedin: '',
          facebook: '',
          instagram: ''
        },
        urls: [],
        tags: [],
        groups: [],
        privacy: {
          level: 'private', // Default to 'private' for privacy by design
          sharedWith: [] // Initialize as an empty array for custom sharing
        },
        sharedBy: [],
        lastInteraction: null,
        nextInteraction: null,
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {
          refreshContacts: false,
          notificationPreference: undefined,
          theme: undefined
        }
      };

      this.initializeForm();

      // Privacy provisions allow/No sharing or how much
      this.contactForm.get('privacy.level')?.valueChanges.subscribe((value: any) => {
        this.onPrivacyChange({ detail: { value: value } } as SelectCustomEvent);
      });

      // Moved subscription and initial check here
      this.contactForm.valueChanges.subscribe(() => {
        this.updateSaveEnabled();
      });
      this.updateSaveEnabled();
    } else {
      this.showDetails = false; // Default view mode
      
    }
  }

  ngAfterViewInit(): void {
    // console.log('gridView is now available:', this.gridView);

    this.watchBusinessCards();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contacts'] || changes['sortedcontacts'] || changes['displayedContacts'] || changes['searchQuery']) {
      this.applySearchFilter();
      this.updateDisplayedContacts();
      this.cdr.detectChanges();
    }
    if (changes['viewMode'] && !changes['viewMode'].isFirstChange()) {
      this.resetContactDetails();
      this.updateDisplayedContacts();
    }
  }




  onContactTap(contact: ContactInfo, event: MouseEvent) {
    event.stopPropagation(); // Prevent event bubbling if needed
    this.contactTap.emit(contact);
  }

  private applySearchFilter() {
    const query = this.searchQuery.toLowerCase().trim();

    this.filteredContacts = query
      ? this.contacts.filter(contact => contact.name?.display?.toLowerCase().includes(query))
      : [...this.contacts];

    this.filteredSortedContacts = query
      ? this.sortedcontacts.filter(contact => contact.name?.display?.toLowerCase().includes(query))
      : [...this.sortedcontacts];

    this.filteredDisplayedContacts = query
      ? this.displayedContacts.filter(contact => contact.name?.display?.toLowerCase().includes(query))
      : [...this.displayedContacts];

    this.updateDisplayedContacts();
  }

  private updateDisplayedContacts() {
    let sourceContacts: ContactInfo[] = [];

    switch (this.viewMode) {
      case 'default':
        sourceContacts = this.filteredContacts;
        break;
      case 'alphabetical':
        this.groupContactsAlphabetically(); // Use original method to group contacts
        sourceContacts = this.flattenGroupedContacts(); // Flatten for batching/display
        break;
      case 'rolodex':
        sourceContacts = this.filteredContacts; // Custom sorting could be added
        break;
      case 'family':
        sourceContacts = this.filteredContacts.filter(contact => contact.groups?.includes('family')); // Example filter
        break;
      case 'businesscard':
        sourceContacts = this.filteredContacts.filter(contact => contact.organization); // Example filter
        break;
      case 'social':
        sourceContacts = this.filteredContacts.filter(contact => Object.values(contact.socialProfiles || {}).some(v => v)); // Example filter
        break;
      case 'grid':
        sourceContacts = this.filteredContacts;
        break;
      default:
        sourceContacts = this.filteredContacts;
        break;
    }

    this.displayedContacts = sourceContacts.slice(0, this.batchSize);
    this.currentBatchIndex = 0;
    this.totalBatches = Math.ceil(sourceContacts.length / this.batchSize);
  }

  private flattenGroupedContacts(): ContactInfo[] {
    return Object.values(this.groupedContacts).flat();
  }


  checkScreenSize() {
    this.screenWidth = window.innerWidth;
  }

  isMobile(): boolean {
    return this.screenWidth < 768; // Adjust breakpoint as needed
  }

  groupContactsAlphabetically() {
    this.groupedContacts = this.contacts.reduce((groups, contact) => {
      const firstLetter = contact.name?.display?.charAt(0).toUpperCase() || 'Unknown';
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(contact);
      return groups;
    }, {} as { [key: string]: ContactInfo[] });
  }

  onGroupToggleDetails(contact: ContactInfo, event: MouseEvent): void {
    // If the clicked contact is already active, toggle it off; otherwise, set it as active.
    if (this.activeContact && this.activeContact.contactId === contact.contactId) {
      this.activeContact = null;
    } else {
      this.activeContact = contact;
    }
    event.stopPropagation();
  }

  watchBusinessCards() {
    if (this.gridcardEl) {
      const gesture = this.gestureCtrl.create({
        el: this.gridcardEl.nativeElement,
        gestureName: 'drag-card',
        threshold: 0,
        onMove: (ev: any) => {
          // Update the card position as it is dragged
          this.cardPosition.x += ev.deltaX;
          this.cardPosition.y += ev.deltaY;
          // Update element style directly
          this.gridcardEl.nativeElement.style.transform =
            `translate(${this.cardPosition.x}px, ${this.cardPosition.y}px)`;
        },
        onEnd: (ev: any) => {
          // Optionally update the final position if needed
        }
      });
      gesture.enable();
    } 
  }

  resetContactDetails(): void {
    this.contacts.forEach(contact => contact.showDetails = false);
    this.activeContact = null;
  }
  
  // Load the next batch of contacts
  loadNextBatch() {
    if (this.currentBatchIndex < this.totalBatches) {
      this.isFetching = true;
      const startIndex = this.currentBatchIndex * this.batchSize;
      const endIndex = startIndex + this.batchSize;
      const batch = this.contacts.slice(startIndex, endIndex);

      setTimeout(() => {
        this.displayedContacts = [...this.displayedContacts, ...batch];
        this.currentBatchIndex++;
        this.isFetching = false;
      }, 500); // Simulate network delay
    }
  }

  checkGridScroll(event: Event): void {
    // Ensure gridView exists; it will because the view has been initialized
    const scrollElement = this.gridView.nativeElement;
    // console.log('I see you scroll - scrollElement', scrollElement);
    // Calculate the distance from the bottom
    const scrollPosition = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
    // When the distance is less than 100 pixels and not already fetching data, load the next batch
    if (scrollPosition < 100 && !this.isFetching) {
      this.loadNextBatch();
    }
  }

  checkRolodexScroll(event: Event): void {
    // Ensure gridView exists; it will because the view has been initialized
    const scrollElement = this.gridView.nativeElement;
    // console.log('I see you scroll - scrollElement', scrollElement);
    // Calculate the distance from the bottom
    const scrollPosition = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
    // When the distance is less than 100 pixels and not already fetching data, load the next batch
    if (scrollPosition < 100 && !this.isFetching) {
      this.loadNextBatch();
    }
  }

  onPrivacyChange(event: SelectCustomEvent) {
    const selectedValue: string = event.detail.value;
    // Since we've removed the 'custom' option, we don't need this logic anymore
    // if (selectedValue === 'custom') {
    //   this.contactForm.get('privacy.sharedWith')?.enable();
    // } else {
    //   this.contactForm.get('privacy.sharedWith')?.disable();
    //   this.contactForm.get('privacy.sharedWith')?.setValue([]); // Clear sharedWith when not custom
    // }
  }
  
  scheduleBirthdayReminder(contact: any): void {
    if (contact.birthday) {
      const { day, month, year } = contact.birthday;
      // Create a Date object for the birthday.
      let birthdayDate = new Date(year, month - 1, day);
      const now = new Date();
      if (birthdayDate < now) {
        birthdayDate.setFullYear(now.getFullYear() + 1);
      }
      // Define the event duration (e.g., 1 hour)
      const endDate = new Date(birthdayDate.getTime() + 60 * 60 * 1000);
      const title = `Birthday Reminder: ${contact.name?.display || 'Family Member'}`;
      const location = ''; // No location for a birthday reminder
      const notes = `Birthday on ${birthdayDate.toDateString()}`;
      const url = ''; // Default empty URL since no URL is relevant for birthdays

      this.deviceConnector.addToCalendar(title, location, notes, birthdayDate.toISOString(), endDate.toISOString(), url);
    }
  }

  // Device activation methods
  callContact(contact: any): void {
    const phone = contact.phones?.[0]?.number;
    if (phone) {
      this.deviceConnector.makeCall(phone);
    } else {
      console.warn('No phone number available for this contact.');
    }
  }

  // ================================================================
  // 2026-08-16 THE CONFIDANTE — the draft is proffered; the user sends.
  // ================================================================
  /** Occasion for a contact: a birthday soon, else a plain check-in. */
  private occasionFor(contact: any): Occasion {
    if (contact?.birthday?.month && contact?.birthday?.day) {
      const now = new Date();
      const bday = new Date(now.getFullYear(), Number(contact.birthday.month) - 1, Number(contact.birthday.day));
      if (bday.getTime() < now.getTime()) bday.setFullYear(now.getFullYear() + 1);
      const days = Math.ceil((bday.getTime() - now.getTime()) / 86400000);
      if (days <= 14) return 'birthday';
    }
    return 'follow-up';
  }

  /** Proffer the message — the user reviews and hits Send. */
  draftMessage(contact: any): void {
    const draft = this.draftEngine.compose(contact, this.occasionFor(contact), contact.contactId);
    const phone = contact.phones?.[0]?.number;
    const email = contact.emails?.[0]?.address;
    this.alertService.showToast('Confidante: message drafted for ' + this.draftEngine.contactName(contact), 2000);
    void this.alertCtrl
      .create({
        header: 'Message proffered by your confidante',
        message: draft,
        buttons: [
          ...(phone ? [{ text: 'Send via SMS', handler: () => { window.location.href = `sms:${phone}?body=${encodeURIComponent(draft)}`; } }] : []),
          ...(email ? [{ text: 'Send via Email', handler: () => { window.location.href = `mailto:${email}?subject=${encodeURIComponent('Reaching out')}&body=${encodeURIComponent(draft)}`; } }] : []),
          { text: 'Set message guide', handler: () => this.setMessageGuide(contact) },
          { text: 'Cancel', role: 'cancel' },
        ],
      })
      .then((a) => a.present());
  }

  /** 2026-08-16 CHAT OFF THE CARD: comms becomes SMS, email AND in-app chat. */
  async openCardChat(contact: any): Promise<void> {
    const thread = await this.cardChat.seedThread(contact);
    const modal = await this.modalController.create({
      component: CardChatModalComponent,
      componentProps: { thread },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.6, 0.75, 0.9],
      initialBreakpoint: 0.75,
    });
    await modal.present();
  }

  /** 2026-08-16 REMINDERS: set a reminder right off the card — note + date,
   *  saved into the contact's reminders list (persisted via editContact). */
  async setReminder(contact: any): Promise<void> {
    const name = this.draftEngine.contactName(contact) || 'this contact';
    const alert = await this.alertCtrl.create({
      header: `Reminder for ${name}`,
      inputs: [
        { name: 'note', type: 'text', placeholder: 'Remind me to…', value: contact.rolodex?.followUp || '' },
        { name: 'date', type: 'date', value: new Date().toISOString().slice(0, 10) },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Set reminder',
          handler: (data: any) => {
            const note = String(data?.note || '').trim();
            if (!note) { void this.alertService.showToast('A note is needed for the reminder'); return false; }
            const when = data?.date ? new Date(data.date + 'T09:00:00') : new Date();
            const clone = { ...contact, reminders: [...(contact.reminders || []), { note, date: when }] };
            (clone as any).updatedAt = new Date();
            this.editContact.emit(clone);
            void this.alertService.showToast(`Reminder set for ${name} — ${when.toLocaleDateString()}`, 2500);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  /** The user's preset — a guide for the agent, or STRICT (deliver as-is). */
  setMessageGuide(contact: any): void {
    const key = contact.contactId || '';
    const existing = this.draftEngine.getGuide(key);
    void this.alertCtrl
      .create({
        header: 'Message guide for ' + this.draftEngine.contactName(contact),
        subHeader: 'Like bot directives: guide the agent, or mark STRICT to deliver as-is.',
        inputs: [
          { name: 'guide', type: 'text', value: existing?.guide || '', placeholder: 'e.g. "{name}, just reminded myself how long it has been — dinner next week?"' },
          { name: 'strict', type: 'checkbox', label: 'Strict — deliver this as-is, no edits', value: 'strict', checked: !!existing?.strict },
        ],
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'Save', handler: (v: any) => {
            this.draftEngine.setGuide(key, { guide: String(v?.guide || '').trim(), strict: !!(v?.strict) });
            this.alertService.showToast('Guide saved — the confidante will follow it', 2000);
          } },
        ],
      })
      .then((a) => a.present());
  }

  emailContact(contact: any): void {
    const email = contact.emails?.[0]?.address;
    if (email) {
      this.deviceConnector.sendEmail(email);
    } else {
      console.warn('No email available for this contact.');
    }
  }

  openAddress(contact: any): void {
    const addr = contact.postalAddresses?.[0];
    if (addr) {
      const addressString = `${addr.street}, ${addr.city}, ${addr.country}`;
      this.deviceConnector.openMaps(addressString);
    } else {
      console.warn('No address available for this contact.');
    }
  }

  openSocial(platform?: string, handle?: string): void {
    if(!platform || !handle) return;
    let url = '';
    switch (platform) {
      case 'x':
        url = 'https://x.com/' + handle;
        break;
      case 'twitter':
        url = 'https://twitter.com/' + handle;
        break;
      case 'telegram':
        url = 'https://t.me/' + handle;
        break;
      case 'snapchat':
        url = 'https://snapchat.com/add/' + handle;
        break;
      case 'tiktok':
        url = 'https://www.tiktok.com/@' + handle;
        break;
      case 'linkedin':
        url = 'https://www.linkedin.com/in/' + handle;
        break;
      case 'facebook':
        url = 'https://www.facebook.com/' + handle;
        break;
      case 'instagram':
        url = 'https://www.instagram.com/' + handle;
        break;
      default:
        console.warn('Unsupported social platform:', platform);
        return;
    }
    // Call deviceConnector to open the URL
    this.deviceConnector.openSocialMedia(url);
  }

  // Method to determine if save button should be enabled
  private updateSaveEnabled() {
    const nameDisplay = this.contactForm.get('name.display')?.value;
    const phones = this.contactForm.get('phones') as FormArray;
    const emails = this.contactForm.get('emails') as FormArray;
    const postalAddresses = this.contactForm.get('postalAddresses') as FormArray;

    // Base minimum: name.display is filled AND at least one contact method exists
    this.saveEnabled =
      !!nameDisplay && nameDisplay.length >= 2 && // Matches Validators.required and minLength(2)
      (
        (phones.length > 0 && phones.controls.some(phone => phone.get('number')?.value)) ||
        (emails.length > 0 && emails.controls.some(email => email.get('address')?.value)) ||
        (postalAddresses.length > 0 && postalAddresses.controls.some(addr => addr.get('street')?.value))
      );

    // Create a debug string
    const debugString = `
      Save Enabled: ${this.saveEnabled}
      Name Display: ${nameDisplay || 'Not provided'}
      Phones Count: ${phones.length}
      Emails Count: ${emails.length}
      Postal Addresses Count: ${postalAddresses.length}
    `.trim();

    // Use updateAlerts instead of console.log
    if (!environment.production || true) { // Show in production for debugging; remove `|| true` later
      this.alertService.updateAlerts({
        header: 'Contact Form Debug Info',
        message: debugString,
      });
    }

    // Force change detection since we're using OnPush
    this.cdr.detectChanges();
  }

  async onSubmit() {
    if (this.saveEnabled) {

      // Update editedContact with the form value
      // Ensure privacy settings are part of the submission
      this.editedContact = {
        ...this.contactForm.value,
        privacy: this.contactForm.get('privacy')?.value
      };

      if (this.selectedMode === 'createContact') {
        this.createContact.emit(this.editedContact);
      } else if (this.selectedMode === 'editContact') {
        this.editContact.emit(this.editedContact);
      }

      // Dismiss the modal with the mode and updated contact
      await this.modalController.dismiss({ mode: this.selectedMode, contact: this.editedContact });
    } else {
      // If form is invalid, mark all fields as touched to trigger validation messages

      this.fomvalidation.markFormGroupTouched(this.contactForm);
      this.fomvalidation.validateAllFormFields(this.contactForm);
    }
  }

  initializeForm() {

    let birthdayValue = '';
    if (this.selectedMode === 'editContact' && this.editedContact.birthday) {
      birthdayValue = this.fomvalidation.convertBirthdayToDate(this.editedContact.birthday);
    }

    this.contactForm = this.fb.group({

      // Contact ID (required for editing)
      contactId: [this.editedContact?.contactId || ''], // 1 // is this error??? Doubt its uility here

      // Name group
      name: this.fb.group({
        display: ['', [Validators.required, Validators.minLength(2)]],
        given: [''],
        middle: [''],
        family: [''],
        prefix: [''],
        suffix: [''],
      }), // 2g

      // Organization group
      organization: this.fb.group({
        company: [''],
        jobTitle: [''],
        department: [''],
      }), // 3g

      // Birthday (as an object)
      birthday: [birthdayValue, [birthdayRangeValidator(18, 120)]],

      // Note (single control)
      note: [''], // 5

      // FormArray for phones
      phones: this.fb.array([]), // 6a

      // FormArray for emails
      emails: this.fb.array([]), // 7a

      // FormArray for postal addresses
      postalAddresses: this.fb.array([]), // 8a // doubtful this should be an array. Group maybe?

      // FormArray for URLs
      urls: this.fb.array([]), // 9a

      // Image group
      image: this.fb.group({
        base64String: [''], // Store the base64-encoded image
        uri: [''], // Store the image URI (if applicable)
      }), // 10 // group ???

      // Privacy group
      privacy: this.fb.group({
        level: ['private'], // Default to 'private'
        sharedWith: [{ value: [], disabled: true }],
      }), // 11g

      // Rolodex group
      rolodex: this.fb.group({
        when: [''],
        where: [''],
        who: [''],
        why: [''],
        how: [''],
        topic: [''],
        followUp: [''],
        personalTidbits: [''],
        outcome: [''],
        priority: [''],
        contactFrequency: [''],
        references: this.fb.array([]),
      }), // 12g

      // Social profiles group
      socialProfiles: this.fb.group({
        twitter: [''],
        linkedin: [''],
        facebook: [''],
        instagram: [''],
      }), // 13g

      // Tags (FormArray)
      tags: ['', uniqueTags()], // 14a

      // Groups (FormArray)
      groups: [''], // 15a

      // SharedBy (FormArray of objects)
      sharedBy: this.fb.array([]), // 16a

      // Last interaction (single control)
      lastInteraction: [null], // 17

      // Next interaction (single control)
      nextInteraction: [null], // 18

      // Reminders (FormArray of objects)
      reminders: this.fb.array([]), // 19a

      // Preferences group
      preferences: this.fb.group({
        refreshContacts: [false],
        notificationPreference: [''],
        theme: [''], // 20g
      }),
    }, {
      // Global validator ensuring at least one contact method is present
      validators: [atLeastOneContactMethod(), this.fomvalidation.atLeastOnePhoneOrEmail2],
    });


    // Handle errors immediately after setting up the form
    this.handleFormErrors();

    // Patch values if in edit mode
    if (this.selectedMode === 'editContact') {
      
      // Custom patching for birthday since form control expects a string
      if (birthdayValue) {
        // console.log('Birthday Value:', birthdayValue);
        // console.log('Form Control Value:', this.contactForm.get('birthday')?.value);

        this.contactForm.get('birthday')?.setValue(birthdayValue);
        // console.log('Form Control Value AFTER .setValue:', this.contactForm.get('birthday')?.value);
      }

      // Patch other values excluding birthday
      const { birthday, ...rest } = this.editedContact;
      this.contactForm.patchValue(rest, { emitEvent: false });

      // Populate phones FormArray
      if (this.editedContact.phones) {
        this.editedContact.phones.forEach(phone => {
          this.addPhone(phone);
        });
      }

      // Populate emails FormArray
      if (this.editedContact.emails) {
        this.editedContact.emails.forEach(email => {
          this.addEmail(email);
        });
      }

      // Populate postalAddresses FormArray
      if (this.editedContact.postalAddresses) {
        this.editedContact.postalAddresses.forEach(address => {
          this.addPostalAddress(address);
        });
      }

      // Enable sharedWith if privacy level is custom
      if (this.editedContact.privacy?.level === 'custom') {
        this.contactForm.get('privacy.sharedWith')?.enable();
      }
    }
  }

  hasControl(controlName: string): boolean {
    return !!this.contactForm.get(controlName);
  }

  // Handle file selection for image upload
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Optionally convert file to a data URL or safe URL for display or storage
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result;
        // You can store imageData in the form or a component property as needed.
        // For example: this.contactForm.patchValue({ image: imageData });
      };
      reader.readAsDataURL(file);
    }
  }

  private handleFormErrors() {
    // Subscribe to value changes for real-time validation
    this.contactForm.get('birthday')?.valueChanges.subscribe((value: any) => {
      this.checkBirthdayErrors();
    });

    // Initial check for errors
    this.checkBirthdayErrors();
  }

  checkBirthdayErrors() {
    const birthdayControl = this.contactForm.get('birthday');
    if (birthdayControl && birthdayControl.errors) {
      if (birthdayControl.errors['invalidDate']) this.setError('birthday', 'Invalid date format');
      else if (birthdayControl.errors['invalidBirthdayRange']) {
        const { minAge, maxAge } = birthdayControl.errors['invalidBirthdayRange'];
        this.setError('birthday', `Birthday must be between ${minAge} and ${maxAge} years ago`);
      }
    } else this.clearError('birthday');
  }

  getRangeErrorMessage(field: string): string {
    const control = this.contactForm.get(field);
    if (control && control.errors && control.errors['invalidBirthdayRange']) {
      const { minAge, maxAge } = control.errors['invalidBirthdayRange'];
      return `Birthday must be between ${minAge} and ${maxAge} years ago`;
    }
    return 'Must be our fault. We are looking into it.'; // Default or fallback message
  }

  private setError(field: string, message: string) {
    // Example of setting error in UI
    // Here you might update the UI to show this error message
    console.log(`Error on field ${field}: ${message}`);
    // You would typically update the view here, e.g., 
    // this.errors[field] = message;
  }

  private clearError(field: string) {
    // Clear any error message for this field

    if(!environment.production) {
      console.log(`Clearing error on field ${field}`);
    }

    // Similar to setError, update your UI logic here
    // this.errors[field] = null;
  }
  // Create form groups for dynamic arrays
  createPhoneGroup(): FormGroup {
    return this.fb.group({
      number: [''],
      type: ['']
    });
  }

  createEmailGroup(): FormGroup {
    return this.fb.group({
      address: [''],
      type: ['']
    });
  }

  createAddressGroup(): FormGroup {
    return this.fb.group({
      street: [''],
      city: [''],
      country: [''],
      postcode: [''],
      type: ['']
    });
  }

  // ----------------------------------
      // WATCH & develop


  get sharedBy(): FormArray {
    return this.contactForm.get('sharedBy') as FormArray;
  }

  addSharedByEntry(entry?: { ringaID: string; context: string; dateShared: Date }) {
    const sharedByGroup = this.fb.group({
      ringaID: [entry?.ringaID || ''], // User ID
      context: [entry?.context || ''], // Context of sharing
      dateShared: [entry?.dateShared || ''], // Date shared
    });
    this.sharedBy.push(sharedByGroup);
  }

  removeSharedByEntry(index: number) {
    this.sharedBy.removeAt(index);
  }

  // &&&&&&&&&&&&&===================================
  // Background Management:
  //   Since sharedBy is not user - editable, you can manage it programmatically.For example, when a contact is shared, call addSharedByEntry to add a new entry:

  shareContact(ringaID: string, context: string) {
    const sharedByEntry = {
      ringaID: ringaID,
      context: context,
      dateShared: new Date(),
    };
    this.addSharedByEntry(sharedByEntry);
  } 

  // -----------------------------
  // Dynamic FormArray Helpers
  // -----------------------------

  // Rolodex

  addReference() {
    // Add a new empty control to references
    this.references.push(this.fb.control(''));
  }

  removeReference(index: number) {
    this.references.removeAt(index);
  }

  // Phones
  get phones(): FormArray {
    return this.contactForm.get('phones') as FormArray;
  }

  get postalAddresses(): FormArray {
    return this.contactForm.get('postalAddresses') as FormArray;
  }

  get references(): FormArray {
    // Access the array under the mainForm.rolodex.references
    return this.contactForm.get('rolodex.references') as FormArray;
  }

  get reminders(): FormArray {
    return this.contactForm.get('reminders') as FormArray;
  }

  get emails(): FormArray {
    return this.contactForm.get('emails') as FormArray;
  }

  get urls(): FormArray {
    return this.contactForm.get('urls') as FormArray;
  }

  addPhone(phone?: PhonePayload) {
    const phoneGroup = this.fb.group({
      type: [phone?.type || PhoneType.Home],
      label: [phone?.label || ''],
      isPrimary: [phone?.isPrimary || false],
      number: [phone?.number || '', Validators.required],
    });
    this.phones.push(phoneGroup);
    this.updateSaveEnabled(); // Explicitly check after adding
  }

  addEmail(email?: EmailPayload) {
    const emailGroup = this.fb.group({
      type: [email?.type || EmailType.Home],
      label: [email?.label || ''],
      isPrimary: [email?.isPrimary || false],
      address: [email?.address || '', [Validators.required, Validators.email]],
    });
    this.emails.push(emailGroup);
    this.updateSaveEnabled(); // Explicitly check after adding
  }
  addPostalAddress(address?: PostalAddressPayload) {
    const addressGroup = this.fb.group({
      type: [address?.type || PostalAddressType.Home],
      label: [address?.label || ''],
      isPrimary: [address?.isPrimary || false],
      street: [address?.street || ''],
      neighborhood: [address?.neighborhood || ''],
      city: [address?.city || ''],
      region: [address?.region || ''],
      postcode: [address?.postcode || ''],
      country: [address?.country || ''],
    });
    this.postalAddresses.push(addressGroup);
    this.updateSaveEnabled(); // Explicitly check after adding
  }

  removePhone(index: number) {
    this.phones.removeAt(index);
    this.updateSaveEnabled(); // Recheck after removal
  }

  removeEmail(index: number) {
    this.emails.removeAt(index);
    this.updateSaveEnabled(); // Recheck after removal
  }

  removePostalAddress(index: number) {
    this.postalAddresses.removeAt(index);
    this.updateSaveEnabled(); // Recheck after removal
  }

  addReminder(reminder?: { note: string; date: Date }) {
    const reminderGroup = this.fb.group({
      note: [reminder?.note || ''], // Reminder note
      date: [reminder?.date || ''], // Reminder date
    });
    this.reminders.push(reminderGroup);
  }

  removeReminder(index: number) {
    this.reminders.removeAt(index);
  }

  // URLs

  addUrl(): void {
    this.urls.push(this.fb.control(''));
  }

  removeUrl(index: number): void {
    this.urls.removeAt(index);
  }

  // -----------------------------
  // Optional: Error Message Helper
  // -----------------------------
  getErrorMessage(controlName: string, errorType: string): string {
    const control = this.contactForm.get(controlName);

    if (control?.hasError(errorType)) {
      switch (errorType) {
        case 'required':
          return `${controlName} is required.`;
        case 'minlength':
          return `Must be at least 2 characters long.`;
        case 'email':
          return `Please enter a valid email address.`;
        case 'noContactMethod':
          return `At least one contact method is required (phone/email/address).`;
        // Add more cases for custom validators
      }
    }
    return '';
  }

  // standby to handle all potential options of the ContactCardComponent
  selectMode(mode: string) {
    this.selectedMode = mode;

    // Handle direct email or phone input within the modal
    if (mode === 'emailDirect' || mode === 'phoneDirect') {
      // Show the input fields for these specific platforms (handled in the template)
    } else if (mode === 'socialMedia') {
      this.openContactCardSheet();
    } else {
      // Dismiss the modal for general platforms like WhatsApp
      this.modalController.dismiss({ mode });
    }
  }

  // Opens the social media action sheet
  async openContactCardSheet() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'More Sharing Options',
      buttons: [
        {
          text: 'Facebook',
          icon: 'logo-facebook',
          handler: () => {
            this.selectMode('facebook');
          }
        },
        {
          text: 'Instagram',
          icon: 'logo-instagram',
          handler: () => {
            this.selectMode('instagram');
          }
        },
        {
          text: 'X (Twitter)',
          icon: 'logo-x',
          handler: () => {
            this.selectMode('x');
          }
        },
        {
          text: 'LinkedIn',
          icon: 'logo-linkedin',
          handler: () => {
            this.selectMode('linkedin');
          }
        },
        {
          text: 'TikTok',
          icon: 'logo-tiktok',
          handler: () => {
            this.selectMode('tiktok');
          }
        },
        {
          text: 'Telegram',
          icon: 'paper-plane-outline',
          handler: () => {
            this.selectMode('telegram');
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel',
        },
      ]
    });

    await actionSheet.present();
  }

  closeFlipModal(): void {
    if (this.activeContact) {
      this.activeContact.showDetails = false;
    }

    this.isFlipped = false; // Reset flip state when closing modal
    // Reset active contact if needed
    this.activeContact = null;
    this.cdr.detectChanges();
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
    console.log('Card flipped:', this.isFlipped); // Debugging
  }

  flipRolodexcard(contact: ContactInfo): void {
    // Toggle the isFlipped property on the contact object.
    // Ensure that each contact object in pageManager.displayedContacts has an `isFlipped` property.
    contact.isFlipped = !contact.isFlipped;
  }

  // Function to toggle details for each contact or close flipModal if same contact clicked
  onToggleDetails(contact: ContactInfo, event: MouseEvent): void {
    // Close details for all contacts first
    this.contacts.forEach(c => c.showDetails = false);

    if (this.activeContact === contact) {
      this.closeFlipModal();
      this.activeContact = null;
      return;
    } else {
      this.activeContact = contact;
      this.isFlipped = false;
      contact.showDetails = true;
    }

    const offset = 20; // gap from the click point
    const clickX = event.clientX;
    const clickY = event.clientY;

    // Fallback dimensions (adjust as needed)
    let cardWidth = 300;
    let cardHeight = 400;

    // If the grid card element is available, use its bounding rectangle
    if (this.gridcardEl && this.gridcardEl.nativeElement) {
      const rect = this.gridcardEl.nativeElement.getBoundingClientRect();
      if (rect.width) {
        cardWidth = rect.width;
      }
      if (rect.height) {
        cardHeight = rect.height;
      }
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let posX: number;
    let posY: number;

    // Calculate horizontal position:
    // If the card would overflow on the right, try to position it to the left.
    if (clickX + offset + cardWidth > viewportWidth) {
      posX = Math.max(clickX - cardWidth - offset, 0);
    } else {
      posX = clickX + offset;
    }

    // Calculate vertical position:
    // If the card would overflow on the bottom, try to position it above.
    if (clickY + offset + cardHeight > viewportHeight) {
      posY = Math.max(clickY - cardHeight - offset, 0);
    } else {
      posY = clickY + offset;
    }

    // Update the card's position for display
    this.cardPosition = { x: posX, y: posY };
    this.cdr.detectChanges(); // Ensure the view updates
  }

  onEditContact(contact?: ContactInfo) {
    this.editContact.emit(this.contact);
  }

  onRemoveContact(contact?: ContactInfo) {
    this.removeContact.emit(this.contact);
  }

  handleImageError(event: Event) {
    // Handle image error, e.g., set a default image
    (event.target as HTMLImageElement).src = this.avatarImage;
  }

  async readDetails(displayPicture?: SafeUrl | string) {
    if (displayPicture) {
    
      let imageUrl: string;
      if (typeof displayPicture === 'string') {
        imageUrl = displayPicture;
      } else {
        // Bypass Security Trust for URL if it's SafeUrl
        
        // Correctly sanitize the SafeUrl to string
        imageUrl = this.sanitizer.sanitize(SecurityContext.URL, displayPicture) as string;
      }

      const modal = await this.modalController.create({
        component: ImageViewerComponent,
        componentProps: {
          imageUrl: displayPicture  // Pass the image URL to the modal
        },
        cssClass: 'ion-img-viewer',
        keyboardClose: true,
        showBackdrop: true
      });

      return await modal.present();
    } else {
      console.log('no displayPicture string to work with');
    }
  }

  additional() {
    this.additionalInfo = !this.additionalInfo;
  }

  closeModal() {
    this.modalController.dismiss();
  }
  
}