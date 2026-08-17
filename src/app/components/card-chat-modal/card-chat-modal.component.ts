import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CardChatService, ChatThread } from '../../services/card-chat/card-chat.service';
import { SocketChatService } from '../../services/socket-chat/socket-chat.service';
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
  private destroy$ = new Subject<void>();
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly modalController: ModalController,
    private readonly chatService: CardChatService,
    private readonly socketChat: SocketChatService,
  ) {}

  ngOnInit(): void {
    // 2026-08-17 READ RECEIPTS: opening the thread tells the peer I read it.
    this.chatService.markRead(this.thread.key);
    // 2026-08-17: typing indicators - the Teams/Zoom touch, live via the socket.
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
