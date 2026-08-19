import { Component, Input, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { UsersApiService } from '../../services/users-api/users-api.service';

// 2026-08-16 THE PADLOCK: the Investors section opens with this word.
// Change it here — exclusivity is the point.
const INVESTOR_PASSWORD = 'northstar';

@Component({
  selector: 'app-about-rolodex',
  templateUrl: './about-rolodex.component.html',
  styleUrls: ['./about-rolodex.component.scss'],
  standalone: false,
})
export class AboutRolodexComponent implements OnInit {
  /** 2026-08-19 DIRECT INVESTOR PORTAL: when opened from Settings > Investors,
   *  the modal is the portal (locked, password NorthStar) - NOT the About tour. */
  @Input() portalMode: 'about' | 'investors' = 'about';
  @Input() openInvestors = false;
  @Input() unlocked = false;

  version: string = environment.version || '0.1.0';

  constructor(
    private readonly modalController: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly usersApi: UsersApiService,
  ) {}

  ngOnInit(): void {
    // Legacy compatibility: openInvestors=true means the Investors portal.
    if (this.openInvestors) this.portalMode = 'investors';
    // The portal stays LOCKED. The word is NorthStar (case-insensitive).
    this.unlocked = false;
  }

  /**
   * 2026-08-18 HOW AN INVESTOR GETS THE WORD: the padlock gate has a
   * 'Request access' path - they leave their name + email, the request is
   * recorded at the backend, and the access is dispensed on the spot.
   */
  async requestAccess(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Request investor access',
      message: 'Leave your details - the door opens for you right here.',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Your name' },
        { name: 'email', type: 'email', placeholder: 'Your email' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Request access',
          handler: async (data: any) => {
            const email = String(data?.email || '').trim();
            if (!email) return false;
            const name = String(data?.name || '').trim();
            const access = await this.usersApi.requestInvestorAccess(name, email, '');
            if (access) {
              this.unlocked = true;
              void this.alertCtrl.create({
                header: 'Welcome in',
                message: 'Your request is recorded. The roadmap is open for you.',
                buttons: ['OK'],
              }).then((a) => a.present());
              return true;
            }
            void this.alertCtrl.create({ header: 'Not yet', message: 'The request could not be recorded - try again when online.', buttons: ['OK'] }).then((a) => a.present());
            return false;
          },
        },
      ],
    });
    await alert.present();
  }

  async promptPassword(): Promise<void> {
    if (this.unlocked) return;
    const alert = await this.alertCtrl.create({
      header: 'Investors only',
      subHeader: 'Some doors are opened with a word.',
      inputs: [{ name: 'pass', type: 'password', placeholder: 'Password' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Request access', handler: () => { void this.requestAccess(); return true; } },
        {
          text: 'Enter',
          handler: (data: any) => {
            const pass = String(data?.pass || '').trim();
            if (pass.toLowerCase() === INVESTOR_PASSWORD.toLowerCase()) {
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

  /** 2026-08-18 THE INVESTOR GATEWAY: one tap opens the read-only live peek. */
  openLive(): void {
    window.open(`${environment.rolodexApiBase}/live`, '_blank', 'noopener');
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
