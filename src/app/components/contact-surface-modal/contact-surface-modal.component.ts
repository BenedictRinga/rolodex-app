import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-contact-surface-modal',
  templateUrl: './contact-surface-modal.component.html',
  styleUrls: ['./contact-surface-modal.component.scss'],
  standalone: false,
})
export class ContactSurfaceModalComponent {
  @Input() contact: any = null;

  constructor(private readonly modalController: ModalController) {}

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }

  // 2026-08-18: the card's edit/remove/photo emits travel through the modal
  onEdited(c: any): void {
    void this.modalController.dismiss({ action: 'edit', contact: c }, 'edit');
  }

  onRemoved(c: any): void {
    void this.modalController.dismiss({ action: 'remove', contact: c }, 'remove');
  }
}
