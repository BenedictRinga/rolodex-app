import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CardChatService, ChatThread } from '../../services/card-chat/card-chat.service';
import { SocketChatService } from '../../services/socket-chat/socket-chat.service';
import { TimeNormalizerService } from '../../services/time-normalizer/time-normalizer.service';
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
  draft = '';
  typingName = '';
  pickingId = '';
  peersOnline = this.socketChat?.peerCount || 0;
  readonly EMOJIS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F389}', '\u{1F91D}'];
  private destroy$ = new Subject<void>();
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly modalController: ModalController,
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
    const next = await this.chatService.send(this.thread, text);
    this.thread = next;
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
