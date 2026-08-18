import { Injectable } from '@angular/core';
import { ActionSheetController, AlertController } from '@ionic/angular';
import { InAppNotificationService } from '../in-app-notification/in-app-notification.service';

export interface AlertPayload {
  header: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Lightweight alert / toast service for the Rolodex app.
// ---------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class AlertsService {
  private activeAlert: any = null;

  constructor(
    private readonly alertController: AlertController,
    private readonly actionSheetController: ActionSheetController,
    private readonly inAppNotifications: InAppNotificationService,
  ) {}

  /** 2026-08-16: action sheet with roles — resolves the tapped button's role. */
  async presentActionSheet(opts: {
    header?: string;
    message?: string;
    buttons: Array<{ text: string; role?: string; icon?: string }>;
  }): Promise<string> {
    const sheet = await this.actionSheetController.create({
      header: opts.header,
      subHeader: opts.message,
      buttons: opts.buttons.map((b) => ({ text: b.text, role: b.role || undefined, icon: b.icon })),
    });
    await sheet.present();
    const { role } = await sheet.onDidDismiss();
    return role || 'cancel';
  }

  // ---- Confirmation prompt with Ok / Cancel ------------------------------

  /** Show an alert with Ok / Cancel. Resolves `true` when Ok is tapped. */
  async alertPrompt(alert: AlertPayload): Promise<boolean> {
    const dialog = await this.alertController.create({
      header: alert.header,
      message: alert.message,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'OK',
          role: 'confirm',
        },
      ],
    });

    await dialog.present();
    const { role } = await dialog.onDidDismiss();
    return role === 'confirm';
  }

  // ---- Informational alert (prevents stacking) ---------------------------

  /**
   * Show an informational alert with a single OK button. If an alert is
   * already visible it is dismissed first so only one is shown at a time.
   */
  async updateAlerts(message: AlertPayload): Promise<void> {
    if (this.activeAlert) {
      await this.activeAlert.dismiss();
      this.activeAlert = null;
    }

    const dialog = await this.alertController.create({
      header: message.header,
      message: message.message,
      buttons: ['OK'],
    });

    this.activeAlert = dialog;
    await dialog.present();
    await dialog.onDidDismiss();
    this.activeAlert = null;
  }

  // ---- In-app toast ------------------------------------------------------

  /** 2026-08-18 SHOWTOAST IS NOW THE DRAGGABLE IN-APP DOCK: the Ionic dock
   *  renders inside the app, can be dragged to a convenient corner, and never
   *  stacks like browser/system notifications. `interval` = auto-dismiss ms. */
  async showToast(message: string, interval: number = 2000): Promise<void> {
    this.inAppNotifications.notify(message, { kind: 'info', duration: interval });
  }
}
