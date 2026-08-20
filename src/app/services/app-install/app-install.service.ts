// 2026-08-20 ZYPPAR-STYLE APP INSTALLER — cloned verbatim from Zyppar's
// appinstall.service.ts (adapted only: storage keys + Capacitor.getPlatform()
// instead of @capacitor/device, so no new dependency is needed).
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { AlertController, Platform } from '@ionic/angular';
import { StorageService } from '../storage/storage.service';

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallationStatus =
  'not_installed' |
  'installed' |
  'prompted' |
  'declined' |
  'dismissed';

interface InstallMetrics {
  totalPrompts: number;
  lastPromptDate: number;
  firstPromptDate: number;
  acceptedPrompts: number;
  dismissedPrompts: number;
  featurePrompts: { [key: string]: number };
}

interface InstallContext {
  featureName: string;
  timestamp: number;
  outcome?: 'accepted' | 'dismissed' | 'declined';
}

@Injectable({
  providedIn: 'root',
})
export class AppInstallService {
  private deferredPrompt: InstallPromptEvent | null = null;
  private isStandalone = false;
  private osType: 'ios' | 'android' | 'web' = 'web';

  // Storage keys (Rolodex-prefixed)
  private readonly INSTALL_METRICS_KEY = 'rolodex_install_metrics';
  private readonly INSTALL_STATUS_KEY = 'rolodex_install_status';
  private readonly INSTALL_CONTEXTS_KEY = 'rolodex_install_contexts';
  private readonly USER_PREFERENCES_KEY = 'rolodex_install_preferences';

  constructor(
    private alertController: AlertController,
    private platform: Platform,
    private storageService: StorageService
  ) {
    this.initialize();
  }

  private async initialize() {
    // Check if running as standalone (installed)
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    // Detect platform
    if (Capacitor.isNativePlatform()) {
      this.osType = (Capacitor.getPlatform() as 'ios' | 'android');
    } else {
      // Web detection
      const ua = navigator.userAgent.toLowerCase();
      this.osType = ua.includes('iphone') || ua.includes('ipad') ? 'ios' : 'android';

      // Listen for install prompt
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e as InstallPromptEvent;
        this.updateInstallStatus('not_installed');
      });

      // Listen for app installed event
      window.addEventListener('appinstalled', () => {
        this.handleAppInstalled();
      });
    }

    // Update standalone status periodically
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.isStandalone = e.matches;
    });
  }

  /**
   * Main method to encourage app installation
   */
  async encourageAppInstall(
    featureName: string,
    options: {
      forcePrompt?: boolean;
      context?: 'feature_lock' | 'enhanced_experience' | 'offline_access' | 'premium_feature';
      customMessage?: string;
    } = {}
  ): Promise<boolean> {
    // If already installed, don't prompt
    if (this.isStandalone) {
      return true;
    }

    // Check user preferences (opt-out)
    if (await this.hasUserOptedOut()) {
      return false;
    }

    // Check if we should suppress the prompt
    if (!options.forcePrompt && await this.shouldSuppressPrompt(featureName)) {
      return false;
    }

    // Record the prompt attempt
    await this.recordPromptAttempt(featureName);

    // Show appropriate prompt based on platform
    if (Capacitor.isNativePlatform()) {
      return this.showNativeAppPrompt(featureName, options);
    } else {
      return this.showWebAppPrompt(featureName, options);
    }
  }

  /**
   * Web app installation flow
   */
  private async showWebAppPrompt(
    featureName: string,
    options: any
  ): Promise<boolean> {
    // Check if we can show the native prompt
    const canPromptNative = this.deferredPrompt !== null;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Get installation metrics for personalized messaging
    const metrics = await this.getInstallMetrics();
    const promptCount = metrics.totalPrompts || 0;

    // Create context-specific message
    const message = await this.createInstallMessage(featureName, options.context, promptCount);

    if (canPromptNative) {
      return this.showNativeInstallPrompt(featureName, message);
    } else if (isIOS) {
      return this.showIOSInstallInstructions(featureName, message);
    } else {
      return this.showAndroidInstallInstructions(featureName, message);
    }
  }

  /**
   * Show native browser install prompt (beforeinstallprompt API)
   */
  private async showNativeInstallPrompt(
    featureName: string,
    message: { header: string; message: string; cta: string }
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      const alert = await this.alertController.create({
        header: message.header,
        message: message.message,
        cssClass: 'install-prompt-alert',
        buttons: [
          {
            text: 'Not Now',
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => {
              this.recordPromptOutcome(featureName, 'dismissed');
              this.updateLastPromptDate();
              resolve(false);
            }
          },
          {
            text: 'Never Show Again',
            role: 'cancel',
            cssClass: 'secondary',
            handler: async () => {
              await this.setUserOptOut(true);
              this.recordPromptOutcome(featureName, 'declined');
              resolve(false);
            }
          },
          {
            text: message.cta,
            cssClass: 'install-button primary',
            handler: async () => {
              if (this.deferredPrompt) {
                try {
                  await this.deferredPrompt.prompt();
                  const choice = await this.deferredPrompt.userChoice;

                  const outcome = choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
                  this.recordPromptOutcome(featureName, outcome);

                  if (choice.outcome === 'accepted') {
                    this.handleAppInstalled();
                  }

                  resolve(choice.outcome === 'accepted');
                } catch (error) {
                  console.error('Install prompt failed:', error);
                  await this.showManualInstallInstructions(featureName);
                  resolve(false);
                } finally {
                  this.deferredPrompt = null;
                }
              } else {
                await this.showManualInstallInstructions(featureName);
                resolve(false);
              }
            }
          }
        ]
      });

      await alert.present();
    });
  }

  /**
   * Show iOS-specific installation instructions
   */
  private async showIOSInstallInstructions(
    featureName: string,
    message: { header: string; message: string; cta: string }
  ): Promise<boolean> {
    const instructions = `
1. Tap the Share icon (📤) at the bottom of Safari
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" in the top right corner
4. Enjoy ${featureName} and other features from your home screen!`;

    const alert = await this.alertController.create({
      header: message.header,
      message: `${message.message}\n\n${instructions}`,
      cssClass: 'install-instructions-alert ios-install',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Watch Demo',
          cssClass: 'demo-button',
          handler: () => {
            this.showIOSDemo(featureName);
            return false; // Keep alert open
          }
        },
        {
          text: 'Got It',
          role: 'cancel',
          handler: () => {
            this.recordPromptOutcome(featureName, 'dismissed');
            this.updateLastPromptDate();
          }
        },
        {
          text: 'I\'ve Installed It',
          cssClass: 'success-button',
          handler: () => {
            this.handleAppInstalled();
            return true;
          }
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'installed';
  }

  /**
   * Show Android-specific installation instructions
   */
  private async showAndroidInstallInstructions(
    featureName: string,
    message: { header: string; message: string; cta: string }
  ): Promise<boolean> {
    const instructions = `
1. Tap the menu button (⋮) in the top right corner of Chrome
2. Select "Install app" or "Add to Home screen"
3. Tap "Install" to confirm
4. Launch ${featureName} directly from your home screen!`;

    const alert = await this.alertController.create({
      header: message.header,
      message: `${message.message}\n\n${instructions}`,
      cssClass: 'install-instructions-alert android-install',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Got It',
          role: 'cancel',
          handler: () => {
            this.recordPromptOutcome(featureName, 'dismissed');
            this.updateLastPromptDate();
          }
        },
        {
          text: 'I\'ve Installed It',
          cssClass: 'success-button',
          handler: () => {
            this.handleAppInstalled();
            return true;
          }
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'installed';
  }

  /**
   * Show manual install instructions (fallback)
   */
  private async showManualInstallInstructions(featureName: string): Promise<void> {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const instructions = isIOS
      ? 'Tap the Share icon in Safari, then select "Add to Home Screen" and tap "Add".'
      : 'Tap the menu (three dots) in Chrome, select "Add to Home Screen", and follow the prompts.';

    const alert = await this.alertController.create({
      header: 'Manual Installation Required',
      message: `To use ${featureName}, you need to install the app manually:\n\n${instructions}`,
      buttons: [{ text: 'OK', role: 'cancel' }],
    });

    await alert.present();
  }

  /**
   * Show iOS installation demo animation
   */
  private showIOSDemo(featureName: string): void {
    console.log('Showing iOS installation demo for', featureName);
  }

  /**
   * Native app store redirect
   */
  private async showNativeAppPrompt(
    featureName: string,
    options: any
  ): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Get Our App',
      subHeader: 'For the best experience',
      message: `Install our app from the official store to use ${featureName} with full native capabilities.`,
      buttons: [
        {
          text: 'Take me there',
          cssClass: 'primary',
          handler: async () => {
            const storeUrl = this.getStoreUrl();
            await Browser.open({ url: storeUrl });
            this.recordPromptOutcome(featureName, 'dismissed');
            return true;
          }
        },
        {
          text: 'Later',
          role: 'cancel',
          handler: () => {
            this.recordPromptOutcome(featureName, 'dismissed');
            this.updateLastPromptDate();
          }
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirmed';
  }

  /**
   * Create personalized install message based on context
   */
  private async createInstallMessage(
    featureName: string,
    context?: string,
    promptCount: number = 0
  ): Promise<{ header: string; message: string; cta: string }> {
    const baseMessages = {
      feature_lock: {
        header: 'Unlock Full Feature',
        message: `Install the app to unlock ${featureName} and enjoy:`,
        cta: 'Install Now'
      },
      enhanced_experience: {
        header: 'Enhanced Experience Available',
        message: `Get the most out of ${featureName} with our installed app:`,
        cta: 'Upgrade Experience'
      },
      offline_access: {
        header: 'Access Offline',
        message: `Install the app to use ${featureName} without an internet connection:`,
        cta: 'Enable Offline'
      },
      premium_feature: {
        header: 'Premium Feature',
        message: `${featureName} is available as a premium feature in our installed app:`,
        cta: 'Get Premium'
      }
    };

    const config = context && baseMessages[context as keyof typeof baseMessages] || {
      header: 'Install App',
      message: `Install the app for a better ${featureName} experience:`,
      cta: 'Install'
    };

    // Add benefits based on prompt count
    let benefits = '';

    if (promptCount === 0) {
      benefits = `
• 2x faster performance
• Offline access to your data
• Push notifications
• Home screen convenience`;
    } else if (promptCount === 1) {
      benefits = `
• Faster access to ${featureName}
• Works without internet
• Save data on your device
• Instant launching`;
    } else {
      benefits = `
• Quick access to ${featureName}
• Better battery efficiency
• Enhanced security
• Full-screen experience`;
    }

    return {
      header: config.header,
      message: `${config.message}\n${benefits}`,
      cta: config.cta
    };
  }

  /**
   * Storage-based methods
   */

  private async getInstallMetrics(): Promise<InstallMetrics> {
    const metrics = await this.storageService.get<InstallMetrics>(this.INSTALL_METRICS_KEY);

    if (!metrics) {
      return {
        totalPrompts: 0,
        lastPromptDate: 0,
        firstPromptDate: Date.now(),
        acceptedPrompts: 0,
        dismissedPrompts: 0,
        featurePrompts: {}
      };
    }

    return metrics;
  }

  private async updateInstallMetrics(updates: Partial<InstallMetrics>): Promise<void> {
    const current = await this.getInstallMetrics();
    const updated = { ...current, ...updates };
    await this.storageService.set(this.INSTALL_METRICS_KEY, updated);
  }

  private async recordPromptAttempt(featureName: string): Promise<void> {
    const metrics = await this.getInstallMetrics();

    metrics.totalPrompts = (metrics.totalPrompts || 0) + 1;

    if (!metrics.featurePrompts) {
      metrics.featurePrompts = {};
    }
    metrics.featurePrompts[featureName] = (metrics.featurePrompts[featureName] || 0) + 1;

    if (!metrics.firstPromptDate) {
      metrics.firstPromptDate = Date.now();
    }

    await this.updateInstallMetrics(metrics);
    await this.updateLastPromptDate();
  }

  private async recordPromptOutcome(featureName: string, outcome: 'accepted' | 'dismissed' | 'declined'): Promise<void> {
    const metrics = await this.getInstallMetrics();

    if (outcome === 'accepted') {
      metrics.acceptedPrompts = (metrics.acceptedPrompts || 0) + 1;
    } else {
      metrics.dismissedPrompts = (metrics.dismissedPrompts || 0) + 1;
    }

    await this.updateInstallMetrics(metrics);

    await this.recordInstallContext({
      featureName,
      timestamp: Date.now(),
      outcome
    });
  }

  private async recordInstallContext(context: InstallContext): Promise<void> {
    const contexts = await this.storageService.get<InstallContext[]>(this.INSTALL_CONTEXTS_KEY) || [];
    contexts.push(context);

    if (contexts.length > 50) {
      contexts.shift();
    }

    await this.storageService.set(this.INSTALL_CONTEXTS_KEY, contexts);
  }

  private async getInstallStatus(): Promise<InstallationStatus> {
    const status = await this.storageService.get<InstallationStatus>(this.INSTALL_STATUS_KEY);
    return status || 'not_installed';
  }

  private async updateInstallStatus(status: InstallationStatus): Promise<void> {
    await this.storageService.set(this.INSTALL_STATUS_KEY, status);

    if (status === 'installed') {
      const metrics = await this.getInstallMetrics();
      metrics.totalPrompts = 0;
      await this.updateInstallMetrics(metrics);
    }
  }

  private async updateLastPromptDate(): Promise<void> {
    const metrics = await this.getInstallMetrics();
    metrics.lastPromptDate = Date.now();
    await this.updateInstallMetrics(metrics);
  }

  private async shouldSuppressPrompt(featureName: string): Promise<boolean> {
    const metrics = await this.getInstallMetrics();
    const status = await this.getInstallStatus();
    const userPrefs = await this.getUserPreferences();

    if (userPrefs.optedOut) {
      return true;
    }

    const now = Date.now();
    const lastPrompt = metrics.lastPromptDate || 0;
    const hoursSinceLastPrompt = (now - lastPrompt) / (1000 * 60 * 60);

    if (hoursSinceLastPrompt < 24) {
      return true;
    }

    if (metrics.totalPrompts >= 5) {
      return true;
    }

    const featurePromptCount = metrics.featurePrompts?.[featureName] || 0;
    if (featurePromptCount >= 2) {
      return true;
    }

    if (status === 'declined') {
      const daysSinceDecline = (now - lastPrompt) / (1000 * 60 * 60 * 24);
      return daysSinceDecline < 7;
    }

    return false;
  }

  private async getUserPreferences(): Promise<{ optedOut: boolean }> {
    const prefs = await this.storageService.get<{ optedOut: boolean }>(this.USER_PREFERENCES_KEY);
    return prefs || { optedOut: false };
  }

  private async setUserOptOut(optedOut: boolean): Promise<void> {
    const prefs = await this.getUserPreferences();
    prefs.optedOut = optedOut;
    await this.storageService.set(this.USER_PREFERENCES_KEY, prefs);
  }

  private async hasUserOptedOut(): Promise<boolean> {
    const prefs = await this.getUserPreferences();
    return prefs.optedOut || false;
  }

  /**
   * Handle successful app installation
   */
  private async handleAppInstalled(): Promise<void> {
    this.isStandalone = true;
    await this.updateInstallStatus('installed');

    const metrics = await this.getInstallMetrics();
    metrics.acceptedPrompts = (metrics.acceptedPrompts || 0) + 1;
    await this.updateInstallMetrics(metrics);

    setTimeout(async () => {
      const alert = await this.alertController.create({
        header: 'Welcome!',
        message: 'Thanks for installing the app! You can now access all features directly from your home screen.',
        buttons: ['Got It']
      });
      await alert.present();
    }, 1000);
  }

  /**
   * Utility methods
   */
  private getStoreUrl(): string {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return isIOS ? 'https://apps.apple.com/app/idYOUR_APP_ID' : 'https://play.google.com/store/apps/details?id=com.zyppar.rolodexai';
  }

  public isAppInstalled(): boolean {
    return this.isStandalone;
  }

  public getPlatform(): string {
    return this.osType;
  }

  public async canPromptInstall(featureName?: string): Promise<boolean> {
    if (this.isStandalone) return false;

    if (featureName) {
      return !(await this.shouldSuppressPrompt(featureName));
    }

    return true;
  }

  /**
   * Reset all installation data (for testing or user requests)
   */
  public async resetInstallData(): Promise<void> {
    await this.storageService.remove(this.INSTALL_METRICS_KEY);
    await this.storageService.remove(this.INSTALL_STATUS_KEY);
    await this.storageService.remove(this.INSTALL_CONTEXTS_KEY);
    await this.storageService.remove(this.USER_PREFERENCES_KEY);

    this.deferredPrompt = null;
    this.isStandalone = false;
  }

  /**
   * Get installation statistics (for analytics or admin)
   */
  public async getInstallationStats(): Promise<{
    metrics: InstallMetrics;
    status: InstallationStatus;
    contexts: InstallContext[];
    preferences: any;
  }> {
    const metrics = await this.getInstallMetrics();
    const status = await this.getInstallStatus();
    const contexts = await this.storageService.get<InstallContext[]>(this.INSTALL_CONTEXTS_KEY) || [];
    const preferences = await this.getUserPreferences();

    return {
      metrics,
      status,
      contexts,
      preferences
    };
  }
}
