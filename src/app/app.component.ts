import { Component } from '@angular/core';
import { TranslationService } from './services/translation/translation.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(translation: TranslationService) {
    // 2026-08-25 DEVICE LANGUAGE: user choice wins, otherwise auto-detect
    // the device/browser language and switch when we have that locale.
    translation.init();
  }
}
