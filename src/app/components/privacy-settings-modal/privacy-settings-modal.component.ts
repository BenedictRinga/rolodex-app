import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';

/**
 * 2026-08-18 PRIVACY CENTER: replaces the old console.log dummy. It explains
 * exactly where data lives, how the lock works, how sync encryption works,
 * and how sharing works — no hand-waving, no dead buttons.
 */
@Component({
  selector: 'app-privacy-settings-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="close()"><ion-icon name="chevron-back-outline"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title style="font-size: 15px;">Privacy</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()"><ion-icon name="close-outline"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2 style="margin:0 0 6px; font-size:18px;">Your data is yours.</h2>
      <p style="margin:0 0 16px; color:var(--rolodex-text-secondary); font-size:13px;">
        No telemetry, no selling of contacts, no cloud copy unless you choose one.
      </p>

      <ion-item>
        <ion-icon name="phone-portrait-outline" slot="start" color="primary"></ion-icon>
        <ion-label>
          <b>Device-first storage</b>
          <p style="font-size:12px; white-space:normal; color:var(--rolodex-text-secondary); margin:2px 0 0;">
            Your cards, notes and 4-W context live in your device's memory. They do not leave the device unless you choose to sync or share.
          </p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-icon name="lock-closed-outline" slot="start" color="warning"></ion-icon>
        <ion-label>
          <b>App lock</b>
          <p style="font-size:12px; white-space:normal; color:var(--rolodex-text-secondary); margin:2px 0 0;">
            Optional PIN gate on cold start. The PIN is SHA-256 hashed on-device — never sent anywhere. If you forget it, the only reset is clearing app data / reinstalling.
          </p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-icon name="shield-checkmark-outline" slot="start" color="success"></ion-icon>
        <ion-label>
          <b>Cloud sync encryption</b>
          <p style="font-size:12px; white-space:normal; color:var(--rolodex-text-secondary); margin:2px 0 0;">
            When you push to Dropbox, Drive or OneDrive, the bundle is encrypted with your passphrase before it leaves the device. The provider only ever sees ciphertext.
          </p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-icon name="share-social-outline" slot="start" color="tertiary"></ion-icon>
        <ion-label>
          <b>Sharing is by your choice</b>
          <p style="font-size:12px; white-space:normal; color:var(--rolodex-text-secondary); margin:2px 0 0;">
            An invite shares only the moment you chose to send. The rest of the card stays private — LoopKeeper uses your context locally, never as a public profile.
          </p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-icon name="globe-outline" slot="start" color="medium"></ion-icon>
        <ion-label>
          <b>The app's home</b>
          <p style="font-size:12px; white-space:normal; color:var(--rolodex-text-secondary); margin:2px 0 0;">
            LoopKeeper lives at zyppar.com/loopkeeper/ — bookmark that exact address.
          </p>
        </ion-label>
      </ion-item>
    </ion-content>
  `,
})
export class PrivacySettingsModalComponent {
  constructor(private readonly modalController: ModalController) {}

  close(): void {
    void this.modalController.dismiss();
  }
}
