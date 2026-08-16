import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CardChatService } from '../../services/card-chat/card-chat.service';
import { CardChatModalComponent } from '../card-chat-modal/card-chat-modal.component';

@Component({
  selector: 'app-pods-modal',
  templateUrl: './pods-modal.component.html',
  styleUrls: ['./pods-modal.component.scss'],
  standalone: false,
})
export class PodsModalComponent {
  @Input() pods: Array<{ name: string; members: number }> = [];
  @Input() contacts: any[] = [];

  constructor(
    private readonly modalController: ModalController,
    private readonly cardChat: CardChatService,
  ) {}

  async openPod(group: string): Promise<void> {
    const members = (this.contacts || [])
      .filter((c: any) => (c?.groups || []).includes(group))
      .map((c: any) => c?.name?.display || '');
    const thread = await this.cardChat.podThread(group, members);
    const chat = await this.modalController.create({
      component: CardChatModalComponent,
      componentProps: { thread },
      cssClass: 'card-chat-modal-sheet',
      breakpoints: [0, 0.6, 0.8, 0.9],
      initialBreakpoint: 0.8,
    });
    await chat.present();
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
