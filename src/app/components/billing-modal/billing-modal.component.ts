import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { BillingService, PlanId } from '../../services/billing/billing.service';
import { DraftEngineService } from '../../services/draft-engine/draft-engine.service';

@Component({
  selector: 'app-billing-modal',
  templateUrl: './billing-modal.component.html',
  styleUrls: ['./billing-modal.component.scss'],
  standalone: false,
})
export class BillingModalComponent {
  plan: PlanId = 'basic';
  busy = false;
  busyPlan: PlanId | null = null;
  error = '';
  stripeMissing = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly billing: BillingService,
    private readonly draftEngine: DraftEngineService,
  ) {}

  get currentPlan(): string {
    return this.draftEngine.plan === 'confidante' ? 'Confidante ($5/month)' : 'Assistant (Basic $1/month)';
  }

  async subscribe(plan: PlanId): Promise<void> {
    // 2026-08-16: the plan applies immediately (the quota unlocks); Stripe
    // confirms payment in the hosted checkout.
    this.draftEngine.setPlan(plan);
    this.busy = true;
    this.busyPlan = plan;
    this.error = '';
    this.stripeMissing = false;
    const result = await this.billing.checkout(plan);
    this.busy = false;
    this.busyPlan = null;
    if (result.ok && result.url) {
      window.location.href = result.url as string;
      return;
    }
    const msg = result.error || '';
    if (msg.includes('501') || msg.includes('Stripe')) {
      this.stripeMissing = true;
    } else {
      this.error = msg;
    }
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
