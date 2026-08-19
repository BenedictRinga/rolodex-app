import { Component } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { RolodexSyncService } from '../../services/rolodex-sync/rolodex-sync.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { DraftEngineService } from '../../services/draft-engine/draft-engine.service';

type ChatMode = '' | 'feedback' | 'help';

/**
 * 2026-08-19 CHAT WITH ROLODEXAI — a REAL chat with the Confidante, not presets.
 *
 * The banner frames two paths: help improve RolodexAI, or get help using it.
 * After the user chooses, every reply comes from the live AI (DeepSeek or Grok
 * through the rolodex-server proxy). Feedback mode gleans a summary for the
 * Investors portal after a bare minimum of exchanges; help mode is kept short
 * by the backend directive and both modes hand off to free DeepSeek/Grok chats
 * when the session limit is reached.
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
  mode: ChatMode = '';
  chatReady = false;
  private history: { role: 'user' | 'assistant'; content: string }[] = [];
  private userMessageCount = 0;
  private handedOff = false;
  private readonly MIN_FEEDBACK_EXCHANGES = 2;
  private readonly MAX_HELP_EXCHANGES = 4;
  private readonly MAX_TOTAL_EXCHANGES = 5;
  private readonly DEEPSEEK_URL = 'https://chat.deepseek.com/';
  private readonly GROK_URL = 'https://grok.com/';
  private engine = 'deepseek';

  constructor(
    private readonly modalController: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly rolodexSync: RolodexSyncService,
    private readonly alerts: AlertsService,
    private readonly draftEngine: DraftEngineService,
  ) {}

  chooseMode(mode: 'feedback' | 'help'): void {
    if (this.mode) return;
    this.mode = mode;
    void this.start();
  }

  /** Open the chat with a REAL AI greeting for the chosen mode. */
  private async start(): Promise<void> {
    try {
      const status = await this.draftEngine.aiStatus();
      this.engine = status.grokConfigured && !status.deepseekConfigured ? 'grok' : 'deepseek';
    } catch { /* default deepseek; backend falls back */ }

    this.messages.push({ from: 'system', text: 'Connecting to the Confidante…' });
    const openingPrompt = this.mode === 'help'
      ? 'The user needs help using RolodexAI. Greet them warmly and ask what they are trying to do. Keep it to 1-2 sentences.'
      : 'Please greet me warmly and ask what one thing about RolodexAI feels frustrating or missing. Keep it to 1-2 sentences.';
    const opening = await this.chat([{ role: 'user', content: openingPrompt }]);
    this.chatReady = true;
    if (opening.reply) {
      this.messages[0] = { from: 'system', text: opening.reply };
      this.history.push({ role: 'assistant', content: opening.reply });
    } else {
      this.messages[0] = {
        from: 'system',
        text: 'The live Confidante is not reachable right now. Tell us what you need anyway, or use the free AI chats below for the deep dive.',
      };
    }
  }

  send(): void {
    const text = this.input.trim();
    if (!text || !this.chatReady || !this.mode) return;
    this.input = '';
    this.messages.push({ from: 'user', text });
    this.history.push({ role: 'user', content: text });
    this.userMessageCount++;
    this.messages.push({ from: 'system', text: '…' });

    void (async () => {
      const res = await this.chat(this.history);
      const reply = res.reply || 'The live Confidante did not reply. Try again, or open a free AI chat below.';
      const idx = this.messages.findIndex((m) => m.text === '…' && m.from === 'system');
      if (idx >= 0) this.messages[idx] = { from: 'system', text: reply };
      else this.messages.push({ from: 'system', text: reply });
      this.history.push({ role: 'assistant', content: reply });

      if (this.handedOff) return;

      if (this.mode === 'feedback' && this.userMessageCount >= this.MIN_FEEDBACK_EXCHANGES) {
        this.handedOff = true;
        await this.gleanAndOffer();
      } else if (this.mode === 'help' && this.userMessageCount >= this.MAX_HELP_EXCHANGES) {
        this.handedOff = true;
        await this.offerFreeChats('You’ve got the essentials — for deeper help, continue in a free AI chat.');
      } else if (this.userMessageCount >= this.MAX_TOTAL_EXCHANGES) {
        this.handedOff = true;
        await this.offerFreeChats('This chat window is intentionally short — the free AI chats below can go as deep as you like.');
      }
    })();
  }

  /** Real chat call through the rolodex-server proxy. */
  private async chat(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<{ reply: string; fallback: boolean }> {
    try {
      const res = await fetch(`${environment.rolodexApiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: this.engine, messages }),
      });
      if (!res.ok) return { reply: '', fallback: true };
      const data = await res.json();
      return { reply: String(data?.reply || ''), fallback: !!data?.fallback };
    } catch {
      return { reply: '', fallback: true };
    }
  }

  /** Feedback mode: AI-glean the direction, store it, then hand off. */
  private async gleanAndOffer(): Promise<void> {
    const summaryRes = await this.chat([
      ...this.history,
      {
        role: 'user',
        content: 'Summarize the user\'s suggestion in one concise line shaped as: Frustration: ... — Direction: ...',
      },
    ]);
    const userTexts = this.history.filter((m) => m.role === 'user').map((m) => m.content);
    const summary = summaryRes.reply || `Frustration: ${userTexts[0] || ''} — Direction: ${userTexts[1] || userTexts[0] || ''}`;

    try {
      const res = await fetch(`${environment.rolodexApiBase}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.rolodexSync.getDeviceId(),
          deviceName: 'Chat with RolodexAI',
          messages: userTexts,
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

    await this.offerFreeChats('You’ve given us the direction. Open one of these free chats in a new tab and continue the brainstorm there:');
  }

  /** The shared handoff notification — DeepSeek and Grok open in new tabs. */
  private async offerFreeChats(message: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Take it deeper — free AI chats',
      message,
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
