import { Component, Input, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { RolodexSyncService } from '../../services/rolodex-sync/rolodex-sync.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { DraftEngineService } from '../../services/draft-engine/draft-engine.service';
import { StorageService } from '../../services/storage/storage.service';
import { ContactInfo } from '../../models/contacts';
import { ConfidanteComposerModalComponent } from '../confidante-composer-modal/confidante-composer-modal.component';

type ChatMode = '' | 'feedback' | 'help' | 'situation';

/**
 * 2026-08-19 CHAT WITH ROLODEXAI — a REAL chat with the Assistant, not presets.
 *
 * Modes:
 *  - feedback (DIRECTION): free-form chat about what's missing / where RolodexAI
 *    should go — capped after a few exchanges, summary to the Investors room.
 *  - help: how to use the app.
 *  - situation (THE TASTE): work through a real postponed communication.
 *    The AI collects the 4 W's + critical context WITHOUT asking for the other
 *    person's name/number. When ready, the user picks the person from their
 *    phone; the composed draft slots into the Assistant composer where they
 *    choose the medium — distribution in exchange for easing a problem.
 */
@Component({
  selector: 'app-chat-with-rolodex',
  templateUrl: './chat-with-rolodex.component.html',
  styleUrls: ['./chat-with-rolodex.component.scss'],
  standalone: false,
})
export class ChatWithRolodexModalComponent implements OnInit {
  @Input() startMode: ChatMode = '';

  messages: { from: 'system' | 'user'; text: string }[] = [];
  input = '';
  mode: ChatMode = '';
  chatReady = false;

  // Situation mode state
  situationCount = 0;
  situationOrdinalLabel = '';
  pickContactCard = false;
  situationDraft = '';
  situationPicked = false;
  private readonly SITUATION_COUNT_KEY = 'rolodex_situation_count';

  private history: { role: 'user' | 'assistant'; content: string }[] = [];
  private userMessageCount = 0;
  private handedOff = false;
  private readonly MIN_FEEDBACK_EXCHANGES = 4;
  private readonly MAX_HELP_EXCHANGES = 4;
  private readonly MAX_TOTAL_EXCHANGES = 6;
  private readonly DEEPSEEK_URL = 'https://chat.deepseek.com/';
  private readonly GROK_URL = 'https://grok.com/';
  private engine = 'deepseek';

  constructor(
    private readonly modalController: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly rolodexSync: RolodexSyncService,
    private readonly alerts: AlertsService,
    private readonly draftEngine: DraftEngineService,
    private readonly storage: StorageService,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.startMode) {
      await this.begin(this.startMode);
    }
  }

  chooseMode(mode: 'feedback' | 'help'): void {
    if (this.mode) return;
    void this.begin(mode);
  }

  /** Start a mode: feedback, help, or the situation (taste) flow. */
  private async begin(mode: ChatMode): Promise<void> {
    if (this.mode) return;
    this.mode = mode;
    this.chatReady = false;

    if (mode === 'situation') {
      try {
        this.situationCount = Number(await this.storage.get<number>(this.SITUATION_COUNT_KEY)) || 0;
      } catch { /* first time */ }
      this.situationOrdinalLabel = this.ordinal(this.situationCount + 1);
    }

    try {
      const status = await this.draftEngine.aiStatus();
      this.engine = status.grokConfigured && !status.deepseekConfigured ? 'grok' : 'deepseek';
    } catch { /* default deepseek; backend falls back */ }

    this.messages.push({ from: 'system', text: 'Connecting to the Assistant…' });
    const openingPrompt = this.openingPromptFor(mode);
    const opening = await this.chat([{ role: 'user', content: openingPrompt }]);
    this.chatReady = true;
    if (opening.reply) {
      this.messages[0] = { from: 'system', text: opening.reply };
      this.history.push({ role: 'assistant', content: opening.reply });
    } else {
      this.messages[0] = {
        from: 'system',
        text: mode === 'situation'
          ? 'The live Assistant is not reachable right now. Tell us about the loop challenge anyway — we can still work through it.'
          : 'The live Assistant is not reachable right now. Tell us what you need anyway, or use the free AI chats below for the deep dive.',
      };
    }
  }

  private openingPromptFor(mode: ChatMode): string {
    switch (mode) {
      case 'help':
        return 'The user needs help using LoopKeeper. Greet them warmly and ask what they are trying to do. Keep it to 1-2 sentences.';
      case 'situation':
        return `We are working together to improve a ${this.situationOrdinalLabel} loop challenge — one of the user's failed, weak, or delayed communication loops (up to five in total). Greet them warmly and ask, one question at a time, for the 4 W's and any critical context (who the person is to them, what they owe, where they met, when it started, why it matters, topic, follow-up, tidbits). Keep it to 1-2 sentences.`;
      case 'feedback':
      default:
        return 'Greet the user warmly and tell them this is a free-form direction chat: what is missing in LoopKeeper, what the app should become, what feels wrong or unclear. No menus, no right answers. Ask what direction we should take next. Keep it to 1-2 sentences.';
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
      const reply = res.reply || 'The live Assistant did not reply. Try again, or open a free AI chat below.';
      const idx = this.messages.findIndex((m) => m.text === '…' && m.from === 'system');
      if (idx >= 0) this.messages[idx] = { from: 'system', text: reply };
      else this.messages.push({ from: 'system', text: reply });
      this.history.push({ role: 'assistant', content: reply });

      if (this.handedOff) return;

      if (this.mode === 'situation') {
        await this.maybeSituationStep();
        return;
      }

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

  /** Situation mode: after a little context, show the phone-picker card and
   *  ask the Assistant to compose the actual message draft. */
  private async maybeSituationStep(): Promise<void> {
    if (this.userMessageCount >= 2 && !this.pickContactCard) {
      this.pickContactCard = true;
      this.messages.push({
        from: 'system',
        text: 'That’s enough context for now — when you’re ready, tap the card below to pick the person from your phone.',
      });
      const draftRes = await this.chat([
        ...this.history,
        {
          role: 'user',
          content: 'Now compose the message to this person using the context gathered. Keep it one warm, human paragraph.',
        },
      ]);
      if (draftRes.reply) {
        this.situationDraft = draftRes.reply;
        this.messages.push({ from: 'system', text: draftRes.reply });
        this.history.push({ role: 'assistant', content: draftRes.reply });
      }
    }
  }

  /** 2026-08-19 THE TASTE: open the native Contact Picker, then hand the
   *  composed draft + selected person to the Assistant composer for dispatch. */
  async pickFromPhone(): Promise<void> {
    const picker = (navigator as any)?.contacts;
    if (!picker?.select) {
      await this.alerts.showToast('Contact picking needs Android Chrome — or add the person from Settings → Add contacts.', 4000);
      return;
    }
    try {
      const picked = await picker.select(['name', 'tel', 'email', 'address', 'icon'], { multiple: false });
      const raw = picked?.[0];
      if (!raw) return; // cancelled
      const contact = this.mapPicked(raw);

      this.situationPicked = true;
      this.situationCount = (this.situationCount || 0) + 1;
      await this.storage.set(this.SITUATION_COUNT_KEY, this.situationCount);

      await this.modalController.dismiss();
      const composer = await this.modalController.create({
        component: ConfidanteComposerModalComponent,
        componentProps: {
          contact,
          occasion: 'follow-up',
          initialDraft: this.situationDraft,
          initialInstruction: 'Refine it if you like — then choose how to send it.',
        },
        cssClass: 'card-chat-modal-sheet',
        breakpoints: [0, 0.7, 0.95, 1],
        initialBreakpoint: 0.95,
        keyboardClose: false,
      });
      await composer.present();
    } catch {
      await this.alerts.showToast('Contact picking was cancelled.', 2500);
    }
  }

  /** Minimal-but-complete mapper for a picked phone contact. */
  private mapPicked(raw: any): ContactInfo {
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
    const display = (nameFormatted || nameString || joined || 'Picked contact').trim();
    const tel = Array.isArray(raw?.tel)
      ? raw.tel.filter(Boolean).map((n: any) => (typeof n === 'object' && n !== null ? String(n?.number || n?.value || '') : String(n))).filter(Boolean)
      : [];
    const emails = Array.isArray(raw?.email)
      ? raw.email.filter(Boolean).map((a: any) => (typeof a === 'object' && a !== null ? String(a?.address || a?.value || '') : String(a))).filter(Boolean)
      : [];
    return {
      contactId: 'taste-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: {
        display,
        given: nameGiven,
        middle: nameMiddle,
        family: nameFamily,
        prefix: namePrefix,
        suffix: nameSuffix,
      } as any,
      phones: tel.map((n: string) => ({ number: n, type: 'mobile' as any, isPrimary: false, label: null })),
      emails: emails.map((a: string) => ({ address: a, type: 'personal' as any, isPrimary: false, label: null })),
      postalAddresses: [],
      organization: { company: '', jobTitle: '', department: '' },
      birthday: null,
      note: '',
      urls: [],
      image: raw?.icon instanceof Blob ? { base64String: null } : { base64String: null },
      rolodex: {
        when: '', where: '', who: '', why: '', how: '', topic: '', followUp: this.situationDraft ? 'Send the composed message' : '',
        personalTidbits: '', outcome: '', priority: 'medium' as const, contactFrequency: 'weekly' as const, references: [],
      },
      socialProfiles: {},
      tags: [],
      groups: [],
      privacy: { level: 'private' as any, sharedWith: [] },
      sharedBy: [],
      lastInteraction: null,
      nextInteraction: null,
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: { refreshContacts: false, notificationPreference: 'email' as any },
      isMockData: false,
      isContactInfo: true,
    } as any as ContactInfo;
  }

  private ordinal(n: number): string {
    const ord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
    return ord[n - 1] || 'next';
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
        content: 'Summarize the user\'s direction for LoopKeeper in one concise line shaped as: Direction: ... — Missing: ... — Suggested next: ...',
      },
    ]);
    const userTexts = this.history.filter((m) => m.role === 'user').map((m) => m.content);
    const summary = summaryRes.reply || `Direction: ${userTexts[userTexts.length - 1] || ''} — Missing: ${userTexts[0] || ''} — Suggested next: ${userTexts[1] || userTexts[0] || ''}`;

    try {
      const res = await fetch(`${environment.rolodexApiBase}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.rolodexSync.getDeviceId(),
          deviceName: 'Chat with AI Assistant',
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
