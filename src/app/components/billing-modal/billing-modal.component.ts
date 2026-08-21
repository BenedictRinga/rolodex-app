import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { BillingService, BillingGateway, PlanId } from '../../services/billing/billing.service';
import { DraftEngineService } from '../../services/draft-engine/draft-engine.service';

@Component({
  selector: 'app-billing-modal',
  templateUrl: './billing-modal.component.html',
  styleUrls: ['./billing-modal.component.scss'],
  standalone: false,
})
export class BillingModalComponent {
  plan: PlanId = 'basic';
  gateway: BillingGateway = 'stripe';
  email = '';
  busy = false;
  busyPlan: PlanId | null = null;
  error = '';
  gatewayMissing = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly billing: BillingService,
    private readonly draftEngine: DraftEngineService,
  ) {}

  get currentPlan(): string {
    return this.draftEngine.plan === 'confidante' ? 'Assistant ($5/month)' : 'Assistant (Basic $1/month)';
  }

  /** 2026-08-17 FREE TRIAL: the 7-day Assistant banner. */
  get trialLabel(): string {
    return this.draftEngine.trialLabel();
  }

  async subscribe(plan: PlanId): Promise<void> {
    // 2026-08-16: the plan applies immediately (the quota unlocks); the chosen
    // gateway confirms payment in the hosted checkout.
    this.draftEngine.setPlan(plan);
    this.busy = true;
    this.busyPlan = plan;
    this.error = '';
    this.gatewayMissing = false;
    const result = await this.billing.checkout(plan, this.gateway, this.email);
    this.busy = false;
    this.busyPlan = null;
    if (result.ok && result.url) {
      window.location.href = result.url as string;
      return;
    }
    const msg = result.error || '';
    if (msg.includes('501')) {
      this.gatewayMissing = true;
    } else {
      this.error = msg;
    }
  }

  gatewayLabel(): string {
    switch (this.gateway) {
      case 'paystack': return 'Paystack';
      case 'flutterwave': return 'Flutterwave / M-Pesa';
      case 'paddle': return 'Paddle';
      default: return 'Stripe';
    }
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
