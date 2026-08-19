import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { StorageService } from '../storage/storage.service';

/**
 * 2026-08-19 AUTOMATED APP INSTALLER (mirrors Zyppar's appinstall.service).
 *
 * The user is never told to "go to Home screen". We capture
 * `beforeinstallprompt` and fire the NATIVE browser install prompt from a
 * small alert. Play/App Store are INCOMING, so we never route to stores yet.
 */
@Injectable({ providedIn: 'root' })
export class AppInstallService {
  private deferredPrompt: any = null;
  private isStandalone = false;
  private readonly LAST_PROMPT_KEY = 'rolodex_install_last_prompt';
  private readonly OPTOUT_KEY = 'rolodex_install_optout';

  constructor(
    private readonly alertController: AlertController,
    private readonly storage: StorageService,
  ) {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');

      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        this.deferredPrompt = e;
      });

      window.addEventListener('appinstalled', () => {
        this.isStandalone = true;
      });

      window.matchMedia('(display-mode: standalone)').addEventListener?.('change', (e: any) => {
        this.isStandalone = e.matches;
      });
    } catch { /* install is best-effort */ }
  }

  /** Main entry point - native prompt when possible, honest "incoming" otherwise. */
  async encourageAppInstall(featureName = 'RolodexAI'): Promise<boolean> {
    try {
      if (this.isStandalone) return true;
      const optedOut = await this.storage.get<boolean>(this.OPTOUT_KEY);
      if (optedOut) return false;
      const last = await this.storage.get<number>(this.LAST_PROMPT_KEY);
      if (last && Date.now() - last < 24 * 3600_000) return false;

      if (this.deferredPrompt?.prompt) {
        return this.showNativePrompt(featureName);
      }

      // No deferred prompt: stores are INCOMING, so we say so - no manual
      // Home-screen lecture, ever.
      const a = await this.alertController.create({
        header: 'RolodexAI',
        message: 'Play Store and App Store are incoming. The PWA already works everywhere - no install needed.',
        buttons: ['OK'],
      });
      await a.present();
      await this.storage.set(this.LAST_PROMPT_KEY, Date.now());
      return false;
    } catch {
      return false;
    }
  }

  private async showNativePrompt(featureName: string): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Install ' + featureName,
        message: 'Install the app for instant launching, offline access and the full-screen experience.',
        buttons: [
          { text: 'Not now', role: 'cancel', handler: () => { resolve(false); return true; } },
          { text: 'Never ask again', role: 'cancel', handler: async () => { await this.storage.set(this.OPTOUT_KEY, true); resolve(false); return true; } },
          {
            text: 'Install now',
            cssClass: 'install-button',
            handler: async () => {
              try {
                if (!this.deferredPrompt?.prompt) { resolve(false); return true; }
                await this.deferredPrompt.prompt();
                const choice = await this.deferredPrompt.userChoice;
                if (choice?.outcome === 'accepted') this.isStandalone = true;
                await this.storage.set(this.LAST_PROMPT_KEY, Date.now());
                this.deferredPrompt = null;
                resolve(choice?.outcome === 'accepted');
              } catch {
                resolve(false);
              }
              return true;
            },
          },
        ],
      });
      await alert.present();
      await this.storage.set(this.LAST_PROMPT_KEY, Date.now());
    });
  }
}
