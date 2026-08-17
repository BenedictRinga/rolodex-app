import { Component } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { environment } from '../../../environments/environment';

// 2026-08-16 THE PADLOCK: the Investors section opens with this word.
// Change it here — exclusivity is the point.
const INVESTOR_PASSWORD = 'northstar';

@Component({
  selector: 'app-about-rolodex',
  templateUrl: './about-rolodex.component.html',
  styleUrls: ['./about-rolodex.component.scss'],
  standalone: false,
})
export class AboutRolodexComponent {
  version: string = environment.version || '0.1.0';
  unlocked = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly alertCtrl: AlertController,
  ) {}

  async promptPassword(): Promise<void> {
    if (this.unlocked) return;
    const alert = await this.alertCtrl.create({
      header: 'Investors only',
      subHeader: 'Some doors are opened with a word.',
      inputs: [{ name: 'pass', type: 'password', placeholder: 'Password' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Enter',
          handler: (data: any) => {
            const pass = String(data?.pass || '').trim();
            if (pass === INVESTOR_PASSWORD) {
              this.unlocked = true;
              return true;
            }
            // Wrong word: close the prompt, then the denial — one alert at a time.
            void alert.dismiss();
            setTimeout(() => {
              void this.alertCtrl
                .create({ header: 'Not yet', message: 'That word does not open this door.', buttons: ['OK'] })
                .then((a) => a.present());
            }, 150);
            return false;
          },
        },
      ],
    });
    await alert.present();
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
