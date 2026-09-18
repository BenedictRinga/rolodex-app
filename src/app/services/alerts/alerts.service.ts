import { Injectable } from '@angular/core';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular';
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
    private readonly toastController: ToastController,
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

  /** 2026-09-18 BUILD 270 THE REAL TOAST RETURNS (founder: the success and
   *  failure notifications render "as a single thread, each letter vertically
   *  stacked at the page border, and beyond" — even the create-card count
   *  that is accurate). ROOT CAUSE: since 2026-08-18 showToast fed the
   *  IN-APP NOTIFICATION DOCK, whose narrow corner items wrap long text one
   *  letter per line — every "toast" in the app was a dock item. A toast is
   *  a transient confirmation, not a dock notification: it is a real
   *  ion-toast again (ToastController, width-capped), and the dock keeps
   *  the STICKY actionable notifications (check-ins, digest) it was built
   *  for. `interval` = auto-dismiss ms. */
  async showToast(message: string, interval: number = 2000): Promise<void> {
    try {
      const toast = await this.toastController.create({
        message,
        duration: Math.max(1200, interval),
        position: 'bottom',
        cssClass: 'lk-toast',
      });
      await toast.present();
    } catch {
      this.inAppNotifications.notify(message, { kind: 'info', duration: interval });
    }
  }
}
