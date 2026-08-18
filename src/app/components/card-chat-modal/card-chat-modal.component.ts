import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { CardChatService, ChatThread } from '../../services/card-chat/card-chat.service';
import { SocketChatService } from '../../services/socket-chat/socket-chat.service';
import { TimeNormalizerService } from '../../services/time-normalizer/time-normalizer.service';
import { InviteService } from '../../services/invite/invite.service';
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
  /** 2026-08-18 the sendee's phone - the Users DB is consulted before sending. */
  @Input() sendeePhone = '';
  draft = '';
  typingName = '';
  pickingId = '';
  peersOnline = this.socketChat?.peerCount || 0;
  readonly EMOJIS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F389}', '\u{1F91D}'];
  private destroy$ = new Subject<void>();
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly inviteService: InviteService,
    private readonly chatService: CardChatService,
    private readonly socketChat: SocketChatService,
    readonly timeNorm: TimeNormalizerService,
  ) {}

  ngOnInit(): void {
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
   */
  private async offerExternalDelivery(): Promise<void> {
    const name = this.thread?.title || 'this contact';
    const phone = this.sendeePhone || '';
    const draft = this.thread?.messages?.slice(-1)?.[0]?.text || '';
    const sheet = await this.alertController.create({
      header: name + ' isn\'t on Rolodex yet',
      message: 'The message is saved here, but it can\'t reach their in-app thread until they join. Bring them in:',
      buttons: [
        { text: 'Share the invite', handler: async () => {
            try {
              const inv = await this.inviteService.create({ from: this.thread?.title || 'Me', room: 'rolodex', kind: 'message', text: draft });
              if (inv) await this.inviteService.share(inv);
            } catch { /* fall back below */ }
            return true;
          } },
        { text: 'Send via WhatsApp', handler: () => { window.open('https://wa.me/?text=' + encodeURIComponent('Join me on Rolodex — ' + draft), '_blank'); return true; } },
        { text: 'Send via SMS', handler: () => { if (phone) window.location.href = 'sms:' + phone + '?body=' + encodeURIComponent(draft); return true; } },
        { text: 'Keep it here', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
