import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { CardChatService, ChatThread } from '../../services/card-chat/card-chat.service';
import { SocketChatService } from '../../services/socket-chat/socket-chat.service';
import { TimeNormalizerService } from '../../services/time-normalizer/time-normalizer.service';
import { ShareAppService } from '../../services/share-app/share-app.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-card-chat-modal',
  templateUrl: './card-chat-modal.component.html',
  styleUrls: ['./card-chat-modal.component.scss'],
  standalone: false,
})
export class CardChatModalComponent implements OnInit, OnDestroy {
  @Input() thread!: ChatThread;
  /** 2026-08-18 the sendee's default phone - the Users DB is consulted before sending. */
  @Input() sendeePhone = '';
  /** 2026-08-18 MULTI-WHATSAPP: ALL of the sendee's numbers - the external
   *  delivery asks which one to use when there are several. */
  @Input() sendeePhones: string[] = [];
  /** 2026-08-28 BUILD 130: PAYLOAD EMBRACE — a loop opened this chat with its
   *  draft in hand; the composer starts carrying it, ready to send or edit. */
  @Input() prefill = '';
  draft = '';
  previewUrl = '';
  typingName = '';
  pickingId = '';
  peersOnline = this.socketChat?.peerCount || 0;
  readonly EMOJIS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F389}', '\u{1F91D}'];
  private destroy$ = new Subject<void>();
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly chatService: CardChatService,
    private readonly socketChat: SocketChatService,
    private readonly shareApp: ShareAppService,
    readonly timeNorm: TimeNormalizerService,
  ) {}

  ngOnInit(): void {
    // 2026-08-28 BUILD 130: the loop's draft lands in the composer, ready.
    if (this.prefill && !this.draft) this.draft = this.prefill;
    // 2026-08-17 READ RECEIPTS: opening the thread tells the peer I read it.
    this.chatService.markRead(this.thread.key);
    // 2026-08-17 REACTIONS: refresh the open thread when a reaction lands.
    this.chatService.messageChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe((key) => {
        if (key !== this.thread.key) return;
        void this.chatService.loadThread(this.thread.key).then((t2) => { if (t2) this.thread = t2; });
      });
    // 2026-08-17: typing indicators - the Teams/Zoom touch, live via the socket.
    this.socketChat.presence$.pipe(takeUntil(this.destroy$)).subscribe((n) => (this.peersOnline = n));
    this.socketChat.typing$
      .pipe(takeUntil(this.destroy$))
      .subscribe((ev) => {
        if (ev.room !== this.thread.key) return;
        this.typingName = ev.name || '';
        if (this.typingTimer) clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => (this.typingName = ''), 2500);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.typingTimer) clearTimeout(this.typingTimer);
  }

  onTyping(): void {
    if (this.draft?.trim()) this.socketChat.emitTyping();
    // 2026-08-19 LINK PREVIEW: the first URL in the draft gets a card.
    this.previewUrl = this.draft?.match(/https?:\/\/[^\s]+/i)?.[0] || '';
  }

  /** 2026-08-28 BUILD 125: the ✕ clears the whole composer in one tap. */
  clearDraft(): void {
    this.draft = '';
    this.previewUrl = '';
  }

  /** 2026-08-17 REACTIONS: tap a bubble to open the emoji row. */
  pickReaction(m: any): void {
    this.pickingId = this.pickingId === m.id ? '' : m.id;
  }

  async react(m: any, emoji: string): Promise<void> {
    this.pickingId = '';
    const list = Array.isArray(m.reactions) ? [...m.reactions] : [];
    const at = list.indexOf(emoji);
    if (at >= 0) list.splice(at, 1); else list.push(emoji);
    m.reactions = list;
    await this.chatService.toggleReaction(this.thread.key, m.id, emoji);
  }

  async send(): Promise<void> {
    const text = this.draft?.trim();
    if (!text) return;
    this.draft = '';
    const next = await this.chatService.send(this.thread, text, this.sendeePhone);
    this.thread = next;
    if ((next as any)?.pendingExternal && this.sendeePhone) {
      await this.offerExternalDelivery();
    }
  }

  /**
   * 2026-08-18 THE HONEST OPTIONS: the sendee is NOT on Rolodex yet, so the
   * in-app thread cannot reach them. The sender is told the truth and given
   * the distributor options - every excited receiver becomes a distributor.
   * 2026-08-18 SHAREAPP: every option now carries the crafted moment text +
   * the OG-tagged invite link (never a plain sentence with no distribution).
   */
  /** 2026-08-18 MULTI-WHATSAPP: ask which number to use when the contact has
   *  more than one; otherwise return the default (or first). */
  private async chooseSendeePhone(purpose: string): Promise<string | null> {
    const nums = ((this.sendeePhones && this.sendeePhones.length ? this.sendeePhones : [this.sendeePhone]) || [])
      .map((n) => String(n || '').trim()).filter(Boolean);
    if (!nums.length) return null;
    if (nums.length === 1) return nums[0];
    return new Promise(async (resolve) => {
      const buttons: any[] = nums.map((n, i) => ({
        text: n + (i === 0 ? ' (default)' : ''),
        handler: () => { resolve(n); return true; },
      }));
      buttons.push({ text: 'Cancel', role: 'cancel', handler: () => { resolve(null); return true; } });
      const a = await this.alertController.create({
        header: `Send via ${purpose} to which number?`,
        buttons,
      });
      await a.present();
    });
  }

  private async offerExternalDelivery(): Promise<void> {
    const name = this.thread?.title || 'this contact';
    const draft = this.thread?.messages?.slice(-1)?.[0]?.text || '';
    // The invite's FROM is the SENDER (the user), never the sendee's card title.
    const sender = await this.chatService.senderNameAsync();
    const ctx = { from: sender, to: name, text: draft, room: 'rolodex' };

    const sendWhatsApp = async (): Promise<void> => {
      const chosen = await this.chooseSendeePhone('WhatsApp');
      if (!chosen) return;
      await this.shareApp.shareViaWhatsApp('chat-message', ctx, chosen);
    };
    const sendSms = async (): Promise<void> => {
      const chosen = await this.chooseSendeePhone('SMS');
      if (!chosen) return;
      await this.shareApp.shareViaSms('chat-message', ctx, chosen);
    };

    const sheet = await this.alertController.create({
      header: name + ' isn\'t on LoopKeeper yet',
      message: 'The message is saved here, but it can\'t reach their in-app thread until they join. Bring them in — every share carries the link, and the link opens their card ready:',
      buttons: [
        { text: 'Share the invite', handler: async () => {
            await this.shareApp.share('chat-message', ctx);
            return true;
          } },
        { text: 'Send via WhatsApp', handler: async () => {
            await sendWhatsApp();
            return true;
          } },
        { text: 'Send via SMS', handler: async () => {
            await sendSms();
            return true;
          } },
        { text: 'Keep it here', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
