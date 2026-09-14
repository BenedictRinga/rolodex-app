import { Injectable } from '@angular/core';

/**
 * 2026-09-14 BUILD 191 — THE SESSIONAL APERTURE (founder: the RolodexPage's
 * aperture-outline button may only appear AFTER the user successfully enters
 * the Investor portal, and it is SESSIONAL — in-memory only, so it re-locks
 * the moment the app restarts; no storage, no persistence, no way to skip the
 * word on a fresh session).
 */
@Injectable({ providedIn: 'root' })
export class InvestorGateService {
  /** True once the portal password succeeded in THIS app session. */
  unlockedThisSession = false;

  unlock(): void {
    this.unlockedThisSession = true;
  }
}
