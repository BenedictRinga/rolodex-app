import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CardChatService, ChatThread } from '../../services/card-chat/card-chat.service';

@Component({
  selector: 'app-card-chat-modal',
  templateUrl: './card-chat-modal.component.html',
  styleUrls: ['./card-chat-modal.component.scss'],
  standalone: false,
})
export class CardChatModalComponent implements OnInit {
  @Input() thread!: ChatThread;
  draft = '';

  constructor(
    private readonly modalController: ModalController,
    private readonly chatService: CardChatService,
  ) {}

  ngOnInit() {}

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
