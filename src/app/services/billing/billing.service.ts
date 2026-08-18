import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export type PlanId = 'basic' | 'confidante';
export type BillingGateway = 'stripe' | 'paystack' | 'flutterwave' | 'paddle';

/**
 * 2026-08-16 BILLING: the two tiers. 2026-08-18 MULTI-GATEWAY: Stripe (cards),
 * Paystack (Nigeria), Flutterwave (Kenya/M-Pesa), Paddle (global merchant of
 * record). The server creates the hosted checkout; without a gateway key it
 * answers 501 and the modal shows the connect state honestly.
 */
@Injectable({
  providedIn: 'root',
})
export class BillingService {
  async checkout(plan: PlanId, gateway: BillingGateway = 'stripe', email = ''): Promise<{ ok: boolean; url?: string; error?: string }> {
    try {
      const res = await fetch(`${environment.rolodexApiBase}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, gateway, email }),
      });
      const data = await res.json();
      if (res.ok && data?.url) return { ok: true, url: data.url };
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error' };
    }
  }
}
