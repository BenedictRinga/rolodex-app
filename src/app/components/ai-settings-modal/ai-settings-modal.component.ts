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
  provider: AiProvider = 'template';
  apiKey = '';
  saved = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly draftEngine: DraftEngineService,
  ) {
    this.provider = this.draftEngine.provider;
    this.apiKey = this.draftEngine.hasProviderKey ? 'saved' : '';
  }

  onProviderChange(): void {
    if (this.provider === 'template') this.apiKey = '';
  }

  providerLabel(): string {
    return this.provider === 'template' ? 'the on-device template' : this.provider;
  }

  save(): void {
    const key = this.provider === 'template' ? '' : this.apiKey;
    this.draftEngine.setProvider(this.provider, key);
    this.saved = true;
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
