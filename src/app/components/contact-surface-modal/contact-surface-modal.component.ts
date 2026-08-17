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
}
