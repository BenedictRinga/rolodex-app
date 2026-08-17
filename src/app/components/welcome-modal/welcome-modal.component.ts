import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';

export const WELCOME_DISMISSED_KEY = 'rolodex_welcome_dismissed';

@Component({
  selector: 'app-welcome-modal',
  templateUrl: './welcome-modal.component.html',
  styleUrls: ['./welcome-modal.component.scss'],
  standalone: false,
})
export class WelcomeModalComponent {
  features = [
    { icon: 'people-circle-outline', color: 'var(--rolodex-accent)', title: 'The card is everything', desc: 'Flip to a contact — chat, reminders, follow-ups, and the confidante are right there on the card.' },
    { icon: 'notifications-outline', color: 'var(--rolodex-info)', title: 'The follow-up engine', desc: 'It schedules the check-ins you keep meaning to make — the daily reason to come back.' },
    { icon: 'sparkles-outline', color: 'var(--rolodex-warning)', title: 'The confidante', desc: 'The confidential secretary drafts the message in your own voice — you just hit Send.' },
    { icon: 'people-outline', color: 'var(--rolodex-success)', title: 'Pods, not chatrooms', desc: 'Group threads from your groups — shared schedule, shared reminders.' },
    { icon: 'card-outline', color: 'var(--rolodex-info)', title: 'Basic $1 · Confidante $5', desc: 'Basic gives you the Assistant — 5 AI interventions a month, a taste. Confidante lets the AI work all month.' },
  ];

  constructor(private readonly modalController: ModalController) {}

  start(): void {
    void this.modalController.dismiss('start', 'close');
  }

  dontShowAgain(): void {
    try { localStorage.setItem(WELCOME_DISMISSED_KEY, '1'); } catch { /* ignore */ }
    void this.modalController.dismiss('dismissed', 'close');
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
