import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { ContactInfo } from '../../models/contacts';
import { DraftEngineService, Occasion } from '../../services/draft-engine/draft-engine.service';
import { ShareAppService } from '../../services/share-app/share-app.service';
import { CardChatService } from '../../services/card-chat/card-chat.service';
import { AlertsService } from '../../services/alerts/alerts.service';
import { StudioPlaybackService } from '../../services/studio-playback/studio-playback.service';
import { StudioAudioBridgeService } from '../../services/studio-bridge/studio-bridge.service';
import { CardChatModalComponent } from '../card-chat-modal/card-chat-modal.component';
import { VideoCallModalComponent } from '../video-call-modal/video-call-modal.component';

interface ComposerMsg {
  role: 'user' | 'ai';
  text: string;
}

/**
 * 2026-08-19 USER ↔ CONFIDANTE COMPOSER.
 * Pick a card → instruct the Confidante to write to that person → chat back
 * and forth to refine → then dispatch: SMS / Email / WhatsApp / in-app chat /
 * schedule / copy.
 */
@Component({
  selector: 'app-confidante-composer-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="close()"><ion-icon name="chevron-back-outline"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title style="font-size: 15px;">Confidante → {{ contactName }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()"><ion-icon name="close-outline"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="composer-body">
      <div class="composer-thread">
        <div *ngIf="!messages.length" class="composer-empty">
          Tell the Confidante what to write to {{ contactName }} — it will draft,
          you refine, and then you dispatch.
        </div>
        <div *ngFor="let m of messages" class="composer-msg" [class.user]="m.role === 'user'">
          <span class="composer-label">{{ m.role === 'user' ? 'You' : 'Confidante' }}</span>
          <span class="composer-text">{{ m.text }}</span>
        </div>
        <div *ngIf="busy" class="composer-msg ai">
          <span class="composer-label">Confidante</span>
          <span class="composer-text">Thinking…</span>
        </div>
      </div>

      <div class="composer-input-row">
        <ion-input class="composer-input" [(ngModel)]="instruction" placeholder="e.g. Make it warmer, mention the proposal, ask about her kids"
          (keyup.enter)="send()"></ion-input>
        <ion-button (click)="send()" [disabled]="busy || !instruction.trim()">Send</ion-button>
      </div>

      <div class="composer-dispatch" *ngIf="draft">
        <p class="composer-dispatch-title">Dispatch</p>
        <ion-button expand="block" fill="outline" color="dark" (click)="toggleListen()">
          <ion-icon [name]="listening ? 'stop-circle-outline' : 'volume-high-outline'" slot="start"></ion-icon>
          {{ listening ? 'Stop listening' : 'Hear the draft' }}
        </ion-button>
        <ion-button expand="block" fill="outline" color="success" (click)="sendSms()" [disabled]="!firstPhone">
          <ion-icon name="chatbubble-outline" slot="start"></ion-icon> SMS
        </ion-button>
        <ion-button expand="block" fill="outline" color="primary" (click)="sendEmail()" [disabled]="!firstEmail">
          <ion-icon name="mail-outline" slot="start"></ion-icon> Email
        </ion-button>
        <ion-button expand="block" fill="outline" color="tertiary" (click)="sendWhatsApp()" [disabled]="!firstPhone">
          <ion-icon name="logo-whatsapp" slot="start"></ion-icon> WhatsApp
        </ion-button>
        <ion-button expand="block" fill="outline" color="medium" (click)="sendInAppChat()">
          <ion-icon name="chatbubbles-outline" slot="start"></ion-icon> In-app chat
        </ion-button>
        <ion-button expand="block" fill="outline" color="danger" (click)="videoCall()">
          <ion-icon name="videocam-outline" slot="start"></ion-icon> Video call / clip
        </ion-button>
        <ion-button expand="block" fill="outline" color="warning" (click)="scheduleReminder()">
          <ion-icon name="alarm-outline" slot="start"></ion-icon> Schedule & remind
        </ion-button>
        <ion-button expand="block" fill="outline" color="secondary" (click)="copyDraft()">
          <ion-icon name="copy-outline" slot="start"></ion-icon> Copy draft
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `.composer-body { --padding: 10px; }`,
    `.composer-thread { display: flex; flex-direction: column; gap: 8px; padding: 4px 2px 10px; max-height: 46vh; overflow-y: auto; }`,
    `.composer-empty { font-size: 12px; color: var(--rolodex-text-secondary); padding: 12px; text-align: center; }`,
    `.composer-msg { display: flex; flex-direction: column; max-width: 88%; padding: 8px 10px; border-radius: 12px; background: var(--rolodex-surface-alt); align-self: flex-start; }`,
    `.composer-msg.user { align-self: flex-end; background: rgba(79,109,245,.12); }`,
    `.composer-label { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: var(--rolodex-text-tertiary); margin-bottom: 2px; }`,
    `.composer-text { font-size: 13px; line-height: 1.45; white-space: pre-wrap; color: var(--rolodex-text); }`,
    `.composer-input-row { display: flex; gap: 6px; align-items: center; margin-top: 4px; }`,
    `.composer-input { --padding-start: 10px; --padding-end: 10px; background: var(--rolodex-surface-alt); border-radius: 10px; font-size: 13px; }`,
    `.composer-dispatch { margin-top: 12px; border-top: 1px solid var(--rolodex-border-light); padding-top: 8px; }`,
    `.composer-dispatch-title { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--rolodex-text-tertiary); margin: 0 0 6px; }`,
    `.composer-dispatch ion-button { --min-height: 36px; margin-bottom: 6px; }`,
  ],
})
export class ConfidanteComposerModalComponent implements OnInit, OnDestroy {
  @Input() contact!: ContactInfo;
  @Input() occasion: Occasion = 'follow-up';
  /** 2026-08-19 THE TASTE: a pre-composed draft can be handed in directly. */
  @Input() initialDraft = '';
  @Input() initialInstruction = '';

  messages: ComposerMsg[] = [];
  instruction = '';
  draft = '';
  busy = false;
  listening = false;
  contactName = 'this contact';

  constructor(
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly alertsService: AlertsService,
    private readonly draftEngine: DraftEngineService,
    private readonly shareApp: ShareAppService,
    private readonly cardChat: CardChatService,
    private readonly studioPlayback: StudioPlaybackService,
    private readonly studioBridge: StudioAudioBridgeService,
  ) {}

  get firstPhone(): string {
    return this.contact?.phones?.[0]?.number || '';
  }

  get firstEmail(): string {
    return this.contact?.emails?.[0]?.address || '';
  }

  ngOnInit(): void {
    this.contactName = this.draftEngine.contactName(this.contact) || 'this contact';
    // 2026-08-19 THE TASTE: pre-composed draft lands in the composer ready to
    // refine or dispatch; the user only chooses the medium.
    if (this.initialDraft) {
      this.draft = this.initialDraft;
      this.messages.push({ role: 'ai', text: this.initialDraft });
    }
    if (this.initialInstruction) {
      this.instruction = this.initialInstruction;
    }
  }

  async send(): Promise<void> {
    const text = this.instruction.trim();
    if (!text || this.busy) return;
    this.messages.push({ role: 'user', text });
    this.instruction = '';
    this.busy = true;
    try {
      const next = this.draft
        ? await this.draftEngine.refine(text, this.draft)
        : await this.draftEngine.composeAi(this.contact, this.occasion, this.contact.contactId);
      this.draft = next || this.draft;
      if (this.draft) this.messages.push({ role: 'ai', text: this.draft });
    } catch {
      if (this.draft) this.messages.push({ role: 'ai', text: this.draft });
    } finally {
      this.busy = false;
    }
  }

  private async senderName(): Promise<string> {
    return this.cardChat.senderNameAsync();
  }

  async sendSms(): Promise<void> {
    if (!this.firstPhone || !this.draft) return;
    await this.shareApp.shareViaSms('chat-message', { from: await this.senderName(), to: this.contactName, text: this.draft, room: this.cardChat.room || '' }, this.firstPhone);
  }

  async sendEmail(): Promise<void> {
    if (!this.firstEmail || !this.draft) return;
    await this.shareApp.shareViaEmail('chat-message', { from: await this.senderName(), to: this.contactName, text: this.draft, room: this.cardChat.room || '' }, this.firstEmail);
  }

  async sendWhatsApp(): Promise<void> {
    if (!this.firstPhone || !this.draft) return;
    await this.shareApp.shareViaWhatsApp('chat-message', { from: await this.senderName(), to: this.contactName, text: this.draft, room: this.cardChat.room || '' }, this.firstPhone);
  }

  async sendInAppChat(): Promise<void> {
    try {
      const thread = await this.cardChat.seedThread(this.contact);
      const modal = await this.modalController.create({
        component: CardChatModalComponent,
        componentProps: { thread, sendeePhone: this.firstPhone },
        cssClass: 'card-chat-modal-sheet',
        breakpoints: [0, 0.7, 0.95, 1],
        initialBreakpoint: 0.95,
        keyboardClose: false,
      });
      await modal.present();
    } catch {
      void this.alertsService.showToast('Could not open the chat thread', 2500);
    }
  }

  /** 2026-08-19 WEBRTC: live video call + record/send a video clip. */
  async videoCall(): Promise<void> {
    const modal = await this.modalController.create({
      component: VideoCallModalComponent,
      componentProps: { contact: this.contact, contactName: this.contactName },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.7, 0.95, 1],
      initialBreakpoint: 0.95,
      keyboardClose: false,
    });
    await modal.present();
  }

  async scheduleReminder(): Promise<void> {
    if (!this.draft) return;
    const alert = await this.alertController.create({
      header: 'Save draft + remind me',
      message: 'The draft is kept on the card. When should the Confidante remind you to send it?',
      inputs: [{ name: 'when', type: 'datetime-local', value: new Date(Date.now() + 86400000).toISOString().slice(0, 16) }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Schedule', handler: (data: any) => {
            try {
              const reminders = Array.isArray((this.contact as any).reminders) ? (this.contact as any).reminders : [];
              reminders.push({ note: 'Send the Confidante draft: ' + this.draft, date: new Date(data?.when || Date.now()) });
              (this.contact as any).reminders = reminders;
              void this.alertsService.showToast('Draft saved + reminder set on the card', 2500);
            } catch {
              void this.alertsService.showToast('Draft kept — set the reminder on the card', 2500);
            }
            return true;
          } },
      ],
    });
    await alert.present();
  }

  async toggleListen(): Promise<void> {
    if (this.listening) {
      this.studioPlayback.stop();
      this.listening = false;
      return;
    }
    if (!this.draft) return;
    this.listening = true;
    await this.studioPlayback.primeGesturePermission();
    this.studioPlayback.setCancelPredicate(() => !this.listening);
    this.studioPlayback.onEnded(() => { this.listening = false; });
    try {
      await this.studioBridge.playDemo(
        this.draft,
        'Confidante draft',
        'rolodex-confidante',
        '',
        this.studioPlayback,
        { isTemplate: true },
      );
    } catch {
      void this.alertsService.showToast('Could not play the draft', 2000);
      this.listening = false;
    }
  }

  ngOnDestroy(): void {
    this.listening = false;
    this.studioPlayback.setCancelPredicate(null);
    this.studioPlayback.stop();
  }

  async copyDraft(): Promise<void> {
    if (!this.draft) return;
    try {
      await navigator.clipboard.writeText(this.draft);
      void this.alertsService.showToast('Draft copied', 1800);
    } catch {
      void this.alertsService.showToast('Copy not available', 1800);
    }
  }

  close(): void {
    this.listening = false;
    this.studioPlayback.stop();
    void this.modalController.dismiss();
  }
}
