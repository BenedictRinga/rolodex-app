import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AiProvider, DraftEngineService } from '../../services/draft-engine/draft-engine.service';

@Component({
  selector: 'app-ai-settings-modal',
  templateUrl: './ai-settings-modal.component.html',
  styleUrls: ['./ai-settings-modal.component.scss'],
  standalone: false,
})
export class AiSettingsModalComponent {
  provider: AiProvider = 'rolodex';
  saved = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly draftEngine: DraftEngineService,
  ) {
    this.provider = this.draftEngine.provider;
  }

  onProviderChange(): void {
    /* no keys to clear — the user just picks the engine */
  }

  providerLabel(): string {
    return this.provider === 'rolodex' ? "OpenLoop's engine" : this.provider;
  }

  save(): void {
    this.draftEngine.setProvider(this.provider);
    this.saved = true;
  }

  get plan(): string {
    return this.draftEngine.plan;
  }

  planLabel(): string {
    return this.draftEngine.plan === 'confidante' ? 'Assistant' : 'Basic ($1)';
  }

  interventionsLeft(): number {
    return this.draftEngine.interventionsLeft();
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
