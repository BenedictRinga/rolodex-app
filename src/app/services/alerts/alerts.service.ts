import { Injectable } from '@angular/core';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular';

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
    private readonly toastController: ToastController,
    private readonly actionSheetController: ActionSheetController,
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

  // ---- Toast -------------------------------------------------------------

  /** Show a brief toast notification. `interval` defaults to 2000 ms. */
  async showToast(message: string, interval: number = 2000): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: interval,
      position: 'bottom',
    });
    await toast.present();
  }
}
