import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { BillingService, PlanId } from '../../services/billing/billing.service';

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
  ) {}

  async subscribe(plan: PlanId): Promise<void> {
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
