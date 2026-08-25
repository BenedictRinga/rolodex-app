import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AnalyticsService } from '../../services/analytics/analytics.service';

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
        <ion-title style="font-size: 15px;">{{ 'loopkeeper.privacy.title' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()"><ion-icon name="close-outline"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2 style="margin:0 0 6px; font-size:18px;">{{ 'loopkeeper.privacy.headline' | translate }}</h2>
      <p style="margin:0 0 16px; color:var(--rolodex-text-secondary); font-size:13px;">
        {{ 'loopkeeper.privacy.subhead' | translate }}
      </p>

      <!-- 2026-08-24 PRIVACY PLEDGE: no PII to mine, so external digs find nothing. -->
      <div style="margin:0 0 16px; padding:14px 16px; border:1px solid rgba(0,200,83,.35); border-radius:14px; background:rgba(0,200,83,.06); display:flex; gap:12px; align-items:flex-start;">
        <ion-icon name="shield-checkmark-outline" style="font-size:22px; color:#00C853; flex:none; margin-top:2px;"></ion-icon>
        <div style="font-size:13px; line-height:1.5;">
          <b style="font-size:14px;">{{ 'loopkeeper.privacy.pledgeTitle' | translate }}</b>
          <p style="margin:4px 0 0; color:var(--rolodex-text-secondary);">
            {{ 'loopkeeper.privacy.pledgeBody' | translate }}
          </p>
        </div>
      </div>

      <ion-item>
        <ion-icon name="phone-portrait-outline" slot="start" color="primary"></ion-icon>
        <ion-label>
          <b>{{ 'loopkeeper.privacy.deviceTitle' | translate }}</b>
          <p style="font-size:12px; white-space:normal; color:var(--rolodex-text-secondary); margin:2px 0 0;">
            {{ 'loopkeeper.privacy.deviceBody' | translate }}
          </p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-icon name="lock-closed-outline" slot="start" color="warning"></ion-icon>
        <ion-label>
          <b>{{ 'loopkeeper.privacy.lockTitle' | translate }}</b>
          <p style="font-size:12px; white-space:normal; color:var(--rolodex-text-secondary); margin:2px 0 0;">
            {{ 'loopkeeper.privacy.lockBody' | translate }}
          </p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-icon name="shield-checkmark-outline" slot="start" color="success"></ion-icon>
        <ion-label>
          <b>{{ 'loopkeeper.privacy.cloudTitle' | translate }}</b>
          <p style="font-size:12px; white-space:normal; color:var(--rolodex-text-secondary); margin:2px 0 0;">
            {{ 'loopkeeper.privacy.cloudBody' | translate }}
          </p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-icon name="share-social-outline" slot="start" color="tertiary"></ion-icon>
        <ion-label>
          <b>{{ 'loopkeeper.privacy.shareTitle' | translate }}</b>
          <p style="font-size:12px; white-space:normal; color:var(--rolodex-text-secondary); margin:2px 0 0;">
            {{ 'loopkeeper.privacy.shareBody' | translate }}
          </p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-icon name="pulse-outline" slot="start" color="medium"></ion-icon>
        <ion-label>
          <b>Anonymous product analytics</b>
          <p style="font-size:12px; white-space:normal; color:var(--rolodex-text-secondary); margin:2px 0 0;">
            Only anonymous app usage events (launches, sessions, sends, billing) — never contacts, names or message text. Helps us know what to fix.
          </p>
        </ion-label>
        <ion-toggle slot="end" [checked]="analyticsEnabled" (ionChange)="toggleAnalytics($event)"></ion-toggle>
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
  analyticsEnabled = true;

  constructor(
    private readonly modalController: ModalController,
    private readonly analytics: AnalyticsService,
  ) {
    void this.analytics.isEnabled().then((v) => (this.analyticsEnabled = v));
  }

  async toggleAnalytics(event: any): Promise<void> {
    this.analyticsEnabled = !!event?.detail?.checked;
    await this.analytics.setEnabled(this.analyticsEnabled);
  }

  close(): void {
    void this.modalController.dismiss();
  }
}
