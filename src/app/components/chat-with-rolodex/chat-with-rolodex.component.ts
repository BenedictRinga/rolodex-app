import { Component } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { RolodexSyncService } from '../../services/rolodex-sync/rolodex-sync.service';
import { AlertsService } from '../../services/alerts/alerts.service';

/**
 * 2026-08-19 CHAT WITH ROLODEXAI — the suggestion channel.
 *
 * The modal opens with a visible banner: "How can we make RolodexAI better
 * for you?" That frames the whole conversation. The Confidante holds a bare
 * minimum of exchanges (two user messages), gleans the direction into a
 * summary, stores it for the Investors portal, then pops a notification with
 * two links — free DeepSeek and free Grok chats — each opening in a new tab.
 */
@Component({
  selector: 'app-chat-with-rolodex',
  templateUrl: './chat-with-rolodex.component.html',
  styleUrls: ['./chat-with-rolodex.component.scss'],
  standalone: false,
})
export class ChatWithRolodexModalComponent {
  messages: { from: 'system' | 'user'; text: string }[] = [];
  input = '';
  private userMessageCount = 0;
  private submitted = false;
  private readonly MIN_EXCHANGES = 2;
  private readonly DEEPSEEK_URL = 'https://chat.deepseek.com/';
  private readonly GROK_URL = 'https://grok.com/';

  constructor(
    private readonly modalController: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly rolodexSync: RolodexSyncService,
    private readonly alerts: AlertsService,
  ) {
    this.messages.push({
      from: 'system',
      text: 'Hi! I’m the Confidante. The banner already said it, so let’s keep this tight: what is one thing about RolodexAI that feels frustrating or missing?',
    });
  }

  send(): void {
    const text = this.input.trim();
    if (!text) return;
    this.messages.push({ from: 'user', text });
    this.input = '';
    this.userMessageCount++;

    if (this.userMessageCount >= this.MIN_EXCHANGES && !this.submitted) {
      this.submitted = true;
      void this.finishAndOffer();
      return;
    }

    this.messages.push({
      from: 'system',
      text: 'Got it — that’s the frustration. If we could change ONE thing to fix that, what would it look like?',
    });
  }

  /** Glean the direction, store it, then hand the user to free AI chats. */
  private async finishAndOffer(): Promise<void> {
    const userMessages = this.messages.filter((m) => m.from === 'user').map((m) => m.text);
    const summary = `Frustration: ${userMessages[0] || ''} — Direction: ${userMessages[1] || userMessages[0] || ''}`;
    this.messages.push({
      from: 'system',
      text: 'Perfect — I’ve logged that. For the full brainstorm I’m handing you to the free AI chats now.',
    });

    try {
      const res = await fetch(`${environment.rolodexApiBase}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.rolodexSync.getDeviceId(),
          deviceName: 'Chat with RolodexAI',
          messages: userMessages,
          summary,
        }),
      });
      if (res.ok) {
        await this.alerts.showToast('Thank you — your suggestion is in the investors’ room.', 3500);
      } else {
        await this.alerts.showToast('Could not send the suggestion — it stayed on this device.', 3000);
      }
    } catch {
      await this.alerts.showToast('Could not send the suggestion — it stayed on this device.', 3000);
    }

    const alert = await this.alertCtrl.create({
      header: 'Take it deeper — free AI chats',
      message: 'You’ve given us the direction. Open one of these free chats in a new tab and continue the brainstorm there:',
      buttons: [
        { text: 'Later', role: 'cancel' },
        {
          text: 'DeepSeek (free)',
          handler: () => {
            window.open(this.DEEPSEEK_URL, '_blank', 'noopener');
            return true;
          },
        },
        {
          text: 'Grok (free)',
          handler: () => {
            window.open(this.GROK_URL, '_blank', 'noopener');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
