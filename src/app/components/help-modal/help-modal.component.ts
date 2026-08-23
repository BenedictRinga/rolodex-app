import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalController } from '@ionic/angular';

export interface HelpFeature {
  id: string;
  title: string;
  guide: string;
  goLabel?: string;
}

/**
 * 2026-08-16 THE DEMO — a help modal that IS the tour: every feature, a
 * succinct guide, and one tap transports the user to that section. No staged
 * narration needed; the product explains itself.
 */
@Component({
  selector: 'app-help-modal',
  template: `
  <ion-header>
    <ion-toolbar>
      <ion-title>LoopKeeper — features</ion-title>
      <ion-buttons slot="end">
        <ion-button (click)="close()"><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <h2 style="margin:0 0 4px; font-size:18px;">Your people, kept right.</h2>
    <p style="margin:0 0 14px; color:var(--rolodex-text-secondary); font-size:13px;">
      Everything below is live in this app — tap <b>Go</b> on any feature to jump to it.
    </p>

    <ng-container *ngFor="let group of groups">
      <h3 style="font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:#58a6ff; margin:16px 0 6px;">{{ group.label }}</h3>
      <ion-item *ngFor="let f of group.features" style="--padding-start:0;">
        <ion-label>
          <b>{{ f.title }}</b>
          <p style="font-size:12px; white-space:normal; color:var(--rolodex-text-secondary); margin:2px 0 0;">{{ f.guide }}</p>
        </ion-label>
        <ion-button slot="end" size="small" fill="outline" *ngIf="f.goLabel" (click)="go(f)">{{ f.goLabel }}</ion-button>
      </ion-item>
    </ng-container>

    <p style="margin-top:18px; color:var(--rolodex-text-secondary); font-size:12px;">
      Built on your device first — then Cloud or the LoopKeeper Server, your choice.
    </p>
  </ion-content>
  `,
})
export class HelpModalComponent {
  @Output() navigate = new EventEmitter<string>();
  /** 2026-08-22 ROBUST NAVIGATION: a direct callback avoids the modal-instance
   *  EventEmitter subscription that silently failed in production/AOT builds. */
  @Input() onNavigate?: (featureId: string) => void;

  groups: { label: string; features: HelpFeature[] }[] = [
    {
      label: 'Your people',
      features: [
        { id: 'cards', title: 'The cards', guide: 'Flip a card to see every detail — phones, emails, addresses, socials, notes, tags and groups. Tap Call, Email or Map to act on the spot.', goLabel: 'Flip a card' },
        { id: 'search', title: 'Find the person you owe', guide: 'Search a person, or browse by alphabetical groups — Family, Business, Friends.', goLabel: 'Search' },
        { id: 'merge', title: 'One person, one card', guide: 'Duplicates merge automatically — no more scattered entries for the same person.', goLabel: 'Merge' },
      ],
    },
    {
      label: 'Keeping in touch (the tiny loops)',
      features: [
        { id: 'overdue', title: 'Follow-up engine', guide: 'Every card carries a rhythm and a priority. The engine schedules the check-ins and surfaces who you owe a reply — the small loops everyone avoids, caught before they go cold.', goLabel: 'See overdue' },
        { id: 'birthdays', title: 'Birthday reminders', guide: 'Upcoming birthdays are flagged and one tap drops them into your calendar.', goLabel: 'Birthdays' },
        { id: 'health', title: 'Who went quiet', guide: 'The person who has gone quiet longest is surfaced first — start there.', goLabel: 'See who' },
        { id: 'reminders', title: 'Card reminders', guide: 'Set a reminder right on a card — a note and a date — and it lives with the person.', goLabel: 'Set one' },
      ],
    },
    {
      label: 'Your essentials, your choice',
      features: [
        { id: 'storage', title: 'Where your essentials live', guide: 'Device, Cloud (Dropbox · Drive · OneDrive), or the LoopKeeper Server — pick per your trust level. You choose what goes where, and sync across devices.', goLabel: 'Choose' },
        { id: 'sync', title: 'Cloud sync', guide: 'Encrypted push/pull to the cloud provider of your choice, with a passphrase.', goLabel: 'Sync' },
      ],
    },
    {
      label: 'FAQ',
      features: [
        { id: 'faq-lock', title: 'I forgot my app-lock PIN', guide: 'The PIN is stored hashed on your device — nobody can read or recover it. The clean reset is to clear LoopKeeper\'s app data (Settings → Apps → LoopKeeper → Clear storage) or reinstall. Contacts already synced to the LoopKeeper Server / cloud come back after you sign in again.' },
        { id: 'faq-passphrase', title: 'I forgot my sync passphrase', guide: 'The passphrase is never stored anywhere, so the old cloud bundle cannot be decrypted without it. Set a new passphrase to start a fresh encrypted bundle; the previous bundle stays unrecoverable by design.' },
        { id: 'faq-url', title: 'Where does LoopKeeper live?', guide: 'The PWA lives at zyppar.com/loopkeeper/ — bookmark that exact URL, not the bare zyppar.com home.' },
      ],
    },
    {
      label: 'Coming next',
      features: [
        { id: 'chat', title: 'Chat off the card', guide: 'Flip to a card and message right there — no separate chatroom list. The thread lives with the person.' },
        { id: 'video', title: 'Video off the card', guide: 'A call, straight from the card, when you need the face — not a ringtone menu.' },
        { id: 'ai', title: 'AI drafts — getting smarter', guide: 'Drafts composed from your card’s context — you just hit Send. Rolling out across the follow-up engine first.' },
      ],
    },
  ];

  constructor(private modalCtrl: ModalController) {}

  go(f: HelpFeature): void {
    this.navigate.emit(f.id);
    this.onNavigate?.(f.id);
    void this.modalCtrl.dismiss();
  }

  close(): void {
    void this.modalCtrl.dismiss();
  }
}
