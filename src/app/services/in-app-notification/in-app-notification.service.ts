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
}

@Injectable({
  providedIn: 'root',
})
export class InAppNotificationService {
  private notifications: InAppNotification[] = [];
  private readonly subject = new BehaviorSubject<InAppNotification[]>([]);
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly notifications$ = this.subject.asObservable();

  notify(message: string, opts?: { kind?: 'info' | 'success' | 'error'; duration?: number }): number {
    const id = this.nextId++;
    const notification: InAppNotification = {
      id,
      message,
      kind: opts?.kind || 'info',
      duration: opts?.duration ?? 3500,
    };
    this.notifications = [...this.notifications, notification];
    this.subject.next(this.notifications);
    if (notification.duration > 0) {
      const timer = setTimeout(() => this.dismiss(id), notification.duration);
      this.timers.set(id, timer);
    }
    return id;
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
