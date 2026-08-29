import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * 2026-08-18 IN-APP NOTIFICATIONS (the London-bus fix).
 *
 * Browser/system notifications can stack and nag; ours are Ionic-rendered,
 * live INSIDE the app, auto-dismiss, and the whole dock can be dragged to a
 * convenient corner of the screen and stays there for the session. The
 * component renders the dock; this service is the state + timer brain.
 */
export interface InAppNotification {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
  duration: number; // ms, 0 = sticky until dismissed
  /** 2026-08-29 BUILD 143: optional tap-through payload. A notification that
   *  carries data.action is TAPPABLE — tapping it fires tapped$ so the page
   *  can act (e.g. a "Check in with John Doe" nudge escalates into Loops). */
  data?: { action?: string; contactId?: string; [k: string]: any };
}

@Injectable({
  providedIn: 'root',
})
export class InAppNotificationService {
  private notifications: InAppNotification[] = [];
  private readonly subject = new BehaviorSubject<InAppNotification[]>([]);
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  /** 2026-08-29 BUILD 143: the tap-through channel — the dock emits, the
   *  home page listens and escalates the nudge into an armed loop. */
  private readonly tapSubject = new BehaviorSubject<InAppNotification | null>(null);
  readonly tapped$ = this.tapSubject.asObservable();

  readonly notifications$ = this.subject.asObservable();

  notify(
    message: string,
    opts?: { kind?: 'info' | 'success' | 'error'; duration?: number; data?: InAppNotification['data'] },
  ): number {
    const id = this.nextId++;
    const notification: InAppNotification = {
      id,
      message,
      kind: opts?.kind || 'info',
      duration: opts?.duration ?? 3500,
      data: opts?.data,
    };
    this.notifications = [...this.notifications, notification];
    this.subject.next(this.notifications);
    if (notification.duration > 0) {
      const timer = setTimeout(() => this.dismiss(id), notification.duration);
      this.timers.set(id, timer);
    }
    return id;
  }

  /** 2026-08-29 BUILD 143: the dock calls this when a tappable notification is
   *  tapped — announce it, then take the toast away. */
  tap(n: InAppNotification): void {
    this.tapSubject.next(n);
    this.dismiss(n.id);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.subject.next(this.notifications);
  }

  clear(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.notifications = [];
    this.subject.next([]);
  }
}
