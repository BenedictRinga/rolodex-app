import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export type PlanId = 'basic' | 'confidante';

/**
 * 2026-08-16 BILLING: the two tiers + Stripe Checkout. Basic ($1) = the
 * contact manager + the Assistant (5 AI interventions a month — the taste);
 * Confidante ($5) = the full AI agent working all month. The server creates
 * the Stripe Checkout Session; without a STRIPE_SECRET_KEY it answers 501 and
 * the modal shows the connect-Stripe state honestly.
 */
@Injectable({
  providedIn: 'root',
})
export class BillingService {
  async checkout(plan: PlanId): Promise<{ ok: boolean; url?: string; error?: string }> {
    try {
      const res = await fetch(`${environment.rolodexApiBase}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok && data?.url) return { ok: true, url: data.url };
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error' };
    }
  }
}
