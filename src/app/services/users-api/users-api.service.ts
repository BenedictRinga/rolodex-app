import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

// ---------------------------------------------------------------------------
// 2026-08-18 THE USERS API - the backend's RolodexUser registry. The chat
// consults it BEFORE sending: if the sendee is a user the message lands
// in-app; if not, the sender is told the truth and offered the share path.
// ---------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class UsersApiService {
  async lookup(phone: string): Promise<{ isUser: boolean; name: string; room: string } | null> {
    if (!phone) return { isUser: false, name: '', room: '' };
    try {
      const res = await fetch(`${environment.rolodexApiBase}/users/lookup?phone=${encodeURIComponent(phone)}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return { isUser: !!data?.isUser, name: data?.name || '', room: data?.room || '' };
    } catch {
      return null; // offline - treat as unknown, do not block the local save
    }
  }

  /** The investor's gate: leave details, get the access on the spot. */
  async requestInvestorAccess(name: string, email: string, note: string): Promise<string | null> {
    try {
      const res = await fetch(`${environment.rolodexApiBase}/investor-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, note }),
      });
      const data = await res.json();
      return data?.access || null;
    } catch {
      return null;
    }
  }
}
