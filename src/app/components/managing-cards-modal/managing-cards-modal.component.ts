import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

/**
 * 2026-09-15 BUILD 206 (founder): the WELCOME tour's slides 5-8 (follow-up,
 * the Loop-O-meter, the Confidante, storage) LEAVE the tour and become THIS
 * modal — "Managing Cards" — shown inside the user's FIRST attempt to add a
 * contact or build a card, where the material answers the question they are
 * actually asking at that moment: what happens to a card once it exists.
 * Cards are about to outgrow "contact": reminder, note, task, and other
 * kinds are coming — this modal is where that teaching lives from now on.
 * Once per device (lk_cards_modal_seen); the tour keys are reused verbatim,
 * so every translation ships with it.
 */
interface McRow {
  kickerKey: string;
  titleKey: string;
  copyKey: string;
}

@Component({
  selector: 'app-managing-cards-modal',
  templateUrl: './managing-cards-modal.component.html',
  styleUrls: ['./managing-cards-modal.component.scss'],
  standalone: false,
})
export class ManagingCardsModalComponent {
  readonly rows: McRow[] = [
    {
      kickerKey: 'loopkeeper.welcome.followup.kicker',
      titleKey: 'loopkeeper.welcome.followup.title',
      copyKey: 'loopkeeper.welcome.followup.copy',
    },
    {
      kickerKey: 'loopkeeper.welcome.meter.kicker',
      titleKey: 'loopkeeper.welcome.meter.title',
      copyKey: 'loopkeeper.welcome.meter.copy',
    },
    {
      kickerKey: 'loopkeeper.welcome.confidante.kicker',
      titleKey: 'loopkeeper.welcome.confidante.title',
      copyKey: 'loopkeeper.welcome.confidante.copy',
    },
    {
      kickerKey: 'loopkeeper.welcome.storage.kicker',
      titleKey: 'loopkeeper.welcome.storage.title',
      copyKey: 'loopkeeper.welcome.storage.copy',
    },
  ];

  constructor(
    private readonly modalController: ModalController,
    public readonly translate: TranslateService,
  ) {}

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}